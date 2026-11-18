import { describe, expect, it } from "vitest";
import { COMPUTATION_LINEAGE_FILES } from "@/lib/lineage/computationLineage";

describe("computation lineage identity", () => {
  it("covers the evidence ledger that gates ratio denominators", () => {
    // valueBasis and verificationStatus are not in the materialized dataset
    // hash, so the ledger file itself must be part of the computation hash.
    expect(COMPUTATION_LINEAGE_FILES).toContain(
      "src/data/evidence.verified.json",
    );
  });
});
