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

  const parsedFilings = await scanItem201Acquisitions(tickers, {
    sinceDate: options.sinceDate ?? process.env.SEC_SCAN_SINCE ?? `${new Date().getFullYear() - 1}-01-01`,
    limitPerTicker: options.limitPerTicker ?? Number(process.env.SEC_LIMIT_PER_TICKER ?? 15),
    healthcareSicOnly: options.healthcareSicOnly ?? process.env.SEC_HEALTHCARE_SIC_ONLY === 'true',
  });

  const classified = await Promise.all(parsedFilings.map(classifyParsed));

  let sync: SyncResult | null = null;
  if (!options.dryRun && process.env.DATABASE_URL) {
    sync = await syncDealsToDatabase(classified);
    logIngestComplete({
      scanned: tickers.length,
      parsed: parsedFilings.length,
      inserted: sync.inserted,
      updated: sync.updated,
      skipped: sync.skipped,
    });
  } else if (!options.dryRun && !process.env.DATABASE_URL) {
    logIngestComplete({
      scanned: tickers.length,
      parsed: parsedFilings.length,
      inserted: 0,
      updated: 0,
      skipped: classified.filter((c) => !c.womensHealthRelevant).length,
    });
  }

  return {
    scannedTickers: tickers.length,
    parsedFilings,
    classified,
    sync,
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
export { syncDealsToDatabase, upsertLacunaDeal } from '@/lib/ingestion/databaseSync';
export {
  alertApiFailure,
  alertNewDeal,
  alertPartialParse,
  getIngestEvents,
} from '@/lib/ingestion/monitoringAlerts';
