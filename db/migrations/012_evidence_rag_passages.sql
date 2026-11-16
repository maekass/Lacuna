-- Optional full-text index for evidence passages.
-- Create-only. The default ask path uses the frozen in-process corpus.
-- Rollback: stop calling the postgres search helper. Do not drop in this file.

CREATE TABLE IF NOT EXISTS evidence_rag_passages (
  passage_id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  document_id TEXT NOT NULL,
  snapshot_id TEXT NOT NULL,
  published_at DATE,
  retrieved_at DATE NOT NULL,
  data_year INTEGER,
  geography_code TEXT,
  payer TEXT,
  setting TEXT,
  review_state TEXT NOT NULL,
  passage_role TEXT NOT NULL,
  supersession_status TEXT NOT NULL,
  redistribution TEXT NOT NULL,
  storage_policy TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector(
      'english',
      coalesce(title, '') || ' ' || coalesce(body, '')
    )
  ) STORED
);

CREATE INDEX IF NOT EXISTS evidence_rag_passages_search_idx
  ON evidence_rag_passages
  USING gin (search_vector);
