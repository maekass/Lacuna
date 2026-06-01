import process from 'node:process';
import { query, withTransaction } from '@/lib/data/dbClient';

export type IngestRunStatus = 'running' | 'success' | 'failed';

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

function getBuildSha(): string | null {
  return process.env.VERCEL_GIT_COMMIT_SHA?.trim() ?? null;
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
  if (!id) throw new Error('Failed to create ingest run record');
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

