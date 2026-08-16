import { formatDealDate } from "./formatDealDate";
import type { VerifiedDataset } from "@/lib/data/datasetTypes";
import type { ComparableDealSummary } from "./dealTypes";

const DEFAULT_LIMIT = 5;
const YEAR_WINDOW = 3;

/** Valuation peers must sit inside this disclosed-value ratio of the reference. */
export const VALUE_BAND_MIN = 0.25;
export const VALUE_BAND_MAX = 4;

export interface AdjacentNonPeer extends ComparableDealSummary {
  exclusionReason: "value_outside_band";
  valueRatio: number;
}

export interface ComparableDealSets {
  peers: ComparableDealSummary[];
  adjacencyNotPeers: AdjacentNonPeer[];
}

function targetMeta(
  dataset: VerifiedDataset,
  targetId: string,
): { sector: string | null; evidenceClass?: string } {
  const company = dataset.companies.find((c) => c.id === targetId);
  return {
    sector: company?.sector ?? null,
    evidenceClass: company?.evidenceClass,
  };
}

function announcementYear(isoDate: string): number {
  return Number.parseInt(isoDate.slice(0, 4), 10);
}

function valueRatio(
  candidateValue: number | undefined,
  referenceValue: number,
): number | null {
  if (typeof candidateValue !== "number" || candidateValue <= 0) return null;
  return candidateValue / referenceValue;
}

function inValueBand(ratio: number): boolean {
  return ratio >= VALUE_BAND_MIN && ratio <= VALUE_BAND_MAX;
}

function toSummary(
  dataset: VerifiedDataset,
  row: VerifiedDataset["acquisitions"][number],
  sector: string,
  reference: {
    acquirerId: string;
    evidenceClass?: string;
  },
): ComparableDealSummary {
  const meta = targetMeta(dataset, row.targetId);
  return {
    id: row.id,
    targetName: row.targetName,
    acquirerName: row.acquirerName,
    announcedDate: row.announcedDate,
    announcedLabel: formatDealDate(row.announcedDate),
    dealValue: row.dealValue,
    dealType: row.dealType,
    sector,
    evidenceClass: meta.evidenceClass,
    sameEvidenceClass: Boolean(
      reference.evidenceClass &&
        meta.evidenceClass === reference.evidenceClass,
    ),
    sameAcquirer: row.acquirerId === reference.acquirerId,
  };
}

function peerScore(
  row: ComparableDealSummary,
  refYear: number,
): number {
  const yearDelta = Math.abs(announcementYear(row.announcedDate) - refYear);
  return (row.sameEvidenceClass ? 8 : 0) +
    (row.sameAcquirer ? 4 : 0) +
    Math.max(0, 3 - yearDelta);
}

/**
 * Same-sector, same-type deals within ±`yearWindow` years.
 * Valuation peers require a disclosed value inside 0.25×–4× of the reference.
 * Same-sector outliers (e.g. a $21B ADC takeout next to a $230M diagnostic)
 * are returned separately as clinical adjacency — not valuation peers.
 * Research/intelligence affinity scores must not be consulted.
 */
export function listComparableDealSets(
  dataset: VerifiedDataset,
  dealId: string,
  limit = DEFAULT_LIMIT,
  yearWindow = YEAR_WINDOW,
): ComparableDealSets {
  const reference = dataset.acquisitions.find((a) => a.id === dealId);
  if (!reference) return { peers: [], adjacencyNotPeers: [] };

  const refMeta = targetMeta(dataset, reference.targetId);
  if (!refMeta.sector) return { peers: [], adjacencyNotPeers: [] };
  if (typeof reference.dealValue !== "number" || reference.dealValue <= 0) {
    return { peers: [], adjacencyNotPeers: [] };
  }

  const refYear = announcementYear(reference.announcedDate);
  const peers: ComparableDealSummary[] = [];
  const adjacencyNotPeers: AdjacentNonPeer[] = [];

  for (const row of dataset.acquisitions) {
    if (row.id === dealId) continue;
    if (row.dealType !== reference.dealType) continue;
    const meta = targetMeta(dataset, row.targetId);
    if (meta.sector !== refMeta.sector) continue;
    const delta = Math.abs(announcementYear(row.announcedDate) - refYear);
    if (delta > yearWindow) continue;

    const summary = toSummary(dataset, row, refMeta.sector, {
      acquirerId: reference.acquirerId,
      evidenceClass: refMeta.evidenceClass,
    });
    const ratio = valueRatio(row.dealValue, reference.dealValue);
    if (ratio === null || !inValueBand(ratio)) {
      if (ratio !== null) {
        adjacencyNotPeers.push({
          ...summary,
          exclusionReason: "value_outside_band",
          valueRatio: ratio,
        });
      }
      continue;
    }
    peers.push(summary);
  }

  peers.sort((a, b) => {
    const scoreDelta = peerScore(b, refYear) - peerScore(a, refYear);
    if (scoreDelta !== 0) return scoreDelta;
    return b.announcedDate.localeCompare(a.announcedDate);
  });
  adjacencyNotPeers.sort((a, b) => b.valueRatio - a.valueRatio);

  return {
    peers: peers.slice(0, limit),
    adjacencyNotPeers,
  };
}

/**
 * Valuation peers only (same sector, type, year window, 0.25×–4× value band).
 */
export function listComparableDeals(
  dataset: VerifiedDataset,
  dealId: string,
  limit = DEFAULT_LIMIT,
  yearWindow = YEAR_WINDOW,
): ComparableDealSummary[] {
  return listComparableDealSets(dataset, dealId, limit, yearWindow).peers;
}
