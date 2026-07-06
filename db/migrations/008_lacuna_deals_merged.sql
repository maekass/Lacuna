-- Track promoted SEC candidates (approved → verified dataset merge)
-- Run via: npm run db:migrate

ALTER TABLE lacuna_deals DROP CONSTRAINT IF EXISTS lacuna_deals_status_check;

ALTER TABLE lacuna_deals
  ADD CONSTRAINT lacuna_deals_status_check
  CHECK (status IN ('pending', 'pending_review', 'approved', 'rejected', 'merged'));

ALTER TABLE lacuna_deals
  ADD COLUMN IF NOT EXISTS merged_acquisition_id TEXT,
  ADD COLUMN IF NOT EXISTS promoted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_lacuna_deals_merged
  ON lacuna_deals (promoted_at DESC)
  WHERE status = 'merged';
