import type { VerifiedDataset } from "@/lib/data/datasetTypes";
import { getVerifiedDataset } from "@/lib/data/datasetProvider";
import {
  buildPromotionDraft,
  getPromotionEntityNeeds,
  listPromotionMissingFields,
  type PromotionDraft,
  type ReviewerPromotionFields,
} from "@/lib/ingestion/buildPromotionDraft";
import type { PendingDealRecord } from "@/lib/ingestion/pendingDeals";
import { applyPromotionDraft } from "@/lib/ingestion/promoteApprovedDeals";
import { validateVerifiedDataset } from "@/lib/data/validateVerifiedDataset";

export interface PromotionDiffSection {
  action: "add" | "existing" | "unchanged";
  id: string;
  label: string;
  row?: Record<string, unknown>;
}

export interface PromotionPreviewDiff {
  companies: PromotionDiffSection | null;
  acquirers: PromotionDiffSection | null;
  acquisitions: PromotionDiffSection;
}

export interface PromotionPreviewResult {
  needsNewCompany: boolean;
  needsNewAcquirer: boolean;
  missingFields: string[];
  draft: PromotionDraft | null;
  diff: PromotionPreviewDiff | null;
  validationErrors: string[];
  ready: boolean;
}

function summarizeDiff(
  dataset: VerifiedDataset,
  draft: PromotionDraft,
): PromotionPreviewDiff {
  const companies: PromotionDiffSection | null = draft.company
    ? {
      action: "add",
      id: draft.company.id,
      label: draft.company.name,
      row: draft.company as unknown as Record<string, unknown>,
    }
    : {
      action: "existing",
      id: draft.acquisition.targetId,
      label: draft.acquisition.targetName,
    };

  const acquirers: PromotionDiffSection | null = draft.acquirer
    ? {
      action: "add",
      id: draft.acquirer.id,
      label: draft.acquirer.name,
      row: draft.acquirer as unknown as Record<string, unknown>,
    }
    : {
      action: "existing",
      id: draft.acquisition.acquirerId,
      label: draft.acquisition.acquirerName,
    };

  const existingAcquisition = dataset.acquisitions.find((row) =>
    row.id === draft.acquisition.id
  );

  return {
    companies,
    acquirers,
    acquisitions: {
      action: existingAcquisition ? "unchanged" : "add",
      id: draft.acquisition.id,
      label:
        `${draft.acquisition.targetName} ← ${draft.acquisition.acquirerName}`,
      row: draft.acquisition as unknown as Record<string, unknown>,
    },
  };
}

export interface BuildPromotionPreviewOptions {
  deal: PendingDealRecord;
  reviewerFields?: ReviewerPromotionFields;
  dataset?: VerifiedDataset;
}

/** Preview verified JSON changes before promotion. */
export async function buildPromotionPreview(
  options: BuildPromotionPreviewOptions,
): Promise<PromotionPreviewResult> {
  const dataset = options.dataset ?? await getVerifiedDataset();
  const entityNeeds = getPromotionEntityNeeds(dataset, options.deal);
  const buildOptions = {
    dataset,
    deal: options.deal,
    reviewerFields: options.reviewerFields,
    secondarySourceUrl: options.reviewerFields?.secondarySourceUrl,
  };

  const missingFields = listPromotionMissingFields(buildOptions);
  const { draft } = buildPromotionDraft(buildOptions);

  if (!draft) {
    return {
      ...entityNeeds,
      missingFields,
      draft: null,
      diff: null,
      validationErrors: [],
      ready: false,
    };
  }

  const nextDataset = applyPromotionDraft(dataset, draft);
  const validation = validateVerifiedDataset(nextDataset);
  const validationErrors = validation.ok
    ? []
    : validation.errors.map((issue) => issue.message);

  return {
    ...entityNeeds,
    missingFields,
    draft,
    diff: summarizeDiff(dataset, draft),
    validationErrors,
    ready: validationErrors.length === 0,
  };
}
