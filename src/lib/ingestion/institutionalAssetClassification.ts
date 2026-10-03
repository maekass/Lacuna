/**
 * Institutional asset classification for Lacuna.
 *
 * Separates institutionally validated clinical/therapeutic assets from
 * consumer-primary models while retaining explainable evidence signals.
 */

export const CONSUMER_RED_FLAGS = [
  "wellness",
  "wearable",
  "dtc",
  "subscription",
  "app-based",
  "fertility-clinic-chain",
  "lifestyle",
] as const;

export const INSTITUTIONAL_BILLING_PATHWAYS = [
  "MS-DRG",
  "NTAP",
  "Inpatient_Formulary",
  "CMS_Inpatient",
] as const;

export const VALID_ENDPOINT_TYPES = [
  "surrogate_biomarker",
  "clinical_outcome",
  "validated_surrogate",
] as const;

export interface InstitutionalAssetMetadata {
  deal_id?: string;
  target_name?: string;
  sector?: string;
  description?: string;
  disclosed_value_usd?: number;
  distribution_model?: string;
  trial_endpoints_type?: string;
  endpoint_validation_level?: string;
  billing_mechanism?: string;
  formulary_status?: string;
  patent_life_years?: number;
  sample_size_n?: number;
  nursing_workflow_efficiency_delta?: number;
}

export interface ClassificationResult {
  eligible: boolean;
  category: "Sex-Based Biology & Targeted Therapeutics (SBBT)" | null;
  defensibility_index: number;
  confidence: number;
  reasons: string[];
  evidence_flags: {
    consumer_noise_detected: boolean;
    validated_endpoint: boolean;
    institutional_adoption: boolean;
  };
  workspace_routing: "Deals / In-Hospital Therapeutics" | null;
  component_scores?: {
    ip_protection: number;
    clinical_evidence_scale: number;
    workflow_economics: number;
  };
}

export interface InstitutionalPipelineResult
  extends InstitutionalAssetMetadata {
  category: "Sex-Based Biology & Targeted Therapeutics (SBBT)";
  defensibility_index: number;
  classification_confidence: number;
  workspace_routing: "Deals / In-Hospital Therapeutics";
  evidence_flags: ClassificationResult["evidence_flags"];
}

export interface WorkspaceConfig {
  tags: string[];
  description: string;
}

export const INSTITUTIONAL_WORKSPACE_GRID: Record<
  "Deals" | "Payer Ops" | "Research & Quality",
  WorkspaceConfig
> = {
  Deals: {
    tags: ["Inpatient B2B", "SBBT Assets", "M&A Valuation Matrix"],
    description:
      "Transaction metrics mapping sex-based biological therapeutics against corporate buyout and asset carve-out horizons.",
  },
  "Payer Ops": {
    tags: [
      "DRG Coding",
      "NTAP Velocity",
      "Prior-Auth Friction",
      "Inpatient Reimbursement",
    ],
    description:
      "Institutional reimbursement timelines, hospital procurement paths, and cost-containment frameworks.",
  },
  "Research & Quality": {
    tags: [
      "Surrogate Biomarkers",
      "NICU/PICU Clinical Burden",
      "Frontline Nursing Overhead",
    ],
    description:
      "Clinical trial endpoint maturity alongside bedside operational impact and time-motion analysis.",
  },
};

function normalizeScore(
  value: number,
  minimum: number,
  maximum: number,
): number {
  if (maximum <= minimum) {
    throw new Error("maximum must be greater than minimum");
  }

  return Math.max(
    0,
    Math.min(1, (value - minimum) / (maximum - minimum)),
  );
}

function finiteNumber(value: number | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function exclusion(
  message: string,
  evidenceFlags: ClassificationResult["evidence_flags"],
): ClassificationResult {
  return {
    eligible: false,
    category: null,
    defensibility_index: 0,
    confidence: 0,
    reasons: [message],
    evidence_flags: evidenceFlags,
    workspace_routing: null,
  };
}

/**
 * Classify an asset for institutional clinical/deal routing.
 *
 * Consumer signals are retained as evidence, but do not automatically
 * exclude an asset. Exclusion occurs when the primary distribution model
 * is explicitly consumer-oriented.
 */
export function classifyAndScoreAsset(
  assetMetadata: InstitutionalAssetMetadata,
): ClassificationResult {
  const description = (assetMetadata.description ?? "").toLowerCase();

  const consumerNoiseDetected = CONSUMER_RED_FLAGS.some((flag) =>
    description.includes(flag)
  );

  const distributionModel = (
    assetMetadata.distribution_model ?? ""
  ).toLowerCase();

  const primaryConsumerAsset = [
    "consumer",
    "dtc",
    "wellness",
    "subscription",
  ].includes(distributionModel);

  const initialFlags = {
    consumer_noise_detected: consumerNoiseDetected,
    validated_endpoint: false,
    institutional_adoption: false,
  };

  if (primaryConsumerAsset) {
    return exclusion(
      "Primary distribution model is consumer-oriented; institutional routing requires additional evidence.",
      initialFlags,
    );
  }

  const endpointType = assetMetadata.trial_endpoints_type ?? "";
  const endpointValidationLevel = (
    assetMetadata.endpoint_validation_level ?? ""
  ).toLowerCase();

  const validatedEndpoint =
    (VALID_ENDPOINT_TYPES as readonly string[]).includes(endpointType) &&
    ["validated", "regulatory", "clinical"].includes(endpointValidationLevel);

  if (!validatedEndpoint) {
    return exclusion(
      "Clinical endpoint does not meet the configured institutional validation threshold.",
      initialFlags,
    );
  }

  const billingMechanism = assetMetadata.billing_mechanism ?? "";
  const formularyStatus = (
    assetMetadata.formulary_status ?? ""
  ).toLowerCase();

  const institutionalAdoption =
    (INSTITUTIONAL_BILLING_PATHWAYS as readonly string[]).includes(
      billingMechanism,
    ) ||
    ["approved", "covered", "institutional"].includes(formularyStatus);

  if (!institutionalAdoption) {
    return exclusion(
      "No sufficiently documented institutional reimbursement or adoption pathway.",
      {
        ...initialFlags,
        validated_endpoint: true,
      },
    );
  }

  const ipScore = normalizeScore(
    finiteNumber(assetMetadata.patent_life_years),
    0,
    20,
  );
  const clinicalEvidenceScale = normalizeScore(
    finiteNumber(assetMetadata.sample_size_n),
    0,
    2000,
  );
  const workflowEconomics = normalizeScore(
    finiteNumber(assetMetadata.nursing_workflow_efficiency_delta),
    -10,
    10,
  );

  const defensibilityIndex =
    (ipScore * 0.4 + clinicalEvidenceScale * 0.3 + workflowEconomics * 0.3) *
    100;

  const evidenceCount = [
    validatedEndpoint,
    (INSTITUTIONAL_BILLING_PATHWAYS as readonly string[]).includes(
      billingMechanism,
    ),
    assetMetadata.patent_life_years !== undefined,
    assetMetadata.sample_size_n !== undefined,
    assetMetadata.nursing_workflow_efficiency_delta !== undefined,
  ].filter(Boolean).length;

  const confidence = Math.min(1, 0.6 + evidenceCount * 0.08);

  return {
    eligible: true,
    category: "Sex-Based Biology & Targeted Therapeutics (SBBT)",
    defensibility_index: Number(defensibilityIndex.toFixed(2)),
    confidence: Number(confidence.toFixed(2)),
    reasons: [
      "Institutional clinical validation documented.",
      "Institutional reimbursement/adoption pathway documented.",
      "Asset cleared consumer-primary distribution screening.",
    ],
    evidence_flags: {
      consumer_noise_detected: consumerNoiseDetected,
      validated_endpoint: true,
      institutional_adoption: true,
    },
    workspace_routing: "Deals / In-Hospital Therapeutics",
    component_scores: {
      ip_protection: Number(ipScore.toFixed(4)),
      clinical_evidence_scale: Number(clinicalEvidenceScale.toFixed(4)),
      workflow_economics: Number(workflowEconomics.toFixed(4)),
    },
  };
}

/**
 * Apply the institutional classifier to a live dataset.
 *
 * Only eligible assets are returned, preserving the source record plus
 * classification evidence for downstream deal routing.
 */
export function processInstitutionalPipeline(
  dataset: InstitutionalAssetMetadata[],
): InstitutionalPipelineResult[] {
  const institutionalWorkspaceDeals: InstitutionalPipelineResult[] = [];

  for (const asset of dataset) {
    const result = classifyAndScoreAsset(asset);

    if (!result.eligible || !result.category || !result.workspace_routing) {
      continue;
    }

    institutionalWorkspaceDeals.push({
      ...asset,
      category: result.category,
      defensibility_index: result.defensibility_index,
      classification_confidence: result.confidence,
      workspace_routing: result.workspace_routing,
      evidence_flags: result.evidence_flags,
    });
  }

  return institutionalWorkspaceDeals;
}
