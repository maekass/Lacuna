import process from "node:process";
import {
  DOMESTIC_RESEARCH_STUDIES,
  STUDY_TRIAL_NCT_LINKS,
} from "../src/lib/research/domesticStudyCatalog";
import { closePool, withTransaction } from "../src/lib/data/dbClient";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  let studyCount = 0;
  let trialLinkCount = 0;
  let callsetLinkCount = 0;

  await withTransaction(async (client) => {
    await client.query(
      "TRUNCATE study_callset_links, study_trial_links, research_studies RESTART IDENTITY CASCADE",
    );

    for (const study of DOMESTIC_RESEARCH_STUDIES) {
      await client.query(
        `INSERT INTO research_studies (study_id, institution, sample_size, source, marker_genes)
         VALUES ($1, $2, $3, $4, $5::jsonb)`,
        [
          study.studyId,
          study.institution,
          study.sampleSize,
          study.source,
          JSON.stringify([...study.markerGenes]),
        ],
      );
      studyCount += 1;

      const nctIds = STUDY_TRIAL_NCT_LINKS[study.studyId] ?? [];
      for (const nctId of nctIds) {
        await client.query(
          `INSERT INTO study_trial_links (study_id, nct_id) VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [study.studyId, nctId],
        );
        trialLinkCount += 1;
      }

      if (study.variantCallsetId) {
        await client.query(
          `INSERT INTO study_callset_links (study_id, callset_id) VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [study.studyId, study.variantCallsetId],
        );
        callsetLinkCount += 1;
      }
    }
  });

  console.log(
    `Seeded ${studyCount} research studies, ${trialLinkCount} trial links, ${callsetLinkCount} callset links`,
  );
  await closePool();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
