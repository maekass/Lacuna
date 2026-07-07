import AppShell from "@/components/layout/AppShell";
import LegacyHashRedirect from "@/components/layout/LegacyHashRedirect";
import { getVerifiedDataset } from "@/lib/data/datasetProvider";
import { applyDatasetScope } from "@/lib/data/medBiotechFilters";
import { VerifiedDatasetProvider } from "@/lib/data/VerifiedDatasetContext";

export default async function ProductLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const full = await getVerifiedDataset();
  const dataset = applyDatasetScope(full, "med_biotech");
  return (
    <VerifiedDatasetProvider dataset={dataset}>
      <LegacyHashRedirect />
      <AppShell>{children}</AppShell>
    </VerifiedDatasetProvider>
  );
}
