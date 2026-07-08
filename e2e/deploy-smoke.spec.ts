import { expect, test } from "@playwright/test";

/** Fast post-deploy smokes — run in CI on every PR (static dataset, no Postgres). */
test.describe("deploy smoke", () => {
  test("health API returns live probe", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.ok()).toBeTruthy();
    const body = await response.json() as { ok?: boolean; probe?: string };
    expect(body.ok).toBe(true);
    expect(body.probe).toBe("live");
  });

  test("deals workspace loads", async ({ page }) => {
    await page.goto("/deals");
    await expect(page.getByRole("heading", { name: /Deals workspace/i }))
      .toBeVisible();
  });

  test("deal detail page loads", async ({ page }) => {
    await page.goto("/deals/deal1");
    await expect(page).toHaveURL(/\/deals\/deal1$/);
    await expect(page.getByRole("heading", { name: /Livongo Health/i }))
      .toBeVisible();
  });
});
