import { describe, expect, it } from "vitest";
import { secureEquals } from "@/lib/infra/secureCompare";

describe("secureEquals", () => {
  it("matches identical secrets (success)", () => {
    expect(secureEquals("s3cr3t", "s3cr3t")).toBe(true);
  });

  it("rejects different secrets (error)", () => {
    expect(secureEquals("s3cr3t", "s3cr3u")).toBe(false);
    expect(secureEquals("s3cr3t", "s3cr3t-longer")).toBe(false);
  });

  it("rejects empty or missing values (edge)", () => {
    expect(secureEquals("", "")).toBe(false);
    expect(secureEquals(null, "s3cr3t")).toBe(false);
    expect(secureEquals("s3cr3t", undefined)).toBe(false);
  });
});
