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
    "Reimbursement intelligence, acquirer fit scores, and pitch deck export for women's health M&A diligence.",
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
