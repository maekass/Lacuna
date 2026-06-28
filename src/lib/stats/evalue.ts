/**
 * E-value sensitivity analysis for unmeasured confounding.
 *
 * Reference: Van der Weele & Ding (2017). "Sensitivity Analysis in
 * Observational Research: Introducing the E-Value." Annals of Internal
 * Medicine, 167(4), 268–274. doi:10.7326/M16-2607
 *
 * The E-value answers: "How strong would unmeasured confounding need to be —
 * on both the exposure–confounder and confounder–outcome paths — to fully
 * explain away the observed association?" Higher E-values indicate greater
 * robustness to unmeasured confounding.
 *
 * Supported scales:
 *   - Risk ratio (RR) — native input
 *   - Odds ratio (OR) — converted to approximate RR for rare outcome
 *   - Hazard ratio (HR) — treated as approximate RR
 *   - Standardised mean difference (Cohen's d) — converted via log-linear approx
 *
 * For the lower confidence bound E-value: a result is "robust" if even the
 * CI bound would require E-value > threshold (typically 2 or 3) to explain.
 */

export type EffectScale = "rr" | "or" | "hr" | "d";

export interface EValueInput {
  estimate: number;
  ciLower?: number;
  scale: EffectScale;
  /** Proportion of outcome in unexposed (for OR→RR conversion). Defaults to 0.1 (rare outcome). */
  prevalenceOutcome?: number;
}

export interface EValueResult {
  /** E-value for the point estimate */
  evalue: number;
  /** E-value for the CI lower bound (null if no CI provided) */
  evalueCI: number | null;
  /** Risk ratio used for internal calculation */
  rr: number;
  /** Interpretation tier */
  robustness: "strong" | "moderate" | "weak" | "negligible";
  interpretation: string;
  methodNote: string;
}

/** Compute E-value from a risk ratio ≥ 1. For RR < 1, caller should pass 1/RR. */
function evalueFromRR(rr: number): number {
  if (rr <= 1) return 1;
  return rr + Math.sqrt(rr * (rr - 1));
}

/** Convert OR to approximate RR when outcome prevalence p0 is known (Zhang & Yu 1998). */
function orToRR(or: number, p0: number): number {
  if (or <= 0 || p0 <= 0 || p0 >= 1) return or;
  return or / (1 - p0 + p0 * or);
}

/** Convert Cohen's d to approximate RR (log-linear approximation, Chinn 2000). */
function dToRR(d: number): number {
  // OR ≈ exp(π·d / √3); RR ≈ OR for rare outcomes ≈ exp(0.91·d)
  return Math.exp(0.91 * Math.abs(d));
}

function toRR(value: number, scale: EffectScale, p0 = 0.1): number {
  const abs = Math.abs(value);
  switch (scale) {
    case "rr":
    case "hr":
      return abs < 1 ? 1 / abs : abs;
    case "or":
      return orToRR(abs < 1 ? 1 / abs : abs, p0);
    case "d":
      return dToRR(abs);
  }
}

function robustnessLabel(ev: number): EValueResult["robustness"] {
  if (ev >= 4) return "strong";
  if (ev >= 2.5) return "moderate";
  if (ev >= 1.5) return "weak";
  return "negligible";
}

function interpretationText(ev: number, evCI: number | null, rr: number): string {
  const tier = robustnessLabel(ev);
  const ciLine = evCI !== null
    ? ` The CI lower bound E-value is ${evCI.toFixed(2)}, meaning even the conservative estimate requires unmeasured confounding of this magnitude.`
    : "";

  if (tier === "strong") {
    return `To explain away RR=${rr.toFixed(2)}, an unmeasured confounder would need ≥${ev.toFixed(1)}× association with both exposure and outcome simultaneously — a very high bar suggesting this finding is robust.${ciLine}`;
  }
  if (tier === "moderate") {
    return `To nullify RR=${rr.toFixed(2)}, unmeasured confounding of E-value=${ev.toFixed(2)} is required on both the exposure and outcome paths. Moderate robustness; common confounders (e.g. sector maturity) with RR ≈ 2–3 could plausibly explain this.${ciLine}`;
  }
  if (tier === "weak") {
    return `E-value=${ev.toFixed(2)} indicates weak robustness. A modest unmeasured confounder could explain away this association. Causal interpretation requires strong substantive justification.${ciLine}`;
  }
  return `E-value=${ev.toFixed(2)} ≈ 1 — the observed association is highly sensitive to even minimal unmeasured confounding. No causal claim is warranted.${ciLine}`;
}

/**
 * Compute E-value for a point estimate and optional confidence bound.
 *
 * @example
 * // Valuation sector gap expressed as RR
 * computeEValue({ estimate: 1.8, ciLower: 1.2, scale: "rr" })
 */
export function computeEValue(input: EValueInput): EValueResult {
  const { estimate, ciLower, scale, prevalenceOutcome = 0.1 } = input;

  const rr = toRR(estimate, scale, prevalenceOutcome);
  const ev = evalueFromRR(rr);

  let evCI: number | null = null;
  if (ciLower !== undefined) {
    const rrCI = toRR(ciLower, scale, prevalenceOutcome);
    evCI = rrCI <= 1 ? 1 : evalueFromRR(rrCI);
  }

  return {
    evalue: Math.round(ev * 100) / 100,
    evalueCI: evCI !== null ? Math.round(evCI * 100) / 100 : null,
    rr: Math.round(rr * 100) / 100,
    robustness: robustnessLabel(ev),
    interpretation: interpretationText(ev, evCI, rr),
    methodNote:
      "Van der Weele & Ding (2017). Ann Intern Med 167(4):268–274. E-value = RR + √(RR×(RR−1)).",
  };
}
