import { expect, test } from "@playwright/test";
import { METRIC_REGISTRY } from "../src/lib/lineage/registry";

test("valuation matrix exposes resolvable metric provenance", async ({ page }) => {
  await page.goto("/deals#matrix");
  const triggers = page.locator("#matrix [data-provenance-class]");
  await expect(triggers.first()).toBeVisible();

  const nodes = await triggers.evaluateAll((elements) =>
    elements.map((element) => ({
      id: element.getAttribute("data-metric-id"),
      provenanceClass: element.getAttribute("data-provenance-class"),
      model: element.getAttribute("data-provenance-model"),
    }))
  );
  const registryIds = new Set(Object.keys(METRIC_REGISTRY));
  expect(nodes.length).toBeGreaterThan(0);
  for (const node of nodes) {
    expect(["measured", "withheld", "proxy", "assumption"]).toContain(
      node.provenanceClass,
    );
    if (
      node.provenanceClass === "measured" ||
      node.provenanceClass === "withheld"
    ) {
      expect(node.id).not.toBeNull();
      expect(registryIds.has(node.id ?? "")).toBe(true);
    } else {
      expect(node.id).toBeNull();
      expect(node.model).not.toBeNull();
      expect(node.model).not.toBe("");
    }
  }
});
