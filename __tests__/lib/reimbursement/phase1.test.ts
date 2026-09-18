import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { reimbursementEvidenceSa051 } from "@/data/reimbursement-evidence-sa051";
import { reimbursementSourceManifestSa051 } from "@/data/reimbursement-source-manifest";
import {
  isLedgerPublishable,
  validateEvidenceLedger,
} from "@/lib/reimbursement/validation";
import {
  ledgerAssertsUnsupportedEconomics,
  validateSa051LineageShape,
} from "@/lib/reimbursement/lineage";
import { SA051_LINEAGE_ORDER } from "@/lib/reimbursement/schema";
import { validateIngestedObservationBatch } from "@/lib/reimbursement/ingestion";
import { validateReimbursementSourceManifest } from "@/lib/reimbursement/sourceManifest";
import { GET } from "@/app/api/reimbursement/evidence/route";
import { isDecisionGradeReimbursementPremium } from "@/data/valuation-premium-calculator";

const SRC_ROOT = path.resolve(__dirname, "../../../src");
const FORBIDDEN_IMPORTS = [
  "valuation-premium-calculator",
  "cpt-code-matcher",
  "reimbursement-intelligence-integration",
];

function walk(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) files.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(entry)) files.push(full);
  }
  return files;
}

describe("Phase 1 reimbursement evidence foundation", () => {
  it("seeds SA051 as an unpublished investigation with the required lineage", () => {
    const result = validateEvidenceLedger(reimbursementEvidenceSa051);
    expect(result.ok).toBe(true);
    expect(isLedgerPublishable(reimbursementEvidenceSa051)).toBe(false);
    expect(ledgerAssertsUnsupportedEconomics(reimbursementEvidenceSa051))
      .toBe(false);
    expect(validateSa051LineageShape(
      reimbursementEvidenceSa051,
      "issue:sa051-lineage",
    )).toEqual([]);

    const hops = [...reimbursementEvidenceSa051.lineageHops]
      .sort((a, b) => a.sequence - b.sequence)
      .map((hop) => hop.kind);
    expect(hops).toEqual([...SA051_LINEAGE_ORDER]);
    expect(reimbursementEvidenceSa051.sources).toEqual([]);
    expect(reimbursementEvidenceSa051.codeRates).toEqual([]);
    expect(
      reimbursementEvidenceSa051.claims.every((claim) =>
        claim.status === "machine_proposed" && claim.sourceIds.length === 0
      ),
    ).toBe(true);
  });

  it("keeps the public source manifest link-only", () => {
    const result = validateReimbursementSourceManifest(
      reimbursementSourceManifestSa051,
    );
    expect(result.ok).toBe(true);
    expect(
      reimbursementSourceManifestSa051.artifacts.every((artifact) =>
        artifact.storagePolicy === "link_only"
      ),
    ).toBe(true);
  });

  it("does not treat illustrative CPT-presence premiums as decision-grade", () => {
    expect(isDecisionGradeReimbursementPremium(1.8)).toBe(false);
    expect(isDecisionGradeReimbursementPremium(null)).toBe(false);
  });

  it("isolates the evidence engine from heuristic reimbursement modules", () => {
    const files = walk(path.join(SRC_ROOT, "lib/reimbursement"));
    const violations: string[] = [];
    for (const file of files) {
      const content = readFileSync(file, "utf8");
      for (const forbidden of FORBIDDEN_IMPORTS) {
        if (content.includes(forbidden)) {
          violations.push(
            `${path.relative(SRC_ROOT, file)} imports ${forbidden}`,
          );
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("keeps Intelligence on the investigation panel, not the heuristic dashboard", () => {
    const page = readFileSync(
      path.join(SRC_ROOT, "app/sections/IntelligencePage.tsx"),
      "utf8",
    );
    expect(page).toMatch(/ReimbursementEvidencePanel/);
    expect(page).not.toMatch(/ReimbursementIntelligenceDashboard/);
    expect(page).not.toMatch(/valuation-premium-calculator/);
  });

  it("exposes a read-only evidence API that is not publishable", () => {
    const response = GET();
    expect(response.status).toBe(200);
    return response.json().then((body: {
      publishable: boolean;
      assertsUnsupportedEconomics: boolean;
      validation: { ok: boolean };
      ledger: { issues: Array<{ id: string }> };
    }) => {
      expect(body.validation.ok).toBe(true);
      expect(body.publishable).toBe(false);
      expect(body.assertsUnsupportedEconomics).toBe(false);
      expect(body.ledger.issues[0]?.id).toBe("issue:sa051-lineage");
    });
  });

  it("accepts the Python ingestion-contract example", () => {
    const raw = execFileSync(
      "python3",
      [
        path.resolve(
          __dirname,
          "../../../scripts/reimbursement/ingestion_contract.py",
        ),
        "--emit-example",
      ],
      { encoding: "utf8" },
    );
    const batch = JSON.parse(raw) as unknown;
    const result = validateIngestedObservationBatch(batch);
    expect(result.ok).toBe(true);
    expect(result.observations).toEqual([]);
  });
});
