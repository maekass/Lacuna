import process from "node:process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { VerifiedDataset } from "../src/lib/data/datasetTypes";
import { closePool, withTransaction } from "../src/lib/data/dbClient";

const __dirname = dirname(fileURLToPath(import.meta.url));
const datasetPath = join(__dirname, "../src/data/dataset.verified.json");

function loadJson(): VerifiedDataset {
  const raw = readFileSync(datasetPath, "utf8");
  return JSON.parse(raw) as VerifiedDataset;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  const dataset = loadJson();
  const { provenance, companies, acquirers, acquisitions } = dataset;

  await withTransaction(async (client) => {
    await client.query(
      "TRUNCATE acquisitions, companies, acquirers, dataset_provenance RESTART IDENTITY CASCADE",
    );

    await client.query(
      `INSERT INTO dataset_provenance (id, last_updated, purpose, disclaimer, sources, notes)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        1,
        provenance.lastUpdated,
        provenance.purpose,
        provenance.disclaimer,
        provenance.sources,
        provenance.notes,
      ],
    );

    for (const c of companies) {
      await client.query(
        `INSERT INTO companies (
           id, name, sector, stage, founded, hq, description,
           last_known_valuation, valuation_source, total_funding, sources
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          c.id,
          c.name,
          c.sector,
          c.stage,
          c.founded ?? 0,
          c.hq ?? "Unknown",
          c.description ?? "",
          c.lastKnownValuation ?? null,
          c.valuationSource ?? null,
          c.totalFunding ?? null,
          c.sources ?? [],
        ],
      );
    }

    for (const a of acquirers) {
      await client.query(
        `INSERT INTO acquirers (id, name, ticker, sector, hq) VALUES ($1,$2,$3,$4,$5)`,
        [
          a.id,
          a.name,
          a.ticker ?? null,
          a.sector ?? "Healthcare",
          a.hq ?? "Unknown",
        ],
      );
    }

    for (const d of acquisitions) {
      await client.query(
        `INSERT INTO acquisitions (
           id, target_id, acquirer_id, target_name, acquirer_name,
           announced_date, closed_date, deal_value, deal_value_note,
           deal_type, source, strategic_rationale
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          d.id,
          d.targetId,
          d.acquirerId,
          d.targetName,
          d.acquirerName,
          d.announcedDate,
          d.closedDate ?? null,
          d.dealValue ?? null,
          d.dealValueNote ?? null,
          d.dealType,
          d.source,
          d.strategicRationale,
        ],
      );
    }
  });

  await closePool();
  console.log(
    `Imported ${companies.length} companies, ${acquirers.length} acquirers, ${acquisitions.length} acquisitions`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
