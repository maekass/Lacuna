-- SEC deal natural key (accession + CIK + form type) and ingest checkpoint columns.

ALTER TABLE lacuna_deals
  ADD COLUMN IF NOT EXISTS form_type TEXT,
  ADD COLUMN IF NOT EXISTS natural_key TEXT;

-- Backfill existing 8-K rows before enforcing NOT NULL / UNIQUE.
UPDATE lacuna_deals
SET
  form_type = COALESCE(form_type, '8-K'),
  natural_key = COALESCE(
    natural_key,
    LPAD(REGEXP_REPLACE(COALESCE(acquirer_cik, '0'), '\D', '', 'g'), 10, '0')
      || '|'
      || LOWER(REPLACE(sec_accession, '-', ''))
      || '|'
      || REGEXP_REPLACE(UPPER(COALESCE(form_type, '8-K')), '[^A-Z0-9]', '', 'g')
  )
WHERE natural_key IS NULL;

ALTER TABLE lacuna_deals
  ALTER COLUMN form_type SET NOT NULL,
  ALTER COLUMN natural_key SET NOT NULL;

ALTER TABLE lacuna_deals
  DROP CONSTRAINT IF EXISTS lacuna_deals_sec_accession_key;

CREATE UNIQUE INDEX IF NOT EXISTS lacuna_deals_natural_key_uidx
  ON lacuna_deals (natural_key);

ALTER TABLE lacuna_deals
  ADD CONSTRAINT lacuna_deals_natural_key_key UNIQUE (natural_key);

CREATE INDEX IF NOT EXISTS lacuna_deals_natural_key_filing_date_idx
  ON lacuna_deals (filing_date DESC, natural_key DESC);

ALTER TABLE lacuna_ingest_state
  ADD COLUMN IF NOT EXISTS last_processed_accession TEXT,
  ADD COLUMN IF NOT EXISTS last_processed_natural_key TEXT,
  ADD COLUMN IF NOT EXISTS last_processed_filing_date DATE;

COMMENT ON COLUMN lacuna_deals.natural_key IS
  'Deterministic dedup key: padded CIK | accession (no dashes) | normalized form type';
