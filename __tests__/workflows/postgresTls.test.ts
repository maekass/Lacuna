import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const WORKFLOWS = path.resolve(__dirname, "../../.github/workflows");

function workflowFiles(): string[] {
  return readdirSync(WORKFLOWS)
    .filter((name) => name.endsWith(".yml") || name.endsWith(".yaml"))
    .map((name) => path.join(WORKFLOWS, name));
}

describe("GitHub workflow Postgres TLS", () => {
  it("never sets PGSSLMODE: disable beside secrets.DATABASE_URL", () => {
    const hits: string[] = [];
    for (const file of workflowFiles()) {
      const text = readFileSync(file, "utf8");
      if (
        /PGSSLMODE:\s*disable/.test(text) &&
        /secrets\.DATABASE_URL/.test(text)
      ) {
        hits.push(path.basename(file));
      }
    }
    expect(hits).toEqual([]);
  });

  it("declares a permissions block at workflow or job level", () => {
    const missing: string[] = [];
    for (const file of workflowFiles()) {
      const text = readFileSync(file, "utf8");
      const topLevel = /^permissions:/m.test(text);
      const jobLevel = /^\s{2,}permissions:/m.test(text);
      if (!topLevel && !jobLevel) missing.push(path.basename(file));
    }
    expect(missing).toEqual([]);
  });
});
