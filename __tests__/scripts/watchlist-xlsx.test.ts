import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { HEADER, parseCsv } from "../../scripts/sweep-watchlist";

const ROOT = path.resolve(__dirname, "../..");
const CSV = path.join(ROOT, "intel/biopharma-weekly/catalysts.csv");
const XLSX = path.join(ROOT, "intel/biopharma-weekly/catalysts.xlsx");

function unzipText(xlsxPath: string, entry: string): string {
  return execFileSync("unzip", ["-p", xlsxPath, entry], { encoding: "utf8" });
}

function decodeXml(text: string): string {
  return text
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&#8212;", "—")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)))
    .replace(
      /&#x([0-9a-fA-F]+);/g,
      (_, n: string) => String.fromCharCode(Number.parseInt(n, 16)),
    );
}

function colRow(ref: string): [number, number] {
  let col = "";
  let row = "";
  for (const ch of ref) {
    if (ch >= "A" && ch <= "Z") col += ch;
    else row += ch;
  }
  let n = 0;
  for (const ch of col) n = n * 26 + (ch.charCodeAt(0) - 64);
  return [n - 1, Number(row)];
}

/** Reads the Catalysts sheet (inline strings + hyperlink targets). */
function readXlsxRows(xlsxPath: string): string[][] {
  const relsXml = unzipText(xlsxPath, "xl/worksheets/_rels/sheet1.xml.rels");
  const hyperlinks = new Map<string, string>();
  const relRe = /<Relationship([^>]+)\/>/g;
  let relMatch: RegExpExecArray | null;
  while ((relMatch = relRe.exec(relsXml)) !== null) {
    const attrs = relMatch[1] ?? "";
    if (!attrs.includes("/hyperlink")) continue;
    const id = /Id="([^"]+)"/.exec(attrs)?.[1];
    const target = /Target="([^"]+)"/.exec(attrs)?.[1];
    if (id && target) hyperlinks.set(id, decodeXml(target));
  }

  const sheet = unzipText(xlsxPath, "xl/worksheets/sheet1.xml");
  const cellHref = new Map<string, string>();
  const hlRe = /<hyperlink([^>]+)\/>/g;
  let hlMatch: RegExpExecArray | null;
  while ((hlMatch = hlRe.exec(sheet)) !== null) {
    const attrs = hlMatch[1] ?? "";
    const ref = /ref="([^"]+)"/.exec(attrs)?.[1];
    const rid = /r:id="([^"]+)"/.exec(attrs)?.[1];
    if (ref && rid && hyperlinks.has(rid)) {
      cellHref.set(ref, hyperlinks.get(rid) ?? "");
    }
  }

  const cells = new Map<number, Map<number, string>>();
  const cellRe = /<c r="([A-Z]+\d+)"[^>]*>([\s\S]*?)<\/c>/g;
  let cellMatch: RegExpExecArray | null;
  while ((cellMatch = cellRe.exec(sheet)) !== null) {
    const ref = cellMatch[1] ?? "";
    const inner = cellMatch[2] ?? "";
    const texts = [...inner.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((m) =>
      decodeXml(m[1] ?? "")
    );
    const [ci, ri] = colRow(ref);
    const value = cellHref.get(ref) ?? texts.join("");
    if (!cells.has(ri)) cells.set(ri, new Map());
    cells.get(ri)?.set(ci, value);
  }

  const rowNums = [...cells.keys()].sort((a, b) => a - b);
  const maxCol = Math.max(
    ...rowNums.flatMap((ri) => [...(cells.get(ri)?.keys() ?? [])]),
    -1,
  );
  return rowNums.map((ri) => {
    const cols = cells.get(ri) ?? new Map();
    return Array.from({ length: maxCol + 1 }, (_, i) => cols.get(i) ?? "");
  });
}

const PUBLIC_COLUMNS = HEADER.slice(0, 11);

describe("catalysts.xlsx", () => {
  it("matches the 11 public CSV columns row-for-row (Sept 4 watchlist workbook)", () => {
    const csv = parseCsv(readFileSync(CSV, "utf8"));
    const xlsx = readXlsxRows(XLSX);
    expect(xlsx[0]).toEqual([
      "date_added",
      "catalyst_date",
      ...PUBLIC_COLUMNS.slice(2),
    ]);
    expect(xlsx.length).toBe(csv.length);
    for (let i = 1; i < csv.length; i++) {
      const csvPublic = PUBLIC_COLUMNS.map((col) => {
        const idx = HEADER.indexOf(col);
        return csv[i]?.[idx] ?? "";
      });
      expect(xlsx[i], `row ${i + 1}`).toEqual(csvPublic);
    }
  });
});
