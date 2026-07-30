import { timingSafeEqual } from "node:crypto";
import { Buffer } from "node:buffer";

/** Constant-time string comparison for secrets (API keys, bearer tokens). */
export function secureEquals(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  if (!a || !b) return false;

  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;

  try {
    return timingSafeEqual(left, right);
  } catch {
    return false;
  }
}
