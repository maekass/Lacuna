import HubPage from "@/app/sections/HubPage";
import { getVerifiedDataset } from "@/lib/data/datasetProvider";
import { getDatasetChangelog } from "@/lib/data/getDatasetChangelog";
import {
  buildPatientEmpowermentSnapshot,
  toPatientEmpowermentInsightData,
} from "@/lib/research/patientEmpowermentPipeline";

export const revalidate = 86_400;

export default async function Page() {
  const dataset = await getVerifiedDataset();
  const changelog = getDatasetChangelog(dataset);
  const empowermentInsight = toPatientEmpowermentInsightData(
    buildPatientEmpowermentSnapshot(dataset),
  );
  return (
    <HubPage
      changelog={changelog}
      empowermentInsight={empowermentInsight}
    />
  );
}
