import { useCallback, useMemo } from 'react';
import { Company, SimilarityScore, MarketCluster } from '@/lib/types';
import * as ss from 'simple-statistics';

// Re-export from usePredictions for cleaner API
export { usePredictions } from './usePredictions';

export function useSimilarityAnalysis(companies: readonly Company[]) {
  const calculateSimilarity = useCallback((targetId: string): SimilarityScore[] => {
    const target = companies.find(c => c.id === targetId);
    if (!target) return [];

    const targetVector = [
      target.sector === 'Fertility' ? 1 : 0,
      target.sector === 'Mental Health' ? 1 : 0,
      target.sector === 'Wearables' ? 1 : 0,
      target.sector === 'General Wellness' ? 1 : 0,
      target.sector === 'Pelvic Health' ? 1 : 0,
      target.valuation ? Math.log(target.valuation) / 10 : 0,
      target.employees / 1000,
      ['Late Stage', 'Pre-IPO'].includes(target.stage) ? 1 : 0.5,
    ];

    return companies
      .filter(c => c.id !== targetId)
      .map(company => {
        const vector = [
          company.sector === 'Fertility' ? 1 : 0,
          company.sector === 'Mental Health' ? 1 : 0,
          company.sector === 'Wearables' ? 1 : 0,
          company.sector === 'General Wellness' ? 1 : 0,
          company.sector === 'Pelvic Health' ? 1 : 0,
          company.valuation ? Math.log(company.valuation) / 10 : 0,
          company.employees / 1000,
          ['Late Stage', 'Pre-IPO'].includes(company.stage) ? 1 : 0.5,
        ];

        const dot = targetVector.reduce((sum, v, i) => sum + v * vector[i], 0);
        const magA = Math.sqrt(targetVector.reduce((sum, v) => sum + v * v, 0));
        const magB = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
        const similarity = dot / (magA * magB);

        const sharedFactors: string[] = [];
        if (company.sector === target.sector) sharedFactors.push(`Same sector (${company.sector})`);
        if (Math.abs((company.valuation || 0) - (target.valuation || 0)) < 200) sharedFactors.push('Similar valuation range');
        if (company.stage === target.stage) sharedFactors.push(`Same stage (${company.stage})`);

        return {
          company,
          similarity: isNaN(similarity) ? 0 : similarity,
          sharedFactors,
          vector
        };
      })
      .sort((a, b) => b.similarity - a.similarity);
  }, [companies]);

  return { calculateSimilarity };
}

export function useClustering(companies: readonly Company[]) {
  const clusters = useMemo((): MarketCluster[] => {
    if (companies.length === 0) return [];

    const CLUSTER_COUNT = 3; // k-means k value
    const data = companies.map(c => ({
      x: c.valuation || 50,
      y: c.employees,
      company: c
    }));

    // K-means clustering with configurable cluster count
    const baseCentroids = [
      { x: 100, y: 50 },
      { x: 500, y: 200 },
      { x: 2000, y: 500 }
    ];
    let centroids = baseCentroids.slice(0, Math.min(CLUSTER_COUNT, baseCentroids.length));

    let assignments: number[] = [];

    for (let iter = 0; iter < 10; iter++) {
      assignments = data.map(point => {
        const distances = centroids.map(c => 
          Math.sqrt(Math.pow(point.x - c.x, 2) + Math.pow(point.y - c.y, 2))
        );
        return distances.indexOf(Math.min(...distances));
      });

      centroids = centroids.map((_, i) => {
        const clusterPoints = data.filter((_, j) => assignments[j] === i);
        if (clusterPoints.length === 0) return centroids[i];
        return {
          x: ss.mean(clusterPoints.map(p => p.x)),
          y: ss.mean(clusterPoints.map(p => p.y))
        };
      });
    }

    const names = ['Emerging Startups', 'Growth Stage', 'Late Stage Scale-ups'];

    return centroids.map((centroid, i) => {
      const clusterCompanies = data
        .filter((_, j) => assignments[j] === i)
        .map(d => d.company);

      const avgValuation = ss.mean(clusterCompanies.map(c => c.valuation || 0));
      const avgEmployees = ss.mean(clusterCompanies.map(c => c.employees));
      const sectors = [...new Set(clusterCompanies.map(c => c.sector))];

      return {
        id: i,
        name: names[i],
        companies: clusterCompanies,
        centroid: { valuation: centroid.x, employees: centroid.y },
        characteristics: [
          `Avg valuation: $${Math.round(avgValuation)}M`,
          `Avg team: ${Math.round(avgEmployees)} people`,
          `Sectors: ${sectors.slice(0, 3).join(', ')}${sectors.length > 3 ? '...' : ''}`
        ],
        avgValuation: avgValuation as import('@/lib/types').Money,
        avgEmployees
      };
    });
  }, [companies]);

  return { clusters };
}
