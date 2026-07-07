import { getVerifiedDataset } from "@/lib/data/datasetProvider";
import { applyDatasetScope } from "@/lib/data/medBiotechFilters";
import { VerifiedDatasetProvider } from "@/lib/data/VerifiedDatasetContext";

/** Consumer health workspace uses its own scoped dataset (nested provider). */
export default async function ConsumerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const full = await getVerifiedDataset();
  const dataset = applyDatasetScope(full, "consumer_health");
  return (
    <VerifiedDatasetProvider dataset={dataset}>{children}</VerifiedDatasetProvider>
  );
}
