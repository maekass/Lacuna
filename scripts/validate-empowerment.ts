import process from "node:process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { VerifiedDataset } from "../src/lib/data/datasetTypes";
import {
  curatedCompanyIds,
  CURATED_EMPOWERMENT_LINKS,
} from "../src/data/patientEmpowermentCrosswalk";
import { PATIENT_EMPOWERMENT_METRICS } from "../src/data/patientEmpowermentReport";
import { buildPatientEmpowermentSnapshot } from "../src/lib/research/patientEmpowermentPipeline";
import { EMPOWERMENT_CURATED_REVIEW_SECTORS } from "../src/lib/research/patientEmpowermentScoring";

const __dirname = dirname(fileURLToPath(import.meta.url));
const datasetPath = join(__dirname, "../src/data/dataset.verified.json");

function main() {
  const raw = readFileSync(datasetPath, "utf8");
  const dataset = JSON.parse(raw) as VerifiedDataset;
  const errors: string[] = [];
  const warnings: string[] = [];

  const metricIds = new Set(PATIENT_EMPOWERMENT_METRICS.map((m) => m.id));
  const companyIds = new Set(dataset.companies.map((c) => c.id));
  const reviewed = curatedCompanyIds();

  for (const metric of PATIENT_EMPOWERMENT_METRICS) {
    if (metric.gapIndexPct < 0 || metric.gapIndexPct > 100) {
      errors.push(`metric ${metric.id}: gapIndexPct out of range`);
    }
    if (!metric.citedValue.trim()) {
      errors.push(`metric ${metric.id}: missing citedValue`);
    }
    if (metric.sourceYear !== 2022) {
      warnings.push(`metric ${metric.id}: unexpected sourceYear`);
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
    if (!link.reviewedAt) {
      errors.push(`curated link: missing reviewedAt for ${link.companyId}`);
    }
    if (link.sourceTier && !link.sourceUrl) {
      errors.push(
        `curated link: sourceTier without sourceUrl (${link.companyId} → ${link.metricId})`,
      );
    }
  }

  const linksWithSource = CURATED_EMPOWERMENT_LINKS.filter((l) => l.sourceUrl);
  const linksMissingSource = CURATED_EMPOWERMENT_LINKS.filter(
    (l) => !l.sourceUrl,
  );

  for (const sector of EMPOWERMENT_CURATED_REVIEW_SECTORS) {
    const inSector = dataset.companies.filter((c) => c.sector === sector);
    for (const company of inSector) {
      if (!reviewed.has(company.id)) {
        warnings.push(
          `curated review gap: ${company.id} ${company.name} (${sector}) has no curated empowerment mapping`,
        );
      }
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
  if (snapshot.summary.weightedBurdenIndexPct <= snapshot.summary.meanGapIndexPct) {
    warnings.push(
      "pipeline: weighted burden should typically exceed unweighted mean",
    );
  }
  if (snapshot.priorityRankings[0]?.priorityScore === undefined) {
    errors.push("pipeline: missing priority rankings");
  }

  console.log("Patient empowerment validation");
  console.log(`Metrics: ${PATIENT_EMPOWERMENT_METRICS.length}`);
  console.log(`Curated links: ${CURATED_EMPOWERMENT_LINKS.length}`);
  console.log(
    `Evidence-backed: ${linksWithSource.length} sourced · ${linksMissingSource.length} awaiting URL`,
  );
  console.log(
    `Pipeline: ${snapshot.summary.linkedCompanyCount} companies, ${snapshot.summary.linkedDealCount} deals, ${snapshot.summary.curatedLinkCount} curated, ${snapshot.summary.evidenceBackedLinkCount} evidence-backed`,
  );
  console.log(
    `Indices: mean ${snapshot.summary.meanGapIndexPct}, median ${snapshot.summary.medianGapIndexPct}, weighted ${snapshot.summary.weightedBurdenIndexPct}`,
  );
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
