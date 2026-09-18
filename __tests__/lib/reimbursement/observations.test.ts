import { describe, expect, it } from "vitest";
import {
  normalizeCmsObservation,
  rejectMissingAsZero,
  selectLatestVintageRates,
  validateObservationConsistency,
} from "@/lib/reimbursement/observations";
import {
  type EvidenceLedger,
  REIMBURSEMENT_SCHEMA_VERSION,
} from "@/lib/reimbursement/schema";
import { validateIngestedObservationBatch } from "@/lib/reimbursement/ingestion";
import { reimbursementSourceManifestSa051 } from "@/data/reimbursement-source-manifest";
import {
  calculatePhysicianFeeSchedulePayment,
  comparePaymentScenarios,
} from "@/lib/reimbursement/payment";

const now = "2026-09-18T00:00:00.000Z";

describe("CMS observation normalization", () => {
  it("requires a vintage and does not coerce missing RVU to zero", () => {
    const missingVintage = normalizeCmsObservation({
      code: "99213",
      codeSystem: "CPT",
      payer: "Medicare",
      placeOfService: "nonfacility",
      sourceId: "artifact:cms:pfs-overview",
      observedAt: now,
      workRvu: null,
    });
    expect(missingVintage.ok).toBe(false);
    if (!missingVintage.ok) {
      expect(
        missingVintage.issues.some((issue) => issue.code === "missing_vintage"),
      ).toBe(true);
    }

    const missingRvu = normalizeCmsObservation({
      code: "99213",
      codeSystem: "CPT",
      dataYear: 2024,
      payer: "Medicare",
      placeOfService: "nonfacility",
      sourceId: "artifact:cms:pfs-overview",
      observedAt: now,
      workRvu: null,
      paymentAmount: 93.12,
    });
    expect(missingRvu.ok).toBe(true);
    if (missingRvu.ok) {
      expect(missingRvu.observation.workRvu).toBeUndefined();
      expect(missingRvu.observation.missingFields).toContain("workRvu");
      expect(missingRvu.observation.paymentAmount).toBe(93.12);
    }

    expect(rejectMissingAsZero("workRvu", null)?.code).toBe(
      "zero_coercion_rejected",
    );
  });

  it("keeps one vintage and does not sum years", () => {
    const selected = selectLatestVintageRates([
      { code: "99213", dataYear: 2023, amount: 1 },
      { code: "99213", dataYear: 2024, amount: 2 },
      { code: "99214", dataYear: 2024, amount: 3 },
    ]);
    expect(selected.vintage).toBe(2024);
    expect(selected.droppedOlderYearCount).toBe(1);
    expect(selected.rows).toHaveLength(2);
    expect(selected.rows.find((row) => row.code === "99213")?.amount).toBe(2);
  });

  it("flags year and setting mismatches on the ledger", () => {
    const ledger: EvidenceLedger = {
      schemaVersion: REIMBURSEMENT_SCHEMA_VERSION,
      issues: [{
        id: "issue:test",
        title: "Test",
        question: "Consistency?",
        status: "machine_proposed",
        claimIds: ["claim:pay"],
        createdAt: now,
        updatedAt: now,
      }],
      claims: [{
        id: "claim:pay",
        issueId: "issue:test",
        statement: "Fee-schedule payment requires matching vintage.",
        kind: "fact",
        status: "machine_proposed",
        sourceIds: ["source:cms"],
        economicUnit: "fee_schedule_payment",
        dataYear: 2024,
        placeOfService: "nonfacility",
        codeSystem: "CPT",
        codes: ["99213"],
        createdAt: now,
        updatedAt: now,
      }],
      sources: [{
        id: "source:cms",
        title: "CMS",
        publisher: "CMS",
        url: "https://www.cms.gov/example",
        accessedAt: now,
        sourceType: "primary",
        storagePolicy: "link_only",
        redistribution: "public",
      }],
      codeRates: [{
        id: "rate:99213",
        code: "99213",
        codeSystem: "CPT",
        dataYear: 2023,
        payer: "Medicare",
        placeOfService: "facility",
        paymentAmount: 80,
        sourceId: "source:cms",
        status: "source_verified",
        observedAt: now,
      }],
      reviews: [],
      lineageHops: [],
    };

    const issues = validateObservationConsistency(ledger);
    expect(issues.some((issue) => issue.code === "vintage_mismatch")).toBe(
      true,
    );
    expect(issues.some((issue) => issue.code === "setting_mismatch")).toBe(
      true,
    );
  });
});

describe("ingestion contract", () => {
  it("accepts an empty Python/DuckDB catalog batch", () => {
    const result = validateIngestedObservationBatch({
      contractVersion: "1.0.0",
      producedAt: now,
      producer: { runtime: "python-duckdb", name: "test" },
      sourceManifest: reimbursementSourceManifestSa051,
      output: { format: "json" },
      observations: [],
    });
    expect(result.ok).toBe(true);
    expect(result.observations).toEqual([]);
  });

  it("rejects unknown source artifacts and parquet without a path", () => {
    const unknown = validateIngestedObservationBatch({
      contractVersion: "1.0.0",
      producedAt: now,
      producer: { runtime: "python-duckdb", name: "test" },
      sourceManifest: reimbursementSourceManifestSa051,
      output: { format: "json" },
      observations: [{
        code: "SA051",
        codeSystem: "HCPCS",
        dataYear: 2024,
        payer: "Medicare",
        placeOfService: "nonfacility",
        sourceArtifactId: "artifact:missing",
        observedAt: now,
      }],
    });
    expect(unknown.ok).toBe(false);
    expect(
      unknown.issues.some((issue) => issue.code === "unknown_source_artifact"),
    ).toBe(true);

    const parquet = validateIngestedObservationBatch({
      contractVersion: "1.0.0",
      producedAt: now,
      producer: { runtime: "python-duckdb", name: "test" },
      sourceManifest: reimbursementSourceManifestSa051,
      output: { format: "parquet" },
      observations: [],
    });
    expect(parquet.ok).toBe(false);
  });

  it("normalizes ingested rows without filling missing payment as zero", () => {
    const result = validateIngestedObservationBatch({
      contractVersion: "1.0.0",
      producedAt: now,
      producer: { runtime: "typescript", name: "test" },
      sourceManifest: reimbursementSourceManifestSa051,
      output: { format: "json" },
      observations: [{
        code: "99213",
        codeSystem: "CPT",
        dataYear: 2024,
        payer: "Medicare",
        placeOfService: "nonfacility",
        workRvu: 1.3,
        practiceExpenseRvu: null,
        sourceArtifactId: "artifact:cms:pfs-overview",
        observedAt: now,
      }],
    });
    expect(result.ok).toBe(true);
    expect(result.observations[0]?.practiceExpenseRvu).toBeUndefined();
    expect(result.observations[0]?.paymentAmount).toBeUndefined();
  });
});

describe("PFS payment engine", () => {
  it("computes geographically adjusted RVU times conversion factor", () => {
    const payment = calculatePhysicianFeeSchedulePayment({
      code: "99213",
      dataYear: 2024,
      locality: "00",
      placeOfService: "nonfacility",
      workRvu: 1,
      practiceExpenseRvu: 1,
      malpracticeRvu: 1,
      workGpci: 1,
      practiceExpenseGpci: 1,
      malpracticeGpci: 1,
      conversionFactor: 32.74,
    });
    expect(payment.geographicallyAdjustedRvu).toBe(3);
    expect(payment.paymentUnrounded).toBeCloseTo(98.22, 6);
    expect(payment.paymentRounded).toBe(98.22);
  });

  it("compares scenarios without inferring missing inputs", () => {
    const baseline = {
      code: "99213",
      dataYear: 2024,
      locality: "00",
      placeOfService: "nonfacility" as const,
      workRvu: 1,
      practiceExpenseRvu: 2,
      malpracticeRvu: 0.1,
      workGpci: 1,
      practiceExpenseGpci: 1,
      malpracticeGpci: 1,
      conversionFactor: 33,
    };
    const delta = comparePaymentScenarios(baseline, {
      ...baseline,
      practiceExpenseRvu: 1.5,
    });
    expect(delta.absoluteDelta).toBeCloseTo(-16.5, 6);
    expect(() =>
      calculatePhysicianFeeSchedulePayment({
        ...baseline,
        conversionFactor: 0,
      })
    ).toThrow(/conversionFactor/);
  });
});
