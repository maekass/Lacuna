/**
 * Structured logging for SEC ingestion — console for now; Datadog-ready shape.
 */

export type IngestLogLevel = "info" | "warn" | "error";

export type IngestEventType =
  | "api_failure"
  | "partial_disclosure"
  | "new_deal"
  | "ingest_complete"
  | "rate_limit_pause"
  | "fetch_skipped";

export interface IngestLogEvent {
  type: IngestEventType;
  level: IngestLogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

const events: IngestLogEvent[] = [];

function emit(event: IngestLogEvent): void {
  events.push(event);
  const payload = JSON.stringify(event);
  if (event.level === "error") {
    console.error(payload);
  } else if (event.level === "warn") {
    console.warn(payload);
  } else {
    console.log(payload);
  }
}

/** Return in-memory events (testing / future MCP export). */
export function getIngestEvents(): readonly IngestLogEvent[] {
  return events;
}

export function clearIngestEvents(): void {
  events.length = 0;
}

export function alertApiFailure(
  url: string,
  status: number,
  detail?: string,
): void {
  emit({
    type: "api_failure",
    level: "error",
    message: `SEC API request failed: ${status}`,
    timestamp: new Date().toISOString(),
    context: { url, status, detail },
  });
}

export function alertPartialParse(accession: string, reason: string): void {
  emit({
    type: "partial_disclosure",
    level: "warn",
    message: `Partial 8-K Item 2.01 parse for ${accession}`,
    timestamp: new Date().toISOString(),
    context: { accession, reason },
  });
}

/**
 * Record a source document the run skipped after a recoverable fetch failure.
 * Skips are expected (legacy filings, throttled CIKs) but must stay visible —
 * a silent `continue` makes an incomplete run look like an empty one.
 */
export function alertFetchSkipped(
  error: unknown,
  context: Record<string, unknown>,
): void {
  emit({
    type: "fetch_skipped",
    level: "warn",
    message: `SEC fetch skipped: ${
      error instanceof Error ? error.message : String(error)
    }`,
    timestamp: new Date().toISOString(),
    context,
  });
}

export function alertNewDeal(deal: {
  dealId: string;
  acquirerName?: string;
  targetName?: string;
  confidence: string;
  filingUrl: string;
}): void {
  emit({
    type: "new_deal",
    level: "info",
    message: `New women's health candidate (${deal.confidence}): ${
      deal.targetName ?? "unknown target"
    }`,
    timestamp: new Date().toISOString(),
    context: deal,
  });
}

export function logIngestComplete(summary: {
  scanned: number;
  parsed: number;
  inserted: number;
  updated: number;
  skipped: number;
}): void {
  emit({
    type: "ingest_complete",
    level: "info",
    message: "SEC ingest run complete",
    timestamp: new Date().toISOString(),
    context: summary,
  });
}

export function logRateLimitPause(ms: number): void {
  emit({
    type: "rate_limit_pause",
    level: "info",
    message: `Rate-limit pause ${ms}ms`,
    timestamp: new Date().toISOString(),
    context: { ms },
  });
}
