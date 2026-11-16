import { createHash } from "node:crypto";

/** SHA-256 hex digest of a UTF-8 string. */
export function sha256Text(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/**
 * Content addressed by the retriever. Passage text is hashed when stored.
 * Link-only records hash identity metadata because they have no body.
 */
export function passageContentBasis(input: {
  text?: string;
  sourceId: string;
  locator: string;
  retrievedAt: string;
}): string {
  if (input.text && input.text.length > 0) return input.text;
  return [input.sourceId, input.locator, input.retrievedAt].join("|");
}
