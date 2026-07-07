"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import EvidenceLadder from "@/components/EvidenceLadder";
import PipelineStatusStrip from "@/components/PipelineStatusStrip";
import MotionSection from "@/components/ui/MotionSection";
import { getStaticVerifiedDataset } from "@/lib/data/staticDataset";
import {
  buildEvidenceLadder,
  getDealById,
  listAcquirerDeals,
  listComparableDeals,
} from "@/lib/deals";
import { formatDealBrief } from "@/lib/gamma/formatDealBrief";

interface DealDetailPageProps {
  dealId: string;
}

function formatValue(millions?: number, note?: string): string {
  if (typeof millions !== "number") {
    return note ? `Undisclosed (${note})` : "Undisclosed";
  }
  return note ? `$${millions.toLocaleString()}M (${note})` : `$${millions.toLocaleString()}M`;
}

function DealTable({
  title,
  rows,
}: {
  title: string;
  rows: { id: string; targetName: string; acquirerName: string; announcedDate: string; dealValue?: number }[];
}) {
  if (rows.length === 0) return null;
  return (
    <div>
      <h3 className="text-lg font-semibold text-lacuna-plum">{title}</h3>
      <div className="mt-3 overflow-x-auto rounded-lg border border-lacuna-lavender/40">
        <table className="min-w-full text-sm">
          <thead className="bg-lacuna-lavender/20 text-left text-xs uppercase tracking-wide text-lacuna-plum/80">
            <tr>
              <th className="px-3 py-2">Target</th>
              <th className="px-3 py-2">Acquirer</th>
              <th className="px-3 py-2">Announced</th>
              <th className="px-3 py-2">Value</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-lacuna-lavender/30">
                <td className="px-3 py-2">
                  <Link
                    href={`/deals/${row.id}`}
                    className="font-medium text-lacuna-plum hover:text-lacuna-blue underline-offset-2 hover:underline"
                  >
                    {row.targetName}
                  </Link>
                </td>
                <td className="px-3 py-2 text-lacuna-blue">{row.acquirerName}</td>
                <td className="px-3 py-2 text-lacuna-blue/80">{row.announcedDate}</td>
                <td className="px-3 py-2 text-lacuna-blue/80">
                  {typeof row.dealValue === "number"
                    ? `$${row.dealValue.toLocaleString()}M`
                    : "Undisclosed"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function DealDetailPage({ dealId }: DealDetailPageProps) {
  const dataset = useMemo(() => getStaticVerifiedDataset(), []);
  const deal = useMemo(() => getDealById(dataset, dealId), [dataset, dealId]);
  const [copyStatus, setCopyStatus] = useState<"idle" | "ok" | "err">("idle");

  const comparables = useMemo(
    () => listComparableDeals(dataset, dealId),
    [dataset, dealId],
  );
  const acquirerDeals = useMemo(
    () => listAcquirerDeals(dataset, dealId),
    [dataset, dealId],
  );
  const ladder = useMemo(
    () => (deal ? buildEvidenceLadder(deal) : null),
    [deal],
  );

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyStatus("ok");
      setTimeout(() => setCopyStatus("idle"), 2000);
    } catch {
      setCopyStatus("err");
    }
  }, []);

  const exportBrief = useCallback(async () => {
    if (!deal) return;
    const markdown = formatDealBrief(deal, comparables);
    try {
      await navigator.clipboard.writeText(markdown);
      setCopyStatus("ok");
      setTimeout(() => setCopyStatus("idle"), 2000);
    } catch {
      setCopyStatus("err");
    }
  }, [deal, comparables]);

  if (!deal) {
    return (
      <div className="rounded-xl border border-dashed border-lacuna-lavender/50 p-8 text-center">
        <p className="text-lacuna-plum font-semibold">Deal not found</p>
        <Link href="/deals" className="mt-2 inline-block text-sm text-lacuna-blue underline">
          Back to deals workspace
        </Link>
      </div>
    );
  }

  const acq = deal.acquisition;
  const sectorKeyword = encodeURIComponent(deal.target.sector.split(/\s+/)[0] ?? "women");

  return (
    <div>
      <nav className="mb-6 text-sm text-lacuna-blue/80">
        <Link href="/" className="hover:text-lacuna-plum">Hub</Link>
        <span className="mx-2">/</span>
        <Link href="/deals" className="hover:text-lacuna-plum">Deals</Link>
        <span className="mx-2">/</span>
        <span className="text-lacuna-plum">{acq.targetName}</span>
      </nav>

      <header className="mb-8">
        <h1 className="text-3xl font-bold text-lacuna-plum sm:text-4xl">
          {acq.targetName}
          <span className="mx-2 text-lacuna-blue/60">→</span>
          {acq.acquirerName}
        </h1>
        <p className="mt-2 text-lacuna-blue">
          {acq.dealType} · Announced {acq.announcedDate}
          {acq.closedDate ? ` · Closed ${acq.closedDate}` : ""}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void copyLink()}
            className="rounded-md border border-lacuna-lavender/50 px-3 py-1.5 text-xs font-medium text-lacuna-plum hover:bg-lacuna-lavender/20"
          >
            {copyStatus === "ok" ? "Link copied" : "Copy link"}
          </button>
          <button
            type="button"
            onClick={() => void exportBrief()}
            className="rounded-md bg-lacuna-plum px-3 py-1.5 text-xs font-medium text-white hover:bg-lacuna-blue"
          >
            Export brief
          </button>
          <Link
            href={`/deals?highlight=${encodeURIComponent(deal.target.id)}#network`}
            className="rounded-md border border-lacuna-plum/30 bg-lacuna-plum/10 px-3 py-1.5 text-xs font-medium text-lacuna-plum hover:bg-lacuna-plum/20"
          >
            View in network
          </Link>
        </div>
      </header>

      <MotionSection className="mb-10 grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-lacuna-lavender/40 bg-white/90 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-lacuna-plum/80">
            Valuation
          </h2>
          <p className="mt-2 text-2xl font-bold text-lacuna-plum">
            {formatValue(acq.dealValue, acq.dealValueNote)}
          </p>
          {acq.dealStructure
            ? <p className="mt-1 text-sm text-lacuna-blue">Structure: {acq.dealStructure}</p>
            : null}
          {typeof acq.preDealValuation === "number"
            ? (
              <p className="mt-2 text-xs text-lacuna-blue/80">
                Pre-deal valuation ~${acq.preDealValuation}M
                {acq.preDealValuationSource ? ` (${acq.preDealValuationSource})` : ""}
              </p>
            )
            : null}
        </div>
        <div className="rounded-xl border border-lacuna-lavender/40 bg-white/90 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-lacuna-plum/80">
            Target profile
          </h2>
          <p className="mt-2 font-semibold text-lacuna-plum">{deal.target.name}</p>
          <p className="text-sm text-lacuna-blue">{deal.target.sector}</p>
          {deal.target.hq
            ? <p className="mt-1 text-xs text-lacuna-blue/80">HQ: {deal.target.hq}</p>
            : null}
        </div>
      </MotionSection>

      {acq.strategicRationale
        ? (
          <MotionSection delay={0.05} className="mb-10">
            <h2 className="text-lg font-semibold text-lacuna-plum">Strategic rationale</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-lacuna-blue">
              {acq.strategicRationale}
            </p>
          </MotionSection>
        )
        : null}

      {ladder
        ? (
          <MotionSection delay={0.08} className="mb-10">
            <h2 className="mb-3 text-lg font-semibold text-lacuna-plum">Evidence ladder</h2>
            <EvidenceLadder ladder={ladder} />
          </MotionSection>
        )
        : null}

      <MotionSection delay={0.1} className="mb-10 space-y-8">
        <DealTable title="Comparable deals (same sector, ±3 years)" rows={comparables} />
        <DealTable title={`Other deals by ${deal.acquirer.name}`} rows={acquirerDeals} />
      </MotionSection>

      <MotionSection delay={0.12} className="mb-10">
        <h2 className="text-lg font-semibold text-lacuna-plum">Related workspaces</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href={`/research#clinical-trials?q=${sectorKeyword}`}
            className="rounded-full border border-lacuna-lavender/50 px-3 py-1 text-xs font-medium text-lacuna-plum hover:bg-lacuna-lavender/20"
          >
            Clinical trials · {deal.target.sector}
          </Link>
          <Link
            href="/research#health-equity"
            className="rounded-full border border-lacuna-lavender/50 px-3 py-1 text-xs font-medium text-lacuna-plum hover:bg-lacuna-lavender/20"
          >
            Health equity context
          </Link>
          <Link
            href="/methods#causal-dag?context=deal"
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

      <MotionSection delay={0.14}>
        <PipelineStatusStrip />
      </MotionSection>
    </div>
  );
}
