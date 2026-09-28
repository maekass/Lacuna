/**
 * Copy a publication date or URL only when the citation string already states it.
 * Does not fetch sources and does not borrow deal announcement dates.
 *
 * Usage: npx tsx scripts/backfill-evidence-from-citations.ts
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  sourceUrlFromCitation,
  vintageFromCitation,
} from "../src/lib/data/citationVintage";

const ledgerPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../src/data/evidence.verified.json",
);

interface EvidenceRecord {
  sourceCitation: string;
  sourceUrl?: string;
  effectiveDate: string | null;
  publicAsOfDate: string | null;
  datePrecision: string;
}

const ledger = JSON.parse(readFileSync(ledgerPath, "utf8")) as {
  records: EvidenceRecord[];
};

let dated = 0;
let urls = 0;
for (const record of ledger.records) {
  if (record.publicAsOfDate == null) {
    const vintage = vintageFromCitation(record.sourceCitation);
    if (vintage) {
      record.publicAsOfDate = vintage.publicAsOfDate;
      record.effectiveDate = record.effectiveDate ?? vintage.publicAsOfDate;
      record.datePrecision = vintage.datePrecision;
      dated += 1;
    }
  }
  if (!record.sourceUrl) {
    const url = sourceUrlFromCitation(record.sourceCitation);
    if (url) {
      record.sourceUrl = url;
      urls += 1;
    }
  }
}

writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
const stillUndated =
  ledger.records.filter((record) => record.publicAsOfDate == null).length;
const stillNoUrl = ledger.records.filter((record) => !record.sourceUrl).length;
console.log(
  `Dated ${dated} from citation text. URLs copied: ${urls}. Still undated: ${stillUndated}. Still no URL: ${stillNoUrl}.`,
);
