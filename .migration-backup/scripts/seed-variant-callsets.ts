/**
 * Infrastructure seed — domestic NIH / Harvard / MIT callsets for local ClickHouse dev.
 * NOT part of the verified M&A dataset; labeled for operator testing only.
 */
import process from "node:process";
import { createClient } from "@clickhouse/client";
import { buildObjectUri } from "../src/lib/genomics/objectStorage";
import { DOMESTIC_CALLSET_SEED } from "./data/domesticCallsetSeed";

async function main() {
  const url = process.env.CLICKHOUSE_URL;
  if (!url) {
    console.error("CLICKHOUSE_URL is required");
    process.exit(1);
  }

  const database = process.env.CLICKHOUSE_DATABASE?.trim() || "lacuna";
  const client = createClient({ url, database });

  try {
    const callsetRows = DOMESTIC_CALLSET_SEED.map((row) => ({
      callset_id: row.callsetId,
      sample_id: row.sampleId,
      study_id: row.studyId,
      assembly: row.assembly,
      object_uri: buildObjectUri(row.objectKey),
      bytes: row.bytes,
      variant_count: row.variants.length,
      checksum: `sha256:infra-seed-${row.callsetId}`,
      notes: row.notes,
    }));

    await client.insert({
      table: "callsets",
      values: callsetRows,
      format: "JSONEachRow",
    });

    const variantRows = DOMESTIC_CALLSET_SEED.flatMap((row) =>
      row.variants.map((v) => ({
        callset_id: row.callsetId,
        ...v,
      }))
    );

    await client.insert({
      table: "variant_records",
      values: variantRows,
      format: "JSONEachRow",
    });

    const totalVariants = variantRows.length;
    console.log(
      `Seeded ${DOMESTIC_CALLSET_SEED.length} domestic callsets with ${totalVariants} variant summaries`,
    );
    for (const row of DOMESTIC_CALLSET_SEED) {
      console.log(`  - ${row.callsetId} (${row.studyId})`);
    }
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
