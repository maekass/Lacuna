/**
 * Shared numerical primitives used by statistical analyses.
 *
 * `normalQuantile` uses the Acklam rational approximation, with maximum
 * absolute error below 1.15e-9 over the central probability range.
 * `normalCdf` and `erf` use Abramowitz–Stegun rational approximations.
 */

export { logGamma } from "./specialFunctions";

/** Standard normal cumulative distribution function. */
export function normalCdf(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const y = t *
    (0.319381530 +
      t * (-0.356563782 +
          t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  const phi = (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * x * x) * y;
  return x >= 0 ? 1 - phi : phi;
}

/** Inverse standard normal CDF (probit), using Acklam's approximation. */
export function normalQuantile(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  const a = [
    -3.969683028665376e1,
    2.209460984245205e2,
    -2.759285104469687e2,
    1.38357751867269e2,
    -3.066479806614716e1,
    2.506628277459239,
  ];
  const b = [
    -5.447609879822406e1,
    1.615858368580409e2,
    -1.556989798598866e2,
    6.680131188771972e1,
    -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3,
    -3.223964580411365e-1,
    -2.400758277161838,
    -2.549732539343734,
    4.374664141464968,
    2.938163982698783,
  ];
  const d = [
    7.784695709041462e-3,
    3.224671290700398e-1,
    2.445134137142996,
    3.754408661907416,
  ];
  const pLow = 0.02425;
  const pHigh = 1 - pLow;
  if (p < pLow) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q +
      c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p <= pHigh) {
    const q = p - 0.5;
    const r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r +
      a[5]) *
      q /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }
  const q = Math.sqrt(-2 * Math.log(1 - p));
  return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q +
    c[5]) /
    ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
}

/** Error function approximation. */
export function erf(value: number): number {
  const sign = value >= 0 ? 1 : -1;
  const x = Math.abs(value);
  const t = 1 / (1 + 0.3275911 * x);
  let polynomial = 1.061405429;
  polynomial = polynomial * t - 1.453152027;
  polynomial = polynomial * t + 1.421413741;
  polynomial = polynomial * t - 0.284496736;
  polynomial = polynomial * t + 0.254829592;
  polynomial *= t;
  const y = 1 - polynomial * Math.exp(-x * x);
  return sign * y;
}
