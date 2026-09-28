import { describe, expect, it } from "vitest";
import {
  assessArtifactLineage,
  assessClaimLanguage,
  assessLedgerIntegrity,
  assessMaterialization,
  assessRawDatasetImports,
  assessReplaySafety,
  type LedgerRecord,
} from "@/lib/data/meshicIntegrity";
import { MESHIC_CLAIM_EXCEPTIONS } from "@/lib/data/meshicClaimExceptions";
import { readFileSync } from "node:fs";
import { computeEconomicReplayCensus } from "@/lib/data/qualityVisibility";

const companies = new Set(["c-test"]);

function record(overrides: Partial<LedgerRecord> = {}): LedgerRecord {
  return {
    id: "c-test:totalFunding:v1",
    companyId: "c-test",
    field: "totalFunding",
    value: 10,
    unit: "USD_M",
    valueBasis: "stated",
    sourceCitation: "Company release",
    effectiveDate: "2020-01-01",
    publicAsOfDate: null,
    datePrecision: "unknown",
    verificationStatus: "verified",
    recordedAt: "2026-09-20",
    ...overrides,
  };
}

function ledger(records: LedgerRecord[]) {
  return { schemaVersion: "1.0" as const, records };
}

describe("MeshIC ledger integrity", () => {
  it("accepts an append-only correction and a current-only undated fact", () => {
    const earlier = record();
    const corrected = record({
      id: "c-test:totalFunding:v2",
      value: 12,
      supersedesId: earlier.id,
      publicAsOfDate: "2024-03-12",
      datePrecision: "day",
    });
    const findings = assessLedgerIntegrity(
      ledger([earlier, corrected]),
      companies,
    );
    expect(findings.filter((item) => item.blocking)).toEqual([]);
    expect(findings.filter((item) => !item.blocking).map((item) => item.code))
      .toEqual(["ledger.citationWithoutUrl"]);
    expect(computeEconomicReplayCensus([earlier, corrected])).toMatchObject({
      activeRecords: 1,
      replayEligible: 1,
      currentOnlyMissingPublicAsOf: 0,
    });
  });

  it("rejects two active claims, a cycle, and a bad public date", () => {
    const duplicate = assessLedgerIntegrity(
      ledger([record(), record({ id: "c-test:totalFunding:conflict" })]),
      companies,
    );
    expect(duplicate.some((item) => item.code === "ledger.conflictingActive"))
      .toBe(true);

    const cycle = assessLedgerIntegrity(
      ledger([
        record({ supersedesId: "c-test:totalFunding:v2" }),
        record({
          id: "c-test:totalFunding:v2",
          supersedesId: "c-test:totalFunding:v1",
        }),
      ]),
      companies,
    );
    expect(cycle.some((item) => item.code === "ledger.supersessionCycle")).toBe(
      true,
    );

    const future = assessLedgerIntegrity(
      ledger([record({
        publicAsOfDate: "2027-01-01",
        datePrecision: "day",
      })]),
      companies,
    );
    expect(future.some((item) => item.code === "ledger.publicAfterRecorded"))
      .toBe(true);

    const invalid = assessLedgerIntegrity(
      ledger([record({ publicAsOfDate: "2020-02-30", datePrecision: "day" })]),
      companies,
    );
    expect(invalid.some((item) => item.code === "ledger.invalidDate")).toBe(
      true,
    );

    const missing = assessLedgerIntegrity(
      ledger([record({ publicAsOfDate: null })]),
      companies,
    );
    expect(missing.filter((item) => item.blocking)).toEqual([]);
    expect(missing.filter((item) => !item.blocking).map((item) => item.code))
      .toEqual(["ledger.missingPublicAsOf", "ledger.citationWithoutUrl"]);
  });


  it("accepts period-end public dates for coarse precision", () => {
    const findings = assessLedgerIntegrity(
      ledger([
        record({
          effectiveDate: "2024-03-01",
          publicAsOfDate: "2024-03-31",
          datePrecision: "month",
          sourceUrl: "https://example.com/source",
        }),
      ]),
      companies,
    );
    expect(findings.filter((item) => item.blocking)).toEqual([]);
  });

  it("rejects dated locator-only evidence for any economic field", () => {
    const findings = assessLedgerIntegrity(
      ledger([
        record({
          id: "c-test:lastKnownValuation:v1",
          field: "lastKnownValuation",
          valueBasis: "locator_only",
          effectiveDate: "2021-01-01",
          publicAsOfDate: "2021-12-31",
          datePrecision: "year",
        }),
      ]),
      companies,
    );
    expect(findings.some((item) => item.code === "ledger.locatorOnlyDated"))
      .toBe(
        true,
      );
  });

  it("rejects an active record that supersedes a retracted row", () => {
    const findings = assessLedgerIntegrity(
      ledger([
        record({ verificationStatus: "retracted" }),
        record({
          id: "c-test:totalFunding:v2",
          supersedesId: "c-test:totalFunding:v1",
        }),
      ]),
      companies,
    );
    expect(findings.some((item) => item.code === "ledger.supersedesRetracted"))
      .toBe(true);
  });
});

describe("MeshIC materialization, replay, lineage, and claims", () => {
  it("rejects a raw company economic field and an untraced materialized value", () => {
    const findings = assessMaterialization({
      rawCompanies: [{ id: "c-test", totalFunding: 10 }],
      materializedCompanies: [{ id: "c-test", totalFunding: 99 }],
      records: [record()],
    });
    expect(findings.map((item) => item.code)).toEqual([
      "materialization.rawEconomicField",
      "materialization.untracedValue",
    ]);
  });

  it("rejects deal-date substitution, dated coercion, and a raw JSON import", () => {
    const replay = assessReplaySafety([
      {
        path: "src/lib/data/example.ts",
        text: "const publicAsOfDate = deal.announcedDate;",
      },
      {
        path: "src/lib/data/dated.ts",
        text:
          "economicEvidenceAtDecisionDate(ledger, id, field, cutoff); const x = company.totalFunding ?? 0;",
      },
    ]);
    expect(replay.filter((item) => item.blocking).map((item) => item.code))
      .toEqual([
        "replay.dealDateAsVintage",
        "replay.missingCoerced",
        "replay.currentFieldInDatedPath",
      ]);

    const descriptive = assessReplaySafety([{
      path: "src/lib/quant/adapt.ts",
      text: "const raisedToDate = view.totalFunding ?? 0;",
    }]);
    expect(descriptive).toMatchObject([{
      blocking: true,
      code: "descriptive.missingCoerced",
    }]);

    const imports = assessRawDatasetImports([
      {
        path: "scripts/compute-benchmarks.ts",
        text: 'import raw from "../src/data/dataset.verified.json";',
      },
      {
        path: "src/lib/data/staticDataset.ts",
        text: 'import raw from "@/data/dataset.verified.json";',
      },
    ]);
    expect(imports).toHaveLength(1);
    expect(imports[0]?.path).toBe("scripts/compute-benchmarks.ts");
  });

  it("rejects a stale artifact hash", () => {
    const findings = assessArtifactLineage(
      [{ path: "src/data/computed-benchmarks.json", datasetHash: "old" }],
      "current",
    );
    expect(findings[0]).toMatchObject({
      blocking: true,
      code: "lineage.hashMismatch",
    });
  });

  it("flags predictive copy and keeps documented exceptions", () => {
    const flagged = assessClaimLanguage([{
      path: "src/components/ExitPredictor.tsx",
      text: "<p>Predicted exit probability is 80%.</p>",
    }]);
    expect(flagged.some((item) => item.code === "claim.predictiveLanguage"))
      .toBe(true);

    const negated = assessClaimLanguage([{
      path: "src/components/ExitPredictor.tsx",
      text: "<p>This is not a forecast of exit.</p>",
    }]);
    expect(negated).toEqual([]);

    for (const exception of MESHIC_CLAIM_EXCEPTIONS) {
      const text = readFileSync(exception.fileSuffix, "utf8");
      expect(text).toContain(exception.contains);
      const allowed = assessClaimLanguage([{
        path: exception.fileSuffix,
        text: `"${exception.contains}"`,
      }]);
      expect(allowed).toEqual([]);
    }
  });
});
