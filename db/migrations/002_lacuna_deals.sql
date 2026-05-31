-- Lacuna SEC EDGAR candidate deals (manual review before verified dataset merge)
-- Run via: npm run db:migrate

CREATE TABLE IF NOT EXISTS lacuna_deals (
  id                       SERIAL PRIMARY KEY,
  deal_id                  TEXT UNIQUE NOT NULL,
  sec_accession            TEXT UNIQUE NOT NULL,
  acquirer_name            TEXT,
  acquirer_ticker          TEXT,
  acquirer_cik             TEXT,
  target_name              TEXT,
  announced_date           DATE,
  closed_date              DATE,
  deal_value_millions      NUMERIC,
  deal_value_note          TEXT,
  deal_structure           TEXT,
  earnout_terms            TEXT,
  filing_url               TEXT NOT NULL,
  filing_date              DATE,
  item_201_excerpt         TEXT,
  classification_confidence TEXT NOT NULL DEFAULT 'low'
    CHECK (classification_confidence IN ('high', 'medium', 'low')),
  classification_keywords  TEXT[] NOT NULL DEFAULT '{}',
  womens_health_relevant   BOOLEAN NOT NULL DEFAULT FALSE,
  status                   TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'pending_review', 'approved', 'rejected')),
  sic_code                 TEXT,
  parse_quality            TEXT NOT NULL DEFAULT 'keyword_only'
    CHECK (parse_quality IN ('full', 'partial', 'keyword_only')),
  ingested_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  review_notes             TEXT
);

CREATE INDEX IF NOT EXISTS idx_lacuna_deals_status ON lacuna_deals (status);
CREATE INDEX IF NOT EXISTS idx_lacuna_deals_filing_date ON lacuna_deals (filing_date DESC);
CREATE INDEX IF NOT EXISTS idx_lacuna_deals_confidence ON lacuna_deals (classification_confidence);
CREATE INDEX IF NOT EXISTS idx_lacuna_deals_womens_health ON lacuna_deals (womens_health_relevant)
  WHERE womens_health_relevant = TRUE;
