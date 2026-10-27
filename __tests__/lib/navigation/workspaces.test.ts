import { describe, expect, it } from "vitest";
import { sectionsForPath, workspaceForPath } from "@/lib/navigation/workspaces";

describe("sectionsForPath", () => {
  it("returns the deals outline on the workspace root", () => {
    expect(sectionsForPath("/deals").map((section) => section.id)).toContain(
      "network",
    );
    expect(sectionsForPath("/deals/").map((section) => section.id)).toContain(
      "network",
    );
  });

  it("hides the outline on nested deal routes", () => {
    expect(workspaceForPath("/deals/deal1")?.slug).toBe("deals");
    expect(sectionsForPath("/deals/deal1")).toEqual([]);
    expect(sectionsForPath("/deals/staging/deal1")).toEqual([]);
  });

  it("hides the outline on nested research routes", () => {
    expect(workspaceForPath("/research/biotheranostics")?.slug).toBe(
      "research",
    );
    expect(sectionsForPath("/research/biotheranostics")).toEqual([]);
    expect(sectionsForPath("/")).toEqual([]);
  });
});
