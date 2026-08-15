import DealComparableTables from "@/components/DealComparableTables";
import DealDetailActions from "@/components/DealDetailActions";
import DealEmpowermentContext from "@/components/DealEmpowermentContext";
import EvidenceLadder from "@/components/EvidenceLadder";
import PipelineStatusStrip from "@/components/PipelineStatusStrip";
import MotionSection from "@/components/ui/MotionSection";
import type { DealDetailView } from "@/lib/deals";
import Link from "next/link";

const EVIDENCE_CLASS_LABELS: Record<string, string> = {
  diagnostic_genomic: "Diagnostic / genomic",
  clinical_therapeutic: "Clinical / therapeutic",
  fertility_science: "Fertility science",
  care_delivery: "Care delivery",
  consumer_wellness: "Consumer wellness",
  portfolio_investment: "Portfolio investment",
};

function formatHeadlineValue(millions?: number): string {
  if (typeof millions !== "number") return "Undisclosed";
  return `$${millions.toLocaleString()}M`;
}

function briefFileName(
  target: string,
  acquirer: string,
  announced: string,
): string {
  const slug = `${target}-${acquirer}-${announced.slice(0, 4)}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${slug}.md`;
}

function DealCloseTimeline({
  announcedDate,
  closedDate,
  closeDays,
}: {
  announcedDate: string;
  closedDate?: string;
  closeDays: number | null;
}) {
  return (
    <ol className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-0">
      <li className="rounded-lg border border-lacuna-lavender/40 bg-white/90 px-3 py-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-lacuna-plum/70">
          Announced
        </p>
        <p className="text-sm font-medium text-lacuna-plum">{announcedDate}</p>
      </li>
      {typeof closeDays === "number" && closedDate
        ? (
          <>
            <li
              className="hidden h-px flex-1 bg-lacuna-lavender/60 sm:block"
              aria-hidden
            />
            <li className="text-xs font-medium text-lacuna-blue sm:px-3">
              {closeDays} days
            </li>
            <li
              className="hidden h-px flex-1 bg-lacuna-lavender/60 sm:block"
              aria-hidden
            />
            <li className="rounded-lg border border-lacuna-lavender/40 bg-white/90 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-lacuna-plum/70">
                Closed
              </p>
              <p className="text-sm font-medium text-lacuna-plum">
                {closedDate}
              </p>
            </li>
          </>
        )
        : null}
    </ol>
  );
}

export default function DealDetailPage({ view }: { view: DealDetailView }) {
  const { deal, ladder, comparables, adjacencyNotPeers, acquirerDeals } = view;
  const acq = deal.acquisition;
  const evidenceLabel = deal.target.evidenceClass
    ? EVIDENCE_CLASS_LABELS[deal.target.evidenceClass] ??
      deal.target.evidenceClass
    : null;
  const premiumLabel = typeof view.premiumPercent === "number" &&
      typeof view.premiumMultiple === "number"
    ? `${view.premiumPercent >= 0 ? "+" : ""}${
      view.premiumPercent.toFixed(0)
    }% premium (${view.premiumMultiple.toFixed(2)}×)`
    : null;

  return (
    <div className="min-w-0">
      <nav className="mb-4 flex flex-wrap items-center gap-x-1 gap-y-1 text-xs sm:mb-6 sm:text-sm text-lacuna-blue/80">
        <Link href="/" className="hover:text-lacuna-plum">Hub</Link>
        <span className="hidden sm:inline mx-1">/</span>
        <Link href="/deals" className="hover:text-lacuna-plum">Deals</Link>
        <span className="hidden sm:inline mx-1">/</span>
        <span className="w-full truncate text-lacuna-plum sm:w-auto sm:max-w-[12rem] md:max-w-none">
          {acq.targetName}
        </span>
      </nav>

      <header className="mb-8">
        <h1 className="text-2xl font-bold leading-tight text-lacuna-plum sm:text-3xl md:text-4xl">
          <span className="block sm:inline">{acq.targetName}</span>
          <span className="mx-0 my-1 block text-lacuna-blue/60 sm:mx-2 sm:my-0 sm:inline">
            →
          </span>
          <span className="block sm:inline">{acq.acquirerName}</span>
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-lacuna-blue sm:text-base">
          {acq.dealType}
          {deal.acquirer.ticker ? ` · ${deal.acquirer.ticker}` : ""}
        </p>
        <DealCloseTimeline
          announcedDate={acq.announcedDate}
          closedDate={acq.closedDate}
          closeDays={view.closeDays}
        />
        <DealDetailActions
          targetId={deal.target.id}
          briefMarkdown={view.briefMarkdown}
          downloadName={briefFileName(
            acq.targetName,
            acq.acquirerName,
            acq.announcedDate,
          )}
        />
      </header>

      <MotionSection className="mb-10 grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3">
        <div className="rounded-xl border border-lacuna-lavender/40 bg-white/90 p-4 sm:p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-lacuna-plum/80">
            Economics
          </h2>
          <p className="mt-2 text-xl font-bold text-lacuna-plum sm:text-2xl">
            {formatHeadlineValue(acq.dealValue)}
          </p>
          <p className="mt-1 text-sm text-lacuna-blue">
            {[
              acq.dealStructure,
              premiumLabel,
              typeof view.closeDays === "number"
                ? `Closed in ${view.closeDays} days`
                : null,
            ].filter(Boolean).join(" · ")}
          </p>
          {typeof acq.preDealValuation === "number"
            ? (
              <p className="mt-2 text-xs text-lacuna-blue/80">
                Pre-deal ~${acq.preDealValuation.toLocaleString()}M
                {acq.preDealValuationSource
                  ? ` · ${acq.preDealValuationSource}`
                  : ""}
              </p>
            )
            : null}
          {acq.dealValueNote
            ? (
              <p className="mt-2 text-xs text-lacuna-blue/70">
                {acq.dealValueNote}
              </p>
            )
            : null}
        </div>
        <div className="rounded-xl border border-lacuna-lavender/40 bg-white/90 p-4 sm:p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-lacuna-plum/80">
            Target
          </h2>
          <p className="mt-2 font-semibold text-lacuna-plum">
            {deal.target.name}
          </p>
          <p className="text-sm text-lacuna-blue">
            {deal.target.sector}
            {evidenceLabel ? ` · ${evidenceLabel}` : ""}
          </p>
          <p className="mt-1 text-xs text-lacuna-blue/80">
            {[
              deal.target.hq ? `HQ ${deal.target.hq}` : null,
              deal.target.founded ? `Founded ${deal.target.founded}` : null,
            ].filter(Boolean).join(" · ")}
          </p>
          {deal.target.description
            ? (
              <p className="mt-2 text-sm leading-relaxed text-lacuna-blue">
                {deal.target.description}
              </p>
            )
            : null}
        </div>
        <div className="rounded-xl border border-lacuna-lavender/40 bg-white/90 p-4 sm:p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-lacuna-plum/80">
            Acquirer
          </h2>
          <p className="mt-2 font-semibold text-lacuna-plum">
            {deal.acquirer.name}
            {deal.acquirer.ticker ? ` (${deal.acquirer.ticker})` : ""}
          </p>
          <p className="text-sm text-lacuna-blue">{deal.acquirer.sector}</p>
          <p className="mt-1 text-xs text-lacuna-blue/80">
            HQ {deal.acquirer.hq}
          </p>
          {deal.acquirer.description
            ? (
              <p className="mt-2 text-sm leading-relaxed text-lacuna-blue">
                {deal.acquirer.description}
              </p>
            )
            : null}
        </div>
      </MotionSection>

      {acq.strategicRationale
        ? (
          <MotionSection delay={0.05} className="mb-10">
            <h2 className="text-lg font-semibold text-lacuna-plum">
              Why this buyer
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-lacuna-blue">
              {acq.strategicRationale}
            </p>
          </MotionSection>
        )
        : null}

      <MotionSection delay={0.08} className="mb-10">
        <h2 className="mb-3 text-lg font-semibold text-lacuna-plum">
          Evidence ladder
        </h2>
        <EvidenceLadder ladder={ladder} />
      </MotionSection>

      <MotionSection delay={0.1} className="mb-10">
        <DealComparableTables
          sector={deal.target.sector}
          acquirerName={deal.acquirer.name}
          peers={comparables}
          adjacencyNotPeers={adjacencyNotPeers}
          acquirerDeals={acquirerDeals}
        />
      </MotionSection>

      <MotionSection delay={0.12} className="mb-10">
        <h2 className="mb-3 text-lg font-semibold text-lacuna-plum">
          Patient empowerment context
        </h2>
        <DealEmpowermentContext context={view.empowerment} />
      </MotionSection>

      <MotionSection delay={0.14} className="mb-10">
        <h2 className="text-lg font-semibold text-lacuna-plum">
          Related workspaces
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/research#clinical-trials"
            className="rounded-full border border-lacuna-lavender/50 px-3 py-1 text-xs font-medium text-lacuna-plum hover:bg-lacuna-lavender/20"
          >
            Clinical trials · {deal.target.name}
          </Link>
          <Link
            href="/research#health-equity"
            className="rounded-full border border-lacuna-lavender/50 px-3 py-1 text-xs font-medium text-lacuna-plum hover:bg-lacuna-lavender/20"
          >
            Health equity · {deal.target.sector}
          </Link>
          <Link
            href="/methods#causal-dag"
            className="rounded-full border border-lacuna-lavender/50 px-3 py-1 text-xs font-medium text-lacuna-plum hover:bg-lacuna-lavender/20"
          >
            Methods &amp; limitations
          </Link>
          <Link
            href="/intelligence#reimbursement"
            className="rounded-full border border-lacuna-lavender/50 px-3 py-1 text-xs font-medium text-lacuna-plum hover:bg-lacuna-lavender/20"
          >
            Reimbursement intelligence
          </Link>
        </div>
      </MotionSection>

      <MotionSection delay={0.16}>
        <PipelineStatusStrip showSecIngest={false} />
      </MotionSection>
    </div>
  );
}
