/**
 * SEC EDGAR ingestion — public exports for CLI, cron, and future MCP server.
 */
export { buildSecIngestStatusPayload } from "@/lib/ingestion/buildSecIngestStatus";
export type { SecIngestStatusPayload } from "@/lib/ingestion/buildSecIngestStatus";
export {
  alertApiFailure,
  alertNewDeal,
  alertPartialParse,
  CLASSIFICATION_GATEWAY_MODEL,
  CLASSIFICATION_OPENAI_MODEL,
  classifyDeal,
  classifyDealAsync,
  classifyDealKeywordOnly,
  fetchFilingText,
  fetchSubmissions,
  finishIngestRunFailure,
  finishIngestRunSuccess,
  getIngestCursorSinceDate,
  getIngestEvents,
  getLatestIngestRun,
  hasAiGatewayAuth,
  isAiClassificationAvailable,
  isHealthcareSic,
  listHealthcareTickers,
  parseItem201,
  runSecIngest,
  scanItem201Acquisitions,
  type SecIngestOptions,
  type SecIngestResult,
  shouldAutoInsert,
  startIngestRun,
  syncDealsToDatabase,
  upsertLacunaDeal,
  WOMENS_HEALTH_KEYWORDS,
} from "@/lib/ingestion/secIngestPipeline";

export type {
  ParsedAcquisition,
  ParseQuality,
  SecSubmissionMeta,
} from "@/lib/ingestion/secEdgarConnector";
export type {
  ClassificationConfidence,
  ClassificationMethod,
  DealClassification,
  DealClassificationInput,
} from "@/lib/ingestion/dealClassificationEngine";
export type { ClassifiedDeal, SyncResult } from "@/lib/ingestion/databaseSync";
export {
  countPendingDeals,
  listPendingDeals,
  updatePendingDeal,
} from "@/lib/ingestion/pendingDeals";
export type {
  ListPendingDealsOptions,
  PendingDealRecord,
  PendingDealStatus,
  PendingDealsPage,
  UpdatePendingDealInput,
} from "@/lib/ingestion/pendingDeals";
export type {
  IngestEventType,
  IngestLogEvent,
} from "@/lib/ingestion/monitoringAlerts";
export type {
  IngestRunRow,
  IngestRunStatus,
} from "@/lib/ingestion/ingestRunState";

/** Alias for MCP / external tooling — same module as secEdgarConnector. */
export * as secEdgarMcpConnector from "@/lib/ingestion/secEdgarConnector";

export {
  ALL_FREE_API_SOURCES,
  downloadFreeApiBundles,
  readLatestFreeApiExport,
} from "@/lib/ingestion/freeApi";
export { enrichCompanyFromPublicApis } from "@/lib/ingestion/companyEnrichment";
export { runFormDIngest } from "@/lib/ingestion/secFormDIngestPipeline";
export {
  searchEdgarFullText,
  searchFormDFilingsWomensHealth,
  searchMaFilingsWomensHealth,
} from "@/lib/ingestion/secFullTextSearch";
export { parseFormDXml } from "@/lib/ingestion/secFormDConnector";
export type {
  FreeApiDownloadManifest,
  FreeApiEntityRecord,
  FreeApiExportSummary,
  FreeApiSourceId,
} from "@/lib/ingestion/freeApi";
