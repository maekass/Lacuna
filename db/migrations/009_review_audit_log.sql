-- Review console audit trail (staging approve / reject / promote — no PHI)

CREATE TABLE IF NOT EXISTS review_audit_log (
  id           BIGSERIAL PRIMARY KEY,
  deal_id      TEXT,
  action       TEXT NOT NULL CHECK (action IN (
    'approve', 'reject', 'promote', 'enrich', 'import',
    'session_start', 'session_end'
  )),
  actor_id     TEXT NOT NULL,
  actor_method TEXT NOT NULL CHECK (actor_method IN ('github', 'api_key', 'dev')),
  metadata     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS review_audit_log_deal_id_idx
  ON review_audit_log (deal_id, created_at DESC);

CREATE INDEX IF NOT EXISTS review_audit_log_created_at_idx
  ON review_audit_log (created_at DESC);

COMMENT ON TABLE review_audit_log IS
  'Human review actions on lacuna_deals staging rows (Phase E5).';
