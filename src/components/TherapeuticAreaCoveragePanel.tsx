"use client";

import type { TherapeuticAreaCoverageManifest } from "@/lib/data/therapeuticAreaCoverageTypes";
import type { TherapeuticAreaCoverageCompany } from "@/lib/data/therapeuticAreaCoverageTypes";
import { getTherapeuticAreaCoverageStats } from "@/lib/data/therapeuticAreaCoverage";

const CATEGORY_LABELS: Record<
  TherapeuticAreaCoverageCompany["category"],
  string
> = {
  therapeutics: "Therapeutics",
  diagnostics: "Diagnostics",
  digital_health: "Digital health",
  medical_device: "Medical device",
  platform: "Platform",
  pharma: "Pharma",
};

function FundingBadge(
  { company }: { company: TherapeuticAreaCoverageCompany },
) {
  const label = company.fundingStatus ?? company.lastFundingType ?? "Funded";
  return (
    <span className="inline-flex rounded-full bg-lacuna-lavender/20 px-2 py-0.5 text-[10px] font-medium text-lacuna-plum">
      {label}
      {company.totalFundingM != null ? ` · $${company.totalFundingM}M` : ""}
    </span>
  );
}

interface TherapeuticAreaCoveragePanelProps {
  manifest: TherapeuticAreaCoverageManifest;
}

export default function TherapeuticAreaCoveragePanel({
  manifest,
}: TherapeuticAreaCoveragePanelProps) {
  const stats = getTherapeuticAreaCoverageStats(manifest);
  const { companies, methodology, generatedAt, therapeuticArea } = manifest;

  return (
    <details className="mt-4 rounded-lg border border-lacuna-lavender/30 bg-lacuna-lavender/10 px-4 py-3">
      <summary className="cursor-pointer text-xs font-semibold text-lacuna-plum">
        {therapeuticArea} ecosystem coverage ({stats.includedCount}{" "}
        for-profit cos. w/ funding status · {stats.verifiedOverlap}{" "}
        in verified dataset)
      </summary>

      <p className="mt-2 text-xs leading-relaxed text-lacuna-blue/80">
        Crunchbase Pro search returned {stats.crunchbaseSearchTotal} results.
        {" "}
        Included {stats.includedCount}{" "}
        for-profit product companies with Crunchbase funding or fundraising
        status. Excluded {stats.excludedNonForProfit} nonprofits,{" "}
        {stats.excludedClinicalServices} clinical service providers, and{" "}
        {stats.excludedNoFundingStatus}{" "}
        entries without verifiable funding fields.
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 text-[11px]">
        <div className="rounded-md bg-white/60 border border-lacuna-lavender/20 px-2 py-1.5">
          <span className="text-lacuna-blue/70">Crunchbase search</span>
          <p className="font-semibold text-lacuna-plum">
            {stats.crunchbaseSearchTotal}
          </p>
        </div>
        <div className="rounded-md bg-white/60 border border-lacuna-lavender/20 px-2 py-1.5">
          <span className="text-lacuna-blue/70">Included (funded)</span>
          <p className="font-semibold text-lacuna-plum">
            {stats.includedCount}
          </p>
        </div>
        <div className="rounded-md bg-white/60 border border-lacuna-lavender/20 px-2 py-1.5">
          <span className="text-lacuna-blue/70">Verified overlap</span>
          <p className="font-semibold text-lacuna-plum">
            {stats.verifiedOverlap}
          </p>
        </div>
        <div className="rounded-md bg-white/60 border border-lacuna-lavender/20 px-2 py-1.5">
          <span className="text-lacuna-blue/70">Updated</span>
          <p className="font-semibold text-lacuna-plum">{generatedAt}</p>
        </div>
      </div>

      <div className="mt-3 max-h-64 overflow-y-auto rounded-lg border border-lacuna-lavender/25 bg-white/70">
        <table className="w-full min-w-[640px] text-left text-[11px]">
          <thead className="sticky top-0 bg-lacuna-pink/10 text-lacuna-blue">
            <tr>
              <th className="p-2 font-medium">Company</th>
              <th className="p-2 font-medium">Category</th>
              <th className="p-2 font-medium">Funding</th>
              <th className="p-2 font-medium">Verified</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((company) => (
              <tr
                key={company.id}
                className="border-t border-lacuna-lavender/15 align-top"
              >
                <td className="p-2 text-lacuna-plum">
                  <span className="font-medium">{company.name}</span>
                  {company.crunchbaseRank != null && (
                    <span className="ml-1 text-lacuna-blue/50">
                      #{company.crunchbaseRank.toLocaleString()}
                    </span>
                  )}
                  {company.description && company.description !== "—" && (
                    <p className="mt-0.5 line-clamp-2 text-lacuna-blue/65">
                      {company.description}
                    </p>
                  )}
                </td>
                <td className="p-2 text-lacuna-blue/80 whitespace-nowrap">
                  {CATEGORY_LABELS[company.category]}
                </td>
                <td className="p-2">
                  <FundingBadge company={company} />
                  {company.fundraisingStatus && (
                    <p className="mt-0.5 text-lacuna-blue/55">
                      {company.fundraisingStatus}
                    </p>
                  )}
                </td>
                <td className="p-2 text-lacuna-blue/80">
                  {company.inVerifiedDataset
                    ? (
                      <span className="text-emerald-700 font-medium">
                        {company.verifiedDatasetId}
                      </span>
                    )
                    : <span className="text-lacuna-blue/45">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[10px] italic text-lacuna-blue/60 leading-relaxed">
        {methodology}
      </p>
    </details>
  );
}
