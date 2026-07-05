import process from "node:process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { VerifiedDataset } from "../src/lib/data/datasetTypes";
import { CURATED_EMPOWERMENT_LINKS } from "../src/data/patientEmpowermentCrosswalk";
import { PATIENT_EMPOWERMENT_METRICS } from "../src/data/patientEmpowermentReport";
import { buildPatientEmpowermentSnapshot } from "../src/lib/research/patientEmpowermentPipeline";

const __dirname = dirname(fileURLToPath(import.meta.url));
const datasetPath = join(__dirname, "../src/data/dataset.verified.json");

function main() {
  const raw = readFileSync(datasetPath, "utf8");
  const dataset = JSON.parse(raw) as VerifiedDataset;
  const errors: string[] = [];
  const warnings: string[] = [];

  const metricIds = new Set(PATIENT_EMPOWERMENT_METRICS.map((m) => m.id));
  const companyIds = new Set(dataset.companies.map((c) => c.id));

  for (const metric of PATIENT_EMPOWERMENT_METRICS) {
    if (metric.gapIndexPct < 0 || metric.gapIndexPct > 100) {
      errors.push(`metric ${metric.id}: gapIndexPct out of range`);
    }
    if (!metric.citedValue.trim()) {
      errors.push(`metric ${metric.id}: missing citedValue`);
    }
    if (metric.relatedSectors.length === 0) {
      warnings.push(`metric ${metric.id}: no relatedSectors`);
    }
  }

  for (const link of CURATED_EMPOWERMENT_LINKS) {
    if (!metricIds.has(link.metricId)) {
      errors.push(`curated link: unknown metricId ${link.metricId}`);
    }
    if (!companyIds.has(link.companyId)) {
      errors.push(
        `curated link: unknown companyId ${link.companyId} (${link.metricId})`,
      );
    }
  }

  const snapshot = buildPatientEmpowermentSnapshot(dataset);

  if (snapshot.summary.linkedDealCount <= 0) {
    warnings.push("pipeline: zero linked deals — check crosswalk");
  }
  if (snapshot.summary.curatedLinkCount <= 0) {
    errors.push("pipeline: zero curated links resolved");
  }
  if (snapshot.dimensions.length !== PATIENT_EMPOWERMENT_METRICS.length) {
    errors.push("pipeline: dimension count mismatch");
  }

  console.log("Patient empowerment validation");
  console.log(`Metrics: ${PATIENT_EMPOWERMENT_METRICS.length}`);
  console.log(`Curated links: ${CURATED_EMPOWERMENT_LINKS.length}`);
  console.log(
    `Pipeline: ${snapshot.summary.linkedCompanyCount} companies, ${snapshot.summary.linkedDealCount} deals, ${snapshot.summary.curatedLinkCount} curated`,
  );
  console.log(`Mean gap index: ${snapshot.summary.meanGapIndexPct}/100`);
  console.log("");

  if (warnings.length > 0) {
    console.log(`Warnings (${warnings.length}):`);
    for (const w of warnings) console.log(`  - ${w}`);
    console.log("");
  }

  if (errors.length > 0) {
    console.error(`Errors (${errors.length}):`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }

  console.log("OK — empowerment catalog and pipeline invariants passed.");
}

main();
