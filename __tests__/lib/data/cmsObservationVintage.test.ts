import { describe, expect, it } from "vitest";
import { selectLatestVintageObservations } from "@/lib/data/cmsObservationVintage";

describe("selectLatestVintageObservations", () => {
  it("does not sum multiple CMS years into one annual total", () => {
    const selected = selectLatestVintageObservations([
      { cptCode: "59400", dataYear: 2023, totalServices: 100 },
      { cptCode: "59400", dataYear: 2024, totalServices: 40 },
      { cptCode: "59510", dataYear: 2024, totalServices: 10 },
    ]);

    expect(selected.vintage).toBe(2024);
    expect(selected.droppedOlderYearCount).toBe(1);
    expect(selected.rows).toHaveLength(2);
    expect(selected.rows.map((row) => row.cptCode).sort()).toEqual([
      "59400",
      "59510",
    ]);
    expect(
      selected.rows.find((row) => row.cptCode === "59400")?.totalServices,
    ).toBe(40);
  });

  it("keeps the first observation when a vintage has duplicate codes", () => {
    const selected = selectLatestVintageObservations([
      { cptCode: "59400", dataYear: 2024, totalServices: 10 },
      { cptCode: "59400", dataYear: 2024, totalServices: 99 },
    ]);

    expect(selected.droppedDuplicateCodeCount).toBe(1);
    expect(selected.rows).toEqual([
      { cptCode: "59400", dataYear: 2024, totalServices: 10 },
    ]);
  });
});
