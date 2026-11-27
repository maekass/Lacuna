import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

test.describe("Coding judgment reviewer view (recorded run)", () => {
  test("labels the page as a recorded run and filters by route", async ({ page }) => {
    await page.goto("/payer-ops/coding-review");
    await expect(
      page.getByRole("heading", { name: /Reviewer view of recorded cases/i }),
    ).toBeVisible();
    await expect(page.getByText("Recorded run, not a live model."))
      .toBeVisible();
    await expect(page.getByText(/assistant-built/i)).toBeVisible();

    const cards = page.getByRole("article");
    const all = await cards.count();
    expect(all).toBeGreaterThan(0);

    await page.getByRole("button", { name: /Guard overrode the model/ })
      .click();
    await expect(
      page.getByRole("button", { name: /Guard overrode the model/ }),
    ).toHaveAttribute("aria-pressed", "true");
    const overrides = await cards.count();
    expect(overrides).toBeGreaterThan(0);
    expect(overrides).toBeLessThan(all);
    await expect(cards.first().getByText("Sent to a person", { exact: true }))
      .toBeVisible();

    await page.getByRole("button", { name: /Decided automatically/ }).click();
    await expect(
      cards.first().getByText("Decided automatically", { exact: true }),
    )
      .toBeVisible();
  });

  test("Disagree downloads a test-case candidate built on the device", async ({ page }) => {
    const posts: string[] = [];
    page.on("request", (request) => {
      if (request.method() !== "GET") posts.push(request.url());
    });
    await page.goto("/payer-ops/coding-review");
    await page.getByRole("button", { name: /Sent to a person/ }).click();
    const card = page.getByRole("article").first();
    const caseLabel = await card.getAttribute("aria-label");
    await card.getByRole("button", { name: "Disagree" }).click();
    const download = card.getByRole("button", {
      name: /Download test-case candidate/,
    });
    await expect(download).toBeDisabled();
    await card.getByLabel(/What is wrong with this result/).fill(
      "e2e reviewer note",
    );
    // A draft survives filter changes until the reviewer cancels it.
    await page.getByRole("button", { name: /^Decided automatically/ }).click();
    await page.getByRole("button", { name: /^Sent to a person/ }).click();
    await expect(card.getByLabel(/What is wrong with this result/))
      .toHaveValue("e2e reviewer note");
    const [file] = await Promise.all([
      page.waitForEvent("download"),
      download.click(),
    ]);
    expect(file.suggestedFilename()).toMatch(
      /^test-case-candidate-cjc-\d+-.+\.json$/,
    );
    const filePath = await file.path();
    const candidate = JSON.parse(await readFile(filePath, "utf8"));
    expect(candidate.status).toBe("candidate_not_adjudicated");
    expect(candidate.reviewer.note).toBe("e2e reviewer note");
    expect(`Case ${candidate.source.caseId}`).toBe(caseLabel);
    expect(candidate.recorded.finalRoute).toBe("human_review");
    expect(posts).toEqual([]);
  });
});
