import AppShell from "@/components/layout/AppShell";
import LegacyHashRedirect from "@/components/layout/LegacyHashRedirect";
import { getVerifiedDataset } from "@/lib/data/datasetProvider";
import { VerifiedDatasetProvider } from "@/lib/data/VerifiedDatasetContext";

export default async function ProductLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const dataset = await getVerifiedDataset();
  return (
    <VerifiedDatasetProvider dataset={dataset}>
      <LegacyHashRedirect />
      <AppShell>{children}</AppShell>
    </VerifiedDatasetProvider>
  );
}
