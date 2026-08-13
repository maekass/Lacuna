import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const repoRoot = path.resolve(import.meta.dirname, "..");
const sourceRoots = ["src/components", "src/app"];
const baselinePath = path.join(repoRoot, "scripts/provenance-baseline.json");
const exemptionsPath = path.join(
  repoRoot,
  "scripts/provenance-exemptions.json",
);

export type ProvenanceSiteClass = "covered" | "exempt" | "uncovered";

export interface ProvenanceExemption {
  readonly key: string;
  readonly category: string;
  readonly reason: string;
}

export interface ProvenanceSite {
  readonly key: string;
  readonly file: string;
  readonly functionName: string;
  readonly expression: string;
  readonly kind: "formatting-call" | "numeric-jsx";
  readonly class: ProvenanceSiteClass;
}

export interface ProvenanceCensus {
  readonly version: 1;
  readonly total: number;
  readonly covered: number;
  readonly exempt: number;
  readonly uncovered: number;
  readonly perFileUncovered: Readonly<Record<string, number>>;
  readonly sites: readonly ProvenanceSite[];
}

const EXEMPTION_CATEGORIES = new Set([
  "date",
  "citation",
  "chart-axis",
  "record-id",
  "dataset-metadata",
  "ui-count",
]);

interface CensusOptions {
  readonly cwd: string;
  readonly files: readonly string[];
  readonly exemptions: readonly ProvenanceExemption[];
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function sourceFiles(root: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...sourceFiles(fullPath));
    else if (/\.(tsx?|mts)$/.test(entry.name)) files.push(fullPath);
  }
  return files.sort();
}

function nodeText(node: ts.Node, sourceFile: ts.SourceFile): string {
  return node.getText(sourceFile).replace(/\s+/g, " ").trim();
}

function functionName(node: ts.Node, sourceFile: ts.SourceFile): string {
  for (
    let current: ts.Node | undefined = node.parent;
    current;
    current = current.parent
  ) {
    if (ts.isFunctionDeclaration(current) || ts.isMethodDeclaration(current)) {
      return current.name?.getText(sourceFile) ?? "<anonymous>";
    }
    if (
      ts.isVariableDeclaration(current) && current.initializer &&
      (ts.isArrowFunction(current.initializer) ||
        ts.isFunctionExpression(current.initializer))
    ) {
      return current.name.getText(sourceFile);
    }
  }
  return "<module>";
}

function jsxName(node: ts.JsxTagNameExpression): string {
  return ts.isIdentifier(node)
    ? node.text
    : ts.isPropertyAccessExpression(node)
    ? `${jsxName(node.expression as ts.JsxTagNameExpression)}.${node.name.text}`
    : "";
}

function isInsideMetric(
  node: ts.Node,
  sourceFile: ts.SourceFile,
  usesSharedMetric: boolean,
): boolean {
  if (sourceFile.fileName.endsWith(`${path.sep}Metric.tsx`)) return true;
  if (!usesSharedMetric) return false;
  for (
    let current: ts.Node | undefined = node.parent;
    current;
    current = current.parent
  ) {
    if (ts.isJsxElement(current)) {
      if (jsxName(current.openingElement.tagName) === "Metric") return true;
    }
    if (ts.isJsxSelfClosingElement(current)) {
      if (jsxName(current.tagName) === "Metric") return true;
    }
  }
  return false;
}

function isNumericType(type: ts.Type): boolean {
  if ((type.flags & ts.TypeFlags.NumberLike) !== 0) return true;
  if ((type.flags & ts.TypeFlags.Union) !== 0) {
    return type.types.length > 0 && type.types.every(isNumericType);
  }
  return false;
}

function isFormattingCall(
  node: ts.CallExpression,
  checker: ts.TypeChecker,
): boolean {
  const expression = node.expression;
  if (ts.isPropertyAccessExpression(expression)) {
    if (
      expression.name.text === "toFixed" ||
      expression.name.text === "toLocaleString" ||
      expression.name.text === "format"
    ) {
      return true;
    }
  }
  if (
    ts.isIdentifier(expression) && /^format[A-Z]|^format$/.test(expression.text)
  ) {
    const returnType = checker.getTypeAtLocation(node);
    return (returnType.flags & ts.TypeFlags.StringLike) !== 0;
  }
  return false;
}

function siteKey(
  file: string,
  fn: string,
  expression: string,
  collision: number,
): string {
  const base = `${file}::${fn}::${expression}`;
  return collision === 1 ? base : `${base}#${collision}`;
}

export function collectCensus(options: CensusOptions): ProvenanceCensus {
  const compilerOptions: ts.CompilerOptions = {
    allowJs: false,
    jsx: ts.JsxEmit.ReactJSX,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    strict: true,
    target: ts.ScriptTarget.ES2022,
    skipLibCheck: true,
  };
  const program = ts.createProgram([...options.files], compilerOptions);
  const checker = program.getTypeChecker();
  const rawSites: Array<
    Omit<ProvenanceSite, "key" | "class"> & { readonly covered: boolean }
  > = [];

  for (const sourceFile of program.getSourceFiles()) {
    if (!options.files.includes(sourceFile.fileName)) continue;
    const relativeFile = path.relative(options.cwd, sourceFile.fileName);
    const usesSharedMetric = /from\s*["']@\/components\/Metric["']/.test(
      sourceFile.text,
    );
    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node) && isFormattingCall(node, checker)) {
        rawSites.push({
          file: relativeFile,
          functionName: functionName(node, sourceFile),
          expression: nodeText(node, sourceFile),
          kind: "formatting-call",
          covered: isInsideMetric(node, sourceFile, usesSharedMetric),
        });
      }
      if (
        ts.isJsxExpression(node) && node.expression &&
        isNumericType(checker.getTypeAtLocation(node.expression))
      ) {
        rawSites.push({
          file: relativeFile,
          functionName: functionName(node, sourceFile),
          expression: nodeText(node.expression, sourceFile),
          kind: "numeric-jsx",
          covered: isInsideMetric(node, sourceFile, usesSharedMetric),
        });
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }

  const counts = new Map<string, number>();
  const sites = rawSites.map((raw) => {
    const base = `${raw.file}::${raw.functionName}::${raw.expression}`;
    const collision = (counts.get(base) ?? 0) + 1;
    counts.set(base, collision);
    const key = siteKey(raw.file, raw.functionName, raw.expression, collision);
    const exemption = options.exemptions.find((entry) => entry.key === key);
    const siteClass: ProvenanceSiteClass = raw.covered
      ? "covered"
      : exemption
      ? "exempt"
      : "uncovered";
    return {
      file: raw.file,
      functionName: raw.functionName,
      expression: raw.expression,
      kind: raw.kind,
      key,
      class: siteClass,
    };
  });

  sites.sort((left, right) => left.key.localeCompare(right.key));
  const perFileUncovered: Record<string, number> = {};
  for (const site of sites) {
    if (site.class === "uncovered") {
      perFileUncovered[site.file] = (perFileUncovered[site.file] ?? 0) + 1;
    }
  }
  return {
    version: 1,
    total: sites.length,
    covered: sites.filter((site) => site.class === "covered").length,
    exempt: sites.filter((site) => site.class === "exempt").length,
    uncovered: sites.filter((site) => site.class === "uncovered").length,
    perFileUncovered: Object.fromEntries(
      Object.entries(perFileUncovered).sort(([a], [b]) => a.localeCompare(b)),
    ),
    sites,
  };
}

export function validateExemptions(
  exemptions: readonly ProvenanceExemption[],
): void {
  const seen = new Set<string>();
  for (const exemption of exemptions) {
    if (
      !exemption.key || !EXEMPTION_CATEGORIES.has(exemption.category) ||
      !exemption.reason.trim()
    ) {
      throw new Error(
        `Invalid provenance exemption ${
          JSON.stringify(exemption)
        }: key, supported category, and reason are required.`,
      );
    }
    if (seen.has(exemption.key)) {
      throw new Error(`Duplicate provenance exemption key: ${exemption.key}`);
    }
    seen.add(exemption.key);
  }
}

function stableJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function sourceOptions(): CensusOptions {
  const exemptions = readJson<ProvenanceExemption[]>(exemptionsPath);
  validateExemptions(exemptions);
  return {
    cwd: repoRoot,
    files: sourceRoots.flatMap((root) =>
      sourceFiles(path.join(repoRoot, root))
    ),
    exemptions,
  };
}

function summarizeFailure(
  fresh: ProvenanceCensus,
  baseline: ProvenanceCensus,
): string {
  const baselineKeys = new Set(baseline.sites.map((site) => site.key));
  const newSites = fresh.sites.filter((site) => !baselineKeys.has(site.key));
  const lines = [
    "Provenance gate failed.",
    `Uncovered display sites: ${fresh.uncovered} (baseline ${baseline.uncovered}).`,
    `Exemptions: ${fresh.exempt} (baseline ${baseline.exempt}).`,
  ];
  if (newSites.length > 0) {
    lines.push("New display sites:");
    for (const site of newSites.slice(0, 20)) {
      lines.push(`  - ${site.key}`);
    }
  }
  lines.push(
    "Choose one: instrument the value with <Metric>, or add a categorized exemption with a written reason.",
    "If the change is intentional, run `npm run gate:provenance -- --record` and review the baseline diff.",
  );
  return lines.join("\n");
}

export function runGate(record = false): ProvenanceCensus {
  const fresh = collectCensus(sourceOptions());
  if (record) {
    fs.writeFileSync(baselinePath, stableJson(fresh));
    return fresh;
  }
  const baseline = readJson<ProvenanceCensus>(baselinePath);
  const failure = ratchetFailure(fresh, baseline);
  if (failure) {
    throw new Error(failure);
  }
  return fresh;
}

export function ratchetFailure(
  fresh: ProvenanceCensus,
  baseline: ProvenanceCensus,
): string | null {
  if (
    fresh.uncovered <= baseline.uncovered && fresh.exempt <= baseline.exempt &&
    stableJson(fresh) === stableJson(baseline)
  ) {
    return null;
  }
  return summarizeFailure(fresh, baseline);
}

if (process.argv[1]?.endsWith("provenance-gate.ts")) {
  try {
    const result = runGate(process.argv.includes("--record"));
    console.log(
      `Provenance census: total=${result.total} covered=${result.covered} exempt=${result.exempt} uncovered=${result.uncovered}`,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
