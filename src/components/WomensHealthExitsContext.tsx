"use client";

import { ModelProvenanceHint } from "@/components/ui/ModelProvenanceHint";
import {
  AOA_EXIT_SECTORS,
  AOA_REPEAT_ACQUIRERS,
  formatExitBillions,
  KEARNEY_WH_INVESTMENT,
  WOMENS_HEALTH_EXITS_HEADLINE,
  WOMENS_HEALTH_EXITS_MODEL,
  WOMENS_HEALTH_EXITS_SOURCES,
} from "@/data/womensHealthExitsResearch";
import { useVerifiedDataset } from "@/lib/data/VerifiedDatasetContext";
import { computeHeadlineStats } from "@/lib/data/computeHeadlineStats";

function StatBox({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-lg border border-lacuna-lavender/40 bg-lacuna-pink/10 p-3">
      <p className="text-xl font-bold text-lacuna-plum">{value}</p>
      <p className="mt-1 text-xs text-lacuna-blue">{label}</p>
    </div>
  );
}

export default function WomensHealthExitsContext() {
  const dataset = useVerifiedDataset();
  const lacuna = computeHeadlineStats({
    companies: dataset.verifiedCompanies,
    acquirers: dataset.verifiedAcquirers,
    acquisitions: dataset.verifiedAcquisitions,
    provenance: dataset.dataProvenance,
  });

  const headline = WOMENS_HEALTH_EXITS_HEADLINE;

  return (
    <div className="rounded-xl border border-lacuna-pink/30 bg-white p-5 shadow-sm">
      <ModelProvenanceHint model={WOMENS_HEALTH_EXITS_MODEL}>
        <div className="mb-4 max-w-3xl cursor-help">
          <h3 className="text-sm font-semibold text-lacuna-plum">
            Women&apos;s health exit landscape (macro research)
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-lacuna-blue/80">
            AOA Dx&apos;s <em>Follow the Exits</em> report (Jan 2026) manually
            re-tags acquisitions and IPOs often filed under diagnostics or
            oncology — surfacing exits investors&apos; databases miss. Lacuna&apos;s{" "}
            {lacuna.verifiedDeals} verified deals ({lacuna.disclosedValueBillionsLabel}{" "}
            disclosed) are a curated educational subset, not this 276-exit universe.
          </p>
        </div>
      </ModelProvenanceHint>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatBox
          value={formatExitBillions(headline.totalExitValueMinB, true)}
          label={`Exits ${headline.periodStart}–${headline.periodEnd} (AOA Dx)`}
        />
        <StatBox
          value={headline.exitCount.toLocaleString()}
          label="Exit count (M&A + IPO)"
        />
        <StatBox
          value={String(headline.billionDollarDealCount)}
          label="Deals over $1B"
        />
        <StatBox
          value={`${headline.maSharePct}%`}
          label="M&A share of exits"
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <p className="text-xs font-medium text-lacuna-text-secondary mb-2">
            AOA exit concentration (2000–2025)
          </p>
          <ul className="space-y-2 text-xs text-lacuna-blue">
            {AOA_EXIT_SECTORS.map((s) => (
              <li
                key={s.id}
                className="flex items-start justify-between gap-3 rounded-md border border-lacuna-lavender/30 px-3 py-2"
              >
                <span className="text-lacuna-plum">{s.label}</span>
                <span className="shrink-0 font-semibold text-lacuna-plum">
                  {formatExitBillions(s.exitValueB)}
                </span>
              </li>
            ))}
          </ul>
          {AOA_EXIT_SECTORS.find((s) => s.subsetNote)?.subsetNote && (
            <p className="mt-2 text-[11px] italic text-lacuna-blue/70">
              {AOA_EXIT_SECTORS.find((s) => s.subsetNote)?.subsetNote}
            </p>
          )}
          <p className="mt-2 text-[11px] text-lacuna-blue/80">
            {formatExitBillions(headline.exitValue2025B)} in transactions in 2025
            alone — largest year on record (AOA Dx).
          </p>
        </div>

        <div>
          <p className="text-xs font-medium text-lacuna-text-secondary mb-2">
            Kearney private investment ({KEARNEY_WH_INVESTMENT.periodNote})
          </p>
          <ul className="space-y-1.5 text-xs text-lacuna-blue">
            <li>
              <span className="font-semibold text-lacuna-plum">
                {formatExitBillions(KEARNEY_WH_INVESTMENT.totalPrivateInvestmentB)}
              </span>{" "}
              total private capital
            </li>
            <li>
              {formatExitBillions(KEARNEY_WH_INVESTMENT.womenSpecificConditionsB)}{" "}
              women-specific conditions (fertility, women&apos;s cancers)
            </li>
            <li>
              {formatExitBillions(
                KEARNEY_WH_INVESTMENT.disproportionatelyAffectingWomenB,
              )}{" "}
              disproportionately affecting women (CVD, Alzheimer&apos;s, autoimmune,
              mental health)
            </li>
            <li>
              {formatExitBillions(
                KEARNEY_WH_INVESTMENT.diagnosticsAndDigitalHealthB,
              )}{" "}
              diagnostics &amp; digital health ({KEARNEY_WH_INVESTMENT
                .privateDealsTrackedMin.toLocaleString()}+ deals tracked)
            </li>
          </ul>
          <p className="mt-3 text-xs text-lacuna-blue/80">
            Repeat acquirers in Forbes coverage:{" "}
            {AOA_REPEAT_ACQUIRERS.join(", ")}.
          </p>
        </div>
      </div>

      <p className="mt-4 text-[11px] italic text-lacuna-blue/70" role="note">
        {headline.recentFiveYearShareNote}
      </p>

      <div className="mt-4 border-t border-lacuna-lavender/30 pt-3">
        <p className="text-[11px] font-medium text-lacuna-text-secondary mb-1">
          Sources
        </p>
        <ul className="space-y-1 text-[11px] text-lacuna-blue">
          {WOMENS_HEALTH_EXITS_SOURCES.map((s) => (
            <li key={s.label}>
              {s.url
                ? (
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-lacuna-plum"
                  >
                    {s.label}
                  </a>
                )
                : (
                  <span>{s.label}</span>
                )}
              {" — "}
              {s.reference}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
