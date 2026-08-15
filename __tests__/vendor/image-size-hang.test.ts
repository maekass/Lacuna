import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { imageSize } from "../../vendor/image-size/dist/index.mjs";

const vendorRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../vendor/image-size",
);

/** Decode a compact hex payload so Deno fmt does not explode byte lists. */
function hexBytes(hex: string): Uint8Array {
  const clean = hex.replace(/\s+/g, "");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

/** Published ICNS PoC: entry length 0 (GHSA-w3rx-r6r6-pgpr). */
const ICNS_ZERO_ENTRY = hexBytes(
  "69636e73 00000010 69733332 00000000",
);

/** Published HEIF PoC: ispe box size 0 (GHSA-5p2g-fcmc-qvqq). */
const HEIF_ZERO_ISPE = hexBytes(
  "00000010 66747970 61766966 00000000" +
    "00000024 6d657461 00000000" +
    "00000008 69707270" +
    "00000014 6970636f" +
    "00000000 69737065 00000000 00000000 00000000 00000000",
);

/** JXL container with a jxlp box of size 0 (GHSA-5p2g-fcmc-qvqq). */
const JXL_ZERO_JXLP = hexBytes(
  "0000000c 4a584c20 0d0a870a" +
    "00000014 66747970 6a786c20 00000000 6a786c20" +
    "00000000 6a786c70",
);

describe("vendored image-size hang guards", () => {
  it("is versioned 2.0.3 so audit ranges <=2.0.2 resolve", () => {
    const pkg = JSON.parse(
      readFileSync(path.join(vendorRoot, "package.json"), "utf8"),
    ) as { version: string };
    expect(pkg.version).toBe("2.0.3");
  });

  it("does not hang on ICNS entry length 0 (GHSA-w3rx-r6r6-pgpr)", () => {
    expect(() => imageSize(ICNS_ZERO_ENTRY)).not.toThrow();
  }, 2_000);

  it("does not hang on HEIF ispe size 0 (GHSA-5p2g-fcmc-qvqq)", () => {
    expect(() => imageSize(HEIF_ZERO_ISPE)).not.toThrow();
  }, 2_000);

  it("does not hang on JXL jxlp size 0 (GHSA-5p2g-fcmc-qvqq)", () => {
    expect(() => imageSize(JXL_ZERO_JXLP)).toThrow();
  }, 2_000);
});
