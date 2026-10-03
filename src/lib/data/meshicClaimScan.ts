import {
  blockingFinding,
  gapFinding,
  type MeshicFinding,
} from "./meshicFindings";

/** User-facing exit-analysis surfaces. Exceptions cannot silence these files. */
export const EXIT_ANALYSIS_CLAIM_FILES = [
  "src/components/AcquirerPredictionDashboard.tsx",
  "src/components/CompanySimilarity.tsx",
  "src/components/ExitPredictor.tsx",
  "src/components/PitchBrief.tsx",
  "src/components/QuantValuationPanel.tsx",
  "src/data/acquirer-prediction-engine.ts",
  "src/lib/quant/acquisitionIndex.ts",
  "src/lib/quant/observedExitRates.ts",
  "src/lib/quant/predictionEngines.ts",
  "src/lib/quant/presentation.ts",
  "src/lib/research/evidenceBoundaries.ts",
] as const;

const EXIT_ANALYSIS_CLAIM_SET = new Set<string>(EXIT_ANALYSIS_CLAIM_FILES);

export interface ClaimException {
  readonly id: string;
  readonly file: string;
  readonly pattern: string;
  readonly reason: string;
  readonly boundedModel: string;
}

export interface ClaimScanFile {
  readonly path: string;
  readonly content: string;
}

const CLAIM_RULES: readonly { rule: string; pattern: RegExp }[] = [
  {
    rule: "claim.prediction",
    pattern: /\bpredict(?:ed|ion|ions)?\b/gi,
  },
  {
    rule: "claim.probability",
    pattern: /\b(?:probability|probabilities|odds)\b/gi,
  },
  {
    rule: "claim.forecast",
    pattern: /\bforecast(?:s|ing)?\b/gi,
  },
  {
    rule: "claim.likelyExit",
    pattern: /\blikely exit\b/gi,
  },
  {
    rule: "claim.certainty",
    pattern: new RegExp(
      String.raw`\\b(?:certain${"ty"}|guarantee${"d"}|certain\\s+to)\\b`,
      "gi",
    ),
  },
];

const NEGATION =
  /\b(?:not|no|never|without|isn'?t|aren'?t|cannot|can'?t|won'?t)\b/i;

function blankComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, " "))
    .replace(/\/\/[^\n]*/g, (line) => " ".repeat(line.length));
}

function lineNumber(source: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index && i < source.length; i++) {
    if (source.charCodeAt(i) === 10) line++;
  }
  return line;
}

interface TextRange {
  readonly start: number;
  readonly end: number;
  readonly template: boolean;
}

/** String literals and JSX text. Indices match the blanked source. */
function literalRanges(source: string): TextRange[] {
  const ranges: TextRange[] = [];
  let i = 0;
  while (i < source.length) {
    const ch = source[i];
    if (ch === '"' || ch === "'" || ch === "`") {
      const start = i + 1;
      i++;
      while (i < source.length) {
        if (source[i] === "\\") {
          i += 2;
          continue;
        }
        if (source[i] === ch) break;
        i++;
      }
      ranges.push({ start, end: i, template: ch === "`" });
      i++;
      continue;
    }
    if (ch === ">" && source[i - 1] !== "=") {
      const start = i + 1;
      let j = start;
      while (j < source.length && source[j] !== "<") j++;
      const text = source.slice(start, j);
      const codeLike = /[{};]|=>|\b(?:const|return|function|import|type)\b/
        .test(text);
      if (/[A-Za-z]/.test(text) && !codeLike) {
        ranges.push({ start, end: j, template: false });
      }
      i = j;
      continue;
    }
    i++;
  }
  return ranges;
}

/** Drop `${...}` so identifier names inside templates are not claims. */
function visibleLiteral(source: string, range: TextRange): string {
  const text = source.slice(range.start, range.end);
  if (!range.template) return text;
  let out = "";
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    if (depth === 0 && text[i] === "$" && text[i + 1] === "{") {
      depth = 1;
      out += "  ";
      i++;
      continue;
    }
    if (depth > 0) {
      if (text[i] === "{") depth++;
      else if (text[i] === "}") depth--;
      out += text[i] === "\n" ? "\n" : " ";
      continue;
    }
    out += text[i];
  }
  return out;
}

function sentenceStart(source: string, index: number): number {
  let start = index;
  const floor = Math.max(0, index - 400);
  while (start > floor) {
    const ch = source[start - 1];
    if (ch === "." || ch === "!" || ch === "?") break;
    start--;
  }
  return start;
}

/** Import paths and require() specifiers are not user-facing claims. */
function isModuleSpecifier(source: string, contentStart: number): boolean {
  const before = source.slice(0, Math.max(0, contentStart - 1));
  return /(?:\bfrom|\brequire\s*\(|\bimport\s*\(?|\bmodule\s*:)\s*$/.test(before);
}

function isNegated(source: string, index: number): boolean {
  return NEGATION.test(source.slice(sentenceStart(source, index), index));
}

function isProhibitionLabel(source: string, index: number): boolean {
  const before = source.slice(Math.max(0, index - 400), index);
  const marker = before.lastIndexOf("prohibitedUses");
  if (marker < 0) return false;
  return !before.slice(marker).includes("]");
}

function exceptionCovers(
  file: string,
  matchText: string,
  exceptions: readonly ClaimException[],
): boolean {
  return exceptions.some((exception) =>
    exception.file === file && matchText.includes(exception.pattern)
  );
}

export interface ClaimScanOptions {
  readonly files: readonly ClaimScanFile[];
  readonly exceptions?: readonly ClaimException[];
  readonly exitSurface?: ReadonlySet<string>;
}

/**
 * Scan user-facing strings. Negations and prohibited-use labels are not
 * claims. Exit-analysis files cannot be silenced by the exception registry.
 */
export function scanClaimLanguage(options: ClaimScanOptions): MeshicFinding[] {
  const exceptions = options.exceptions ?? [];
  const exitSurface = options.exitSurface ?? EXIT_ANALYSIS_CLAIM_SET;
  const findings: MeshicFinding[] = [];

  for (const file of options.files) {
    const blanked = blankComments(file.content);
    const onExitSurface = exitSurface.has(file.path);
    for (const range of literalRanges(blanked)) {
      if (isModuleSpecifier(blanked, range.start)) continue;
      const text = visibleLiteral(blanked, range);
      for (const rule of CLAIM_RULES) {
        rule.pattern.lastIndex = 0;
        let match = rule.pattern.exec(text);
        while (match) {
          const absolute = range.start + match.index;
          const matchText = match[0];
          if (
            !isNegated(blanked, absolute) &&
            !isProhibitionLabel(file.content, absolute)
          ) {
            const covered = !onExitSurface &&
              exceptionCovers(file.path, text, exceptions);
            if (!covered) {
              findings.push(blockingFinding(
                rule.rule,
                `${file.path}:${lineNumber(file.content, absolute)}`,
                `User-facing language "${matchText}" presents a descriptive result as a predictive claim.`,
                onExitSurface
                  ? "Rephrase this exit-analysis surface as a historical comparison. Exceptions are not available here."
                  : "Rephrase as a descriptive comparison, or register a tested exception only when a bounded model outside this exit surface is named.",
              ));
            }
          }
          match = rule.pattern.exec(text);
        }
      }
    }
  }
  return findings;
}

export interface ExceptionCheck {
  readonly exceptions: readonly ClaimException[];
  readonly fileExists: (path: string) => boolean;
  readonly exitSurface?: ReadonlySet<string>;
}

/** Exceptions must name a real bounded model outside the exit-analysis surface. */
export function validateClaimExceptions(
  check: ExceptionCheck,
): MeshicFinding[] {
  const exitSurface = check.exitSurface ?? EXIT_ANALYSIS_CLAIM_SET;
  const findings: MeshicFinding[] = [];
  const seen = new Set<string>();
  for (const exception of check.exceptions) {
    const location = `scripts/meshic-claim-exceptions.json#${
      exception.id || "(missing id)"
    }`;
    if (
      !exception.id || !exception.file || !exception.pattern ||
      !exception.reason?.trim() || !exception.boundedModel
    ) {
      findings.push(blockingFinding(
        "claim.invalidException",
        location,
        "A claim exception is missing an id, file, pattern, reason, or bounded model.",
        "Fill every field. An incomplete exception does not suppress a match.",
      ));
      continue;
    }
    if (seen.has(exception.id)) {
      findings.push(blockingFinding(
        "claim.invalidException",
        location,
        `Claim exception id ${exception.id} is duplicated.`,
        "Give the exception a unique id.",
      ));
    }
    seen.add(exception.id);
    if (exception.reason.trim().length < 40) {
      findings.push(blockingFinding(
        "claim.invalidException",
        location,
        "The exception reason is too short to identify a bounded model.",
        "Explain which validated model the words refer to, and why it is outside exit analysis.",
      ));
    }
    if (exitSurface.has(exception.file)) {
      findings.push(blockingFinding(
        "claim.exceptionOnExitSurface",
        location,
        `${exception.file} is an exit-analysis surface and cannot be exempted.`,
        "Rephrase the exit-analysis copy. Do not add an exception for this file.",
      ));
    }
    if (
      exception.boundedModel === exception.file ||
      exitSurface.has(exception.boundedModel)
    ) {
      findings.push(blockingFinding(
        "claim.invalidException",
        location,
        "boundedModel must be a different file outside the exit-analysis surface.",
        "Point boundedModel at the validated model's module, not at the exit copy.",
      ));
    }
    if (!check.fileExists(exception.boundedModel)) {
      findings.push(blockingFinding(
        "claim.invalidException",
        location,
        `Bounded model ${exception.boundedModel} does not exist.`,
        "Name a file that is actually in the repository. Do not exempt a match with a missing model.",
      ));
    }
    if (!check.fileExists(exception.file)) {
      findings.push(blockingFinding(
        "claim.invalidException",
        location,
        `Exception file ${exception.file} does not exist.`,
        "Point the exception at the file that contains the phrase.",
      ));
    }
  }
  return findings;
}

const ECONOMIC_DISPLAY: Array<{ field: RegExp; provenance: RegExp }> = [
  {
    field: /\b(?:totalFunding|totalFundingM)\b/,
    provenance:
      /sourceCitation|fundingSource|provenance|<Metric|valuationSource|\.sources\b|primarySourceUrl/,
  },
  {
    field: /\b(?:lastKnownValuation|lastKnownValuationM)\b/,
    provenance:
      /valuationSource|sourceCitation|provenance|<Metric|sourcedLastKnownValuation|DealTargetLastKnownValuation/,
  },
];

function lineDisplays(line: string, field: RegExp): boolean {
  if (!field.test(line)) return false;
  return /\$\{|formatFunding|formatM\(|toLocaleString|toFixed\(/.test(line);
}

/**
 * Public economic figures need a citation path. A URL is not required.
 * Missing provenance is a reported gap, not a license to invent a source.
 */
export function auditEconomicDisplays(
  files: readonly ClaimScanFile[],
): MeshicFinding[] {
  const findings: MeshicFinding[] = [];
  for (const file of files) {
    if (!file.path.startsWith("src/components/")) continue;
    const lines = file.content.split("\n");
    for (let index = 0; index < lines.length; index++) {
      const window = lines.slice(index, index + 8).join("\n");
      for (const rule of ECONOMIC_DISPLAY) {
        rule.field.lastIndex = 0;
        if (!lineDisplays(lines[index], rule.field)) continue;
        rule.provenance.lastIndex = 0;
        if (rule.provenance.test(window)) continue;
        findings.push(gapFinding(
          "display.economicFactWithoutProvenance",
          `${file.path}:${index + 1}`,
          "An evidence-backed economic figure is rendered without source or provenance access on this display.",
          "Show the ledger citation or valuationSource beside the figure, or render it through Metric. A citation string is enough; do not require a URL and do not invent one.",
        ));
        break;
      }
    }
  }
  return findings;
}
