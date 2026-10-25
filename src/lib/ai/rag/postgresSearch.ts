import { query } from "@/lib/data/dbClient";
import type { EvidenceRetrievalScope } from "./filters";
import { reviewStatesForLane } from "./filters";

export interface PostgresPassageSearch {
  text: string;
  params: unknown[];
}

/**
 * Parameterized full-text query. Scope filters are applied in SQL before
 * ts_rank. The question is bound as a parameter and is never concatenated.
 */
export function buildEvidencePassageSearch(input: {
  scope: EvidenceRetrievalScope;
  question: string;
  topK: number;
}): PostgresPassageSearch {
  const states = reviewStatesForLane(input.scope.lane);
  const text = [
    "SELECT passage_id",
    "FROM evidence_rag_passages",
    "WHERE published_at IS NOT NULL",
    "AND published_at <= $1::date",
    "AND supersession_status = 'current'",
    "AND redistribution = 'public'",
    "AND review_state = ANY($2::text[])",
    "AND ($3::text = 'research_draft' OR passage_role = 'approved_claim')",
    "AND ($4::text IS NULL OR geography_code = $4)",
    "AND ($5::text IS NULL OR payer = $5)",
    "AND ($6::text IS NULL OR setting = $6)",
    "AND ($7::int IS NULL OR data_year = $7)",
    "AND search_vector @@ plainto_tsquery('english', $8)",
    "ORDER BY ts_rank(search_vector, plainto_tsquery('english', $8)) DESC,",
    "passage_id ASC",
    "LIMIT $9",
  ].join("\n");
  return {
    text,
    params: [
      input.scope.asOfDate,
      states,
      input.scope.lane,
      input.scope.geographyCode ?? null,
      input.scope.payer ?? null,
      input.scope.setting ?? null,
      input.scope.dataYear ?? null,
      input.question,
      input.topK,
    ],
  };
}

/**
 * Live Postgres path. Not used by the default ask route. Requires migration
 * 012 and a loaded passage table.
 */
export async function searchPassageIdsWithPostgres(input: {
  scope: EvidenceRetrievalScope;
  question: string;
  topK: number;
}): Promise<string[]> {
  const search = buildEvidencePassageSearch(input);
  const rows = await query<{ passage_id: string }>(search.text, search.params);
  return rows.map((row) => row.passage_id);
}
