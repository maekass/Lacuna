import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("restore-postgres SSL unset", () => {
  it("deletes PGSSLMODE instead of assigning the string undefined", () => {
    const source = readFileSync(
      path.resolve(__dirname, "../../scripts/restore-postgres.ts"),
      "utf8",
    );
    expect(source).toMatch(/delete process\.env\.PGSSLMODE/);
    expect(source).not.toMatch(/process\.env\.PGSSLMODE = undefined/);
  });
});
