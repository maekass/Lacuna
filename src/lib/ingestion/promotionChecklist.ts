import type { PendingDealRecord } from "./pendingDeals";

export interface PromotionCheckItem {
  id: string;
  label: string;
  hint: string;
  autoPass?: boolean;
}

export interface PromotionCheckState {
  [id: string]: boolean;
}

function isKeywordOnlyStaging(deal: PendingDealRecord): boolean {
  return deal.parseQuality === "keyword_only";
}

/** Dual-source promotion gates from docs/NEW_DEAL_WORKFLOW.md Step 2. */
export function getPromotionCheckItems(
  deal: PendingDealRecord,
): PromotionCheckItem[] {
  const keywordOnly = isKeywordOnlyStaging(deal);
  const hasPrimary = deal.filingUrl.includes("sec.gov") ||
    Boolean(deal.item201Excerpt?.trim());
  const hasSecondaryHint = Boolean(
    deal.reviewNotes && deal.reviewNotes.length > 10,
  );
  const hasParties = Boolean(
    deal.acquirerName?.trim() && deal.targetName?.trim(),
  );
  const hasDate = Boolean(deal.announcedDate);
  const hasWhScope = deal.womensHealthRelevant === true;
  const hasPriceDisclosure = deal.dealValueMillions !== null ||
    Boolean(deal.dealValueNote?.trim());

  return [
    {
      id: "primary",
      label: "Primary source (SEC filing or official IR)",
      hint: "8-K, merger proxy, or acquirer newsroom announcement.",
      autoPass: !keywordOnly && hasPrimary,
    },
    {
      id: "secondary",
      label: "Secondary corroboration (independent press)",
      hint: "Trade press or second outlet naming the same parties and date.",
      autoPass: hasSecondaryHint,
    },
    {
      id: "parties",
      label: "Parties match across sources",
      hint: "Acquirer and target names consistent in all citations.",
      autoPass: !keywordOnly && hasParties,
    },
    {
      id: "date",
      label: "Announcement date verified",
      hint: "Date aligns with primary filing or press release.",
      autoPass: hasDate,
    },
    {
      id: "price",
      label: "Price disclosure rules applied",
      hint: "If undisclosed, leave dealValue empty and add dealValueNote.",
      autoPass: !keywordOnly && hasPriceDisclosure,
    },
    {
      id: "wh-scope",
      label: "Women's health scope confirmed",
      hint: "Target sector or product line is in-scope for Lacuna.",
      autoPass: !keywordOnly && hasWhScope,
    },
  ];
}

export function initialCheckState(
  items: PromotionCheckItem[],
): PromotionCheckState {
  return Object.fromEntries(
    items.map((item) => [item.id, item.autoPass ?? false]),
  );
}

export function allChecksPassed(
  state: PromotionCheckState,
  items: PromotionCheckItem[],
): boolean {
  return items.every((item) => state[item.id] === true);
}
