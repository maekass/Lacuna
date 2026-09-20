import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const runQuarantineMl = process.env.RUN_QUARANTINE_ML === "1";

export default defineConfig({
  test: {
    environment: "node",
    include: ["__tests__/**/*.test.ts", "src/lib/scoring/**/*.test.ts"],
    exclude: runQuarantineMl
      ? []
      : ["__tests__/lib/ml/ensemblePredictor.test.ts"],
    setupFiles: ["./__tests__/setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(dirname, "./src"),
    },
  },
});
