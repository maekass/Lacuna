import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import robots from "@/app/robots";
import { getStaticVerifiedDataset } from "@/lib/data/staticDataset";
import { SITE_ORIGIN } from "@/lib/seo/siteUrl";

const ROOT = path.resolve(__dirname, "../../..");

describe("product sitemap and robots", () => {
  it("lists product workspaces and every verified deal dossier", () => {
    const dataset = getStaticVerifiedDataset();
    const entries = sitemap();
    const urls = entries.map((entry) => entry.url);

    expect(urls).toContain(`${SITE_ORIGIN}/`);
    expect(urls).toContain(`${SITE_ORIGIN}/deals`);
    expect(urls).toContain(`${SITE_ORIGIN}/research`);
    expect(urls).toContain(`${SITE_ORIGIN}/payer-ops`);
    expect(urls).toContain(`${SITE_ORIGIN}/deals/deal1`);
    expect(urls).toContain(
      `${SITE_ORIGIN}/deals/${dataset.acquisitions[0]!.id}`,
    );
    expect(urls).toHaveLength(7 + dataset.acquisitions.length);
    expect(urls.some((url) => url.includes("/staging"))).toBe(false);
  });

  it("points crawlers at the sitemap and keeps staging out of the crawl", () => {
    const file = robots();
    expect(file.sitemap).toBe(`${SITE_ORIGIN}/sitemap.xml`);
    expect(file.host).toBe(SITE_ORIGIN);
    const rules = Array.isArray(file.rules) ? file.rules[0] : file.rules;
    expect(rules?.disallow).toEqual(
      expect.arrayContaining(["/deals/staging/", "/api/"]),
    );
  });

  it("gives payer-ops its own canonical instead of inheriting /", () => {
    const page = readFileSync(
      path.join(ROOT, "src/app/(product)/payer-ops/page.tsx"),
      "utf8",
    );
    expect(page).toMatch(/canonical:\s*"\/payer-ops"/);
  });

  it("does not ship /deals as a full-page loading shell", () => {
    const page = readFileSync(
      path.join(ROOT, "src/app/(product)/deals/page.tsx"),
      "utf8",
    );
    expect(page).not.toMatch(/Loading deals workspace/);
    expect(page).toMatch(/<DealsPage \/>/);
  });
});
