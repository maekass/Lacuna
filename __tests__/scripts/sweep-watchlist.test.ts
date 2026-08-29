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
} from "../../scripts/sweep-watchlist";

const ROOT = path.resolve(__dirname, "../..");
const REAL_CSV = path.join(ROOT, "intel/biopharma-weekly/catalysts.csv");

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

const TODAY = "2026-08-29";

function makeRow(overrides: Partial<WatchlistRow>): WatchlistRow {
  const base: WatchlistRow = {
    date_added: "2026-08-21",
    catalyst_date: "2026-09-30",
    event_type: "PDUFA",
    company: "Novo Nordisk",
    ticker: "NVO",
    drug: "Mim8 (denecimig)",
    drug_class: "FVIII-mimetic bispecific antibody",
    indication: "hemophilia A",
    status: "upcoming",
    source_url: "https://www.pdufa.bio/calendar",
    notes: "",
  };
  return { ...base, ...overrides };
}

function csvOf(rows: WatchlistRow[]): string {
  return serializeCsv(fromRows(rows));
}

describe("sweep-watchlist", () => {
  it("flags upcoming rows whose catalyst_date is in the past (stale sweep)", () => {
    const rows = [
      makeRow({ catalyst_date: "2026-08-15", status: "upcoming" }),
      makeRow({
        catalyst_date: "2026-08-15",
        status: "approved",
        drug: "resolved drug",
      }),
      makeRow({ catalyst_date: "2026-09-30", status: "upcoming" }),
    ];
    const report = runSweeps(rows, TODAY);
    expect(report.stale).toHaveLength(1);
    expect(report.stale[0].line).toBe(2);
    expect(report.stale[0].row.catalyst_date).toBe("2026-08-15");
  });

  it("detects duplicates on (company, drug, event_type), case-insensitively", () => {
    const rows = [
      makeRow({}),
      makeRow({ company: " novo nordisk ", drug: "MIM8 (DENECIMIG)" }),
      makeRow({ drug: "a different drug" }),
    ];
    const report = runSweeps(rows, TODAY);
    expect(report.dupes).toHaveLength(1);
    expect(report.dupes[0].lines).toEqual([2, 3]);
  });

  it("reports schema violations for dates, enums, and source_url", () => {
    const rows = [
      makeRow({ date_added: "08/21/2026" }),
      makeRow({ catalyst_date: "2026-02-30", drug: "b" }),
      makeRow({ event_type: "launch", drug: "c" }),
      makeRow({ status: "pending", drug: "d" }),
      makeRow({ source_url: "http://insecure.example.com", drug: "e" }),
    ];
    const report = runSweeps(rows, TODAY);
    const messages = report.schemaErrors.map((e) => e.message).join("\n");
    expect(report.schemaErrors).toHaveLength(5);
    expect(messages).toContain('date_added "08/21/2026"');
    expect(messages).toContain('catalyst_date "2026-02-30"');
    expect(messages).toContain('event_type "launch"');
    expect(messages).toContain('status "pending"');
    expect(messages).toContain("must start with https://");
  });

  it("flags unsorted files and applyFixes stable-sorts by catalyst_date", () => {
    const rows = [
      makeRow({ catalyst_date: "2026-10-10", drug: "later" }),
      makeRow({ catalyst_date: "2026-09-01", drug: "earlier" }),
      makeRow({ catalyst_date: "2026-09-01", drug: "earlier-second" }),
    ];
    expect(runSweeps(rows, TODAY).unsorted).toBe(true);
    const fixed = applyFixes(rows);
    expect(fixed.map((r) => r.drug)).toEqual([
      "earlier",
      "earlier-second",
      "later",
    ]);
    expect(runSweeps(fixed, TODAY).unsorted).toBe(false);
  });

  it("applyFixes drops duplicates, keeping the latest date_added", () => {
    const rows = [
      makeRow({ date_added: "2026-08-14", notes: "old row" }),
      makeRow({ date_added: "2026-08-28", notes: "new row" }),
      makeRow({ drug: "other drug" }),
    ];
    const fixed = applyFixes(rows);
    expect(fixed).toHaveLength(2);
    const kept = fixed.find((r) => r.drug.startsWith("Mim8"));
    expect(kept?.notes).toBe("new row");
  });

  it("round-trips quoted fields (commas, quotes, apostrophes) losslessly", () => {
    const tricky = makeRow({
      notes:
        'Label expansion on SURPASS-CVOT (>13,000 patients, ~4-year follow-up); FDA\'s "major amendment"',
      indication: "MACE risk reduction, type 2 diabetes",
    });
    const text = csvOf([tricky]);
    const parsed = toRows(parseCsv(text));
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toEqual(tricky);
    // Idempotent: serialize(parse(x)) === x
    expect(csvOf(parsed)).toBe(text);
  });

  it("applyFixes is idempotent", () => {
    const rows = [
      makeRow({ catalyst_date: "2026-10-10", drug: "z" }),
      makeRow({ date_added: "2026-08-14" }),
      makeRow({ date_added: "2026-08-28" }),
    ];
    const once = applyFixes(rows);
    const twice = applyFixes(once);
    expect(twice).toEqual(once);
  });

  it("rejects files with a wrong header or ragged rows", () => {
    expect(() => toRows(parseCsv("a,b,c\n1,2,3\n"))).toThrow(
      /Unexpected header/,
    );
    const ragged = HEADER.join(",") + "\n1,2,3\n";
    expect(() => toRows(parseCsv(ragged))).toThrow(/expected 11 fields/);
  });

  it("parses RFC 4180 CRLF rows with escaped quotes", () => {
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
});

function writeWatchlist(rows: WatchlistRow[]): string {
  const dir = mkdtempSync(path.join(tmpdir(), "intel-sweep-"));
  tempDirs.push(dir);
  const file = path.join(dir, "catalysts.csv");
  writeFileSync(file, csvOf(rows));
  return file;
}

describe("main CLI", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("fails --check on duplicates or schema violations", () => {
    const dupes = writeWatchlist([
      makeRow({}),
      makeRow({ date_added: "2026-08-28", notes: "copy" }),
    ]);
    expect(main(["--check", "--file", dupes])).toBe(1);

    const schema = writeWatchlist([makeRow({ event_type: "unknown" })]);
    expect(main(["--check", "--file", schema])).toBe(1);
  });

  it("passes --check when only stale or unsorted warnings remain", () => {
    const file = writeWatchlist([
      makeRow({ catalyst_date: "2026-09-02", drug: "later" }),
      makeRow({
        drug: "earlier",
        catalyst_date: "2026-01-01",
        status: "upcoming",
      }),
    ]);
    expect(main(["--check", "--file", file])).toBe(0);
  });

  it("removes duplicates and sorts on --fix", () => {
    const file = writeWatchlist([
      makeRow({ catalyst_date: "2026-10-01", notes: "later" }),
      makeRow({
        drug: "other drug",
        catalyst_date: "2026-09-01",
        notes: "earlier",
      }),
      makeRow({ date_added: "2026-08-28", notes: "dupe-keep" }),
    ]);
    expect(main(["--fix", "--file", file])).toBe(0);
    const fixed = toRows(parseCsv(readFileSync(file, "utf8")));
    expect(fixed.map((r) => r.notes)).toEqual(["earlier", "dupe-keep"]);
  });

  it("accepts the checked-in catalysts.csv under --check", () => {
    const stdout = execFileSync(
      process.execPath,
      [
        "node_modules/tsx/dist/cli.mjs",
        "scripts/sweep-watchlist.ts",
        "--check",
        "--file",
        REAL_CSV,
      ],
      { cwd: ROOT, encoding: "utf8" },
    );
    expect(stdout).toMatch(/Lacuna catalyst watchlist sweep/);
    expect(stdout).not.toMatch(/Sweep check FAILED/);
  });
});
