import Card from "@/components/ui/Card";
import { buildQualityTrendView } from "@/lib/data/qualityTrendView";

const SERIES = [
  {
    key: "companies",
    label: "Company avg score",
    color: "bg-rose-600",
    value: (point: { companiesAvgLabel: string; companiesAvgPct: string }) => ({
      label: point.companiesAvgLabel,
      width: point.companiesAvgPct,
    }),
  },
  {
    key: "deals",
    label: "Deal avg score",
    color: "bg-emerald-600",
    value: (point: { dealsAvgLabel: string; dealsAvgPct: string }) => ({
      label: point.dealsAvgLabel,
      width: point.dealsAvgPct,
    }),
  },
  {
    key: "uncovered",
    label: "Uncovered display sites",
    color: "bg-lacuna-plum",
    value: (point: { uncoveredLabel: string; uncoveredPct: string }) => ({
      label: point.uncoveredLabel,
      width: point.uncoveredPct,
    }),
  },
  {
    key: "disclosure",
    label: "Price disclosure",
    color: "bg-sky-700",
    value: (
      point: { disclosureRateLabel: string; disclosurePct: string },
    ) => ({
      label: point.disclosureRateLabel,
      width: point.disclosurePct,
    }),
  },
] as const;

/**
 * Server-only quality-history trend. Reads data/quality-history.jsonl.
 */
export default function QualityTrend() {
  const view = buildQualityTrendView();

  if (view.points.length === 0) {
    return (
      <Card className="mb-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-lacuna-blue">
          Quality history
        </h3>
        <p className="mt-2 text-sm text-lacuna-blue/80">
          No quality-history rows yet. The daily dataset-summary workflow
          appends one JSONL row per run.
        </p>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-lacuna-blue">
        Quality history
      </h3>
      <p className="mt-1 text-sm text-lacuna-plum">
        Latest company score {view.latestCompaniesAvgLabel} · deal score{" "}
        {view.latestDealsAvgLabel} · uncovered {view.latestUncoveredLabel}{" "}
        · disclosure {view.latestDisclosureLabel}
      </p>
      <p className="mt-1 text-xs text-lacuna-blue/80">
        {view.pointCountLabel} rows ({view.liveCountLabel} live,{" "}
        {view.backfilledCountLabel}{" "}
        backfilled). Hatched bars are git-replayed snapshots, not live ratchet
        baselines.
      </p>

      <div className="mt-4 space-y-4">
        {SERIES.map((series) => (
          <div key={series.key}>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-lacuna-blue">
              {series.label}
            </p>
            <div className="flex items-end gap-0.5">
              {view.points.map((point) => {
                const bar = series.value(point);
                return (
                  <div
                    key={`${series.key}-${point.runAtLabel}-${
                      point.backfilled ? "b" : "l"
                    }`}
                    className="flex min-w-0 flex-1 flex-col items-center"
                    title={`${point.runAtLabel}: ${bar.label}${
                      point.backfilled ? " (backfilled)" : ""
                    }`}
                  >
                    <div className="flex h-16 w-full items-end rounded-sm bg-lacuna-lavender/15">
                      <div
                        className={`w-full ${series.color} ${
                          point.backfilled ? "opacity-40" : ""
                        }`}
                        style={{ height: bar.width }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {view.hasBackfilledRegion
        ? (
          <p className="mt-3 text-[11px] text-lacuna-blue/70">
            Lighter bars mark the backfilled region. The ratchet compares only
            consecutive non-backfilled rows.
          </p>
        )
        : null}
    </Card>
  );
}
