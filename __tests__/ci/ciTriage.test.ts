import { describe, expect, it } from "vitest";
// @ts-expect-error -- plain ESM module without type declarations
import { classify, shouldRerun } from "../../scripts/ci-triage-rules.mjs";

const ESC = "\u001b";

describe("ci triage classifier", () => {
  it("flags the Playwright Ubuntu 26.04 runner failure as a fix, not a re-run", () => {
    const log = [
      "2026-11-15T22:31:20.5884456Z Cannot install dependencies for ubuntu26.04-x64 with Playwright 1.60.0!",
      "2026-11-15T22:31:20.6130972Z Error: ERROR: Playwright does not support chromium on ubuntu26.04-x64",
    ].join("\n");
    const r = classify(log);
    expect(r.id).toBe("playwright-runner-os");
    expect(r.action).toBe("fix");
  });

  it("flags deno fmt failures with colour codes", () => {
    const log =
      `2026-11-15T22:32:03.1Z ${ESC}[1m${ESC}[31merror${ESC}[0m: Found 1 not formatted file in 1146 files`;
    const r = classify(log);
    expect(r.id).toBe("format");
    expect(r.evidence).toBe("error: Found 1 not formatted file in 1146 files");
  });

  it("flags typecheck, eslint and test failures", () => {
    expect(classify("src/a.ts(3,1): error TS2322: Type 'x'").id).toBe(
      "typecheck",
    );
    expect(classify("\u2716 4 problems (4 errors, 0 warnings)").id).toBe(
      "eslint",
    );
    expect(classify(" Test Files  2 failed | 80 passed (82)").id).toBe("tests");
  });

  it("treats network errors as transient", () => {
    expect(classify("npm error code ETIMEDOUT").action).toBe("rerun");
  });

  it("prefers a real failure over a transient-looking line in the same log", () => {
    const log =
      "warn ECONNRESET retrying\nsrc/a.ts(1,1): error TS2304: Cannot find name";
    expect(classify(log).id).toBe("typecheck");
  });

  it("returns inspect for unknown logs", () => {
    expect(classify("something odd happened").action).toBe("inspect");
  });

  it("re-runs only when every failure is transient and only on attempt 1", () => {
    const t = { action: "rerun" };
    const f = { action: "fix" };
    expect(shouldRerun([t, t], 1)).toBe(true);
    expect(shouldRerun([t, f], 1)).toBe(false);
    expect(shouldRerun([t], 2)).toBe(false);
    expect(shouldRerun([], 1)).toBe(false);
  });
});
