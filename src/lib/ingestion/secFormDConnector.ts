/**
 * SEC Form D (Regulation D private placement) connector.
 * Parses issuer, offering size, and industry from EDGAR XML.
 */

import {
  secFetchHeaders,
  secRateLimitPause,
} from "@/lib/ingestion/secFairAccess";
import { FORM_D_HEALTH_INDUSTRY_HINTS } from "@/lib/ingestion/publicRecords/whSearchTerms";
import type { EftsHit } from "@/lib/ingestion/secFullTextSearch";

const SEC_ARCHIVES = "https://www.sec.gov/Archives/edgar/data";

export interface ParsedFormD {
  eventId: string;
  secAccession: string;
  issuerName: string;
  issuerCik: string;
  filingDate: string;
  filingUrl: string;
  totalOfferingAmount: number | null;
  totalAmountSold: number | null;
  firstSaleDate: string | null;
  industryGroup: string | null;
  jurisdiction: string | null;
  exemptionType: string | null;
  isHealthcareIndustry: boolean;
  rawExcerpt: string;
}

function accessionNoDashes(accession: string): string {
  return accession.replace(/-/g, "");
}

function buildFilingIndexUrl(cik: string, accession: string): string {
  const cikNum = cik.replace(/^0+/, "");
  const adsh = accessionNoDashes(accession);
  return `${SEC_ARCHIVES}/${cikNum}/${adsh}/index.json`;
}

function buildPrimaryDocUrl(
  cik: string,
  accession: string,
  primaryDocument: string,
): string {
  const cikNum = cik.replace(/^0+/, "");
  const adsh = accessionNoDashes(accession);
  return `${SEC_ARCHIVES}/${cikNum}/${adsh}/${primaryDocument}`;
}

function extractXmlTag(xml: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, "i");
  const match = xml.match(re);
  return match?.[1]?.trim() ?? null;
}

function parseMoney(value: string | null): number | null {
  if (!value) return null;
  const cleaned = value.replace(/[$,]/g, "").trim();
  if (!cleaned || cleaned.toLowerCase() === "indefinite") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** Heuristic parse of Form D primary XML document. */
export function parseFormDXml(
  xml: string,
  meta: {
    cik: string;
    accession: string;
    filingDate: string;
    filingUrl: string;
  },
): ParsedFormD {
  const issuerName = extractXmlTag(xml, "issuerName") ??
    extractXmlTag(xml, "entityName") ??
    "Unknown issuer";
  const industryGroup = extractXmlTag(xml, "industryGroupType") ??
    extractXmlTag(xml, "industryGroup");
  const jurisdiction = extractXmlTag(xml, "jurisdictionOfInc") ??
    extractXmlTag(xml, "stateOrCountry");
  const exemptionType = extractXmlTag(xml, "federalExemptionsExclusions") ??
    extractXmlTag(xml, "typeOfFiling");

  const industryLower = (industryGroup ?? "").toLowerCase();
  const isHealthcareIndustry = FORM_D_HEALTH_INDUSTRY_HINTS.some((h) =>
    industryLower.includes(h.toLowerCase())
  );

  const excerpt = xml.slice(0, 2000).replace(/\s+/g, " ");

  return {
    eventId: `formd-${meta.accession}`,
    secAccession: meta.accession,
    issuerName,
    issuerCik: meta.cik,
    filingDate: meta.filingDate,
    filingUrl: meta.filingUrl,
    totalOfferingAmount: parseMoney(extractXmlTag(xml, "totalOfferingAmount")),
    totalAmountSold: parseMoney(extractXmlTag(xml, "totalAmountSold")),
    firstSaleDate: extractXmlTag(xml, "dateOfFirstSale"),
    industryGroup,
    jurisdiction,
    exemptionType,
    isHealthcareIndustry,
    rawExcerpt: excerpt,
  };
}

async function resolvePrimaryDocumentUrl(
  cik: string,
  accession: string,
): Promise<string | null> {
  const indexUrl = buildFilingIndexUrl(cik, accession);
  const res = await fetch(indexUrl, { headers: secFetchHeaders() });
  if (!res.ok) return null;
  const index = await res.json() as {
    directory?: { item?: Array<{ name?: string; type?: string }> };
  };
  const items = index.directory?.item ?? [];
  const primary = items.find((i) =>
    i.name?.toLowerCase().endsWith(".xml") &&
    (i.name.includes("primary") || i.name.startsWith("xslFormDX"))
  ) ?? items.find((i) => i.name?.toLowerCase().endsWith(".xml"));
  if (!primary?.name) return null;
  return buildPrimaryDocUrl(cik, accession, primary.name);
}

/** Fetch and parse a Form D filing from an EFTS hit. */
export async function fetchAndParseFormD(
  hit: EftsHit,
): Promise<ParsedFormD | null> {
  const docUrl = await resolvePrimaryDocumentUrl(hit.cik, hit.accession);
  await secRateLimitPause();
  if (!docUrl) return null;

  const res = await fetch(docUrl, {
    headers: secFetchHeaders("application/xml, text/xml, */*"),
  });
  if (!res.ok) return null;
  const xml = await res.text();
  await secRateLimitPause();

  return parseFormDXml(xml, {
    cik: hit.cik,
    accession: hit.accession,
    filingDate: hit.filingDate,
    filingUrl: docUrl,
  });
}
