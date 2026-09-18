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
        payer: "Medicare PFS",
        dataYear: 2026,
        locality: "00",
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
        locality: "00",
        placeOfService: "non_facility",
        workRvu: 0.5,
        practiceExpenseRvu: 1.2,
        malpracticeRvu: 0.1,
        workGpci: 1,
        practiceExpenseGpci: 1,
        malpracticeGpci: 1,
        conversionFactor: 32.74,
        sourceId: "source:cms",
        status: "source_verified",
        observedAt: now,
        ...overrides,
      },
    ],
    reviews: [],
    lineageHops: [],
  };
}

describe("CMS observation normalization", () => {
  it("keeps missing RVU and payment fields absent instead of zero", () => {
    const result = normalizeCmsObservation({
      code: "SA051",
      codeSystem: "HCPCS",
      dataYear: 2026,
      ruleCycle: "2026-final-rule",
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

  it("preserves rule-cycle provenance on a successful normalize", () => {
    const result = normalizeCmsObservation({
      code: "SA051",
      codeSystem: "HCPCS",
      dataYear: 2026,
      ruleCycle: "2026-final-rule",
      payer: "Medicare PFS",
      placeOfService: "non_facility",
      sourceId: "artifact:cms:hcpcs-public",
      observedAt: now,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.observation.ruleCycle).toBe("2026-final-rule");
    expect(result.observation.presentFields).toContain("ruleCycle");
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

  it("keeps an unrelated historical vintage from invalidating a matched claim", () => {
    const ledger = ledgerWithRate();
    const currentRate = ledger.codeRates[0];
    if (!currentRate) throw new Error("expected fixture rate");
    ledger.codeRates = [
      ...ledger.codeRates,
      {
        ...currentRate,
        id: "rate:sa051-2025",
        dataYear: 2025,
      },
    ];
    const issues = validateObservationConsistency(ledger);
    expect(issues).toEqual([]);
  });

  it("treats a wrong-year-only rate as no applicable observation", () => {
    const ledger = ledgerWithRate({ dataYear: 2025 });
    const issues = validateObservationConsistency(ledger);
    expect(issues.some((issue) => issue.code === "no_applicable_rate")).toBe(
      true,
    );
    expect(issues.some((issue) => issue.code === "vintage_mismatch")).toBe(
      false,
    );
  });

  it("treats a wrong-setting-only rate as no applicable observation", () => {
    const ledger = ledgerWithRate({ placeOfService: "facility" });
    const issues = validateObservationConsistency(ledger);
    expect(issues.some((issue) => issue.code === "no_applicable_rate")).toBe(
      true,
    );
    expect(issues.some((issue) => issue.code === "setting_mismatch")).toBe(
      false,
    );
  });

  it("does not let a Medicare rate support a Medicaid payment claim", () => {
    const ledger = ledgerWithRate();
    ledger.claims[0] = {
      ...ledger.claims[0],
      payer: "Medicaid",
    };
    const issues = validateObservationConsistency(ledger);
    expect(issues.some((issue) => issue.code === "no_applicable_rate")).toBe(
      true,
    );
  });

  it("rejects a fee-schedule claim with no matching rate", () => {
    const ledger = ledgerWithRate();
    ledger.codeRates = [];
    const issues = validateObservationConsistency(ledger);
    expect(issues.some((issue) => issue.code === "no_applicable_rate")).toBe(
      true,
    );
  });

  it("rejects a calculated payment that is missing GPCIs", () => {
    const ledger = ledgerWithRate({
      workGpci: undefined,
      practiceExpenseGpci: undefined,
      malpracticeGpci: undefined,
      paymentAmount: undefined,
    });
    const issues = validateObservationConsistency(ledger);
    expect(issues.some((issue) => issue.code === "payment_unit_mismatch"))
      .toBe(true);
  });

  it("does not let an uncited locality-specific rate publish a national claim", () => {
    const ledger = ledgerWithRate({
      id: "rate:sa051-uncited",
      sourceId: "source:other",
      paymentAmount: 50,
    });
    ledger.sources = [
      ...ledger.sources,
      {
        id: "source:other",
        title: "Other CMS file",
        publisher: "Centers for Medicare & Medicaid Services",
        url: "https://www.cms.gov/other",
        accessedAt: now,
        sourceType: "primary",
      },
    ];
    const issues = validateObservationConsistency(ledger);
    expect(issues.some((issue) => issue.code === "no_applicable_rate")).toBe(
      true,
    );
  });

  it("requires an explicit locality on fee-schedule claims", () => {
    const ledger = ledgerWithRate();
    ledger.claims[0] = {
      ...ledger.claims[0],
      locality: undefined,
    };
    const issues = validateObservationConsistency(ledger);
    expect(issues.some((issue) => issue.code === "missing_claim_locality"))
      .toBe(true);
  });

  it("accepts RVU-only evidence without a conversion factor", () => {
    const ledger = ledgerWithRate({
      conversionFactor: undefined,
      workGpci: undefined,
      practiceExpenseGpci: undefined,
      malpracticeGpci: undefined,
      paymentAmount: undefined,
    });
    ledger.claims[0] = {
      ...ledger.claims[0],
      economicUnit: "rvu",
    };
    const issues = validateObservationConsistency(ledger);
    expect(issues.some((issue) => issue.code === "missing_conversion_factor"))
      .toBe(false);
    expect(issues).toEqual([]);
  });

  it("accepts a sourced paymentAmount without RVU or GPCI inputs", () => {
    const ledger = ledgerWithRate({
      workRvu: undefined,
      practiceExpenseRvu: undefined,
      malpracticeRvu: undefined,
      workGpci: undefined,
      practiceExpenseGpci: undefined,
      malpracticeGpci: undefined,
      conversionFactor: undefined,
      paymentAmount: 41.12,
    });
    const issues = validateObservationConsistency(ledger);
    expect(issues).toEqual([]);
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

  it("accepts a catalog-only JSON batch with no rate rows", () => {
    const result = validateIngestedObservationBatch({
      contractVersion: REIMBURSEMENT_INGESTION_CONTRACT_VERSION,
      producedAt: now,
      producer: { runtime: "python-duckdb", name: "cms-pfs-loader" },
      sourceManifest: reimbursementSourceManifestPrototype,
      output: { format: "json" },
      observations: [],
    });

    expect(result.ok).toBe(true);
    expect(result.observations).toEqual([]);
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
