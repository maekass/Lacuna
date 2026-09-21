import type { MetadataRoute } from "next";
import { getStaticVerifiedDataset } from "@/lib/data/staticDataset";
import { SITE_ORIGIN } from "@/lib/seo/siteUrl";

export const revalidate = 86_400;

const PRODUCT_PATHS = [
  "/",
  "/deals",
  "/research",
  "/methods",
  "/intelligence",
  "/consumer",
  "/payer-ops",
] as const;

/**
 * Public indexable routes: product workspaces plus every verified deal dossier.
 * Staging review URLs stay out of the sitemap (they are noindex).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const dataset = getStaticVerifiedDataset();
  const lastModified = dataset.provenance.lastUpdated;
  const entries: MetadataRoute.Sitemap = PRODUCT_PATHS.map((path) => ({
    url: new URL(path, SITE_ORIGIN).href,
    lastModified,
    changeFrequency: "weekly",
    priority: path === "/" ? 1 : 0.8,
  }));

  for (const deal of dataset.acquisitions) {
    entries.push({
      url: new URL(`/deals/${deal.id}`, SITE_ORIGIN).href,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    });
  }

  return entries;
}
