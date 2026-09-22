import { describe, expect, it } from "vitest";
import {
  INDICATOR_BAND_HIGH,
  INDICATOR_BAND_MODERATE,
  indicatorBand,
} from "@/lib/quant/indicatorBands";

describe("indicatorBand", () => {
  it("uses the documented cut points", () => {
    expect(INDICATOR_BAND_MODERATE).toBe(0.25);
    expect(INDICATOR_BAND_HIGH).toBe(0.5);
    expect(indicatorBand(0)).toBe("Low");
    expect(indicatorBand(0.24)).toBe("Low");
    expect(indicatorBand(0.25)).toBe("Moderate");
    expect(indicatorBand(0.49)).toBe("Moderate");
    expect(indicatorBand(0.5)).toBe("High");
    expect(indicatorBand(1)).toBe("High");
  });
});
