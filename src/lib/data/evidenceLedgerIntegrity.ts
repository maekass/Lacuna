import type { VerifiedDataset } from "./datasetSchema";
import type {
  EconomicEvidenceLedger,
  EconomicEvidenceRecord,
  EconomicValueBasis,
} from "./evidenceLedger";

export interface EvidenceIntegrityIssue {
  code: string;
  message: string;
  entity?: string;
}

export interface EconomicDisclosure {
  datePrecision: EconomicEvidenceRecord["datePrecision"];
  effectiveDate: string | null;
  publicAsOfDate: string | null;
}

interface MoneyFigure {
  usdMillions: number | null;
  raw: string;
}

interface DatedPart {
  precision: "day" | "month" | "year";
  effectiveDate: string;
  publicAsOfDate: string;
  isClose: boolean;
  index: number;
}

const MONTHS: Readonly<Record<string, number>> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

const MONTH_NAME =
  "Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?";

const AGGREGATOR =
  /\b(tracxn|crunchbase|pitchbook|wikipedia|mergr|cbinsights)\b/i;

const TOKEN_STOP = new Set([
  "press",
  "release",
  "acquisition",
  "coverage",
  "announcement",
  "company",
  "website",
  "filing",
  "value",
  "million",
  "billion",
  "price",
  "reports",
  "public",
  "health",
  "medical",
  "series",
  "total",
  "funding",
  "round",
  "valuation",
  "disclosed",
  "stored",
  "those",
  "rounds",
  "source",
  "states",
  "figure",
  "quoted",
  "dollar",
  "millions",
]);

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function iso(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** True when two million-dollar figures are the same quote after rounding. */
function closeMoney(left: number, right: number): boolean {
  const diff = Math.abs(left - right);
  const scale = Math.max(Math.abs(left), Math.abs(right), 1);
  return diff <= 0.2 || diff / scale <= 0.01;
}

function stripNonDisclosureYears(text: string): string {
  return text
    .replace(/\bFY\s*(?:19|20)\d{2}\b/gi, "FY")
    .replace(/\bat\s+(?:19|20)\d{2}\s+rates\b/gi, "at rates");
}

function mask(text: string, start: number, end: number): string {
  return text.slice(0, start) + " ".repeat(end - start) + text.slice(end);
}

function usdMillions(amount: number, unit: string | undefined): number {
  const normalized = (unit ?? "").toLowerCase();
  if (normalized === "b" || normalized === "billion") return amount * 1000;
  return amount;
}

/** Currency amounts written in a citation or source line. Share prices are omitted. */
export function moneyFigures(text: string): MoneyFigure[] {
  const figures: MoneyFigure[] = [];
  const pattern =
    /(USD\s*|\$|€|EUR\s*|£|GBP\s*|C\$|CAD\s*)\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s*(billion|million|[BM])?(?!\s*\/\s*share)/gi;
  for (const match of text.matchAll(pattern)) {
    const symbol = match[1].toUpperCase();
    const amount = Number(match[2].replace(/,/g, ""));
    const millions = usdMillions(amount, match[3]);
    const isUsd = symbol === "$" || symbol.startsWith("USD");
    figures.push({
      usdMillions: isUsd ? millions : null,
      raw: match[0],
    });
  }
  return figures;
}

function usdAmounts(text: string): number[] {
  return moneyFigures(text).flatMap((figure) =>
    figure.usdMillions == null ? [] : [figure.usdMillions]
  );
}

function rangeHigh(text: string): number | null {
  const match = text.match(
    /\$\s*(\d+(?:\.\d+)?)\s*[-–—]\s*\$?\s*(\d+(?:\.\d+)?)\s*(billion|million|[BM])?/i,
  );
  if (!match) return null;
  return usdMillions(Number(match[2]), match[3]);
}

function labeledUsd(text: string, pattern: RegExp): number | null {
  const match = text.match(pattern);
  if (!match) return null;
  return usdMillions(Number(match[1]), match[2]);
}

function upToAmount(text: string): number | null {
  return labeledUsd(
    text,
    /up to\s+(?:\$|USD\s*)?\s*(\d+(?:\.\d+)?)\s*(billion|million|[BM])?/i,
  );
}

/** USD figure the citation places next to "upfront", not a later total. */
function upfrontUsd(text: string): number | null {
  return labeledUsd(
    text,
    /(?:\$|USD\s*)\s*(\d+(?:\.\d+)?)\s*(billion|million|[BM])?\s+upfront/i,
  ) ??
    labeledUsd(
      text,
      /upfront(?:\s+consideration)?\s+(?:of\s+)?(?:\$|USD\s*)\s*(\d+(?:\.\d+)?)\s*(billion|million|[BM])?/i,
    );
}

/** USD figure the citation calls the total potential, including milestones. */
function totalPotentialUsd(text: string): number | null {
  return labeledUsd(
    text,
    /(?:\$|USD\s*)\s*(\d+(?:\.\d+)?)\s*(billion|million|[BM])?\s+total potential/i,
  );
}

function mentionsClose(text: string): boolean {
  return /\b(clos(?:e|ed|ing)|complet(?:e|ed|ion))\b/i.test(text);
}

function datedParts(citation: string): DatedPart[] {
  const cleaned = stripNonDisclosureYears(citation);
  const parts: DatedPart[] = [];
  let working = cleaned;

  const dayPattern = new RegExp(
    `\\b(${MONTH_NAME})\\.?\\s+(\\d{1,2}),?\\s+((?:19|20)\\d{2})\\b`,
    "gi",
  );
  for (const match of cleaned.matchAll(dayPattern)) {
    const month = MONTHS[match[1].toLowerCase()];
    const day = Number(match[2]);
    const year = Number(match[3]);
    if (day < 1 || day > lastDayOfMonth(year, month)) continue;
    const date = iso(year, month, day);
    const around = cleaned.slice(
      Math.max(0, match.index - 24),
      match.index + match[0].length + 24,
    );
    parts.push({
      precision: "day",
      effectiveDate: date,
      publicAsOfDate: date,
      isClose: mentionsClose(around),
      index: match.index,
    });
    working = mask(working, match.index, match.index + match[0].length);
  }

  const monthPattern = new RegExp(
    `\\b(${MONTH_NAME})\\.?\\s+((?:19|20)\\d{2})\\b`,
    "gi",
  );
  for (const match of working.matchAll(monthPattern)) {
    const month = MONTHS[match[1].toLowerCase()];
    const year = Number(match[2]);
    const around = working.slice(
      Math.max(0, match.index - 24),
      match.index + match[0].length + 24,
    );
    parts.push({
      precision: "month",
      effectiveDate: iso(year, month, 1),
      publicAsOfDate: iso(year, month, lastDayOfMonth(year, month)),
      isClose: mentionsClose(around),
      index: match.index,
    });
    working = mask(working, match.index, match.index + match[0].length);
  }

  for (const match of working.matchAll(/\b((?:19|20)\d{2})\b/g)) {
    const year = Number(match[1]);
    const around = working.slice(
      Math.max(0, match.index - 24),
      match.index + match[0].length + 24,
    );
    parts.push({
      precision: "year",
      effectiveDate: iso(year, 1, 1),
      publicAsOfDate: iso(year, 12, 31),
      isClose: mentionsClose(around),
      index: match.index,
    });
  }

  return parts.sort((a, b) => a.index - b.index);
}

function unknownDisclosure(): EconomicDisclosure {
  return {
    datePrecision: "unknown",
    effectiveDate: null,
    publicAsOfDate: null,
  };
}

function toDisclosure(part: DatedPart): EconomicDisclosure {
  return {
    datePrecision: part.precision,
    effectiveDate: part.effectiveDate,
    publicAsOfDate: part.publicAsOfDate,
  };
}

function tokens(text: string): Set<string> {
  const found = new Set<string>();
  for (const word of text.toLowerCase().split(/[^a-z0-9]+/)) {
    if (word.length >= 5 && !TOKEN_STOP.has(word)) found.add(word);
  }
  return found;
}

function sharesToken(left: string, right: string): boolean {
  const rightTokens = tokens(right);
  for (const token of tokens(left)) {
    if (rightTokens.has(token)) return true;
  }
  return false;
}

function dayInWindow(text: string, window: EconomicDisclosure): string[] {
  if (!window.effectiveDate || !window.publicAsOfDate) return [];
  const days: string[] = [];
  const pattern = new RegExp(
    `\\b(${MONTH_NAME})\\.?\\s+(\\d{1,2}),?\\s+((?:19|20)\\d{2})\\b`,
    "gi",
  );
  for (const match of text.matchAll(pattern)) {
    const month = MONTHS[match[1].toLowerCase()];
    const day = Number(match[2]);
    const year = Number(match[3]);
    if (day < 1 || day > lastDayOfMonth(year, month)) continue;
    const date = iso(year, month, day);
    if (date >= window.effectiveDate && date <= window.publicAsOfDate) {
      days.push(date);
    }
  }
  return days;
}

/**
 * Month windows become a day only when one eligible verified-source line
 * already states that day. Aggregator lines cannot supply a press-release day.
 */
function sharpenMonth(
  citation: string,
  window: EconomicDisclosure,
  prose: readonly string[],
): EconomicDisclosure {
  if (window.datePrecision !== "month") return window;
  const days = new Set<string>();
  for (const line of prose) {
    if (AGGREGATOR.test(line) && !AGGREGATOR.test(citation)) continue;
    if (!sharesToken(citation, line)) continue;
    for (const day of dayInWindow(line, window)) days.add(day);
  }
  if (days.size !== 1) return window;
  const day = [...days][0];
  return {
    datePrecision: "day",
    effectiveDate: day,
    publicAsOfDate: day,
  };
}

function choosePart(
  citation: string,
  basis: EconomicValueBasis,
): DatedPart | null {
  const parts = datedParts(citation);
  if (parts.length === 0) return null;
  if (basis === "sum_of_cited_rounds") {
    return [...parts].sort((a, b) =>
      a.publicAsOfDate < b.publicAsOfDate ? 1 : -1
    )[0];
  }
  const prefersClose =
    /\b(close value|at closing|closing value|merger close)\b/i.test(citation);
  const closeParts = parts.filter((part) => part.isClose);
  const openParts = parts.filter((part) => !part.isClose);
  let pool = parts;
  if (prefersClose && closeParts.length > 0) pool = closeParts;
  else if (openParts.length > 0 && closeParts.length > 0) pool = openParts;
  const sorted = [...pool].sort((a, b) =>
    a.publicAsOfDate < b.publicAsOfDate ? -1 : 1
  );
  return prefersClose ? sorted[sorted.length - 1] : sorted[0];
}

/**
 * Disclosure window entailed by the citation text.
 * `prose` may sharpen a month to a day already written on a verified source line.
 * Deal announcement fields are not prose and are never consulted.
 */
export function inferEconomicDisclosure(
  citation: string,
  basis: EconomicValueBasis,
  prose: readonly string[] = [],
): EconomicDisclosure {
  if (
    basis === "locator_only" ||
    basis === "unquoted_fx" ||
    basis === "unstated_conflict"
  ) {
    return unknownDisclosure();
  }
  const part = choosePart(citation, basis);
  if (!part) return unknownDisclosure();
  return sharpenMonth(citation, toDisclosure(part), prose);
}

/**
 * Label for the stored millions figure. Does not change the number.
 * Company sources are consulted only to detect a funding figure no source states.
 */
export function inferEconomicValueBasis(
  citation: string,
  value: number,
  companySources: readonly string[] = [],
): EconomicValueBasis {
  if (/no company source states/i.test(citation)) return "unstated_conflict";

  const amounts = usdAmounts(citation);
  const matches = amounts.some((amount) => closeMoney(amount, value));
  const summed = amounts.length >= 2 &&
    closeMoney(amounts.reduce((sum, amount) => sum + amount, 0), value);
  const foreign = moneyFigures(citation).some((figure) =>
    figure.usdMillions == null
  );

  if (!matches && foreign && !summed) return "unquoted_fx";

  const high = rangeHigh(citation);
  if (high != null && closeMoney(high, value)) return "range_high";

  if (
    /(?:more than|over|at least)\s+\$/i.test(citation) ||
    /\$\s*\d+(?:\.\d+)?\s*(?:billion|million|[BM])\s*\+/i.test(citation)
  ) {
    if (matches) return "at_least";
  }

  const potential = totalPotentialUsd(citation);
  if (potential != null && closeMoney(potential, value)) return "up_to";

  if (/up to|total potential/i.test(citation)) {
    const ceiling = upToAmount(citation);
    if (
      (ceiling != null && closeMoney(ceiling, value)) ||
      (!matches && summed)
    ) {
      return "up_to";
    }
  }

  const upfront = upfrontUsd(citation);
  if (upfront != null && closeMoney(upfront, value)) return "upfront";
  if (/fully diluted/i.test(citation) && matches) return "fully_diluted";
  if (/enterprise value/i.test(citation) && matches) {
    return "enterprise_value";
  }
  if (
    /equity value/i.test(citation) ||
    (/~\s*\$\s*\d+(?:\.\d+)?\s*(?:billion|million|[BM])?\s+equity\b/i.test(
      citation,
    ) && matches)
  ) {
    if (matches) return "equity_value";
  }
  if (/\d{1,3}%\s*stake/i.test(citation) && matches) return "stake";
  if (!matches && summed) return "sum_of_cited_rounds";
  if (
    matches &&
    /~|approximately|estimated|\best\./i.test(citation)
  ) {
    return "approximate";
  }
  if (matches) return "stated";

  if (amounts.length === 0 && !foreign) {
    const sourceAmounts = usdAmounts(companySources.join("\n"));
    const sourceMatches = sourceAmounts.some((amount) =>
      closeMoney(amount, value)
    );
    const sourceSum = sourceAmounts.length >= 2 &&
      closeMoney(
        sourceAmounts.reduce((sum, amount) => sum + amount, 0),
        value,
      );
    if (sourceAmounts.length > 0 && !sourceMatches && !sourceSum) {
      return "unstated_conflict";
    }
    return "locator_only";
  }

  return "unstated_conflict";
}

/** Canonical Crunchbase URL already named by a citation path. */
export function canonicalSourceUrl(citation: string): string | undefined {
  const match = citation.match(
    /crunchbase\.com\/organization\/[a-z0-9-]+/i,
  );
  if (!match) return undefined;
  return `https://www.${match[0].toLowerCase()}`;
}

function proseFor(
  record: EconomicEvidenceRecord,
  dataset: VerifiedDataset,
): string[] {
  const company = dataset.companies.find((item) =>
    item.id === record.companyId
  );
  const lines = [...(company?.sources ?? [])];
  if (record.field !== "lastKnownValuation") return lines;
  for (const deal of dataset.acquisitions) {
    if (deal.targetId !== record.companyId) continue;
    if (deal.dealValue == null || !closeMoney(deal.dealValue, record.value)) {
      continue;
    }
    if (deal.source) lines.push(deal.source);
    if (deal.dealValueNote) lines.push(deal.dealValueNote);
  }
  return lines;
}

function sameDisclosure(
  record: EconomicEvidenceRecord,
  disclosure: EconomicDisclosure,
): boolean {
  return record.datePrecision === disclosure.datePrecision &&
    record.effectiveDate === disclosure.effectiveDate &&
    record.publicAsOfDate === disclosure.publicAsOfDate;
}

/**
 * Cross-check the static economic ledger against citation text and verified
 * company/deal prose. Does not read deal announcement dates as vintages.
 */
export function validateEconomicEvidenceLedger(
  ledger: EconomicEvidenceLedger,
  dataset: VerifiedDataset,
): EvidenceIntegrityIssue[] {
  const issues: EvidenceIntegrityIssue[] = [];
  const companyIds = new Set(dataset.companies.map((company) => company.id));
  const seen = new Set<string>();
  const byId = new Map(ledger.records.map((record) => [record.id, record]));

  for (const record of ledger.records) {
    if (seen.has(record.id)) {
      issues.push({
        code: "duplicate-id",
        message: `Duplicate evidence id ${record.id}`,
        entity: record.id,
      });
    }
    seen.add(record.id);
    const expectedId = `${record.companyId}:${record.field}:`;
    if (!record.id.startsWith(expectedId) || !/:v\d+$/.test(record.id)) {
      issues.push({
        code: "id-shape",
        message: `Evidence id ${record.id} must be ${expectedId}vN`,
        entity: record.id,
      });
    }
    if (!companyIds.has(record.companyId)) {
      issues.push({
        code: "missing-company",
        message:
          `Evidence ${record.id} references missing company ${record.companyId}`,
        entity: record.id,
      });
    }
    if (record.supersedesId && !byId.has(record.supersedesId)) {
      issues.push({
        code: "supersedes-missing",
        message:
          `Evidence ${record.id} supersedes missing record ${record.supersedesId}`,
        entity: record.id,
      });
    }
  }

  const superseded = new Set<string>();
  for (const record of ledger.records) {
    if (!record.supersedesId) continue;
    const seenChain = new Set<string>([record.id]);
    let cursor: string | undefined = record.supersedesId;
    while (cursor) {
      if (seenChain.has(cursor)) {
        issues.push({
          code: "supersedes-cycle",
          message: `Evidence supersession cycle at ${record.id}`,
          entity: record.id,
        });
        break;
      }
      seenChain.add(cursor);
      superseded.add(cursor);
      cursor = byId.get(cursor)?.supersedesId;
    }
  }

  const currentKeys = new Set<string>();
  for (const record of ledger.records) {
    if (
      superseded.has(record.id) || record.verificationStatus === "retracted"
    ) {
      continue;
    }
    const key = `${record.companyId}:${record.field}`;
    if (currentKeys.has(key)) {
      issues.push({
        code: "multiple-current",
        message: `More than one current evidence record for ${key}`,
        entity: record.id,
      });
    }
    currentKeys.add(key);

    const company = dataset.companies.find((item) =>
      item.id === record.companyId
    );
    const basis = inferEconomicValueBasis(
      record.sourceCitation,
      record.value,
      company?.sources ?? [],
    );
    if (record.valueBasis !== basis) {
      issues.push({
        code: "value-basis",
        message: `Evidence ${record.id} valueBasis is ${
          record.valueBasis ?? "missing"
        }; citation supports ${basis}`,
        entity: record.id,
      });
    }
    const disclosure = inferEconomicDisclosure(
      record.sourceCitation,
      basis,
      proseFor(record, dataset),
    );
    if (!sameDisclosure(record, disclosure)) {
      issues.push({
        code: "disclosure",
        message: `Evidence ${record.id} vintage is ${record.datePrecision} ${
          record.publicAsOfDate ?? "null"
        }; citation supports ${disclosure.datePrecision} ${
          disclosure.publicAsOfDate ?? "null"
        }`,
        entity: record.id,
      });
    }
    const crunchbaseUrl = canonicalSourceUrl(record.sourceCitation);
    if (crunchbaseUrl && record.sourceUrl !== crunchbaseUrl) {
      issues.push({
        code: "source-url",
        message: `Evidence ${record.id} sourceUrl must be ${crunchbaseUrl}`,
        entity: record.id,
      });
    }
    if (
      record.verificationStatus === "verified" &&
      (record.datePrecision === "unknown" || !record.publicAsOfDate ||
        !record.sourceUrl)
    ) {
      issues.push({
        code: "verified-without-vintage",
        message:
          `Verified evidence ${record.id} needs a public date and sourceUrl`,
        entity: record.id,
      });
    }
    if (
      record.verificationStatus === "verified" &&
      AGGREGATOR.test(record.sourceCitation)
    ) {
      issues.push({
        code: "aggregator-verified",
        message: `Aggregator citation cannot be verified for ${record.id}`,
        entity: record.id,
      });
    }
    // A locator-only citation does not substantiate the stored economic value,
    // so it cannot supply a historical replay vintage for any economic field.
    if (
      record.valueBasis === "locator_only" &&
      (record.effectiveDate || record.publicAsOfDate ||
        record.datePrecision !== "unknown")
    ) {
      issues.push({
        code: "locator-dated",
        message:
          `Locator-only evidence ${record.id} cannot carry an effective/public date`,
        entity: record.id,
      });
    }
  }

  return issues;
}

/** Throw when the static ledger disagrees with its citations or company ids. */
export function assertEconomicEvidenceIntegrity(
  ledger: EconomicEvidenceLedger,
  dataset: VerifiedDataset,
): void {
  const issues = validateEconomicEvidenceLedger(ledger, dataset);
  if (issues.length === 0) return;
  const detail = issues.map((issue) => `${issue.code}: ${issue.message}`)
    .join("\n");
  throw new Error(
    `Economic evidence ledger failed integrity checks:\n${detail}`,
  );
}
