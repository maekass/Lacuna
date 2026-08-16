import type { VerifiedDataset } from "@/lib/data/datasetTypes";
import type { PendingDealRecord } from "@/lib/ingestion/pendingDeals";

export interface PromotionDraft {
  company?: VerifiedDataset["companies"][number];
  acquirer?: VerifiedDataset["acquirers"][number];
  acquisition: VerifiedDataset["acquisitions"][number];
}

/** Reviewer-attested fields required for new verified rows (Phase E0). */
export interface ReviewerPromotionFields {
  companySector?: string | null;
  companyHq?: string | null;
  companyFounded?: number | null;
  companyDescription?: string | null;
  companyStage?: string | null;
  acquirerSector?: string | null;
  acquirerHq?: string | null;
  secondarySourceUrl?: string | null;
  /** Curated one-sentence copy for verified JSON — never an 8-K LLM summary. */
  strategicRationale?: string | null;
}

export interface BuildPromotionDraftOptions {
  dataset: VerifiedDataset;
  deal: PendingDealRecord;
  secondarySourceUrl?: string | null;
  reviewerFields?: ReviewerPromotionFields;
}

export interface BuildPromotionDraftResult {
  draft: PromotionDraft | null;
  missingFields: string[];
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ");
}

function slugFromName(value: string): string {
  const slug = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(
    /^-+|-+$/g,
    "",
  );
  return slug || "unknown";
}

function extractUrls(text: string | null): string[] {
  if (!text) return [];
  return [...text.matchAll(/https?:\/\/[^\s)]+/gi)].map((match) => match[0]);
}

function nextNumericId(prefix: string, ids: string[]): string {
  let max = 0;
  const pattern = new RegExp(`^${prefix}(\\d+)$`);
  for (const id of ids) {
    const match = id.match(pattern);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `${prefix}${max + 1}`;
}

function findCompanyIdByName(
  dataset: VerifiedDataset,
  name: string | null,
): string | undefined {
  if (!name) return undefined;
  const target = normalizeName(name);
  return dataset.companies.find((company) =>
    normalizeName(company.name) === target
  )?.id;
}

function findAcquirerIdByName(
  dataset: VerifiedDataset,
  name: string | null,
): string | undefined {
  if (!name) return undefined;
  const target = normalizeName(name);
  return dataset.acquirers.find((acquirer) =>
    normalizeName(acquirer.name) === target
  )?.id;
}

function resolveSecondarySource(
  deal: PendingDealRecord,
  options: BuildPromotionDraftOptions,
): string | null {
  const fromReviewer = options.reviewerFields?.secondarySourceUrl?.trim();
  if (fromReviewer) return fromReviewer;
  const fromOptions = options.secondarySourceUrl?.trim();
  if (fromOptions) return fromOptions;
  return extractUrls(deal.reviewNotes)[0] ?? null;
}

function buildCompanySources(
  filingUrl: string,
  secondarySourceUrl: string | null,
): string[] {
  const sources = [filingUrl];
  if (secondarySourceUrl && secondarySourceUrl !== filingUrl) {
    sources.push(secondarySourceUrl);
  }
  return sources;
}

/**
 * Strategic rationale is reviewer-curated copy for verified JSON.
 * Do not fill from Item 2.01 excerpts or LLM summaries of the 8-K.
 */
function resolveStrategicRationale(
  reviewerFields?: ReviewerPromotionFields,
): string | null {
  const fromReviewer = reviewerFields?.strategicRationale?.trim();
  return fromReviewer || null;
}

function resolveCompanyDescription(
  deal: PendingDealRecord,
  reviewerFields?: ReviewerPromotionFields,
): string | null {
  const fromReviewer = reviewerFields?.companyDescription?.trim();
  if (fromReviewer) return fromReviewer.slice(0, 280);
  const excerpt = deal.item201Excerpt?.trim();
  if (excerpt) return excerpt.slice(0, 280);
  return null;
}

/**
 * List reviewer fields still required before a promotion draft can be built.
 * Does not invent sector, HQ, founded year, or strategic rationale from
 * keywords or 8-K excerpts.
 */
export function listPromotionMissingFields(
  options: BuildPromotionDraftOptions,
): string[] {
  const { dataset, deal } = options;
  const missing: string[] = [];
  const reviewer = options.reviewerFields ?? {};

  const targetName = deal.targetName?.trim();
  const acquirerName = deal.acquirerName?.trim();
  const announcedDate = deal.announcedDate;

  if (!targetName) missing.push("targetName");
  if (!acquirerName) missing.push("acquirerName");
  if (!announcedDate) missing.push("announcedDate");

  const duplicateBySource = dataset.acquisitions.some((row) =>
    row.source === deal.filingUrl
  );
  if (duplicateBySource) missing.push("duplicateSource");

  const existingTargetId = findCompanyIdByName(dataset, targetName ?? null);
  const existingAcquirerId = findAcquirerIdByName(
    dataset,
    acquirerName ?? null,
  );
  const secondary = resolveSecondarySource(deal, options);

  if (!existingTargetId) {
    if (!reviewer.companySector?.trim()) missing.push("company.sector");
    if (!reviewer.companyHq?.trim()) missing.push("company.hq");
    if (
      reviewer.companyFounded === null ||
      reviewer.companyFounded === undefined ||
      !Number.isFinite(reviewer.companyFounded)
    ) {
      missing.push("company.founded");
    }
    if (!resolveCompanyDescription(deal, reviewer)) {
      missing.push("company.description");
    }
    if (!secondary || secondary === deal.filingUrl) {
      missing.push("company.sources.secondary");
    }
  }

  if (!existingAcquirerId) {
    if (!reviewer.acquirerSector?.trim()) missing.push("acquirer.sector");
    if (!reviewer.acquirerHq?.trim()) missing.push("acquirer.hq");
  }

  if (!resolveStrategicRationale(reviewer)) {
    missing.push("acquisition.strategicRationale");
  }

  return missing;
}

/** Whether promotion will create new company / acquirer rows. */
export function getPromotionEntityNeeds(
  dataset: VerifiedDataset,
  deal: PendingDealRecord,
): { needsNewCompany: boolean; needsNewAcquirer: boolean } {
  return {
    needsNewCompany: !findCompanyIdByName(
      dataset,
      deal.targetName?.trim() ?? null,
    ),
    needsNewAcquirer: !findAcquirerIdByName(
      dataset,
      deal.acquirerName?.trim() ?? null,
    ),
  };
}

/** Build merge-ready verified rows from one approved staging deal. */
export function buildPromotionDraft(
  options: BuildPromotionDraftOptions,
): BuildPromotionDraftResult {
  const { dataset, deal } = options;
  const missingFields = listPromotionMissingFields(options);
  if (missingFields.length > 0) {
    return { draft: null, missingFields };
  }

  const targetName = deal.targetName!.trim();
  const acquirerName = deal.acquirerName!.trim();
  const announcedDate = deal.announcedDate!;
  const reviewer = options.reviewerFields ?? {};

  const existingTargetId = findCompanyIdByName(dataset, targetName);
  const existingAcquirerId = findAcquirerIdByName(dataset, acquirerName);

  const targetId = existingTargetId ??
    nextNumericId("c", dataset.companies.map((company) => company.id));
  const acquirerId = existingAcquirerId ??
    `acquirer-${slugFromName(acquirerName)}`;
  const acquisitionId = nextNumericId(
    "deal",
    dataset.acquisitions.map((row) => row.id),
  );

  const secondary = resolveSecondarySource(deal, options)!;

  const company = existingTargetId ? undefined : {
    id: targetId,
    name: targetName,
    sector: reviewer.companySector!.trim(),
    stage: reviewer.companyStage?.trim() || "Acquired",
    founded: reviewer.companyFounded!,
    hq: reviewer.companyHq!.trim(),
    description: resolveCompanyDescription(deal, reviewer)!,
    sources: buildCompanySources(deal.filingUrl, secondary),
  };

  const acquirer = existingAcquirerId ? undefined : {
    id: acquirerId,
    name: acquirerName,
    ticker: deal.acquirerTicker ?? undefined,
    sector: reviewer.acquirerSector!.trim(),
    hq: reviewer.acquirerHq!.trim(),
  };

  const acquisition: VerifiedDataset["acquisitions"][number] = {
    id: acquisitionId,
    targetId,
    acquirerId,
    targetName,
    acquirerName,
    announcedDate,
    closedDate: deal.closedDate ?? undefined,
    dealType: deal.dealStructure?.trim() || "Acquisition",
    source: deal.filingUrl,
    strategicRationale: resolveStrategicRationale(reviewer)!,
    ...(deal.dealValueMillions !== null
      ? { dealValue: deal.dealValueMillions }
      : {}),
    ...(deal.dealValueNote?.trim()
      ? { dealValueNote: deal.dealValueNote.trim() }
      : deal.dealValueMillions === null
      ? { dealValueNote: "Terms not disclosed in SEC Item 2.01 filing." }
      : {}),
  };

  return {
    draft: { company, acquirer, acquisition },
    missingFields: [],
  };
}
