import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import type {
  CoverageCompanyCategory,
  TherapeuticAreaCoverageCompany,
  TherapeuticAreaCoverageManifest,
} from "../../src/lib/data/therapeuticAreaCoverageTypes";
import type { CoverageAreaConfig, KnownFundingEntry } from "./types";

const ROOT = resolve(__dirname, "..", "..");
const EXPORT_DIR = resolve(ROOT, "data", "crunchbase-exports");
const DATASET_FILE = resolve(ROOT, "src", "data", "dataset.verified.json");

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

function titleCaseFromNorm(norm: string): string {
  return norm.replace(/\b\w/g, (c) => c.toUpperCase());
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

function loadCsvRows(csvPrefix: string): Map<string, CsvFundingRow> {
  const map = new Map<string, CsvFundingRow>();
  mkdirSync(EXPORT_DIR, { recursive: true });

  let files: string[] = [];
  try {
    files = readdirSync(EXPORT_DIR).filter(
      (f) => f.startsWith(csvPrefix) && f.endsWith(".csv"),
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
    const operatingStatusKey = headers.find((h) => /operating status/i.test(h));

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

function lookupKnownFunding(
  norm: string,
  config: CoverageAreaConfig,
): KnownFundingEntry | undefined {
  if (config.knownFunding[norm]) return config.knownFunding[norm];
  const alias = config.knownFundingAliases?.[norm];
  if (alias && config.knownFunding[alias]) return config.knownFunding[alias];
  return undefined;
}

function inferCategory(
  description: string,
  known?: KnownFundingEntry,
): CoverageCompanyCategory {
  if (known?.category) return known.category;
  const d = description.toLowerCase();
  if (/diagnostic|biomarker|screening|test for|liquid biopsy|ivd/i.test(d)) {
    return "diagnostics";
  }
  if (/device|drug-device|brachytherapy|applicator|wearable/i.test(d)) {
    return "medical_device";
  }
  if (/digital|app|telemedicine|virtual|platform for care/i.test(d)) {
    return "digital_health";
  }
  if (/organoid|discovery platform|drug discovery|bioinformatics/i.test(d)) {
    return "platform";
  }
  if (/pharma|pharmaceutical|drug candidate|inhibitor|adc\b/i.test(d)) {
    return "pharma";
  }
  return "therapeutics";
}

function hasFundingFields(
  csv: CsvFundingRow | undefined,
  known: KnownFundingEntry | undefined,
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

function isNonProfit(
  name: string,
  description: string,
  patterns: RegExp[],
  productPatterns: RegExp[],
): boolean {
  const haystack = `${name} ${description}`;
  if (productPatterns.some((p) => p.test(haystack))) return false;
  return patterns.some((p) => p.test(haystack));
}

function isClinicalServiceProvider(
  name: string,
  description: string,
  clinicalPatterns: RegExp[],
  productPatterns: RegExp[],
): boolean {
  const haystack = `${name} ${description}`;
  if (!haystack.trim()) return false;
  const hasProductSignal = productPatterns.some((p) => p.test(haystack));
  if (hasProductSignal) return false;
  return clinicalPatterns.some((p) => p.test(haystack));
}

function buildCompanyRow(
  name: string,
  description: string,
  rank: number | null | undefined,
  known: KnownFundingEntry | undefined,
  csv: CsvFundingRow | undefined,
  verified: { id: string; name: string } | undefined,
  sourceSuffix: string,
): TherapeuticAreaCoverageCompany {
  const category = inferCategory(description, known);
  return {
    id: slugify(name),
    name,
    description: description || known?.description || known?.sources[0] || "—",
    category,
    crunchbaseRank: rank ?? known?.crunchbaseRank ?? undefined,
    fundingStatus: csv?.fundingStatus ?? known?.fundingStatus,
    fundraisingStatus: csv?.fundraisingStatus ?? known?.fundraisingStatus,
    totalFundingM: csv?.totalFundingM ?? known?.totalFundingM,
    lastFundingType: csv?.lastFundingType ?? known?.lastFundingType,
    operatingStatus: csv?.operatingStatus ?? known?.operatingStatus,
    inVerifiedDataset: Boolean(verified),
    verifiedDatasetId: verified?.id,
    sources: [
      ...(known?.sources ?? []),
      sourceSuffix,
    ],
  };
}

export function buildCoverageManifest(config: CoverageAreaConfig): void {
  mkdirSync(EXPORT_DIR, { recursive: true });

  const pasteFile = resolve(EXPORT_DIR, config.pasteFileName);
  let pasteText = "";
  try {
    pasteText = readFileSync(pasteFile, "utf-8");
  } catch {
    if (!config.pasteOptional) {
      console.error(`❌ Missing paste file: ${pasteFile}`);
      process.exit(1);
    }
  }

  const entries = parseCrunchbaseText(pasteText);
  const csvByName = loadCsvRows(config.csvPrefix);
  const dataset = JSON.parse(readFileSync(DATASET_FILE, "utf-8"));
  const verifiedByNorm = new Map<string, { id: string; name: string }>();
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

    if (
      isNonProfit(
        entry.name,
        entry.description,
        config.nonprofitPatterns,
        config.productSignalPatterns,
      )
    ) {
      excludedNonForProfit++;
      continue;
    }

    if (
      isClinicalServiceProvider(
        entry.name,
        entry.description,
        config.clinicalServicePatterns,
        config.productSignalPatterns,
      )
    ) {
      excludedClinicalServices++;
      continue;
    }

    const csv = csvByName.get(norm);
    const known = lookupKnownFunding(norm, config);

    if (!hasFundingFields(csv, known)) {
      excludedNoFundingStatus++;
      continue;
    }

    const verified = verifiedByNorm.get(norm);
    included.push(
      buildCompanyRow(
        entry.name,
        entry.description,
        entry.rank,
        known,
        csv,
        verified,
        `Crunchbase Pro search paste (rank ${entry.rank ?? "—"})`,
      ),
    );
  }

  if (config.seedKnownRegistry) {
    for (const [norm, known] of Object.entries(config.knownFunding)) {
      if (seen.has(norm)) continue;

      const displayName = known.displayName ?? titleCaseFromNorm(norm);
      const description = known.description ?? "";

      if (
        isNonProfit(
          displayName,
          description,
          config.nonprofitPatterns,
          config.productSignalPatterns,
        )
      ) {
        excludedNonForProfit++;
        continue;
      }

      if (
        isClinicalServiceProvider(
          displayName,
          description,
          config.clinicalServicePatterns,
          config.productSignalPatterns,
        )
      ) {
        excludedClinicalServices++;
        continue;
      }

      if (!hasFundingFields(undefined, known)) {
        excludedNoFundingStatus++;
        continue;
      }

      seen.add(norm);
      const verified = verifiedByNorm.get(norm);
      included.push(
        buildCompanyRow(
          displayName,
          description,
          known.crunchbaseRank ?? null,
          known,
          undefined,
          verified,
          "Verified funding registry (no Crunchbase paste row)",
        ),
      );
    }
  }

  included.sort((a, b) => {
    const rankA = a.crunchbaseRank ?? Number.MAX_SAFE_INTEGER;
    const rankB = b.crunchbaseRank ?? Number.MAX_SAFE_INTEGER;
    return rankA - rankB;
  });

  const outFile = resolve(ROOT, "src", "data", config.outFileName);
  const manifest: TherapeuticAreaCoverageManifest = {
    therapeuticArea: config.therapeuticArea,
    therapeuticAreaId: config.therapeuticAreaId,
    generatedAt: new Date().toISOString().split("T")[0],
    crunchbaseSearchTotal: config.crunchbaseSearchTotal,
    parsedFromPaste: entries.length,
    excludedNonForProfit,
    excludedClinicalServices,
    excludedNoFundingStatus,
    includedCount: included.length,
    verifiedDatasetOverlap: included.filter((c) => c.inVerifiedDataset).length,
    companies: included,
    methodology: config.methodology,
    sources: config.sources,
  };

  writeFileSync(outFile, JSON.stringify(manifest, null, 2));

  console.log(
    `✅ ${config.therapeuticArea} coverage manifest written to ${outFile}`,
  );
  console.log(`   Parsed: ${entries.length} | Included: ${included.length}`);
  console.log(
    `   Excluded — nonprofit: ${excludedNonForProfit}, clinical services: ${excludedClinicalServices}, no funding status: ${excludedNoFundingStatus}`,
  );
  console.log(
    `   Verified dataset overlap: ${manifest.verifiedDatasetOverlap}`,
  );
}
