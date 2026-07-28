/**
 * Adapt `dataset.verified.json` (+ annotations sidecar) into LacunaDeal rows.
 */

import annotationsJson from "@/data/lacunaDataset.annotations.json";
import type { VerifiedDataset } from "@/lib/data/datasetTypes";
import { announcedFromIsoDay } from "./datePrecision";
import type {
  AnnouncedDate,
  DealScope,
  DealStatus,
  LacunaDeal,
  StatusTransition,
  ValueTier,
} from "./types";
import { VALUE_TIERS } from "./types";

interface DealAnnotation {
  readonly valueTier: ValueTier;
  readonly scope: DealScope;
  readonly announcedPrecision: "day" | "month" | "year";
  readonly terminalStatus: DealStatus;
  readonly statusHistory: readonly StatusTransition[];
  readonly yearMonth?: string;
  readonly year?: number;
}

interface AnnotationsFile {
  readonly version: number;
  readonly deals: Readonly<Record<string, DealAnnotation>>;
}

const annotations = annotationsJson as AnnotationsFile;

function isValueTier(value: string): value is ValueTier {
  return (VALUE_TIERS as readonly string[]).includes(value);
}

function announcedFor(
  isoDay: string,
  ann: DealAnnotation | undefined,
): AnnouncedDate {
  if (!ann || ann.announcedPrecision === "day") {
    return announcedFromIsoDay(isoDay);
  }
  if (ann.announcedPrecision === "month") {
    const yearMonth = ann.yearMonth ?? isoDay.slice(0, 7);
    return { precision: "month", yearMonth };
  }
  return { precision: "year", year: ann.year ?? Number(isoDay.slice(0, 4)) };
}

function defaultHistory(
  announcedDate: string,
  closedDate: string | undefined,
  source: string,
): StatusTransition[] {
  const announced: StatusTransition = {
    status: "announced",
    statusAsOf: announcedDate,
    statusSource: source,
  };
  if (closedDate) {
    return [
      announced,
      {
        status: "completed",
        statusAsOf: closedDate,
        statusSource: source,
      },
    ];
  }
  return [announced];
}

function inferTierFromSource(source: string): ValueTier {
  if (
    /\b(8-k|10-k|10-q|sec edgar|s-4|defm14a|merger proxy|form 8)\b/i.test(
      source,
    )
  ) {
    return "sec_filing";
  }
  if (
    /\b(press release|newsroom|business wire|globe newswire|pr newswire|investor relations|nasdaq)\b/i
      .test(source)
  ) {
    return "trade_press";
  }
  if (/\b(pitchbook|refinitiv|capiq|factset|advisory|tracxn)\b/i.test(source)) {
    return "broker_advisory";
  }
  return "market_research";
}

/** Map one verified acquisition (+ optional annotation) to a LacunaDeal. */
export function toLacunaDeal(
  acquisition: VerifiedDataset["acquisitions"][number],
  annotation?: DealAnnotation,
): LacunaDeal {
  const valueTier = annotation && isValueTier(annotation.valueTier)
    ? annotation.valueTier
    : inferTierFromSource(acquisition.source);
  const scope = annotation?.scope ?? "womens_health";
  const statusHistory = annotation?.statusHistory?.length
    ? annotation.statusHistory
    : defaultHistory(
      acquisition.announcedDate,
      acquisition.closedDate,
      acquisition.source,
    );

  return {
    id: acquisition.id,
    targetId: acquisition.targetId,
    acquirerId: acquisition.acquirerId,
    targetName: acquisition.targetName,
    acquirerName: acquisition.acquirerName,
    announced: announcedFor(acquisition.announcedDate, annotation),
    dealValueMillions: acquisition.dealValue,
    valueTier,
    scope,
    statusHistory,
    source: acquisition.source,
  };
}

/** Full verified dataset → LacunaDeal[]. */
export function dealsFromVerifiedDataset(
  dataset: VerifiedDataset,
): LacunaDeal[] {
  return dataset.acquisitions.map((acquisition) =>
    toLacunaDeal(acquisition, annotations.deals[acquisition.id])
  );
}

export function getDealAnnotation(
  dealId: string,
): DealAnnotation | undefined {
  return annotations.deals[dealId];
}
