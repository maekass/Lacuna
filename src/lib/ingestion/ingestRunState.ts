import process from "node:process";
import { query, withTransaction } from "@/lib/data/dbClient";
import type { Pool } from "pg";
import type { FilingCheckpoint } from "@/lib/ingestion/secDealNaturalKey";

export type IngestRunStatus = "running" | "success" | "failed";

/** Fixed advisory lock id for SEC ingest cron mutual exclusion. */
export const SEC_INGEST_ADVISORY_LOCK_KEY = 8_421_337;

export interface IngestRunRow {
  id: number;
  started_at: string;
  ended_at: string | null;
  status: IngestRunStatus;
  trigger: string;
  scanned_tickers: number;
  parsed_count: number;
  womens_health_candidates: number;
  inserted: number;
  updated: number;
  skipped: number;
  model_id: string | null;
  build_sha: string | null;
  error_message: string | null;
}

export interface IngestCheckpoint extends FilingCheckpoint {
  lastProcessedAccession: string | null;
}

function getBuildSha(): string | null {
  return process.env.VERCEL_GIT_COMMIT_SHA?.trim() ?? null;
}

/** Try to acquire the SEC ingest advisory lock (non-blocking). */
export async function tryAcquireSecIngestLock(): Promise<boolean> {
  const rows = await query<{ acquired: boolean }>(
    "SELECT pg_try_advisory_lock($1) AS acquired",
    [SEC_INGEST_ADVISORY_LOCK_KEY],
  );
  return rows[0]?.acquired === true;
}

/** Release the SEC ingest advisory lock. */
export async function releaseSecIngestLock(): Promise<void> {
  await query("SELECT pg_advisory_unlock($1)", [SEC_INGEST_ADVISORY_LOCK_KEY]);
}

export async function startIngestRun(input: {
  trigger: string;
  modelId?: string | null;
}): Promise<number> {
  const rows = await query<{ id: number }>(
    `
      INSERT INTO lacuna_ingest_runs (status, trigger, model_id, build_sha)
      VALUES ('running', $1, $2, $3)
      RETURNING id
    `,
    [input.trigger, input.modelId ?? null, getBuildSha()],
  );
  const id = rows[0]?.id;
  if (!id) throw new Error("Failed to create ingest run record");
  return id;
}

export async function finishIngestRunSuccess(input: {
  runId: number;
  scannedTickers: number;
  parsedCount: number;
  womensHealthCandidates: number;
  inserted: number;
  updated: number;
  skipped: number;
  sinceDateUsed?: string | null;
}): Promise<void> {
  await withTransaction(async (client) => {
    await client.query(
      `
        UPDATE lacuna_ingest_runs
        SET
          status = 'success',
          ended_at = NOW(),
          scanned_tickers = $2,
          parsed_count = $3,
          womens_health_candidates = $4,
          inserted = $5,
          updated = $6,
          skipped = $7
        WHERE id = $1
      `,
      [
        input.runId,
        input.scannedTickers,
        input.parsedCount,
        input.womensHealthCandidates,
        input.inserted,
        input.updated,
        input.skipped,
      ],
    );

    if (input.sinceDateUsed) {
      await client.query(
        `
          UPDATE lacuna_ingest_state
          SET last_successful_since_date = $2::date,
              last_successful_run_id = $1
          WHERE id = 1
        `,
        [input.runId, input.sinceDateUsed],
      );
    } else {
      await client.query(
        `
          UPDATE lacuna_ingest_state
          SET last_successful_run_id = $1
          WHERE id = 1
        `,
        [input.runId],
      );
    }
  });
}

export async function finishIngestRunFailure(input: {
  runId: number;
  errorMessage: string;
}): Promise<void> {
  await query(
    `
      UPDATE lacuna_ingest_runs
      SET status = 'failed',
          ended_at = NOW(),
          error_message = $2
      WHERE id = $1
    `,
    [input.runId, input.errorMessage.slice(0, 1500)],
  );
}

/** Monotonic ingest checkpoint for crash-safe resume (newest-first scan). */
export async function getIngestCheckpoint(): Promise<IngestCheckpoint | null> {
  const rows = await query<{
    last_processed_accession: string | null;
    last_processed_natural_key: string | null;
    last_processed_filing_date: string | null;
  }>(
    `
      SELECT
        last_processed_accession,
        last_processed_natural_key,
        last_processed_filing_date::text
      FROM lacuna_ingest_state
      WHERE id = 1
    `,
  );
  const row = rows[0];
  if (!row?.last_processed_natural_key || !row.last_processed_filing_date) {
    return null;
  }
  return {
    lastProcessedAccession: row.last_processed_accession,
    naturalKey: row.last_processed_natural_key,
    filingDate: row.last_processed_filing_date,
  };
}

/**
 * Advance checkpoint when processing filings newest-first.
 * Only moves backward in time (older filing dates / keys).
 */
export async function updateIngestCheckpoint(
  client: Pick<Pool, "query">,
  input: {
    accession: string;
    naturalKey: string;
    filingDate: string;
  },
): Promise<void> {
  await client.query(
    `
      UPDATE lacuna_ingest_state
      SET
        last_processed_accession = $1,
        last_processed_natural_key = $2,
        last_processed_filing_date = $3::date
      WHERE id = 1
        AND (
          last_processed_filing_date IS NULL
          OR $3::date < last_processed_filing_date
          OR (
            $3::date = last_processed_filing_date
            AND (
              last_processed_natural_key IS NULL
              OR $2 < last_processed_natural_key
            )
          )
        )
    `,
    [input.accession, input.naturalKey, input.filingDate],
  );
}

export async function getLatestIngestRun(): Promise<IngestRunRow | null> {
  const rows = await query<IngestRunRow>(
    `
      SELECT
        id, started_at::text, ended_at::text, status, trigger,
        scanned_tickers, parsed_count, womens_health_candidates,
        inserted, updated, skipped,
        model_id, build_sha, error_message
      FROM lacuna_ingest_runs
      ORDER BY started_at DESC, id DESC
      LIMIT 1
    `,
  );
  return rows[0] ?? null;
}

export async function getIngestCursorSinceDate(): Promise<string | null> {
  const rows = await query<{ last_successful_since_date: string | null }>(
    `
      SELECT last_successful_since_date::text
      FROM lacuna_ingest_state
      WHERE id = 1
    `,
  );
  return rows[0]?.last_successful_since_date ?? null;
}
