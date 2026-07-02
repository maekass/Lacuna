"use client";

import { ModelProvenanceHint } from "@/components/ui/ModelProvenanceHint";
import {
  computeRhCapitalPortfolioSummary,
  RH_CAPITAL_MANAGER_NOTE,
  RH_CAPITAL_MODEL,
  RH_CAPITAL_PORTFOLIO,
  RH_CAPITAL_SOURCES,
} from "@/data/rhCapitalPortfolio";

function StatBox({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-lg border border-lacuna-lavender/40 bg-lacuna-pink/10 p-3">
      <p className="text-xl font-bold text-lacuna-plum">{value}</p>
      <p className="mt-1 text-xs text-lacuna-blue">{label}</p>
    </div>
  );
}

function formatFunding(m: number | null): string {
  if (m == null) return "—";
  if (m >= 1000) return `$${(m / 1000).toFixed(1)}B`;
  return `$${m}M`;
}

export default function RhCapitalPortfolioContext() {
  const summary = computeRhCapitalPortfolioSummary();

  return (
    <div className="rounded-xl border border-lacuna-pink/30 bg-white p-5 shadow-sm">
      <ModelProvenanceHint model={RH_CAPITAL_MODEL}>
        <div className="mb-4 max-w-3xl cursor-help">
          <h3 className="text-sm font-semibold text-lacuna-plum">
            RH Capital portfolio (Foreground Capital)
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-lacuna-blue/80">
            {RH_CAPITAL_MANAGER_NOTE} Metrics below are from press releases and
            trade press — not Lacuna verified M&A deals unless noted as an exit.
            Toggle the RH Capital overlay on the network graph to highlight these
            companies.
          </p>
        </div>
      </ModelProvenanceHint>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatBox
          value={String(summary.companyCount)}
          label="Portfolio companies"
        />
        <StatBox
          value={String(summary.withCitedFunding)}
          label="With cited funding total"
        />
        <StatBox
          value={formatFunding(summary.citedFundingTotalM)}
          label="Sum of cited funding totals"
        />
        <StatBox
          value={String(summary.exitCount)}
          label="Documented exits (undisclosed terms)"
        />
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-xs text-lacuna-blue">
          <thead>
            <tr className="border-b border-lacuna-lavender/30 text-lacuna-text-secondary">
              <th className="py-2 pr-3 font-medium">Company</th>
              <th className="py-2 pr-3 font-medium">Focus</th>
              <th className="py-2 pr-3 font-medium">Funding</th>
              <th className="py-2 font-medium">Exit / valuation</th>
            </tr>
          </thead>
          <tbody>
            {RH_CAPITAL_PORTFOLIO.map((company) => (
              <tr
                key={company.id}
                className="border-b border-lacuna-lavender/15"
              >
                <td className="py-2 pr-3">
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-lacuna-plum hover:underline"
                  >
                    {company.name}
                  </a>
                </td>
                <td className="py-2 pr-3">{company.focusArea}</td>
                <td className="py-2 pr-3">
                  {formatFunding(company.totalFundingM)}
                </td>
                <td className="py-2">
                  {company.exit != null ? (
                    <span>
                      {company.exit.acquirer}
                      {company.exit.dealValueM != null
                        ? ` · $${company.exit.dealValueM}M`
                        : " · terms undisclosed"}
                    </span>
                  ) : company.lastKnownValuationM != null ? (
                    <span>
                      Valued ${company.lastKnownValuationM}M (
                      {company.valuationSource})
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="mt-4 space-y-1 text-xs text-lacuna-blue/70">
        {RH_CAPITAL_SOURCES.map((source) => (
          <li key={source.label}>
            {source.url != null ? (
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                {source.label}
              </a>
            ) : (
              source.label
            )}
            {" — "}
            {source.reference}
          </li>
        ))}
      </ul>
    </div>
  );
}
