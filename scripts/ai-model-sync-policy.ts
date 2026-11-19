/** Pure decision policy for gateway directory drift. Never selects a different model family. */

import { z } from "zod";

/** A human-reviewed retirement. An unlisted gap still fails the sync. */
export const reviewedRetirementSchema = z.object({
  id: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  replacement: z.string().min(1),
  reason: z.string().trim().min(1),
}).strict();

export const reviewedRetirementsSchema = z.array(reviewedRetirementSchema);

export type ReviewedRetirement = z.infer<typeof reviewedRetirementSchema>;

export interface DirectoryModel {
  id: string;
  name?: string;
  context_window?: number;
  pricing?: { input?: string | number; output?: string | number };
}

export interface PreviousModel {
  id: string;
  name: string;
  contextWindow: number | null;
  pricing:
    | { inputPerMillionTokens: number; outputPerMillionTokens: number }
    | null;
}

export interface ModelDecision {
  id: string;
  classification: "provider_rename" | "provider_gap" | "possible_deprecation";
  candidates: string[];
  replacement?: string;
}

function matchesMetadata(old: PreviousModel, next: DirectoryModel): boolean {
  const price = old.pricing;
  return old.name === next.name && old.contextWindow === next.context_window &&
    price !== null && next.pricing !== undefined &&
    Math.abs(price.inputPerMillionTokens - Number(next.pricing.input) * 1e6) <
      1e-6 &&
    Math.abs(price.outputPerMillionTokens - Number(next.pricing.output) * 1e6) <
      1e-6;
}

/** A provider rename needs a unique same-slug match in two independent reads. */
export function assessMissingModels(
  missing: string[],
  first: DirectoryModel[],
  second: DirectoryModel[],
  previous: PreviousModel[],
): ModelDecision[] {
  return missing.map((id) => {
    const old = previous.find((model) => model.id === id);
    const suffix = id.slice(id.indexOf("/") + 1);
    const candidates = first.filter((model) =>
      model.id !== id && model.id.endsWith(`/${suffix}`)
    ).map((model) => model.id);
    const match = first.find((model) => model.id === candidates[0]);
    const confirmed = candidates.length === 1 && old && match &&
      second.length > 0 && !second.some((model) => model.id === id) &&
      matchesMetadata(old, match) &&
      second.some((model) =>
        model.id === match.id && matchesMetadata(old, model)
      );
    if (confirmed) {
      return {
        id,
        classification: "provider_rename",
        candidates,
        replacement: match.id,
      };
    }
    return {
      id,
      classification: candidates.length
        ? "provider_gap"
        : "possible_deprecation",
      candidates,
    };
  });
}

/**
 * Unique reviewed retirement whose replacement is still in this directory read.
 * A duplicate, a self-replacement, or a missing replacement is not a match.
 */
export function matchingReviewedRetirement(
  id: string,
  retirements: readonly ReviewedRetirement[],
  directoryIds: ReadonlySet<string>,
): ReviewedRetirement | undefined {
  const matches = retirements.filter((item) =>
    item.id === id && item.replacement !== id &&
    directoryIds.has(item.replacement)
  );
  return matches.length === 1 ? matches[0] : undefined;
}

/**
 * Exit code for a directory gap. Zero when every missing id has one reviewed
 * retirement and that replacement is listed. Any other gap is non-zero.
 */
export function directoryGapExitCode(
  missing: readonly string[],
  retirements: readonly ReviewedRetirement[],
  directoryIds: ReadonlySet<string>,
): number {
  const unreviewed = missing.filter((id) =>
    matchingReviewedRetirement(id, retirements, directoryIds) === undefined
  );
  return unreviewed.length > 0 ? 1 : 0;
}
