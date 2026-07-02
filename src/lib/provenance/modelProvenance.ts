/** Links a displayed metric to its quantitative source module. */
export interface ModelProvenance {
  /** Repo-relative path, e.g. `src/lib/data/computeHeadlineStats.ts`. */
  module: string;
  /** Primary exported function or constant driving the number. */
  exportName?: string;
  /** One-line definition of how the value is computed. */
  definition: string;
}

export const LACUNA_GITHUB_BASE = "https://github.com/maekass/Lacuna/blob/main";

/** GitHub URL for a repo-relative source file (optional line anchor). */
export function modelSourceHref(module: string, line?: number): string {
  const path = module.replace(/^\//, "");
  return line
    ? `${LACUNA_GITHUB_BASE}/${path}#L${line}`
    : `${LACUNA_GITHUB_BASE}/${path}`;
}

/** Compact single-line label for tooltips and footnotes. */
export function formatModelProvenanceLine(model: ModelProvenance): string {
  const fn = model.exportName ? ` · ${model.exportName}()` : "";
  return `Derived${fn} · ${model.module}`;
}
