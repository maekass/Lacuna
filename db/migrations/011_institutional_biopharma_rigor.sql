-- Reproducible classification attributes for the reproductive-biopharma evidence sieve.
-- Run via: npm run db:migrate
--
-- These fields describe classification state and evidence. They do not assert
-- clinical efficacy, regulatory approval, reimbursement, or investment merit.

ALTER TABLE lacuna_deals
  ADD COLUMN IF NOT EXISTS is_inpatient_hospital_node BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_surrogate_biomarkers BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS tracking_regulatory_pathway VARCHAR(100) NOT NULL DEFAULT 'Standard FDA',
  ADD COLUMN IF NOT EXISTS reproductive_biopharma_status VARCHAR(20) NOT NULL DEFAULT 'review',
  ADD COLUMN IF NOT EXISTS reproductive_biopharma_reason VARCHAR(100) NOT NULL DEFAULT 'unclassified',
  ADD COLUMN IF NOT EXISTS reproductive_biopharma_confidence VARCHAR(20) NOT NULL DEFAULT 'low',
  ADD COLUMN IF NOT EXISTS reproductive_biopharma_evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS reproductive_biopharma_definition_version VARCHAR(100) NOT NULL DEFAULT '2026-10-reproductive-biopharma-v1';

ALTER TABLE lacuna_deals
  DROP CONSTRAINT IF EXISTS reproductive_biopharma_status_check;

ALTER TABLE lacuna_deals
  ADD CONSTRAINT reproductive_biopharma_status_check
  CHECK (reproductive_biopharma_status IN ('included', 'review', 'excluded'));

ALTER TABLE lacuna_deals
  DROP CONSTRAINT IF EXISTS reproductive_biopharma_confidence_check;

ALTER TABLE lacuna_deals
  ADD CONSTRAINT reproductive_biopharma_confidence_check
  CHECK (reproductive_biopharma_confidence IN ('high', 'medium', 'low'));

CREATE INDEX IF NOT EXISTS idx_reproductive_biopharma_status
  ON lacuna_deals (reproductive_biopharma_status, reproductive_biopharma_confidence);

CREATE INDEX IF NOT EXISTS idx_reproductive_biopharma_definition
  ON lacuna_deals (reproductive_biopharma_definition_version);
