#!/usr/bin/env npx tsx
/**
 * Review Console pathway stack — one branch, one open PR, phases stack on top.
 *
 * Branch: feat/review-console-e1-e2-staging (continues #103 → #105 pathway)
 *
 * Usage:
 *   npm run review-console:stack -- prepare          # sync pathway branch with main
 *   npm run review-console:stack -- push             # push pathway branch (updates open PR)
 *   npm run review-console:stack -- pr --phase E5    # ensure PR exists / refresh body
 *   npm run review-console:stack -- ship --phase E5 # prepare + push + pr
 *   npm run review-console:stack -- after-merge       # run after pathway PR merges to main
 */

import { execSync } from "node:child_process";
import process from "node:process";

/** Long-lived pathway branch — all E4+ phases commit here (not per-phase branches). */
export const PATHWAY_BRANCH = "feat/review-console-e1-e2-staging";
export const BASE_BRANCH = "main";

interface PhaseMeta {
  issue: number;
  label: string;
  prTitle: string;
  issueDoc: string;
}

const PHASES: Record<string, PhaseMeta> = {
  E4: {
    issue: 99,
    label: "Pre-review enrichment (8-K fetch, duplicate detect)",
    prTitle: "feat: review console pathway — E4 pre-review enrichment",
    issueDoc: "docs/issues/e4-enrich.md",
  },
  E5: {
    issue: 100,
    label: "Production reviewer auth + audit log",
    prTitle: "feat: review console pathway — E5 production reviewer auth",
    issueDoc: "docs/issues/e5-auth.md",
  },
  E6: {
    issue: 101,
    label: "Metrics, changelog honesty, post-promote loop",
    prTitle: "feat: review console pathway — E6 metrics and post-promote loop",
    issueDoc: "docs/issues/e6-metrics.md",
  },
  E7: {
    issue: 102,
    label: "Polish, demo scripts, epic doc refresh",
    prTitle: "feat: review console pathway — E7 polish and demo scripts",
    issueDoc: "docs/issues/e7-polish.md",
  },
};

function run(cmd: string, options: { allowFail?: boolean } = {}): string {
  try {
    return execSync(cmd, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "inherit"],
    }).trim();
  } catch (error) {
    if (options.allowFail) return "";
    throw error;
  }
}

function runInherit(cmd: string): void {
  execSync(cmd, { stdio: "inherit" });
}

function currentBranch(): string {
  return run("git branch --show-current");
}

function hasGhCli(): boolean {
  return run("command -v gh", { allowFail: true }).length > 0;
}

function parsePhaseArg(): string | undefined {
  const idx = process.argv.indexOf("--phase");
  if (idx < 0) return undefined;
  const value = process.argv[idx + 1]?.toUpperCase();
  if (!value || !PHASES[value]) {
    console.error(
      `Unknown --phase ${value ?? "(missing)"}. Use: ${
        Object.keys(PHASES).join(", ")
      }`,
    );
    process.exit(1);
  }
  return value;
}

function buildPrBody(phase: string): string {
  const meta = PHASES[phase];
  return `## Summary
Continues the **Review Console pathway branch** (\`${PATHWAY_BRANCH}\`) — stacked on #103 → #105.

**This PR adds Phase ${phase}:** ${meta.label}

Closes #${meta.issue}

## Stack workflow
\`\`\`bash
npm run review-console:stack -- prepare    # sync with main before starting
# … implement phase …
npm run review-console:stack -- ship --phase ${phase}
\`\`\`

After merge: \`npm run review-console:stack -- after-merge\` then start the next phase.

## Test plan
- [ ] \`npm run lint && npm test && npm run validate:dataset\`
- [ ] \`npm run deno:fmt:check && npm run deno:lint\`
- [ ] Manual checks from \`${meta.issueDoc}\`
`;
}

/** Fetch and fast-forward pathway branch from main. */
export function preparePathwayBranch(): void {
  runInherit("git fetch origin");
  const branch = currentBranch();

  if (branch !== PATHWAY_BRANCH) {
    const exists = run(`git rev-parse --verify origin/${PATHWAY_BRANCH}`, {
      allowFail: true,
    });
    if (exists) {
      runInherit(`git checkout ${PATHWAY_BRANCH}`);
    } else {
      runInherit(`git checkout -b ${PATHWAY_BRANCH} origin/${BASE_BRANCH}`);
    }
  }

  runInherit(`git merge origin/${BASE_BRANCH} --no-edit`);
  console.log(`✓ ${PATHWAY_BRANCH} synced with origin/${BASE_BRANCH}`);
}

/** Push pathway branch; open PR updates automatically on GitHub. */
export function pushPathwayBranch(): void {
  if (currentBranch() !== PATHWAY_BRANCH) {
    console.error(`Must be on ${PATHWAY_BRANCH} (got ${currentBranch()})`);
    process.exit(1);
  }
  runInherit(`git push -u origin ${PATHWAY_BRANCH}`);
  console.log(`✓ pushed ${PATHWAY_BRANCH}`);
}

/** Create or refresh the open pathway PR for the given phase. */
export function ensurePathwayPr(phase: string): void {
  if (!hasGhCli()) {
    console.error("gh CLI required for PR management");
    process.exit(1);
  }

  const meta = PHASES[phase];
  const existing = run(
    `gh pr list --head ${PATHWAY_BRANCH} --state open --json number --jq '.[0].number'`,
    { allowFail: true },
  );

  if (existing) {
    console.log(`Open PR #${existing} — push updates the diff automatically.`);
    runInherit(
      `gh pr edit ${existing} --title ${JSON.stringify(meta.prTitle)} --body ${
        JSON.stringify(buildPrBody(phase))
      }`,
    );
    const url = run(`gh pr view ${existing} --json url --jq .url`);
    console.log(`✓ refreshed PR #${existing}: ${url}`);
    return;
  }

  runInherit(
    `gh pr create --head ${PATHWAY_BRANCH} --base ${BASE_BRANCH} --title ${
      JSON.stringify(meta.prTitle)
    } --body ${JSON.stringify(buildPrBody(phase))}`,
  );
  const url = run(
    `gh pr list --head ${PATHWAY_BRANCH} --state open --json url --jq '.[0].url'`,
  );
  console.log(`✓ created pathway PR: ${url}`);
}

/** After a pathway PR merges: sync branch from main for the next phase. */
export function afterPathwayMerge(): void {
  preparePathwayBranch();
  console.log(
    "\nNext: implement the next phase, then `npm run review-console:stack -- ship --phase EX`",
  );
}

function printUsage(): void {
  console.log(`Review Console pathway stack (${PATHWAY_BRANCH})

Commands:
  prepare              Sync pathway branch with origin/${BASE_BRANCH}
  push                 Push pathway branch (updates open PR)
  pr --phase E5        Create or refresh open PR for a phase
  ship --phase E5      prepare + push + pr
  after-merge          Run after pathway PR lands on ${BASE_BRANCH}

Phases: ${Object.keys(PHASES).join(", ")}
`);
}

function main(): void {
  const command = process.argv[2] ?? "help";

  switch (command) {
    case "prepare":
      preparePathwayBranch();
      break;
    case "push":
      pushPathwayBranch();
      break;
    case "pr": {
      const phase = parsePhaseArg();
      if (!phase) {
        console.error("--phase required (e.g. --phase E5)");
        process.exit(1);
      }
      ensurePathwayPr(phase);
      break;
    }
    case "ship": {
      const phase = parsePhaseArg();
      if (!phase) {
        console.error("--phase required (e.g. --phase E5)");
        process.exit(1);
      }
      preparePathwayBranch();
      pushPathwayBranch();
      ensurePathwayPr(phase);
      break;
    }
    case "after-merge":
      afterPathwayMerge();
      break;
    case "help":
    default:
      printUsage();
      break;
  }
}

try {
  main();
} catch (err: unknown) {
  console.error(err);
  process.exit(1);
}
