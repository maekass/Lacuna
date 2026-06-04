/**
 * SEC ingestion pipeline — scan, classify, sync.
 * Exported for CLI, Vercel cron, and future MCP server tools.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import type { VerifiedDataset } from '@/lib/data/datasetTypes';
import {
  classifyDealAsync,
  shouldAutoInsert,
  statusForConfidence,
} from '@/lib/ingestion/dealClassificationEngine';
import { syncDealsToDatabase, type ClassifiedDeal, type SyncResult } from '@/lib/ingestion/databaseSync';
import { logIngestComplete } from '@/lib/ingestion/monitoringAlerts';
import {
  scanItem201Acquisitions,
  type ParsedAcquisition,
  type ScanOptions,
} from '@/lib/ingestion/secEdgarConnector';
import {
  finishIngestRunFailure,
  finishIngestRunSuccess,
  getIngestCursorSinceDate,
  startIngestRun,
} from '@/lib/ingestion/ingestRunState';
import { mapWithConcurrency } from '@/lib/util/concurrency';

export interface SecIngestOptions extends ScanOptions {
  /** Extra tickers (comma-separated in env SEC_EXTRA_TICKERS). */
  extraTickers?: string[];
  /** Skip DB sync (scan + classify only). */
  dryRun?: boolean;
  datasetPath?: string;
}

export interface SecIngestResult {
  scannedTickers: number;
  parsedFilings: ParsedAcquisition[];
  classified: ClassifiedDeal[];
  sync: SyncResult | null;
  sinceDateUsed?: string;
  runId?: number;
}

function loadAcquirerTickers(datasetPath: string): string[] {
  const raw = readFileSync(datasetPath, 'utf8');
  const dataset = JSON.parse(raw) as VerifiedDataset;
  return [
    ...new Set(
      dataset.acquirers
        .map((a) => a.ticker?.trim().toUpperCase())
        .filter((t): t is string => Boolean(t)),
    ),
  ];
}

async function classifyParsed(deal: ParsedAcquisition): Promise<ClassifiedDeal> {
  const classification = await classifyDealAsync({
    filingText: deal.item201Excerpt ?? deal.filingTextSample,
    targetName: deal.targetName,
    acquirerName: deal.acquirerName,
    sicCode: deal.sicCode,
    sicDescription: deal.sicDescription,
  });

  const eligible = shouldAutoInsert(classification.confidence);

  return {
    ...deal,
    classificationConfidence: classification.confidence,
    classificationKeywords: [
      ...new Set([...classification.matchedKeywords, ...classification.matchedThemes]),
    ],
    womensHealthRelevant: classification.womensHealthRelevant,
    classificationMethod: classification.method,
    classificationModelId: classification.modelId,
    status: eligible ? statusForConfidence(classification.confidence) : 'pending_review',
  };
}

/**
 * Run full SEC EDGAR ingest: scan 8-K Item 2.01 → classify → upsert lacuna_deals.
 */
export async function runSecIngest(options: SecIngestOptions = {}): Promise<SecIngestResult> {
  const datasetPath =
    options.datasetPath ?? join(process.cwd(), 'src/data/dataset.verified.json');

  const shouldPersistRun =
    Boolean(process.env.DATABASE_URL) &&
    options.dryRun !== true &&
    process.env.LACUNA_INGEST_RUN_TRACKING === 'true';
  const runId = shouldPersistRun ? await startIngestRun({ trigger: 'cron' }) : undefined;

  const fromDataset = loadAcquirerTickers(datasetPath);
  const fromEnv = (process.env.SEC_EXTRA_TICKERS ?? '')
    .split(',')
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean);
  const extra = options.extraTickers ?? fromEnv;
  const tickers = [...new Set([...fromDataset, ...extra])];

  if (tickers.length === 0) {
    throw new Error('No tickers to scan — add acquirer tickers to dataset or SEC_EXTRA_TICKERS');
  }

  // Since-date selection (priority): explicit option → env → DB cursor → default.
  const useDbCursor = process.env.SEC_USE_DB_CURSOR === 'true';
  const cursorSinceDate =
    useDbCursor && shouldPersistRun && !options.sinceDate && !process.env.SEC_SCAN_SINCE
      ? await getIngestCursorSinceDate()
      : null;
  const sinceDateUsed =
    options.sinceDate ??
    process.env.SEC_SCAN_SINCE ??
    cursorSinceDate ??
    `${new Date().getFullYear() - 1}-01-01`;

  const maxTickers = Number(process.env.SEC_MAX_TICKERS_PER_RUN ?? '');
  const tickersToScan =
    Number.isFinite(maxTickers) && maxTickers > 0 ? tickers.slice(0, maxTickers) : tickers;

  const parsedFilingsAll = await scanItem201Acquisitions(tickersToScan, {
    sinceDate: sinceDateUsed,
    limitPerTicker: options.limitPerTicker ?? Number(process.env.SEC_LIMIT_PER_TICKER ?? 15),
    healthcareSicOnly: options.healthcareSicOnly ?? process.env.SEC_HEALTHCARE_SIC_ONLY === 'true',
  });

  const maxParsedFilings = Number(process.env.SEC_MAX_PARSED_FILINGS_PER_RUN ?? '');
  const parsedFilings =
    Number.isFinite(maxParsedFilings) && maxParsedFilings > 0
      ? parsedFilingsAll.slice(0, maxParsedFilings)
      : parsedFilingsAll;

  const classifyConcurrency = Number(process.env.SEC_CLASSIFY_CONCURRENCY ?? 3);
  const classified = await mapWithConcurrency(
    parsedFilings,
    Number.isFinite(classifyConcurrency) && classifyConcurrency > 0 ? classifyConcurrency : 3,
    classifyParsed,
  );
  const womensHealthCandidates = classified.filter((c) => c.womensHealthRelevant).length;

  let sync: SyncResult | null = null;
  try {
    if (!options.dryRun && process.env.DATABASE_URL) {
      sync = await syncDealsToDatabase(classified);
      logIngestComplete({
        scanned: tickersToScan.length,
        parsed: parsedFilings.length,
        inserted: sync.inserted,
        updated: sync.updated,
        skipped: sync.skipped,
      });
    } else if (!options.dryRun && !process.env.DATABASE_URL) {
      logIngestComplete({
        scanned: tickersToScan.length,
        parsed: parsedFilings.length,
        inserted: 0,
        updated: 0,
        skipped: classified.filter((c) => !c.womensHealthRelevant).length,
      });
    }

    if (runId) {
      await finishIngestRunSuccess({
        runId,
        scannedTickers: tickersToScan.length,
        parsedCount: parsedFilings.length,
        womensHealthCandidates,
        inserted: sync?.inserted ?? 0,
        updated: sync?.updated ?? 0,
        skipped: sync?.skipped ?? classified.filter((c) => !c.womensHealthRelevant).length,
        sinceDateUsed,
      });
    }
  } catch (error) {
    if (runId) {
      const message = error instanceof Error ? error.message : 'SEC ingest failed';
      await finishIngestRunFailure({ runId, errorMessage: message });
    }
    throw error;
  }

  return {
    scannedTickers: tickersToScan.length,
    parsedFilings,
    classified,
    sync,
    sinceDateUsed,
    runId,
  };
}

// Re-export MCP-callable surface
export {
  scanItem201Acquisitions,
  parseItem201,
  fetchFilingText,
  fetchSubmissions,
  isHealthcareSic,
  listHealthcareTickers,
} from '@/lib/ingestion/secEdgarConnector';
export {
  classifyDeal,
  classifyDealAsync,
  classifyDealKeywordOnly,
  hasAiGatewayAuth,
  isAiClassificationAvailable,
  shouldAutoInsert,
  CLASSIFICATION_GATEWAY_MODEL,
  CLASSIFICATION_OPENAI_MODEL,
  WOMENS_HEALTH_KEYWORDS,
} from '@/lib/ingestion/dealClassificationEngine';
export {
  startIngestRun,
  finishIngestRunSuccess,
  finishIngestRunFailure,
  getLatestIngestRun,
  getIngestCursorSinceDate,
} from '@/lib/ingestion/ingestRunState';
export { syncDealsToDatabase, upsertLacunaDeal } from '@/lib/ingestion/databaseSync';
export {
  alertApiFailure,
  alertNewDeal,
  alertPartialParse,
  getIngestEvents,
} from '@/lib/ingestion/monitoringAlerts';
