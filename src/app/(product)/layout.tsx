import AppShell from "@/components/layout/AppShell";
import LegacyHashRedirect from "@/components/layout/LegacyHashRedirect";
import { getVerifiedDataset } from "@/lib/data/datasetProvider";
import { applyDatasetScope } from "@/lib/data/medBiotechFilters";
import { VerifiedDatasetProvider } from "@/lib/data/VerifiedDatasetContext";
import { commandDealsFromDataset } from "@/lib/ui/commandPalette";

export default async function ProductLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const full = await getVerifiedDataset();
  const dataset = applyDatasetScope(full, "med_biotech");
  const deals = commandDealsFromDataset(full);
  return (
    <VerifiedDatasetProvider dataset={dataset}>
      <LegacyHashRedirect />
      <AppShell deals={deals}>{children}</AppShell>
    </VerifiedDatasetProvider>
  );
}
