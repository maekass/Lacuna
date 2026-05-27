import { Company, Acquisition, DealMetrics, Sector, Money } from './types';
import * as ss from 'simple-statistics';

// Sophisticated analytics engine
export const Analytics = {
  // Deal metrics calculation
  calculateDealMetrics(acquisitions: readonly Acquisition[]): DealMetrics {
    const values = acquisitions
      .map(a => a.dealValue)
      .filter((v): v is Money => v !== undefined);
    
    const totalValue = values.reduce((sum, v) => sum + v, 0) as Money;
    const averageValue = values.length > 0 ? (totalValue / values.length) as Money : 0 as Money;
    const medianValue = values.length > 0 ? ss.median(values) as Money : 0 as Money;
    
    // By year
    const byYear = new Map<number, number>();
    acquisitions.forEach(a => {
      const year = a.announcedDate.getFullYear();
      byYear.set(year, (byYear.get(year) || 0) + 1);
    });
    
    // By sector
    const bySector = new Map<Sector, number>();
    // TODO: Implement sector analysis with company lookup
    void acquisitions; // Suppress unused warning for now
    
    return {
      totalValue,
      averageValue,
      medianValue,
      dealCount: acquisitions.length,
      byYear,
      bySector
    };
  },
  
  // Sector distribution
  sectorDistribution(companies: readonly Company[]): Map<Sector, number> {
    const distribution = new Map<Sector, number>();
    
    companies.forEach(c => {
      distribution.set(c.sector, (distribution.get(c.sector) || 0) + 1);
    });
    
    return distribution;
  },
  
  // Stage distribution
  stageDistribution(companies: readonly Company[]): Map<string, number> {
    const distribution = new Map<string, number>();
    
    companies.forEach(c => {
      distribution.set(c.stage, (distribution.get(c.stage) || 0) + 1);
    });
    
    return distribution;
  },
  
  // Valuation statistics
  valuationStats(companies: readonly Company[]): {
    min: Money;
    max: Money;
    mean: Money;
    median: Money;
    stdDev: number;
  } {
    const valuations = companies
      .map(c => c.valuation)
      .filter((v): v is Money => v !== undefined);
    
    if (valuations.length === 0) {
      return { min: 0 as Money, max: 0 as Money, mean: 0 as Money, median: 0 as Money, stdDev: 0 };
    }
    
    return {
      min: Math.min(...valuations) as Money,
      max: Math.max(...valuations) as Money,
      mean: ss.mean(valuations) as Money,
      median: ss.median(valuations) as Money,
      stdDev: ss.standardDeviation(valuations)
    };
  },
  
  // Growth rate calculation
  growthRate(current: number, previous: number): number {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  },
  
  // CAGR calculation
  cagr(startValue: number, endValue: number, years: number): number {
    if (startValue <= 0 || years <= 0) return 0;
    return (Math.pow(endValue / startValue, 1 / years) - 1) * 100;
  }
};

// Network analysis
export const NetworkAnalysis = {
  // Degree centrality (number of connections)
  degreeCentrality(nodeId: string, links: readonly { source: string; target: string }[]): number {
    return links.filter(l => l.source === nodeId || l.target === nodeId).length;
  },
  
  // Find connected components
  findClusters(links: readonly { source: string; target: string }[]): string[][] {
    const adjacency = new Map<string, Set<string>>();
    
    // Build adjacency list
    links.forEach(link => {
      if (!adjacency.has(link.source)) adjacency.set(link.source, new Set());
      if (!adjacency.has(link.target)) adjacency.set(link.target, new Set());
      adjacency.get(link.source)!.add(link.target);
      adjacency.get(link.target)!.add(link.source);
    });
    
    const visited = new Set<string>();
    const clusters: string[][] = [];
    
    // DFS for each unvisited node
    adjacency.forEach((_, node) => {
      if (!visited.has(node)) {
        const cluster: string[] = [];
        const stack = [node];
        
        while (stack.length > 0) {
          const current = stack.pop()!;
          if (!visited.has(current)) {
            visited.add(current);
            cluster.push(current);
            const neighbors = adjacency.get(current) || new Set();
            neighbors.forEach(n => {
              if (!visited.has(n)) stack.push(n);
            });
          }
        }
        
        clusters.push(cluster);
      }
    });
    
    return clusters;
  }
};
