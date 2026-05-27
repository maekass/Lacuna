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
