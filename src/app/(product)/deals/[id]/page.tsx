import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DealDetailPage from "@/app/sections/DealDetailPage";
import { getStaticVerifiedDataset } from "@/lib/data/staticDataset";
import { getDealById } from "@/lib/deals";

export const revalidate = 86_400;

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  const dataset = getStaticVerifiedDataset();
  return dataset.acquisitions.map((a) => ({ id: a.id }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const dataset = getStaticVerifiedDataset();
  const deal = getDealById(dataset, id);
  if (!deal) {
    return { title: "Deal not found · Lacuna" };
  }
  const acq = deal.acquisition;
  return {
    title: `${acq.targetName} → ${acq.acquirerName} · Lacuna`,
    description: `Verified women's health M&A: ${acq.dealType}, announced ${acq.announcedDate}. Sources and limitations from public filings.`,
    alternates: { canonical: `/deals/${id}` },
  };
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  const dataset = getStaticVerifiedDataset();
  if (!getDealById(dataset, id)) {
    notFound();
  }
  return <DealDetailPage dealId={id} />;
}
