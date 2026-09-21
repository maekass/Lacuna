import type { MetadataRoute } from "next";
import { SITE_ORIGIN } from "@/lib/seo/siteUrl";

export const revalidate = 86_400;

/**
 * Allow product pages; keep staging review and API routes out of the crawl.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/deals/staging", "/deals/staging/", "/api/"],
    },
    sitemap: new URL("/sitemap.xml", SITE_ORIGIN).href,
    host: SITE_ORIGIN,
  };
}
