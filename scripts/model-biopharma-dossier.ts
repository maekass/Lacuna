import { readFileSync } from "node:fs";
import { calculateDossier } from "../src/lib/biopharma/diligenceModel";
import { renderDossierReport } from "../src/lib/biopharma/dossierReport";

const markdown = process.argv[2] === "--markdown";
const filename = process.argv[markdown ? 3 : 2];
if (!filename) {
  console.error(
    "Usage: npm run biopharma:model -- [--markdown] path/to/reviewed-dossier.json",
  );
  process.exitCode = 2;
} else {
  try {
    const dossier = JSON.parse(readFileSync(filename, "utf8"));
    process.stdout.write(
      markdown
        ? renderDossierReport(dossier)
        : `${JSON.stringify(calculateDossier(dossier), null, 2)}\n`,
    );
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}
