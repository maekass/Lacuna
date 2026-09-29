import nct01620528 from "@/data/therapeutics/fixtures/ctg/NCT01620528.json";
import nct01931670 from "@/data/therapeutics/fixtures/ctg/NCT01931670.json";
import nct03204318 from "@/data/therapeutics/fixtures/ctg/NCT03204318.json";
import nct03204331 from "@/data/therapeutics/fixtures/ctg/NCT03204331.json";
import nct03992846 from "@/data/therapeutics/fixtures/ctg/NCT03992846.json";
import nct04046081 from "@/data/therapeutics/fixtures/ctg/NCT04046081.json";
import nct05101317 from "@/data/therapeutics/fixtures/ctg/NCT05101317.json";
import nct07260669 from "@/data/therapeutics/fixtures/ctg/NCT07260669.json";
import { applyReviewedAssetMappings } from "@/lib/therapeutics/adapters/assetTrialMapping";
import { normalizeClinicalTrialsGovStudy } from "@/lib/therapeutics/adapters/clinicalTrialsGov";
import { derived, observed } from "@/lib/therapeutics/primitives";
import type {
  AssetTrialMapping,
  ClinicalTrial,
  TherapeuticPopulation,
} from "@/lib/therapeutics/schema";
import type { TherapeuticSource } from "@/lib/therapeutics/primitives";

const RETRIEVED_AT = "2026-09-28";
const REVIEWER = "lacuna-therapeutics-curation";

const STUDY_FIXTURES = [
  nct01620528,
  nct01931670,
  nct03204318,
  nct03204331,
  nct03992846,
  nct05101317,
  nct04046081,
  nct07260669,
];

const SPONSOR_LINKS: Record<
  string,
  { organizationId: string; sponsorName: string }
> = {
  NCT01620528: {
    organizationId: "org-abbvie",
    sponsorName: "AbbVie (prior sponsor, Abbott)",
  },
  NCT01931670: {
    organizationId: "org-abbvie",
    sponsorName: "AbbVie",
  },
  NCT03204318: {
    organizationId: "org-myovant",
    sponsorName: "Myovant Sciences GmbH",
  },
  NCT03204331: {
    organizationId: "org-myovant",
    sponsorName: "Myovant Sciences GmbH",
  },
  NCT03992846: {
    organizationId: "org-kissei",
    sponsorName: "Kissei Pharmaceutical Co., Ltd.",
  },
  NCT05101317: {
    organizationId: "org-hope-medicine",
    sponsorName: "Hope Medicine (Nanjing) Co., Ltd",
  },
  NCT04046081: {
    organizationId: "org-edinburgh",
    sponsorName: "University of Edinburgh",
  },
  NCT07260669: {
    organizationId: "org-gesynta",
    sponsorName: "Gesynta Pharma AB",
  },
};

/**
 * Exact condition strings accepted for the endometriosis disease link.
 * Other condition text does not create a disease id.
 */
const CONDITION_LINKS: Record<string, readonly string[]> = {
  Endometriosis: ["disease-endometriosis"],
  "Endometriosis Related Pain": ["disease-endometriosis"],
};

const MAPPINGS: AssetTrialMapping[] = [
  {
    id: "map-nct01620528-elagolix",
    nctId: "NCT01620528",
    assetId: "asset-elagolix",
    rule: "exact_intervention_name",
    interventionNames: ["elagolix"],
    reviewedBy: REVIEWER,
    reviewedAt: RETRIEVED_AT,
    note:
      "Matches the registry intervention name. The arm label 'Drug: elagolix' is not used as a fuzzy match.",
  },
  {
    id: "map-nct01931670-elagolix",
    nctId: "NCT01931670",
    assetId: "asset-elagolix",
    rule: "exact_intervention_name",
    interventionNames: ["Elagolix"],
    reviewedBy: REVIEWER,
    reviewedAt: RETRIEVED_AT,
    note: "Case-insensitive exact match to the registry intervention name.",
  },
  {
    id: "map-nct03204318-relugolix-combination",
    nctId: "NCT03204318",
    assetId: "asset-relugolix-combination",
    rule: "all_intervention_names",
    interventionNames: ["Relugolix", "Estradiol/norethindrone acetate"],
    reviewedBy: REVIEWER,
    reviewedAt: RETRIEVED_AT,
    note:
      "Both ingredients must be present. This does not show that every arm received the marketed fixed-dose tablet.",
  },
  {
    id: "map-nct03204331-relugolix-combination",
    nctId: "NCT03204331",
    assetId: "asset-relugolix-combination",
    rule: "all_intervention_names",
    interventionNames: ["Relugolix", "Estradiol/norethindrone acetate"],
    reviewedBy: REVIEWER,
    reviewedAt: RETRIEVED_AT,
    note:
      "Both ingredients must be present. This does not show that every arm received the marketed fixed-dose tablet.",
  },
  {
    id: "map-nct03992846-linzagolix",
    nctId: "NCT03992846",
    assetId: "asset-linzagolix",
    rule: "all_intervention_names",
    interventionNames: ["75 mg linzagolix tablet", "200 mg linzagolix tablet"],
    reviewedBy: REVIEWER,
    reviewedAt: RETRIEVED_AT,
    note:
      "Links the linzagolix asset only when both named tablets are on the registry record. Add-back is a separate intervention and is not treated as this asset.",
  },
  {
    id: "map-nct05101317-hmi-115",
    nctId: "NCT05101317",
    assetId: "asset-hmi-115",
    rule: "exact_intervention_name",
    interventionNames: ["HMI-115"],
    reviewedBy: REVIEWER,
    reviewedAt: RETRIEVED_AT,
    note: "Exact registry intervention name. Molecular target is not mapped.",
  },
  {
    id: "map-nct04046081-dca",
    nctId: "NCT04046081",
    assetId: "asset-dichloroacetate",
    rule: "exact_intervention_name",
    interventionNames: ["Dichloroacetate"],
    reviewedBy: REVIEWER,
    reviewedAt: RETRIEVED_AT,
    note: "Exact registry intervention name.",
  },
  {
    id: "map-nct07260669-vipoglanstat",
    nctId: "NCT07260669",
    assetId: "asset-vipoglanstat",
    rule: "exact_intervention_name",
    interventionNames: ["Vipoglanstat"],
    reviewedBy: REVIEWER,
    reviewedAt: RETRIEVED_AT,
    note:
      "Exact registry intervention name. Mechanism and intervention class are not inferred.",
  },
];

function fullDate(value: string | null, nctId: string): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${nctId} is missing a full last-update post date`);
  }
  return value;
}

function populationFor(trial: ClinicalTrial): TherapeuticPopulation {
  const asOf = fullDate(trial.lastUpdatePostDate, trial.nctId);
  const eligibility = trial.eligibility;
  if (!eligibility) {
    throw new Error(`${trial.nctId} is missing eligibility`);
  }
  const age: TherapeuticPopulation["age"] = {};
  if (eligibility.minimumAge) {
    age.minimumAgeText = observed({
      claimId: `${trial.nctId}:min-age-text`,
      field: "population.age.minimumAgeText",
      value: eligibility.minimumAge,
      sourceId: trial.sourceId,
      asOf,
      limitations: [
        "Stored as the ClinicalTrials.gov minimumAge string.",
      ],
    });
    const match = /^(\d+)\s+Years$/i.exec(eligibility.minimumAge);
    if (match) {
      age.minYears = derived({
        claimId: `${trial.nctId}:min-years`,
        field: "population.age.minYears",
        value: Number(match[1]),
        sourceId: trial.sourceId,
        asOf,
        derivation:
          "Leading integer parsed from the ClinicalTrials.gov minimumAge string.",
        limitations: [
          "Parsed only when the age string matches a number of years.",
        ],
      });
    }
  }
  if (eligibility.maximumAge) {
    age.maximumAgeText = observed({
      claimId: `${trial.nctId}:max-age-text`,
      field: "population.age.maximumAgeText",
      value: eligibility.maximumAge,
      sourceId: trial.sourceId,
      asOf,
      limitations: [
        "Stored as the ClinicalTrials.gov maximumAge string.",
      ],
    });
    const match = /^(\d+)\s+Years$/i.exec(eligibility.maximumAge);
    if (match) {
      age.maxYears = derived({
        claimId: `${trial.nctId}:max-years`,
        field: "population.age.maxYears",
        value: Number(match[1]),
        sourceId: trial.sourceId,
        asOf,
        derivation:
          "Leading integer parsed from the ClinicalTrials.gov maximumAge string.",
        limitations: [
          "Parsed only when the age string matches a number of years.",
        ],
      });
    }
  }

  return {
    id: `pop-${trial.nctId.toLowerCase()}`,
    label: `${trial.nctId} eligibility`,
    kind: "trial_eligibility",
    age: Object.keys(age).length > 0 ? age : undefined,
    sex: eligibility.sex
      ? {
        sourceTerm: observed({
          claimId: `${trial.nctId}:sex`,
          field: "population.sex.sourceTerm",
          value: eligibility.sex,
          sourceId: trial.sourceId,
          asOf,
          limitations: [
            "Registry eligibility sex category, stored as written. Not a Lacuna sex or gender ontology.",
          ],
        }),
      }
      : undefined,
    inclusionNotes: [],
    exclusionNotes: [],
    sourceIds: [trial.sourceId],
    limitations: [
      "Population fields come from the current registry snapshot's eligibility module. Full criteria text is not copied into the population record.",
    ],
  };
}

export interface EndometriosisTrialLayer {
  trials: ClinicalTrial[];
  populations: TherapeuticPopulation[];
  mappings: AssetTrialMapping[];
  sources: TherapeuticSource[];
}

/** Normalize committed ClinicalTrials.gov fixtures into trial records. */
export function buildEndometriosisTrialLayer(): EndometriosisTrialLayer {
  const trials: ClinicalTrial[] = [];
  const populations: TherapeuticPopulation[] = [];
  const sources: TherapeuticSource[] = [];

  for (const fixture of STUDY_FIXTURES) {
    const protocol = fixture.protocolSection;
    const nctId = protocol?.identificationModule?.nctId;
    if (!nctId) throw new Error("Fixture is missing an NCT ID");
    const sourceId = `src-ctg-${nctId}`;
    const normalized = normalizeClinicalTrialsGovStudy(fixture, sourceId);
    if (!normalized.ok) {
      throw new Error(
        `${nctId} failed normalization: ${normalized.errors.join("; ")}`,
      );
    }
    const mapped = applyReviewedAssetMappings(
      normalized.trial,
      MAPPINGS.filter((mapping) => mapping.nctId === nctId),
    );
    if (mapped.rejected.length > 0) {
      throw new Error(
        `${nctId} mapping rejected: ${
          mapped.rejected.map((item) => item.reason).join("; ")
        }`,
      );
    }
    const sponsor = SPONSOR_LINKS[nctId];
    if (!sponsor || sponsor.sponsorName !== mapped.trial.sponsorName) {
      throw new Error(
        `${nctId} sponsor string ${
          mapped.trial.sponsorName ?? ""
        } did not match the reviewed sponsor link`,
      );
    }
    const diseaseIds = (mapped.trial.conditions ?? []).flatMap((condition) =>
      CONDITION_LINKS[condition] ?? []
    );
    if (diseaseIds.length === 0) {
      throw new Error(`${nctId} had no exact endometriosis condition match`);
    }
    const population = populationFor(mapped.trial);
    const trial: ClinicalTrial = {
      ...mapped.trial,
      sponsorOrganizationId: sponsor.organizationId,
      diseaseIds: [...new Set(diseaseIds)],
      populationId: population.id,
    };
    const publishedAt = fullDate(trial.lastUpdatePostDate, nctId);
    sources.push({
      id: sourceId,
      title: trial.title,
      publisher: "National Library of Medicine",
      url: `https://clinicaltrials.gov/study/${nctId}`,
      locator:
        "ClinicalTrials.gov API v2 snapshot. publishedAt is lastUpdatePostDate, not studyFirstPostDate.",
      publishedAt,
      retrievedAt: RETRIEVED_AT,
      sourceClass: "trial",
    });
    trials.push(trial);
    populations.push(population);
  }

  return { trials, populations, mappings: MAPPINGS, sources };
}
