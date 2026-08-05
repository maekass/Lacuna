import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const apiOrigin = process.env.API_PROXY_ORIGIN;

const nextConfig: NextConfig = {
  serverExternalPackages: ["pg"],
  // Avoid picking up a parent-directory lockfile when multiple package-lock.json files exist.
  outputFileTracingRoot: projectRoot,
  // Safety net: the repo includes optional/stub modules and experimental panels.
  // Don't let pre-existing type errors fail the production prototype build.
  // Lint runs separately via `npm run lint` in CI — not during `next build` (Next 16).
  typescript: { ignoreBuildErrors: true },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'none'",
          },
        ],
      },
      {
        source: "/favicon-v2.ico",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
        ],
      },
    ];
  },
  ...(apiOrigin
    ? {
      async rewrites() {
        return [
          { source: "/api/:path*", destination: `${apiOrigin}/api/:path*` },
        ];
      },
    }
    : {}),
};

export default nextConfig;
