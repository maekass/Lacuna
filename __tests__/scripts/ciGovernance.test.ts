import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../..");

describe("CI governance contract", () => {
  it("declares the four governance classes", () => {
    const contract = JSON.parse(
      readFileSync(path.join(ROOT, ".github", "ci-governance.json"), "utf8"),
    ) as { allowedClasses: string[]; checks: Array<{ class: string }> };

    expect(contract.allowedClasses).toEqual([
      "integrity",
      "smoke",
      "full",
      "release",
    ]);
    expect(contract.checks.some((c) => c.class === "integrity")).toBe(true);
    expect(contract.checks.some((c) => c.class === "smoke")).toBe(true);
    expect(contract.checks.some((c) => c.class === "full")).toBe(true);
    expect(contract.checks.some((c) => c.class === "release")).toBe(true);
  });

  it("keeps required checks blocking and release checks conditional", () => {
    const contract = JSON.parse(
      readFileSync(path.join(ROOT, ".github", "ci-governance.json"), "utf8"),
    ) as { checks: Array<{ class: string; required: boolean; failurePolicy: string }> };

    for (const check of contract.checks) {
      if (check.required) {
        expect(["fail", "fail-closed"]).toContain(check.failurePolicy);
      }
      if (check.class === "release") {
        expect(check.required).toBe(false);
      }
    }
  });

  it("requires every smoke check to declare a limitation", () => {
    const contract = JSON.parse(
      readFileSync(path.join(ROOT, ".github", "ci-governance.json"), "utf8"),
    ) as { checks: Array<{ class: string; doesNotProve: string[] }> };

    for (const check of contract.checks) {
      if (check.class === "smoke") {
        expect(check.doesNotProve.length).toBeGreaterThan(0);
      }
    }
  });

  it("wires the governance gate into pull-request CI", () => {
    const workflow = readFileSync(
      path.join(ROOT, ".github", "workflows", "deno.yml"),
      "utf8",
    );
    const governanceWorkflow = readFileSync(
      path.join(ROOT, ".github", "workflows", "ci-governance.yml"),
      "utf8",
    );

    expect(workflow).toContain("npm run ci:governance");
    expect(workflow).toContain("ci-governance");
    expect(governanceWorkflow).toContain("pull_request:");
    expect(governanceWorkflow).toContain("npm run ci:governance");
    expect(governanceWorkflow).toContain("CI Governance / contract");
  });
});
