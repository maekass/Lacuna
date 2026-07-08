import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { withTransaction } from "@/lib/data/dbClient";
import type { VerifiedDataset } from "@/lib/data/datasetTypes";
import { validateVerifiedDataset } from "@/lib/data/validateVerifiedDataset";
import {
  buildPromotionDraft,
  type PromotionDraft,
  type ReviewerPromotionFields,
} from "@/lib/ingestion/buildPromotionDraft";
import {
  getPendingDealByDealId,
  listApprovedDealsForPromotion,
  markDealMerged,
  type PendingDealRecord,
} from "@/lib/ingestion/pendingDeals";

export type PromoteTarget = "json" | "db" | "both";

export interface PromoteApprovedDealsOptions {
  dealIds?: string[];
  target?: PromoteTarget;
  jsonPath?: string;
  dryRun?: boolean;
  secondarySourceUrl?: string | null;
  reviewerFields?: ReviewerPromotionFields;
}

export interface PromoteDealResult {
  dealId: string;
  ok: boolean;
  acquisitionId?: string;
  networkHighlightId?: string;
  error?: string;
  skipped?: boolean;
}

export interface PromoteApprovedDealsResult {
  promoted: PromoteDealResult[];
  validationErrors: string[];
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const defaultJsonPath = join(__dirname, "../../data/dataset.verified.json");

function bumpDatasetVersion(version: string | undefined): string {
  if (!version) return "v1";
  const match = version.match(/^v(\d+)$/i);
  if (!match) return `${version}-auto`;
  return `v${Number(match[1]) + 1}`;
}

function loadJsonDataset(jsonPath: string): VerifiedDataset {
  const raw = readFileSync(jsonPath, "utf8");
  return JSON.parse(raw) as VerifiedDataset;
}

function writeJsonDataset(jsonPath: string, dataset: VerifiedDataset): void {
  writeFileSync(jsonPath, `${JSON.stringify(dataset, null, 2)}\n`, "utf8");
}

/** Apply one promotion draft to an in-memory verified dataset. */
export function applyPromotionDraft(
  dataset: VerifiedDataset,
  draft: PromotionDraft,
): VerifiedDataset {
  const today = new Date().toISOString().slice(0, 10);
  return {
    ...dataset,
    provenance: {
      ...dataset.provenance,
      lastUpdated: today,
      datasetVersion: bumpDatasetVersion(dataset.provenance.datasetVersion),
      notes: [
        ...dataset.provenance.notes,
        `Auto-promoted ${draft.acquisition.id} (${draft.acquisition.targetName} ← ${draft.acquisition.acquirerName}) from SEC staging.`,
      ],
    },
    companies: draft.company
      ? [...dataset.companies, draft.company]
      : dataset.companies,
    acquirers: draft.acquirer
      ? [...dataset.acquirers, draft.acquirer]
      : dataset.acquirers,
    acquisitions: [...dataset.acquisitions, draft.acquisition],
  };
}

async function upsertPromotionToDb(draft: PromotionDraft): Promise<void> {
  await withTransaction(async (client) => {
    if (draft.company) {
      await client.query(
        `INSERT INTO companies (
           id, name, sector, stage, founded, hq, description,
           last_known_valuation, valuation_source, total_funding, sources
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT (id) DO NOTHING`,
        [
          draft.company.id,
          draft.company.name,
          draft.company.sector,
          draft.company.stage,
          draft.company.founded,
          draft.company.hq,
          draft.company.description,
          draft.company.lastKnownValuation ?? null,
          draft.company.valuationSource ?? null,
          draft.company.totalFunding ?? null,
          draft.company.sources ?? [],
        ],
      );
    }

    if (draft.acquirer) {
      await client.query(
        `INSERT INTO acquirers (id, name, ticker, sector, hq)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (id) DO NOTHING`,
        [
          draft.acquirer.id,
          draft.acquirer.name,
          draft.acquirer.ticker ?? null,
          draft.acquirer.sector,
          draft.acquirer.hq,
        ],
      );
    }

    await client.query(
      `INSERT INTO acquisitions (
         id, target_id, acquirer_id, target_name, acquirer_name,
         announced_date, closed_date, deal_value, deal_value_note,
         deal_type, source, strategic_rationale
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (id) DO NOTHING`,
      [
        draft.acquisition.id,
        draft.acquisition.targetId,
        draft.acquisition.acquirerId,
        draft.acquisition.targetName,
        draft.acquisition.acquirerName,
        draft.acquisition.announcedDate,
        draft.acquisition.closedDate ?? null,
        draft.acquisition.dealValue ?? null,
        draft.acquisition.dealValueNote ?? null,
        draft.acquisition.dealType,
        draft.acquisition.source,
        draft.acquisition.strategicRationale,
      ],
    );

    await client.query(
      `UPDATE dataset_provenance
       SET last_updated = $1,
           notes = array_append(notes, $2)
       WHERE id = 1`,
      [
        new Date().toISOString().slice(0, 10),
        `Auto-promoted ${draft.acquisition.id} from SEC staging.`,
      ],
    );
  });
}

async function promoteOneDeal(
  deal: PendingDealRecord,
  dataset: VerifiedDataset,
  options: PromoteApprovedDealsOptions,
): Promise<{ result: PromoteDealResult; dataset: VerifiedDataset }> {
  const { draft, missingFields } = buildPromotionDraft({
    dataset,
    deal,
    secondarySourceUrl: options.secondarySourceUrl,
    reviewerFields: options.reviewerFields,
  });

  if (!draft) {
    const error = missingFields.length > 0
      ? `Missing reviewer-attested fields: ${missingFields.join(", ")}`
      : "Missing required fields or duplicate source URL";
    return {
      result: {
        dealId: deal.dealId,
        ok: false,
        skipped: true,
        error,
      },
      dataset,
    };
  }

  const nextDataset = applyPromotionDraft(dataset, draft);
  const validation = validateVerifiedDataset(nextDataset);
  if (!validation.ok) {
    return {
      result: {
        dealId: deal.dealId,
        ok: false,
        error: validation.errors.map((issue) => issue.message).join("; "),
      },
      dataset,
    };
  }

  if (!options.dryRun) {
    const target = options.target ?? "json";
    if (target === "json" || target === "both") {
      const jsonPath = options.jsonPath ?? defaultJsonPath;
      writeJsonDataset(jsonPath, nextDataset);
    }
    if (target === "db" || target === "both") {
      await upsertPromotionToDb(draft);
    }
    await markDealMerged(deal.dealId, draft.acquisition.id);
  }

  return {
    result: {
      dealId: deal.dealId,
      ok: true,
      acquisitionId: draft.acquisition.id,
      networkHighlightId: draft.acquisition.acquirerId,
    },
    dataset: nextDataset,
  };
}

/** Promote approved SEC staging deals into verified JSON and/or Postgres. */
export async function promoteApprovedDeals(
  options: PromoteApprovedDealsOptions = {},
): Promise<PromoteApprovedDealsResult> {
  const deals = options.dealIds?.length
    ? (await Promise.all(
      options.dealIds.map((dealId) => getPendingDealByDealId(dealId)),
    )).filter((deal): deal is PendingDealRecord =>
      deal !== null && deal.status === "approved"
    )
    : await listApprovedDealsForPromotion();

  const jsonPath = options.jsonPath ?? defaultJsonPath;
  const target = options.target ?? "json";

  let dataset: VerifiedDataset;
  if (target === "db") {
    const { loadVerifiedDatasetFromDb } = await import(
      "@/lib/data/loadVerifiedDatasetFromDb"
    );
    dataset = await loadVerifiedDatasetFromDb();
  } else {
    dataset = loadJsonDataset(jsonPath);
  }

  const promoted: PromoteDealResult[] = [];
  const validationErrors: string[] = [];

  for (const deal of deals) {
    const { result, dataset: nextDataset } = await promoteOneDeal(
      deal,
      dataset,
      options,
    );
    promoted.push(result);
    if (!result.ok && result.error && !result.skipped) {
      validationErrors.push(`${deal.dealId}: ${result.error}`);
    }
    if (result.ok) dataset = nextDataset;
  }

  return { promoted, validationErrors };
}

/** Promote a single approved deal by `deal_id`. */
export async function promoteApprovedDeal(
  dealId: string,
  options: Omit<PromoteApprovedDealsOptions, "dealIds"> = {},
): Promise<PromoteDealResult> {
  const { promoted } = await promoteApprovedDeals({
    ...options,
    dealIds: [dealId],
  });
  return promoted[0] ?? {
    dealId,
    ok: false,
    error: "Deal not found or not approved",
  };
}

/** Resolve promotion sink for the current runtime. */
export function resolvePromoteTarget(): PromoteTarget {
  const explicit = process.env.LACUNA_PROMOTE_TARGET?.trim().toLowerCase();
  if (explicit === "json" || explicit === "db" || explicit === "both") {
    return explicit;
  }
  if (process.env.LACUNA_DATA_MODE === "db") return "db";
  return "both";
}

/** True when auto-promote should run after human approval. */
export function isAutoPromoteEnabled(): boolean {
  return process.env.LACUNA_AUTO_PROMOTE === "true";
}

/** Whether promotion can run in this serverless environment. */
export function canPromoteInRuntime(): boolean {
  if (process.env.LACUNA_DATA_MODE === "db") return true;
  return process.env.VERCEL !== "1";
}
