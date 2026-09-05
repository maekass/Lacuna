import Card from "@/components/ui/Card";
import DataQualityWeakestTable from "@/components/DataQualityWeakestTable";
import QualityTrend from "@/components/QualityTrend";
import { buildDataQualityView } from "@/lib/data/dataQualityView";

const GRADE_BAR_COLOR: Record<string, string> = {
  A: "bg-emerald-600",
  B: "bg-lime-600",
  C: "bg-amber-500",
  D: "bg-orange-500",
  F: "bg-rose-600",
};

/**
 * Server-only /methods#data-quality surface. Reads hash-verified artifacts
 * and never imports the verified dataset into a client component.
 */
export default function DataQualitySection() {
  const view = buildDataQualityView();

  return (
    <section id="data-quality" className="mb-16 scroll-mt-20 sm:scroll-mt-28">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-lacuna-plum sm:text-2xl">
          Data quality we already compute
        </h2>
        <p className="mt-2 max-w-3xl leading-relaxed text-lacuna-blue">
          {view.weakCompanyLead}. These grades are produced and hash-verified on
          every push; this page is the first place they are shown.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-rose-50">
          <p className="text-xs uppercase tracking-wide text-rose-800">
            Company source score
          </p>
          <p className="mt-1 text-3xl font-bold text-rose-900">
            {view.companiesAvgScoreLabel}
          </p>
          <p className="mt-1 text-xs text-rose-800">
            avg of {view.companiesTotalLabel} records
          </p>
        </Card>
        <Card className="bg-emerald-50">
          <p className="text-xs uppercase tracking-wide text-emerald-800">
            Deal source score
          </p>
          <p className="mt-1 text-3xl font-bold text-emerald-900">
            {view.dealsAvgScoreLabel}
          </p>
          <p className="mt-1 text-xs text-emerald-800">
            avg of {view.dealsTotalLabel} records
          </p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-lacuna-blue/70">
            Dataset age
          </p>
          <p className="mt-1 text-2xl font-semibold text-lacuna-plum">
            {view.datasetAgeDaysLabel}
          </p>
          <p className="mt-1 text-xs text-lacuna-blue">
            last updated {view.lastUpdated}
          </p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-lacuna-blue/70">
            Price disclosure
          </p>
          <p className="mt-1 text-3xl font-bold text-lacuna-plum">
            {view.disclosureRateLabel}
          </p>
          <p className="mt-1 text-xs text-lacuna-blue">
            {view.disclosureDetail}
          </p>
        </Card>
      </div>

      <QualityTrend />

      <Card className="mb-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-lacuna-blue">
          A–F source grades
        </h3>
        <p className="mt-1 text-xs text-lacuna-blue/80">
          Rubric ships with the artifact. Coverage vs {view.coverageDetail}.
        </p>
        <div className="mt-4 space-y-3">
          {view.gradeBars.map((bar) => (
            <div key={bar.grade}>
              <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
                <span className="font-semibold text-lacuna-plum">
                  {bar.grade}
                </span>
                <span className="text-lacuna-blue/80">{bar.rubric}</span>
              </div>
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                <div>
                  <div className="h-3 overflow-hidden rounded bg-lacuna-lavender/20">
                    <div
                      className={`h-3 ${GRADE_BAR_COLOR[bar.grade]}`}
                      style={{ width: bar.companiesWidth }}
                    />
                  </div>
                  <p className="mt-0.5 text-[11px] text-lacuna-blue">
                    Companies {bar.companiesCountLabel}
                  </p>
                </div>
                <div>
                  <div className="h-3 overflow-hidden rounded bg-lacuna-lavender/20">
                    <div
                      className={`h-3 ${GRADE_BAR_COLOR[bar.grade]} opacity-70`}
                      style={{ width: bar.dealsWidth }}
                    />
                  </div>
                  <p className="mt-0.5 text-[11px] text-lacuna-blue">
                    Deals {bar.dealsCountLabel}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mb-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-lacuna-blue">
          Provenance instrumentation worklist
        </h3>
        <p className="mt-1 text-sm text-lacuna-plum">
          {view.provenanceDialLabel}
        </p>
        <p className="mt-1 text-xs text-lacuna-blue/80">
          Top 20 files by uncovered numeric display sites.
        </p>
        <div className="mt-4 space-y-2">
          {view.uncoveredFiles.map((row) => (
            <div key={row.file}>
              <div className="flex justify-between gap-3 text-xs text-lacuna-blue">
                <span className="truncate font-mono">{row.file}</span>
                <span>{row.countLabel}</span>
              </div>
              <div className="h-2 overflow-hidden rounded bg-lacuna-lavender/20">
                <div
                  className="h-2 bg-lacuna-plum"
                  style={{ width: row.width }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mb-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-lacuna-blue">
          Weakest company records ({view.weakCompanyCountLabel})
        </h3>
        <p className="mt-1 mb-3 text-xs text-lacuna-blue/80">
          D and F grades — aggregator-only or unverified sourcing.
        </p>
        <DataQualityWeakestTable rows={view.weakCompanies} />
      </Card>

      <Card className="mb-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-lacuna-blue">
          Citation reachability
        </h3>
        <p className="mt-1 mb-3 text-xs text-lacuna-blue/80">
          Payer-ops benchmark sources last verified{" "}
          {view.citationsFetchedAt}. Status is from the committed snapshot, not
          a live request.
        </p>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-lacuna-lavender/40 text-xs uppercase tracking-wide text-lacuna-blue/70">
                <th className="px-2 py-2">Source</th>
                <th className="px-2 py-2">HTTP</th>
                <th className="px-2 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {view.citations.map((row) => (
                <tr
                  key={row.sourceUrl}
                  className="border-b border-lacuna-lavender/20"
                >
                  <td className="px-2 py-2">
                    <a
                      href={row.sourceUrl}
                      className="text-lacuna-plum underline-offset-2 hover:underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {row.source}
                    </a>
                  </td>
                  <td className="px-2 py-2">{row.httpStatusLabel}</td>
                  <td className="px-2 py-2">{row.okLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-lacuna-blue">
          Provenance exemptions
        </h3>
        <p className="mt-1 mb-3 text-xs text-lacuna-blue/80">
          Every exemption is categorized and carries a written reason.
        </p>
        <ul className="space-y-3">
          {view.exemptions.map((entry) => (
            <li
              key={entry.key}
              className="rounded-lg bg-lacuna-lavender/10 p-3 text-sm"
            >
              <p className="font-mono text-xs text-lacuna-blue/80">
                {entry.category} · {entry.key}
              </p>
              <p className="mt-1 text-lacuna-plum">{entry.reason}</p>
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}
