/**
 * Numerical special functions shared by the statistics modules.
 */

const LANCZOS_COEFFICIENTS = [
  76.18009172947146,
  -86.50532032941677,
  24.01409824083091,
  -1.231739572450155,
  1.208650973866179e-3,
  -5.395239384953e-6,
];

/**
 * Natural log of the gamma function (Lanczos approximation, g=5, n=6).
 * Accurate to ~1e-10 relative error for z > 0.
 */
export function logGamma(z: number): number {
  const x = z;
  let y = z;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (const c of LANCZOS_COEFFICIENTS) {
    y++;
    ser += c / y;
  }
  return -tmp + Math.log(2.5066282746310005 * ser / x);
}

/** Natural log of the beta function, B(a, b). */
export function logBeta(a: number, b: number): number {
  return logGamma(a) + logGamma(b) - logGamma(a + b);
}
