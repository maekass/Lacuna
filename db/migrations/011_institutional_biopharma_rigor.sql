-- Institutional clinical rigor attributes for reproductive/therapeutic deal triage.
-- Run via: npm run db:migrate

ALTER TABLE lacuna_deals
  ADD COLUMN IF NOT EXISTS is_inpatient_hospital_node BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_surrogate_biomarkers BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS tracking_regulatory_pathway VARCHAR(100) NOT NULL DEFAULT 'Standard FDA',
  ADD COLUMN IF NOT EXISTS institutional_classification VARCHAR(150) NOT NULL DEFAULT 'Unclassified',
  ADD COLUMN IF NOT EXISTS nursing_workload_impact_score INT NOT NULL DEFAULT 0;

ALTER TABLE lacuna_deals
  DROP CONSTRAINT IF EXISTS lacuna_deals_nursing_workload_impact_score_check;

ALTER TABLE lacuna_deals
  ADD CONSTRAINT lacuna_deals_nursing_workload_impact_score_check
  CHECK (nursing_workload_impact_score BETWEEN -10 AND 10);

CREATE INDEX IF NOT EXISTS idx_institutional_biopharma_sieve
  ON lacuna_deals (is_inpatient_hospital_node, has_surrogate_biomarkers)
  WHERE is_inpatient_hospital_node = TRUE
    AND has_surrogate_biomarkers = TRUE;
