import {
  ClipboardCheck,
  FileSearch,
  Hospital,
  type LucideIcon,
  Network,
} from "lucide-react";
import type {
  VerifiedAcquisitionView,
  VerifiedCompanyView,
} from "@/lib/data/verifiedDataHelpers";
import type { ModelProvenance } from "@/lib/provenance/modelProvenance";

export type SegmentKey = "commercial" | "medicaid" | "medicare";

export interface SegmentData {
  label: string;
  lives: string;
  auths: number;
  claims: number;
  denialRate: number;
  avoidableRate: number;
  adminCost: number;
}

export interface PainPoint {
  title: string;
  value: string;
  detail: string;
  source?: string;
  icon: LucideIcon;
}

export type WorkQueueKey =
  | "musculoskeletal"
  | "behavioralHealth"
  | "maternal"
  | "specialtyPharmacy";

/** Share of total avoidable denials allocated to each modeled queue (sums to 81%). */
export const WORK_QUEUE_VOLUME_WEIGHTS: Record<WorkQueueKey, number> = {
  musculoskeletal: 0.34,
  behavioralHealth: 0.23,
  maternal: 0.14,
  specialtyPharmacy: 0.10,
};

export interface WorkQueueTemplate {
  key: WorkQueueKey;
  name: string;
  automation: number;
  risk: string;
  action: string;
  impact: string;
}

export interface WorkQueue extends WorkQueueTemplate {
  volume: number;
}

export type VcMomentum = "accelerating" | "early" | "stable";

export interface VcSignal {
  painPoint: string;
  thesis: string;
  dealSignal: string;
}

export interface VcSignalDealExample {
  targetName: string;
  acquirerName: string;
  year: number;
}

/** Maps VC signal pain points to verified-dataset target company sectors. */
export const vcSignalSectorMap: Record<string, readonly string[]> = {
  "Prior-auth digitization": ["Mental Health", "General Wellness"],
  "Maternal episode coordination": ["Maternal Health"],
  "Behavioral health parity": ["Mental Health"],
  "Specialty pharmacy exceptions": ["Precision Medicine"],
};

export type ProgressWidths = Record<number, string>;

export const segments: Record<SegmentKey, SegmentData> = {
  commercial: {
    label: "Commercial ASO + fully insured",
    lives: "1.8M",
    auths: 18400,
    claims: 920000,
    denialRate: 10.8,
    avoidableRate: 31,
    adminCost: 5.8,
  },
  medicaid: {
    label: "Medicaid managed care",
    lives: "910K",
    auths: 12200,
    claims: 610000,
    denialRate: 13.6,
    avoidableRate: 38,
    adminCost: 6.9,
  },
  medicare: {
    label: "Medicare Advantage",
    lives: "420K",
    auths: 8100,
    claims: 380000,
    denialRate: 15.1,
    avoidableRate: 34,
    adminCost: 7.4,
  },
};

export const painPoints: PainPoint[] = [
  {
    title: "Prior authorization rework",
    value: "~40%",
    detail: "of pended requests require additional clinical documentation",
    source: "AMA 2023 Prior Auth Survey",
    icon: ClipboardCheck,
  },
  {
    title: "Claim denial reversals",
    value: "40–75%",
    detail:
      "of appealed denials are overturned on review — wide range by plan and service type",
    source: "KFF / AHA denial appeals data",
    icon: FileSearch,
  },
  {
    title: "Provider abrasion",
    value: "3–17 days",
    detail:
      "typical prior-auth cycle time; non-urgent requests can exceed 30 days",
    source: "CMS 2023 prior authorization data",
    icon: Hospital,
  },
  {
    title: "Fragmented rules",
    value: "Many systems",
    detail:
      "policy, benefit, network, medical-necessity, and claim-edit rules held in separate platforms",
    icon: Network,
  },
];

export const workQueues: WorkQueueTemplate[] = [
  {
    key: "musculoskeletal",
    name: "Musculoskeletal imaging prior auth",
    automation: 64,
    risk: "Low",
    impact: "$1.4M",
    action: "Auto-approve guideline-concordant requests with complete notes",
  },
  {
    key: "behavioralHealth",
    name: "Behavioral health professional claims",
    automation: 51,
    risk: "Medium",
    impact: "$920K",
    action: "Route coding mismatches to provider self-correction before denial",
  },
  {
    key: "maternal",
    name: "Maternal episode coordination",
    automation: 43,
    risk: "Medium",
    impact: "$680K",
    action:
      "Detect missing referrals and attach benefit-aware next-best action",
  },
  {
    key: "specialtyPharmacy",
    name: "Specialty pharmacy exceptions",
    automation: 29,
    risk: "High",
    impact: "$2.1M",
    action: "Keep clinician-in-loop, summarize evidence, and audit decisions",
  },
];

export const operatingModel: string[] = [
  "Ingest X12 278/837 status, policy rules, benefits, network files, and notes metadata",
  "Score each case for administrative preventability, clinical risk, SLA urgency, and provider friction",
  "Resolve low-risk administrative defects before denial with provider-facing next-best actions",
  "Escalate clinically sensitive cases with evidence packets and auditable rationale",
];

export const vcSignals: VcSignal[] = [
  {
    painPoint: "Prior-auth digitization",
    thesis:
      "Payers spend an estimated $6–9 per manual auth transaction (CAQH index). Companies that auto-adjudicate routine requests reduce medical loss ratio and provider abrasion simultaneously.",
    dealSignal:
      "Payers and PBMs are active acquirers; strategic rationale is direct cost offset, commanding premiums above pure-financial comps.",
  },
  {
    painPoint: "Maternal episode coordination",
    thesis:
      "Unmanaged maternal episodes cost commercial payers $12K–$27K per birth (HRSA/Milliman range). Point solutions reducing avoidable readmissions convert admin spend into member retention.",
    dealSignal:
      "Hospital systems and payers both acquiring; dual-buyer dynamic supports valuation. Lacuna dataset shows meaningful maternal-category deal flow.",
  },
  {
    painPoint: "Behavioral health parity",
    thesis:
      "Mental health claim denial rates run higher than medical/surgical equivalents — a documented regulatory and PR liability. BH navigation platforms reducing out-of-network leakage are strategic for large commercial plans.",
    dealSignal:
      "Rapid consolidation since 2021 driven by parity mandates and post-pandemic demand. One of the highest-velocity M&A categories in women's and general health.",
  },
  {
    painPoint: "Specialty pharmacy exceptions",
    thesis:
      "Step-therapy and quantity-limit exceptions generate the highest admin cost per case and greatest clinical risk if mis-routed. AI-assisted exception management is early-stage with limited M&A comparables.",
    dealSignal:
      "Sparse deal history — mostly pre-Series B. Limited comparables means first-mover investors set valuation norms rather than follow them.",
  },
];

export const progressWidths: ProgressWidths = {
  29: "w-[29%]",
  43: "w-[43%]",
  51: "w-[51%]",
  64: "w-[64%]",
};

/**
 * Count verified acquisitions whose target sector matches each VC signal
 * pain point via {@link vcSignalSectorMap}.
 */
export function computeVCSignalCounts(
  acquisitions: VerifiedAcquisitionView[],
  companies: VerifiedCompanyView[],
): Record<string, number> {
  const sectorById = new Map(companies.map((c) => [c.id, c.sector]));
  const counts: Record<string, number> = {};

  for (const signal of vcSignals) {
    const sectors = vcSignalSectorMap[signal.painPoint] ?? [];
    const sectorSet = new Set(sectors);
    counts[signal.painPoint] = acquisitions.filter((acquisition) => {
      const sector = sectorById.get(acquisition.targetId);
      return sector !== undefined && sectorSet.has(sector);
    }).length;
  }

  return counts;
}

export const VC_SIGNAL_DEAL_COUNT_MODEL: ModelProvenance = {
  module: "src/data/payerOpsData.ts",
  exportName: "computeVCSignalCounts",
  definition:
    "Verified acquisitions whose target sector matches vcSignalSectorMap[painPoint]; count = matches.length.",
};

/**
 * Allocates modeled avoidable denials across triage queues using
 * {@link WORK_QUEUE_VOLUME_WEIGHTS} (≈81% of total in modeled queues).
 */
export function computeWorkQueueVolumes(
  avoidableDenials: number,
): WorkQueue[] {
  return workQueues.map((queue) => ({
    ...queue,
    volume: Math.round(
      avoidableDenials * WORK_QUEUE_VOLUME_WEIGHTS[queue.key],
    ),
  }));
}

export const WORK_QUEUE_MODEL_FOOTNOTE =
  "Derived · src/data/payerOpsData.ts · queue volumes follow WORK_QUEUE_VOLUME_WEIGHTS applied to simulator avoidable denials; automation, risk, impact, and action are static workflow design.";
