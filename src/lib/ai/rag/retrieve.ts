import { sha256Json } from "@/lib/ai/evals/clinicalEvidenceEval";
import {
  type EvidenceAskRequest,
  type EvidencePassage,
  RETRIEVAL_ALGORITHM,
  RETRIEVER_VERSION,
} from "./contracts";
import {
  type EvidenceRetrievalScope,
  filterAdmissiblePassages,
} from "./filters";
import { rankPassages } from "./rank";

export interface RetrievalResult {
  passages: EvidencePassage[];
  retrievedPassageIds: string[];
  retrieverVersion: typeof RETRIEVER_VERSION;
  retrievalAlgorithm: typeof RETRIEVAL_ALGORITHM;
  retrievalConfigHash: string;
  retrievalScopeHash: string;
  scope: EvidenceRetrievalScope;
}

export function retrievalScopeFromRequest(
  request: Pick<
    EvidenceAskRequest,
    "asOfDate" | "lane" | "geographyCode" | "payer" | "setting" | "dataYear"
  >,
): EvidenceRetrievalScope {
  return {
    asOfDate: request.asOfDate,
    lane: request.lane,
    geographyCode: request.geographyCode,
    payer: request.payer,
    setting: request.setting,
    dataYear: request.dataYear,
  };
}

export function retrieveEvidence(input: {
  corpus: readonly EvidencePassage[];
  query: string;
  scope: EvidenceRetrievalScope;
  topK: number;
}): RetrievalResult {
  const admissible = filterAdmissiblePassages(input.corpus, input.scope);
  const passages = rankPassages(admissible, input.query, input.topK);
  const retrievalConfigHash = sha256Json({
    algorithm: RETRIEVAL_ALGORITHM,
    retrieverVersion: RETRIEVER_VERSION,
    topK: input.topK,
  });
  const retrievalScopeHash = sha256Json(input.scope);
  return {
    passages,
    retrievedPassageIds: passages.map((passage) => passage.passageId),
    retrieverVersion: RETRIEVER_VERSION,
    retrievalAlgorithm: RETRIEVAL_ALGORITHM,
    retrievalConfigHash,
    retrievalScopeHash,
    scope: input.scope,
  };
}
