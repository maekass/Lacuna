export interface SectionLink {
  id: string;
  label: string;
}

export interface Workspace {
  slug: string;
  href: `/${string}`;
  label: string;
  description: string;
  sections: SectionLink[];
}

export const WORKSPACES: Workspace[] = [
  {
    slug: "deals",
    href: "/deals",
    label: "Deals",
    description:
      "Network graph, deal flow, valuation matrix, and acquirer landscape.",
    sections: [
      { id: "data-coverage", label: "Coverage" },
      { id: "data-pipelines", label: "Pipelines" },
      { id: "network", label: "Network" },
      { id: "analytics", label: "Activity" },
      { id: "matrix", label: "Matrix" },
      { id: "network-analysis", label: "Analysis" },
      { id: "competitive-analysis", label: "Acquirers" },
      { id: "validation-tracker", label: "Outcomes" },
      { id: "white-space-analysis", label: "White space" },
      { id: "descriptive-scoring", label: "Similarity" },
    ],
  },
  {
    slug: "research",
    href: "/research",
    label: "Research",
    description:
      "Clinical trials, evidence maturity, genomics, and health equity.",
    sections: [
      { id: "clinical-trials", label: "Trials" },
      { id: "evidence-maturity", label: "Evidence" },
      { id: "variant-callsets", label: "Genetics" },
      { id: "health-equity", label: "Markers" },
      { id: "impact-assessment", label: "Impact" },
    ],
  },
  {
    slug: "methods",
    href: "/methods",
    label: "Methods",
    description:
      "Causal framing, temporal patterns, sensitivity, and Bayesian small-n.",
    sections: [
      { id: "causal-dag", label: "DAG" },
      { id: "causal-engine", label: "Causal" },
      { id: "temporal", label: "Timeline" },
      { id: "sensitivity", label: "Sensitivity" },
      { id: "bayesian-causal", label: "Bayesian" },
    ],
  },
  {
    slug: "intelligence",
    href: "/intelligence",
    label: "Intelligence",
    description:
      "Reimbursement context, acquirer fit scores, and deck export.",
    sections: [
      { id: "reimbursement-intelligence", label: "Reimbursement" },
      { id: "acquirer-prediction", label: "Fit scores" },
      { id: "export", label: "Export" },
    ],
  },
];

/** Legacy monolith hash → workspace route (for bookmarks). */
export const LEGACY_HASH_REDIRECTS: Record<string, string> =
  Object.fromEntries(
    WORKSPACES.flatMap((ws) =>
      ws.sections.map((s) => [s.id, `${ws.href}#${s.id}`] as const),
    ),
  );

export function workspaceForPath(pathname: string): Workspace | undefined {
  const slug = pathname.replace(/^\//, "").split("/")[0];
  if (!slug) return undefined;
  return WORKSPACES.find((w) => w.slug === slug);
}
