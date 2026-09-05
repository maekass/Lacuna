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
  const scheduled = overrides.scheduled_date ?? "2026-09-30";
  const base: WatchlistRow = {
    date_added: "2026-08-21",
    scheduled_date: scheduled,
    event_type: "PDUFA",
    company: "Novo Nordisk",
    ticker: "NVO",
    drug: "Mim8 (denecimig)",
    drug_class: "FVIII-mimetic bispecific antibody",
    indication: "hemophilia A",
    status: "upcoming",
    source_url: "https://www.pdufa.bio/calendar",
    notes: "",
    womens_health_relevant: "false",
    lacuna_sector: "",
    lacuna_acquirer_id: "",
    lacuna_company_id: "",
    date_precision: "day",
    date_basis: "third_party_calendar",
    actual_date: "",
    last_verified: "2026-08-21",
  };
  return { ...base, ...overrides, scheduled_date: scheduled };
}

function csvOf(rows: WatchlistRow[]): string {
  return serializeCsv(fromRows(rows));
}

describe("sweep-watchlist", () => {
  it("flags upcoming rows whose scheduled_date is in the past (stale sweep)", () => {
    const rows = [
      makeRow({ scheduled_date: "2026-08-15", status: "upcoming" }),
      makeRow({
        scheduled_date: "2026-08-15",
        status: "approved",
        drug: "resolved drug",
      }),
      makeRow({ scheduled_date: "2026-09-30", status: "upcoming" }),
    ];
    const report = runSweeps(rows, TODAY);
    expect(report.stale).toHaveLength(1);
    expect(report.stale[0].line).toBe(2);
    expect(report.stale[0].row.scheduled_date).toBe("2026-08-15");
  });

  it("keeps distinct catalyst dates for the same company/drug/event_type", () => {
    const rows = [
      makeRow({
        scheduled_date: "2026-09-01",
        notes: "2026-09-01/first PDUFA",
      }),
      makeRow({
        scheduled_date: "2027-03-15",
        notes: "2027-03-15/resubmission PDUFA",
      }),
    ];
    const report = runSweeps(rows, TODAY);
    expect(report.dupes).toHaveLength(0);
    expect(report.repeatedEvent).toHaveLength(1);
    const fixed = applyFixes(rows);
    expect(fixed).toHaveLength(2);
    expect(fixed.map((r) => r.notes).sort()).toEqual([
      "2026-09-01/first PDUFA",
      "2027-03-15/resubmission PDUFA",
    ]);
  });

  it("detects duplicates on (company, drug, event_type, scheduled_date), case-insensitively", () => {
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
      makeRow({ scheduled_date: "2026-02-30", drug: "b" }),
      makeRow({ event_type: "launch", drug: "c" }),
      makeRow({ status: "pending", drug: "d" }),
      makeRow({ source_url: "http://insecure.example.com", drug: "e" }),
    ];
    const report = runSweeps(rows, TODAY);
    const messages = report.schemaErrors.map((e) => e.message).join("\n");
    expect(report.schemaErrors).toHaveLength(5);
    expect(messages).toContain('date_added "08/21/2026"');
    expect(messages).toContain('scheduled_date "2026-02-30"');
    expect(messages).toContain('event_type "launch"');
    expect(messages).toContain('status "pending"');
    expect(messages).toContain("must start with https://");
  });

  it("flags unsorted files and applyFixes stable-sorts by scheduled_date", () => {
    const rows = [
      makeRow({ scheduled_date: "2026-10-10", drug: "later" }),
      makeRow({ scheduled_date: "2026-09-01", drug: "earlier" }),
      makeRow({ scheduled_date: "2026-09-01", drug: "earlier-second" }),
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
      makeRow({ scheduled_date: "2026-10-10", drug: "z" }),
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
    expect(() => toRows(parseCsv(ragged))).toThrow(/expected 19 fields/);
  });

  it("drops a trailing empty line", () => {
    const rows = toRows([[...HEADER], Object.values(makeRow({})), [""]]);
    expect(rows).toHaveLength(1);
    expect(rows[0].company).toBe("Novo Nordisk");
  });

  it("does not flag same-day upcoming rows as stale", () => {
    const report = runSweeps([
      makeRow({ scheduled_date: "2026-08-29", status: "upcoming" }),
    ], TODAY);
    expect(report.stale).toHaveLength(0);
  });

  it("applyFixes does not rewrite stale or schema-invalid fields", () => {
    const stale = makeRow({
      scheduled_date: "2026-01-01",
      status: "upcoming",
      source_url: "ftp://example.com",
    });
    expect(applyFixes([stale])).toEqual([stale]);
  });

  it("applyFixes keeps the last occurrence on date_added ties", () => {
    const rows = [
      makeRow({ date_added: "2026-08-28", notes: "first" }),
      makeRow({ date_added: "2026-08-28", notes: "tie-last" }),
    ];
    expect(applyFixes(rows).map((r) => r.notes)).toEqual(["tie-last"]);
  });

  it("treats actual_date on an upcoming row as a schema error", () => {
    const report = runSweeps([
      makeRow({ actual_date: "2026-09-01", status: "upcoming" }),
    ], TODAY);
    expect(report.schemaErrors.some((e) => e.message.includes("actual_date")))
      .toBe(true);
  });

  it("warns when last_verified is more than 45 days old", () => {
    const report = runSweeps([
      makeRow({ last_verified: "2026-06-01" }),
    ], TODAY);
    expect(
      report.warnings.some((w) => w.code === "catalyst.verificationStale"),
    ).toBe(true);
  });

  it("warns when a weekly batch adds no women's-health-relevant rows", () => {
    const report = runSweeps([
      makeRow({ date_added: "2026-09-04", womens_health_relevant: "false" }),
    ], TODAY);
    expect(
      report.warnings.some((w) => w.code === "catalyst.noWomensHealthBatch"),
    ).toBe(true);
  });

  it("rejects lacuna ids that do not resolve", () => {
    const report = runSweeps(
      [
        makeRow({ lacuna_acquirer_id: "acquirer-missing" }),
      ],
      TODAY,
      {
        companyIds: new Set(),
        acquirerIds: new Set(["acquirer-roche"]),
        sectors: new Set(["Fertility"]),
      },
    );
    expect(report.schemaErrors.map((e) => e.message).join(" ")).toMatch(
      /acquirer-missing/,
    );
  });

  it("accepts a legacy catalyst_date header as scheduled_date", () => {
    const legacy = [
      "date_added,catalyst_date,event_type,company,ticker,drug,drug_class,indication,status,source_url,notes",
      "2026-08-21,2026-09-30,PDUFA,Novo Nordisk,NVO,Mim8,bispecific,hemophilia A,upcoming,https://www.pdufa.bio/calendar,",
    ].join("\n") + "\n";
    const rows = toRows(parseCsv(legacy));
    expect(rows[0].scheduled_date).toBe("2026-09-30");
    expect(rows[0].womens_health_relevant).toBe("");
  });

  it("rejects an unknown date_precision the same way as event_type", () => {
    const report = runSweeps([
      makeRow({ date_precision: "week" }),
    ], TODAY);
    expect(
      report.schemaErrors.some((e) => e.message.includes("date_precision")),
    )
      .toBe(true);
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
      makeRow({ scheduled_date: "2026-09-02", drug: "later" }),
      makeRow({
        drug: "earlier",
        scheduled_date: "2026-01-01",
        status: "upcoming",
      }),
    ]);
    expect(main(["--check", "--file", file])).toBe(0);
  });

  it("removes duplicates and sorts on --fix", () => {
    const file = writeWatchlist([
      makeRow({ scheduled_date: "2026-10-01", notes: "later" }),
      makeRow({
        drug: "other drug",
        scheduled_date: "2026-09-01",
        notes: "earlier",
      }),
      makeRow({
        date_added: "2026-08-28",
        scheduled_date: "2026-10-01",
        notes: "dupe-keep",
      }),
    ]);
    expect(main(["--fix", "--file", file])).toBe(0);
    const fixed = toRows(parseCsv(readFileSync(file, "utf8")));
    expect(fixed.map((r) => r.notes)).toEqual(["earlier", "dupe-keep"]);
  });

  it("checked-in watchlist uses the 19-column header and only three id links", () => {
    const rows = toRows(parseCsv(readFileSync(REAL_CSV, "utf8")));
    expect(HEADER).toHaveLength(19);
    expect(rows.every((row) => row.womens_health_relevant === "false")).toBe(
      true,
    );
    const linked = rows.filter((row) =>
      row.lacuna_acquirer_id || row.lacuna_company_id
    );
    const ids = new Set(
      linked.flatMap((row) =>
        [row.lacuna_acquirer_id, row.lacuna_company_id].filter(Boolean)
      ),
    );
    expect(ids).toEqual(
      new Set(["acquirer-roche", "acquirer-jnj", "c46"]),
    );
    expect(
      rows.filter((row) =>
        row.event_type === "PDUFA" && row.status === "upcoming"
      ).every((row) => row.date_basis === "third_party_calendar"),
    ).toBe(true);
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

  it("--fix is a byte-level no-op on a clean CRLF file", () => {
    const rows = [
      makeRow({ scheduled_date: "2026-09-01", drug: "alpha" }),
      makeRow({ scheduled_date: "2026-10-01", drug: "beta" }),
    ];
    const dir = mkdtempSync(path.join(tmpdir(), "intel-sweep-"));
    tempDirs.push(dir);
    const file = path.join(dir, "catalysts.csv");
    writeFileSync(file, serializeCsv(fromRows(rows), "\r\n"));
    const before = readFileSync(file);
    expect(main(["--fix", "--file", file])).toBe(0);
    expect(readFileSync(file).equals(before)).toBe(true);
  });

  it("--json output round-trips SweepReport fields", () => {
    const rows = [
      makeRow({ scheduled_date: "2099-01-01" }),
      makeRow({ scheduled_date: "2099-06-01" }),
    ];
    const file = writeWatchlist(rows);
    const jsonPath = path.join(path.dirname(file), "sweep.json");
    expect(main(["--file", file, "--json", jsonPath])).toBe(0);
    const parsed = JSON.parse(readFileSync(jsonPath, "utf8")) as Record<
      string,
      unknown
    >;
    const today = new Date().toISOString().slice(0, 10);
    const report = runSweeps(rows, today);
    const { ranAt, rowCount, exitCode, ...rest } = parsed;
    expect(rest).toEqual(report);
    expect(rowCount).toBe(2);
    expect(exitCode).toBe(0);
    expect(typeof ranAt).toBe("string");
  });

  it("rejects --check combined with --fix", () => {
    expect(main(["--check", "--fix"])).toBe(1);
    expect(vi.mocked(console.error).mock.calls.flat().join("\n")).toMatch(
      /Cannot combine --check and --fix/,
    );
  });

  it("prints the missing --file path without throwing", () => {
    const missing = path.join(tmpdir(), "missing-catalysts-xyz.csv");
    expect(main(["--check", "--file", missing])).toBe(1);
    expect(vi.mocked(console.error).mock.calls.flat().join("\n")).toContain(
      missing,
    );
  });
});
