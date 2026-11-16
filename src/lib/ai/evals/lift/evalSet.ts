/**
 * Deterministic builder for the frozen lift eval set.
 *
 * Every gold value is copied from `dataset.verified.json`. Should-abstain
 * items ask for facts the corpus does not hold: values the dataset records
 * as undisclosed or missing, and fields Lacuna does not collect (revenue,
 * headcount). Selection is a sha256 ordering of record ids, so the set is
 * reproducible without a random seed.
 */
import { createHash } from "node:crypto";
import type {
  VerifiedAcquisition,
  VerifiedCompany,
  VerifiedDataset,
} from "@/lib/data/datasetTypes";
import { companyPassageId, dealPassageId, dealPhrase } from "./corpus";
import {
  LIFT_EVAL_SET_VERSION,
  type LiftEvalItem,
  type LiftEvalSet,
  type LiftTemplate,
} from "./types";

export const LIFT_EVAL_SET_SOURCE_FILE = "src/data/dataset.verified.json";
export const LIFT_EVAL_SET_GENERATOR = "scripts/build-lift-eval-set.ts";

/** Per-template caps. Templates without a cap take every eligible record. */
export const LIFT_TEMPLATE_CAPS: Partial<Record<LiftTemplate, number>> = {
  announced_date: 25,
  acquirer: 25,
  founded_year: 15,
  undisclosed_founded_year: 6,
  out_of_scope_revenue: 15,
  out_of_scope_headcount: 10,
};

/** Deal values the dataset itself labels as estimates are not gold. */
const ESTIMATE_NOTE = /estimat|not officially disclosed/i;
/** Out-of-scope revenue items skip records whose note cites revenue. */
const REVENUE_NOTE = /revenue/i;

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Stable JSON: object keys sorted recursively. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
    return `{${
      entries.map(([key, item]) =>
        `${JSON.stringify(key)}:${canonicalJson(item)}`
      )
        .join(",")
    }}`;
  }
  return JSON.stringify(value);
}

export function hashLiftItems(items: readonly LiftEvalItem[]): string {
  return sha256(canonicalJson(items));
}

function pick<T extends { id: string }>(
  template: LiftTemplate,
  records: readonly T[],
): T[] {
  const cap = LIFT_TEMPLATE_CAPS[template];
  const ordered = [...records].sort((left, right) => {
    const a = sha256(`${template}:${left.id}`);
    const b = sha256(`${template}:${right.id}`);
    return a < b ? -1 : a > b ? 1 : 0;
  });
  return cap === undefined ? ordered : ordered.slice(0, cap);
}

function stripParenthetical(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*/g, " ").trim();
}

function acquirerAliases(
  dataset: VerifiedDataset,
  deal: VerifiedAcquisition,
): string[] {
  const record = dataset.acquirers.find((item) => item.id === deal.acquirerId);
  const names = [deal.acquirerName, record?.name].filter(
    (name): name is string => Boolean(name),
  );
  const aliases = names.flatMap((name) => [name, stripParenthetical(name)]);
  return [...new Set(aliases.filter((alias) => alias.length > 0))];
}

function dealItem(
  template: LiftTemplate,
  deal: VerifiedAcquisition,
  fields: Pick<LiftEvalItem, "type" | "question" | "gold"> & {
    passage: "announcement" | "value" | "closing";
  },
): LiftEvalItem {
  return {
    id: `lift-${template}-${deal.id}`,
    type: fields.type,
    template,
    question: fields.question,
    gold: fields.gold,
    goldRecordIds: [deal.id],
    goldPassageIds: [dealPassageId(deal.id, fields.passage)],
  };
}

function companyItem(
  template: LiftTemplate,
  company: VerifiedCompany,
  fields: Pick<LiftEvalItem, "type" | "question" | "gold">,
): LiftEvalItem {
  return {
    id: `lift-${template}-${company.id}`,
    type: fields.type,
    template,
    question: fields.question,
    gold: fields.gold,
    goldRecordIds: [company.id],
    goldPassageIds: [companyPassageId(company.id)],
  };
}

function field(collection: string, id: string, name: string): string {
  return `${collection}[id=${id}].${name}`;
}

/** Build the eval items from the verified dataset. Pure and deterministic. */
export function buildLiftEvalItems(dataset: VerifiedDataset): LiftEvalItem[] {
  const deals = dataset.acquisitions;
  const companies = dataset.companies;
  const items: LiftEvalItem[] = [];

  for (
    const deal of pick(
      "deal_value",
      deals.filter((deal) =>
        deal.dealValue !== undefined &&
        !ESTIMATE_NOTE.test(deal.dealValueNote ?? "")
      ),
    )
  ) {
    items.push(dealItem("deal_value", deal, {
      type: "answerable",
      passage: "value",
      question:
        `What was the disclosed deal value in USD for ${deal.acquirerName}'s ${
          dealPhrase(deal)
        }?`,
      gold: {
        kind: "usd_millions",
        value: deal.dealValue ?? null,
        aliases: [],
        sourceField: field("acquisitions", deal.id, "dealValue"),
      },
    }));
  }

  for (const deal of pick("announced_date", deals)) {
    items.push(dealItem("announced_date", deal, {
      type: "answerable",
      passage: "announcement",
      question: `On what date did ${deal.acquirerName} announce its ${
        dealPhrase(deal)
      }?`,
      gold: {
        kind: "iso_date",
        value: deal.announcedDate,
        aliases: [],
        sourceField: field("acquisitions", deal.id, "announcedDate"),
      },
    }));
  }

  for (
    const deal of pick(
      "acquirer",
      deals.filter((deal) => /acquisition/i.test(deal.dealType)),
    )
  ) {
    items.push(dealItem("acquirer", deal, {
      type: "answerable",
      passage: "announcement",
      question:
        `Which company acquired ${deal.targetName} in the deal announced on ${deal.announcedDate}?`,
      gold: {
        kind: "entity",
        value: deal.acquirerName,
        aliases: acquirerAliases(dataset, deal),
        sourceField: field("acquisitions", deal.id, "acquirerName"),
      },
    }));
  }

  for (
    const company of pick(
      "founded_year",
      companies.filter((company) => company.founded !== undefined),
    )
  ) {
    items.push(companyItem("founded_year", company, {
      type: "answerable",
      question: `In what year was ${company.name} founded?`,
      gold: {
        kind: "year",
        value: company.founded ?? null,
        aliases: [],
        sourceField: field("companies", company.id, "founded"),
      },
    }));
  }

  for (
    const deal of pick(
      "undisclosed_deal_value",
      deals.filter((deal) => deal.dealValue === undefined),
    )
  ) {
    items.push(dealItem("undisclosed_deal_value", deal, {
      type: "should_abstain",
      passage: "value",
      question:
        `What was the disclosed deal value in USD for ${deal.acquirerName}'s ${
          dealPhrase(deal)
        }?`,
      gold: {
        kind: "none",
        value: null,
        aliases: [],
        sourceField: field("acquisitions", deal.id, "dealValue"),
      },
    }));
  }

  for (
    const deal of pick(
      "pending_close_date",
      deals.filter((deal) => deal.closedDate === undefined),
    )
  ) {
    items.push(dealItem("pending_close_date", deal, {
      type: "should_abstain",
      passage: "closing",
      question: `On what date did ${deal.acquirerName}'s ${
        dealPhrase(deal)
      } close?`,
      gold: {
        kind: "none",
        value: null,
        aliases: [],
        sourceField: field("acquisitions", deal.id, "closedDate"),
      },
    }));
  }

  for (
    const company of pick(
      "undisclosed_founded_year",
      companies.filter((company) => company.founded === undefined),
    )
  ) {
    items.push(companyItem("undisclosed_founded_year", company, {
      type: "should_abstain",
      question: `In what year was ${company.name} founded?`,
      gold: {
        kind: "none",
        value: null,
        aliases: [],
        sourceField: field("companies", company.id, "founded"),
      },
    }));
  }

  for (
    const deal of pick(
      "out_of_scope_revenue",
      deals.filter((deal) => !REVENUE_NOTE.test(deal.dealValueNote ?? "")),
    )
  ) {
    items.push({
      ...dealItem("out_of_scope_revenue", deal, {
        type: "should_abstain",
        passage: "announcement",
        question:
          `What annual revenue did ${deal.targetName} report for the fiscal year before the ${deal.dealType.toLowerCase()} by ${deal.acquirerName} was announced?`,
        gold: {
          kind: "none",
          value: null,
          aliases: [],
          sourceField: "not collected: target revenue",
        },
      }),
      goldPassageIds: [],
    });
  }

  for (const deal of pick("out_of_scope_headcount", deals)) {
    items.push({
      ...dealItem("out_of_scope_headcount", deal, {
        type: "should_abstain",
        passage: "announcement",
        question:
          `How many employees did ${deal.targetName} have when the ${deal.dealType.toLowerCase()} by ${deal.acquirerName} was announced?`,
        gold: {
          kind: "none",
          value: null,
          aliases: [],
          sourceField: "not collected: target headcount",
        },
      }),
      goldPassageIds: [],
    });
  }

  return items;
}

/** Wrap items with counts, provenance, and the items hash. */
export function buildLiftEvalSet(dataset: VerifiedDataset): LiftEvalSet {
  const items = buildLiftEvalItems(dataset);
  const byTemplate: Record<string, number> = {};
  for (const item of items) {
    byTemplate[item.template] = (byTemplate[item.template] ?? 0) + 1;
  }
  const answerable = items.filter((item) => item.type === "answerable").length;
  return {
    version: LIFT_EVAL_SET_VERSION,
    generator: LIFT_EVAL_SET_GENERATOR,
    source: {
      file: LIFT_EVAL_SET_SOURCE_FILE,
      datasetVersion: dataset.provenance.datasetVersion ?? "unversioned",
      lastUpdated: dataset.provenance.lastUpdated,
    },
    counts: {
      total: items.length,
      answerable,
      shouldAbstain: items.length - answerable,
      byTemplate,
    },
    itemsSha256: hashLiftItems(items),
    items,
  };
}

const UNCOLLECTED_FIELD = /^not collected: /;

function readField(
  dataset: VerifiedDataset,
  sourceField: string,
): { found: boolean; value: unknown } {
  const match = sourceField.match(
    /^(acquisitions|companies)\[id=([^\]]+)\]\.(\w+)$/,
  );
  if (!match) return { found: false, value: undefined };
  const [, collection, id, name] = match;
  const rows: ReadonlyArray<Record<string, unknown>> =
    collection === "companies" ? dataset.companies : dataset.acquisitions;
  const row = rows.find((item) => item.id === id);
  if (!row) return { found: false, value: undefined };
  return { found: true, value: row[name] };
}

/**
 * Integrity and drift check for a frozen set.
 * Returns human-readable problems; an empty list means the set is intact and
 * every gold value still equals the verified dataset field it was copied from.
 */
export function checkFrozenLiftEvalSet(
  frozen: LiftEvalSet,
  dataset: VerifiedDataset,
): string[] {
  const problems: string[] = [];
  const actualHash = hashLiftItems(frozen.items);
  if (actualHash !== frozen.itemsSha256) {
    problems.push(
      `itemsSha256 mismatch: recorded ${frozen.itemsSha256}, computed ${actualHash}`,
    );
  }
  const ids = new Set<string>();
  for (const item of frozen.items) {
    if (ids.has(item.id)) problems.push(`duplicate item id ${item.id}`);
    ids.add(item.id);
    if (UNCOLLECTED_FIELD.test(item.gold.sourceField)) continue;
    const { found, value } = readField(dataset, item.gold.sourceField);
    if (!found) {
      problems.push(`${item.id}: ${item.gold.sourceField} no longer exists`);
      continue;
    }
    const expected = item.type === "answerable" ? item.gold.value : undefined;
    if ((value ?? undefined) !== (expected ?? undefined)) {
      problems.push(
        `${item.id}: gold ${JSON.stringify(expected)} != dataset ${
          JSON.stringify(value)
        } at ${item.gold.sourceField}. Bump the eval-set version instead of editing in place.`,
      );
    }
  }
  const answerable = frozen.items.filter((item) => item.type === "answerable")
    .length;
  if (frozen.counts.total !== frozen.items.length) {
    problems.push("counts.total does not match items");
  }
  if (frozen.counts.answerable !== answerable) {
    problems.push("counts.answerable does not match items");
  }
  return problems;
}
