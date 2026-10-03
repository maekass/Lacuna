import {
  blockingFinding,
  gapFinding,
  type MeshicFinding,
} from "./meshicFindings";

export interface SourceFile {
  readonly path: string;
  readonly content: string;
}

const HISTORICAL_NAME =
  /(?:asOf|AsOf|atDecision|DecisionDate|Replay|pointInTime|PointInTime)/;

const DAY_FORMAT_EXEMPT = new Set([
  "atDecisionDate",
  "isCalendarDay",
  "validReplayDay",
]);

function skipBalanced(
  source: string,
  openIndex: number,
  open: string,
  close: string,
): number {
  let depth = 0;
  for (let i = openIndex; i < source.length; i++) {
    if (source[i] === open) depth++;
    else if (source[i] === close) {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return -1;
}

/** Index just after the parameter list, including a simple generic clause. */
function afterParameters(source: string, nameAt: number): number {
  let i = nameAt;
  if (source[i] === "<") {
    i = skipBalanced(source, i, "<", ">");
    if (i < 0) return -1;
  }
  while (i < source.length && /\s/.test(source[i])) i++;
  if (source[i] !== "(") return -1;
  return skipBalanced(source, i, "(", ")");
}

/**
 * Opening brace of the function body. Parameter and return types may
 * themselves contain braces; those are not the body.
 */
function bodyOpen(source: string, afterParams: number): number {
  let i = afterParams;
  while (i < source.length && /\s/.test(source[i])) i++;
  if (source[i] === ":") {
    i++;
    while (i < source.length) {
      while (i < source.length && /\s/.test(source[i])) i++;
      if (source[i] === ";") return -1;
      if (source[i] !== "{") {
        i++;
        continue;
      }
      const after = skipBalanced(source, i, "{", "}");
      if (after < 0) return -1;
      let j = after;
      while (j < source.length && /\s/.test(source[j])) j++;
      if (source[j] === "{") return j;
      return i;
    }
    return -1;
  }
  return source[i] === "{" ? i : source.indexOf("{", i);
}

/** Body of a function declaration, including the braces. */
export function extractFunctionBody(
  source: string,
  name: string,
): string | null {
  const re = new RegExp(`(?:export\\s+)?function\\s+${name}\\b`);
  const match = re.exec(source);
  if (!match) return null;
  const afterParams = afterParameters(source, match.index + match[0].length);
  if (afterParams < 0) return null;
  const open = bodyOpen(source, afterParams);
  if (open < 0) return null;
  const end = skipBalanced(source, open, "{", "}");
  if (end < 0) return null;
  return source.slice(open, end);
}

function functionNames(source: string): string[] {
  const names: string[] = [];
  const re = /(?:export\s+)?function\s+([A-Za-z0-9_]+)\b/g;
  let match = re.exec(source);
  while (match) {
    names.push(match[1]);
    match = re.exec(source);
  }
  return names;
}

function blankComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, " "))
    .replace(/\/\/[^\n]*/g, (line) => " ".repeat(line.length));
}

/** Keep code tokens. Documentation that names both fields is not a substitution. */
function blankStrings(source: string): string {
  let out = "";
  let i = 0;
  while (i < source.length) {
    const ch = source[i];
    if (ch === '"' || ch === "'" || ch === "`") {
      out += " ";
      i++;
      while (i < source.length) {
        if (source[i] === "\\") {
          out += "  ";
          i += 2;
          continue;
        }
        if (source[i] === ch) {
          out += " ";
          i++;
          break;
        }
        out += source[i] === "\n" ? "\n" : " ";
        i++;
      }
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

function push(
  findings: MeshicFinding[],
  rule: string,
  location: string,
  why: string,
  remediation: string,
): void {
  findings.push(blockingFinding(rule, location, why, remediation));
}

function scanHistoricalBody(
  file: string,
  name: string,
  body: string,
): MeshicFinding[] {
  const findings: MeshicFinding[] = [];
  const location = `${file}#${name}`;
  if (
    /company\.totalFunding|company\.lastKnownValuation|getStaticVerifiedDataset|dataset\.verified\.json/
      .test(body)
  ) {
    push(
      findings,
      "replay.rawCurrentField",
      location,
      `${name} reads a current catalog field instead of the provenance gate.`,
      "Read funding and valuation through economicEvidenceAtDecisionDate. Do not use the materialized company field inside an as-of function.",
    );
  }
  if (
    /(?:totalFunding|lastKnownValuation|publicAsOfDate|valuationAsOf)\b[^\n]{0,160}\b(?:announcedDate|closedDate)\b|\b(?:announcedDate|closedDate)\b[^\n]{0,160}\b(?:publicAsOfDate|totalFunding|lastKnownValuation)\b/
      .test(body)
  ) {
    push(
      findings,
      "replay.acquisitionDateSubstitute",
      location,
      `${name} uses an acquisition announcement or close date as a funding or valuation vintage.`,
      "Use the evidence field's own publicAsOfDate. Deal announcement and close dates are not funding or valuation vintages.",
    );
  }
  if (/publicAsOfDate\s*(?:\?\?|\|\|)\s*(?:["'\d(]|[A-Za-z_])/.test(body)) {
    push(
      findings,
      "replay.undatedEvidenceAdmitted",
      location,
      `${name} substitutes another value when publicAsOfDate is missing.`,
      "Return missing-provenance when publicAsOfDate is null. Do not infer, default, or admit the undated fact.",
    );
  }
  if (
    /(?:totalFunding|lastKnownValuation|publicAsOfDate|raisedToDate|rank|score)\b[^\n]{0,80}(?:\?\?|\|\|)\s*(?:0|""|'')|(?:\?\?|\|\|)\s*(?:0|""|'')/
      .test(body)
  ) {
    push(
      findings,
      "replay.missingCoerced",
      location,
      `${name} coerces a missing economic value to zero, an empty string, or a fill-in.`,
      'Return an ineligible or missing result. Do not coerce the gap to 0, "", a default rank, or a favorable score.',
    );
  }
  if (
    !DAY_FORMAT_EXEMPT.has(name) &&
    /toLocaleDateString|toISOString\(|new Date\(/.test(body) &&
    !/\bdatePrecision\b|\bprecision\b/.test(body)
  ) {
    push(
      findings,
      "replay.coarseDatePresentedAsDay",
      location,
      `${name} formats a date as a day without reading date precision.`,
      "Refuse day formatting unless datePrecision is day. Show the coarser grain, or withhold the date.",
    );
  }
  return findings;
}

/**
 * Historical and as-of functions must use the provenance gate.
 * Descriptive adapters that still coerce missing funding are reported
 * as gaps so they are visible without being treated as dated replay.
 */
export function scanReplaySafety(
  files: readonly SourceFile[],
): MeshicFinding[] {
  const findings: MeshicFinding[] = [];
  for (const file of files) {
    const source = blankComments(file.content);
    for (const name of functionNames(source)) {
      if (!HISTORICAL_NAME.test(name)) continue;
      const body = extractFunctionBody(source, name);
      if (!body) continue;
      findings.push(...scanHistoricalBody(file.path, name, body));
    }
    if (
      /(?:totalFunding|lastKnownValuation|publicAsOfDate)\b[^\n]{0,160}\b(?:announcedDate|closedDate)\b|\b(?:announcedDate|closedDate)\b[^\n]{0,160}\b(?:publicAsOfDate|totalFunding|lastKnownValuation)\b/
        .test(blankStrings(source))
    ) {
      const already = findings.some((finding) =>
        finding.rule === "replay.acquisitionDateSubstitute" &&
        finding.location.startsWith(file.path)
      );
      if (!already) {
        findings.push(blockingFinding(
          "replay.acquisitionDateSubstitute",
          file.path,
          "This file ties funding or valuation vintage to an acquisition announcement or close date.",
          "Use the evidence field's own publicAsOfDate via economicEvidenceAtDecisionDate. Do not substitute announcedDate or closedDate.",
        ));
      }
    }
  }
  return findings;
}

const DESCRIPTIVE_ZERO_COERCION: readonly { path: string; pattern: RegExp }[] =
  [
    {
      path: "src/lib/quant/adaptQuantCompany.ts",
      pattern: /totalFunding\s*\?\?\s*0/,
    },
    {
      path: "src/lib/quant/predictionEngines.ts",
      pattern: /\?\?\s*0|\|\|\s*0/,
    },
  ];

/**
 * Known descriptive adapters that still coerce missing inputs.
 * Reported, not blocking: they are not dated replay, and the safe change
 * is to withhold the input rather than invent a zero.
 */
export function scanDescriptiveZeroCoercion(
  files: readonly SourceFile[],
): MeshicFinding[] {
  const findings: MeshicFinding[] = [];
  for (const spec of DESCRIPTIVE_ZERO_COERCION) {
    const file = files.find((candidate) => candidate.path === spec.path);
    if (!file || !spec.pattern.test(file.content)) continue;
    findings.push(gapFinding(
      "replay.descriptiveZeroCoercion",
      spec.path,
      "A descriptive similarity or portfolio adapter still coerces a missing numeric input to zero.",
      "Do not copy this into an as-of calculation. Withhold the missing input there. This gap is not a request to invent a publicAsOfDate, and it does not make the current catalog historically replayable.",
    ));
  }
  return findings;
}
