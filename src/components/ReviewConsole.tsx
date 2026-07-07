"use client";

import { useMemo, useState } from "react";
import CandidateImportPanel from "@/components/CandidateImportPanel";
import DataIngestPanel from "@/components/DataIngestPanel";
import DealReviewQueue from "@/components/DealReviewQueue";
import FundingEventsPanel from "@/components/FundingEventsPanel";
import PipelineStatusStrip from "@/components/PipelineStatusStrip";

export type ReviewConsoleTab = "ma" | "funding" | "import" | "pipeline";

const TAB_LABELS: Record<ReviewConsoleTab, string> = {
  ma: "M&A queue",
  funding: "Funding (Form D)",
  import: "Import",
  pipeline: "Pipeline",
};

function tabButtonClass(active: boolean): string {
  return active
    ? "border-lacuna-plum bg-lacuna-plum/10 text-lacuna-plum"
    : "border-lacuna-lavender/40 bg-white/70 text-lacuna-blue hover:bg-lacuna-lavender/10";
}

export default function ReviewConsole({
  defaultTab = "ma",
}: {
  defaultTab?: ReviewConsoleTab;
}) {
  const [tab, setTab] = useState<ReviewConsoleTab>(defaultTab);
  const [refreshToken, setRefreshToken] = useState(0);

  const tabs = useMemo(
    () => (Object.keys(TAB_LABELS) as ReviewConsoleTab[]),
    [],
  );

  return (
    <div className="rounded-xl border border-lacuna-lavender/40 bg-white/90 p-6 shadow-sm">
      <PipelineStatusStrip />

      <div className="mt-4 flex flex-wrap gap-2">
        {tabs.map((t) => {
          const active = t === tab;
          return (
            <button
              key={t}
              type="button"
              aria-pressed={active}
              onClick={() => setTab(t)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                tabButtonClass(active)
              }`}
            >
              {TAB_LABELS[t]}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setRefreshToken((n) => n + 1)}
          className="ml-auto rounded-full border border-lacuna-lavender/40 bg-white/70 px-3 py-1.5 text-xs font-medium text-lacuna-plum hover:bg-lacuna-lavender/10"
        >
          Refresh
        </button>
      </div>

      <div className="mt-5">
        {tab === "ma" ? <DealReviewQueue refreshToken={refreshToken} /> : null}

        {tab === "funding"
          ? <FundingEventsPanel refreshToken={refreshToken} />
          : null}

        {tab === "import"
          ? (
            <CandidateImportPanel
              onImported={() => setRefreshToken((n) => n + 1)}
            />
          )
          : null}

        {tab === "pipeline" ? <DataIngestPanel /> : null}
      </div>
    </div>
  );
}
