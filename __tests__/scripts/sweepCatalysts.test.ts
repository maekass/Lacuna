import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyFixes,
  fromRows,
  HEADER,
  main,
  parseCsv,
  runSweeps,
  serializeCsv,
  toRows,
  type WatchlistRow,
} from "../../scripts/sweep-catalysts";

const ROOT = path.resolve(__dirname, "../..");
const REAL_CSV = path.join(ROOT, "intel/biopharma-weekly/catalysts.csv");

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

function row(overrides: Partial<WatchlistRow> = {}): WatchlistRow {
  return {
    date_added: "2026-08-21",
    catalyst_date: "2026-09-01",
    event_type: "PDUFA",
    company: "Acme",
    ticker: "ACME",
    drug: "drug-x",
    drug_class: "mAb",
    indication: "indication",
    status: "upcoming",
    source_url: "https://example.com/source",
    notes: "",
    ...overrides,
  };
}

function writeWatchlist(rows: WatchlistRow[]): string {
  const dir = mkdtempSync(path.join(tmpdir(), "catalyst-sweep-"));
  tempDirs.push(dir);
  const file = path.join(dir, "catalysts.csv");
  writeFileSync(file, serializeCsv(fromRows(rows)));
  return file;
}

function runCli(args: string[]): {
  status: number;
  stdout: string;
  stderr: string;
} {
  try {
    const stdout = execFileSync(
      process.execPath,
      ["node_modules/tsx/dist/cli.mjs", "scripts/sweep-catalysts.ts", ...args],
      { cwd: ROOT, encoding: "utf8" },
    );
    return { status: 0, stdout, stderr: "" };
  } catch (error) {
    const err = error as {
      status?: number | null;
      stdout?: string;
      stderr?: string;
    };
    return {
      status: err.status ?? 1,
      stdout: err.stdout ?? "",
      stderr: err.stderr ?? "",
    };
  }
}

describe("parseCsv / serializeCsv", () => {
  it("parses quoted commas, escaped quotes, and CRLF", () => {
    const text = [
      "a,b,c",
      '"hello, world","she said ""hi""",plain',
      "1,2,3",
    ].join("\r\n") + "\r\n";
    expect(parseCsv(text)).toEqual([
      ["a", "b", "c"],
      ["hello, world", 'she said "hi"', "plain"],
      ["1", "2", "3"],
    ]);
  });

  it("round-trips fields that need quoting", () => {
    const rows = [
      ["notes", "value"],
      ["line\nbreak", 'quote "inside", and comma'],
    ];
    const parsed = parseCsv(serializeCsv(rows));
    expect(parsed).toEqual(rows);
  });
});

describe("toRows", () => {
  it("rejects an unexpected header", () => {
    expect(() => toRows([["wrong"], ["x"]])).toThrow(/Unexpected header/);
  });

  it("rejects a short body row", () => {
    expect(() => toRows([[...HEADER], ["only-one"]])).toThrow(
      /Row 2: expected 11 fields, got 1/,
    );
  });

  it("drops a trailing empty line", () => {
    const rows = toRows([[...HEADER], Object.values(row()), [""]]);
    expect(rows).toHaveLength(1);
    expect(rows[0].company).toBe("Acme");
  });
});

describe("runSweeps", () => {
  it("flags stale upcoming rows but not same-day or resolved rows", () => {
    const report = runSweeps([
      row({ catalyst_date: "2026-08-20", status: "upcoming" }),
      row({
        catalyst_date: "2026-08-21",
        status: "upcoming",
        company: "Today",
      }),
      row({
        catalyst_date: "2026-08-01",
        status: "approved",
        company: "Done",
      }),
    ], "2026-08-21");
    expect(report.stale.map((s) => s.row.company)).toEqual(["Acme"]);
    expect(report.stale[0].line).toBe(2);
  });

  it("groups duplicates by company + drug + event_type, case-insensitive", () => {
    const report = runSweeps([
      row({ company: "Acme", drug: "Drug-X", event_type: "PDUFA" }),
      row({ company: "ACME", drug: "drug-x", event_type: "PDUFA" }),
      row({ company: "Acme", drug: "drug-x", event_type: "AdComm" }),
    ], "2026-08-21");
    expect(report.dupes).toEqual([
      { key: "acme||drug-x||pdufa", lines: [2, 3] },
    ]);
  });

  it("records schema violations for dates, enums, and source_url", () => {
    const report = runSweeps([
      row({
        date_added: "08/21/2026",
        catalyst_date: "2026-02-30",
        event_type: "PDUFA date",
        status: "pending",
        source_url: "http://example.com/insecure",
      }),
    ], "2026-08-21");
    expect(report.schemaErrors.map((e) => e.message)).toEqual([
      'date_added "08/21/2026" is not a valid YYYY-MM-DD date',
      'catalyst_date "2026-02-30" is not a valid YYYY-MM-DD date',
      'event_type "PDUFA date" not in [PDUFA, AdComm, CHMP, readout, guidance, approval, CRL]',
      'status "pending" not in [upcoming, approved, CRL, positive, negative, delayed, withdrawn]',
      'source_url "http://example.com/insecure" must start with https://',
    ]);
  });

  it("detects descending catalyst_date order", () => {
    const unsorted = runSweeps([
      row({ catalyst_date: "2026-09-02" }),
      row({ catalyst_date: "2026-09-01", company: "Beta" }),
    ], "2026-08-21");
    expect(unsorted.unsorted).toBe(true);

    const sorted = runSweeps([
      row({ catalyst_date: "2026-09-01" }),
      row({ catalyst_date: "2026-09-01", company: "Beta" }),
      row({ catalyst_date: "2026-09-02", company: "Gamma" }),
    ], "2026-08-21");
    expect(sorted.unsorted).toBe(false);
  });
});

describe("applyFixes", () => {
  it("keeps the latest date_added and last occurrence on ties, then stable-sorts", () => {
    const kept = applyFixes([
      row({
        company: "Acme",
        drug: "drug-x",
        event_type: "PDUFA",
        date_added: "2026-08-21",
        catalyst_date: "2026-10-01",
        notes: "old",
      }),
      row({
        company: "Beta",
        drug: "other",
        event_type: "readout",
        catalyst_date: "2026-09-15",
        notes: "beta-first",
      }),
      row({
        company: "Acme",
        drug: "drug-x",
        event_type: "PDUFA",
        date_added: "2026-08-28",
        catalyst_date: "2026-10-02",
        notes: "newer",
      }),
      row({
        company: "Gamma",
        drug: "same-day",
        event_type: "CHMP",
        catalyst_date: "2026-09-15",
        notes: "gamma",
      }),
      row({
        company: "Acme",
        drug: "drug-x",
        event_type: "PDUFA",
        date_added: "2026-08-28",
        catalyst_date: "2026-10-03",
        notes: "tie-last",
      }),
    ]);
    expect(kept.map((r) => r.notes)).toEqual([
      "beta-first",
      "gamma",
      "tie-last",
    ]);
  });

  it("does not rewrite stale or schema-invalid fields", () => {
    const stale = row({
      catalyst_date: "2026-01-01",
      status: "upcoming",
      source_url: "ftp://example.com",
    });
    expect(applyFixes([stale])).toEqual([stale]);
  });
});

describe("main CLI", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("fails --check on duplicates or schema violations", () => {
    const dupes = writeWatchlist([
      row(),
      row({ date_added: "2026-08-28", notes: "copy" }),
    ]);
    expect(main(["--check", "--file", dupes])).toBe(1);

    const schema = writeWatchlist([
      row({ event_type: "unknown" }),
    ]);
    expect(main(["--check", "--file", schema])).toBe(1);
  });

  it("passes --check when only stale or unsorted warnings remain", () => {
    const file = writeWatchlist([
      row({ catalyst_date: "2026-09-02" }),
      row({
        company: "Beta",
        drug: "other",
        catalyst_date: "2026-01-01",
        status: "upcoming",
      }),
    ]);
    expect(main(["--check", "--file", file])).toBe(0);
  });

  it("removes duplicates and sorts on --fix", () => {
    const file = writeWatchlist([
      row({ catalyst_date: "2026-10-01", notes: "later" }),
      row({
        company: "Beta",
        drug: "other",
        catalyst_date: "2026-09-01",
        notes: "earlier",
      }),
      row({ date_added: "2026-08-28", notes: "dupe-keep" }),
    ]);
    expect(main(["--fix", "--file", file])).toBe(0);
    const fixed = toRows(parseCsv(readFileSync(file, "utf8")));
    expect(fixed.map((r) => r.notes)).toEqual(["earlier", "dupe-keep"]);
  });

  it("accepts the checked-in catalysts.csv under --check", () => {
    const result = runCli(["--check", "--file", REAL_CSV]);
    expect(result.stderr).not.toMatch(/Sweep check FAILED/);
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/Lacuna catalyst watchlist sweep/);
  });
});
