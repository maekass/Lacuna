-- Patient data governance audit log (HIPAA-compliant)
-- Records all access attempts to patient genomic data.
-- CRITICAL: No PHI (sample_id, VCF paths) stored — only hashed identifiers.

CREATE TABLE IF NOT EXISTS audit_events (
  id BIGSERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  action TEXT NOT NULL CHECK (action IN ('read', 'write', 'delete', 'export', 'query')),
  resource_type TEXT NOT NULL CHECK (resource_type IN ('callset', 'variant', 'vcf_object', 'query_result')),
  resource_hash TEXT NOT NULL, -- SHA-256 hash of resource identifier (never raw sample_id)
  actor_ip_hash TEXT NOT NULL, -- SHA-256 hash of IP address
  allowed BOOLEAN NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('production', 'development', 'test')),
  denial_reason TEXT,          -- Only populated when allowed = false
  request_id TEXT,             -- Optional correlation ID
  user_agent TEXT,             -- Optional for forensics
  metadata JSONB DEFAULT '{}'::jsonb -- Additional context (no PHI)
);

-- Index for audit queries (recent events, by actor, by resource)
CREATE INDEX IF NOT EXISTS audit_events_timestamp_idx ON audit_events (timestamp DESC);
CREATE INDEX IF NOT EXISTS audit_events_actor_idx ON audit_events (actor_ip_hash, timestamp DESC);
CREATE INDEX IF NOT EXISTS audit_events_resource_idx ON audit_events (resource_hash, timestamp DESC);
CREATE INDEX IF NOT EXISTS audit_events_allowed_idx ON audit_events (allowed, timestamp DESC) WHERE NOT allowed;

-- Retention policy comment (implement via cron or pg_cron if needed)
COMMENT ON TABLE audit_events IS 'HIPAA audit log. Retention: 6 years minimum per HIPAA §164.316(b)(2)(i). Implement archival via separate process.';
