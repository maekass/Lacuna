import type { VerifiedDataset } from "@/lib/data/datasetTypes";
import { WORKSPACES } from "@/lib/navigation/workspaces";

/** Deal fields the command palette needs. Sector comes from the target company. */
export interface CommandDealRef {
  id: string;
  targetName: string;
  acquirerName: string;
  announcedDate: string;
  dealType: string;
  sector: string;
}

export type CommandGroup = "Workspace" | "Section" | "Deal";

export interface CommandItem {
  id: string;
  group: CommandGroup;
  label: string;
  detail: string;
  href: string;
  keywords: string;
}

const EMPTY_RESULT_LIMIT = 8;
const QUERY_RESULT_LIMIT = 12;

/**
 * Index every verified acquisition, including deals outside the current workspace scope.
 */
export function commandDealsFromDataset(
  dataset: VerifiedDataset,
): CommandDealRef[] {
  const sectorByCompany = new Map(
    dataset.companies.map((company) => [company.id, company.sector]),
  );
  return dataset.acquisitions.map((deal) => ({
    id: deal.id,
    targetName: deal.targetName,
    acquirerName: deal.acquirerName,
    announcedDate: deal.announcedDate,
    dealType: deal.dealType,
    sector: sectorByCompany.get(deal.targetId) ?? "",
  }));
}

/** Workspaces, in-page sections, and verified deals. */
export function buildCommandItems(
  deals: readonly CommandDealRef[],
): CommandItem[] {
  const workspaces: CommandItem[] = [
    {
      id: "workspace-home",
      group: "Workspace",
      label: "Home",
      detail: "How to read the research trail",
      href: "/",
      keywords: "hub start lacuna",
    },
    ...WORKSPACES.map((workspace) => ({
      id: `workspace-${workspace.slug}`,
      group: "Workspace" as const,
      label: workspace.label,
      detail: workspace.description,
      href: workspace.href,
      keywords: workspace.tags.join(" "),
    })),
  ];

  const sections: CommandItem[] = WORKSPACES.flatMap((workspace) =>
    workspace.sections.map((section) => ({
      id: `section-${workspace.slug}-${section.id}`,
      group: "Section" as const,
      label: section.label,
      detail: workspace.label,
      href: `${workspace.href}#${section.id}`,
      keywords: `${workspace.label} ${workspace.tags.join(" ")}`,
    }))
  );

  const dealItems: CommandItem[] = deals.map((deal) => ({
    id: `deal-${deal.id}`,
    group: "Deal",
    label: deal.targetName,
    detail: `${deal.acquirerName} · ${deal.announcedDate.slice(0, 4)}`,
    href: `/deals/${deal.id}`,
    keywords: [deal.acquirerName, deal.sector, deal.dealType, deal.id].join(
      " ",
    ),
  }));

  return [...workspaces, ...sections, ...dealItems];
}

/**
 * With an empty query, show workspaces only. A query searches labels, details, and keywords.
 */
export function filterCommandItems(
  items: readonly CommandItem[],
  query: string,
): CommandItem[] {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return items.filter((item) => item.group === "Workspace").slice(
      0,
      EMPTY_RESULT_LIMIT,
    );
  }

  const scored: Array<{ item: CommandItem; score: number }> = [];
  for (const item of items) {
    const label = item.label.toLowerCase();
    const haystack = `${item.label} ${item.detail} ${item.keywords}`
      .toLowerCase();
    if (!haystack.includes(needle)) continue;
    const score = label.startsWith(needle) ? 0 : label.includes(needle) ? 1 : 2;
    scored.push({ item, score });
  }

  scored.sort((a, b) =>
    a.score - b.score || a.item.label.localeCompare(b.item.label)
  );
  return scored.slice(0, QUERY_RESULT_LIMIT).map((entry) => entry.item);
}
