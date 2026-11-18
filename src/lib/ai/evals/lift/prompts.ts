/**
 * Versioned prompt templates for the lift eval.
 *
 * v1 retrieval is the production evidence-ask system prompt, imported, not
 * copied, so the eval tracks what ships. v2 is a candidate revision that
 * spells out value copying, structured records, and abstention. Each version
 * also has a closed-book variant for the no-retrieval arm: same output
 * contract, but the model answers from its own knowledge or abstains.
 * Templates are pure strings; bump the version on any semantic change.
 */
import {
  EDUCATIONAL_DISCLAIMER,
  EVIDENCE_RAG_PROMPT_VERSION,
  EVIDENCE_RAG_SYSTEM_PROMPT,
} from "@/lib/ai/prompts";
import type { LiftArm, LiftPromptVersion } from "./types";

export interface LiftPromptTemplate {
  version: LiftPromptVersion;
  /** Version string reported on the app response (`promptVersion`). */
  label: string;
  retrievalSystem: string;
  closedBookSystem: string;
}

const CLOSED_BOOK_V1 =
  `You are Lacuna's research assistant for women's health M&A questions.

ROLE:
- No evidence passages are provided. Answer from your own knowledge only if you are confident
- Use disposition "answer" or "qualified_answer" for a direct answer, and "abstain" when you do not know or the fact is not public
- Leave passageIds empty. Do not invent passage identifiers or sources
- Do not state a clinical recommendation or an investment recommendation
- Do not treat a missing value as zero

CRITICAL CONSTRAINTS:
- Never invent statistics, deal values, company names, or dates
- If you are uncertain, abstain or state your uncertainty explicitly

${EDUCATIONAL_DISCLAIMER}`;

const VALUE_RULES_V2 = `VALUE RULES:
- Copy numbers and dates exactly as the source states them. Dates as YYYY-MM-DD. Deal values in USD millions, e.g. "$1600 million"
- Do not convert units, round, or restate a value in a second form
- State one value per question. Do not add other figures, dates, or years that the question did not ask for
- A value described as "not disclosed", "not recorded", or "missing" is not an answer: abstain`;

const RETRIEVAL_V2 = `${EVIDENCE_RAG_SYSTEM_PROMPT}

${VALUE_RULES_V2}
- Each passage body ends with "Structured record: metric M, value V". When you answer from it, add claim.record with that exact metric and value, and cite only that passage
- If no retrieved passage states the requested field, abstain. Do not answer from memory`;

const CLOSED_BOOK_V2 = `${CLOSED_BOOK_V1}

${VALUE_RULES_V2}
- Facts such as private-company revenue and headcount at deal time are rarely public: abstain unless you are certain`;

export const LIFT_PROMPTS: Readonly<
  Record<LiftPromptVersion, LiftPromptTemplate>
> = {
  v1: {
    version: "v1",
    label: EVIDENCE_RAG_PROMPT_VERSION,
    retrievalSystem: EVIDENCE_RAG_SYSTEM_PROMPT,
    closedBookSystem: CLOSED_BOOK_V1,
  },
  v2: {
    version: "v2",
    label: "lift-v2.0.0",
    retrievalSystem: RETRIEVAL_V2,
    closedBookSystem: CLOSED_BOOK_V2,
  },
};

export function liftSystemPrompt(
  version: LiftPromptVersion,
  arm: LiftArm,
): string {
  const template = LIFT_PROMPTS[version];
  return arm === "retrieval"
    ? template.retrievalSystem
    : template.closedBookSystem;
}

/** Closed-book user prompt: question and snapshot date only. */
export function buildClosedBookUserPrompt(input: {
  question: string;
  asOfDate: string;
}): string {
  return [
    `asOfDate: ${input.asOfDate}`,
    "No evidence passages are provided.",
    `Question: ${input.question}`,
  ].join("\n\n");
}
