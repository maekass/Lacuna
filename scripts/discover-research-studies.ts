#!/usr/bin/env tsx
/**
 * Discover domestic study candidates via NIH RePORTER + ClinicalTrials.gov + LLM.
 * Writes staging JSON for human review — does NOT modify domesticStudyCatalog.ts.
 *
 * Usage:
 *   npm run research:discover -- --preset mit
 *   npm run research:discover -- --preset broad --out data/research/staging/mit-candidates.json
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { discoverDomesticStudyCandidates } from "../src/lib/research/domesticStudyDiscoveryLlm";
import { fetchResearchDiscoveryGrounding } from "../src/lib/research/researchDiscoveryFetch";
import {
  RESEARCH_DISCOVERY_PRESET_IDS,
  type ResearchDiscoveryPresetId,
} from "../src/lib/research/researchDiscoveryPresets";

function parseArgs(argv: string[]): {
  presetId: ResearchDiscoveryPresetId;
  outPath: string;
  maxCandidates: number;
} {
  let presetId: ResearchDiscoveryPresetId = "mit";
  let outPath = "";
  let maxCandidates = 8;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--preset" && argv[i + 1]) {
      const raw = argv[++i];
      if (
        RESEARCH_DISCOVERY_PRESET_IDS.includes(raw as ResearchDiscoveryPresetId)
      ) {
        presetId = raw as ResearchDiscoveryPresetId;
      } else {
        console.error(`Unknown preset: ${raw}`);
        process.exit(1);
      }
    } else if (arg === "--out" && argv[i + 1]) {
      outPath = argv[++i];
    } else if (arg === "--max" && argv[i + 1]) {
      maxCandidates = Math.min(12, Math.max(1, Number(argv[++i]) || 8));
    }
  }

  if (!outPath) {
    outPath = path.join(
      "data",
      "research",
      "staging",
      `${presetId}-study-candidates.json`,
    );
  }

  return { presetId, outPath, maxCandidates };
}

async function main() {
  const { presetId, outPath, maxCandidates } = parseArgs(process.argv.slice(2));

  console.log(`Discovering ${presetId} women's health studies…`);
  const grounding = await fetchResearchDiscoveryGrounding(presetId);
  console.log(
    `Grounding: ${grounding.grants.length} NIH grants, ${grounding.trials.length} CT.gov trials`,
  );
  if (grounding.errors.length) {
    console.warn("Source errors:", grounding.errors.join("; "));
  }

  const result = await discoverDomesticStudyCandidates(grounding, {
    maxCandidates,
  });

  const payload = {
    generatedAt: new Date().toISOString(),
    presetId: result.presetId,
    modelId: result.modelId,
    configured: result.configured,
    warnings: result.warnings,
    groundingSummary: result.groundingSummary,
    disclaimer:
      "Staging only — review each candidate before merging into src/lib/research/domesticStudyCatalog.ts",
    candidates: result.candidates,
  };

  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  console.log(`Wrote ${result.candidates.length} candidates → ${outPath}`);
  if (!result.configured) {
    console.log(
      "(Deterministic mode — set AI_GATEWAY_API_KEY or OPENAI_API_KEY for LLM structuring)",
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
