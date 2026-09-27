-- Oncology claim-integrity monitor (additive).
-- Does not alter companies, acquisitions, scoring tables, or existing review logs.
-- company_id, asset_id, and trial_id are optional text links. They are not
-- foreign keys: oncology subjects may sit outside the verified women's-health
-- company table, and this migration must not reject or rewrite those rows.

CREATE TABLE IF NOT EXISTS oncology_claims (
  id                       TEXT PRIMARY KEY,
  company_id               TEXT,
  asset_id                 TEXT,
  trial_id                 TEXT,
  exact_claim              TEXT NOT NULL,
  normalized_claim         TEXT,
  claim_source_url         TEXT NOT NULL,
  claim_source_title       TEXT,
  claim_source_type        TEXT NOT NULL,
  speaker_or_issuer        TEXT,
  claim_date               DATE NOT NULL,
  evidence_cutoff_date     DATE NOT NULL,
  indication               TEXT,
  biomarker                TEXT,
  modality                 TEXT,
  development_phase        TEXT,
  classification           TEXT NOT NULL DEFAULT 'unreviewed',
  classification_rationale TEXT,
  confidence               TEXT,
  review_status            TEXT NOT NULL DEFAULT 'draft',
  reviewer_id              TEXT,
  reviewed_at              TIMESTAMPTZ,
  created_by               TEXT NOT NULL,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT oncology_claims_cutoff_chk
    CHECK (evidence_cutoff_date >= claim_date),
  CONSTRAINT oncology_claims_classification_chk
    CHECK (classification IN (
      'unreviewed',
      'substantiated',
      'partially_substantiated',
      'insufficient_public_evidence',
      'material_context_omitted',
      'inconsistent_with_source_evidence',
      'cross_trial_comparison_limitation',
      'post_hoc_or_subgroup_dependence',
      'regulatory_characterization_unclear',
      'requires_expert_review'
    )),
  CONSTRAINT oncology_claims_review_status_chk
    CHECK (review_status IN (
      'draft',
      'pending_review',
      'changes_requested',
      'approved',
      'archived'
    )),
  CONSTRAINT oncology_claims_source_type_chk
    CHECK (claim_source_type IN (
      'clinical_trial_registry',
      'peer_reviewed_publication',
      'regulatory_document',
      'company_filing',
      'investor_presentation',
      'press_release',
      'conference_abstract',
      'patent',
      'reimbursement_source',
      'other'
    )),
  CONSTRAINT oncology_claims_confidence_chk
    CHECK (confidence IS NULL OR confidence IN ('low', 'moderate', 'high'))
);

CREATE INDEX IF NOT EXISTS oncology_claims_company_idx
  ON oncology_claims (company_id);
CREATE INDEX IF NOT EXISTS oncology_claims_asset_idx
  ON oncology_claims (asset_id);
CREATE INDEX IF NOT EXISTS oncology_claims_trial_idx
  ON oncology_claims (trial_id);
CREATE INDEX IF NOT EXISTS oncology_claims_classification_idx
  ON oncology_claims (classification);
CREATE INDEX IF NOT EXISTS oncology_claims_review_status_idx
  ON oncology_claims (review_status);
CREATE INDEX IF NOT EXISTS oncology_claims_claim_date_idx
  ON oncology_claims (claim_date DESC);

CREATE TABLE IF NOT EXISTS oncology_claim_evidence (
  id                      TEXT PRIMARY KEY,
  claim_id                TEXT NOT NULL REFERENCES oncology_claims (id) ON DELETE CASCADE,
  relationship            TEXT NOT NULL,
  source_type             TEXT NOT NULL,
  title                   TEXT NOT NULL,
  url                     TEXT NOT NULL,
  publisher               TEXT,
  publication_date        DATE,
  accessed_at             TIMESTAMPTZ NOT NULL,
  quoted_excerpt          TEXT,
  analyst_summary         TEXT NOT NULL,
  primary_source          BOOLEAN NOT NULL DEFAULT FALSE,
  available_by_claim_date BOOLEAN NOT NULL,
  evidence_strength       TEXT,
  limitations             TEXT,
  created_by              TEXT NOT NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT oncology_claim_evidence_relationship_chk
    CHECK (relationship IN (
      'supports',
      'contradicts',
      'contextualizes',
      'subsequent_evidence'
    )),
  CONSTRAINT oncology_claim_evidence_strength_chk
    CHECK (
      evidence_strength IS NULL OR
      evidence_strength IN ('limited', 'moderate', 'strong')
    )
);

CREATE INDEX IF NOT EXISTS oncology_claim_evidence_claim_idx
  ON oncology_claim_evidence (claim_id, relationship);

CREATE TABLE IF NOT EXISTS oncology_claim_audit_events (
  id              TEXT PRIMARY KEY,
  claim_id        TEXT NOT NULL REFERENCES oncology_claims (id) ON DELETE CASCADE,
  actor_id        TEXT NOT NULL,
  action          TEXT NOT NULL,
  previous_value  JSONB,
  new_value       JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT oncology_claim_audit_action_chk
    CHECK (action IN (
      'created',
      'edited',
      'evidence_added',
      'evidence_removed',
      'submitted',
      'classification_changed',
      'changes_requested',
      'approved',
      'archived'
    ))
);

CREATE INDEX IF NOT EXISTS oncology_claim_audit_claim_idx
  ON oncology_claim_audit_events (claim_id, created_at);

CREATE TABLE IF NOT EXISTS oncology_claim_reviews (
  id              TEXT PRIMARY KEY,
  claim_id        TEXT NOT NULL REFERENCES oncology_claims (id) ON DELETE CASCADE,
  actor_id        TEXT NOT NULL,
  decision        TEXT NOT NULL,
  rationale       TEXT,
  classification  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT oncology_claim_reviews_decision_chk
    CHECK (decision IN (
      'submitted',
      'changes_requested',
      'approved',
      'archived'
    ))
);

CREATE INDEX IF NOT EXISTS oncology_claim_reviews_claim_idx
  ON oncology_claim_reviews (claim_id, created_at);

CREATE TABLE IF NOT EXISTS oncology_claim_ai_drafts (
  id                 TEXT PRIMARY KEY,
  claim_id           TEXT NOT NULL REFERENCES oncology_claims (id) ON DELETE CASCADE,
  task               TEXT NOT NULL,
  model              TEXT NOT NULL,
  prompt_version     TEXT NOT NULL,
  input_source_ids   JSONB NOT NULL DEFAULT '[]'::jsonb,
  draft_text         TEXT NOT NULL,
  human_decision     TEXT NOT NULL DEFAULT 'pending',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT oncology_claim_ai_decision_chk
    CHECK (human_decision IN ('pending', 'accepted', 'rejected'))
);

COMMENT ON TABLE oncology_claims IS
  'Analyst-entered oncology claim records. Empty until a reviewer writes a row. Not a fraud or scoring table.';
