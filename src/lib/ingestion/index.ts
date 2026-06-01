/**
 * SEC EDGAR ingestion — public exports for CLI, cron, and future MCP server.
 */
export {
  runSecIngest,
  scanItem201Acquisitions,
  parseItem201,
  fetchFilingText,
  fetchSubmissions,
  isHealthcareSic,
  listHealthcareTickers,
  classifyDeal,
  classifyDealAsync,
  classifyDealKeywordOnly,
  isAiClassificationAvailable,
  shouldAutoInsert,
  CLASSIFICATION_GATEWAY_MODEL,
  CLASSIFICATION_OPENAI_MODEL,
  hasAiGatewayAuth,
  WOMENS_HEALTH_KEYWORDS,
  startIngestRun,
  finishIngestRunSuccess,
  finishIngestRunFailure,
  getLatestIngestRun,
  getIngestCursorSinceDate,
  syncDealsToDatabase,
  upsertLacunaDeal,
  alertApiFailure,
  alertNewDeal,
  alertPartialParse,
  getIngestEvents,
  type SecIngestOptions,
  type SecIngestResult,
} from '@/lib/ingestion/secIngestPipeline';

export type { ParsedAcquisition, ParseQuality, SecSubmissionMeta } from '@/lib/ingestion/secEdgarConnector';
export type {
  DealClassification,
  ClassificationConfidence,
  ClassificationMethod,
  DealClassificationInput,
} from '@/lib/ingestion/dealClassificationEngine';
export type { ClassifiedDeal, SyncResult } from '@/lib/ingestion/databaseSync';
export type { IngestLogEvent, IngestEventType } from '@/lib/ingestion/monitoringAlerts';
export type { IngestRunRow, IngestRunStatus } from '@/lib/ingestion/ingestRunState';

/** Alias for MCP / external tooling — same module as secEdgarConnector. */
export * as secEdgarMcpConnector from '@/lib/ingestion/secEdgarConnector';
