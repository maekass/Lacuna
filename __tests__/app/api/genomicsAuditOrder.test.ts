import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const REPO = path.resolve(__dirname, "../../..");

const ROUTES = [
  "src/app/api/genomics/variants/route.ts",
  "src/app/api/genomics/callsets/route.ts",
  "src/app/api/genomics/callsets/[callsetId]/object/route.ts",
];

describe("genomics audit order", () => {
  it("rate-limits before writing a patient-data audit", () => {
    for (const relative of ROUTES) {
      const source = readFileSync(path.join(REPO, relative), "utf8");
      const rateAt = source.indexOf("enforceRateLimit(");
      const auditAt = source.indexOf("requirePatientDataAccess(");
      expect(rateAt, relative).toBeGreaterThan(-1);
      expect(auditAt, relative).toBeGreaterThan(-1);
      expect(rateAt, relative).toBeLessThan(auditAt);
    }
  });
});
