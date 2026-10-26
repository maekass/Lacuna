import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { withLlmDevHeaders } from "@/lib/ai/devHeaders";
import {
  EVIDENCE_ASK_GATEWAY_MODEL,
  EVIDENCE_ASK_OPENAI_MODEL,
  generateInferenceObject,
  isServerInferenceConfigured,
  resetLlmAccounting,
  resolveInferenceModel,
} from "@/lib/ai/inference";
import { assessLlmOutput } from "@/lib/ai/quality";
import {
  buildEvidenceRagUserPrompt,
  EVIDENCE_RAG_PROMPT_VERSION,
  EVIDENCE_RAG_SYSTEM_PROMPT,
} from "@/lib/ai/prompts";
import { enforceRateLimit } from "@/lib/api/rateLimitGuard";
import { getReviewActor } from "@/lib/infra/reviewAuth";
import {
  type EvidenceAskDraft,
  evidenceAskDraftSchema,
  type EvidenceAskRequest,
  evidenceAskRequestSchema,
  type EvidenceAskResponse,
  type EvidenceCitation,
  type EvidencePassage,
  RETRIEVER_VERSION,
} from "./contracts";
import { corpusSnapshotHash, defaultEvidenceCorpus } from "./corpus";
import { retrievalScopeFromRequest, retrieveEvidence } from "./retrieve";
import { verifyEvidenceDraft } from "./verify";

const MAX_BODY_CHARS = 8_192;
const DISCLAIMER =
  "Research synthesis only. Not a clinical recommendation, reimbursement-policy determination, or investment recommendation. Missing values are not zero.";

export interface EvidenceDraftGeneration {
  draft: EvidenceAskDraft;
  modelId: string;
  estimatedCostUsd: number;
}

export type EvidenceDraftGenerator = (input: {
  system: string;
  prompt: string;
}) => Promise<EvidenceDraftGeneration>;

let generatorForTests: EvidenceDraftGenerator | undefined;

/** Test hook. Production requests leave this unset. */
export function setEvidenceGeneratorForTests(
  generator: EvidenceDraftGenerator | undefined,
): void {
  generatorForTests = generator;
}

export interface RunEvidenceAskInput {
  request: EvidenceAskRequest;
  corpus?: readonly EvidencePassage[];
  generate?: EvidenceDraftGenerator;
  requestId?: string;
}

export interface RunEvidenceAskResult {
  status: number;
  body: EvidenceAskResponse | { error: string; requestId?: string };
}

function toCitation(passage: EvidencePassage): EvidenceCitation {
  return {
    passageId: passage.passageId,
    sourceId: passage.sourceId,
    documentId: passage.documentId,
    snapshotId: passage.snapshotId,
    title: passage.title,
    publisher: passage.publisher,
    sourceUrl: passage.sourceUrl,
    locator: passage.locator,
    publishedAt: passage.publishedAt,
    retrievedAt: passage.retrievedAt,
    applicableDate: passage.applicableDate,
    dataYear: passage.dataYear,
    geographyLabel: passage.geography?.label,
    population: passage.population,
    payer: passage.payer,
    setting: passage.setting,
    reviewState: passage.reviewState,
    passageRole: passage.passageRole,
    supersessionStatus: passage.supersessionStatus,
    storagePolicy: passage.storagePolicy,
    limitations: [...passage.limitations],
    corpusClass: passage.corpusClass,
  };
}

function abstainBody(input: {
  request: EvidenceAskRequest;
  requestId: string;
  corpus: readonly EvidencePassage[];
  reason: string;
  retrievedPassageIds: string[];
  considered: EvidenceCitation[];
  retrievalConfigHash: string;
  retrievalScopeHash: string;
  retrievalLatencyMs: number;
  latencyMs: number;
  modelId: string;
  estimatedCostUsd: number;
}): EvidenceAskResponse {
  return {
    requestId: input.requestId,
    disposition: "abstain",
    lane: input.request.lane,
    answer:
      "No admissible evidence supports a grounded answer to this question. This is not a clinical, reimbursement-policy, or investment conclusion.",
    claims: [],
    citations: [],
    considered: input.considered,
    limitations: [
      input.reason,
      "No clinical, reimbursement-policy, or investment conclusion is made.",
    ],
    conflicts: [],
    assumptions: [],
    analystInterpretation: null,
    abstentionReason: input.reason,
    publicationEligible: false,
    representedAsApprovedClaim: false,
    sourceSnapshotHash: corpusSnapshotHash(input.corpus),
    modelId: input.modelId,
    promptVersion: EVIDENCE_RAG_PROMPT_VERSION,
    retrieverVersion: RETRIEVER_VERSION,
    retrievalAlgorithm: "lexical-v1",
    retrievalConfigHash: input.retrievalConfigHash,
    retrievalScopeHash: input.retrievalScopeHash,
    retrievedPassageIds: input.retrievedPassageIds,
    operational: {
      latencyMs: input.latencyMs,
      retrievalLatencyMs: input.retrievalLatencyMs,
      estimatedCostUsd: input.estimatedCostUsd,
    },
    disclaimer: DISCLAIMER,
  };
}

async function generateWithInference(input: {
  system: string;
  prompt: string;
}): Promise<EvidenceDraftGeneration> {
  const resolved = resolveInferenceModel({
    gatewayModel: EVIDENCE_ASK_GATEWAY_MODEL,
    openaiModel: EVIDENCE_ASK_OPENAI_MODEL,
  });
  if (!resolved) {
    throw new Error("inference_unavailable");
  }
  const { data, accounting } = await generateInferenceObject({
    resolved,
    system: input.system,
    prompt: input.prompt,
    schema: evidenceAskDraftSchema,
    schemaName: "EvidenceAskDraft",
    schemaDescription:
      "Citation-grounded evidence answer, qualified answer, or abstention",
    feature: "evidence-ask",
    maxOutputTokens: 800,
    temperature: 0,
    maxRetries: 1,
    timeoutMs: 20_000,
    gatewayTags: ["feature:evidence-ask", "quality:citation-verified"],
  });
  return {
    draft: data,
    modelId: accounting.modelId,
    estimatedCostUsd: accounting.estimatedCostUsd,
  };
}

function audit(response: EvidenceAskResponse): void {
  console.info(JSON.stringify({
    event: "evidence_rag_ask",
    requestId: response.requestId,
    disposition: response.disposition,
    lane: response.lane,
    retrievedPassageIds: response.retrievedPassageIds,
    citedPassageIds: response.citations.map((citation) => citation.passageId),
    modelId: response.modelId,
    latencyMs: response.operational.latencyMs,
    estimatedCostUsd: response.operational.estimatedCostUsd,
    publicationEligible: response.publicationEligible,
  }));
}

/** Read-only ask. Does not approve, publish, or mutate the evidence ledger. */
export async function runEvidenceAsk(
  input: RunEvidenceAskInput,
): Promise<RunEvidenceAskResult> {
  const started = Date.now();
  const requestId = input.requestId ?? randomUUID();
  const corpus = input.corpus ?? defaultEvidenceCorpus();
  const retrievalStarted = Date.now();
  const retrieval = retrieveEvidence({
    corpus,
    query: input.request.question,
    scope: retrievalScopeFromRequest(input.request),
    topK: input.request.topK,
  });
  const retrievalLatencyMs = Date.now() - retrievalStarted;
  const considered = retrieval.passages.map(toCitation);

  if (retrieval.passages.length === 0) {
    const body = abstainBody({
      request: input.request,
      requestId,
      corpus,
      reason: "No admissible passages were retrieved.",
      retrievedPassageIds: [],
      considered: [],
      retrievalConfigHash: retrieval.retrievalConfigHash,
      retrievalScopeHash: retrieval.retrievalScopeHash,
      retrievalLatencyMs,
      latencyMs: Date.now() - started,
      modelId: "none",
      estimatedCostUsd: 0,
    });
    audit(body);
    return { status: 200, body };
  }

  const generate = input.generate ?? generatorForTests;
  if (!generate && !isServerInferenceConfigured()) {
    const body = abstainBody({
      request: input.request,
      requestId,
      corpus,
      reason:
        "Inference provider is unavailable. No ungrounded answer was produced.",
      retrievedPassageIds: retrieval.retrievedPassageIds,
      considered,
      retrievalConfigHash: retrieval.retrievalConfigHash,
      retrievalScopeHash: retrieval.retrievalScopeHash,
      retrievalLatencyMs,
      latencyMs: Date.now() - started,
      modelId: "none",
      estimatedCostUsd: 0,
    });
    audit(body);
    return { status: 503, body };
  }

  let generated: EvidenceDraftGeneration;
  try {
    const prompt = buildEvidenceRagUserPrompt({
      question: input.request.question,
      asOfDate: input.request.asOfDate,
      lane: input.request.lane,
      passages: retrieval.passages.map((passage) => ({
        passageId: passage.passageId,
        title: passage.title,
        locator: passage.locator,
        publishedAt: passage.publishedAt,
        retrievedAt: passage.retrievedAt,
        reviewState: passage.reviewState,
        passageRole: passage.passageRole,
        text: passage.text,
        limitations: passage.limitations,
      })),
    });
    const run = generate ?? generateWithInference;
    generated = await run({
      system: EVIDENCE_RAG_SYSTEM_PROMPT,
      prompt,
    });
  } catch (error) {
    console.error(
      "evidence_rag_inference_failed",
      error instanceof Error ? error.name : "unknown",
    );
    const body = abstainBody({
      request: input.request,
      requestId,
      corpus,
      reason: "Inference failed. No ungrounded answer was produced.",
      retrievedPassageIds: retrieval.retrievedPassageIds,
      considered,
      retrievalConfigHash: retrieval.retrievalConfigHash,
      retrievalScopeHash: retrieval.retrievalScopeHash,
      retrievalLatencyMs,
      latencyMs: Date.now() - started,
      modelId: "none",
      estimatedCostUsd: 0,
    });
    audit(body);
    return { status: 503, body };
  }

  const verified = verifyEvidenceDraft({
    draft: generated.draft,
    retrieved: retrieval.passages,
    scope: retrieval.scope,
    lane: input.request.lane,
  });

  const citedIds = new Set(
    verified.claims.flatMap((claim) => claim.passageIds),
  );
  const citations = retrieval.passages
    .filter((passage) => citedIds.has(passage.passageId))
    .map(toCitation);
  const groundingContext = citations.map((citation) =>
    retrieval.passages.find((passage) =>
      passage.passageId === citation.passageId
    )
      ?.text ?? ""
  ).join("\n");

  let answer = verified.answer;
  let disposition = verified.disposition;
  let claims = verified.claims;
  let abstentionReason = verified.abstentionReason;
  let publicationEligible = verified.publicationEligible;
  let limitations = verified.limitations;

  if (disposition !== "abstain") {
    const quality = assessLlmOutput(answer, {
      feature: "evidence-ask",
      modelId: generated.modelId,
      groundingContext,
    });
    if (
      quality.quality.flags.adviceRisk ||
      !quality.quality.flags.groundingOk ||
      quality.quality.level === "blocked"
    ) {
      disposition = "abstain";
      answer =
        "No admissible evidence supports a grounded answer to this question. This is not a clinical, reimbursement-policy, or investment conclusion.";
      claims = [];
      abstentionReason =
        "The draft failed grounding or advice checks and was withheld.";
      publicationEligible = false;
      limitations = [
        ...limitations,
        "Quality checks rejected the draft. No ungrounded answer was returned.",
      ];
    }
  }

  const body: EvidenceAskResponse = {
    requestId,
    disposition,
    lane: input.request.lane,
    answer,
    claims,
    citations: disposition === "abstain" ? [] : citations,
    considered,
    limitations,
    conflicts: disposition === "abstain" ? [] : verified.conflicts,
    assumptions: [],
    analystInterpretation: null,
    abstentionReason,
    publicationEligible,
    representedAsApprovedClaim: publicationEligible,
    sourceSnapshotHash: corpusSnapshotHash(corpus),
    modelId: generated.modelId,
    promptVersion: EVIDENCE_RAG_PROMPT_VERSION,
    retrieverVersion: retrieval.retrieverVersion,
    retrievalAlgorithm: retrieval.retrievalAlgorithm,
    retrievalConfigHash: retrieval.retrievalConfigHash,
    retrievalScopeHash: retrieval.retrievalScopeHash,
    retrievedPassageIds: retrieval.retrievedPassageIds,
    operational: {
      latencyMs: Date.now() - started,
      retrievalLatencyMs,
      estimatedCostUsd: generated.estimatedCostUsd,
    },
    disclaimer: DISCLAIMER,
  };
  audit(body);
  return { status: 200, body };
}

export async function handleEvidenceAskRequest(
  request: Request,
): Promise<NextResponse> {
  resetLlmAccounting();
  const limited = await enforceRateLimit(request, {
    key: "evidenceAsk",
    limit: 8,
    windowMs: 60_000,
  });
  if (limited) return limited;

  if (!getReviewActor(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (raw.length > MAX_BODY_CHARS) {
    return NextResponse.json({ error: "Request too large" }, { status: 413 });
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = evidenceAskRequestSchema.safeParse(parsedJson);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const result = await runEvidenceAsk({ request: parsed.data });
  return withLlmDevHeaders(NextResponse.json(result.body, {
    status: result.status,
    headers: { "cache-control": "no-store" },
  }));
}
