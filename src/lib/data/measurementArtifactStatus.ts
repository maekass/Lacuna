/**
 * Honest status of MeshIC-gated computed artifacts.
 * Withheld files stay withheld — this module does not invent revenue or CMS $M.
 */

import computedCmsUtilization from "@/data/computed-cms-utilization.json";
import computedGrowthRates from "@/data/computed-growth-rates.json";
import computedSecRevenue from "@/data/computed-sec-revenue.json";

export interface MeasurementArtifactStatus {
  readonly id: "sec-revenue" | "growth-rates" | "cms-utilization";
  readonly label: string;
  readonly statusLabel: string;
  readonly withheld: boolean;
}

interface EvidenceStatusFile {
  readonly evidenceStatus?: string;
  readonly reason?: string;
}

function statusFromArtifact(
  artifact: EvidenceStatusFile,
  withheldFallback: string,
): { statusLabel: string; withheld: boolean } {
  const status = artifact.evidenceStatus?.trim() ?? "";
  const withheld = status.length === 0 || status.startsWith("withheld");
  if (withheld) {
    return {
      withheld: true,
      statusLabel: artifact.reason?.trim() || withheldFallback,
    };
  }
  return { withheld: false, statusLabel: status.replaceAll("_", " ") };
}

/** SEC revenue, operating growth, and CMS utilization publication state. */
export function listMeasurementArtifactStatuses(): readonly MeasurementArtifactStatus[] {
  const sec = statusFromArtifact(
    computedSecRevenue as EvidenceStatusFile,
    "Withheld pending identity-validated SEC regeneration.",
  );
  const growth = statusFromArtifact(
    computedGrowthRates as EvidenceStatusFile,
    "Withheld until the SEC revenue artifact contains comparable operating series.",
  );
  const cmsRaw = computedCmsUtilization as EvidenceStatusFile & {
    utilizationByCptCode?: unknown[];
  };
  const cmsRows = cmsRaw.utilizationByCptCode ?? [];
  const cmsWithheld = (cmsRaw.evidenceStatus ?? "").startsWith("withheld") ||
    cmsRows.length === 0;
  const cms = cmsWithheld
    ? {
      withheld: true,
      statusLabel: (cmsRaw as EvidenceStatusFile).reason?.trim() ||
        (typeof (computedCmsUtilization as { source?: string }).source ===
            "string"
          ? (computedCmsUtilization as { source: string }).source
          : "Withheld — no verified CMS aggregate input."),
    }
    : statusFromArtifact(cmsRaw, "Withheld — no verified CMS aggregate input.");

  return [
    {
      id: "sec-revenue",
      label: "SEC operating revenue",
      statusLabel: sec.statusLabel,
      withheld: sec.withheld,
    },
    {
      id: "growth-rates",
      label: "Operating growth rates",
      statusLabel: growth.statusLabel,
      withheld: growth.withheld,
    },
    {
      id: "cms-utilization",
      label: "CMS utilization",
      statusLabel: cms.statusLabel,
      withheld: cms.withheld,
    },
  ];
}
