import DealCloseTimeline from "@/components/DealCloseTimeline";
import DealComparableTables from "@/components/DealComparableTables";
import DealDetailActions from "@/components/DealDetailActions";
import DealEconomicsCard from "@/components/DealEconomicsCard";
import DealEmpowermentContext from "@/components/DealEmpowermentContext";
import DealTargetLastKnownValuation from "@/components/DealTargetLastKnownValuation";
import DealVerifiedProvenance from "@/components/DealVerifiedProvenance";
import EvidenceLadder from "@/components/EvidenceLadder";
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

export default function DealDetailPage({ view }: { view: DealDetailView }) {
  const { deal, ladder, comparables, adjacencyNotPeers, acquirerDeals } = view;
  const acq = deal.acquisition;
  const evidenceLabel = deal.target.evidenceClass
    ? EVIDENCE_CLASS_LABELS[deal.target.evidenceClass] ??
      deal.target.evidenceClass
    : null;
  const foundedLabel = deal.target.founded
    ? `Founded ${String(deal.target.founded)}`
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
          {acq.dealStructure ? ` · ${acq.dealStructure}` : ""}
          {deal.acquirer.ticker ? ` · ${deal.acquirer.ticker}` : ""}
          {` · announced ${view.announcedLabel}`}
        </p>
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

      <DealCloseTimeline view={view} />

      <MotionSection className="mb-10 mt-6 grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3">
        <DealEconomicsCard view={view} />
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
              foundedLabel,
            ].filter(Boolean).join(" · ")}
          </p>
          {view.targetLastKnownValuation
            ? (
              <DealTargetLastKnownValuation
                valuation={view.targetLastKnownValuation}
              />
            )
            : null}
          {deal.target.description
            ? (
              <p className="mt-2 text-sm leading-relaxed text-lacuna-blue">
                {deal.target.description}
              </p>
            )
            : null}
          {deal.target.sources && deal.target.sources.length > 0
            ? (
              <ul className="mt-2 list-disc space-y-0.5 pl-4 text-[11px] text-lacuna-blue/70">
                {deal.target.sources.slice(0, 3).map((source) => (
                  <li key={source}>{source}</li>
                ))}
              </ul>
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
            <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-lacuna-blue/70">
              Curated copy from the verified dataset — not an 8-K LLM summary
            </p>
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
          Related verified workspaces
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href={`/deals?highlight=${
              encodeURIComponent(deal.target.id)
            }#network`}
            className="rounded-full border border-lacuna-lavender/50 px-3 py-1 text-xs font-medium text-lacuna-plum hover:bg-lacuna-lavender/20"
          >
            Verified deals network
          </Link>
          <Link
            href="/methods#causal-dag"
            className="rounded-full border border-lacuna-lavender/50 px-3 py-1 text-xs font-medium text-lacuna-plum hover:bg-lacuna-lavender/20"
          >
            Methods &amp; limitations
          </Link>
        </div>
      </MotionSection>

      <MotionSection>
        <DealVerifiedProvenance line={view.provenanceLine} />
      </MotionSection>
    </div>
  );
}
