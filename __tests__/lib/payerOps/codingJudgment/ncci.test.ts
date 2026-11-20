import { describe, expect, it } from "vitest";
import {
  evaluateMueUnits,
  evaluatePtpPair,
  isPtpEditActiveOn,
  parseMueCsv,
  parsePtpText,
  ptpAbsenceId,
} from "@/lib/payerOps/codingJudgment/ncci";
import type { PtpEdit } from "@/lib/payerOps/codingJudgment/schemas";

// Shape mirrors the CMS practitioner PTP text files: a preamble, a two-line
// header, then tab-delimited CRLF rows. Codes only; no descriptors.
const PTP_FIXTURE = [
  "CPT only copyright 2025 American Medical Association. All rights reserved.",
  "Column 1\tColumn 2\t*=in existence\tEffective\tDeletion\tModifier\tPTP Edit Rationale",
  "\t\tprior to 1996\tDate\tDate\t0=not allowed\t",
  "58558\t58100\t\t20000101\t*\t1\tMisuse of column two code with column one code",
  "57454\t57452\t*\t19960101\t*\t0\tStandards of medical / surgical practice",
  "11111\t22222\t\t20200101\t20200101\t9\tMutually exclusive procedures",
  "33333\t44444\t\t20200101\t20251231\t1\tCPT Manual or CMS manual coding instructions",
  "",
].join("\r\n");

const MUE_FIXTURE = [
  '"CPT codes, descriptions and other data only are copyright 2025',
  'American Medical Association."',
  '"HCPCS/CPT Code","Practitioner Services MUE Values","MUE Adjudication Indicator","MUE Rationale"',
  '58571,1,"2 Date of Service Edit: Policy","Anatomic Consideration"',
  '96372,4,"3 Date of Service Edit: Clinical","Clinical: Data"',
  '99215,1,"2 Date of Service Edit: Policy","Code Descriptor / CPT Instruction"',
  'J1050,1000,"3 Date of Service Edit: Clinical","Prescribing Information"',
].join("\r\n");

describe("parsePtpText", () => {
  const rows = parsePtpText(PTP_FIXTURE, "v323r0");

  it("skips header lines by shape and parses CRLF rows", () => {
    expect(rows).toHaveLength(4);
    expect(rows[0]).toEqual({
      id: "ptp:v323r0:58558:58100:20000101",
      column1: "58558",
      column2: "58100",
      priorTo1996: false,
      effectiveDate: "20000101",
      deletionDate: null,
      modifierIndicator: "1",
      rationale: "Misuse of column two code with column one code",
    });
  });

  it("reads the prior-1996 marker and deletion dates", () => {
    expect(rows[1].priorTo1996).toBe(true);
    expect(rows[3].deletionDate).toBe("20251231");
  });

  it("rejects an unexpected modifier indicator", () => {
    expect(() => parsePtpText("58558\t58100\t\t20000101\t*\t7\tx", "v323r0"))
      .toThrow(/modifier/);
  });
});

describe("parseMueCsv", () => {
  it("parses quoted indicator cells and ignores the preamble", () => {
    const rows = parseMueCsv(MUE_FIXTURE, "2026Q4");
    expect(rows.map((r) => r.code)).toEqual([
      "58571",
      "96372",
      "99215",
      "J1050",
    ]);
    expect(rows[1]).toMatchObject({
      id: "mue:2026Q4:96372",
      mueValue: 4,
      adjudicationIndicator: "3",
      adjudicationLabel: "Date of Service Edit: Clinical",
    });
  });
});

const edit = (over: Partial<PtpEdit>): PtpEdit => ({
  id: "ptp:v:1:2:20200101",
  column1: "10000",
  column2: "20000",
  priorTo1996: false,
  effectiveDate: "20200101",
  deletionDate: null,
  modifierIndicator: "0",
  rationale: "",
  ...over,
});

describe("isPtpEditActiveOn", () => {
  it("is active from the effective date onward when not deleted", () => {
    expect(isPtpEditActiveOn(edit({}), "2019-12-31")).toBe(false);
    expect(isPtpEditActiveOn(edit({}), "2020-01-01")).toBe(true);
  });

  it("treats the deletion date as the last active date", () => {
    const e = edit({ deletionDate: "20251231" });
    expect(isPtpEditActiveOn(e, "2025-12-31")).toBe(true);
    expect(isPtpEditActiveOn(e, "2026-01-01")).toBe(false);
  });

  it("never applies when effective equals deletion", () => {
    const e = edit({ deletionDate: "20200101" });
    expect(isPtpEditActiveOn(e, "2020-01-01")).toBe(false);
  });
});

describe("evaluatePtpPair", () => {
  const rows = parsePtpText(PTP_FIXTURE, "v323r0");

  it("denies column two without a modifier, either billing order", () => {
    expect(evaluatePtpPair(rows, "58558", "58100", "2026-11-10", []).kind)
      .toBe("denied_column2");
    expect(evaluatePtpPair(rows, "58100", "58558", "2026-11-10", []).kind)
      .toBe("denied_column2");
  });

  it("allows a PTP-associated modifier only when the indicator is 1", () => {
    expect(evaluatePtpPair(rows, "58558", "58100", "2026-11-10", ["XS"]).kind)
      .toBe("bypassed_by_modifier");
    expect(evaluatePtpPair(rows, "57454", "57452", "2026-11-10", ["59"]).kind)
      .toBe("denied_column2");
  });

  it("does not bypass with a non-PTP modifier", () => {
    expect(evaluatePtpPair(rows, "58558", "58100", "2026-11-10", ["GA"]).kind)
      .toBe("denied_column2");
  });

  it("reports inactive and absent edits", () => {
    expect(evaluatePtpPair(rows, "11111", "22222", "2026-11-10", []).kind)
      .toBe("inactive");
    expect(evaluatePtpPair(rows, "33333", "44444", "2026-11-10", []).kind)
      .toBe("inactive");
    expect(evaluatePtpPair(rows, "36415", "99213", "2026-11-10", []).kind)
      .toBe("no_edit");
  });

  it("builds order-independent absence ids", () => {
    expect(ptpAbsenceId("v323r0", "99213", "36415")).toBe(
      "ptp-absent:v323r0:36415:99213",
    );
  });
});

describe("evaluateMueUnits", () => {
  const rows = parseMueCsv(MUE_FIXTURE, "2026Q4");
  it("flags only units above the MUE value", () => {
    expect(evaluateMueUnits(rows, "96372", 4).kind).toBe("within_limit");
    expect(evaluateMueUnits(rows, "96372", 5).kind).toBe("exceeds_limit");
    expect(evaluateMueUnits(rows, "S0610", 2).kind).toBe("no_mue_row");
  });
});
