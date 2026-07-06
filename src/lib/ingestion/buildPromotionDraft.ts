import type { VerifiedDataset } from "@/lib/data/datasetTypes";
import type { PendingDealRecord } from "@/lib/ingestion/pendingDeals";

export interface PromotionDraft {
  company?: VerifiedDataset["companies"][number];
  acquirer?: VerifiedDataset["acquirers"][number];
  acquisition: VerifiedDataset["acquisitions"][number];
}

export interface BuildPromotionDraftOptions {
  dataset: VerifiedDataset;
  deal: PendingDealRecord;
  secondarySourceUrl?: string | null;
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

function inferSector(keywords: string[]): string {
  const joined = keywords.join(" ").toLowerCase();
  if (joined.includes("fertility") || joined.includes("ivf")) return "Fertility";
  if (joined.includes("oncology") || joined.includes("cancer")) {
    return "Oncology";
  }
  if (joined.includes("diagnostic")) return "Diagnostics";
  if (joined.includes("telehealth") || joined.includes("virtual")) {
    return "Digital Health";
  }
  return "Women's Health";
}

function inferFoundedYear(announcedDate: string | null): number {
  if (announcedDate) {
    const year = Number(announcedDate.slice(0, 4));
    if (Number.isFinite(year)) return Math.max(1990, year - 5);
  }
  return new Date().getFullYear() - 5;
}

function buildCompanySources(
  filingUrl: string,
  secondarySourceUrl?: string | null,
): string[] {
  const sources = [filingUrl];
  if (secondarySourceUrl && secondarySourceUrl !== filingUrl) {
    sources.push(secondarySourceUrl);
  }
  return sources;
}

function buildStrategicRationale(deal: PendingDealRecord): string {
  const excerpt = deal.item201Excerpt?.trim();
  if (excerpt) return excerpt.slice(0, 500);
  return `Acquisition disclosed in SEC Item 2.01 filing (${deal.secAccession}).`;
}

/** Build merge-ready verified rows from one approved staging deal. */
export function buildPromotionDraft(
  options: BuildPromotionDraftOptions,
): PromotionDraft | null {
  const { dataset, deal, secondarySourceUrl } = options;
  const targetName = deal.targetName?.trim();
  const acquirerName = deal.acquirerName?.trim();
  const announcedDate = deal.announcedDate;

  if (!targetName || !acquirerName || !announcedDate) return null;

  const duplicateBySource = dataset.acquisitions.some((row) =>
    row.source === deal.filingUrl
  );
  if (duplicateBySource) return null;

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

  const secondary = secondarySourceUrl ??
    extractUrls(deal.reviewNotes)[0] ??
    null;

  const company = existingTargetId
    ? undefined
    : {
      id: targetId,
      name: targetName,
      sector: inferSector(deal.classificationKeywords),
      stage: "Private",
      founded: inferFoundedYear(announcedDate),
      hq: "Unknown",
      description: buildStrategicRationale(deal).slice(0, 280),
      sources: buildCompanySources(deal.filingUrl, secondary),
    };

  const acquirer = existingAcquirerId
    ? undefined
    : {
      id: acquirerId,
      name: acquirerName,
      ticker: deal.acquirerTicker ?? undefined,
      sector: "Healthcare",
      hq: "Unknown",
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
    strategicRationale: buildStrategicRationale(deal),
    ...(deal.dealValueMillions !== null
      ? { dealValue: deal.dealValueMillions }
      : {}),
    ...(deal.dealValueNote?.trim()
      ? { dealValueNote: deal.dealValueNote.trim() }
      : deal.dealValueMillions === null
      ? { dealValueNote: "Terms not disclosed in SEC Item 2.01 filing." }
      : {}),
  };

  return { company, acquirer, acquisition };
}
