-- Indexes for paginated genomics / diagnostics catalog queries (Postgres db mode)
-- Run via: npm run db:migrate

CREATE INDEX IF NOT EXISTS idx_companies_sector_id ON companies (sector, id);

CREATE INDEX IF NOT EXISTS idx_acquisitions_target_announced
  ON acquisitions (target_id, announced_date DESC);
