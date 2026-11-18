/**
 * Classify failed CI job logs into a cause, an action and a fix hint.
 *
 * Pure function with no I/O so it can be unit tested and reused by
 * .github/workflows/ci-triage.yml. It never edits code. The only automatic
 * action it can recommend is a single re-run for transient infrastructure
 * failures.
 */

/** @typedef {{ id: string, label: string, action: "rerun" | "fix", hint: string, patterns: RegExp[] }} Rule */

/** @type {Rule[]} */
export const RULES = [
  {
    id: "playwright-runner-os",
    label: "Runner image not supported by Playwright",
    action: "fix",
    hint:
      "ubuntu-latest moved to Ubuntu 26.04. Playwright supports it from 1.61. Upgrade @playwright/test, or pin the job to ubuntu-24.04 as a stopgap.",
    patterns: [/Playwright does not support \S+ on ubuntu\d/i],
  },
  {
    id: "format",
    label: "Deno formatting",
    action: "fix",
    hint: "Run `npm run deno:fmt`, commit the result, and push.",
    patterns: [/Found \d+ not formatted files?/],
  },
  {
    id: "governance",
    label: "CI governance contract",
    action: "fix",
    hint:
      "Run `npm run ci:governance` locally and align .github/ci-governance.json with the workflow.",
    patterns: [/CI governance violation/],
  },
  {
    id: "typecheck",
    label: "TypeScript typecheck",
    action: "fix",
    hint: "Run `npm run typecheck` and fix the listed errors.",
    patterns: [/error TS\d{4}:/],
  },
  {
    id: "eslint",
    label: "ESLint",
    action: "fix",
    hint:
      "Run `npm run lint` locally. Many issues fix with `npx eslint --fix`.",
    patterns: [/\u2716 \d+ problems?/, /\d+ problems? \(\d+ errors?/],
  },
  {
    id: "deno-lint",
    label: "Deno lint",
    action: "fix",
    hint: "Run `npm run deno:lint` and fix the listed rules.",
    patterns: [
      /Found \d+ problems?\s*$/m,
      /\(require-await\)|\(no-node-globals\)/,
    ],
  },
  {
    id: "tests",
    label: "Test failure",
    action: "fix",
    hint:
      "Run the failing suite locally (`npm test`, or the Python command from the log). This needs a code or test change, not a re-run.",
    patterns: [
      /Test Files\s+\d+ failed/,
      /^\s*FAIL\s/m,
      /FAILED \S+::/,
      /\d+ failed, \d+ passed/,
    ],
  },
  {
    id: "transient",
    label: "Transient infrastructure or network",
    action: "rerun",
    hint:
      "Looks like a network or runner hiccup. One automatic re-run is allowed.",
    patterns: [
      /ETIMEDOUT|ECONNRESET|EAI_AGAIN|ENOTFOUND registry/,
      /\b(502 Bad Gateway|503 Service Unavailable|504 Gateway Time-?out)\b/,
      /The runner has received a shutdown signal/,
      /lost communication with the server/i,
      /npm error network/i,
    ],
  },
];

/**
 * @param {string} log Raw job log text.
 * @returns {{ id: string, label: string, action: "rerun" | "fix" | "inspect", hint: string, evidence: string | null }}
 */
export function classify(log) {
  // Strip ANSI colour codes and GitHub timestamps so patterns stay simple.
  // deno-lint-ignore no-control-regex
  const clean = log.replace(/\u001b\[[0-9;]*m|\^\[\[[0-9;]*m/g, "").replace(
    /^\S*\d{4}-\d\d-\d\dT[\d:.]+Z /gm,
    "",
  );
  for (const rule of RULES) {
    for (const pattern of rule.patterns) {
      const m = clean.match(pattern);
      if (m) {
        const line = clean.split("\n").find((l) => l.includes(m[0])) ?? m[0];
        return {
          id: rule.id,
          label: rule.label,
          action: rule.action,
          hint: rule.hint,
          evidence: line.trim().slice(0, 300),
        };
      }
    }
  }
  return {
    id: "unknown",
    label: "Unclassified",
    action: "inspect",
    hint: "No known pattern matched. Open the job log.",
    evidence: null,
  };
}

/**
 * Decide whether the whole run may be re-run automatically.
 * Only when every failed job is transient, and only on the first attempt.
 * @param {{ action: string }[]} results
 * @param {number} attempt
 */
export function shouldRerun(results, attempt) {
  return attempt === 1 && results.length > 0 &&
    results.every((r) => r.action === "rerun");
}
