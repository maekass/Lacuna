import { getVerifiedDataset } from '@/lib/data/datasetProvider';
import { VerifiedDatasetProvider } from '@/lib/data/VerifiedDatasetContext';
import HomePage from './HomePage';

export default async function Page() {
  const dataset = await getVerifiedDataset();
  return (
    <VerifiedDatasetProvider dataset={dataset}>
      <HomePage />
    </VerifiedDatasetProvider>
  );
}
