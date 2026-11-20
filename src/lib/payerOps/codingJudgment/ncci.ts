/**
 * Parsers and deterministic rule checks for CMS Medicare NCCI practitioner
 * files (PTP edits and MUE table).
 *
 * Semantics follow the CMS NCCI FAQ library and NCCI technical guidance:
 * - An edit applies when the date of service is on or after the effective date
 *   and on or before the deletion date (the deletion date is the last active
 *   date). An edit whose effective date equals its deletion date was deleted
 *   retroactively and never applies (modifier indicator 9).
 * - Column 2 is denied when both codes are billed by the same provider for the
 *   same beneficiary on the same date, unless the indicator is 1 and an NCCI
 *   PTP-associated modifier is reported.
 * - MUE adjudication indicator 1 is a claim-line edit; 2 and 3 are
 *   date-of-service edits (2 = policy, 3 = clinical).
 *
 * These functions are the oracle the frozen eval is checked against. They are
 * pure and never read the network.
 */
import type {
  CodeCoverage,
  MueEdit,
  PtpEdit,
  PtpPairAbsence,
} from "@/lib/payerOps/codingJudgment/schemas";

/** NCCI PTP-associated modifiers (Medicare NCCI Policy Manual, chapter I). */
export const NCCI_PTP_ASSOCIATED_MODIFIERS: ReadonlySet<string> = new Set([
  "24",
  "25",
  "27",
  "57",
  "58",
  "78",
  "79",
  "91",
  "59",
  "XE",
  "XS",
  "XP",
  "XU",
  "E1",
  "E2",
  "E3",
  "E4",
  "FA",
  "F1",
  "F2",
  "F3",
  "F4",
  "F5",
  "F6",
  "F7",
  "F8",
  "F9",
  "LC",
  "LD",
  "LM",
  "RC",
  "RI",
  "LT",
  "RT",
  "TA",
  "T1",
  "T2",
  "T3",
  "T4",
  "T5",
  "T6",
  "T7",
  "T8",
  "T9",
]);

const CODE_RE = /^[0-9A-Z]{5}$/;

/**
 * Stable id for a PTP row within a pinned version. The effective date is part
 * of the key because one pair can have several rows (e.g. a deleted 2014 edit
 * and its 2020 replacement).
 */
export function ptpEditId(
  version: string,
  column1: string,
  column2: string,
  effectiveDate: string,
): string {
  return `ptp:${version}:${column1}:${column2}:${effectiveDate}`;
}

/** Stable id for an MUE row within a pinned quarter. */
export function mueEditId(quarter: string, code: string): string {
  return `mue:${quarter}:${code}`;
}

/** Stable id for a code-coverage record within a pinned quarter. */
export function coverageId(quarter: string, code: string): string {
  return `coverage:${quarter}:${code}`;
}

/** Stable id for "no PTP row for this pair in either order". */
export function ptpAbsenceId(version: string, a: string, b: string): string {
  const [x, y] = [a, b].sort();
  return `ptp-absent:${version}:${x}:${y}`;
}

/**
 * Parse one CMS practitioner PTP text file (tab-delimited, CRLF, with a
 * multi-line header block). Header lines are skipped by shape, not by count,
 * so a changed preamble cannot shift data rows.
 */
export function parsePtpText(text: string, version: string): PtpEdit[] {
  const rows: PtpEdit[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    if (!rawLine.trim()) continue;
    const cells = rawLine.split("\t");
    if (cells.length < 6) continue;
    const [c1, c2, prior, eff, del, mod, rationale = ""] = cells.map((cell) =>
      cell.trim()
    );
    if (!CODE_RE.test(c1) || !CODE_RE.test(c2) || !/^\d{8}$/.test(eff)) {
      continue;
    }
    if (del !== "*" && !/^\d{8}$/.test(del)) {
      throw new Error(`PTP row ${c1}/${c2}: unexpected deletion date "${del}"`);
    }
    if (mod !== "0" && mod !== "1" && mod !== "9") {
      throw new Error(`PTP row ${c1}/${c2}: unexpected modifier "${mod}"`);
    }
    if (prior !== "" && prior !== "*") {
      throw new Error(`PTP row ${c1}/${c2}: unexpected prior-1996 "${prior}"`);
    }
    rows.push({
      id: ptpEditId(version, c1, c2, eff),
      column1: c1,
      column2: c2,
      priorTo1996: prior === "*",
      effectiveDate: eff,
      deletionDate: del === "*" ? null : del,
      modifierIndicator: mod,
      rationale,
    });
  }
  return rows;
}

/** Split one CSV line with RFC 4180 quoting (no embedded newlines). */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      out.push(cell);
      cell = "";
    } else cell += ch;
  }
  out.push(cell);
  return out;
}

/**
 * Parse the CMS practitioner MUE CSV. The file opens with a quoted multi-line
 * AMA notice and a two-line quoted header; rows are recognised by shape.
 */
export function parseMueCsv(text: string, quarter: string): MueEdit[] {
  const rows: MueEdit[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const cells = splitCsvLine(rawLine.trim());
    if (cells.length < 4) continue;
    const [code, value, adj, rationale] = cells.map((cell) => cell.trim());
    if (!CODE_RE.test(code) || !/^\d+$/.test(value)) continue;
    const match = adj.match(/^([123])\s+(.+)$/);
    if (!match) {
      throw new Error(`MUE row ${code}: unexpected indicator "${adj}"`);
    }
    rows.push({
      id: mueEditId(quarter, code),
      code,
      mueValue: Number(value),
      adjudicationIndicator: match[1] as MueEdit["adjudicationIndicator"],
      adjudicationLabel: match[2],
      rationale,
    });
  }
  return rows;
}

function compact(date: string): string {
  return date.replaceAll("-", "");
}

/** True when the edit applies on the ISO date of service. */
export function isPtpEditActiveOn(
  edit: PtpEdit,
  dateOfService: string,
): boolean {
  const dos = compact(dateOfService);
  if (edit.deletionDate !== null && edit.deletionDate === edit.effectiveDate) {
    return false;
  }
  if (dos < edit.effectiveDate) return false;
  return edit.deletionDate === null || dos <= edit.deletionDate;
}

export type PtpOutcome =
  | { kind: "no_edit"; edits: [] }
  | { kind: "inactive"; edits: PtpEdit[] }
  | { kind: "denied_column2"; edits: PtpEdit[]; active: PtpEdit }
  | { kind: "bypassed_by_modifier"; edits: PtpEdit[]; active: PtpEdit };

/**
 * Apply the PTP rule to a same-day, same-provider pair. `modifiers` are those
 * reported on the column-2 code. Rows are searched in both orders.
 */
export function evaluatePtpPair(
  edits: readonly PtpEdit[],
  codeA: string,
  codeB: string,
  dateOfService: string,
  modifiers: readonly string[],
): PtpOutcome {
  const matching = edits.filter((edit) =>
    (edit.column1 === codeA && edit.column2 === codeB) ||
    (edit.column1 === codeB && edit.column2 === codeA)
  );
  if (matching.length === 0) return { kind: "no_edit", edits: [] };
  const active = matching.find((edit) =>
    isPtpEditActiveOn(edit, dateOfService)
  );
  if (!active) return { kind: "inactive", edits: matching };
  const hasModifier = modifiers.some((m) =>
    NCCI_PTP_ASSOCIATED_MODIFIERS.has(m.toUpperCase())
  );
  if (active.modifierIndicator === "1" && hasModifier) {
    return { kind: "bypassed_by_modifier", edits: matching, active };
  }
  return { kind: "denied_column2", edits: matching, active };
}

export type MueOutcome =
  | { kind: "no_mue_row" }
  | { kind: "within_limit"; edit: MueEdit }
  | { kind: "exceeds_limit"; edit: MueEdit };

/** Compare units of service on one date (or line, for MAI 1) to the MUE. */
export function evaluateMueUnits(
  edits: readonly MueEdit[],
  code: string,
  units: number,
): MueOutcome {
  const edit = edits.find((row) => row.code === code);
  if (!edit) return { kind: "no_mue_row" };
  return units > edit.mueValue
    ? { kind: "exceeds_limit", edit }
    : { kind: "within_limit", edit };
}

/** Build presence records from the full files before subsetting. */
export function buildCoverage(
  quarter: string,
  codes: readonly string[],
  ptpCodes: ReadonlySet<string>,
  mueCodes: ReadonlySet<string>,
): CodeCoverage[] {
  return [...new Set(codes)].sort().map((code) => ({
    id: coverageId(quarter, code),
    code,
    inPtpFile: ptpCodes.has(code),
    inMueFile: mueCodes.has(code),
  }));
}

/** Absence record for a pair with no PTP row in either order. */
export function buildPtpAbsence(
  version: string,
  a: string,
  b: string,
): PtpPairAbsence {
  const [codeA, codeB] = [a, b].sort();
  return { id: ptpAbsenceId(version, a, b), codeA, codeB };
}
