import { describe, expect, it } from "vitest";
import { reimbursementSourceManifestPrototype } from "@/data/reimbursement-source-manifest-prototype";
import {
  REIMBURSEMENT_INGESTION_CONTRACT_VERSION,
  validateIngestedObservationBatch,
} from "@/lib/reimbursement/ingestion";
import {
  normalizeCmsObservation,
  rejectMissingAsZero,
  validateObservationConsistency,
} from "@/lib/reimbursement/observations";
import {
  type EvidenceLedger,
  REIMBURSEMENT_SCHEMA_VERSION,
} from "@/lib/reimbursement/schema";
import { validateReimbursementSourceManifest } from "@/lib/reimbursement/sourceManifest";
import { validateEvidenceLedger } from "@/lib/reimbursement/validation";

const now = "2026-09-17T05:30:00.000Z";

function ledgerWithRate(
  overrides: Partial<EvidenceLedger["codeRates"][number]> = {},
): EvidenceLedger {
  return {
    schemaVersion: REIMBURSEMENT_SCHEMA_VERSION,
    issues: [
      {
        id: "issue:rate",
        title: "Rate vintage",
        question: "Does the claim vintage match the observation?",
        status: "machine_proposed",
        claimIds: ["claim:rate"],
        createdAt: now,
        updatedAt: now,
      },
    ],
    claims: [
      {
        id: "claim:rate",
        issueId: "issue:rate",
        statement: "A fee-schedule claim that must keep vintage explicit.",
        kind: "calculation",
        status: "machine_proposed",
        sourceIds: ["source:cms"],
        economicUnit: "fee_schedule_payment",
        dataYear: 2026,
        placeOfService: "non_facility",
        codeSystem: "HCPCS",
        codes: ["SA051"],
        createdAt: now,
        updatedAt: now,
      },
    ],
    sources: [
      {
        id: "source:cms",
        title: "CMS public file",
        publisher: "Centers for Medicare & Medicaid Services",
        url: "https://www.cms.gov/example",
        accessedAt: now,
        sourceType: "primary",
      },
    ],
    codeRates: [
      {
        id: "rate:sa051",
        code: "SA051",
        codeSystem: "HCPCS",
        dataYear: 2026,
        payer: "Medicare PFS",
        placeOfService: "non_facility",
        workRvu: 0.5,
        practiceExpenseRvu: 1.2,
        malpracticeRvu: 0.1,
        conversionFactor: 32.74,
        sourceId: "source:cms",
        status: "source_verified",
        observedAt: now,
        ...overrides,
      },
    ],
    reviews: [],
  };
}

describe("CMS observation normalization", () => {
  it("keeps missing RVU and payment fields absent instead of zero", () => {
    const result = normalizeCmsObservation({
      code: "SA051",
      codeSystem: "HCPCS",
      dataYear: 2026,
      payer: "Medicare PFS",
      placeOfService: "non_facility",
      workRvu: null,
      paymentAmount: undefined,
      sourceId: "artifact:cms:hcpcs-public",
      observedAt: now,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.observation.workRvu).toBeUndefined();
    expect(result.observation.paymentAmount).toBeUndefined();
    expect(result.observation.missingFields).toEqual(
      expect.arrayContaining(["workRvu", "paymentAmount"]),
    );
  });

  it("rejects a missing vintage instead of inventing a year", () => {
    const result = normalizeCmsObservation({
      code: "SA051",
      codeSystem: "HCPCS",
      payer: "Medicare PFS",
      placeOfService: "non_facility",
      sourceId: "artifact:cms:hcpcs-public",
      observedAt: now,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((issue) => issue.code === "missing_vintage"))
      .toBe(true);
  });

  it("does not treat a missing numeric field as zero", () => {
    expect(rejectMissingAsZero("workRvu", null)?.code).toBe(
      "zero_coercion_rejected",
    );
    expect(rejectMissingAsZero("workRvu", 0)).toBeNull();
  });
});

describe("code/year/setting consistency", () => {
  it("accepts matching vintage and setting", () => {
    const result = validateEvidenceLedger(ledgerWithRate());
    expect(result.ok).toBe(true);
  });

  it("flags a claim vintage that does not match the code-rate year", () => {
    const ledger = ledgerWithRate({ dataYear: 2025 });
    const issues = validateObservationConsistency(ledger);
    expect(issues.some((issue) => issue.code === "vintage_mismatch")).toBe(
      true,
    );
  });

  it("flags a claim setting that does not match the code-rate setting", () => {
    const ledger = ledgerWithRate({ placeOfService: "facility" });
    const issues = validateObservationConsistency(ledger);
    expect(issues.some((issue) => issue.code === "setting_mismatch")).toBe(
      true,
    );
  });
});

describe("Python/DuckDB ingestion contract", () => {
  it("accepts a JSON batch whose source artifacts are in the manifest", () => {
    const result = validateIngestedObservationBatch({
      contractVersion: REIMBURSEMENT_INGESTION_CONTRACT_VERSION,
      producedAt: now,
      producer: { runtime: "python-duckdb", name: "cms-pfs-loader" },
      sourceManifest: reimbursementSourceManifestPrototype,
      output: { format: "json" },
      observations: [
        {
          code: "SA051",
          codeSystem: "HCPCS",
          dataYear: 2026,
          payer: "Medicare PFS",
          placeOfService: "non_facility",
          workRvu: 0.5,
          practiceExpenseRvu: null,
          sourceArtifactId: "artifact:cms:hcpcs-public",
          observedAt: now,
        },
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.observations).toHaveLength(1);
    expect(result.observations[0]?.practiceExpenseRvu).toBeUndefined();
  });

  it("rejects parquet output without a path the TypeScript adapter can read", () => {
    const result = validateIngestedObservationBatch({
      contractVersion: REIMBURSEMENT_INGESTION_CONTRACT_VERSION,
      producedAt: now,
      producer: { runtime: "python-duckdb", name: "cms-pfs-loader" },
      sourceManifest: reimbursementSourceManifestPrototype,
      output: { format: "parquet" },
      observations: [],
    });

    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.path.includes("parquetPath")))
      .toBe(true);
  });

  it("rejects observations that point at an unknown source artifact", () => {
    const result = validateIngestedObservationBatch({
      contractVersion: REIMBURSEMENT_INGESTION_CONTRACT_VERSION,
      producedAt: now,
      producer: { runtime: "typescript", name: "fixture" },
      sourceManifest: reimbursementSourceManifestPrototype,
      output: { format: "json" },
      observations: [
        {
          code: "SA051",
          codeSystem: "HCPCS",
          dataYear: 2026,
          payer: "Medicare PFS",
          placeOfService: "non_facility",
          sourceArtifactId: "artifact:missing",
          observedAt: now,
        },
      ],
    });

    expect(result.ok).toBe(false);
    expect(
      result.issues.some((issue) => issue.code === "unknown_source_artifact"),
    ).toBe(true);
  });
});

describe("source manifest prototype", () => {
  it("is a valid public CMS catalog with no local file copies", () => {
    const result = validateReimbursementSourceManifest(
      reimbursementSourceManifestPrototype,
    );
    expect(result.ok).toBe(true);
    expect(
      reimbursementSourceManifestPrototype.artifacts.every((artifact) =>
        artifact.storagePolicy === "link_only" &&
        artifact.redistribution === "public"
      ),
    ).toBe(true);
  });
});
