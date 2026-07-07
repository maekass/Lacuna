import { getVerifiedDataset } from "@/lib/data/datasetProvider";
import type { PendingDealRecord } from "@/lib/ingestion/pendingDeals";
import { query } from "@/lib/data/dbClient";

export type DuplicateMatchKind =
  | "verified_source_url"
  | "verified_accession"
  | "verified_parties_date"
  | "pending_accession"
  | "pending_parties";

export interface DuplicateMatch {
  kind: DuplicateMatchKind;
  label: string;
  dealId?: string;
  acquisitionId?: string;
  href?: string;
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ");
}

function normalizeAccession(value: string): string {
  return value.replace(/-/g, "").toLowerCase();
}

function accessionInText(accession: string, text: string): boolean {
  const norm = normalizeAccession(accession);
  const haystack = text.toLowerCase();
  return haystack.includes(norm) ||
    haystack.includes(accession.toLowerCase());
}

/**
 * Detect likely duplicates of a staging candidate against verified JSON and
 * other pending rows. Does not block enrichment — surfaces warnings for reviewers.
 */
export async function detectPendingDealDuplicates(
  deal: PendingDealRecord,
): Promise<DuplicateMatch[]> {
  const matches: DuplicateMatch[] = [];
  const dataset = await getVerifiedDataset();

  for (const row of dataset.acquisitions) {
    if (row.source === deal.filingUrl) {
      matches.push({
        kind: "verified_source_url",
        label: `Verified deal already cites this filing URL`,
        acquisitionId: row.id,
        href: `/deals/${row.id}`,
      });
    }

    if (
      deal.secAccession &&
      accessionInText(deal.secAccession, row.source)
    ) {
      matches.push({
        kind: "verified_accession",
        label: `Verified deal cites SEC accession ${deal.secAccession}`,
        acquisitionId: row.id,
        href: `/deals/${row.id}`,
      });
    }

    const target = deal.targetName?.trim();
    const acquirer = deal.acquirerName?.trim();
    const announced = deal.announcedDate;
    if (
      target &&
      acquirer &&
      announced &&
      normalizeName(row.targetName) === normalizeName(target) &&
      normalizeName(row.acquirerName) === normalizeName(acquirer) &&
      row.announcedDate === announced
    ) {
      matches.push({
        kind: "verified_parties_date",
        label: `Verified deal matches target, acquirer, and announcement date`,
        acquisitionId: row.id,
        href: `/deals/${row.id}`,
      });
    }
  }

  const pendingRows = await query<{
    deal_id: string;
    sec_accession: string;
    target_name: string | null;
    acquirer_name: string | null;
    announced_date: string | null;
  }>(
    `SELECT deal_id, sec_accession, target_name, acquirer_name, announced_date
     FROM lacuna_deals
     WHERE deal_id <> $1
       AND status IN ('pending', 'pending_review', 'approved')`,
    [deal.dealId],
  );

  for (const row of pendingRows) {
    if (
      deal.secAccession &&
      normalizeAccession(row.sec_accession) ===
        normalizeAccession(deal.secAccession)
    ) {
      matches.push({
        kind: "pending_accession",
        label: `Another staging row shares SEC accession ${deal.secAccession}`,
        dealId: row.deal_id,
        href: `/deals/staging/${row.deal_id}`,
      });
    }

    const target = deal.targetName?.trim();
    const acquirer = deal.acquirerName?.trim();
    const announced = deal.announcedDate;
    if (
      target &&
      acquirer &&
      row.target_name &&
      row.acquirer_name &&
      normalizeName(row.target_name) === normalizeName(target) &&
      normalizeName(row.acquirer_name) === normalizeName(acquirer) &&
      (!announced || !row.announced_date ||
        row.announced_date === announced)
    ) {
      matches.push({
        kind: "pending_parties",
        label: `Another staging row matches target and acquirer`,
        dealId: row.deal_id,
        href: `/deals/staging/${row.deal_id}`,
      });
    }
  }

  const seen = new Set<string>();
  return matches.filter((match) => {
    const key = `${match.kind}:${
      match.dealId ?? match.acquisitionId ?? match.label
    }`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
