import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "vendor/**",
  ]),
  {
    files: ["src/lib/data/lacunaDataset/**/*.{ts,tsx}"],
    ignores: ["src/lib/data/lacunaDataset/datePrecision.ts"],
    rules: {
      // Prefer dayPrecisionToDate(announced) over new Date(string) so
      // month/year precision rows cannot enter day-resolution analysis.
      // datePrecision.ts is the sole authorized construction site.
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "NewExpression[callee.name='Date'][arguments.length=1] > Literal",
          message:
            "Do not construct Date from a string literal in lacunaDataset. " +
            "Use dayPrecisionToDate on a { precision: 'day' } AnnouncedDate.",
        },
        {
          selector:
            "NewExpression[callee.name='Date'][arguments.length=1] > Identifier",
          message:
            "Do not construct Date from an unbound identifier in lacunaDataset. " +
            "Use toInterval() / dayPrecisionToDate() with an AnnouncedDate union.",
        },
        {
          selector:
            "NewExpression[callee.name='Date'][arguments.length=1] > TemplateLiteral",
          message:
            "Do not construct Date from a template string in lacunaDataset. " +
            "Use dayPrecisionToDate on a { precision: 'day' } AnnouncedDate.",
        },
      ],
    },
  },
  {
    name: "lacuna/client-no-static-verified-dataset",
    // Client-component surfaces (`"use client"`). Server pages/layouts under
    // src/app/(product) may still import staticDataset for build-time paths.
    files: [
      "src/components/**/*.{ts,tsx}",
      "src/app/sections/**/*.{ts,tsx}",
      "src/app/lazyDashboard.tsx",
      "src/lib/data/VerifiedDatasetContext.tsx",
      "src/lib/data/useDashboardData.ts",
      "src/lib/data/WatchlistContext.tsx",
    ],
    ignores: [],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/data/dataset.verified.json",
              message:
                "Client components must not import the verified dataset JSON. " +
                "Load it with getVerifiedDataset() in a server component or route " +
                "handler and pass props (or use VerifiedDatasetProvider).",
            },
            {
              name: "@/lib/data/staticDataset",
              message:
                "getStaticVerifiedDataset() is static-mode only and ships JSON in the " +
                "client bundle. Use getVerifiedDataset() on the server and pass props.",
            },
            {
              name: "@/data/verifiedData",
              message:
                "@/data/verifiedData eagerly loads the static dataset. Pass verified " +
                "rows via props or useVerifiedDataset().",
            },
          ],
          patterns: [
            {
              group: ["**/dataset.verified.json"],
              message:
                "Client components must not import dataset.verified.json. " +
                "Use getVerifiedDataset() in a server component and pass props.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
