/**
 * Peer-screen configuration: which specialty and code family the outlier
 * analysis and the profile-case builder run on. Re-running for another
 * specialty or code family means adding a config file under
 * data/coding-judgment/configs/, not changing code.
 */
import { z } from "zod";

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const hcpcs = z.string().regex(/^[A-Z0-9]{5}$/);

export const peerScreenConfigSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  /** Config id, also the benchmark file stem, e.g. "obgyn-em-office-established". */
  id: slug,
  dataYear: z.number().int().min(2013),
  specialty: z.object({
    /** Short label used in prose, e.g. "OB/GYN". */
    label: z.string().min(1),
    /** Slug used in evidence ids, e.g. "obgyn". */
    slug,
    /** Exact CMS `Rndrng_Prvdr_Type` filter value. */
    cmsProviderType: z.string().min(1),
    /** Specialty-specific legitimate reasons for a high target share (prose). */
    legitimateHighShareReasons: z.string().min(1),
  }),
  cms: z.object({
    title: z.string().min(1),
    /** data-api dataset id for the chosen year (see docs for how it was chosen). */
    datasetId: z.uuid(),
    alternateDatasetIds: z.array(z.uuid()),
    catalogUrl: z.url(),
    catalogModified: z.string().min(1),
    csvDownloadUrl: z.url(),
    currentnessEvidence: z.string().min(1),
  }),
  codeFamily: z.object({
    /** Slug used in evidence ids, e.g. "em-level5". */
    slug,
    /** Prose label, e.g. "established-patient office E/M". */
    label: z.string().min(1),
    /** Codes whose services form the denominator. */
    codes: z.array(hcpcs).min(2),
    /** Code whose share is screened, e.g. "99215". */
    targetCode: hcpcs,
    /** Prose label for the target, e.g. "level-5". */
    targetLabel: z.string().min(1),
    /** Codes that must have a visible (non-suppressed) row for eligibility. */
    requiredVisibleCodes: z.array(hcpcs),
    /** Stricter visibility rule used for the sensitivity cohort. */
    sensitivityRequiredCodes: z.array(hcpcs),
  }),
  screen: z.object({
    minimumVolume: z.number().int().positive(),
    reviewPercentile: z.number().gt(0).lt(1),
    posteriorThreshold: z.number().gt(0).lt(1),
    fdrLevel: z.number().gt(0).lt(1),
    /** Minimum peers in a profile's share × volume cell before it is committed. */
    kAnonymity: z.number().int().min(2),
  }),
  caseBuilder: z.object({
    /** Number of the first generated profile case, e.g. 26 → cjc-026. */
    firstCaseNumber: z.number().int().min(1).max(999),
    /** Flagged profiles at or above this volume count as "high volume". */
    highVolumeCut: z.number().int().positive(),
    /** Volume band label for the typical (not flagged) profile. */
    typicalVolumeBand: z.string().min(1),
    /** Minimum raw share for the below-threshold (small-sample) profile. */
    belowThresholdMinShare: z.number().min(0).max(1),
  }),
}).superRefine((config, ctx) => {
  const { codes, targetCode, requiredVisibleCodes, sensitivityRequiredCodes } =
    config.codeFamily;
  if (!codes.includes(targetCode)) {
    ctx.addIssue({ code: "custom", message: "targetCode must be in codes" });
  }
  for (const code of [...requiredVisibleCodes, ...sensitivityRequiredCodes]) {
    if (!codes.includes(code)) {
      ctx.addIssue({ code: "custom", message: `${code} is not in codes` });
    }
  }
});
export type PeerScreenConfig = z.infer<typeof peerScreenConfigSchema>;

export const DEFAULT_PEER_SCREEN_CONFIG_PATH =
  "data/coding-judgment/configs/obgyn-em-office-established.json";

export function benchmarkIdFor(config: PeerScreenConfig): string {
  return `bench:${config.dataYear}:${config.specialty.slug}:${config.codeFamily.slug}`;
}

export function profileIdFor(config: PeerScreenConfig, pseudo: string): string {
  return `profile:${config.dataYear}:${config.specialty.slug}:${pseudo}`;
}

/** Committed benchmark path for a config. */
export function benchmarkPathFor(config: PeerScreenConfig): string {
  return `data/coding-judgment/benchmarks/${config.id}.${config.dataYear}.json`;
}

/** Gitignored staging paths for a config (raw rows never leave staging). */
export function stagingPathsFor(config: PeerScreenConfig): {
  dir: string;
  rows: string;
  pull: string;
  reviewList: string;
  salt: string;
} {
  const dir = "staging/coding-judgment";
  const stem = `${dir}/cms-${config.dataYear}-${config.id}`;
  return {
    dir,
    rows: `${stem}.rows.jsonl`,
    pull: `${stem}.pull.json`,
    reviewList: `${stem}.flagged-review-list.local.json`,
    salt: `${dir}/pseudonym-salt.txt`,
  };
}

/** "99211–99215" for a contiguous numeric run, else a comma list. */
export function describeCodes(codes: readonly string[]): string {
  const nums = codes.map(Number);
  const contiguous = nums.every((n, i) =>
    Number.isInteger(n) && (i === 0 || n === nums[i - 1] + 1)
  );
  return contiguous && codes.length > 2
    ? `${codes[0]}–${codes[codes.length - 1]}`
    : codes.join(", ");
}
