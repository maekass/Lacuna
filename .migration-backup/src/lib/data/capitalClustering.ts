import * as ss from "simple-statistics";
import type { VerifiedCompanyView } from "./verifiedDataHelpers";

const K = 3;
const clusterNames = ["Smaller Capital", "Mid Capital", "Large Capital"];
const clusterColors = [
  "bg-blue-50 border-blue-200",
  "bg-purple-50 border-purple-200",
  "bg-pink-50 border-pink-200",
];

export interface CapitalCluster {
  id: number;
  name: string;
  companies: VerifiedCompanyView[];
  centroid: { logVal: number; logFund: number };
  color: string;
  characteristics: string[];
}

export function computeCapitalClusters(
  verifiedCompanies: VerifiedCompanyView[],
): {
  clusters: CapitalCluster[];
  unclusteredCount: number;
} {
  const clusterable = verifiedCompanies.filter(
    (c) =>
      typeof c.lastKnownValuation === "number" &&
      typeof c.totalFunding === "number",
  );

  const data = clusterable.map((c) => ({
    x: Math.log10((c.lastKnownValuation as number) + 1),
    y: Math.log10((c.totalFunding as number) + 1),
    company: c,
  }));

  let centroids = [
    { x: 1.5, y: 1.0 },
    { x: 2.5, y: 2.0 },
    { x: 3.3, y: 2.5 },
  ].slice(0, K);

  let assignments: number[] = [];
  for (let iter = 0; iter < 20; iter++) {
    assignments = data.map((point) => {
      const distances = centroids.map((c) =>
        Math.sqrt((point.x - c.x) ** 2 + (point.y - c.y) ** 2)
      );
      return distances.indexOf(Math.min(...distances));
    });

    centroids = centroids.map((prev, i) => {
      const pts = data.filter((_, j) => assignments[j] === i);
      if (pts.length === 0) return prev;
      return {
        x: ss.mean(pts.map((p) => p.x)),
        y: ss.mean(pts.map((p) => p.y)),
      };
    });
  }

  const clusters = centroids.map((centroid, i) => {
    const members = data.filter((_, j) => assignments[j] === i).map((d) =>
      d.company
    );
    const valuations = members.map((c) => c.lastKnownValuation as number);
    const fundings = members.map((c) => c.totalFunding as number);
    const sectors = Array.from(new Set(members.map((c) => c.sector)));

    return {
      id: i,
      name: clusterNames[i],
      companies: members,
      centroid: { logVal: centroid.x, logFund: centroid.y },
      color: clusterColors[i],
      characteristics: [
        members.length > 0 &&
        `Median valuation: $${Math.round(ss.median(valuations))}M`,
        members.length > 0 &&
        `Median funding: $${Math.round(ss.median(fundings))}M`,
        `Sectors: ${sectors.slice(0, 3).join(", ")}${
          sectors.length > 3 ? "..." : ""
        }`,
      ].filter(Boolean) as string[],
    };
  });

  return {
    clusters,
    unclusteredCount: verifiedCompanies.length - clusterable.length,
  };
}
