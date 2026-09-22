import type { Metadata } from "next";
import MethodsPage from "@/app/sections/MethodsPage";
import DataQualitySection from "@/components/DataQualitySection";
import { getVerifiedDataset } from "@/lib/data/datasetProvider";
import { getDatasetChangelog } from "@/lib/data/getDatasetChangelog";

export const revalidate = 86_400;

export const metadata: Metadata = {
  title: "Lacuna · Methods",
  description:
    "Record-quality grades, observed sector composition, and announcement timing from the verified women's health M&A dataset.",
  alternates: { canonical: "/methods" },
};

export default async function Page() {
  const dataset = await getVerifiedDataset();
  const changelog = getDatasetChangelog(dataset);
  return (
    <MethodsPage changelog={changelog} dataQuality={<DataQualitySection />} />
  );
}
