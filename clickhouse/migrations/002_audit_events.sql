-- Patient-data access audit log (HIPAA minimum-necessary — no PHI in rows)
-- Apply: npm run clickhouse:migrate

CREATE TABLE IF NOT EXISTS audit_events (
    timestamp DateTime64(3),
    action LowCardinality(String),
    resource String,
    actor_hash FixedString(64),
    allowed UInt8,
    mode LowCardinality(String)
)
ENGINE = MergeTree()
ORDER BY (timestamp, resource, action)
TTL timestamp + INTERVAL 2 YEAR;
