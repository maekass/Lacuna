/** Polite delay between upstream calls (SEC fair-access, NCBI, openFDA). */

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const DELAY_MS = {
  sec: 120,
  openFda: 300,
  ncbi: 350,
  default: 200,
} as const;
