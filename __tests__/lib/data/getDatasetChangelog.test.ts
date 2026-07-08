import { describe, expect, it } from "vitest";
import { formatTierCoverageLabel } from "@/lib/data/datasetCoverage";
import {
  getDatasetChangelog,
  mergeChangelogWithCandidates,
} from "@/lib/data/getDatasetChangelog";
import { getStaticVerifiedDataset } from "@/lib/data/staticDataset";

describe("getDatasetChangelog", () => {
  it("formats verified-only coverage when candidates are unknown", () => {
    const changelog = getDatasetChangelog(getStaticVerifiedDataset());
    expect(changelog.candidateCount).toBeNull();
    expect(changelog.coverageLabel).toMatch(/verified deal/);
  });

  it("merges staging candidate counts into coverage label", () => {
    const changelog = getDatasetChangelog(getStaticVerifiedDataset());
    const merged = mergeChangelogWithCandidates(changelog, 4);
    expect(merged.candidateCount).toBe(4);
    expect(merged.coverageLabel).toContain("4 staging candidates");
    expect(merged.coverageLabel).toContain("verified deal");
  });

  it("formatTierCoverageLabel handles singular forms", () => {
    expect(
      formatTierCoverageLabel({
        verifiedDealCount: 1,
        stagingCandidateCount: 1,
      }),
    ).toBe("1 verified deal · 1 staging candidate");
  });
});
