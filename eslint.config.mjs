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
]);

export default eslintConfig;
