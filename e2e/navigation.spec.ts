import { expect, test } from "@playwright/test";

test.describe("Lacuna workspace navigation", () => {
  test("hub loads and workspace routes resolve", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Diligence Stack/i })).toBeVisible();

    await page.getByRole("link", { name: "Deals", exact: true }).click();
    await expect(page).toHaveURL(/\/deals$/);
    await expect(page.getByRole("heading", { name: /Deals workspace/i })).toBeVisible();

    await page.getByRole("link", { name: "Research", exact: true }).click();
    await expect(page).toHaveURL(/\/research$/);

    await page.getByRole("link", { name: "Methods", exact: true }).click();
    await expect(page).toHaveURL(/\/methods$/);

    await page.getByRole("link", { name: "Intelligence", exact: true }).click();
    await expect(page).toHaveURL(/\/intelligence$/);
    await expect(page.locator("#export")).toBeAttached();
  });

  test("in-page section anchors exist on deals route", async ({ page }) => {
    await page.goto("/deals");
    for (const id of ["data-coverage", "network", "matrix"]) {
      await expect(page.locator(`#${id}`)).toBeAttached();
    }
  });
});
