/**
 * Deal-status lifecycle as a state machine with compile-time CompletedDeal.
 *
 * Valid paths:
 *   rumored → announced → pending_regulatory → completed
 *                                         └→ terminated
 *                                         └→ abandoned
 *   rumored → announced → completed | terminated | abandoned
 *   rumored → abandoned
 *
 * Terminated / abandoned / rumored deals cannot become CompletedDeal;
 * completed-exit aggregates accept only CompletedDeal[].
 */

import type {
  CompletedDeal,
  DealStatus,
  LacunaDeal,
  StatusTransition,
} from "./types";

const TERMINAL: ReadonlySet<DealStatus> = new Set([
  "completed",
  "terminated",
  "abandoned",
]);

const ALLOWED: Readonly<Record<DealStatus, ReadonlySet<DealStatus>>> = {
  rumored: new Set(["announced", "abandoned"]),
  announced: new Set([
    "pending_regulatory",
    "completed",
    "terminated",
    "abandoned",
  ]),
  pending_regulatory: new Set(["completed", "terminated", "abandoned"]),
  completed: new Set(),
  terminated: new Set(),
  abandoned: new Set(),
};

/** Current status = last transition in chronological history. */
export function currentStatus(deal: LacunaDeal): DealStatus {
  const history = deal.statusHistory;
  if (history.length === 0) {
    throw new Error(`Deal ${deal.id} has empty statusHistory`);
  }
  return history[history.length - 1]!.status;
}

export function isTerminalStatus(status: DealStatus): boolean {
  return TERMINAL.has(status);
}

/** Validate that consecutive transitions form a legal path. */
export function validateStatusHistory(
  history: readonly StatusTransition[],
): string[] {
  const errors: string[] = [];
  if (history.length === 0) {
    errors.push("statusHistory must contain at least one transition");
    return errors;
  }
  if (history[0]!.status !== "rumored" && history[0]!.status !== "announced") {
    errors.push(
      `First status must be rumored or announced, got ${history[0]!.status}`,
    );
  }
  for (let i = 1; i < history.length; i++) {
    const prev = history[i - 1]!;
    const next = history[i]!;
    if (!ALLOWED[prev.status].has(next.status)) {
      errors.push(
        `Illegal transition ${prev.status} → ${next.status} at index ${i}`,
      );
    }
    if (prev.statusAsOf > next.statusAsOf) {
      errors.push(
        `statusAsOf not non-decreasing at index ${i}: ${prev.statusAsOf} > ${next.statusAsOf}`,
      );
    }
    if (!next.statusSource.trim()) {
      errors.push(`statusSource required at index ${i}`);
    }
  }
  return errors;
}

/**
 * Produce a branded CompletedDeal only when the lifecycle ends in completed
 * via a validated history. Returns null otherwise — callers cannot cast.
 */
export function asCompletedDeal(deal: LacunaDeal): CompletedDeal | null {
  const errors = validateStatusHistory(deal.statusHistory);
  if (errors.length > 0) return null;
  if (currentStatus(deal) !== "completed") return null;
  return deal as CompletedDeal;
}

/** Filter to branded completed exits — structural exclusion of terminated/etc. */
export function completedDealsOf(
  deals: readonly LacunaDeal[],
): CompletedDeal[] {
  const out: CompletedDeal[] = [];
  for (const deal of deals) {
    const completed = asCompletedDeal(deal);
    if (completed) out.push(completed);
  }
  return out;
}

/**
 * Sum disclosed values over completed exits only.
 * Signature accepts CompletedDeal[] so terminated rows cannot be passed without
 * going through asCompletedDeal / completedDealsOf.
 */
export function completedExitDisclosedTotalMillions(
  deals: readonly CompletedDeal[],
): number {
  let sum = 0;
  for (const deal of deals) {
    if (typeof deal.dealValueMillions === "number") {
      sum += deal.dealValueMillions;
    }
  }
  return sum;
}

/** Test / demo fixture: Cook Medical RH / CooperSurgical — terminated. */
export const COOK_COOPERSURGICAL_TERMINATED: LacunaDeal = {
  id: "fixture-cook-coopersurgical",
  targetId: "c29",
  acquirerId: "acquirer-coopersurgical",
  targetName: "Cook Medical Reproductive Health",
  acquirerName: "CooperSurgical (CooperCompanies)",
  announced: { precision: "day", date: "2022-02-07" },
  valueTier: "trade_press",
  scope: "womens_health",
  source:
    "CooperCompanies IR (Feb 7, 2022); subsequent termination / Astorg takeout coverage",
  statusHistory: [
    {
      status: "announced",
      statusAsOf: "2022-02-07",
      statusSource:
        "CooperCompanies investor relations press release (Feb 7, 2022)",
    },
    {
      status: "pending_regulatory",
      statusAsOf: "2022-03-01",
      statusSource: "Deal pending customary closing conditions (IR coverage)",
    },
    {
      status: "terminated",
      statusAsOf: "2024-07-01",
      statusSource:
        "Astorg acquisition of Cook Medical RH; CooperSurgical transaction did not complete as originally structured",
    },
  ],
};

/** Test / demo fixture: ART Fertility — rumored / unconfirmed. */
export const ART_FERTILITY_UNCONFIRMED: LacunaDeal = {
  id: "fixture-art-fertility",
  targetId: "fixture-art-fertility-target",
  acquirerId: "fixture-art-fertility-buyer",
  targetName: "ART Fertility Clinics",
  acquirerName: "Unconfirmed acquirer",
  announced: { precision: "year", year: 2023 },
  dealValueMillions: 400,
  valueTier: "market_research",
  scope: "womens_health",
  source: "Trade rumor; no confirming IR or filing",
  statusHistory: [
    {
      status: "rumored",
      statusAsOf: "2023-06-15",
      statusSource: "Unconfirmed trade-press rumor only",
    },
  ],
};
