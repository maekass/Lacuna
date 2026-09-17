import { calculateDossier, sensitivity } from "./diligenceModel";

function cell(value: string | number): string {
  return String(value).replaceAll("|", "\\|").replaceAll("\n", " ");
}

function money(value: number): string {
  return value.toFixed(2);
}

/** Readable research draft; the paired JSON retains field-level provenance. */
export function renderDossierReport(raw: unknown): string {
  const result = calculateDossier(raw);
  const dossier = result.inputs;
  const lines = [
    `# ${cell(result.company)} (${cell(result.ticker)}) — research draft`,
    "",
    `As of ${result.asOf}. USD throughout. Analyst assumptions require specialist review; separate from verified M&A data.`,
    "",
    "## Clinical pipeline and catalysts",
    "",
    "| Asset | Indication | Stage | Trial IDs | Endpoint | PTRS | Launch year |",
    "| --- | --- | --- | --- | --- | ---: | ---: |",
    ...dossier.assets.map((a) =>
      `| ${cell(a.drug)} | ${cell(a.indication)} | ${cell(a.stage)} | ${
        a.trialIds.join(", ")
      } | ${cell(a.endpoint)} | ${a.ptrs.value} | ${a.launchYear.value} |`
    ),
    "",
    "| Date / precision | Asset | Event | Decision criterion | Bull / bear | Source |",
    "| --- | --- | --- | --- | --- | --- |",
    ...dossier.catalysts.map((c) =>
      `| ${c.scheduledDate} (${c.datePrecision}; ${cell(c.dateBasis)}) | ${
        cell(c.assetId)
      } | ${cell(c.event)} | ${cell(c.decisionCriterion)} | ${
        cell(c.bullInterpretation)
      } / ${cell(c.bearInterpretation)} | [${
        cell(c.source.title)
      }](${c.source.url}) |`
    ),
    "",
    "## Drug revenue forecast",
    "",
    "| Asset | Year | Treated patients | Net revenue (USD) | Success cash-flow proxy (USD) | Development cost (USD) |",
    "| --- | ---: | ---: | ---: | ---: | ---: |",
    ...result.assets.flatMap((a) =>
      a.years.map((y) =>
        `| ${cell(a.assetId)} | ${y.year} | ${money(y.treatedPatients)} | ${
          money(y.revenueUsd)
        } | ${money(y.successOperatingCashFlowUsd)} | ${
          money(y.developmentCostUsd)
        } |`
      )
    ),
    "",
    "## Risk adjusted valuation",
    "",
    "| Asset | PTRS | rNPV (USD) |",
    "| --- | ---: | ---: |",
    ...result.assets.map((a) =>
      `| ${cell(a.assetId)} | ${a.ptrs} | ${money(a.rNpvUsd)} |`
    ),
    "",
    `Pipeline: USD ${money(result.pipelineValueUsd)}; cash: USD ${
      money(dossier.cashUsd.value)
    }; debt: USD ${money(dossier.debtUsd.value)}.`,
    `Equity: USD ${money(result.equityValueUsd)}; diluted shares: ${
      money(dossier.dilutedShares.value)
    }; implied USD/share: ${money(result.impliedValuePerShareUsd)}.`,
  ];

  if (result.financingScenarioValuePerShareUsd !== null) {
    lines.push(
      `At-date financing scenario USD/share: ${
        money(result.financingScenarioValuePerShareUsd)
      }; includes proposed proceeds and new shares.`,
    );
  }
  for (const a of dossier.assets) {
    const cases = sensitivity(dossier, a.assetId, [0, a.ptrs.value, 1], [
      0.5,
      1,
      1.5,
    ]);
    lines.push(
      "",
      `### ${cell(a.drug)} / ${cell(a.indication)} sensitivity`,
      "",
      "Analyst scenarios; market share capped at 100%. Pre-financing USD/share.",
      "",
      "| PTRS | Share multiplier | USD/share |",
      "| ---: | ---: | ---: |",
      ...cases.map((c) =>
        `| ${c.ptrs} | ${c.shareMultiplier} | ${
          money(c.impliedValuePerShareUsd)
        } |`
      ),
    );
  }
  lines.push(
    "",
    "## Investment thesis — human authored draft",
    "",
    `**Variant perception:** ${dossier.thesis.variantPerception}`,
    "",
    `**What changes the debate:** ${dossier.thesis.whatChangesTheDebate}`,
    "",
    `**Risks:** ${dossier.thesis.risks.join("; ")}`,
    "",
    `Author: ${dossier.thesis.author}. Reviewer: ${dossier.thesis.reviewedBy}.`,
    "",
    "## Primary evidence ledger",
    "",
    ...dossier.assets.flatMap((a) => [
      `### ${cell(a.drug)} / ${cell(a.indication)}`,
      "",
      `Standard of care: ${a.standardOfCare}.`,
      ...a.clinicalEvidence.map((s) =>
        `- [${s.title}](${s.url}) — ${s.locator}; accessed ${s.accessedAt}.`
      ),
      `- PTRS: ${a.ptrs.rationale}; reviewed ${a.ptrs.reviewedAt} by ${a.ptrs.reviewedBy}.`,
      `- Launch: ${a.launchYear.rationale}; reviewed ${a.launchYear.reviewedAt} by ${a.launchYear.reviewedBy}.`,
      "",
    ]),
    ...dossier.thesis.evidenceForDifference.map((s) =>
      `- Thesis: [${s.title}](${s.url}) — ${s.locator}; accessed ${s.accessedAt}.`
    ),
    "",
    "Keep the paired JSON for field-level numeric sources. The model omits terminal value, tax, working capital, milestones, and royalties; see docs/BIOPHARMA_DILIGENCE.md.",
  );
  return `${lines.join("\n")}\n`;
}
