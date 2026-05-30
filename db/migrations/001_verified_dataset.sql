-- Lacuna verified dataset schema (Postgres)
-- Run via: npm run db:migrate

CREATE TABLE IF NOT EXISTS dataset_provenance (
  id            SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  last_updated  DATE NOT NULL,
  purpose       TEXT NOT NULL,
  disclaimer    TEXT NOT NULL,
  sources       TEXT[] NOT NULL DEFAULT '{}',
  notes         TEXT[] NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS companies (
  id                   TEXT PRIMARY KEY,
  name                 TEXT NOT NULL,
  sector               TEXT NOT NULL,
  stage                TEXT NOT NULL,
  founded              INTEGER NOT NULL,
  hq                   TEXT NOT NULL,
  description          TEXT NOT NULL,
  last_known_valuation NUMERIC,
  valuation_source     TEXT,
  total_funding        NUMERIC,
  sources              TEXT[] NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS acquirers (
  id     TEXT PRIMARY KEY,
  name   TEXT NOT NULL,
  ticker TEXT,
  sector TEXT NOT NULL,
  hq     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS acquisitions (
  id                   TEXT PRIMARY KEY,
  target_id            TEXT NOT NULL REFERENCES companies (id),
  acquirer_id          TEXT NOT NULL REFERENCES acquirers (id),
  target_name          TEXT NOT NULL,
  acquirer_name        TEXT NOT NULL,
  announced_date       DATE NOT NULL,
  closed_date          DATE,
  deal_value           NUMERIC,
  deal_value_note      TEXT,
  deal_type            TEXT NOT NULL,
  source               TEXT NOT NULL,
  strategic_rationale  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_acquisitions_announced ON acquisitions (announced_date);
CREATE INDEX IF NOT EXISTS idx_acquisitions_acquirer ON acquisitions (acquirer_id);
CREATE INDEX IF NOT EXISTS idx_companies_sector ON companies (sector);
