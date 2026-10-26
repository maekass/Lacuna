export interface RnpvStage { name: string; years: number; probability: number; cost: number; }
export interface RnpvScenario { discount: number; peakSales: number; margin: number; tax: number; commercialYears: number; rampYears: number; plateauYears: number; decline: number; upfront: number; launchCost: number; stages: RnpvStage[]; }
export interface MonteCarloSettings { iterations: number; seed: number; financialSpread: number; probabilitySpread: number; }
export const RNPV_MODEL_VERSION = "native-rnpv-0.1.0";
/** Validate a standalone analyst scenario; amounts are USD millions. */
export function validateScenario(s: RnpvScenario): void {
  const fractions = [s.discount, s.margin, s.tax, s.decline];
  if (fractions.some((v) => !Number.isFinite(v) || v < 0 || v > 1)) throw new Error("Rates must be finite fractions between zero and one.");
  if ([s.peakSales, s.upfront, s.launchCost].some((v) => !Number.isFinite(v) || v < 0 || v > 1000000)) throw new Error("Amounts must be between zero and 1,000,000 USD millions.");
  if ([s.commercialYears, s.rampYears, s.plateauYears].some((v) => !Number.isInteger(v) || v < 1 || v > 40)) throw new Error("Year counts must be integers from 1 to 40.");
  if (s.stages.length > 8) throw new Error("At most eight stages are allowed.");
  for (const stage of s.stages) {
    if (!stage.name.trim() || !Number.isInteger(stage.years) || stage.years < 1 || stage.years > 15 || !Number.isFinite(stage.probability) || stage.probability < 0 || stage.probability > 1 || !Number.isFinite(stage.cost) || stage.cost < 0 || stage.cost > 1000000) throw new Error("Invalid development stage.");
  }
}
function commercialPv(s: RnpvScenario, launch: number): number {
  let value = 0;
  for (let k = 1; k <= s.commercialYears; k++) {
    const factor = k <= s.rampYears ? k / s.rampYears : k <= s.rampYears + s.plateauYears ? 1 : (1 - s.decline) ** (k - s.rampYears - s.plateauYears);
    value += s.peakSales * factor * s.margin * (1 - s.tax) / (1 + s.discount) ** (launch + k);
  }
  return value;
}
/** Expected cash flows: stage costs are weighted by stage-entry probability. */
export function calculateRnpv(s: RnpvScenario) {
  validateScenario(s);
  let reach = 1; let year = 0; let costs = s.upfront;
  for (const stage of s.stages) {
    for (let k = 0; k < stage.years; k++) { year++; costs += reach * stage.cost / stage.years / (1 + s.discount) ** year; }
    reach *= stage.probability;
  }
  costs += reach * s.launchCost / (1 + s.discount) ** year;
  const proceeds = reach * commercialPv(s, year);
  return { rnpv: proceeds - costs, approvalProbability: reach, developmentYears: year, expectedCostPv: costs, expectedCommercialPv: proceeds };
}
/** Reproducible non-cryptographic PRNG with an explicit uint32 seed. */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => { state = (state + 0x6d2b79f5) >>> 0; let t = state; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function quantile(sorted: number[], p: number): number {
  const x = (sorted.length - 1) * p; const i = Math.floor(x); const f = x - i;
  return sorted[i] + (sorted[Math.min(i + 1, sorted.length - 1)] - sorted[i]) * f;
}
/** Simulate realized development paths. Do not probability-weight sampled cash flows again. */
export function simulateRnpv(s: RnpvScenario, settings: MonteCarloSettings) {
  validateScenario(s);
  if (!Number.isInteger(settings.iterations) || settings.iterations < 100 || settings.iterations > 10000) throw new Error("Use 100 to 10,000 iterations.");
  if (!Number.isInteger(settings.seed) || settings.seed < 0 || settings.seed > 4294967295) throw new Error("Seed must be a uint32 integer.");
  if ([settings.financialSpread, settings.probabilitySpread].some((v) => !Number.isFinite(v) || v < 0 || v > 1)) throw new Error("Spreads must be between zero and one.");
  const random = seededRandom(settings.seed);
  const scale = (value: number) => value * (1 + (2 * random() - 1) * settings.financialSpread);
  const samples: number[] = []; let approvals = 0; let negative = 0;
  for (let i = 0; i < settings.iterations; i++) {
    const sampled: RnpvScenario = { ...s, discount: Math.min(1, scale(s.discount)), peakSales: scale(s.peakSales), launchCost: scale(s.launchCost), stages: s.stages.map((stage) => ({ ...stage, cost: scale(stage.cost), probability: stage.probability === 0 || stage.probability === 1 ? stage.probability : Math.min(1, Math.max(0, stage.probability + (2 * random() - 1) * settings.probabilitySpread)) })) };
    let npv = -s.upfront; let year = 0; let alive = true;
    for (const stage of sampled.stages) {
      for (let k = 0; k < stage.years; k++) { year++; npv -= stage.cost / stage.years / (1 + sampled.discount) ** year; }
      if (random() >= stage.probability) { alive = false; break; }
    }
    if (alive) { approvals++; npv += commercialPv(sampled, year) - sampled.launchCost / (1 + sampled.discount) ** year; }
    if (npv < 0) negative++;
    samples.push(npv);
  }
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
  const variance = samples.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (samples.length - 1);
  const standardError = Math.sqrt(variance / samples.length);
  const sorted = [...samples].sort((a, b) => a - b);
  return { modelVersion: RNPV_MODEL_VERSION, settings: { ...settings }, mean, standardError, meanInterval95: [mean - 1.96 * standardError, mean + 1.96 * standardError], p10: quantile(sorted, 0.1), median: quantile(sorted, 0.5), p90: quantile(sorted, 0.9), negativeProbability: negative / samples.length, approvalFrequency: approvals / samples.length, samples };
}
