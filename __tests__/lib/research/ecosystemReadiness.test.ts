import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SVB_H2_2026_SOURCE } from "@/lib/research/evidenceBoundaries";
import {
  DILIGENCE_FRAMEWORK_NOTE,
  ECOSYSTEM_READINESS_DEFINITIONS,
  ECOSYSTEM_READINESS_DIMENSIONS,
  ECOSYSTEM_READINESS_SOURCES,
  type EcosystemReadinessDimension,
  getReadinessDefinition,
  getReadinessStatusLabel,
  listReadinessDefinitions,
  READINESS_STATUSES,
  type ReadinessStatus,
} from "@/lib/research/ecosystemReadiness";
import { WHAM_BUSINESS_CASE_SOURCE } from "@/lib/research/womensHealthScope";

const QUESTIONS: Record<EcosystemReadinessDimension, string> = {
  clinical_burden_evidence:
    "Is there reliable evidence of disease burden, diagnostic delay, or unmet need for the population and context in question?",
  sex_gender_intentional_evidence:
    "Do the research, trial, product, or real-world evidence sources report sex- and gender-relevant representation or analysis?",
  data_infrastructure:
    "Are relevant data repositories, registries, biobanks, common data elements, or interoperable sources available and fit for the intended use?",
  regulatory_pathway:
    "Is there a plausible and documented regulatory pathway, including relevant evidence expectations?",
  reimbursement_and_access:
    "Is there a credible coverage, payment, procurement, affordability, or distribution pathway?",
  product_maturity:
    "Is the solution at a documented research, clinical, regulatory, or commercial stage?",
  market_pathway:
    "Are adoption, implementation, supply, provider, payer, employer, procurement, or market-entry conditions understood?",
  ecosystem_coordination:
    "Are there credible partnerships, research networks, policy mechanisms, or implementation coalitions supporting translation and scale?",
};

const STATUS_LABELS: Record<ReadinessStatus, string> = {
  supported: "Supported",
  emerging: "Emerging",
  fragmented: "Fragmented",
  unknown: "Unknown",
  "not-applicable": "Not applicable",
};

describe("ecosystemReadiness", () => {
  it("defines each diligence question once", () => {
    expect(listReadinessDefinitions().map((item) => item.id)).toEqual([
      ...ECOSYSTEM_READINESS_DIMENSIONS,
    ]);
    for (const id of ECOSYSTEM_READINESS_DIMENSIONS) {
      const definition = getReadinessDefinition(id);
      expect(definition).toBe(ECOSYSTEM_READINESS_DEFINITIONS[id]);
      expect(definition.question).toBe(QUESTIONS[id]);
      expect(definition.description).toContain(DILIGENCE_FRAMEWORK_NOTE);
      expect(definition.evidenceExamples.length).toBeGreaterThan(0);
      expect(definition.prohibitedInterpretations.length).toBeGreaterThan(0);
      expect(definition.sourceIds.length).toBeGreaterThan(0);
    }
  });

  it("uses only qualitative status labels", () => {
    expect(READINESS_STATUSES).toEqual([
      "supported",
      "emerging",
      "fragmented",
      "unknown",
      "not-applicable",
    ]);
    for (const status of READINESS_STATUSES) {
      expect(getReadinessStatusLabel(status)).toBe(STATUS_LABELS[status]);
    }
  });

  it("links Camber/IEF, WHAM, and SVB to the themes they can inform", () => {
    const camber = ECOSYSTEM_READINESS_SOURCES[
      "camber-ief-opportunity-map-2023"
    ];
    const wham = ECOSYSTEM_READINESS_SOURCES[
      "wham-business-case-january-2026"
    ];
    const svb = ECOSYSTEM_READINESS_SOURCES[
      "svb-healthcare-investments-exits-h2-2026"
    ];

    expect(camber.supports).toEqual([
      "data infrastructure",
      "innovation introduction",
      "market pathway",
      "social and structural determinants of health",
      "ecosystem coordination",
    ]);
    expect(camber.url).toContain("womens-health-rnd-opportunity-map_2023");
    expect(wham.supports).toEqual([
      "sex-specific evidence",
      "research gaps",
    ]);
    expect(wham.label).toBe(WHAM_BUSINESS_CASE_SOURCE.label);
    expect(wham.url).toBe(WHAM_BUSINESS_CASE_SOURCE.url);
    expect(svb.supports).toEqual([
      "commercialization context",
      "sector market context",
    ]);
    expect(svb.label).toContain(SVB_H2_2026_SOURCE.title);
    expect(svb.url).toBe(SVB_H2_2026_SOURCE.sourceUrl);

    expect(
      getReadinessDefinition("data_infrastructure").sourceIds,
    ).toContain("camber-ief-opportunity-map-2023");
    expect(getReadinessDefinition("market_pathway").sourceIds).toEqual([
      "camber-ief-opportunity-map-2023",
      "svb-healthcare-investments-exits-h2-2026",
    ]);
    expect(
      getReadinessDefinition("ecosystem_coordination").sourceIds,
    ).toEqual(["camber-ief-opportunity-map-2023"]);
    expect(
      getReadinessDefinition("sex_gender_intentional_evidence").sourceIds,
    ).toContain("wham-business-case-january-2026");
    expect(getReadinessDefinition("product_maturity").sourceIds).toContain(
      "svb-healthcare-investments-exits-h2-2026",
    );
    expect(
      getReadinessDefinition("clinical_burden_evidence").description,
    ).toMatch(/social-and-structural-determinant/i);
    expect(
      getReadinessDefinition("data_infrastructure").description,
    ).toMatch(/innovation-introduction/i);
  });

  it("does not score, rank, or name companies", () => {
    const source = readFileSync(
      path.resolve(
        __dirname,
        "../../../src/lib/research/ecosystemReadiness.ts",
      ),
      "utf8",
    );
    expect(source).not.toMatch(/\d+\s*%/);
    expect(source).not.toMatch(/\b(companyId|acquirerId|targetId)\b/);
    expect(source).not.toMatch(
      /\b(readinessScore|overallScore|compositeScore|weight)\s*[:=]/,
    );
    expect(source).toContain("not a score");
    for (const definition of listReadinessDefinitions()) {
      expect(definition.label).not.toMatch(/\d+\s*%/);
      expect(definition.question).not.toMatch(
        /\b(score|weight|rank|star|grade)\b/i,
      );
      expect(definition.description).toContain("not a score");
      expect(definition.prohibitedInterpretations.join(" ")).toMatch(
        /composite/i,
      );
    }
  });
});
