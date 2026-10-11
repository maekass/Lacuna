import { describe, expect, it } from "vitest";
import {
  barHeight,
  buildGrid,
  camera,
  clamp01,
  computeStats,
  DAY_MS,
  dayMs,
  generateContributions,
  lerp,
  levelOf,
  monthLabels,
  PALETTES,
  project,
  resolvePalette,
  riseAt,
  toKey,
  WAVE,
} from "@/lib/contributions/skyline";

describe("contribution skyline maths", () => {
  it("clamps, interpolates, and keys UTC midnights", () => {
    expect(clamp01(-2)).toBe(0);
    expect(clamp01(0.4)).toBe(0.4);
    expect(clamp01(2)).toBe(1);
    expect(lerp(10, 20, 0.5)).toBe(15);
    expect(toKey(Date.UTC(2017, 10, 8))).toBe("2017-11-08");
    expect(dayMs("2017-11-08")).toBe(Date.UTC(2017, 10, 8));
    expect(dayMs(Date.UTC(2017, 10, 8) + 3_600_000)).toBe(
      Date.UTC(2017, 10, 8),
    );
  });

  it("generates a deterministic seeded year", () => {
    const end = dayMs("2017-11-08");
    const a = generateContributions(end, 7);
    const b = generateContributions(end, 7);
    const other = generateContributions(end, 11);
    expect(a).toHaveLength(371);
    expect(a).toEqual(b);
    expect(a).not.toEqual(other);
    expect(a[0]?.date).toBe(toKey(end - 370 * DAY_MS));
    expect(a[a.length - 1]?.date).toBe("2017-11-08");
    expect(a.some((day) => day.count > 0)).toBe(true);
  });

  it("builds a week grid with 95th-percentile levels", () => {
    const end = dayMs("2017-11-08");
    const data = [
      { date: "2017-11-08", count: 10 },
      { date: "2017-11-07", count: 1 },
      { date: "2017-11-08", count: 2 },
    ];
    const grid = buildGrid(data, end, 0);
    expect(grid.weeks).toBeGreaterThan(50);
    expect(grid.max).toBe(12);
    const last = grid.cells[grid.cells.length - 1];
    expect(last?.date).toBe("2017-11-08");
    expect(last?.count).toBe(12);
    expect(last?.level).toBeGreaterThan(0);
    expect(grid.cells.filter((cell) => cell.count === 0).length)
      .toBeGreaterThan(
        300,
      );
    expect(grid.cells.every((cell) => cell.day >= 0 && cell.day <= 6)).toBe(
      true,
    );
  });

  it("maps empty days to level 0 and busy days to 4", () => {
    expect(levelOf(0, 10)).toBe(0);
    expect(levelOf(1, 0)).toBe(4);
    expect(levelOf(10, 10)).toBe(4);
    expect(levelOf(1, 10)).toBe(1);
  });

  it("computes totals, busiest day, and streaks", () => {
    const cells = [
      { date: "2017-11-01", count: 1, level: 1, week: 0, day: 0 },
      { date: "2017-11-02", count: 2, level: 1, week: 0, day: 1 },
      { date: "2017-11-03", count: 0, level: 0, week: 0, day: 2 },
      { date: "2017-11-04", count: 4, level: 2, week: 0, day: 3 },
      { date: "2017-11-05", count: 5, level: 2, week: 0, day: 4 },
      { date: "2017-11-06", count: 3, level: 1, week: 0, day: 5 },
    ];
    const stats = computeStats(cells);
    expect(stats.total).toBe(15);
    expect(stats.first).toBe("2017-11-01");
    expect(stats.last).toBe("2017-11-06");
    expect(stats.busiest).toEqual({ count: 5, date: "2017-11-05" });
    expect(stats.longest).toEqual({
      days: 3,
      start: "2017-11-04",
      end: "2017-11-06",
    });
    expect(stats.current).toEqual({
      days: 3,
      start: "2017-11-04",
      end: "2017-11-06",
    });
  });

  it("labels months and drops a cramped first label", () => {
    const end = dayMs("2017-11-08");
    const grid = buildGrid(generateContributions(end, 7), end, 0);
    const labels = monthLabels(grid.cells, grid.weeks);
    expect(labels.length).toBeGreaterThan(8);
    expect(labels.every((label) => label.label.length > 0)).toBe(true);
    expect(labels[0]?.week).toBeGreaterThanOrEqual(0);
  });

  it("keeps empty bars thin and the busiest bar near 7.6 cells", () => {
    expect(barHeight(0, 10)).toBe(0.2);
    expect(barHeight(10, 10)).toBeCloseTo(7.6, 5);
    expect(riseAt(0, 0, 53, 0)).toBe(0);
    expect(riseAt(1, 52, 53, 6)).toBe(1);
    expect(WAVE).toBe(0.42);
  });

  it("looks straight down at e=0 and isometric at e=1", () => {
    const flat = camera(0);
    expect(flat.sn).toBeCloseTo(0, 8);
    expect(flat.ce).toBeCloseTo(0, 8);
    const iso = camera(1);
    expect(iso.sn).toBeGreaterThan(0.6);
    expect(iso.ce).toBeGreaterThan(0.7);
    const [x, y] = project(flat, 3, 2, 9);
    expect(x).toBeCloseTo(3, 8);
    expect(y).toBeCloseTo(2, 8);
  });

  it("resolves named, custom, and incomplete palettes", () => {
    expect(resolvePalette("ocean", false)).toEqual(PALETTES.ocean.light);
    expect(resolvePalette("ocean", true)).toEqual(PALETTES.ocean.dark);
    expect(resolvePalette(["#111", "#222", "#333", "#444"], false)).toEqual([
      "#111",
      "#222",
      "#333",
      "#444",
    ]);
    expect(resolvePalette(["#abc"], true)[3]).toBe("#abc");
    expect(resolvePalette(undefined, false)).toEqual(PALETTES.github.light);
  });
});
