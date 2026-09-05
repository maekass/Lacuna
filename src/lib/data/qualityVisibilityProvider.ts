/**
 * Client-safe reader for the slim measurement-layer census.
 */

import artifact from "@/data/computed-quality-visibility.json";
import type { QualityVisibilityArtifact } from "./qualityVisibility";

const visibility = artifact as QualityVisibilityArtifact;

/**
 * Slim quality / vintage / publication / display-provenance census.
 */
export function getQualityVisibility(): QualityVisibilityArtifact {
  return visibility;
}
