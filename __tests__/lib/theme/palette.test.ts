import { describe, expect, it } from "vitest";
import {
  LACUNA_GRADIENT,
  LACUNA_PALETTE,
  LACUNA_SECTOR_COLORS,
} from "@/lib/theme/palette";

const HEX = /^#[0-9A-Fa-f]{6}$/;

describe("LACUNA_PALETTE", () => {
  it("defines four brand hex colors (success)", () => {
    for (const color of Object.values(LACUNA_PALETTE)) {
      expect(color).toMatch(HEX);
    }
  });

  it("maps core verified sectors to palette colors (edge)", () => {
    expect(LACUNA_SECTOR_COLORS.Fertility).toBe(
      LACUNA_PALETTE.transcendentPink,
    );
    expect(LACUNA_SECTOR_COLORS["Mental Health"]).toBe(
      LACUNA_PALETTE.softLavender,
    );
    expect(LACUNA_SECTOR_COLORS.Wearables).toBe(LACUNA_PALETTE.deepPlum);
    expect(LACUNA_SECTOR_COLORS["Pelvic Health"]).toMatch(HEX);
  });

  it("builds gradient from palette tokens (success)", () => {
    expect(LACUNA_GRADIENT).toContain(LACUNA_PALETTE.transcendentPink);
    expect(LACUNA_GRADIENT).toContain("linear-gradient");
  });
});
