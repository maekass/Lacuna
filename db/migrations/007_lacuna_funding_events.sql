-- SEC Form D private-placement candidates (manual review before verified dataset merge)
-- Run via: npm run db:migrate

CREATE TABLE IF NOT EXISTS lacuna_funding_events (
  id                       SERIAL PRIMARY KEY,
  event_id                 TEXT UNIQUE NOT NULL,
  sec_accession            TEXT UNIQUE NOT NULL,
  issuer_name              TEXT NOT NULL,
  issuer_cik               TEXT,
  filing_date              DATE,
  filing_url               TEXT NOT NULL,
  total_offering_amount    NUMERIC,
  total_amount_sold        NUMERIC,
  first_sale_date          DATE,
  industry_group           TEXT,
  jurisdiction             TEXT,
  exemption_type           TEXT,
  womens_health_relevant   BOOLEAN NOT NULL DEFAULT FALSE,
  classification_confidence TEXT NOT NULL DEFAULT 'low'
    CHECK (classification_confidence IN ('high', 'medium', 'low')),
  classification_keywords  TEXT[] NOT NULL DEFAULT '{}',
  status                   TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'pending_review', 'approved', 'rejected')),
  raw_excerpt              TEXT,
  ingested_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  review_notes             TEXT
);

CREATE INDEX IF NOT EXISTS idx_lacuna_funding_events_status
  ON lacuna_funding_events (status);
CREATE INDEX IF NOT EXISTS idx_lacuna_funding_events_filing_date
  ON lacuna_funding_events (filing_date DESC);
CREATE INDEX IF NOT EXISTS idx_lacuna_funding_events_wh
  ON lacuna_funding_events (womens_health_relevant)
  WHERE womens_health_relevant = TRUE;
