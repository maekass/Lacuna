/**
 * Network Statistics with Bootstrap Confidence Intervals
 * 
 * Implements honest network analysis for small samples (n=15-20):
 * - Bootstrap resampling for CIs (instead of point estimates)
 * - Gini coefficient and Herfindahl index (instead of power law fitting)
 * - Null model comparison (random graph expectations)
 * - Robust descriptives (median, IQR over mean, SD)
 * 
 * Why these over power laws?
 * Clauset et al. (2009) showed power law fitting requires n>100 minimum.
 * For n=15-20, alternative concentration metrics are far more defensible.
 * 
 * References:
 * - Efron, B. (1979). "Bootstrap methods: Another look at the jackknife"
 * - Clauset, A., Shalizi, C.R., Newman, M.E.J. (2009). "Power-law distributions in empirical data"
 * - Newman, M.E.J. (2003). "The structure and function of complex networks"
 */

export interface NetworkNode {
  id: string;
  label: string;
  type: 'company' | 'acquirer' | 'investor';
  sector?: string;
  valuation?: number;
}

export interface NetworkEdge {
  source: string;
  target: string;
  weight?: number;
  type?: 'acquisition' | 'investment' | 'partnership';
  year?: number;
}

export interface BootstrapResult {
  estimate: number;
  lower: number;
  upper: number;
  median: number;
  iqr: [number, number];
  numSamples: number;
}

/**
 * Generic bootstrap function for any network statistic
 * Returns 95% CI via percentile method
 */
export function bootstrap<T>(
  data: T[],
  statistic: (sample: T[]) => number,
  numResamples: number = 1000,
  confidenceLevel: number = 0.95
): BootstrapResult {
  if (data.length === 0) {
    return { estimate: 0, lower: 0, upper: 0, median: 0, iqr: [0, 0], numSamples: 0 };
  }
  
  const estimate = statistic(data);
  const samples: number[] = [];
  
  for (let i = 0; i < numResamples; i++) {
    // Sample with replacement
    const resample: T[] = [];
    for (let j = 0; j < data.length; j++) {
      resample.push(data[Math.floor(Math.random() * data.length)]);
    }
    samples.push(statistic(resample));
  }
  
  samples.sort((a, b) => a - b);
  const alpha = 1 - confidenceLevel;
  const lowerIdx = Math.floor(numResamples * (alpha / 2));
  const upperIdx = Math.floor(numResamples * (1 - alpha / 2));
  const medianIdx = Math.floor(numResamples * 0.5);
  const q1Idx = Math.floor(numResamples * 0.25);
  const q3Idx = Math.floor(numResamples * 0.75);
  
  return {
    estimate,
    lower: samples[lowerIdx],
    upper: samples[upperIdx],
    median: samples[medianIdx],
    iqr: [samples[q1Idx], samples[q3Idx]],
    numSamples: numResamples
  };
}

/**
 * Degree distribution with summary statistics
 */
export function degreeDistribution(nodes: NetworkNode[], edges: NetworkEdge[]): {
  degrees: Map<string, number>;
  median: number;
  mean: number;
  iqr: [number, number];
  max: number;
  min: number;
  distribution: number[];
} {
  const degrees = new Map<string, number>();
  nodes.forEach(n => degrees.set(n.id, 0));
  
  edges.forEach(e => {
    degrees.set(e.source, (degrees.get(e.source) || 0) + 1);
    degrees.set(e.target, (degrees.get(e.target) || 0) + 1);
  });
  
  const values = Array.from(degrees.values()).sort((a, b) => a - b);
  const n = values.length;
  
  if (n === 0) {
    return { degrees, median: 0, mean: 0, iqr: [0, 0], max: 0, min: 0, distribution: [] };
  }
  
  return {
    degrees,
    median: values[Math.floor(n / 2)],
    mean: values.reduce((s, v) => s + v, 0) / n,
    iqr: [values[Math.floor(n * 0.25)], values[Math.floor(n * 0.75)]],
    max: values[n - 1],
    min: values[0],
    distribution: values
  };
}

/**
 * Network density: actual edges / possible edges
 */
export function networkDensity(numNodes: number, numEdges: number, directed: boolean = false): {
  density: number;
  maxPossibleEdges: number;
  interpretation: string;
} {
  if (numNodes < 2) return { density: 0, maxPossibleEdges: 0, interpretation: 'Too few nodes' };
  
  const maxEdges = directed 
    ? numNodes * (numNodes - 1)
    : (numNodes * (numNodes - 1)) / 2;
  
  const density = numEdges / maxEdges;
  
  let interpretation: string;
  if (density < 0.1) interpretation = 'Sparse network';
  else if (density < 0.3) interpretation = 'Moderately sparse';
  else if (density < 0.5) interpretation = 'Moderately dense';
  else interpretation = 'Dense network';
  
  return { density, maxPossibleEdges: maxEdges, interpretation };
}

/**
 * Clustering coefficient (local) for each node
 * Returns average with bootstrap CI
 */
export function clusteringCoefficient(nodes: NetworkNode[], edges: NetworkEdge[]): {
  byNode: Map<string, number>;
  average: number;
  bootstrap: BootstrapResult;
} {
  // Build adjacency map
  const adjacency = new Map<string, Set<string>>();
  nodes.forEach(n => adjacency.set(n.id, new Set()));
  edges.forEach(e => {
    adjacency.get(e.source)?.add(e.target);
    adjacency.get(e.target)?.add(e.source);
  });
  
  // Calculate local clustering for each node
  const clustering = new Map<string, number>();
  nodes.forEach(n => {
    const neighbors = Array.from(adjacency.get(n.id) || []);
    const k = neighbors.length;
    
    if (k < 2) {
      clustering.set(n.id, 0);
      return;
    }
    
    // Count triangles
    let triangles = 0;
    for (let i = 0; i < k; i++) {
      for (let j = i + 1; j < k; j++) {
        if (adjacency.get(neighbors[i])?.has(neighbors[j])) {
          triangles++;
        }
      }
    }
    
    const possibleTriangles = (k * (k - 1)) / 2;
    clustering.set(n.id, possibleTriangles > 0 ? triangles / possibleTriangles : 0);
  });
  
  const values = Array.from(clustering.values());
  const average = values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : 0;
  
  // Bootstrap CI
  const bootstrapCI = bootstrap(
    values,
    (sample) => sample.reduce((s, v) => s + v, 0) / Math.max(1, sample.length),
    1000
  );
  
  return { byNode: clustering, average, bootstrap: bootstrapCI };
}

/**
 * Average shortest path length (using BFS)
 * Returns only for connected components
 */
export function averageShortestPath(nodes: NetworkNode[], edges: NetworkEdge[]): {
  averagePathLength: number;
  diameter: number;
  isConnected: boolean;
  componentSizes: number[];
} {
  if (nodes.length === 0) {
    return { averagePathLength: 0, diameter: 0, isConnected: true, componentSizes: [] };
  }
  
  // Build adjacency
  const adjacency = new Map<string, string[]>();
  nodes.forEach(n => adjacency.set(n.id, []));
  edges.forEach(e => {
    adjacency.get(e.source)?.push(e.target);
    adjacency.get(e.target)?.push(e.source);
  });
  
  // Find connected components
  const visited = new Set<string>();
  const componentSizes: number[] = [];
  
  for (const node of nodes) {
    if (!visited.has(node.id)) {
      const queue = [node.id];
      let size = 0;
      while (queue.length > 0) {
        const current = queue.shift()!;
        if (visited.has(current)) continue;
        visited.add(current);
        size++;
        adjacency.get(current)?.forEach(neighbor => {
          if (!visited.has(neighbor)) queue.push(neighbor);
        });
      }
      componentSizes.push(size);
    }
  }
  
  const isConnected = componentSizes.length === 1;
  
  // BFS for path lengths (only in largest component)
  const pathLengths: number[] = [];
  let diameter = 0;
  
  for (let i = 0; i < nodes.length; i++) {
    const distances = new Map<string, number>();
    distances.set(nodes[i].id, 0);
    const queue: [string, number][] = [[nodes[i].id, 0]];
    
    while (queue.length > 0) {
      const [current, dist] = queue.shift()!;
      adjacency.get(current)?.forEach(neighbor => {
        if (!distances.has(neighbor)) {
          distances.set(neighbor, dist + 1);
          queue.push([neighbor, dist + 1]);
        }
      });
    }
    
    distances.forEach((d, _) => {
      if (d > 0) {
        pathLengths.push(d);
        if (d > diameter) diameter = d;
      }
    });
  }
  
  const averagePathLength = pathLengths.length > 0
    ? pathLengths.reduce((s, v) => s + v, 0) / pathLengths.length
    : 0;
  
  return {
    averagePathLength,
    diameter,
    isConnected,
    componentSizes: componentSizes.sort((a, b) => b - a)
  };
}

/**
 * Gini coefficient: measure of inequality
 * 0 = perfect equality, 1 = perfect inequality
 * 
 * More defensible than power law fitting for small n
 */
export function giniCoefficient(values: number[]): {
  gini: number;
  interpretation: string;
  topConcentration: { top1: number; top3: number; top5: number };
} {
  if (values.length === 0) {
    return { gini: 0, interpretation: 'No data', topConcentration: { top1: 0, top3: 0, top5: 0 } };
  }
  
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const sum = sorted.reduce((s, v) => s + v, 0);
  
  if (sum === 0) {
    return { gini: 0, interpretation: 'No values', topConcentration: { top1: 0, top3: 0, top5: 0 } };
  }
  
  // Gini = (sum of (2i - n - 1) * x_i) / (n * sum)
  let weightedSum = 0;
  for (let i = 0; i < n; i++) {
    weightedSum += (2 * (i + 1) - n - 1) * sorted[i];
  }
  
  const gini = weightedSum / (n * sum);
  
  // Top X concentration (sorted descending for this)
  const desc = [...values].sort((a, b) => b - a);
  const top1 = desc.length > 0 ? desc[0] / sum : 0;
  const top3 = desc.slice(0, 3).reduce((s, v) => s + v, 0) / sum;
  const top5 = desc.slice(0, 5).reduce((s, v) => s + v, 0) / sum;
  
  let interpretation: string;
  if (gini < 0.2) interpretation = 'Very equal distribution';
  else if (gini < 0.4) interpretation = 'Moderately equal';
  else if (gini < 0.6) interpretation = 'Moderately unequal';
  else if (gini < 0.8) interpretation = 'High concentration';
  else interpretation = 'Extreme concentration';
  
  return { gini, interpretation, topConcentration: { top1, top3, top5 } };
}

/**
 * Herfindahl-Hirschman Index: sum of squared market shares
 * 
 * Interpretation (DOJ guidelines):
 * < 1500: Unconcentrated
 * 1500-2500: Moderately concentrated
 * > 2500: Highly concentrated
 */
export function herfindahlIndex(values: number[]): {
  hhi: number;
  normalizedHHI: number; // 0-1 scale
  interpretation: string;
  doj_classification: 'unconcentrated' | 'moderately_concentrated' | 'highly_concentrated';
} {
  const sum = values.reduce((s, v) => s + v, 0);
  
  if (sum === 0) {
    return { 
      hhi: 0, 
      normalizedHHI: 0, 
      interpretation: 'No data', 
      doj_classification: 'unconcentrated' 
    };
  }
  
  // Shares as percentages (out of 100)
  const shares = values.map(v => (v / sum) * 100);
  const hhi = shares.reduce((s, share) => s + share * share, 0);
  
  // Normalized HHI (0-1 scale)
  const normalizedHHI = hhi / 10000;
  
  let doj_classification: 'unconcentrated' | 'moderately_concentrated' | 'highly_concentrated';
  let interpretation: string;
  
  if (hhi < 1500) {
    doj_classification = 'unconcentrated';
    interpretation = 'Unconcentrated market (DOJ classification)';
  } else if (hhi < 2500) {
    doj_classification = 'moderately_concentrated';
    interpretation = 'Moderately concentrated (DOJ classification)';
  } else {
    doj_classification = 'highly_concentrated';
    interpretation = 'Highly concentrated (DOJ classification)';
  }
  
  return { hhi, normalizedHHI, interpretation, doj_classification };
}

/**
 * Null model comparison: What would we expect under random allocation?
 * Compares observed concentration to random baseline
 */
export function nullModelComparison(
  observedValues: number[],
  numSimulations: number = 1000
): {
  observed: { gini: number; hhi: number; top3: number };
  randomBaseline: { 
    gini: { mean: number; ci: [number, number] };
    hhi: { mean: number; ci: [number, number] };
    top3: { mean: number; ci: [number, number] };
  };
  zScore: { gini: number; hhi: number; top3: number };
  interpretation: string;
} {
  const n = observedValues.length;
  const total = observedValues.reduce((s, v) => s + v, 0);
  
  if (n === 0 || total === 0) {
    return {
      observed: { gini: 0, hhi: 0, top3: 0 },
      randomBaseline: {
        gini: { mean: 0, ci: [0, 0] },
        hhi: { mean: 0, ci: [0, 0] },
        top3: { mean: 0, ci: [0, 0] }
      },
      zScore: { gini: 0, hhi: 0, top3: 0 },
      interpretation: 'No data'
    };
  }
  
  // Observed metrics
  const observed = {
    gini: giniCoefficient(observedValues).gini,
    hhi: herfindahlIndex(observedValues).hhi,
    top3: giniCoefficient(observedValues).topConcentration.top3
  };
  
  // Simulate random allocation (each unit randomly assigned to a bucket)
  const randomGinis: number[] = [];
  const randomHHIs: number[] = [];
  const randomTop3s: number[] = [];
  
  for (let sim = 0; sim < numSimulations; sim++) {
    const buckets = new Array(n).fill(0);
    for (let i = 0; i < total; i++) {
      buckets[Math.floor(Math.random() * n)]++;
    }
    randomGinis.push(giniCoefficient(buckets).gini);
    randomHHIs.push(herfindahlIndex(buckets).hhi);
    randomTop3s.push(giniCoefficient(buckets).topConcentration.top3);
  }
  
  // Statistics on null distribution
  const meanGini = randomGinis.reduce((s, v) => s + v, 0) / numSimulations;
  const meanHHI = randomHHIs.reduce((s, v) => s + v, 0) / numSimulations;
  const meanTop3 = randomTop3s.reduce((s, v) => s + v, 0) / numSimulations;
  
  const sdGini = Math.sqrt(randomGinis.reduce((s, v) => s + (v - meanGini) ** 2, 0) / numSimulations);
  const sdHHI = Math.sqrt(randomHHIs.reduce((s, v) => s + (v - meanHHI) ** 2, 0) / numSimulations);
  const sdTop3 = Math.sqrt(randomTop3s.reduce((s, v) => s + (v - meanTop3) ** 2, 0) / numSimulations);
  
  // 95% CIs
  randomGinis.sort((a, b) => a - b);
  randomHHIs.sort((a, b) => a - b);
  randomTop3s.sort((a, b) => a - b);
  const lowerIdx = Math.floor(numSimulations * 0.025);
  const upperIdx = Math.floor(numSimulations * 0.975);
  
  const randomBaseline = {
    gini: { mean: meanGini, ci: [randomGinis[lowerIdx], randomGinis[upperIdx]] as [number, number] },
    hhi: { mean: meanHHI, ci: [randomHHIs[lowerIdx], randomHHIs[upperIdx]] as [number, number] },
    top3: { mean: meanTop3, ci: [randomTop3s[lowerIdx], randomTop3s[upperIdx]] as [number, number] }
  };
  
  // Z-scores
  const zScore = {
    gini: sdGini > 0 ? (observed.gini - meanGini) / sdGini : 0,
    hhi: sdHHI > 0 ? (observed.hhi - meanHHI) / sdHHI : 0,
    top3: sdTop3 > 0 ? (observed.top3 - meanTop3) / sdTop3 : 0
  };
  
  let interpretation: string;
  if (Math.abs(zScore.gini) > 3) {
    interpretation = 'Observed concentration significantly different from random allocation';
  } else if (Math.abs(zScore.gini) > 2) {
    interpretation = 'Observed concentration moderately different from random';
  } else {
    interpretation = 'Observed concentration consistent with random allocation';
  }
  
  return { observed, randomBaseline, zScore, interpretation };
}

/**
 * Temporal Analysis: Acquisitions per year with trend assessment
 * 
 * Honest about small-n: Wide CIs, no power law fits to time series
 */
export interface TemporalAnalysisResult {
  yearlyData: { year: number; count: number }[];
  totalAcquisitions: number;
  yearRange: [number, number];
  median: number;
  mean: number;
  iqr: [number, number];
  trend: {
    slope: number;
    interpretation: 'accelerating' | 'decelerating' | 'flat' | 'too_noisy';
    rSquared: number;
    confidence: 'high' | 'medium' | 'low' | 'insufficient_data';
  };
  caveats: string[];
}

export function temporalAnalysis(edges: NetworkEdge[]): TemporalAnalysisResult {
  // Filter to edges with year data
  const dated = edges.filter(e => e.year !== undefined);
  
  if (dated.length === 0) {
    return {
      yearlyData: [],
      totalAcquisitions: 0,
      yearRange: [0, 0],
      median: 0,
      mean: 0,
      iqr: [0, 0],
      trend: { slope: 0, interpretation: 'too_noisy', rSquared: 0, confidence: 'insufficient_data' },
      caveats: ['No temporal data available']
    };
  }
  
  // Aggregate by year
  const yearCounts = new Map<number, number>();
  dated.forEach(e => {
    yearCounts.set(e.year!, (yearCounts.get(e.year!) || 0) + 1);
  });
  
  const minYear = Math.min(...dated.map(e => e.year!));
  const maxYear = Math.max(...dated.map(e => e.year!));
  
  // Fill in zero years for completeness
  const yearlyData: { year: number; count: number }[] = [];
  for (let y = minYear; y <= maxYear; y++) {
    yearlyData.push({ year: y, count: yearCounts.get(y) || 0 });
  }
  
  const counts = yearlyData.map(d => d.count).sort((a, b) => a - b);
  const n = counts.length;
  const median = counts[Math.floor(n / 2)];
  const mean = counts.reduce((s, v) => s + v, 0) / n;
  const iqr: [number, number] = [counts[Math.floor(n * 0.25)], counts[Math.floor(n * 0.75)]];
  
  // Simple linear regression for trend
  const xs = yearlyData.map((_, i) => i);
  const ys = yearlyData.map(d => d.count);
  const xMean = xs.reduce((s, v) => s + v, 0) / xs.length;
  const yMean = ys.reduce((s, v) => s + v, 0) / ys.length;
  
  const numerator = xs.reduce((s, x, i) => s + (x - xMean) * (ys[i] - yMean), 0);
  const denominator = xs.reduce((s, x) => s + (x - xMean) ** 2, 0);
  
  const slope = denominator > 0 ? numerator / denominator : 0;
  
  // R-squared
  const ssTotal = ys.reduce((s, y) => s + (y - yMean) ** 2, 0);
  const intercept = yMean - slope * xMean;
  const ssResidual = ys.reduce((s, y, i) => s + (y - (slope * xs[i] + intercept)) ** 2, 0);
  const rSquared = ssTotal > 0 ? 1 - ssResidual / ssTotal : 0;
  
  let interpretation: 'accelerating' | 'decelerating' | 'flat' | 'too_noisy';
  if (rSquared < 0.2) {
    interpretation = 'too_noisy';
  } else if (Math.abs(slope) < 0.1) {
    interpretation = 'flat';
  } else if (slope > 0) {
    interpretation = 'accelerating';
  } else {
    interpretation = 'decelerating';
  }
  
  let confidence: 'high' | 'medium' | 'low' | 'insufficient_data';
  if (dated.length < 10) confidence = 'insufficient_data';
  else if (dated.length < 20) confidence = 'low';
  else if (dated.length < 50) confidence = 'medium';
  else confidence = 'high';
  
  const caveats: string[] = [];
  if (dated.length < 30) {
    caveats.push(`Only ${dated.length} acquisitions across ${yearlyData.length} years - trends are noisy`);
  }
  if (rSquared < 0.3) {
    caveats.push(`Low R² (${rSquared.toFixed(2)}) suggests trend is unreliable`);
  }
  if (yearlyData.length < 5) {
    caveats.push('Fewer than 5 years of data - trend assessment not meaningful');
  }
  caveats.push('Do NOT fit power laws to time series with this sample size');
  
  return {
    yearlyData,
    totalAcquisitions: dated.length,
    yearRange: [minYear, maxYear],
    median,
    mean,
    iqr,
    trend: { slope, interpretation, rSquared, confidence },
    caveats
  };
}

/**
 * Simplified Louvain-style Community Detection
 * 
 * Uses greedy modularity optimization for small networks.
 * Returns communities with explicit stability caveats.
 */
export interface CommunityDetectionResult {
  communities: Map<string, number>; // nodeId -> communityId
  numCommunities: number;
  modularity: number;
  communitySizes: number[];
  stability: {
    score: number; // 0-1, measured via subset perturbation
    interpretation: string;
    isReliable: boolean;
  };
  qualitativeDescription: string[];
  caveats: string[];
}

export function communityDetection(
  nodes: NetworkNode[], 
  edges: NetworkEdge[]
): CommunityDetectionResult {
  if (nodes.length === 0) {
    return {
      communities: new Map(),
      numCommunities: 0,
      modularity: 0,
      communitySizes: [],
      stability: { score: 0, interpretation: 'No data', isReliable: false },
      qualitativeDescription: [],
      caveats: ['No nodes to analyze']
    };
  }
  
  // Build adjacency map
  const adjacency = new Map<string, Set<string>>();
  nodes.forEach(n => adjacency.set(n.id, new Set()));
  edges.forEach(e => {
    adjacency.get(e.source)?.add(e.target);
    adjacency.get(e.target)?.add(e.source);
  });
  
  // Initialize: each node in own community
  const communities = new Map<string, number>();
  nodes.forEach((n, i) => communities.set(n.id, i));
  
  // Greedy modularity optimization (simplified Louvain)
  const m = edges.length;
  if (m === 0) {
    return {
      communities,
      numCommunities: nodes.length,
      modularity: 0,
      communitySizes: nodes.map(() => 1),
      stability: { score: 0, interpretation: 'No edges to form communities', isReliable: false },
      qualitativeDescription: ['No connections; each node is isolated'],
      caveats: ['No edges in network']
    };
  }
  
  // Calculate node degrees
  const degrees = new Map<string, number>();
  nodes.forEach(n => degrees.set(n.id, adjacency.get(n.id)?.size || 0));
  
  // Greedy: for each node, move to neighbor's community if it improves modularity
  let improved = true;
  let iterations = 0;
  const maxIterations = 100;
  
  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;
    
    for (const node of nodes) {
      const neighbors = Array.from(adjacency.get(node.id) || []);
      if (neighbors.length === 0) continue;
      
      const currentCommunity = communities.get(node.id)!;
      const candidateCommunities = new Set(neighbors.map(n => communities.get(n)!));
      
      let bestCommunity = currentCommunity;
      let bestGain = 0;
      
      candidateCommunities.forEach(c => {
        if (c === currentCommunity) return;
        
        // Calculate modularity gain from moving to community c
        let ki_in = 0;
        let sigma_tot = 0;
        
        nodes.forEach(other => {
          if (communities.get(other.id) === c) {
            sigma_tot += degrees.get(other.id) || 0;
            if (adjacency.get(node.id)?.has(other.id)) {
              ki_in++;
            }
          }
        });
        
        const ki = degrees.get(node.id) || 0;
        const gain = ki_in / m - (sigma_tot * ki) / (2 * m * m);
        
        if (gain > bestGain) {
          bestGain = gain;
          bestCommunity = c;
        }
      });
      
      if (bestCommunity !== currentCommunity) {
        communities.set(node.id, bestCommunity);
        improved = true;
      }
    }
  }
  
  // Renumber communities consecutively
  const communityIds = Array.from(new Set(communities.values()));
  const remap = new Map<number, number>();
  communityIds.forEach((id, i) => remap.set(id, i));
  communities.forEach((c, n) => communities.set(n, remap.get(c)!));
  
  const numCommunities = communityIds.length;
  
  // Calculate community sizes
  const sizesMap = new Map<number, number>();
  communities.forEach(c => sizesMap.set(c, (sizesMap.get(c) || 0) + 1));
  const communitySizes = Array.from(sizesMap.values()).sort((a, b) => b - a);
  
  // Calculate final modularity
  let modularity = 0;
  for (let i = 0; i < nodes.length; i++) {
    for (let j = 0; j < nodes.length; j++) {
      if (communities.get(nodes[i].id) === communities.get(nodes[j].id)) {
        const a_ij = adjacency.get(nodes[i].id)?.has(nodes[j].id) ? 1 : 0;
        const k_i = degrees.get(nodes[i].id) || 0;
        const k_j = degrees.get(nodes[j].id) || 0;
        modularity += (a_ij - (k_i * k_j) / (2 * m));
      }
    }
  }
  modularity = modularity / (2 * m);
  
  // Stability assessment: run on 10 random subsets and measure consistency
  const subsetSize = Math.floor(nodes.length * 0.85);
  const numSubsets = 10;
  let totalAgreement = 0;
  let totalPairs = 0;
  
  for (let trial = 0; trial < numSubsets; trial++) {
    // Random subset
    const shuffled = [...nodes].sort(() => Math.random() - 0.5);
    const subset = shuffled.slice(0, subsetSize);
    const subsetIds = new Set(subset.map(n => n.id));
    const subsetEdges = edges.filter(e => subsetIds.has(e.source) && subsetIds.has(e.target));
    
    // Quick community detection on subset
    const subsetCommunities = new Map<string, number>();
    subset.forEach((n, i) => subsetCommunities.set(n.id, i));
    
    // Simple agglomeration: merge connected nodes
    subsetEdges.forEach(e => {
      const c1 = subsetCommunities.get(e.source);
      const c2 = subsetCommunities.get(e.target);
      if (c1 !== undefined && c2 !== undefined && c1 !== c2) {
        subsetCommunities.forEach((c, n) => {
          if (c === c2) subsetCommunities.set(n, c1);
        });
      }
    });
    
    // Compare to original
    for (let i = 0; i < subset.length; i++) {
      for (let j = i + 1; j < subset.length; j++) {
        const sameInOriginal = communities.get(subset[i].id) === communities.get(subset[j].id);
        const sameInSubset = subsetCommunities.get(subset[i].id) === subsetCommunities.get(subset[j].id);
        if (sameInOriginal === sameInSubset) totalAgreement++;
        totalPairs++;
      }
    }
  }
  
  const stabilityScore = totalPairs > 0 ? totalAgreement / totalPairs : 0;
  
  let stabilityInterpretation: string;
  let isReliable: boolean;
  if (stabilityScore > 0.85) {
    stabilityInterpretation = 'High stability - communities likely meaningful';
    isReliable = true;
  } else if (stabilityScore > 0.7) {
    stabilityInterpretation = 'Moderate stability - some structural signal';
    isReliable = false;
  } else {
    stabilityInterpretation = 'Low stability - communities likely artifact of small n';
    isReliable = false;
  }
  
  // Qualitative descriptions based on community composition
  const qualitativeDescription: string[] = [];
  for (let cId = 0; cId < numCommunities; cId++) {
    const members = nodes.filter(n => communities.get(n.id) === cId);
    if (members.length === 0) continue;
    
    // Determine dominant sector
    const sectorCounts = new Map<string, number>();
    members.forEach(m => {
      if (m.sector) sectorCounts.set(m.sector, (sectorCounts.get(m.sector) || 0) + 1);
    });
    
    let dominantSector: string | null = null;
    let maxCount = 0;
    sectorCounts.forEach((count, sector) => {
      if (count > maxCount) {
        maxCount = count;
        dominantSector = sector;
      }
    });
    
    qualitativeDescription.push(
      `Community ${cId + 1} (${members.length} nodes): ${
        dominantSector 
          ? `Centered on ${dominantSector}` 
          : 'Mixed sectors'
      } - members: ${members.slice(0, 3).map(m => m.label).join(', ')}${members.length > 3 ? `, +${members.length - 3} more` : ''}`
    );
  }
  
  const caveats: string[] = [];
  if (nodes.length < 20) {
    caveats.push(`With n=${nodes.length}, detected communities are unstable`);
  }
  caveats.push('Adding 5 more nodes would likely change community structure');
  if (stabilityScore < 0.7) {
    caveats.push(`Stability score ${stabilityScore.toFixed(2)} indicates communities may be artifacts`);
  }
  caveats.push('Do NOT report as "statistically significant communities" - wrong language for small n');
  caveats.push('Treat as exploratory clustering, not confirmatory analysis');
  
  return {
    communities,
    numCommunities,
    modularity,
    communitySizes,
    stability: {
      score: stabilityScore,
      interpretation: stabilityInterpretation,
      isReliable
    },
    qualitativeDescription,
    caveats
  };
}

/**
 * Why we DON'T fit power laws (educational function)
 */
export const POWER_LAW_LIMITATIONS = {
  minimumSampleSize: 100,
  whyNotFit: [
    'Power law fitting requires n>100 minimum (Clauset et al., 2009)',
    'Maximum likelihood estimates are unstable for n<50',
    'Kolmogorov-Smirnov tests have very low power for small n',
    'Visual inspection ("log-log linearity") is unreliable for n<30',
    'Alternative distributions (lognormal, exponential) often fit small samples equally well'
  ],
  whatToDoInstead: [
    'Use Gini coefficient for inequality measurement',
    'Use Herfindahl-Hirschman Index for market concentration',
    'Calculate top-k concentration percentages',
    'Compare to null model (random allocation)',
    'Report descriptive statistics with bootstrap CIs'
  ],
  reference: 'Clauset, A., Shalizi, C.R., Newman, M.E.J. (2009). "Power-law distributions in empirical data." SIAM Review, 51(4), 661-703.'
};
