import { afterEach, describe, expect, it, vi } from "vitest";
import { buildObjectUri, resolveObjectUri } from "@/lib/genomics/objectStorage";

describe("objectStorage", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("builds local file URI by default (success)", () => {
    vi.stubEnv("LACUNA_OBJECT_STORAGE", "local");
    vi.stubEnv("LACUNA_OBJECT_STORAGE_LOCAL_ROOT", "data/variants");

    expect(buildObjectUri("demo/sample.vcf.gz")).toContain("file://");
    expect(buildObjectUri("demo/sample.vcf.gz")).toContain(
      "data/variants/demo/sample.vcf.gz",
    );
  });

  it("builds s3 URI when configured (success)", () => {
    vi.stubEnv("LACUNA_OBJECT_STORAGE", "s3");
    vi.stubEnv("LACUNA_S3_BUCKET", "lacuna-variants");

    expect(buildObjectUri("cohort-a/sample.vcf.gz")).toBe(
      "s3://lacuna-variants/cohort-a/sample.vcf.gz",
    );
  });

  it("resolves existing s3 scheme unchanged (edge)", () => {
    const ref = resolveObjectUri("s3://bucket/path.vcf.gz");
    expect(ref.backend).toBe("s3");
    expect(ref.uri).toBe("s3://bucket/path.vcf.gz");
  });
});
