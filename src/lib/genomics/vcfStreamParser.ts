/** Minimal VCF row parser for streaming ingest (not a full VCF validator). */

export interface ParsedVcfVariant {
  chrom: string;
  pos: number;
  ref: string;
  alt: string;
  qual: number;
  filter: string;
  geneSymbol: string;
  consequence: string;
  isPathogenic: boolean;
}

const PATHOGENIC = /pathogenic/i;

function infoValue(info: string, key: string): string | undefined {
  const match = info.match(new RegExp(`(?:^|;)${key}=([^;]+)`));
  return match?.[1];
}

function firstAlt(altField: string): string {
  return altField.split(",")[0] ?? altField;
}

/**
 * Parse one VCF data line into a variant summary row.
 * Returns null for header or malformed lines.
 */
export function parseVcfDataLine(line: string): ParsedVcfVariant | null {
  if (!line || line.startsWith("#")) return null;

  const cols = line.split("\t");
  if (cols.length < 8) return null;

  const chrom = cols[0];
  const pos = Number(cols[1]);
  const ref = cols[3];
  const alt = firstAlt(cols[4]);
  const qualRaw = cols[5];
  const filter = cols[6] || "PASS";
  const info = cols[7] ?? "";

  if (!chrom || !Number.isFinite(pos) || !ref || !alt) return null;

  const qual = qualRaw === "." ? 0 : Number(qualRaw);
  const geneSymbol = infoValue(info, "GENE") ??
    infoValue(info, "Gene") ??
    infoValue(info, "SYMBOL") ??
    "";
  const consequence = infoValue(info, "CSQ")?.split("|")[1] ??
    infoValue(info, "ANN")?.split("|")[1] ??
    infoValue(info, "Consequence") ??
    "";
  const clnsig = infoValue(info, "CLNSIG") ?? infoValue(info, "CLN_SIG") ?? "";

  return {
    chrom,
    pos,
    ref,
    alt,
    qual: Number.isFinite(qual) ? qual : 0,
    filter,
    geneSymbol,
    consequence,
    isPathogenic: PATHOGENIC.test(clnsig),
  };
}
