/**
 * Bridge the verified dataset (VerifiedCompanyView) into the quant engine's
 * QuantCompany shape — using only fields with a verified source.
 *
 * The verified dataset does NOT contain revenue, EBITDA, target market size,
 * clinical efficacy, team metrics, clinical stage, or geographic focus. Rather
 * than fabricate them (cf. AGENTS.md: "Keep provenance honest"), absent inputs
 * are left undefined and a few are *proxied* from real fields with the proxy
 * recorded in `proxiedFields` so the UI can disclose it.
 */

import type { VerifiedCompanyView } from "@/lib/data/verifiedDataHelpers";
import type {
  ClinicalStage,
  GeographicRegion,
  MaternalCondition,
  QuantCompany,
} from "./quantEngine";

export interface AdaptedQuantCompany {
  company: QuantCompany;
  /** Real disclosed valuation ($M) from the dataset, for cross-checking. */
  disclosedValuation?: number;
  /** Whether the company has any verified input the valuation engine can use. */
  hasValuationInput: boolean;
  /** Fields that are proxied/assumed rather than sourced — surfaced in the UI. */
  proxiedFields: string[];
}

/**
 * Proxy a clinical stage from a free-form funding-stage string. Funding stage
 * is NOT clinical stage; this is an explicit, coarse approximation.
 */
function proxyClinicalStage(stage: string): ClinicalStage {
  const s = stage.toLowerCase();
  if (s.includes("public") || s.includes("acquired")) return "fda_approved";
  if (/series d|series e|series f|late stage|pre-ipo/.test(s)) {
    return "fda_approved";
  }
  if (s.includes("series c")) return "phase3";
  if (s.includes("series b")) return "phase3";
  if (s.includes("series a")) return "phase2";
  if (s.includes("seed") || s.includes("student")) return "preclinical";
  return "phase2";
}

/** Infer a coarse geographic focus from an HQ string. EU maps to US bucket. */
function inferGeographicFocus(hq: string): GeographicRegion[] {
  const h = hq.toLowerCase();
  if (
    h.includes("nigeria") || h.includes("kenya") || h.includes("ghana") ||
    h.includes("south africa") || h.includes("africa")
  ) {
    return ["Africa"];
  }
  if (
    h.includes("japan") || h.includes("china") || h.includes("korea") ||
    h.includes("india") || h.includes("singapore")
  ) {
    return ["Asia"];
  }
  if (
    h.includes("brazil") || h.includes("mexico") || h.includes("argentina") ||
    h.includes("chile") || h.includes("colombia")
  ) {
    return ["LatAm"];
  }
  // North America + Europe both fall back to the US market bucket (proxy).
  return ["US"];
}

/** Map a women's-health sector onto the nearest maternal condition bucket. */
function proxyCondition(sector: string): MaternalCondition {
  const s = sector.toLowerCase();
  if (s.includes("maternal") || s.includes("preeclam") || s.includes("pregnan")) {
    return "maternal_mortality";
  }
  if (s.includes("diabet")) return "gestational_diabetes";
  if (s.includes("sickle")) return "sickle_cell";
  if (
    s.includes("pcos") || s.includes("fertil") || s.includes("reproductive") ||
    s.includes("menopause") || s.includes("gyn")
  ) {
    return "pcos";
  }
  return "maternal_mortality";
}

export function adaptQuantCompany(
  view: VerifiedCompanyView,
): AdaptedQuantCompany {
  const raisedToDate = view.totalFunding ?? 0;

  const company: QuantCompany = {
    id: view.id,
    name: view.name,
    sector: view.sector,
    fundingStage: view.stage,
    clinicalStage: proxyClinicalStage(view.stage),
    raisedToDate,
    customerCount: 0, // not in verified data — not fabricated
    geographicFocus: inferGeographicFocus(view.hq),
    condition: proxyCondition(view.sector),
    // annualRevenue, ebitda, targetMarketSize, clinicalEfficacy, teamMetrics:
    // intentionally undefined — absent from the verified dataset.
  };

  const proxiedFields = [
    "clinical stage (proxied from funding stage)",
    "geographic focus (inferred from HQ)",
    "condition (inferred from sector)",
  ];
  if (raisedToDate === 0) {
    proxiedFields.push("no disclosed funding — valuation cannot be anchored");
  }

  return {
    company,
    disclosedValuation: view.lastKnownValuation,
    hasValuationInput: raisedToDate > 0,
    proxiedFields,
  };
}

export function adaptQuantCompanies(
  views: readonly VerifiedCompanyView[],
): AdaptedQuantCompany[] {
  return views.map(adaptQuantCompany);
}
