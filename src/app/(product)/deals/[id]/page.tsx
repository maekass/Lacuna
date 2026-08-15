import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DealDetailPage from "@/app/sections/DealDetailPage";
import { getStaticVerifiedDataset } from "@/lib/data/staticDataset";
import { getDealById, getDealDetailView } from "@/lib/deals";

export const revalidate = 86_400;

interface PageProps {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  const dataset = getStaticVerifiedDataset();
  return dataset.acquisitions.map((a) => ({ id: a.id }));
}

export async function generateMetadata(
  { params }: PageProps,
): Promise<Metadata> {
  const { id } = await params;
  const dataset = getStaticVerifiedDataset();
  const deal = getDealById(dataset, id);
  if (!deal) {
    return { title: "Deal not found · Lacuna" };
  }
  const acq = deal.acquisition;
  const valueBit = typeof acq.dealValue === "number"
    ? ` $${acq.dealValue}M disclosed.`
    : " Value undisclosed.";
  const description =
    `Verified women's health ${acq.dealType}: ${acq.targetName} → ${acq.acquirerName}, announced ${acq.announcedDate}.${valueBit} Sources and limitations from public filings.`;
  return {
    title: `${acq.targetName} → ${acq.acquirerName} · Lacuna`,
    description,
    alternates: { canonical: `/deals/${id}` },
    openGraph: {
      title: `${acq.targetName} → ${acq.acquirerName}`,
      description,
      type: "article",
    },
  };
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  const dataset = getStaticVerifiedDataset();
  const view = getDealDetailView(dataset, id);
  if (!view) {
    notFound();
  }
  return <DealDetailPage view={view} />;
}
