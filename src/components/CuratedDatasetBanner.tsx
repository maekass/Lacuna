'use client';

import { useVerifiedDataset } from '@/lib/data/VerifiedDatasetContext';

interface CuratedDatasetBannerProps {
  className?: string;
}

/**
 * Standard provenance strip for analytical panels — curated static dataset, not live market feeds.
 */
export default function CuratedDatasetBanner({ className = '' }: CuratedDatasetBannerProps) {
  const { verifiedAcquisitions } = useVerifiedDataset();
  const dealCount = verifiedAcquisitions.length;

  return (
    <p
      role="note"
      className={`rounded-lg border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-xs text-amber-900 leading-relaxed ${className}`}
    >
      Curated dataset · n={dealCount} verified deals · Not live market data · Scores are descriptive,
      not forecasts
    </p>
  );
}
