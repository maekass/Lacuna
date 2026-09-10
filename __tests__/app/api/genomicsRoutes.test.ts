import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/genomics/variantStoreGuard", () => ({
  requireVariantStore: vi.fn(),
  variantStoreDisabledResponse: vi.fn(),
}));

vi.mock("@/lib/compliance/patientDataGovernance", () => ({
  requirePatientDataAccess: vi.fn(() => null),
  getPatientDataAccessMode: vi.fn(() => "de_identified"),
  redactCallsetFields: vi.fn((c: { callsetId: string }) => c),
}));

vi.mock("@/lib/genomics/variantQueries", () => ({
  listCallsets: vi.fn(),
  listVariants: vi.fn(),
  getCallsetById: vi.fn(),
}));

describe("genomics API", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("callsets returns 503 when variant store disabled (edge)", async () => {
    const { requireVariantStore } = await import(
      "@/lib/genomics/variantStoreGuard"
    );
    const { NextResponse } = await import("next/server");
    vi.mocked(requireVariantStore).mockReturnValue(
      NextResponse.json({ error: "Variant store disabled" }, { status: 503 }),
    );

    const { GET } = await import("@/app/api/genomics/callsets/route");
    const response = await GET(
      new Request("http://localhost/api/genomics/callsets"),
    );
    expect(response.status).toBe(503);
  });

  it("variants requires callsetId or gene (error)", async () => {
    const { requireVariantStore } = await import(
      "@/lib/genomics/variantStoreGuard"
    );
    vi.mocked(requireVariantStore).mockReturnValue(null);

    const { GET } = await import("@/app/api/genomics/variants/route");
    const response = await GET(
      new Request("http://localhost/api/genomics/variants"),
    );
    expect(response.status).toBe(400);
  });

  it("variants returns paginated rows (success)", async () => {
    const { requireVariantStore } = await import(
      "@/lib/genomics/variantStoreGuard"
    );
    const { listVariants } = await import("@/lib/genomics/variantQueries");
    vi.mocked(requireVariantStore).mockReturnValue(null);
    vi.mocked(listVariants).mockResolvedValue({
      variants: [
        {
          callsetId: "demo",
          chrom: "17",
          pos: 1,
          ref: "G",
          alt: "A",
          qual: 99,
          filter: "PASS",
          geneSymbol: "BRCA1",
          consequence: "missense_variant",
          alleleFrequency: 0.001,
          isPathogenic: true,
        },
      ],
      meta: { callsetId: "demo", limit: 100, offset: 0, total: 1 },
    });

    const { GET } = await import("@/app/api/genomics/variants/route");
    const response = await GET(
      new Request("http://localhost/api/genomics/variants?callsetId=demo"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.variants).toHaveLength(1);
    expect(body.variants[0].geneSymbol).toBe("BRCA1");
  });

  it("rate-limits before writing a patient-data audit (success)", async () => {
    const files = [
      "src/app/api/genomics/variants/route.ts",
      "src/app/api/genomics/callsets/route.ts",
      "src/app/api/genomics/callsets/[callsetId]/object/route.ts",
    ];
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    for (const relative of files) {
      const source = readFileSync(resolve(process.cwd(), relative), "utf8");
      const rateLimitAt = source.indexOf("enforceRateLimit");
      const auditAt = source.indexOf("requirePatientDataAccess");
      expect(rateLimitAt).toBeGreaterThan(-1);
      expect(auditAt).toBeGreaterThan(-1);
      expect(rateLimitAt).toBeLessThan(auditAt);
    }
  });
});
