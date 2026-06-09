import path from "node:path";
import { defineConfig } from "vitest/config";

const runQuarantineMl = process.env.RUN_QUARANTINE_ML === "1";

export default defineConfig({
  test: {
    environment: "node",
    include: ["__tests__/**/*.test.ts"],
    exclude: runQuarantineMl ? [] : ["__tests__/lib/ml/**"],
    setupFiles: ["./__tests__/setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
