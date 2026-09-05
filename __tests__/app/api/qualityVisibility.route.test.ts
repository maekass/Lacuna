import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/quality/visibility/route";
import { getQualityVisibility } from "@/lib/data/qualityVisibilityProvider";

describe("GET /api/quality/visibility", () => {
  it("returns the slim measurement-layer census", async () => {
    const response = GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual(getQualityVisibility());
    expect(body.metrics.published).toBe(7);
    expect(body.metrics.withheld).toBe(214);
    expect(body.premiums.reproducible).toBe(body.premiums.computed);
  });
});
