/**
 * Re-encrypt review_audit_log.actor_id under the active field-encryption key.
 * Also encrypts legacy plaintext rows written before field encryption.
 *
 *   npm run encryption:rotate -- --dry-run
 *   npm run encryption:rotate
 *
 * Reads LACUNA_FIELD_ENCRYPTION_KEYS / LACUNA_FIELD_ENCRYPTION_ACTIVE_KEY and
 * DATABASE_URL from the environment, falling back to `.env.local` for values
 * not already exported. Also removes the legacy plaintext `metadata.login`
 * copy from GitHub sign-in rows. Prints counts only, never values.
 */
import process from "node:process";
import { closePool, withTransaction } from "../src/lib/data/dbClient";
import { fieldKeyringFromEnv } from "../src/lib/infra/fieldEncryption";
import { rotateReviewAuditActorIds } from "../src/lib/ingestion/reviewAuditLog";
import { loadEnvLocal } from "./lib/envLocal";

async function main() {
  loadEnvLocal();
  const dryRun = process.argv.slice(2).includes("--dry-run");
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required.");
    process.exit(1);
  }
  const keyring = fieldKeyringFromEnv();
  const result = await withTransaction((client) =>
    rotateReviewAuditActorIds(client, keyring, { dryRun })
  );
  console.log(
    `${
      dryRun ? "[dry run] " : ""
    }review_audit_log.actor_id: scanned ${result.scanned}, ` +
      `${
        dryRun ? "would rotate" : "rotated"
      } ${result.rotated} to key ${keyring.activeKeyId}; ` +
      `legacy metadata.login ${
        dryRun ? "would remove" : "removed"
      } from ${result.scrubbed}`,
  );
  await closePool();
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : error);
  await closePool().catch(() => {});
  process.exit(1);
});
