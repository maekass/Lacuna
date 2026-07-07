import type { Metadata } from "next";
import StagingDealDetailPage from "@/app/sections/StagingDealDetailPage";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ dealId: string }>;
}

export const metadata: Metadata = {
  title: "Staging deal dossier · Lacuna",
  description:
    "Candidate M&A row awaiting human review — not verified until promoted with attested sources.",
  robots: { index: false, follow: false },
};

export default async function Page({ params }: PageProps) {
  const { dealId } = await params;
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <StagingDealDetailPage dealId={dealId} />
    </main>
  );
}
