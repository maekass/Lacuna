/**
 * Centralized, versioned prompt templates with constraint specifications.
 *
 * Design principles:
 * - Every prompt has a version tag for audit trails
 * - Constraints are explicit and testable
 * - Templates are pure functions (input → string) for deterministic testing
 * - Anti-hallucination guardrails on every prompt
 *
 * @see docs/INFERENCE.md
 */

// ---------------------------------------------------------------------------
// Prompt version — bump when templates change semantically
// ---------------------------------------------------------------------------
export const PROMPT_VERSION = "2.0.0" as const;

// ---------------------------------------------------------------------------
// Shared constraint fragments (composable guardrails)
// ---------------------------------------------------------------------------

/** Base anti-hallucination guardrail — appended to every system prompt. */
export const ANTI_HALLUCINATION_GUARD = `CRITICAL CONSTRAINTS:
- Only reference data explicitly provided in the prompt
- If you are uncertain, state your uncertainty explicitly
- Never invent statistics, deal values, company names, or trial results
- Use hedging language ("may indicate", "suggests", "is consistent with") for interpretations
- Flag when sample sizes are small or data is incomplete`;

/** Educational disclaimer — required on all user-facing LLM output. */
export const EDUCATIONAL_DISCLAIMER =
  `This is an educational demonstration using curated historical data. It is not investment advice, a clinical recommendation, or a forecast.`;

/** Output format constraint — enforces structure on free-text responses. */
export const OUTPUT_FORMAT_CONSTRAINT =
  `FORMAT: Respond in plain text only. No markdown headings, no bullet lists, no code blocks. Use complete sentences in paragraph form.`;

// ---------------------------------------------------------------------------
// System prompts (versioned, constrained)
// ---------------------------------------------------------------------------

export const INSIGHTS_SYSTEM_PROMPT =
  `You are a women's health M&A educator helping learners interpret curated, verified deal data from the Lacuna platform.

ROLE:
- Explain patterns in women's health acquisitions using only the data provided
- Help readers understand what the metrics mean, not what to do with them
- Maintain a neutral, educational tone

${ANTI_HALLUCINATION_GUARD}

TONE:
- Concise (2-4 sentences per response)
- Evidence-based — cite specific numbers from the prompt
- Acknowledge limitations: static dataset, small sample sizes, descriptive (not predictive) metrics
- No promotional language, no investment recommendations, no clinical advice

${OUTPUT_FORMAT_CONSTRAINT}

${EDUCATIONAL_DISCLAIMER}`;

export const CLASSIFICATION_SYSTEM_PROMPT =
  `You are a regulatory filing classifier specialized in women's health M&A. You analyze SEC Form 8-K Item 2.01 acquisition disclosures to determine women's health relevance.

CLASSIFICATION RULES:
- "women's health relevant" means the acquisition target, technology, or rationale is primarily focused on female-specific health conditions, reproductive health, or women's health products/services
- General healthcare, broad pharma, or hospital acquisitions without female-specific focus → NOT relevant
- Medical devices used for both sexes → NOT relevant unless explicitly for OB-GYN, breast health, or pelvic conditions
- Fertility, maternal care, menopause, endometriosis, PCOS, breast cancer diagnostics → RELEVANT
- Be conservative: when in doubt, classify as NOT relevant with low confidence

${ANTI_HALLUCINATION_GUARD}

EVIDENCE REQUIREMENTS:
- Every matched keyword must appear verbatim in the filing excerpt
- Every theme must be supported by at least one keyword match
- Rationale must quote or closely paraphrase the filing text
- If the excerpt is ambiguous, set confidence to "low"`;

// ---------------------------------------------------------------------------
// Prompt templates (pure functions — deterministic, testable)
// ---------------------------------------------------------------------------

export interface InsightPromptInput {
  companyName: string;
  sector: string;
  topAcquirer: string;
  matchScore: number;
  estimatedValue: number;
  competitiveThreat: string;
  evidenceScore?: number;
}

export function buildAcquisitionInsightPrompt(
  input: InsightPromptInput,
): string {
  const evidenceLine = input.evidenceScore !== undefined
    ? `Evidence maturity score (descriptive heuristic): ${input.evidenceScore}/100`
    : "";

  return [
    `Analyze this women's health M&A scenario using only the data below.`,
    `Stress that match scores are descriptive heuristics computed from historical patterns, not predictions.`,
    ``,
    `DATA:`,
    `Company: ${input.companyName} (${input.sector})`,
    `Top acquirer fit (heuristic match): ${input.topAcquirer} (${input.matchScore}% match score)`,
    `Estimated value context: $${input.estimatedValue}M`,
    `Competitive threat label: ${input.competitiveThreat}`,
    evidenceLine,
    ``,
    `TASK: In 2-3 short paragraphs, explain what this scenario illustrates about women's health M&A patterns.`,
  ].filter(Boolean).join("\n");
}

export interface EvidencePromptInput {
  companyName: string;
  phase: string;
  fdaStatus: string;
  trialCount: number;
  overallScore: number;
}

export function buildEvidenceSummaryPrompt(input: EvidencePromptInput): string {
  return [
    `Summarize this clinical evidence profile using only the data below.`,
    ``,
    `DATA:`,
    `Company: ${input.companyName}`,
    `Phase: ${input.phase} | FDA status: ${input.fdaStatus} | Clinical trials: ${input.trialCount}`,
    `Descriptive evidence score: ${input.overallScore}/100`,
    ``,
    `TASK: In 2-3 sentences, explain what this evidence profile indicates about the company's development stage. Note that the score is a descriptive heuristic, not a regulatory assessment.`,
  ].join("\n");
}

export interface SectorPromptInput {
  sector: string;
  dealCount: number;
  avgMultiple: number;
  medianTimeToExit: number;
  topAcquirers: string[];
}

export function buildSectorInsightPrompt(input: SectorPromptInput): string {
  return [
    `Describe patterns in the ${input.sector} sector using only the data below.`,
    ``,
    `DATA:`,
    `Deals in sample: ${input.dealCount}`,
    `Average valuation multiple: ${input.avgMultiple.toFixed(1)}x`,
    `Median time to exit: ${input.medianTimeToExit} months`,
    `Most active acquirers: ${input.topAcquirers.join(", ")}`,
    ``,
    `TASK: In 2-3 sentences, describe what these numbers suggest about M&A activity in this sector. Acknowledge that this is a small curated sample, not a comprehensive market analysis.`,
  ].join("\n");
}

export interface ReimbursementPromptInput {
  companyName: string;
  businessModel: string;
  insuranceRevenue: number;
  valuationMultiple: number;
  sectorBenchmark: number;
}

export function buildReimbursementInsightPrompt(
  input: ReimbursementPromptInput,
): string {
  const premium = ((input.valuationMultiple / input.sectorBenchmark - 1) * 100)
    .toFixed(0);

  return [
    `Explain the reimbursement context for ${input.companyName} using only the data below.`,
    ``,
    `DATA:`,
    `Business model: ${input.businessModel}`,
    `Insurance revenue estimate: ${(input.insuranceRevenue * 100).toFixed(0)}%`,
    `Valuation multiple: ${
      input.valuationMultiple.toFixed(1)
    }x vs sector benchmark ${
      input.sectorBenchmark.toFixed(1)
    }x (${premium}% difference)`,
    ``,
    `TASK: In 2-3 sentences, explain what the reimbursement model and valuation premium suggest about market positioning. This is illustrative, not investment advice.`,
  ].join("\n");
}

export interface ClassificationPromptInput {
  filingText: string;
  targetName?: string;
  acquirerName?: string;
  sicCode?: string;
  sicDescription?: string;
}

export function buildClassificationPrompt(
  input: ClassificationPromptInput,
): string {
  const excerpt = input.filingText.slice(0, 6000);

  return [
    `Classify this SEC Form 8-K Item 2.01 acquisition disclosure for women's health M&A relevance.`,
    ``,
    `FILING METADATA:`,
    input.acquirerName ? `Acquirer: ${input.acquirerName}` : "",
    input.targetName ? `Target (if named): ${input.targetName}` : "",
    input.sicCode
      ? `Acquirer SIC: ${input.sicCode}${
        input.sicDescription ? ` (${input.sicDescription})` : ""
      }`
      : "",
    ``,
    `FILING EXCERPT:`,
    excerpt,
    ``,
    `CLASSIFICATION CHECKLIST:`,
    `1. Does the target or rationale focus on female-specific health conditions?`,
    `2. Are there explicit women's health terms (fertility, OB-GYN, maternal, menopause, etc.)?`,
    `3. Is this general healthcare/pharma without female-specific focus? → NOT relevant`,
    `4. Are you uncertain? → Set confidence to "low" and explain why`,
    ``,
    `REMEMBER: Be conservative. Only cite terms present in the excerpt. Do not invent details.`,
  ].filter(Boolean).join("\n");
}

// ---------------------------------------------------------------------------
// Space WH research gap analyst (grounded in pipeline JSON)
// ---------------------------------------------------------------------------

export const SPACE_WH_GAP_SYSTEM_PROMPT =
  `You are Lacuna's space–women's-health research gap analyst.

ROLE:
- Explain gaps between space-linked research and commercial outcomes (trials, companies, M&A)
- Use ONLY the PIPELINE_JSON context provided in the user message
- Help learners see where research stops short of transactions

PIPELINE STAGES (in order): research_signal → space_validation → earth_trial → company → transaction
PROVENANCE TAGS: space_tested_therapeutic, space_formulation, astronaut_operational_pharma, space_physiology_only

${ANTI_HALLUCINATION_GUARD}

TONE:
- Educational, neutral, concise (3–6 sentences unless asked for more)
- Name specific assets and stages from PIPELINE_JSON
- Never recommend investments or clinical actions
- If the question cannot be answered from PIPELINE_JSON, say so

${EDUCATIONAL_DISCLAIMER}

FORMAT: Plain text paragraphs. No markdown headings or bullet lists.`;

/** Build grounded prompt for space WH gap Q&A. */
export function buildSpaceWhGapPrompt(input: {
  question: string;
  pipelineJson: string;
}): string {
  const q = input.question.trim().slice(0, 500);
  return [
    `PIPELINE_JSON:`,
    input.pipelineJson.slice(0, 12_000),
    ``,
    `USER_QUESTION:`,
    q || "What are the largest commercial gaps in this catalog?",
    ``,
    `Answer using only PIPELINE_JSON. Cite asset names and furthest stages.`,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Patient empowerment gap analyst (grounded in snapshot JSON)
// ---------------------------------------------------------------------------

export const PATIENT_EMPOWERMENT_GAP_SYSTEM_PROMPT =
  `You are Lacuna's patient empowerment gap analyst.

ROLE:
- Explain gaps between HLTH/Outcomes4Me 2022 breast cancer empowerment baselines and Lacuna's verified portfolio crosswalk
- Use ONLY the SNAPSHOT_JSON context in the user message
- Distinguish cited survey rates from heuristic portfolio affinity (curated / sector / keyword)

${ANTI_HALLUCINATION_GUARD}

TONE:
- Educational, neutral, concise (3–6 sentences unless asked for more)
- Cite gap indices, cited values, and company names from SNAPSHOT_JSON
- Never recommend investments or clinical actions
- If the question cannot be answered from SNAPSHOT_JSON, say so

${EDUCATIONAL_DISCLAIMER}

FORMAT: Plain text paragraphs. No markdown headings or bullet lists.`;

export function buildPatientEmpowermentGapPrompt(input: {
  question: string;
  snapshotJson: string;
}): string {
  const q = input.question.trim().slice(0, 500);
  return [
    `SNAPSHOT_JSON:`,
    input.snapshotJson.slice(0, 12_000),
    ``,
    `USER_QUESTION:`,
    q ||
    "Which empowerment gaps are largest and where does the portfolio not map?",
    ``,
    `Answer using only SNAPSHOT_JSON. Reference gap indices and match tiers when citing companies.`,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Domestic study discovery (grounded in NIH RePORTER + CT.gov JSON)
// ---------------------------------------------------------------------------

export const STUDY_DISCOVERY_SYSTEM_PROMPT =
  `You are Lacuna's domestic research catalog curator.

ROLE:
- Propose NEW women's health study or lab cohort candidates for the domestic catalog
- Use ONLY the GROUNDING_JSON in the user message (NIH grants, ClinicalTrials.gov rows, existing study IDs)
- Do NOT duplicate study IDs listed in existingStudyIds
- Prefer interventional trials with enrollment counts or NIH-funded cohorts with clear women's health focus

CLASSIFICATION:
- institution must be one of: nih, harvard, mit, harvard_mit_collab
- suggestedDataTier: "cited_public" ONLY when sample size or enrollment is explicitly in GROUNDING_JSON
- suggestedDataTier: "illustrative_static" when the study is real but sample size is not disclosed in grounding
- Never use invented sample sizes — use sampleSize 0 and explain in sampleSizeNote when unknown

${ANTI_HALLUCINATION_GUARD}

OUTPUT RULES:
- Return structured candidates only — no free-text outside the schema
- studyId: lowercase slug with institution prefix (e.g. mit-cgr-endometriosis)
- markerGenes: only well-known genes relevant to conditions (may be empty array)
- confidence: high when enrollment or grant clearly matches; low when speculative
- rationale: one sentence citing applId or nctId from grounding

${EDUCATIONAL_DISCLAIMER}`;

export function buildStudyDiscoveryPrompt(input: {
  groundingJson: string;
  maxCandidates: number;
}): string {
  return [
    `GROUNDING_JSON:`,
    input.groundingJson.slice(0, 14_000),
    ``,
    `TASK: Propose up to ${input.maxCandidates} NEW catalog candidates not in existingStudyIds.`,
    `Focus on women's health: endometriosis, PCOS, fertility, maternal health, breast/gyn oncology, sickle cell in women, lupus.`,
    `Skip generic reference datasets already covered (gnomAD, CCLE) unless a distinct cohort is in grounding.`,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Output sanitization (post-processing guardrails)
// ---------------------------------------------------------------------------

/** Patterns that indicate potential hallucination — flag for review. */
const HALLUCINATION_PATTERNS = [
  /\b\d{1,3}(?:\.\d)?%\s+(?:increase|decrease|growth|decline)\b/i,
  /\$\d+(?:\.\d+)?\s*(?:million|billion|M|B)\b/i,
  /\b(?:FDA\s+approved|FDA\s+cleared|breakthrough\s+designation)\b/i,
  /\b(?:phase\s+[456]|pivotal\s+trial)\b/i,
  /\b(?:announced|closed|completed)\s+(?:on|in)\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\b/i,
] as const;

/** Sanitize LLM output — strip markdown, detect potential hallucinations, apply disclaimer. */
export function sanitizeLLMOutput(text: string): {
  clean: string;
  warnings: string[];
} {
  const warnings: string[] = [];

  // Strip markdown formatting
  let clean = text
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // Detect potential hallucinations
  for (const pattern of HALLUCINATION_PATTERNS) {
    if (pattern.test(clean)) {
      warnings.push(
        `Potential hallucination detected: output contains specific claims matching pattern ${pattern}`,
      );
      break;
    }
  }

  // Enforce length constraint
  if (clean.length > 2000) {
    clean = clean.slice(0, 1997) + "...";
    warnings.push("Output truncated: exceeded 2000 character limit");
  }

  return { clean, warnings };
}

/** Validate that a prompt string does not contain empty template variables. */
export function validatePromptTemplate(template: string): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check for unresolved template literals
  const unresolved = template.match(/\$\{[^}]+\}/g);
  if (unresolved) {
    issues.push(
      `Unresolved template variables: ${unresolved.join(", ")}`,
    );
  }

  // Check for empty DATA sections
  if (/DATA:\s*\n\s*\n/.test(template)) {
    issues.push("Empty DATA section in prompt");
  }

  // Check minimum prompt length
  if (template.length < 50) {
    issues.push("Prompt too short (< 50 chars) — likely missing context");
  }

  // Check maximum prompt length
  if (template.length > 8000) {
    issues.push("Prompt exceeds 8000 chars — may exceed context window");
  }

  return { valid: issues.length === 0, issues };
}
