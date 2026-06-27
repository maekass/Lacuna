#!/usr/bin/env npx tsx

/**
 * Build endometriosis ecosystem coverage from Crunchbase exports.
 *
 * Inclusion rules (per curation policy):
 *   1. For-profit product companies only (exclude clinics, hospitals, nonprofits)
 *   2. Must have Crunchbase fundingStatus OR fundraisingStatus OR totalFunding
 *      (from CSV export) OR verified entry in KNOWN_FUNDING registry
 *
 * Inputs:
 *   data/crunchbase-exports/endometriosis-coverage-paste.txt  (text search paste)
 *   data/crunchbase-exports/endometriosis-coverage.csv        (optional CSV w/ status cols)
 *
 * Output:
 *   src/data/computed-endometriosis-coverage.json
 *
 * Usage: npx tsx scripts/build-endometriosis-coverage.ts
 */

import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "fs";
import { resolve } from "path";
import type {
  CoverageCompanyCategory,
  TherapeuticAreaCoverageCompany,
  TherapeuticAreaCoverageManifest,
} from "../src/lib/data/therapeuticAreaCoverageTypes";

const ROOT = resolve(__dirname, "..");
const EXPORT_DIR = resolve(ROOT, "data", "crunchbase-exports");
const PASTE_FILE = resolve(EXPORT_DIR, "endometriosis-coverage-paste.txt");
const CSV_PREFIX = "endometriosis-coverage";
const OUT_FILE = resolve(ROOT, "src", "data", "computed-endometriosis-coverage.json");
const DATASET_FILE = resolve(ROOT, "src", "data", "dataset.verified.json");

/** Crunchbase text search total shown in Pro UI when paste was captured. */
const CRUNCHBASE_SEARCH_TOTAL = 409;

interface ParsedEntry {
  name: string;
  description: string;
  rank: number | null;
}

interface CsvFundingRow {
  name: string;
  fundingStatus?: string;
  fundraisingStatus?: string;
  totalFundingM?: number;
  lastFundingType?: string;
  operatingStatus?: string;
}

interface KnownFunding {
  fundingStatus?: string;
  fundraisingStatus?: string;
  totalFundingM?: number;
  lastFundingType?: string;
  operatingStatus?: string;
  category: CoverageCompanyCategory;
  sources: string[];
}

/** Public or press-verified funding — used when CSV status columns are absent. */
const KNOWN_FUNDING: Record<string, KnownFunding> = {
  "context therapeutics": {
    fundingStatus: "IPO",
    lastFundingType: "Post-IPO Equity",
    operatingStatus: "Active",
    category: "pharma",
    sources: [
      "Crunchbase - crunchbase.com/organization/context-therapeutics",
      "Company website - contexttx.com",
    ],
  },
  "organon": {
    fundingStatus: "IPO",
    lastFundingType: "Post-IPO Equity",
    operatingStatus: "Active",
    category: "pharma",
    sources: [
      "Crunchbase - crunchbase.com/organization/organon",
      "Organon investor relations",
    ],
  },
  "endogene bio": {
    fundingStatus: "Seed",
    lastFundingType: "Seed",
    totalFundingM: 3.1,
    operatingStatus: "Active",
    category: "diagnostics",
    sources: [
      "Crunchbase - crunchbase.com/organization/endogene-bio",
      "LinkedIn company profile - total funding USD 3.1M",
    ],
  },
  "visana health": {
    fundingStatus: "Early Stage Venture",
    lastFundingType: "Seed",
    operatingStatus: "Active",
    category: "digital_health",
    sources: ["Crunchbase - crunchbase.com/organization/visana-health"],
  },
  "gesynta pharma": {
    fundingStatus: "Early Stage Venture",
    lastFundingType: "Series B",
    operatingStatus: "Active",
    category: "therapeutics",
    sources: [
      "Femtech Insider - SEK 347M Series B",
      "Company website - gesynta.se",
    ],
  },
  "calla lily clinical care": {
    fundingStatus: "Early Stage Venture",
    lastFundingType: "Grant",
    operatingStatus: "Active",
    category: "medical_device",
    sources: ["Crunchbase - crunchbase.com/organization/calla-lily-clinical-care"],
  },
  "opal therapeutics": {
    fundingStatus: "Grant",
    lastFundingType: "Grant",
    totalFundingM: 0.275,
    operatingStatus: "Active",
    category: "platform",
    sources: [
      "NSF SBIR Phase I award 2024 - sbir.gov",
      "Company website - opaltherapeutics.com",
    ],
  },
  "dotlab": {
    fundingStatus: "Early Stage Venture",
    lastFundingType: "Series A",
    totalFundingM: 12.65,
    operatingStatus: "Active",
    category: "diagnostics",
    sources: [
      "DotLab press release - $10M Series A (2019)",
      "TechCrunch - DotLab Series A coverage",
    ],
  },
  "fimmcyte": {
    fundingStatus: "Early Stage Venture",
    operatingStatus: "Active",
    category: "therapeutics",
    sources: ["Crunchbase - crunchbase.com/organization/fimmcyte"],
  },
  "elanza wellness": {
    fundingStatus: "Early Stage Venture",
    operatingStatus: "Active",
    category: "digital_health",
    sources: ["Crunchbase - crunchbase.com/organization/elanza-wellness"],
  },
  "endometrics": {
    fundingStatus: "Early Stage Venture",
    operatingStatus: "Active",
    category: "diagnostics",
    sources: ["Crunchbase - crunchbase.com/organization/endometrics"],
  },
  "scanvio": {
    fundingStatus: "Early Stage Venture",
    operatingStatus: "Active",
    category: "diagnostics",
    sources: ["Crunchbase - crunchbase.com/organization/scanvio"],
  },
  "afynia laboratories": {
    fundingStatus: "Early Stage Venture",
    operatingStatus: "Active",
    category: "diagnostics",
    sources: ["Crunchbase - crunchbase.com/organization/afynia-laboratories"],
  },
  "aima laboratories": {
    fundingStatus: "Early Stage Venture",
    operatingStatus: "Active",
    category: "diagnostics",
    sources: ["Crunchbase - crunchbase.com/organization/aima-laboratories"],
  },
  "femmepharma global healthcare": {
    fundingStatus: "M&A",
    operatingStatus: "Active",
    category: "pharma",
    sources: ["Crunchbase - crunchbase.com/organization/femmepharma"],
  },
  "nura health": {
    fundingStatus: "Early Stage Venture",
    operatingStatus: "Active",
    category: "diagnostics",
    sources: ["Crunchbase - crunchbase.com/organization/nura-health"],
  },
  "syrona health": {
    fundingStatus: "Early Stage Venture",
    operatingStatus: "Active",
    category: "digital_health",
    sources: ["Crunchbase - crunchbase.com/organization/syrona-health"],
  },
  "maipl therapeutics": {
    fundingStatus: "Early Stage Venture",
    operatingStatus: "Active",
    category: "therapeutics",
    sources: ["Crunchbase - crunchbase.com/organization/maipl-therapeutics"],
  },
  "endocure": {
    fundingStatus: "Early Stage Venture",
    operatingStatus: "Active",
    category: "diagnostics",
    sources: ["Crunchbase - crunchbase.com/organization/endocure"],
  },
  "kranus health": {
    fundingStatus: "Early Stage Venture",
    lastFundingType: "Series A",
    operatingStatus: "Active",
    category: "digital_health",
    sources: [
      "Crunchbase - crunchbase.com/organization/kranus-health",
      "NEJM Evidence / Lancet Digital Health - DiGA trials",
    ],
  },
  "sur180 therapeutics": {
    fundingStatus: "Early Stage Venture",
    operatingStatus: "Active",
    category: "therapeutics",
    sources: ["Crunchbase - crunchbase.com/organization/sur180-therapeutics"],
  },
  "endo app": {
    fundingStatus: "Early Stage Venture",
    operatingStatus: "Active",
    category: "digital_health",
    sources: ["Crunchbase - crunchbase.com/organization/endo-app"],
  },
  "temple therapeutics": {
    fundingStatus: "Early Stage Venture",
    operatingStatus: "Active",
    category: "therapeutics",
    sources: ["Crunchbase - crunchbase.com/organization/temple-therapeutics"],
  },
  "endodiag": {
    fundingStatus: "Early Stage Venture",
    operatingStatus: "Active",
    category: "diagnostics",
    sources: ["Crunchbase - crunchbase.com/organization/endodiag"],
  },
  "medai": {
    fundingStatus: "Early Stage Venture",
    operatingStatus: "Active",
    category: "platform",
    sources: ["Crunchbase - crunchbase.com/organization/medai"],
  },
  "belle health": {
    fundingStatus: "Early Stage Venture",
    operatingStatus: "Active",
    category: "medical_device",
    sources: ["Crunchbase - crunchbase.com/organization/belle-health"],
  },
  "neurocrine biosciences": {
    fundingStatus: "IPO",
    lastFundingType: "Post-IPO Equity",
    operatingStatus: "Active",
    category: "pharma",
    sources: [
      "Crunchbase - crunchbase.com/organization/neurocrine-biosciences",
      "SEC EDGAR filings",
    ],
  },
  "memmzy health": {
    fundingStatus: "Early Stage Venture",
    operatingStatus: "Active",
    category: "digital_health",
    sources: ["Crunchbase - crunchbase.com/organization/memmzy-health"],
  },
  "evestra onkologia": {
    fundingStatus: "Early Stage Venture",
    operatingStatus: "Active",
    category: "pharma",
    sources: ["Crunchbase - crunchbase.com/organization/evestra-onkologia"],
  },
  "pyrefin": {
    fundingStatus: "Early Stage Venture",
    operatingStatus: "Active",
    category: "therapeutics",
    sources: ["Crunchbase - crunchbase.com/organization/pyrefin"],
  },
  "cicero diagnostics": {
    fundingStatus: "Early Stage Venture",
    operatingStatus: "Active",
    category: "diagnostics",
    sources: ["Crunchbase - crunchbase.com/organization/cicero-diagnostics"],
  },
  "nalu": {
    fundingStatus: "Early Stage Venture",
    operatingStatus: "Active",
    category: "digital_health",
    sources: ["Crunchbase - crunchbase.com/organization/nalu"],
  },
  "meliodays medical": {
    fundingStatus: "Early Stage Venture",
    operatingStatus: "Active",
    category: "medical_device",
    sources: ["Crunchbase - crunchbase.com/organization/meliodays-medical"],
  },
  "diamens": {
    fundingStatus: "Early Stage Venture",
    operatingStatus: "Active",
    category: "diagnostics",
    sources: ["Crunchbase - crunchbase.com/organization/diamens"],
  },
  "valeo medical": {
    fundingStatus: "Early Stage Venture",
    operatingStatus: "Active",
    category: "diagnostics",
    sources: [
      "Crunchbase - crunchbase.com/organization/valeo-medical",
      "Discovery Life Sciences fund coverage",
    ],
  },
  "viramal": {
    fundingStatus: "Early Stage Venture",
    operatingStatus: "Active",
    category: "pharma",
    sources: ["Crunchbase - crunchbase.com/organization/viramal"],
  },
  "july health": {
    fundingStatus: "Early Stage Venture",
    operatingStatus: "Active",
    category: "digital_health",
    sources: ["Crunchbase - crunchbase.com/organization/july-health"],
  },
  "xella health": {
    fundingStatus: "Early Stage Venture",
    operatingStatus: "Active",
    category: "digital_health",
    sources: ["Crunchbase - crunchbase.com/organization/xella-health"],
  },
  "meditrina pharmaceuticals": {
    fundingStatus: "Closed",
    lastFundingType: "Series A",
    totalFundingM: 4.5,
    operatingStatus: "Closed",
    category: "pharma",
    sources: [
      "BioSpace - $4.4M initial funding (2007)",
      "Crunchbase - crunchbase.com/organization/meditrina-pharmaceuticals-inc",
    ],
  },
  "hera biotech": {
    fundingStatus: "Early Stage Venture",
    lastFundingType: "Series A",
    operatingStatus: "Active",
    category: "diagnostics",
    sources: [
      "Endpoints News - endometriosis diagnostics coverage, 2024",
      "Fund portfolio listing",
    ],
  },
  "forendo pharma": {
    fundingStatus: "M&A",
    operatingStatus: "Active",
    category: "therapeutics",
    sources: ["Organon press release - Forendo acquisition, 2021"],
  },
  "myovant sciences": {
    fundingStatus: "M&A",
    operatingStatus: "Active",
    category: "therapeutics",
    sources: ["Sumitovant press release - Myovant take-private, 2022"],
  },
  "femxx health": {
    fundingStatus: "Closed",
    lastFundingType: "Seed",
    totalFundingM: 0.1,
    operatingStatus: "Closed",
    category: "digital_health",
    sources: [
      "CB Insights - $100K seed from Entrepreneur First",
      "LinkedIn - FemXX Health closure announcement, 2023",
    ],
  },
  "endodiagnosis inc": {
    fundingStatus: "Early Stage Venture",
    lastFundingType: "Debt Financing",
    totalFundingM: 0.15,
    operatingStatus: "Active",
    category: "diagnostics",
    sources: [
      "EndoDiagnosis / ENDOSURE - endodiagnosis.com",
      "LinkedIn EndoSure Inc. - $150K debt financing, 2025",
    ],
  },
};

const NONPROFIT_PATTERNS = [
  /\bassociation\b/i,
  /\bfoundation\b/i,
  /\bnetwork canada\b/i,
  /\bnonprofit\b/i,
  /\bnon-profit\b/i,
  /\bcharity\b/i,
];

const CLINICAL_SERVICE_PATTERNS = [
  /\bob[- ]?gyn\b/i,
  /\bobstetric/i,
  /\bgynecolog/i,
  /\bgynaecolog/i,
  /\bfertility (partnership|center|centre|clinic|partners|florida|san isidro)\b/i,
  /\bivf (fertility )?clinic\b/i,
  /\bfertility (&|and) gynecology\b/i,
  /\bfertility (&|and) ivf\b/i,
  /\bhospital\b/i,
  /\bmedical center\b/i,
  /\bmedical centre\b/i,
  /\bmaternidade\b/i,
  /\bspecialists of\b/i,
  /\bspecialists (is|are|of tulsa)\b/i,
  /\bprovides (health care|womens health|obstetric|gynecology|treatment services|comprehensive healthcare)\b/i,
  /\boffers (obstetric|gynecology|infertility|fertility|health care services|comprehensive healthcare)\b/i,
  /\b(acupuncture|physical therapy|wellness centre|functional medicine|pilates)\b/i,
  /\b(dr\.|m\.d\.)\b/i,
  /\breproductive (associates|institute|partnership|surgery center|care center)\b/i,
  /\bclinical research offers medical care\b/i,
  /\bprovides clinical research services\b/i,
  /\bcurrent clinical trials include\b/i,
  /\bpropilates\b/i,
  /\bgroup for women\b/i,
  /\bwomen's specialists\b/i,
  /\bob-gyn associates\b/i,
  /\btreatment center\b/i,
  /\bendometriosis center\b/i,
  /\bseckin endometriosis\b/i,
  /\bdiagnostic center specializing\b/i,
  /\bmedical practice specializing\b/i,
  /\bhealthcare clinic that provides infertility\b/i,
  /\btrauma-informed therapists\b/i,
  /\bgroup of trauma-informed\b/i,
  /\bnutritional counseling\b/i,
  /\bonline learning content\b/i,
  /\btheatre in the round\b/i,
  /\binstitut f/i,
  /\binstitute provides treatment for women/i,
  /\bqendo\b/i,
  /\bassociation for women/i,
];

const PRODUCT_SIGNAL_PATTERNS = [
  /\bclinical[- ]stage\b/i,
  /\bpharma\b/i,
  /\bbiotech\b/i,
  /\btherapeutic/i,
  /\bdiagnostic/i,
  /\bdevice\b/i,
  /\bplatform\b/i,
  /\bdigital health\b/i,
  /\bfemtech\b/i,
  /\binvestigational\b/i,
  /\bphase [i1234]\b/i,
  /\bdrug candidate\b/i,
  /\brepurpos/i,
  /\bbiobank\b/i,
  /\borganoid\b/i,
  /\bbiomarker\b/i,
  /\bmachine learning\b/i,
  /\bAI[- ]/i,
  /\bCE-certified\b/i,
  /\bapp\b/i,
  /\bsoftware\b/i,
  /\bmedical gadget\b/i,
];

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(name: string): string {
  return normalizeName(name).replace(/\s+/g, "-");
}

function parseCrunchbaseText(text: string): ParsedEntry[] {
  const lines = text.split("\n").map((l) => l.trim());
  const blocks: string[][] = [];
  let currentBlock: string[] = [];

  for (const line of lines) {
    if (line.endsWith(" Logo") && line.length < 100) {
      if (currentBlock.length > 0) blocks.push(currentBlock);
      currentBlock = [line];
    } else {
      currentBlock.push(line);
    }
  }
  if (currentBlock.length > 0) blocks.push(currentBlock);

  const entries: ParsedEntry[] = [];

  for (const block of blocks) {
    const nonEmpty = block.filter((l) => l.length > 0);
    if (nonEmpty.length < 2) continue;

    const name = nonEmpty[0].replace(/ Logo$/, "").trim();
    let idx = 2;
    let rank: number | null = null;

    if (idx < nonEmpty.length) {
      const rankStr = nonEmpty[idx];
      const rankNum = parseInt(rankStr.replace(/,/g, ""), 10);
      if (!isNaN(rankNum) && /^[\d,]+$/.test(rankStr)) {
        rank = rankNum;
        idx += 1;
      }
    }

    const descParts: string[] = [];
    for (let i = idx; i < nonEmpty.length; i++) {
      const line = nonEmpty[i];
      if (line !== "—" && line !== name) descParts.push(line);
    }

    if (name) {
      entries.push({
        name,
        description: descParts.join(" ").trim(),
        rank,
      });
    }
  }

  return entries;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result.map((s) => s.trim());
}

function parseMoney(value: string): number | undefined {
  if (!value || value === "—" || value === "N/A") return undefined;
  const cleaned = value.replace(/[$,\s]/g, "").replace(/USD/gi, "");
  if (/^[0-9.]+[MB]$/i.test(cleaned)) {
    const num = parseFloat(cleaned);
    return cleaned.slice(-1).toUpperCase() === "B" ? num * 1000 : num;
  }
  if (/^[0-9.]+K$/i.test(cleaned)) return parseFloat(cleaned) / 1000;
  const num = parseFloat(cleaned);
  return isNaN(num) ? undefined : num / 1_000_000;
}

function loadCsvRows(): Map<string, CsvFundingRow> {
  const map = new Map<string, CsvFundingRow>();
  mkdirSync(EXPORT_DIR, { recursive: true });

  let files: string[] = [];
  try {
    files = readdirSync(EXPORT_DIR).filter(
      (f) => f.startsWith(CSV_PREFIX) && f.endsWith(".csv"),
    );
  } catch {
    return map;
  }

  for (const file of files) {
    const content = readFileSync(resolve(EXPORT_DIR, file), "utf-8");
    const lines = content.split("\n").filter((l) => l.trim());
    if (lines.length < 2) continue;

    const headers = parseCsvLine(lines[0]);
    const nameKey = headers.find((h) =>
      /organization name|company name|^name$/i.test(h)
    );
    const fundingStatusKey = headers.find((h) =>
      /^funding status$/i.test(h.trim())
    );
    const fundraisingStatusKey = headers.find((h) =>
      /^fundraising status$/i.test(h.trim())
    );
    const totalFundingKey = headers.find((h) =>
      /total funding amount/i.test(h)
    );
    const lastFundingTypeKey = headers.find((h) =>
      /last funding type/i.test(h)
    );
    const operatingStatusKey = headers.find((h) =>
      /operating status/i.test(h)
    );

    if (!nameKey) continue;

    for (let i = 1; i < lines.length; i++) {
      const values = parseCsvLine(lines[i]);
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] ?? "";
      });
      const name = row[nameKey];
      if (!name) continue;
      map.set(normalizeName(name), {
        name,
        fundingStatus: fundingStatusKey ? row[fundingStatusKey] : undefined,
        fundraisingStatus: fundraisingStatusKey
          ? row[fundraisingStatusKey]
          : undefined,
        totalFundingM: totalFundingKey
          ? parseMoney(row[totalFundingKey])
          : undefined,
        lastFundingType: lastFundingTypeKey
          ? row[lastFundingTypeKey]
          : undefined,
        operatingStatus: operatingStatusKey
          ? row[operatingStatusKey]
          : undefined,
      });
    }
  }

  return map;
}

function isNonProfit(name: string, description: string): boolean {
  const haystack = `${name} ${description}`;
  return NONPROFIT_PATTERNS.some((p) => p.test(haystack));
}

function isClinicalServiceProvider(name: string, description: string): boolean {
  const haystack = `${name} ${description}`;
  if (!haystack.trim()) return false;
  const hasProductSignal = PRODUCT_SIGNAL_PATTERNS.some((p) =>
    p.test(haystack)
  );
  if (hasProductSignal) return false;
  return CLINICAL_SERVICE_PATTERNS.some((p) => p.test(haystack));
}

function lookupKnownFunding(norm: string): KnownFunding | undefined {
  if (KNOWN_FUNDING[norm]) return KNOWN_FUNDING[norm];
  // Aliases from Crunchbase display names
  const aliases: Record<string, string> = {
    "endogene bio": "endogene bio",
    endometriosis: "endometrics",
    "afynia laboratories": "afynia laboratories",
    "maipl therapeutics inc": "maipl therapeutics",
    "femmepharma global healthcare inc": "femmepharma global healthcare",
    "meditrina pharmaceuticals inc": "meditrina pharmaceuticals",
    "the endometriosis network canada": "",
    "endo app": "endo app",
    "endodiagnosis inc": "endodiagnosis inc",
    endodiagnosis: "endodiagnosis inc",
    "femxx health": "femxx health",
  };
  const alias = aliases[norm];
  if (alias && KNOWN_FUNDING[alias]) return KNOWN_FUNDING[alias];
  return undefined;
}

function inferCategory(
  description: string,
  known?: KnownFunding,
): CoverageCompanyCategory {
  if (known?.category) return known.category;
  const d = description.toLowerCase();
  if (/diagnostic|biomarker|screening|test for/i.test(d)) return "diagnostics";
  if (/device|drug-device|iud|ring|wearable/i.test(d)) return "medical_device";
  if (/digital|app|telemedicine|virtual|platform for care/i.test(d)) {
    return "digital_health";
  }
  if (/organoid|discovery platform|drug discovery/i.test(d)) return "platform";
  if (/pharma|pharmaceutical|drug candidate|inhibitor/i.test(d)) {
    return "pharma";
  }
  return "therapeutics";
}

function hasFundingFields(
  csv: CsvFundingRow | undefined,
  known: KnownFunding | undefined,
): boolean {
  if (csv) {
    if (csv.fundingStatus?.trim()) return true;
    if (csv.fundraisingStatus?.trim()) return true;
    if (csv.totalFundingM != null && csv.totalFundingM > 0) return true;
    if (csv.lastFundingType?.trim()) return true;
  }
  if (known) {
    if (known.fundingStatus?.trim()) return true;
    if (known.fundraisingStatus?.trim()) return true;
    if (known.totalFundingM != null && known.totalFundingM > 0) return true;
    if (known.lastFundingType?.trim()) return true;
  }
  return false;
}

function main() {
  mkdirSync(EXPORT_DIR, { recursive: true });

  let pasteText = "";
  try {
    pasteText = readFileSync(PASTE_FILE, "utf-8");
  } catch {
    console.error(`❌ Missing paste file: ${PASTE_FILE}`);
    process.exit(1);
  }

  const entries = parseCrunchbaseText(pasteText);
  const csvByName = loadCsvRows();
  const dataset = JSON.parse(readFileSync(DATASET_FILE, "utf-8"));
  const verifiedByNorm = new Map<
    string,
    { id: string; name: string }
  >();
  for (const c of dataset.companies ?? []) {
    verifiedByNorm.set(normalizeName(c.name), { id: c.id, name: c.name });
  }

  let excludedNonForProfit = 0;
  let excludedClinicalServices = 0;
  let excludedNoFundingStatus = 0;
  const included: TherapeuticAreaCoverageCompany[] = [];
  const seen = new Set<string>();

  for (const entry of entries) {
    const norm = normalizeName(entry.name);
    if (seen.has(norm)) continue;
    seen.add(norm);

    if (isNonProfit(entry.name, entry.description)) {
      excludedNonForProfit++;
      continue;
    }

    if (isClinicalServiceProvider(entry.name, entry.description)) {
      excludedClinicalServices++;
      continue;
    }

    const csv = csvByName.get(norm);
    const known = lookupKnownFunding(norm);

    if (!hasFundingFields(csv, known)) {
      excludedNoFundingStatus++;
      continue;
    }

    const verified = verifiedByNorm.get(norm);
    const category = inferCategory(entry.description, known);

    included.push({
      id: slugify(entry.name),
      name: entry.name,
      description: entry.description || known?.sources[0] || "—",
      category,
      crunchbaseRank: entry.rank ?? undefined,
      fundingStatus: csv?.fundingStatus ?? known?.fundingStatus,
      fundraisingStatus: csv?.fundraisingStatus ?? known?.fundraisingStatus,
      totalFundingM: csv?.totalFundingM ?? known?.totalFundingM,
      lastFundingType: csv?.lastFundingType ?? known?.lastFundingType,
      operatingStatus: csv?.operatingStatus ?? known?.operatingStatus,
      inVerifiedDataset: Boolean(verified),
      verifiedDatasetId: verified?.id,
      sources: [
        ...(known?.sources ?? []),
        `Crunchbase Pro search paste (rank ${entry.rank ?? "—"})`,
      ],
    });
  }

  included.sort((a, b) => {
    const rankA = a.crunchbaseRank ?? Number.MAX_SAFE_INTEGER;
    const rankB = b.crunchbaseRank ?? Number.MAX_SAFE_INTEGER;
    return rankA - rankB;
  });

  const manifest: TherapeuticAreaCoverageManifest = {
    therapeuticArea: "Endometriosis",
    therapeuticAreaId: "endometriosis",
    generatedAt: new Date().toISOString().split("T")[0],
    crunchbaseSearchTotal: CRUNCHBASE_SEARCH_TOTAL,
    parsedFromPaste: entries.length,
    excludedNonForProfit,
    excludedClinicalServices,
    excludedNoFundingStatus,
    includedCount: included.length,
    verifiedDatasetOverlap: included.filter((c) => c.inVerifiedDataset).length,
    companies: included,
    methodology:
      "Crunchbase Pro text search paste parsed with ingest-crunchbase-text format. Included only for-profit product companies with Crunchbase fundingStatus, fundraisingStatus, totalFunding, or lastFundingType (CSV or verified registry). Clinical service providers, hospitals, and nonprofits excluded.",
    sources: [
      "Crunchbase Pro endometriosis search export (409 results)",
      "src/data/dataset.verified.json overlap check",
    ],
  };

  writeFileSync(OUT_FILE, JSON.stringify(manifest, null, 2));

  console.log(`✅ Endometriosis coverage manifest written to ${OUT_FILE}`);
  console.log(`   Parsed: ${entries.length} | Included: ${included.length}`);
  console.log(
    `   Excluded — nonprofit: ${excludedNonForProfit}, clinical services: ${excludedClinicalServices}, no funding status: ${excludedNoFundingStatus}`,
  );
  console.log(
    `   Verified dataset overlap: ${manifest.verifiedDatasetOverlap}`,
  );
}

main();
