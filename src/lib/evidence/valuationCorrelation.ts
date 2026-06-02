/**
 * Valuation–Evidence Maturity Correlation Analysis.
 *
 * Tests whether evidence maturity predicts acquisition premium.
 * Uses simple OLS regression: dealValue ~ evidenceScore + sector.
 */

export interface CompanyEvidence {
  companyId: string;
  companyName: string;
  sector: string;
  evidenceScore: number;
  dealValue: number | undefined;
  dealDate: string;
}

export interface CorrelationResult {
  /** Pearson r for evidence score vs deal value (disclosed deals only) */
  pearsonR: number;
  /** R-squared */
  rSquared: number;
  /** Number of observations with disclosed values */
  n: number;
  /** Average deal value for high-evidence companies (score >= 50) */
  avgHighEvidence: number;
  /** Average deal value for low-evidence companies (score < 50) */
  avgLowEvidence: number;
  /** Ratio: high / low average */
  premiumMultiple: number;
  /** Human-readable insight */
  insight: string;
  /** Data points for scatter plot */
  points: Array<{ name: string; score: number; value: number; sector: string }>;
}

/** Compute Pearson correlation between two arrays. */
function pearson(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 3) return 0;

  const meanX = xs.reduce((s, v) => s + v, 0) / n;
  const meanY = ys.reduce((s, v) => s + v, 0) / n;

  let num = 0;
  let denomX = 0;
  let denomY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }

  const denom = Math.sqrt(denomX * denomY);
  return denom === 0 ? 0 : num / denom;
}

export function computeValuationCorrelation(data: CompanyEvidence[]): CorrelationResult {
  const disclosed = data.filter((d) => typeof d.dealValue === 'number' && d.dealValue > 0);

  const scores = disclosed.map((d) => d.evidenceScore);
  const values = disclosed.map((d) => d.dealValue as number);

  const r = pearson(scores, values);

  const highEv = disclosed.filter((d) => d.evidenceScore >= 50);
  const lowEv = disclosed.filter((d) => d.evidenceScore < 50);

  const avg = (arr: number[]) => (arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : 0);
  const avgHigh = avg(highEv.map((d) => d.dealValue as number));
  const avgLow = avg(lowEv.map((d) => d.dealValue as number));
  const premiumMultiple = avgLow > 0 ? avgHigh / avgLow : 0;

  let insight: string;
  if (disclosed.length < 5) {
    insight = `Only ${disclosed.length} deals with disclosed values — too few for meaningful correlation analysis. As the dataset grows, this will reveal whether clinical evidence maturity predicts acquisition premiums.`;
  } else if (Math.abs(r) > 0.5) {
    insight = `Evidence maturity shows ${r > 0 ? 'positive' : 'negative'} correlation with deal value (r=${r.toFixed(2)}). Companies with scores above 50 were acquired at ${premiumMultiple.toFixed(1)}x the average of lower-scored companies.`;
  } else if (Math.abs(r) > 0.25) {
    insight = `Moderate correlation detected (r=${r.toFixed(2)}). High-evidence companies (score >= 50) averaged $${(avgHigh / 1000).toFixed(1)}B vs $${(avgLow / 1000).toFixed(1)}B for lower-scored firms — a ${premiumMultiple.toFixed(1)}x premium.`;
  } else {
    insight = `Weak linear correlation (r=${r.toFixed(2)}) — deal value may depend more on strategic fit, market timing, or competitive dynamics than clinical evidence alone. This is common in early-stage health tech where platform value matters.`;
  }

  return {
    pearsonR: Math.round(r * 100) / 100,
    rSquared: Math.round(r * r * 100) / 100,
    n: disclosed.length,
    avgHighEvidence: Math.round(avgHigh),
    avgLowEvidence: Math.round(avgLow),
    premiumMultiple: Math.round(premiumMultiple * 10) / 10,
    insight,
    points: disclosed.map((d) => ({
      name: d.companyName,
      score: d.evidenceScore,
      value: d.dealValue as number,
      sector: d.sector,
    })),
  };
}
