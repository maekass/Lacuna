-- Domestic research study linkage (Postgres) — not M&A deal data
-- Run via: npm run db:migrate && npm run db:seed-research

CREATE TABLE IF NOT EXISTS research_studies (
  study_id      TEXT PRIMARY KEY,
  institution   TEXT NOT NULL,
  sample_size   INTEGER NOT NULL CHECK (sample_size >= 0),
  source        TEXT NOT NULL,
  marker_genes  JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS study_trial_links (
  study_id  TEXT NOT NULL REFERENCES research_studies (study_id) ON DELETE CASCADE,
  nct_id    TEXT NOT NULL,
  PRIMARY KEY (study_id, nct_id)
);

CREATE INDEX IF NOT EXISTS idx_study_trial_links_nct_id ON study_trial_links (nct_id);

CREATE TABLE IF NOT EXISTS study_callset_links (
  study_id    TEXT NOT NULL REFERENCES research_studies (study_id) ON DELETE CASCADE,
  callset_id  TEXT NOT NULL,
  PRIMARY KEY (study_id, callset_id)
);

CREATE INDEX IF NOT EXISTS idx_study_callset_links_callset_id
  ON study_callset_links (callset_id);
