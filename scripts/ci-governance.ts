import { appendFileSync, readFileSync } from "node:fs";
import path from "node:path";

type CheckClass = "integrity" | "smoke" | "full" | "release";
type FailurePolicy = "fail-closed" | "fail" | "warn" | "informational";
type Check = {
  id: string; class: CheckClass; scope: string; required: boolean;
  failurePolicy: FailurePolicy; command: string; claim: string;
  doesNotProve: string[];
};
type Contract = {
  version: number; allowedClasses: CheckClass[];
  allowedFailurePolicies: FailurePolicy[]; checks: Check[];
};

const ROOT = path.resolve(__dirname, "..");
const contractPath = path.join(ROOT, ".github", "ci-governance.json");
const workflowPath = path.join(ROOT, ".github", "workflows", "deno.yml");
const packagePath = path.join(ROOT, "package.json");

function fail(message: string): never {
  throw new Error("CI governance violation: " + message);
}
function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}
function commandScriptName(command: string): string | null {
  return command.match(/npm run ([^\s]+)/)?.[1] ?? null;
}

function main() {
  const contract = readJson<Contract>(contractPath);
  const packageJson = readJson<{ scripts: Record<string, string> }>(packagePath);
  const workflow = readFileSync(workflowPath, "utf8");

  if (contract.version !== 1) fail("unsupported contract version");
  if (contract.checks.length === 0) fail("contract has no checks");

  const ids = new Set<string>();
  const classes = new Set(contract.allowedClasses);
  const policies = new Set(contract.allowedFailurePolicies);

  for (const check of contract.checks) {
    if (ids.has(check.id)) fail("duplicate check id: " + check.id);
    ids.add(check.id);
    if (!classes.has(check.class)) fail("check " + check.id + " uses undeclared class");
    if (!policies.has(check.failurePolicy)) fail("check " + check.id + " uses undeclared failure policy");
    if (!check.scope || !check.claim || !check.command) fail("check " + check.id + " is missing scope, claim, or command");
    if (check.doesNotProve.length === 0) fail("check " + check.id + " must declare at least one limitation");

    const script = commandScriptName(check.command);
    if (script && !packageJson.scripts[script]) {
      fail("check " + check.id + " references missing npm script: " + script);
    }
    if (check.required && !["fail", "fail-closed"].includes(check.failurePolicy)) {
      fail("required check " + check.id + " must use fail or fail-closed policy");
    }
    if (check.class === "smoke" && /truth|validity|complete|correctness/i.test(check.claim)) {
      fail("smoke check " + check.id + " makes a claim beyond operability/wiring");
    }
    if (check.class === "release" && check.required) {
      fail("release check " + check.id + " cannot be universally required");
    }
  }

  const requiredAllPr = contract.checks.filter(
    (check) => check.required && check.scope === "all-prs",
  );
  if (requiredAllPr.length === 0) fail("no universal PR integrity checks are declared");

  for (const check of requiredAllPr) {
    if (!workflow.includes(check.command)) {
      fail("universal check " + check.id + " is not represented in the main CI workflow: " + check.command);
    }
  }

  if (!workflow.includes("npm run ci:governance")) {
    fail("main CI workflow must execute the CI governance gate");
  }

  const requiredWorkflowCommands = contract.checks
    .filter((check) => check.required)
    .map((check) => check.command)
    .filter((command) => command.startsWith("npm run "));
  const missing = requiredWorkflowCommands.filter((command) => !workflow.includes(command));
  if (missing.length > 0) {
    fail("required npm commands missing from main CI workflow: " + missing.join(", "));
  }

  const summary = [
    "# Lacuna CI Governance",
    "",
    "- Contract version: " + contract.version,
    "- Declared checks: " + contract.checks.length,
    "- Universal PR checks: " + requiredAllPr.length,
    "- Integrity: " + contract.checks.filter((c) => c.class === "integrity").length,
    "- Smoke: " + contract.checks.filter((c) => c.class === "smoke").length,
    "- Full: " + contract.checks.filter((c) => c.class === "full").length,
    "- Release: " + contract.checks.filter((c) => c.class === "release").length,
    "",
    "Passing this gate verifies the governance contract and CI wiring.",
    "It does not replace the substantive checks represented by the contract.",
  ].join("\n");

  console.log(summary);
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary + "\n");
  }
}

main();
