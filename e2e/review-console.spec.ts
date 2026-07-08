import { expect, test } from "@playwright/test";

test.describe("Review console (static CI)", () => {
  test("deals review console section renders", async ({ page }) => {
    await page.goto("/deals#review");
    await expect(page.getByRole("heading", { name: /Review console/i }))
      .toBeVisible();
    await expect(page.getByRole("button", { name: /M&A queue/i }))
      .toBeVisible();
    await expect(page.getByRole("button", { name: /Funding/i }))
      .toBeVisible();
  });

  test("hub shows verified vs candidate coverage footnote", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/verified deal/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /review console/i }))
      .toBeVisible();
  });

  test("staging dossier route resolves candidate or auth state", async ({ page }) => {
    await page.goto("/deals/staging/demo-candidate");
    await expect(
      page.getByText(
        /Staging candidate not found|Review tools require authentication|Candidate · not verified/i,
      ),
    ).toBeVisible();
  });
});
