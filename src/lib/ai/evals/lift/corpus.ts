/**
 * Verified-dataset adapter for the evidence-ask retriever.
 *
 * Each passage restates one field of one `dataset.verified.json` record so a
 * citation can be checked against exactly one value. Text is generated from
 * the record; nothing is added that the record does not hold. Missing values
 * are stated as missing, never as zero.
 *
 * `record.code` carries the dataset record id. The verifier groups numeric
 * records by metric and scope to detect conflicting values; without the id,
 * two different deals' values would read as a conflict on one metric.
 */
import {
  defineEvidencePassage,
  type EvidencePassage,
} from "@/lib/ai/rag/contracts";
import type {
  VerifiedAcquisition,
  VerifiedCompany,
  VerifiedDataset,
} from "@/lib/data/datasetTypes";

export const VERIFIED_DATASET_URL =
  "https://github.com/maekass/Lacuna/blob/main/src/data/dataset.verified.json";

const LIMITATIONS = [
  "Lacuna verified dataset record curated from cited public sources. Source-verified, not a publication-approved Lacuna claim.",
  "Missing values are not zero.",
];

const LICENSE_NOTE =
  "Restated from Lacuna's committed verified dataset for offline evaluation.";

export type DealFact = "announcement" | "value" | "closing";

export function dealPassageId(dealId: string, fact: DealFact): string {
  return `vd:${dealId}:${fact}`;
}

export function companyPassageId(companyId: string): string {
  return `vd:${companyId}:profile`;
}

/** "acquisition of X" / "strategic investment in X". */
export function dealPhrase(deal: VerifiedAcquisition): string {
  const type = deal.dealType.toLowerCase();
  const preposition = type.includes("investment") ? "in" : "of";
  return `${type} ${preposition} ${deal.targetName}`;
}

function firstUrl(text: string | undefined): string | undefined {
  const match = text?.match(/https?:\/\/[^\s);,]+/);
  return match?.[0];
}

function base(
  dataset: VerifiedDataset,
  locator: string,
  title: string,
  sourceUrl: string,
) {
  const date = dataset.provenance.lastUpdated;
  return {
    sourceId: `lacuna:verified-dataset:${
      dataset.provenance.datasetVersion ?? "unversioned"
    }`,
    documentId: "dataset.verified.json",
    title,
    publisher: "Lacuna verified dataset",
    sourceUrl,
    locator,
    publishedAt: date,
    retrievedAt: date,
    storagePolicy: "excerpt_only" as const,
    redistribution: "public" as const,
    licenseNote: LICENSE_NOTE,
    evidenceType: "other" as const,
    reviewState: "source_verified" as const,
    supersessionStatus: "current" as const,
    corpusClass: "verified_dataset_adapter" as const,
    limitations: [...LIMITATIONS],
  };
}

function dealPassages(
  dataset: VerifiedDataset,
  deal: VerifiedAcquisition,
): EvidencePassage[] {
  const title =
    `Lacuna verified deal record: ${deal.acquirerName} / ${deal.targetName}`;
  const url = firstUrl(deal.source) ?? VERIFIED_DATASET_URL;
  const phrase = dealPhrase(deal);
  const locator = (field: string) => `acquisitions[id=${deal.id}].${field}`;
  const passages: EvidencePassage[] = [
    defineEvidencePassage({
      ...base(dataset, locator("announcedDate"), title, url),
      passageId: dealPassageId(deal.id, "announcement"),
      text:
        `${deal.acquirerName} announced the ${phrase} on ${deal.announcedDate}. Acquirer: ${deal.acquirerName}. Target: ${deal.targetName}. Structured record: metric announced_date, value ${deal.announcedDate}.`,
      record: {
        metric: "announced_date",
        value: deal.announcedDate,
        comparator: "eq",
        code: deal.id,
      },
    }),
    defineEvidencePassage({
      ...base(dataset, locator("dealValue"), title, url),
      passageId: dealPassageId(deal.id, "value"),
      text: deal.dealValue === undefined
        ? `Deal value for ${deal.acquirerName}'s ${phrase}: not disclosed in the Lacuna verified dataset. Structured record: metric deal_value_usd_millions, value missing.`
        : `Deal value for ${deal.acquirerName}'s ${phrase}: $${deal.dealValue} million (USD). Structured record: metric deal_value_usd_millions, value ${deal.dealValue}, unit usd_millions.`,
      record: {
        metric: "deal_value_usd_millions",
        value: deal.dealValue ?? null,
        comparator: "eq",
        unit: "usd_millions",
        code: deal.id,
      },
    }),
    defineEvidencePassage({
      ...base(dataset, locator("closedDate"), title, url),
      passageId: dealPassageId(deal.id, "closing"),
      text: deal.closedDate === undefined
        ? `No closing date is recorded in the Lacuna verified dataset for ${deal.acquirerName}'s ${phrase}. Structured record: metric closed_date, value missing.`
        : `${deal.acquirerName}'s ${phrase} closed on ${deal.closedDate}. Structured record: metric closed_date, value ${deal.closedDate}.`,
      record: {
        metric: "closed_date",
        value: deal.closedDate ?? null,
        comparator: "eq",
        code: deal.id,
      },
    }),
  ];
  return passages;
}

function companyPassage(
  dataset: VerifiedDataset,
  company: VerifiedCompany,
): EvidencePassage {
  const founded = company.founded === undefined
    ? "Founded year: not recorded in the Lacuna verified dataset."
    : `Founded: ${company.founded}.`;
  const hq = company.hq ? ` Headquarters: ${company.hq}.` : "";
  return defineEvidencePassage({
    ...base(
      dataset,
      `companies[id=${company.id}].founded`,
      `Lacuna verified company record: ${company.name}`,
      VERIFIED_DATASET_URL,
    ),
    passageId: companyPassageId(company.id),
    text:
      `${company.name} (${company.sector}). ${founded}${hq} Structured record: metric founded_year, value ${
        company.founded ?? "missing"
      }.`,
    record: {
      metric: "founded_year",
      value: company.founded ?? null,
      comparator: "eq",
      code: company.id,
    },
  });
}

/** Deterministic corpus: three passages per deal, one per company. */
export function buildVerifiedDatasetCorpus(
  dataset: VerifiedDataset,
): readonly EvidencePassage[] {
  return [
    ...dataset.acquisitions.flatMap((deal) => dealPassages(dataset, deal)),
    ...dataset.companies.map((company) => companyPassage(dataset, company)),
  ];
}
