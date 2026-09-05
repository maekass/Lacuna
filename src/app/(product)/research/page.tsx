import type { Metadata } from "next";
import ResearchPage from "@/app/sections/ResearchPage";
import { getVerifiedDataset } from "@/lib/data/datasetProvider";
import {
  buildPatientEmpowermentSnapshot,
  toPatientEmpowermentInsightData,
} from "@/lib/research/patientEmpowermentPipeline";
import { buildTrialToTransactionSnapshot } from "@/lib/research/trialToTransactionPipeline";

export const revalidate = 86_400;

export const metadata: Metadata = {
  title: "Lacuna · Research",
  description:
    "Clinical trials, evidence maturity, genomics, health equity, and HLTH Foundation patient empowerment baselines for women's health M&A diligence.",
  alternates: { canonical: "/research" },
};

export default async function Page() {
  const dataset = await getVerifiedDataset();
  const empowermentSnapshot = buildPatientEmpowermentSnapshot(dataset);
  const empowermentInsight = toPatientEmpowermentInsightData(
    empowermentSnapshot,
  );
  const spaceWhSnapshot = buildTrialToTransactionSnapshot(dataset);
  return (
    <ResearchPage
      empowermentSnapshot={empowermentSnapshot}
      empowermentInsight={empowermentInsight}
      spaceWhSnapshot={spaceWhSnapshot}
    />
  );
}
