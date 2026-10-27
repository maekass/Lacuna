import Card from "@/components/ui/Card";
import type { ResponseEvalReport } from "@/lib/ai/evals/responseTypes";

interface OfflineScorecardProps {
  report: ResponseEvalReport;
}

/** Server-rendered handcrafted scorecard. Numbers come from the harness. */
export default function OfflineScorecard({ report }: OfflineScorecardProps) {
  const percent = `${(report.passRate * 100).toFixed(1)}%`;
  return (
    <Card className="mb-8">
      <p className="lacuna-kicker text-[10px] text-lacuna-blue/70">
        Offline · pre-merge
      </p>
      <h2 className="mt-1 text-lg font-semibold text-lacuna-plum">
        Handcrafted set
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-lacuna-blue">
        {report.cases} cases scored with {report.embedder}{" "}
        cosine similarity and the {report.judge} judge. The pass-rate band is
        {" "}
        {report.passRateRange.min}–{report.passRateRange.max}, not a single
        target. This run is {percent} ({report.passed}/{report.cases}) and{" "}
        {report.pass ? "sits inside the band" : "falls outside the band"}.
      </p>
      <dl className="mt-4 grid gap-3 sm:grid-cols-3">
        {(["happy", "edge", "adversarial"] as const).map((bucket) => (
          <div
            key={bucket}
            className="rounded-lg border border-lacuna-lavender/30 bg-lacuna-lavender/10 px-3 py-2"
          >
            <dt className="text-[10px] uppercase tracking-wide text-lacuna-blue/70">
              {bucket}
            </dt>
            <dd className="mt-1 text-sm font-medium text-lacuna-plum">
              {report.byBucket[bucket].passed}/{report.byBucket[bucket].cases}
            </dd>
          </div>
        ))}
      </dl>
      {report.failures.length > 0
        ? (
          <ul className="mt-4 space-y-1 text-xs text-lacuna-blue">
            {report.failures.slice(0, 5).map((failure) => (
              <li key={failure.id}>
                {failure.id}: {failure.failures.join("; ")}
              </li>
            ))}
          </ul>
        )
        : null}
    </Card>
  );
}
