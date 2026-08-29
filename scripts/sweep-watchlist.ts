/**
 * Sweep the biopharma weekly catalyst watchlist CSV.
 *
 * Usage:
 *   npx tsx scripts/sweep-watchlist.ts
 *   npx tsx scripts/sweep-watchlist.ts --check
 *   npx tsx scripts/sweep-watchlist.ts --fix
 *   npx tsx scripts/sweep-watchlist.ts --file path.csv
 *   npx tsx scripts/sweep-watchlist.ts --json [path]
 */
import process from "node:process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_CSV_PATH = join(
  __dirname,
  "../intel/biopharma-weekly/catalysts.csv",
);

export const EVENT_TYPES = [
  "PDUFA",
  "AdComm",
  "CHMP",
  "readout",
  "guidance",
  "approval",
  "CRL",
] as const;

export const STATUSES = [
  "upcoming",
  "approved",
  "CRL",
  "positive",
  "negative",
  "delayed",
  "withdrawn",
] as const;

export const HEADER = [
  "date_added",
  "catalyst_date",
  "event_type",
  "company",
  "ticker",
  "drug",
  "drug_class",
  "indication",
  "status",
  "source_url",
  "notes",
] as const;

export type WatchlistRow = Record<(typeof HEADER)[number], string>;

/** RFC 4180 CSV parser (quotes, escaped quotes, CRLF). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          inQuotes = false;
          i += 1;
        }
      } else {
        field += ch;
        i += 1;
      }
    } else if (ch === '"') {
      inQuotes = true;
      i += 1;
    } else if (ch === ",") {
      row.push(field);
      field = "";
      i += 1;
    } else if (ch === "\r" && text[i + 1] === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i += 2;
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i += 1;
    } else {
      field += ch;
      i += 1;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function serializeField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

export function serializeCsv(
  rows: string[][],
  newline: "\n" | "\r\n" = "\n",
): string {
  return rows.map((r) => r.map(serializeField).join(",")).join(newline) +
    newline;
}

/** Prefer CRLF when it is at least as common as bare LF. */
export function detectNewline(text: string): "\n" | "\r\n" {
  let crlf = 0;
  let lf = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== "\n") continue;
    if (i > 0 && text[i - 1] === "\r") crlf += 1;
    else lf += 1;
  }
  return crlf >= lf && crlf > 0 ? "\r\n" : "\n";
}

export function toRows(cells: string[][]): WatchlistRow[] {
  const [header, ...body] = cells;
  if (!header || header.join(",") !== HEADER.join(",")) {
    throw new Error(
      `Unexpected header. Expected: ${HEADER.join(",")}\nGot: ${
        (header ?? []).join(",")
      }`,
    );
  }
  return body
    .filter((r) => r.length > 1 || (r.length === 1 && r[0].trim() !== ""))
    .map((r, idx) => {
      if (r.length !== HEADER.length) {
        throw new Error(
          `Row ${idx + 2}: expected ${HEADER.length} fields, got ${r.length}`,
        );
      }
      return Object.fromEntries(
        HEADER.map((h, col) => [h, r[col]]),
      ) as WatchlistRow;
    });
}

export function fromRows(rows: WatchlistRow[]): string[][] {
  return [[...HEADER], ...rows.map((r) => HEADER.map((h) => r[h]))];
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) &&
    d.toISOString().slice(0, 10) === value;
}

export function eventKey(row: WatchlistRow): string {
  return [row.company, row.drug, row.event_type]
    .map((v) => v.trim().toLowerCase())
    .join("||");
}

export function dupeKey(row: WatchlistRow): string {
  return `${eventKey(row)}||${row.catalyst_date.trim()}`;
}

export interface SweepReport {
  stale: { line: number; row: WatchlistRow }[];
  dupes: { key: string; lines: number[] }[];
  schemaErrors: { line: number; message: string }[];
  unsorted: boolean;
  repeatedEvent: { key: string; lines: number[]; dates: string[] }[];
}

export interface SweepJsonReport extends SweepReport {
  ranAt: string;
  rowCount: number;
  exitCode: number;
}

/** Runs all sweeps. `today` is an ISO date (YYYY-MM-DD). */
export function runSweeps(rows: WatchlistRow[], today: string): SweepReport {
  const report: SweepReport = {
    stale: [],
    dupes: [],
    schemaErrors: [],
    unsorted: false,
    repeatedEvent: [],
  };

  const byDupeKey = new Map<string, number[]>();
  const byEventKey = new Map<string, { line: number; date: string }[]>();
  rows.forEach((row, i) => {
    const line = i + 2; // 1-based, after header
    if (row.status === "upcoming" && row.catalyst_date < today) {
      report.stale.push({ line, row });
    }
    const key = dupeKey(row);
    byDupeKey.set(key, [...(byDupeKey.get(key) ?? []), line]);
    const ekey = eventKey(row);
    byEventKey.set(ekey, [
      ...(byEventKey.get(ekey) ?? []),
      { line, date: row.catalyst_date.trim() },
    ]);

    if (!isValidIsoDate(row.date_added)) {
      report.schemaErrors.push({
        line,
        message:
          `date_added "${row.date_added}" is not a valid YYYY-MM-DD date`,
      });
    }
    if (!isValidIsoDate(row.catalyst_date)) {
      report.schemaErrors.push({
        line,
        message:
          `catalyst_date "${row.catalyst_date}" is not a valid YYYY-MM-DD date`,
      });
    }
    if (!(EVENT_TYPES as readonly string[]).includes(row.event_type)) {
      report.schemaErrors.push({
        line,
        message: `event_type "${row.event_type}" not in [${
          EVENT_TYPES.join(", ")
        }]`,
      });
    }
    if (!(STATUSES as readonly string[]).includes(row.status)) {
      report.schemaErrors.push({
        line,
        message: `status "${row.status}" not in [${STATUSES.join(", ")}]`,
      });
    }
    if (!row.source_url.startsWith("https://")) {
      report.schemaErrors.push({
        line,
        message: `source_url "${row.source_url}" must start with https://`,
      });
    }
  });

  for (const [key, lines] of byDupeKey) {
    if (lines.length > 1) report.dupes.push({ key, lines });
  }

  for (const [key, items] of byEventKey) {
    const dates = [...new Set(items.map((item) => item.date))];
    if (dates.length > 1) {
      report.repeatedEvent.push({
        key,
        lines: items.map((item) => item.line),
        dates,
      });
    }
  }

  for (let i = 1; i < rows.length; i++) {
    if (rows[i].catalyst_date < rows[i - 1].catalyst_date) {
      report.unsorted = true;
      break;
    }
  }

  return report;
}

/**
 * Applies fixes: drops duplicate rows (keeping the one with the latest
 * date_added; ties keep the last occurrence) and stable-sorts by
 * catalyst_date ascending. Stale and schema issues are reported, not fixed.
 */
export function applyFixes(rows: WatchlistRow[]): WatchlistRow[] {
  const best = new Map<string, { index: number; row: WatchlistRow }>();
  rows.forEach((row, index) => {
    const key = dupeKey(row);
    const current = best.get(key);
    if (!current || row.date_added >= current.row.date_added) {
      best.set(key, { index, row });
    }
  });
  const kept = [...best.values()]
    .sort((a, b) => a.index - b.index)
    .map((entry) => entry.row);
  return kept
    .map((row, index) => ({ row, index }))
    .sort((a, b) =>
      a.row.catalyst_date < b.row.catalyst_date
        ? -1
        : a.row.catalyst_date > b.row.catalyst_date
        ? 1
        : a.index - b.index
    )
    .map((entry) => entry.row);
}

function printReport(report: SweepReport, rowCount: number): void {
  console.log("Lacuna catalyst watchlist sweep");
  console.log(`Rows: ${rowCount}`);
  console.log("");
  console.log(`--- Stale (upcoming, catalyst_date in the past) ---`);
  if (report.stale.length === 0) console.log("  none");
  for (const s of report.stale) {
    console.log(
      `  line ${s.line}: ${s.row.company} — ${s.row.drug} (${s.row.event_type} ${s.row.catalyst_date})`,
    );
  }
  console.log("--- Duplicates (company + drug + event_type) ---");
  if (report.dupes.length === 0) console.log("  none");
  for (const d of report.dupes) {
    console.log(`  ${d.key} on lines ${d.lines.join(", ")}`);
  }
  console.log(
    "--- Repeated events (same company + drug + event_type, different dates) ---",
  );
  if (report.repeatedEvent.length === 0) console.log("  none");
  for (const r of report.repeatedEvent) {
    console.log(
      `  ${r.key} appears ${r.lines.length} times on lines ${
        r.lines.join(", ")
      } with dates ${
        r.dates.join(", ")
      } -- verify these are distinct catalysts (resubmission, second indication) and not a data-entry error`,
    );
  }
  console.log("--- Schema violations ---");
  if (report.schemaErrors.length === 0) console.log("  none");
  for (const e of report.schemaErrors) {
    console.log(`  line ${e.line}: ${e.message}`);
  }
  console.log(
    `--- Sort order --- ${
      report.unsorted ? "NOT sorted by catalyst_date" : "sorted"
    }`,
  );
}

const DEFAULT_JSON_PATH = join(
  __dirname,
  "../intel/biopharma-weekly/sweep-report.json",
);

function jsonOutputPath(argv: string[]): string | undefined {
  const jsonFlag = argv.indexOf("--json");
  if (jsonFlag < 0) return undefined;
  const next = argv[jsonFlag + 1];
  if (!next || next.startsWith("--")) return DEFAULT_JSON_PATH;
  return next;
}

export function main(argv: string[]): number {
  const check = argv.includes("--check");
  const fix = argv.includes("--fix");
  if (check && fix) {
    console.error("Cannot combine --check and --fix");
    return 1;
  }

  const fileFlag = argv.indexOf("--file");
  const csvPath = fileFlag >= 0 ? argv[fileFlag + 1] : DEFAULT_CSV_PATH;
  const jsonPath = jsonOutputPath(argv);

  if (!csvPath || csvPath.startsWith("--")) {
    console.error("Missing path after --file");
    return 1;
  }
  if (!existsSync(csvPath)) {
    console.error(`Watchlist CSV not found: ${csvPath}`);
    return 1;
  }

  const text = readFileSync(csvPath, "utf8");
  const newline = detectNewline(text);
  const rows = toRows(parseCsv(text));
  const today = new Date().toISOString().slice(0, 10);
  const report = runSweeps(rows, today);
  printReport(report, rows.length);

  let exitCode = 0;
  if (fix) {
    const fixed = applyFixes(rows);
    const dropped = rows.length - fixed.length;
    // Sort only when duplicates were removed. A sort-only rewrite would
    // churn the committed watchlist (CRLF + order) on every --fix.
    const toWrite = dropped > 0 ? fixed : rows;
    const output = serializeCsv(fromRows(toWrite), newline);
    if (output !== text) {
      writeFileSync(csvPath, output);
    }
    console.log("");
    console.log(
      `Fixed: ${dropped} duplicate row(s) removed, ` +
        `sorted by catalyst_date (${toWrite.length} rows written).`,
    );
  } else if (check) {
    const failed = report.dupes.length > 0 || report.schemaErrors.length > 0;
    if (failed) {
      console.error("");
      console.error("Sweep check FAILED (duplicates or schema violations).");
      exitCode = 1;
    } else if (report.stale.length > 0 || report.unsorted) {
      console.log("");
      console.log(
        "Warnings only (stale rows and/or unsorted); check passes.",
      );
    }
  }

  if (jsonPath) {
    const payload: SweepJsonReport = {
      ...report,
      ranAt: new Date().toISOString(),
      rowCount: rows.length,
      exitCode,
    };
    writeFileSync(jsonPath, `${JSON.stringify(payload, null, 2)}\n`);
  }

  return exitCode;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  process.exit(main(process.argv.slice(2)));
}
