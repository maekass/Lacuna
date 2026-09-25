import {
  BIOTHERANOSTICS_CLAIMS,
  BIOTHERANOSTICS_DOSSIER,
  BIOTHERANOSTICS_DOSSIER_PATH,
  BIOTHERANOSTICS_SOURCES,
  biotheranosticsSource,
} from "./biotheranosticsDossier";
import { SITE_ORIGIN } from "@/lib/seo/siteUrl";

/** Export the same claims, source records, and limits that the reader sees. */
export function biotheranosticsBrief(): string {
  const dossier = BIOTHERANOSTICS_DOSSIER;
  const lines = [
    `# ${dossier.title}`,
    "",
    `Sources checked: ${dossier.checkedAt}. ${dossier.reviewStatus}.`,
    "",
    `[Read in Lacuna](${SITE_ORIGIN}${BIOTHERANOSTICS_DOSSIER_PATH})`,
    "",
    `## ${dossier.question}`,
    "",
    `Lacuna interpretation: ${dossier.answer}`,
    "",
    `Evidence basis: ${dossier.answerClaimIds.join(", ")}.`,
    "",
    dossier.scope,
    "",
    dossier.provenance,
    "",
    "## Claim ledger",
  ];
  for (const claim of BIOTHERANOSTICS_CLAIMS) {
    const source = biotheranosticsSource(claim.sourceId);
    lines.push(
      "",
      `### ${claim.title} (${claim.id})`,
      "",
      `${claim.kind}: ${claim.statement}`,
      "",
      `Date / period: ${claim.asOf}`,
      "",
      `Basis: ${claim.basis}`,
      "",
      `Uncertainty: ${claim.uncertainty}`,
      "",
      `Source: [${source.title}](${source.url})`,
      "",
      `Find it: ${claim.locator}`,
    );
  }
  lines.push("", "## Source records");
  for (const source of BIOTHERANOSTICS_SOURCES) {
    lines.push(
      "",
      `### ${source.title}`,
      "",
      `[Open source](${source.url})`,
      "",
      `Publisher: ${source.publisher}`,
      "",
      `Published / filed: ${
        source.publishedAt ?? "Not stated"
      }. ${source.publicationBasis}.`,
      "",
      `Accessed: ${source.accessedAt}. Source group: ${source.sourceGroup}.`,
      "",
      source.relationship,
    );
  }
  lines.push("", "## Research hypothesis", "", dossier.hypothesis);
  for (const gap of dossier.unknowns) {
    lines.push(
      "",
      `### ${gap.title}`,
      "",
      `Missing evidence: ${gap.missing}`,
      "",
      `Needed next: ${gap.needed}`,
      "",
      `What would weaken the thesis: ${gap.disconfirmation}`,
    );
  }
  return `${lines.join("\n")}\n`;
}
