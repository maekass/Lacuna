import { describe, expect, it } from "vitest";
import rawLedger from "@/data/evidence.verified.json";
import {
  ECONOMIC_VALUE_BASES,
  parseEconomicEvidenceLedger,
} from "@/lib/data/evidenceLedger";
import { inspectLedgerRecords } from "@/lib/data/ledgerStructure";
import {
  BASIS_NOT_RECORDED,
  ledgerBasisLabel,
  VALUE_BASIS_PLAIN_LABEL,
  valueBasisPlainLabel,
  withBasisLabel,
} from "@/lib/data/valueBasisLabel";

describe("value basis labels", () => {
  it("names every basis without calling it verified or a probability", () => {
    for (const basis of ECONOMIC_VALUE_BASES) {
      const label = VALUE_BASIS_PLAIN_LABEL[basis];
      expect(label.length).toBeGreaterThan(0);
      expect(label).not.toMatch(/verified|probability|probabilities|\bodds\b/i);
    }
    expect(valueBasisPlainLabel(undefined)).toBe(BASIS_NOT_RECORDED);
    expect(withBasisLabel("$10M", "stated")).toBe("$10M · stated");
  });

  it("uses the active ledger row for a company field", () => {
    const ledger = parseEconomicEvidenceLedger(rawLedger);
    const active = [...inspectLedgerRecords(ledger.records).active.values()];
    const sample = active.find((record) => record.valueBasis);
    expect(sample).toBeDefined();
    expect(
      ledgerBasisLabel(
        sample!.companyId,
        sample!.field as "totalFunding" | "lastKnownValuation",
      ),
    ).toBe(valueBasisPlainLabel(sample!.valueBasis));
    expect(ledgerBasisLabel("missing-company", "totalFunding")).toBe(
      BASIS_NOT_RECORDED,
    );
  });
});
