export interface SectionLink {
  id: string;
  label: string;
}

export interface Workspace {
  slug: string;
  href: `/${string}`;
  label: string;
  description: string;
  tags: string[];
  sections: SectionLink[];
}

export const WORKSPACES: Workspace[] = [
  {
    slug: "deals",
    href: "/deals",
    label: "Deals",
    description:
      "Network graph, deal flow, valuation matrix, and acquirer landscape.",
    tags: ["network", "valuation", "acquirers"],
    sections: [
      { id: "data-coverage", label: "Coverage" },
      { id: "data-pipelines", label: "Pipelines" },
      { id: "network", label: "Network" },
      { id: "analytics", label: "Activity" },
      { id: "matrix", label: "Matrix" },
      { id: "quant-valuation", label: "Quant val." },
      { id: "network-analysis", label: "Analysis" },
      { id: "competitive-analysis", label: "Acquirers" },
      { id: "validation-tracker", label: "Outcomes" },
      { id: "white-space-analysis", label: "White space" },
      { id: "descriptive-scoring", label: "Similarity" },
      { id: "survival-analysis", label: "Survival" },
    ],
  },
  {
    slug: "payer-ops",
    href: "/payer-ops",
    label: "Payer Ops",
    description:
      "Prior-auth friction, claims ops waste, and VC investment signals for payer-aligned women's health deals.",
    tags: ["prior auth", "claims ops", "payer VC"],
    sections: [
      { id: "vc-signals", label: "VC signals" },
      { id: "problem", label: "Problem" },
      { id: "simulator", label: "Simulator" },
      { id: "triage", label: "Queues" },
      { id: "solution", label: "Solution" },
      { id: "governance", label: "Governance" },
    ],
  },
  {
    slug: "research",
    href: "/research",
    label: "Research",
    description:
      "Clinical trials, evidence maturity, genomics, health equity, and patient empowerment baselines.",
    tags: ["clinical trials", "evidence", "empowerment"],
    sections: [
      { id: "burden-capital-gap", label: "Gap" },
      { id: "womens-health-exits", label: "Exits" },
      { id: "patient-empowerment", label: "Empowerment" },
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
    tags: ["causal", "bayesian", "temporal"],
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
    description: "Reimbursement context, acquirer fit scores, and deck export.",
    tags: ["reimbursement", "fit scores", "export"],
    sections: [
      { id: "reimbursement-intelligence", label: "Reimbursement" },
      { id: "acquirer-prediction", label: "Fit scores" },
      { id: "export", label: "Export" },
    ],
  },
];

/** Legacy monolith hash → workspace route (for bookmarks). */
export const LEGACY_HASH_REDIRECTS: Record<string, string> = Object.fromEntries(
  WORKSPACES.flatMap((ws) =>
    ws.sections.map((s) => [s.id, `${ws.href}#${s.id}`] as const)
  ),
);

export function workspaceForPath(pathname: string): Workspace | undefined {
  const slug = pathname.replace(/^\//, "").split("/")[0];
  if (!slug) return undefined;
  return WORKSPACES.find((w) => w.slug === slug);
}
