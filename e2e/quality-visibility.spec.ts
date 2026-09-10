import { expect, test } from "@playwright/test";

test.describe("measurement layer visibility", () => {
  test("intelligence replaces the invented pipeline panel", async ({ page }) => {
    await page.goto("/intelligence");
    await expect(
      page.getByRole("heading", { name: /Measurement layer/i }),
    ).toBeVisible();
    await expect(page.getByText(/Published/)).toBeVisible();
    await expect(page.getByText(/Withheld/)).toBeVisible();
    await expect(page.getByText(/computedPremium/i)).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Data Pipeline Status/i }),
    ).toBeVisible();
    await expect(page.getByText(/Not configured \(static dataset\)/i))
      .toBeVisible();
    await expect(page.getByText("Avg Stage Duration")).toHaveCount(0);
    await expect(page.getByText("Success Rate", { exact: true })).toHaveCount(
      0,
    );
    const published = page.getByRole("button", {
      name: "Why this number: Published gated metrics",
    });
    await expect(published).toHaveAttribute(
      "data-provenance-class",
      "assumption",
    );
    await expect(published).toContainText("7");
    await expect(
      page.getByRole("button", { name: "Why this number: Withheld metrics" }),
    ).toContainText("214");
    const layerOpacity = await page
      .getByRole("heading", { name: /Measurement layer/i })
      .evaluate((el) => {
        const section = el.closest("section");
        return section ? getComputedStyle(section).opacity : "";
      });
    expect(layerOpacity).toBe("1");
  });

  test("methods leads with the weakest quality grades", async ({ page }) => {
    await page.goto("/methods#data-quality");
    await expect(page.getByText(/62 of 150/i)).toBeVisible();
    await expect(page.getByText(/41\.3%/)).toBeVisible();
    await expect(page.getByText(/D or F/i)).toBeVisible();
  });

  test("deals and consumer show the census under coverage", async ({ page }) => {
    await page.goto("/deals");
    await expect(
      page.getByRole("heading", { name: /What Our Data Covers/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Measurement layer/i }),
    ).toBeVisible();
    const companies = page.getByRole("button", {
      name: "Why this number: Companies",
      exact: true,
    });
    await expect(companies).toHaveAttribute(
      "data-provenance-class",
      "assumption",
    );
    await expect(page.getByText("Success Rate", { exact: true })).toHaveCount(
      0,
    );

    await page.goto("/consumer");
    await expect(
      page.getByRole("heading", { name: /Measurement layer/i }),
    ).toBeVisible();
  });

  test("quality visibility API returns the slim census", async ({ request }) => {
    const response = await request.get("/api/quality/visibility");
    expect(response.ok()).toBeTruthy();
    const body = await response.json() as {
      metrics: { published: number; withheld: number };
      premiums: { computed: number; reproducible: number };
    };
    expect(body.metrics.published).toBe(7);
    expect(body.metrics.withheld).toBe(214);
    expect(body.premiums.reproducible).toBe(body.premiums.computed);
  });
});
