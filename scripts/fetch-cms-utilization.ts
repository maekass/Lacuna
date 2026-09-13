#!/usr/bin/env npx tsx

/**
 * CMS utilization artifact builder.
 *
 * MeshIC guardrails:
 * - never treat a single provider row as national utilization;
 * - never substitute undocumented hard-coded utilization values;
 * - preserve field-level provenance for every CPT/HCPCS observation;
 * - calculate reimbursement as sum(services_i * payment_i), not
 *   sum(services) * mean(payment).
 *
 * Input is an explicitly curated/aggregated staging file produced from a CMS
 * PUF or equivalent reproducible query. If that input is absent, the artifact
 * is emitted with null sector values rather than fabricated fallbacks.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { z } from "zod";
import { selectLatestVintageObservations } from "../src/lib/data/cmsObservationVintage";

const SECTOR_CPT_CODES: Record<string, string[]> = {
  fertility: ["58321", "58322", "58970", "89250"],
  maternal_health: ["59400", "59510", "59618", "76801", "76805"],
  mental_health: ["90791", "90834", "90837", "96116", "96127"],
  gynecology: ["57420", "57421", "58100", "58300", "58558"],
  pelvic_health: ["51741", "51798", "57288", "57289"],
  menopause: ["99213", "99214", "84443", "82671"],
  contraception: ["58300", "58301", "J7300", "J7302"],
  breast_health: ["77067", "77063", "19101", "38525"],
  wearable_monitoring: ["99453", "99454", "99457", "99458"],
  digital_therapeutics: ["98960", "99421", "99422", "99423"],
};

const verifiedObservationSchema = z.object({
  sector: z.string().min(1),
  cptCode: z.string().min(1),
  totalServices: z.number().nonnegative(),
  avgMedicarePayment: z.number().nonnegative(),
  dataYear: z.number().int().min(2000).max(2100),
  datasetId: z.string().min(1),
  sourceUrl: z.string().url(),
  retrievedAt: z.string().min(1),
  aggregationMethod: z.string().min(1),
});

const verifiedInputSchema = z.object({
  source: z.literal("CMS"),
  observations: z.array(verifiedObservationSchema),
});

type VerifiedObservation = z.infer<typeof verifiedObservationSchema>;

const INPUT_PATH = "staging/cms-utilization-verified.json";
const OUTPUT_PATH = "src/data/computed-cms-utilization.json";

function loadVerifiedObservations(): VerifiedObservation[] {
  if (!existsSync(INPUT_PATH)) {
    console.warn(
      `⚠️ ${INPUT_PATH} not found; CMS utilization will be withheld.`,
    );
    return [];
  }
  const parsed = verifiedInputSchema.parse(
    JSON.parse(readFileSync(INPUT_PATH, "utf8")),
  );
  return parsed.observations;
}

function buildSector(
  sector: string,
  codes: string[],
  observations: VerifiedObservation[],
) {
  const allowedCodes = new Set(codes);
  const rows = observations.filter(
    (row) => row.sector === sector && allowedCodes.has(row.cptCode),
  );

  if (rows.length === 0) {
    return {
      sector,
      cptCodes: codes,
      totalAnnualServices: null,
      avgServicesPerCode: null,
      avgPaymentPerService: null,
      estimatedAnnualReimbursement: null,
      source: "withheld — no verified aggregated CMS utilization input",
      method:
        "No estimate published. Provide field-level aggregated CMS observations in staging/cms-utilization-verified.json.",
      evidenceStatus: "withheld" as const,
    };
  }

  const selected = selectLatestVintageObservations(rows);
  const vintageRows = selected.rows;
  if (selected.droppedOlderYearCount > 0) {
    console.warn(
      `${sector}: ignored ${selected.droppedOlderYearCount} older-year CMS observation(s); using ${selected.vintage} only.`,
    );
  }
  if (selected.droppedDuplicateCodeCount > 0) {
    console.warn(
      `${sector}: ignored ${selected.droppedDuplicateCodeCount} duplicate CPT observation(s) in ${selected.vintage}.`,
    );
  }

  const totalServices = vintageRows.reduce(
    (sum, row) => sum + row.totalServices,
    0,
  );
  const weightedReimbursement = vintageRows.reduce(
    (sum, row) => sum + row.totalServices * row.avgMedicarePayment,
    0,
  );
  const weightedAvgPayment = totalServices > 0
    ? weightedReimbursement / totalServices
    : null;

  return {
    sector,
    cptCodes: codes,
    totalAnnualServices: totalServices,
    avgServicesPerCode: Number((totalServices / vintageRows.length).toFixed(2)),
    avgPaymentPerService: weightedAvgPayment === null
      ? null
      : Number(weightedAvgPayment.toFixed(2)),
    estimatedAnnualReimbursement: Number(
      (weightedReimbursement / 1_000_000).toFixed(2),
    ),
    source: "CMS verified aggregate observations",
    method:
      "Estimated reimbursement = sum over the latest dataYear of CPT/HCPCS observations of totalServices × avgMedicarePayment. Older years and duplicate codes in that vintage are not added into the annual total.",
    evidenceStatus: "verified_aggregate" as const,
    dataYears: selected.vintage === null ? [] : [selected.vintage],
    sourceUrls: [...new Set(vintageRows.map((row) => row.sourceUrl))],
    datasetIds: [...new Set(vintageRows.map((row) => row.datasetId))],
  };
}

function main() {
  const observations = loadVerifiedObservations();

  const allowedPairs = new Set(
    Object.entries(SECTOR_CPT_CODES).flatMap(([sector, codes]) =>
      codes.map((code) => `${sector}:${code}`)
    ),
  );

  const filtered = observations.filter((row) => {
    const allowed = allowedPairs.has(`${row.sector}:${row.cptCode}`);
    if (!allowed) {
      console.warn(
        `Ignoring unexpected CMS observation ${row.sector}:${row.cptCode}`,
      );
    }
    return allowed;
  });

  const sectors = Object.entries(SECTOR_CPT_CODES).map(([sector, codes]) =>
    buildSector(sector, codes, filtered)
  );

  const output = {
    generatedAt: new Date().toISOString(),
    source:
      "CMS Medicare Public Use File / data.cms.gov — curated aggregate input only",
    inputPath: INPUT_PATH,
    evidenceStatus: filtered.length > 0 ? "partial_or_complete" : "withheld",
    sectors,
    utilizationByCptCode: filtered.map((row) => ({
      sector: row.sector,
      cptCode: row.cptCode,
      totalServices: row.totalServices,
      avgMedicarePayment: row.avgMedicarePayment,
      dataYear: row.dataYear,
      datasetId: row.datasetId,
      sourceUrl: row.sourceUrl,
      retrievedAt: row.retrievedAt,
      aggregationMethod: row.aggregationMethod,
      evidenceKind: "primary_aggregate" as const,
    })),
    method:
      "National/sector totals are published only from explicitly aggregated, sourceable CMS observations. Reimbursement uses volume-weighted code-level arithmetic.",
    disclaimer:
      "Medicare utilization is not an all-payer market-size estimate. Absence of verified aggregate input yields null values rather than fallback estimates.",
  };

  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2) + "\n");
  console.log(
    filtered.length > 0
      ? `✅ CMS utilization artifact built from ${filtered.length} verified observations.`
      : "✅ CMS utilization artifact built with utilization withheld pending verified aggregate input.",
  );
}

main();
