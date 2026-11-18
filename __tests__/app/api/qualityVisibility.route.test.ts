import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/quality/visibility/route";
import { getQualityVisibility } from "@/lib/data/qualityVisibilityProvider";

describe("GET /api/quality/visibility", () => {
  it("returns the slim measurement-layer census", async () => {
    const response = GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual(getQualityVisibility());
    expect(body.metrics.published).toBe(4);
    // Basis-gated funding ratios are withheld; acquirers left with no admitted
    // denominator no longer register a per-acquirer row (221 -> 209 total).
    expect(body.metrics.withheld).toBe(205);
    expect(body.premiums.reproducible).toBe(body.premiums.computed);
  });
});
