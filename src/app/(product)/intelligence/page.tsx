import type { Metadata } from "next";
import IntelligencePage from "@/app/sections/IntelligencePage";
import CatalystWatchlistSection from "@/components/CatalystWatchlistSection";
import DataPipelineStatus from "@/components/DataPipelineStatus";
import { getDataMode } from "@/lib/data/datasetProvider";
import { loadSummaryPipelines } from "@/lib/ingestion/loadSummaryPipelines";

export const revalidate = 86_400;

export const metadata: Metadata = {
  title: "Lacuna · Intelligence",
  description:
    "Reimbursement context, historical acquirer-profile overlap, and dataset export. Descriptive heuristics, not an acquisition forecast.",
  alternates: { canonical: "/intelligence" },
};

export default async function Page() {
  const pipelines = getDataMode() === "db"
    ? await loadSummaryPipelines()
    : undefined;
  return (
    <IntelligencePage
      pipelinePanel={<DataPipelineStatus pipelines={pipelines} />}
      catalystWatchlist={<CatalystWatchlistSection />}
    />
  );
}
