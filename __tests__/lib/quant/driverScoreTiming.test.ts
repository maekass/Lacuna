import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import rawDataset from "@/data/dataset.verified.json";
import rawLedger from "@/data/evidence.verified.json";
import { parseVerifiedDataset } from "@/lib/data/datasetSchema";
import { parseEconomicEvidenceLedger } from "@/lib/data/evidenceLedger";
import { inspectLedgerRecords } from "@/lib/data/ledgerStructure";
import { isCalendarDay } from "@/lib/data/pointInTime";
import {
  diagnoseDriverScoreTiming,
  DRIVER_KEYS,
  DRIVER_TIMING_LIMIT,
} from "@/lib/quant/driverScoreTiming";
import { AcquisitionPredictor } from "@/lib/quant/predictionEngines";
import type { QuantCompany } from "@/lib/quant/types";

function dayBefore(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

describe("diagnoseDriverScoreTiming", () => {
  it("flags market timing when the funding day is after the cutoff", () => {
    const report = diagnoseDriverScoreTiming({
      cutoff: "2020-01-01",
      raisedToDate: 9.7,
      fundingPublicAsOfDate: "2022-10-31",
      fundingDatePrecision: "month",
    });

    expect(report.flagged).toBe(true);
    expect(report.limit).toBe(DRIVER_TIMING_LIMIT);
    expect(report.findings.find((row) => row.driver === "marketTiming"))
      .toMatchObject({
        status: "after-cutoff",
        field: "totalFunding",
        asOf: "2022-10-31",
        datePrecision: "month",
        cutoff: "2020-01-01",
      });
    for (const driver of DRIVER_KEYS) {
      if (driver === "marketTiming") continue;
      expect(report.findings.find((row) => row.driver === driver)?.status)
        .toBe("no-dated-field");
    }
  });

  it("does not flag a funding day that falls on the cutoff", () => {
    const report = diagnoseDriverScoreTiming({
      cutoff: "2022-10-31",
      raisedToDate: 9.7,
      fundingPublicAsOfDate: "2022-10-31",
    });
    expect(report.flagged).toBe(false);
    expect(report.findings.find((row) => row.driver === "marketTiming")?.status)
      .toBe("not-after-cutoff");
  });

  it("does not treat a missing funding timestamp as on time", () => {
    const report = diagnoseDriverScoreTiming({
      cutoff: "2021-05-19",
      raisedToDate: 7,
      fundingPublicAsOfDate: null,
    });
    expect(report.flagged).toBe(false);
    expect(report.findings.find((row) => row.driver === "marketTiming")?.status)
      .toBe("missing-timestamp");
  });

  it("does not flag a later ledger date the scorer would not read", () => {
    const report = diagnoseDriverScoreTiming({
      cutoff: "2020-01-01",
      fundingPublicAsOfDate: "2024-01-01",
    });
    expect(report.flagged).toBe(false);
    expect(report.findings.find((row) => row.driver === "marketTiming")?.status)
      .toBe("feature-absent");
  });

  it("rejects an impossible date instead of calling it after the cutoff", () => {
    const report = diagnoseDriverScoreTiming({
      cutoff: "2020-02-31",
      raisedToDate: 20,
      fundingPublicAsOfDate: "2021-01-01",
    });
    expect(report.flagged).toBe(false);
    expect(report.findings.find((row) => row.driver === "marketTiming")?.status)
      .toBe("invalid-date");
  });

  it("leaves acquisition driver scores unchanged", () => {
    const source = readFileSync(
      path.join(process.cwd(), "src/lib/quant/predictionEngines.ts"),
      "utf8",
    );
    expect(source).not.toContain("diagnoseDriverScoreTiming");

    const company: QuantCompany = {
      id: "timing-fixture",
      name: "Timing Fixture",
      sector: "Diagnostics",
      fundingStage: "Private (Series B)",
      clinicalStage: "phase3",
      raisedToDate: 9.7,
      customerCount: 0,
      geographicFocus: ["US"],
      condition: "preeclampsia",
    };
    const before = new AcquisitionPredictor().predictAcquisition(company);
    diagnoseDriverScoreTiming({
      cutoff: "2020-01-01",
      raisedToDate: company.raisedToDate,
      fundingPublicAsOfDate: "2022-10-31",
    });
    const after = new AcquisitionPredictor().predictAcquisition(company);
    expect(after.driverScores).toEqual(before.driverScores);
    expect(after.probability).toEqual(before.probability);
  });
});

describe("catalog funding versus a caller-supplied cutoff", () => {
  const dataset = parseVerifiedDataset(rawDataset);
  const ledger = parseEconomicEvidenceLedger(rawLedger);
  const active = inspectLedgerRecords(ledger.records).active;
  const announcedByTarget = new Map(
    dataset.acquisitions.map((deal) => [deal.targetId, deal.announcedDate]),
  );

  it("reports undated target funding as missing rather than on time", () => {
    let undatedTargetFunding = 0;
    for (const company of dataset.companies) {
      const cutoff = announcedByTarget.get(company.id);
      const funding = active.get(`${company.id}:totalFunding`);
      if (!cutoff || !funding || funding.publicAsOfDate != null) continue;
      undatedTargetFunding += 1;
      const report = diagnoseDriverScoreTiming({
        cutoff,
        raisedToDate: funding.value,
        fundingPublicAsOfDate: funding.publicAsOfDate,
        fundingDatePrecision: funding.datePrecision,
      });
      expect(report.flagged).toBe(false);
      expect(
        report.findings.find((row) => row.driver === "marketTiming")?.status,
      ).toBe("missing-timestamp");
    }
    expect(undatedTargetFunding).toBeGreaterThan(0);
  });

  it("flags a stored catalog funding day that is later than the cutoff", () => {
    const dated = [...active.values()].find((record) =>
      record.field === "totalFunding" &&
      typeof record.publicAsOfDate === "string" &&
      isCalendarDay(record.publicAsOfDate)
    );
    expect(dated?.publicAsOfDate).toBeTruthy();
    if (!dated?.publicAsOfDate) return;

    const later = diagnoseDriverScoreTiming({
      cutoff: dayBefore(dated.publicAsOfDate),
      raisedToDate: dated.value,
      fundingPublicAsOfDate: dated.publicAsOfDate,
      fundingDatePrecision: dated.datePrecision,
    });
    expect(later.flagged).toBe(true);
    expect(later.findings.find((row) => row.driver === "marketTiming")?.status)
      .toBe("after-cutoff");

    const sameDay = diagnoseDriverScoreTiming({
      cutoff: dated.publicAsOfDate,
      raisedToDate: dated.value,
      fundingPublicAsOfDate: dated.publicAsOfDate,
    });
    expect(sameDay.flagged).toBe(false);
    expect(
      sameDay.findings.find((row) => row.driver === "marketTiming")?.status,
    ).toBe("not-after-cutoff");
  });
});
