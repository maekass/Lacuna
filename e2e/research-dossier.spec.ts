import { expect, test } from "@playwright/test";

/** Inspect raw responses: discovery and the source trail must work without JS. */
test("a reader can discover the dossier and download its evidence without hydration", async ({ request }) => {
  const path = "/research/biotheranostics";
  for (const entry of ["/deals", "/research", "/deals/deal7"]) {
    const response = await request.get(entry);
    expect(response.ok()).toBe(true);
    expect(await response.text()).toContain(`href="${path}"`);
  }

  const response = await request.get(path);
  expect(response.ok()).toBe(true);
  const html = await response.text();
  expect(html).toMatch(/<h1[^>]*>Biotheranostics:/);
  expect(html).toContain(
    'rel="canonical" href="https://lacuna-maekass.vercel.app/research/biotheranostics"',
  );
  expect(html).toContain(
    'href="https://www.sec.gov/Archives/edgar/data/859737/000085973721000012/holx-20210327.htm"',
  );
  expect(html).toContain('id="clinical-counterevidence"');
  expect(html).toContain("The allocation was preliminary");
  expect(html).toContain("Human specialist review pending");
  expect(html).toContain(`href="${path}/brief"`);

  const download = await request.get(`${path}/brief`);
  expect(download.ok()).toBe(true);
  expect(download.headers()["content-disposition"]).toContain("attachment");
  expect(await download.text()).toContain("underpowered primary analysis");
});
