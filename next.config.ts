import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  serverExternalPackages: ['pg'],
  // Avoid picking up a parent-directory lockfile when multiple package-lock.json files exist.
  outputFileTracingRoot: projectRoot,
};

export default nextConfig;
