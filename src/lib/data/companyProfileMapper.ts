import type { CompanyProfile } from "@/data/acquirer-prediction-engine";
import type { VerifiedCompanyView } from "@/lib/data/verifiedDataHelpers";

/** Map free-form verified sector strings to acquirer-engine sector keys. */
export function mapVerifiedSectorToEngineSector(sector: string): string {
  const map: Record<string, string> = {
    fertility: "fertility",
    maternal: "maternal_health",
    mental: "mental_health",
    gynecology: "womens_health",
    pelvic: "pelvic_health",
    telehealth: "telehealth",
    digital: "digital_therapeutics",
    app: "digital_health",
    wearable: "diagnostics",
    diagnos: "diagnostics",
    menopause: "menopause",
    reproductive: "fertility",
    wellness: "digital_health",
  };

  const normalized = sector.toLowerCase();
  for (const [key, value] of Object.entries(map)) {
    if (normalized.includes(key)) return value;
  }
  return "digital_health";
}

/** Map verified stage strings to acquirer-engine stage keys. */
export function mapVerifiedStageToEngineStage(
  stage: string,
): CompanyProfile["stage"] {
  const normalized = stage.toLowerCase();
  if (normalized.includes("seed")) return "seed";
  if (normalized.includes("series a") || normalized === "a") return "series_a";
  if (normalized.includes("series b") || normalized === "b") return "series_b";
  if (
    normalized.includes("series c") ||
    normalized.includes("series d") ||
    normalized.includes("growth") ||
    normalized.includes("acquired")
  ) {
    return "growth";
  }
  if (normalized.includes("late")) return "late_stage";
  return "series_a";
}

function extractCapabilities(description: string): string[] {
  const caps: string[] = [];
  if (/ai|machine learning/i.test(description)) {
    caps.push("Software & analytics");
  }
  if (/telehealth|virtual/i.test(description)) {
    caps.push("telehealth");
  }
  if (/diagnostic/i.test(description)) caps.push("diagnostics");
  if (/fertil/i.test(description)) caps.push("fertility services");
  if (/mental|therapy/i.test(description)) caps.push("mental health");
  if (/coaching|care coordination/i.test(description)) {
    caps.push("care coordination");
  }
  return caps;
}

function extractTechnologies(description: string): string[] {
  const techs: string[] = [];
  if (/app/i.test(description)) techs.push("mobile app");
  if (/platform/i.test(description)) techs.push("platform technology");
  if (/data/i.test(description)) techs.push("data analytics");
  if (/ai/i.test(description)) techs.push("artificial intelligence");
  return techs;
}

/** Convert a verified company row into an acquirer-engine profile. */
export function mapVerifiedCompanyToProfile(
  company: VerifiedCompanyView,
): CompanyProfile {
  const description = company.description ?? "";
  const capabilities = extractCapabilities(description);
  const technology = extractTechnologies(description);

  return {
    id: company.id,
    name: company.name,
    sector: mapVerifiedSectorToEngineSector(company.sector),
    stage: mapVerifiedStageToEngineStage(company.stage),
    capabilities: capabilities.length > 0 ? capabilities : [],
    technology: technology.length > 0 ? technology : [],
    fundingTotal: company.totalFunding ?? 0,
    foundingDate: company.founded ? `${company.founded}-01-01` : "2018-01-01",
    revenue: company.lastKnownValuation,
  };
}

/** Active targets: not yet acquired in the verified deal graph. */
export function filterActiveVerifiedCompanies(
  companies: readonly VerifiedCompanyView[],
  acquisitions: readonly { targetId: string }[],
): VerifiedCompanyView[] {
  const acquiredIds = new Set(acquisitions.map((a) => a.targetId));
  return companies.filter((company) => {
    if (acquiredIds.has(company.id)) return false;
    if (company.stage.toLowerCase().includes("acquired")) return false;
    return true;
  });
}
