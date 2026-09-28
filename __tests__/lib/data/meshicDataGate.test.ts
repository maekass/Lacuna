import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import rawDataset from "@/data/dataset.verified.json";
import rawLedger from "@/data/evidence.verified.json";
import { parseVerifiedDataset } from "@/lib/data/datasetSchema";
import {
  applyEconomicEvidenceLedger,
  economicEvidenceAtDecisionDate,
  type EconomicEvidenceRecord,
  parseEconomicEvidenceLedger,
} from "@/lib/data/evidenceLedger";
import { auditEconomicEvidence } from "@/lib/data/evidenceLedgerAudit";
import { collectProvenanceGateFindings } from "@/lib/data/meshicGate";
import {
  auditEconomicDisplays,
  type ClaimException,
  EXIT_ANALYSIS_CLAIM_FILES,
  scanClaimLanguage,
  validateClaimExceptions,
} from "@/lib/data/meshicClaimScan";
import {
  auditArtifactHashes,
  scanRawDatasetImports,
} from "@/lib/data/meshicLineageScan";
import { scanReplaySafety } from "@/lib/data/meshicReplayScan";
import { computeReplayProvenanceCensus } from "@/lib/data/replayProvenance";
import { getStaticVerifiedDataset } from "@/lib/data/staticDataset";

const ROOT = path.resolve(__dirname, "../../..");

function baseCompany() {
  return {
    id: "c-test",
    name: "Test",
    sector: "Test",
    stage: "Seed",
  };
}

function baseDataset() {
  return parseVerifiedDataset({
    provenance: {
      lastUpdated: "2026-09-20",
      sources: ["test"],
      notes: [],
      purpose: "test",
      disclaimer: "test",
    },
    companies: [baseCompany()],
    acquirers: [],
    acquisitions: [],
  });
}

function record(
  overrides: Partial<EconomicEvidenceRecord> = {},
): EconomicEvidenceRecord {
  return {
    id: "c-test:totalFunding:v1",
    companyId: "c-test",
    field: "totalFunding",
    value: 10,
    unit: "USD_M",
    sourceCitation: "Company release",
    effectiveDate: "2020-01-01",
    publicAsOfDate: "2020-01-02",
    datePrecision: "day",
    verificationStatus: "verified",
    recordedAt: "2026-09-20",
    ...overrides,
  };
}

function ledger(records: EconomicEvidenceRecord[]) {
  return { schemaVersion: "1.0" as const, records };
}

function blockingRules(
  findings: readonly { disposition: string; rule: string }[],
): string[] {
  return findings.filter((finding) => finding.disposition === "blocking").map(
    (finding) => finding.rule,
  );
}

describe("MeshIC ledger integrity", () => {
  it("accepts an append-only correction chain", () => {
    const earlier = record();
    const corrected = record({
      id: "c-test:totalFunding:v2",
      value: 12,
      recordedAt: "2026-09-21",
      supersedesId: earlier.id,
    });
    const rows = ledger([earlier, corrected]);
    const materialized = applyEconomicEvidenceLedger(baseDataset(), rows);
    expect(materialized.companies[0].totalFunding).toBe(12);
    const findings = auditEconomicEvidence({
      ledgerRaw: rows,
      rawCompanies: [baseCompany()],
      materialized,
    });
    expect(blockingRules(findings)).toEqual([]);
    expect(findings.some((finding) => finding.disposition === "gap")).toBe(
      false,
    );
  });

  it("rejects two active claims for the same company and field", () => {
    const rows = ledger([
      record(),
      record({ id: "c-test:totalFunding:conflict", value: 11 }),
    ]);
    expect(() => applyEconomicEvidenceLedger(baseDataset(), rows)).toThrow(
      /More than one current evidence record/,
    );
    const findings = auditEconomicEvidence({
      ledgerRaw: rows,
      rawCompanies: [baseCompany()],
      materialized: null,
    });
    const conflict = findings.find((finding) =>
      finding.rule === "ledger.conflictingActiveClaim"
    );
    expect(conflict?.disposition).toBe("blocking");
    expect(conflict?.location).toContain("c-test:totalFunding");
    expect(conflict?.remediation).toMatch(/supersedesId/);
  });

  it("rejects a supersession cycle", () => {
    const rows = ledger([
      record({ id: "a", supersedesId: "b" }),
      record({ id: "b", supersedesId: "a", value: 11 }),
    ]);
    expect(() => applyEconomicEvidenceLedger(baseDataset(), rows)).toThrow(
      /cycle/i,
    );
    const findings = auditEconomicEvidence({
      ledgerRaw: rows,
      rawCompanies: [baseCompany()],
      materialized: null,
    });
    expect(blockingRules(findings)).toContain("ledger.supersessionCycle");
  });

  it("rejects an orphaned supersedesId and a live claim on a retraction", () => {
    const orphan = auditEconomicEvidence({
      ledgerRaw: ledger([record({ supersedesId: "missing" })]),
      rawCompanies: [baseCompany()],
      materialized: null,
    });
    expect(blockingRules(orphan)).toContain("ledger.orphanedSupersedes");

    const retracted = record({
      id: "c-test:totalFunding:v1",
      verificationStatus: "retracted",
    });
    const revived = record({
      id: "c-test:totalFunding:v2",
      supersedesId: retracted.id,
      value: 12,
      recordedAt: "2026-09-21",
    });
    const findings = auditEconomicEvidence({
      ledgerRaw: ledger([retracted, revived]),
      rawCompanies: [baseCompany()],
      materialized: null,
    });
    expect(blockingRules(findings)).toContain("ledger.supersedesRetracted");
  });

  it("rejects a non-append rewrite and a cross-field supersession", () => {
    const earlier = record({ recordedAt: "2026-09-21" });
    const rewritten = record({
      id: "c-test:totalFunding:v2",
      supersedesId: earlier.id,
      recordedAt: "2026-09-20",
      value: 12,
    });
    expect(blockingRules(auditEconomicEvidence({
      ledgerRaw: ledger([earlier, rewritten]),
      rawCompanies: [baseCompany()],
      materialized: null,
    }))).toContain("ledger.nonAppendRewrite");

    const otherField = record({
      id: "c-test:lastKnownValuation:v2",
      field: "lastKnownValuation",
      supersedesId: earlier.id,
      recordedAt: "2026-09-22",
    });
    expect(blockingRules(auditEconomicEvidence({
      ledgerRaw: ledger([earlier, otherField]),
      rawCompanies: [baseCompany()],
      materialized: null,
    }))).toContain("ledger.supersedesOtherFact");
  });

  it("rejects duplicated company economics and an untraced materialized value", () => {
    const rows = ledger([record({ value: 10 })]);
    const duplicated = auditEconomicEvidence({
      ledgerRaw: rows,
      rawCompanies: [{ ...baseCompany(), totalFunding: 10 }],
      materialized: applyEconomicEvidenceLedger(baseDataset(), rows),
    });
    expect(blockingRules(duplicated)).toContain(
      "ledger.duplicatedEconomicField",
    );

    const drifted = parseVerifiedDataset({
      provenance: baseDataset().provenance,
      companies: [{ ...baseCompany(), totalFunding: 99 }],
      acquirers: [],
      acquisitions: [],
    });
    const untraced = auditEconomicEvidence({
      ledgerRaw: rows,
      rawCompanies: [baseCompany()],
      materialized: drifted,
    });
    expect(blockingRules(untraced)).toContain(
      "ledger.untracedMaterializedValue",
    );
    expect(
      untraced.find((finding) =>
        finding.rule === "ledger.untracedMaterializedValue"
      )?.remediation,
    ).toMatch(/active ledger/i);
  });
});

describe("MeshIC historical replay", () => {
  it("keeps a missing publicAsOfDate out of replay and out of blocking failures", () => {
    const currentOnly = record({
      publicAsOfDate: null,
      effectiveDate: null,
      datePrecision: "unknown",
      verificationStatus: "reported",
    });
    const rows = ledger([currentOnly]);
    const materialized = applyEconomicEvidenceLedger(baseDataset(), rows);
    expect(materialized.companies[0].totalFunding).toBe(10);
    expect(economicEvidenceAtDecisionDate(
      rows,
      "c-test",
      "totalFunding",
      "2024-01-01",
    )).toEqual({ eligible: false, reason: "missing-provenance" });

    const findings = auditEconomicEvidence({
      ledgerRaw: rows,
      rawCompanies: [baseCompany()],
      materialized,
    });
    expect(blockingRules(findings)).toEqual([]);
    const gap = findings.find((finding) =>
      finding.rule === "replay.missingPublicAsOf"
    );
    expect(gap?.disposition).toBe("gap");
    expect(gap?.remediation).toMatch(/Do not copy an announcement date/);
    expect(computeReplayProvenanceCensus(rows.records)).toMatchObject({
      economicRecords: 1,
      historicalReplayEligible: 0,
      currentOnlyMissingPublicAsOf: 1,
    });
  });

  it("rejects future, invalid, and non-day publicAsOfDate for replay", () => {
    const future = record({ publicAsOfDate: "2027-01-01" });
    expect(economicEvidenceAtDecisionDate(
      ledger([future]),
      "c-test",
      "totalFunding",
      "2027-01-01",
    )).toEqual({ eligible: false, reason: "invalid-date" });
    expect(blockingRules(auditEconomicEvidence({
      ledgerRaw: ledger([future]),
      rawCompanies: [baseCompany()],
      materialized: null,
    }))).toContain("ledger.futurePublicAsOf");

    const impossible = record({ publicAsOfDate: "2024-02-31" });
    expect(economicEvidenceAtDecisionDate(
      ledger([impossible]),
      "c-test",
      "totalFunding",
      "2024-03-01",
    )).toEqual({ eligible: false, reason: "invalid-date" });
    expect(blockingRules(auditEconomicEvidence({
      ledgerRaw: ledger([impossible]),
      rawCompanies: [baseCompany()],
      materialized: null,
    }))).toContain("ledger.invalidDate");

    const month = record({
      publicAsOfDate: "2021-05-01",
      effectiveDate: "2021-05-01",
      datePrecision: "month",
    });
    expect(economicEvidenceAtDecisionDate(
      ledger([month]),
      "c-test",
      "totalFunding",
      "2021-05-31",
    )).toEqual({ eligible: false, reason: "imprecise-date" });
    expect(blockingRules(auditEconomicEvidence({
      ledgerRaw: ledger([month]),
      rawCompanies: [baseCompany()],
      materialized: applyEconomicEvidenceLedger(baseDataset(), ledger([month])),
    }))).not.toContain("ledger.misleadingPrecision");

    const interior = record({
      publicAsOfDate: "2021-05-18",
      effectiveDate: null,
      datePrecision: "month",
    });
    expect(blockingRules(auditEconomicEvidence({
      ledgerRaw: ledger([interior]),
      rawCompanies: [baseCompany()],
      materialized: null,
    }))).toContain("ledger.misleadingPrecision");
  });

  it("detects raw current fields, date substitution, zero coercion, and day formatting", () => {
    const source = `
      export function fundingAsOf(company: { totalFunding?: number }, deal: { announcedDate: string }) {
        const asOf = deal.announcedDate;
        return company.totalFunding ?? 0;
      }
      export function valuationAsOf(record: { publicAsOfDate: string }) {
        return new Date(record.publicAsOfDate).toLocaleDateString();
      }
      export function datedAsOf(record: { publicAsOfDate: string | null }) {
        const asOf = record.publicAsOfDate ?? "2020-01-01";
        return asOf;
      }
    `;
    const findings = scanReplaySafety([{
      path: "fixture/replay.ts",
      content: source,
    }]);
    const rules = blockingRules(findings);
    expect(rules).toContain("replay.rawCurrentField");
    expect(rules).toContain("replay.acquisitionDateSubstitute");
    expect(rules).toContain("replay.missingCoerced");
    expect(rules).toContain("replay.coarseDatePresentedAsDay");
    expect(rules).toContain("replay.undatedEvidenceAdmitted");
    expect(findings.every((finding) => finding.remediation.length > 0)).toBe(
      true,
    );
  });
});

describe("MeshIC lineage, claims, and the live catalog", () => {
  it("flags a raw dataset import and a compute script on the wrong input path", () => {
    const findings = scanRawDatasetImports([
      {
        path: "src/lib/quant/badBypass.ts",
        content: 'import data from "@/data/dataset.verified.json";\n',
      },
      {
        path: "src/lib/data/staticDataset.ts",
        content: 'import data from "@/data/dataset.verified.json";\n',
      },
      {
        path: "scripts/compute-benchmarks.ts",
        content: "export const unused = 1;\n",
      },
    ]);
    expect(findings.map((finding) => finding.location).sort()).toEqual([
      "scripts/compute-benchmarks.ts",
      "src/lib/quant/badBypass.ts",
    ]);
    expect(findings.every((finding) => finding.disposition === "blocking"))
      .toBe(true);
  });

  it("flags a stale dataset hash and a stale computation lineage hash", () => {
    const findings = auditArtifactHashes({
      artifacts: [{
        path: "src/data/computed-benchmarks.json",
        recordedDatasetHash: "old",
        expectedDatasetHash: "new",
      }],
      logic: {
        path: "src/data/computed-quality-visibility.json",
        recordedLogicHash: "old-logic",
        expectedLogicHash: "new-logic",
      },
    });
    expect(findings.map((finding) => finding.rule)).toEqual([
      "lineage.staleDatasetHash",
      "lineage.staleComputationHash",
    ]);
    expect(findings[0].remediation).toMatch(/compute:all/);
  });

  it("flags predictive language, keeps negations, and honors only outside-surface exceptions", () => {
    const predictive = scanClaimLanguage({
      files: [{
        path: "src/components/ExitPredictor.tsx",
        content: 'export const copy = "This company has a likely exit.";\n',
      }],
    });
    expect(predictive.map((finding) => finding.rule)).toContain(
      "claim.likelyExit",
    );

    const negated = scanClaimLanguage({
      files: [{
        path: "src/components/ExitPredictor.tsx",
        content: 'export const copy = "Not a forecast. Not a prediction.";\n',
      }],
    });
    expect(negated).toEqual([]);

    const outside = "src/lib/biopharma/dossierReport.ts";
    const exception: ClaimException = {
      id: "biopharma-revenue-forecast",
      file: outside,
      pattern: "Drug revenue forecast",
      reason:
        "Bounded biopharma diligence model, separate from verified M&A exit analysis.",
      boundedModel: "src/lib/biopharma/diligenceModel.ts",
    };
    expect(scanClaimLanguage({
      files: [{
        path: outside,
        content: 'export const title = "Drug revenue forecast";\n',
      }],
      exceptions: [exception],
    })).toEqual([]);
    expect(validateClaimExceptions({
      exceptions: [exception],
      fileExists: (file) =>
        file.endsWith("diligenceModel.ts") || file.endsWith("dossierReport.ts"),
    })).toEqual([]);

    const illegal: ClaimException = {
      ...exception,
      id: "exit-exemption",
      file: "src/components/ExitPredictor.tsx",
      pattern: "likely exit",
    };
    expect(
      scanClaimLanguage({
        files: [{
          path: illegal.file,
          content: 'export const copy = "likely exit";\n',
        }],
        exceptions: [illegal],
      }).some((finding) => finding.rule === "claim.likelyExit"),
    ).toBe(true);
    expect(
      validateClaimExceptions({
        exceptions: [illegal],
        fileExists: () => true,
      }).some((finding) => finding.rule === "claim.exceptionOnExitSurface"),
    )
      .toBe(true);
  });

  it("reports an economic display that drops provenance and ignores a sourced one", () => {
    const findings = auditEconomicDisplays([
      {
        path: "src/components/BareFunding.tsx",
        content:
          "export function View() {\n  return <p>{`$${company.totalFunding}M raised`}</p>;\n}\n",
      },
      {
        path: "src/components/SourcedFunding.tsx",
        content:
          "export function View() {\n  return <p>{`$${company.totalFunding}M`} · {company.valuationSource}</p>;\n}\n",
      },
    ]);
    expect(findings).toHaveLength(1);
    expect(findings[0].disposition).toBe("gap");
    expect(findings[0].location).toContain("BareFunding.tsx");
    expect(findings[0].remediation).toMatch(/URL/);
  });

  it("does not block the current catalog for current-only evidence", () => {
    const ledger = parseEconomicEvidenceLedger(rawLedger);
    const staticDataset = getStaticVerifiedDataset();
    const census = computeReplayProvenanceCensus(ledger.records);
    expect(census.economicRecords).toBeGreaterThan(0);
    expect(census.historicalReplayEligible).toBe(0);
    expect(census.currentOnlyMissingPublicAsOf).toBe(census.economicRecords);
    expect(census.note).toMatch(/Do not infer a date/);

    const modern = staticDataset.companies.find((company) =>
      company.id === "c1"
    );
    expect(modern?.totalFunding).toBe(155);
    expect(modern?.fundingSource).toMatch(/Crunchbase/);
    expect(economicEvidenceAtDecisionDate(
      ledger,
      "c1",
      "totalFunding",
      "2021-05-18",
    )).toEqual({ eligible: false, reason: "missing-provenance" });

    const findings = collectProvenanceGateFindings(ROOT);
    const blocking = findings.filter((finding) =>
      finding.disposition === "blocking"
    );
    expect(blocking, blocking.map((finding) => finding.rule).join(", "))
      .toEqual(
        [],
      );
    expect(
      findings.some((finding) =>
        finding.rule === "replay.missingPublicAsOf" &&
        finding.disposition === "gap"
      ),
    ).toBe(true);
    expect(
      findings.some((finding) =>
        finding.rule === "replay.descriptiveZeroCoercion" ||
        finding.rule === "display.economicFactWithoutProvenance"
      ),
    ).toBe(false);
    expect(
      rawDataset.companies.some((company) =>
        "totalFunding" in company || "lastKnownValuation" in company
      ),
    ).toBe(false);

    for (const file of EXIT_ANALYSIS_CLAIM_FILES) {
      expect(readFileSync(path.join(ROOT, file), "utf8").length)
        .toBeGreaterThan(
          0,
        );
    }
  });
});
