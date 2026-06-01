-- Lacuna ingest run tracking and cursor state.
-- Durable substrate for cron observability and bounded incremental scans.

CREATE TABLE IF NOT EXISTS lacuna_ingest_runs (
  id BIGSERIAL PRIMARY KEY,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('running', 'success', 'failed')),
  trigger TEXT NOT NULL DEFAULT 'cron',
  scanned_tickers INTEGER NOT NULL DEFAULT 0,
  parsed_count INTEGER NOT NULL DEFAULT 0,
  womens_health_candidates INTEGER NOT NULL DEFAULT 0,
  inserted INTEGER NOT NULL DEFAULT 0,
  updated INTEGER NOT NULL DEFAULT 0,
  skipped INTEGER NOT NULL DEFAULT 0,
  model_id TEXT,
  build_sha TEXT,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS lacuna_ingest_runs_started_at_idx
  ON lacuna_ingest_runs (started_at DESC);

-- Single-row state table for cursors (e.g. last successful scan date).
CREATE TABLE IF NOT EXISTS lacuna_ingest_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  last_successful_since_date DATE,
  last_successful_run_id BIGINT REFERENCES lacuna_ingest_runs(id)
);

INSERT INTO lacuna_ingest_state (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

