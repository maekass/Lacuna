import { describe, expect, it } from "vitest";
import rawLedger from "@/data/evidence.verified.json";
import {
  ECONOMIC_VALUE_BASES,
  type EconomicEvidenceRecord,
  type EconomicValueBasis,
  parseEconomicEvidenceLedger,
  RATIO_DENOMINATOR_BASES,
  ratioDenominatorAdmission,
} from "@/lib/data/evidenceLedger";
import {
  getStaticVerifiedDataset,
  isStaticRatioDenominatorAdmissible,
  staticRatioDenominatorValues,
} from "@/lib/data/staticDataset";
import { buildVerifiedDerivedData } from "@/lib/data/verifiedDataHelpers";

function ledgerWith(overrides: Partial<EconomicEvidenceRecord>) {
  return parseEconomicEvidenceLedger({
    schemaVersion: "1.0",
    records: [{
      id: "x1:totalFunding:v1",
      companyId: "x1",
      field: "totalFunding",
      value: 100,
      unit: "USD_M",
      valueBasis: "stated",
      sourceCitation: "fixture citation",
      effectiveDate: null,
      publicAsOfDate: null,
      datePrecision: "unknown",
      verificationStatus: "reported",
      recordedAt: "2026-11-18",
      ...overrides,
    }],
  });
}

const EXCLUDED_BASES: readonly EconomicValueBasis[] = [
  "range_high",
  "at_least",
  "up_to",
  "upfront",
  "stake",
  "unquoted_fx",
  "unstated_conflict",
  "locator_only",
];

describe("ratioDenominatorAdmission", () => {
  it("partitions every declared basis into admitted or excluded", () => {
    for (const basis of ECONOMIC_VALUE_BASES) {
      expect(
        RATIO_DENOMINATOR_BASES.has(basis) !== EXCLUDED_BASES.includes(basis),
      ).toBe(true);
    }
  });

  it("admits a stated, reported whole-company figure", () => {
    expect(ratioDenominatorAdmission(ledgerWith({}), "x1", "totalFunding"))
      .toEqual({ admissible: true, basis: "stated" });
  });

  it.each(EXCLUDED_BASES)("refuses %s as a denominator", (basis) => {
    expect(
      ratioDenominatorAdmission(
        ledgerWith({ valueBasis: basis }),
        "x1",
        "totalFunding",
      ),
    ).toEqual({ admissible: false, reason: "inadmissible-basis", basis });
  });

  it("fails closed when the basis is missing", () => {
    expect(
      ratioDenominatorAdmission(
        ledgerWith({ valueBasis: undefined }),
        "x1",
        "totalFunding",
      ),
    ).toEqual({ admissible: false, reason: "missing-basis" });
  });

  it("fails closed when there is no ledger record for the field", () => {
    const ledger = ledgerWith({});
    expect(ratioDenominatorAdmission(ledger, "x2", "totalFunding")).toEqual({
      admissible: false,
      reason: "missing-evidence",
    });
    expect(ratioDenominatorAdmission(ledger, "x1", "lastKnownValuation"))
      .toEqual({ admissible: false, reason: "missing-evidence" });
  });

  it("refuses contested and retracted records even with a stated basis", () => {
    expect(
      ratioDenominatorAdmission(
        ledgerWith({ verificationStatus: "contested" }),
        "x1",
        "totalFunding",
      ),
    ).toEqual({
      admissible: false,
      reason: "unverified-status",
      basis: "stated",
    });
    // A retracted record is not a current record, so nothing is admitted.
    expect(
      ratioDenominatorAdmission(
        ledgerWith({ verificationStatus: "retracted" }),
        "x1",
        "totalFunding",
      ).admissible,
    ).toBe(false);
  });

  it("uses the superseding record, not the original", () => {
    const ledger = parseEconomicEvidenceLedger({
      schemaVersion: "1.0",
      records: [
        ...ledgerWith({ valueBasis: "locator_only" }).records,
        {
          ...ledgerWith({}).records[0],
          id: "x1:totalFunding:v2",
          supersedesId: "x1:totalFunding:v1",
          valueBasis: "sum_of_cited_rounds",
        },
      ],
    });
    expect(ratioDenominatorAdmission(ledger, "x1", "totalFunding")).toEqual({
      admissible: true,
      basis: "sum_of_cited_rounds",
    });
  });
});

describe("static ledger denominator gate", () => {
  const ledger = parseEconomicEvidenceLedger(rawLedger);

  it("matches the per-record rule for every static economic record", () => {
    for (const record of ledger.records) {
      expect(
        isStaticRatioDenominatorAdmissible(record.companyId, record.field),
      ).toBe(
        ratioDenominatorAdmission(ledger, record.companyId, record.field)
          .admissible,
      );
    }
  });

  it("refuses the locator-only Modern Fertility funding figure", () => {
    expect(isStaticRatioDenominatorAdmissible("c1", "totalFunding")).toBe(
      false,
    );
  });
});

describe("client funding-denominator gate", () => {
  it("lists exactly the admitted static funding figures with their values", () => {
    const ledger = parseEconomicEvidenceLedger(rawLedger);
    const dataset = getStaticVerifiedDataset();
    const admitted = staticRatioDenominatorValues("totalFunding");
    const funded = new Set(
      ledger.records.filter((r) => r.field === "totalFunding").map((r) =>
        r.companyId
      ),
    );
    for (const id of funded) {
      expect(Object.hasOwn(admitted, id), id).toBe(
        isStaticRatioDenominatorAdmissible(id, "totalFunding"),
      );
    }
    for (const [id, value] of Object.entries(admitted)) {
      expect(dataset.companies.find((c) => c.id === id)?.totalFunding).toBe(
        value,
      );
    }
  });

  it("fails closed when the provider receives no admitted values", () => {
    const closed = buildVerifiedDerivedData(getStaticVerifiedDataset());
    expect(
      closed.verifiedCompanies.some((c) =>
        c.totalFunding !== undefined &&
        closed.admitFundingDenominator(c.id, c.totalFunding)
      ),
    ).toBe(false);
  });

  it("refuses a loaded value that differs from the admitted ledger value", () => {
    // DB mode can load a different figure for an id the static ledger admits.
    const derived = buildVerifiedDerivedData(getStaticVerifiedDataset(), {
      c100: 50,
    });
    expect(derived.admitFundingDenominator("c100", 50)).toBe(true);
    expect(derived.admitFundingDenominator("c100", 75)).toBe(false);
    expect(derived.admitFundingDenominator("c101", 50)).toBe(false);
    // Prototype keys are not admitted ids.
    expect(derived.admitFundingDenominator("toString", 50)).toBe(false);
  });
});
