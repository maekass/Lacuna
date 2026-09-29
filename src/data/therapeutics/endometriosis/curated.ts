import { derived, observed } from "@/lib/therapeutics/primitives";
import type { TherapeuticSource } from "@/lib/therapeutics/primitives";
import type {
  Catalyst,
  ClinicalOutcome,
  CommercialEvidence,
  Disease,
  EvidenceConflict,
  Indication,
  InterventionClass,
  InvestmentThesis,
  RegulatoryEvent,
  TherapeuticAsset,
  TherapeuticOrganization,
  TherapeuticPopulation,
} from "@/lib/therapeutics/schema";
import type { AssetClassLink } from "@/lib/therapeutics/schema";

const RETRIEVED = "2026-09-28";
const REVIEWER = "lacuna-therapeutics-curation";
const US = { level: "country" as const, code: "US", label: "United States" };

const review = { reviewedBy: REVIEWER, reviewedAt: RETRIEVED };

export const endometriosisSources: TherapeuticSource[] = [
  {
    id: "src-fda-orilissa-approval-letter",
    title: "NDA 210450 Orilissa (elagolix) approval letter",
    publisher: "U.S. Food and Drug Administration",
    url:
      "https://www.accessdata.fda.gov/drugsatfda_docs/appletter/2018/210450Orig1s000Ltr.pdf",
    locator: "Approval letter dated 07/23/2018",
    publishedAt: "2018-07-23",
    retrievedAt: RETRIEVED,
    sourceClass: "regulatory",
  },
  {
    id: "src-fda-orilissa-label-2018",
    title: "ORILISSA (elagolix) tablets prescribing information, 2018",
    publisher: "U.S. Food and Drug Administration",
    url:
      "https://www.accessdata.fda.gov/drugsatfda_docs/label/2018/210450s000lbl.pdf",
    locator: "Highlights of prescribing information and section 12.1",
    retrievedAt: RETRIEVED,
    sourceClass: "regulatory",
  },
  {
    id: "src-fda-orilissa-s009-letter",
    title: "NDA 210450/S-009 supplement letter",
    publisher: "U.S. Food and Drug Administration",
    url:
      "https://www.accessdata.fda.gov/drugsatfda_docs/appletter/2023/210450Orig1s009ltr.pdf",
    locator: "PDF CreationDate 2023-06-06",
    publishedAt: "2023-06-06",
    retrievedAt: RETRIEVED,
    sourceClass: "regulatory",
  },
  {
    id: "src-openfda-nda210450",
    title: "openFDA Drugs@FDA application NDA210450",
    publisher: "U.S. Food and Drug Administration",
    url:
      "https://api.fda.gov/drug/drugsfda.json?search=application_number:NDA210450&limit=1",
    locator: "submissions for NDA210450",
    retrievedAt: RETRIEVED,
    sourceClass: "regulatory",
  },
  {
    id: "src-nejm-elagolix-2017",
    title:
      "Treatment of Endometriosis-Associated Pain with Elagolix, an Oral GnRH Antagonist",
    publisher: "New England Journal of Medicine",
    url: "https://www.nejm.org/doi/full/10.1056/nejmoa1700089",
    locator: "Abstract, published at NEJM.org on May 19, 2017",
    publishedAt: "2017-05-19",
    retrievedAt: RETRIEVED,
    sourceClass: "trial",
  },
  {
    id: "src-myfembree-press-2022-08-05",
    title:
      "Myovant Sciences and Pfizer announce FDA approval of MYFEMBREE for endometriosis pain",
    publisher: "Myovant Sciences and Pfizer",
    url:
      "https://news.us.sumitomo-pharma.com/press-release-details/2022/Myovant-Sciences-and-Pfizer-Receive-U-S--FDA-Approval-of-MYFEMBREE-a-Once-Daily-Treatment-for-the-Management-of-Moderate-to-Severe-Pain-Associated-With-Endometriosis-08-05-2022/default.aspx",
    locator: "Dateline August 05, 2022",
    publishedAt: "2022-08-05",
    retrievedAt: RETRIEVED,
    sourceClass: "other",
  },
  {
    id: "src-fda-myfembree-s002-letter",
    title: "NDA 214846/S-002 Myfembree supplement approval letter",
    publisher: "U.S. Food and Drug Administration",
    url:
      "https://www.accessdata.fda.gov/drugsatfda_docs/appletter/2022/214846Orig1s002ltr.pdf",
    locator: "PDF CreationDate 2022-08-08; supplement approval text",
    publishedAt: "2022-08-08",
    retrievedAt: RETRIEVED,
    sourceClass: "regulatory",
  },
  {
    id: "src-fda-myfembree-label-2022",
    title: "MYFEMBREE prescribing information revised August 2022",
    publisher: "U.S. Food and Drug Administration",
    url:
      "https://www.accessdata.fda.gov/drugsatfda_docs/label/2022/214846s002lbl.pdf",
    locator: "Highlights, indication 1.2, and clinical pharmacology",
    publishedAt: "2022-08-08",
    retrievedAt: RETRIEVED,
    sourceClass: "regulatory",
  },
  {
    id: "src-fda-myfembree-orig-letter",
    title: "NDA 214846 Myfembree original approval letter",
    publisher: "U.S. Food and Drug Administration",
    url:
      "https://www.accessdata.fda.gov/drugsatfda_docs/appletter/2021/214846Orig1s000ltr.pdf",
    locator: "PDF CreationDate 2021-05-27",
    publishedAt: "2021-05-27",
    retrievedAt: RETRIEVED,
    sourceClass: "regulatory",
  },
  {
    id: "src-openfda-nda214846",
    title: "openFDA Drugs@FDA application NDA214846",
    publisher: "U.S. Food and Drug Administration",
    url:
      "https://api.fda.gov/drug/drugsfda.json?search=application_number:NDA214846&limit=1",
    locator: "sponsor_name and submissions",
    retrievedAt: RETRIEVED,
    sourceClass: "regulatory",
  },
  {
    id: "src-ema-yselty",
    title: "Yselty (linzagolix) EPAR",
    publisher: "European Medicines Agency",
    url: "https://www.ema.europa.eu/en/medicines/human/EPAR/yselty",
    locator: "Therapeutic indication and authorisation details",
    retrievedAt: RETRIEVED,
    sourceClass: "regulatory",
  },
  {
    id: "src-gba-linzagolix-2025-06-05",
    title: "G-BA resolution on linzagolix for the endometriosis indication",
    publisher: "Gemeinsamer Bundesausschuss",
    url:
      "https://www.g-ba.de/downloads/39-1464-7239/2025-06-05_AM-RL-XII_Linzagolix_D-1147_EN.pdf",
    locator:
      "Resolution of 5 June 2025 citing marketing authorisation of 22 November 2024",
    publishedAt: "2025-06-05",
    retrievedAt: RETRIEVED,
    sourceClass: "regulatory",
  },
  {
    id: "src-theramex-yselty-2024-12-20",
    title: "Theramex announcement of the Yselty endometriosis indication",
    publisher: "Theramex",
    url:
      "https://www.theramex.com/pt/novidades/theramex-announces-european-commission-approval-for-yselty%E2%96%BC-linzagolix-for-symptomatic-treatment-of-endometriosis-in-women-with-a-history-of-previous-medical-or-surgical-treatment-for/",
    locator: "Dateline 20 December 2024",
    publishedAt: "2024-12-20",
    retrievedAt: RETRIEVED,
    sourceClass: "other",
  },
  {
    id: "src-who-icd10-n80",
    title: "ICD-10 N80 Endometriosis",
    publisher: "World Health Organization",
    url: "https://icd.who.int/browse10/2019/en#/N80",
    locator: "ICD-10 2019 browser, code N80",
    retrievedAt: RETRIEVED,
    sourceClass: "other",
  },
  {
    id: "src-mesh-d004715",
    title: "MeSH D004715 Endometriosis",
    publisher: "National Library of Medicine",
    url: "https://meshb.nlm.nih.gov/record/ui?ui=D004715",
    locator: "MeSH unique ID D004715",
    retrievedAt: RETRIEVED,
    sourceClass: "other",
  },
];

export const endometriosisPopulations: TherapeuticPopulation[] = [
  {
    id: "pop-reproductive-life-registry",
    label: "Women throughout their reproductive lives",
    kind: "reproductive_age",
    reproductiveStage: {
      sourceTerm: observed({
        claimId: "claim-pop-reproductive-life-term",
        field: "population.reproductiveStage.sourceTerm",
        value: "women throughout their reproductive lives",
        sourceId: "src-ctg-NCT04046081",
        asOf: "2024-06-13",
        limitations: [
          "The registry sentence says the condition usually affects this group. It does not define a numeric age band or exclude other people.",
        ],
        ...review,
      }),
    },
    inclusionNotes: [],
    exclusionNotes: [],
    sourceIds: ["src-ctg-NCT04046081"],
    limitations: [
      "Source wording is a sponsor protocol description, not a demographic standard.",
    ],
  },
  {
    id: "pop-premenopausal-women-us-label",
    label: "Premenopausal women in the Myfembree US label",
    kind: "reproductive_age",
    reproductiveStage: {
      sourceTerm: observed({
        claimId: "claim-pop-premenopausal-label",
        field: "population.reproductiveStage.sourceTerm",
        value: "premenopausal women",
        sourceId: "src-fda-myfembree-label-2022",
        asOf: "2022-08-08",
        geography: US,
        limitations: [
          "Label phrase for the indicated population. Not a measured age distribution.",
        ],
        ...review,
      }),
    },
    geography: US,
    inclusionNotes: [],
    exclusionNotes: [],
    sourceIds: ["src-fda-myfembree-label-2022"],
    limitations: [
      "The label does not define premenopausal status with an age cutoff in the indication sentence used here.",
    ],
  },
];

export const endometriosisDisease: Disease = {
  id: "disease-endometriosis",
  canonicalName: "Endometriosis",
  aliases: [],
  codedReferences: [
    {
      id: "code-icd10-n80",
      system: "ICD-10",
      code: observed({
        claimId: "claim-icd10-n80",
        field: "disease.code",
        value: "N80",
        sourceId: "src-who-icd10-n80",
        asOf: RETRIEVED,
        limitations: [
          "The WHO browser publication date was not captured, so this code is not treated as historical evidence.",
        ],
        ...review,
      }),
      display: "Endometriosis",
    },
    {
      id: "code-mesh-d004715",
      system: "MeSH",
      code: observed({
        claimId: "claim-mesh-d004715",
        field: "disease.code",
        value: "D004715",
        sourceId: "src-mesh-d004715",
        asOf: RETRIEVED,
        limitations: [
          "The MeSH record's publication date was not captured, so this identifier is not treated as historical evidence.",
        ],
        ...review,
      }),
      display: "Endometriosis",
    },
  ],
  description: observed({
    claimId: "claim-endo-description",
    field: "disease.description",
    value:
      "A growth of endometrial-like tissue outside the uterus, described in the registry protocol as usually affecting women throughout their reproductive lives and associated with chronic pelvic pain",
    sourceId: "src-ctg-NCT04046081",
    asOf: "2024-06-13",
    limitations: [
      "This is the sponsor protocol's wording on the current ClinicalTrials.gov snapshot, not a diagnostic criteria set.",
      "The snapshot is dated by lastUpdatePostDate. It is not evidence that this sentence was public on the study's first post date.",
    ],
    ...review,
  }),
  populationRelevance: [
    {
      id: "rel-endo-reproductive-life",
      populationId: "pop-reproductive-life-registry",
      rationale: observed({
        claimId: "claim-endo-pop-relevance",
        field: "disease.populationRelevance",
        value:
          "The cited registry protocol says endometriosis usually affects women throughout their reproductive lives.",
        sourceId: "src-ctg-NCT04046081",
        asOf: "2024-06-13",
        limitations: [
          "The word usually is preserved. This is not a prevalence estimate.",
        ],
        ...review,
      }),
    },
  ],
  womensHealthRelevance: [
    {
      id: "rel-endo-premenopausal-label",
      populationId: "pop-premenopausal-women-us-label",
      rationale: observed({
        claimId: "claim-endo-wh-relevance",
        field: "disease.womensHealthRelevance",
        value:
          "The US Myfembree label identifies premenopausal women as the indicated population for endometriosis-associated pain.",
        sourceId: "src-fda-myfembree-label-2022",
        asOf: "2022-08-08",
        geography: US,
        limitations: [
          "This is labeled-population language for one product. It does not define endometriosis as exclusive to women or to premenopausal status.",
        ],
        ...review,
      }),
    },
  ],
  sourceIds: [
    "src-ctg-NCT04046081",
    "src-fda-myfembree-label-2022",
    "src-who-icd10-n80",
    "src-mesh-d004715",
  ],
  limitations: [
    "SNOMED CT is not recorded because no public source definition was attached.",
    "Burden, prevalence, and diagnosis rates are not in this disease record.",
  ],
};

export const endometriosisIndications: Indication[] = [
  {
    id: "ind-orilissa-endo-us",
    diseaseId: "disease-endometriosis",
    assetId: "asset-elagolix",
    jurisdiction: "US",
    labelText: observed({
      claimId: "claim-orilissa-indication",
      field: "indication.labelText",
      value:
        "management of moderate to severe pain associated with endometriosis",
      sourceId: "src-fda-orilissa-approval-letter",
      asOf: "2018-07-23",
      eventDate: "2018-07-23",
      geography: US,
      limitations: [
        "Approved-use wording from the NDA letter. Not a measure of effect size.",
      ],
      ...review,
    }),
  },
  {
    id: "ind-myfembree-endo-us",
    diseaseId: "disease-endometriosis",
    assetId: "asset-relugolix-combination",
    jurisdiction: "US",
    labelText: observed({
      claimId: "claim-myfembree-press-indication",
      field: "indication.labelText",
      value:
        "management of moderate to severe pain associated with endometriosis in pre-menopausal women",
      sourceId: "src-myfembree-press-2022-08-05",
      asOf: "2022-08-05",
      eventDate: "2022-08-05",
      geography: US,
      limitations: [
        "Sponsor press wording. The FDA letter is a separate source with a later document date.",
      ],
      ...review,
    }),
  },
  {
    id: "ind-yselty-endo-eu",
    diseaseId: "disease-endometriosis",
    assetId: "asset-linzagolix",
    jurisdiction: "EU",
    labelText: observed({
      claimId: "claim-yselty-gba-indication",
      field: "indication.labelText",
      value:
        "symptomatic treatment of endometriosis in women with a history of previous medical or surgical treatment for their endometriosis",
      sourceId: "src-gba-linzagolix-2025-06-05",
      asOf: "2025-06-05",
      eventDate: "2024-11-22",
      limitations: [
        "The resolution cites a 22 November 2024 marketing authorisation. The resolution itself is dated 5 June 2025, so the November date is not treated as knowable on that earlier day from this source.",
      ],
      ...review,
    }),
  },
];

export const endometriosisClasses: InterventionClass[] = [
  {
    id: "class-gnrh-antagonist",
    canonicalName: "GnRH antagonist",
    aliases: ["gonadotropin-releasing hormone antagonist"],
    description: observed({
      claimId: "claim-class-gnrh-description",
      field: "interventionClass.description",
      value: "oral, nonpeptide GnRH antagonist",
      sourceId: "src-nejm-elagolix-2017",
      asOf: "2017-05-19",
      limitations: [
        "Class description uses the trial publication's wording for elagolix. It is not a comparative ranking of antagonists.",
      ],
      ...review,
    }),
  },
  {
    id: "class-estrogen-progestin-add-back",
    canonicalName: "Estrogen-progestin add-back",
    aliases: [],
    description: observed({
      claimId: "claim-class-addback-description",
      field: "interventionClass.description",
      value: "estradiol, an estrogen, and norethindrone acetate, a progestin",
      sourceId: "src-fda-myfembree-label-2022",
      asOf: "2022-08-08",
      geography: US,
      limitations: [
        "Describes the add-back components named in the US label. Not an efficacy claim.",
      ],
      ...review,
    }),
  },
];

export const endometriosisClassLinks: AssetClassLink[] = [
  {
    id: "link-elagolix-gnrh",
    assetId: "asset-elagolix",
    interventionClassId: "class-gnrh-antagonist",
    link: observed({
      claimId: "claim-link-elagolix-gnrh",
      field: "asset.interventionClass",
      value: "GnRH antagonist",
      sourceId: "src-nejm-elagolix-2017",
      asOf: "2017-05-19",
      limitations: [
        "Linked from the trial publication's description of elagolix.",
      ],
      ...review,
    }),
  },
  {
    id: "link-relugolix-gnrh",
    assetId: "asset-relugolix-combination",
    interventionClassId: "class-gnrh-antagonist",
    link: observed({
      claimId: "claim-link-relugolix-gnrh",
      field: "asset.interventionClass",
      value: "GnRH receptor antagonist",
      sourceId: "src-fda-myfembree-label-2022",
      asOf: "2022-08-08",
      geography: US,
      limitations: [
        "The label calls relugolix a GnRH receptor antagonist. The class record keeps the broader GnRH antagonist name.",
      ],
      ...review,
    }),
  },
  {
    id: "link-relugolix-addback",
    assetId: "asset-relugolix-combination",
    interventionClassId: "class-estrogen-progestin-add-back",
    link: observed({
      claimId: "claim-link-relugolix-addback",
      field: "asset.interventionClass",
      value: "estradiol and norethindrone acetate",
      sourceId: "src-fda-myfembree-label-2022",
      asOf: "2022-08-08",
      geography: US,
      limitations: [
        "The marketed product includes add-back. The trial arms are not all evidence of the fixed-dose tablet.",
      ],
      ...review,
    }),
  },
  {
    id: "link-linzagolix-gnrh",
    assetId: "asset-linzagolix",
    interventionClassId: "class-gnrh-antagonist",
    link: observed({
      claimId: "claim-link-linzagolix-gnrh",
      field: "asset.interventionClass",
      value: "oral GnRH antagonist",
      sourceId: "src-theramex-yselty-2024-12-20",
      asOf: "2024-12-20",
      limitations: [
        "Sponsor announcement wording. Concomitant add-back for the endometriosis regimen is not modeled as a second asset.",
      ],
      ...review,
    }),
  },
];

export const endometriosisOrganizations: TherapeuticOrganization[] = [
  {
    id: "org-abbvie",
    canonicalName: "AbbVie Inc.",
    aliases: ["AbbVie"],
    name: observed({
      claimId: "claim-org-abbvie-name",
      field: "organization.name",
      value: "AbbVie Inc.",
      sourceId: "src-fda-orilissa-approval-letter",
      asOf: "2018-07-23",
      limitations: ["Applicant named in the NDA approval letter."],
      ...review,
    }),
    limitations: [
      "The ELARIS EM-I registry string also says prior sponsor Abbott. That string is preserved on the trial and is not an ownership transfer.",
    ],
  },
  {
    id: "org-myovant",
    canonicalName: "Myovant Sciences GmbH",
    aliases: ["Myovant Sciences"],
    name: observed({
      claimId: "claim-org-myovant-name",
      field: "organization.name",
      value: "Myovant Sciences GmbH",
      sourceId: "src-fda-myfembree-s002-letter",
      asOf: "2022-08-08",
      limitations: ["Addressee of the endometriosis supplement letter."],
      ...review,
    }),
    limitations: [
      "A later openFDA sponsor_name is recorded only as a conflicting observation and is not back-dated.",
    ],
  },
  {
    id: "org-pfizer",
    canonicalName: "Pfizer Inc.",
    aliases: ["Pfizer"],
    name: observed({
      claimId: "claim-org-pfizer-name",
      field: "organization.name",
      value: "Pfizer Inc.",
      sourceId: "src-myfembree-press-2022-08-05",
      asOf: "2022-08-05",
      limitations: [
        "Named in the 5 August 2022 press release as a commercialization partner.",
      ],
      ...review,
    }),
    limitations: ["Not the NDA applicant on the 2022 supplement letter."],
  },
  {
    id: "org-kissei",
    canonicalName: "Kissei Pharmaceutical Co., Ltd.",
    aliases: [],
    name: observed({
      claimId: "claim-org-kissei-name",
      field: "organization.name",
      value: "Kissei Pharmaceutical Co., Ltd.",
      sourceId: "src-ctg-NCT03992846",
      asOf: "2025-04-02",
      limitations: ["Lead sponsor string on the EDELWEISS 3 registry record."],
      ...review,
    }),
    limitations: [
      "Trial sponsorship is not modeled as current marketing authorisation.",
    ],
  },
  {
    id: "org-theramex",
    canonicalName: "Theramex",
    aliases: ["Theramex Ireland Limited"],
    name: observed({
      claimId: "claim-org-theramex-name",
      field: "organization.name",
      value: "Theramex",
      sourceId: "src-theramex-yselty-2024-12-20",
      asOf: "2024-12-20",
      limitations: [
        "The EMA page names Theramex Ireland Limited as marketing authorisation holder, but that page's publication date was not captured.",
      ],
      ...review,
    }),
    limitations: [
      "Licence history before the 2024 announcement is not established in this graph.",
    ],
  },
  {
    id: "org-edinburgh",
    canonicalName: "University of Edinburgh",
    aliases: [],
    name: observed({
      claimId: "claim-org-edinburgh-name",
      field: "organization.name",
      value: "University of Edinburgh",
      sourceId: "src-ctg-NCT04046081",
      asOf: "2024-06-13",
      limitations: ["Lead sponsor on NCT04046081."],
      ...review,
    }),
    limitations: [
      "Academic sponsor of an exploratory study, not a marketed product holder.",
    ],
  },
  {
    id: "org-hope-medicine",
    canonicalName: "Hope Medicine (Nanjing) Co., Ltd",
    aliases: ["Hope Medicine"],
    name: observed({
      claimId: "claim-org-hope-name",
      field: "organization.name",
      value: "Hope Medicine (Nanjing) Co., Ltd",
      sourceId: "src-ctg-NCT05101317",
      asOf: "2026-01-21",
      limitations: ["Lead sponsor string on NCT05101317."],
      ...review,
    }),
    limitations: [
      "Other Hope Medicine registry records are not linked in this vertical.",
    ],
  },
  {
    id: "org-gesynta",
    canonicalName: "Gesynta Pharma AB",
    aliases: [],
    name: observed({
      claimId: "claim-org-gesynta-name",
      field: "organization.name",
      value: "Gesynta Pharma AB",
      sourceId: "src-ctg-NCT07260669",
      asOf: "2026-09-11",
      limitations: ["Lead sponsor string on NCT07260669."],
      ...review,
    }),
    limitations: [
      "Mechanism was not stated in the registry fields normalized here.",
    ],
  },
];

export const endometriosisAssets: TherapeuticAsset[] = [
  {
    id: "asset-elagolix",
    canonicalName: "elagolix",
    aliases: ["elagolix sodium"],
    codeNames: [],
    brandNames: [
      {
        id: "brand-orilissa",
        jurisdiction: "US",
        name: observed({
          claimId: "claim-orilissa-brand",
          field: "asset.brandName",
          value: "Orilissa",
          sourceId: "src-fda-orilissa-approval-letter",
          asOf: "2018-07-23",
          geography: US,
          limitations: ["Brand name as written in the NDA approval letter."],
          ...review,
        }),
      },
    ],
    sponsorOrganizationId: "org-abbvie",
    previousOwnerOrganizationIds: [],
    relationships: [
      {
        id: "rel-elagolix-abbvie-applicant",
        organizationId: "org-abbvie",
        role: "applicant",
        relationship: observed({
          claimId: "claim-elagolix-applicant",
          field: "asset.applicant",
          value: "AbbVie Inc.",
          sourceId: "src-fda-orilissa-approval-letter",
          asOf: "2018-07-23",
          limitations: [
            "The approval letter identifies the applicant. Originator licensing is not in this record.",
          ],
          ...review,
        }),
      },
    ],
    modality: observed({
      claimId: "claim-elagolix-modality",
      field: "asset.modality",
      value: "small_molecule",
      sourceId: "src-fda-orilissa-label-2018",
      asOf: RETRIEVED,
      limitations: [
        "The 2018 label says elagolix sodium is a nonpeptide small molecule. Internal PDF timestamps predate approval and are not used as the publication date, so this claim stays unresolved in historical snapshots.",
      ],
      ...review,
    }),
    mechanism: observed({
      claimId: "claim-elagolix-mechanism",
      field: "asset.mechanism",
      value: "oral, nonpeptide GnRH antagonist",
      sourceId: "src-nejm-elagolix-2017",
      asOf: "2017-05-19",
      limitations: [
        "Wording from the trial publication. The US label's receptor-binding sentence is a separate undated-publication claim.",
      ],
      ...review,
    }),
    molecularTarget: observed({
      claimId: "claim-elagolix-target",
      field: "asset.molecularTarget",
      value: "GnRH receptors in the pituitary gland",
      sourceId: "src-fda-orilissa-label-2018",
      asOf: RETRIEVED,
      limitations: [
        "Taken from the 2018 label mechanism sentence. Public posting of that file was not dated, so the claim is not historical evidence.",
      ],
      ...review,
    }),
    indicationIds: ["ind-orilissa-endo-us"],
    developmentStatuses: [
      {
        id: "stage-elagolix-us",
        jurisdiction: "US",
        indicationId: "ind-orilissa-endo-us",
        stage: observed({
          claimId: "claim-elagolix-stage",
          field: "asset.developmentStage",
          value: "approved",
          sourceId: "src-fda-orilissa-approval-letter",
          asOf: "2018-07-23",
          eventDate: "2018-07-23",
          geography: US,
          limitations: [
            "US approval of NDA 210450. Not a global development stage.",
          ],
          ...review,
        }),
        statusText: observed({
          claimId: "claim-elagolix-status",
          field: "asset.statusText",
          value: "NDA 210450 approved",
          sourceId: "src-fda-orilissa-approval-letter",
          asOf: "2018-07-23",
          eventDate: "2018-07-23",
          geography: US,
          limitations: ["Status is the approval action, not a sales status."],
          ...review,
        }),
      },
    ],
    administrationRoute: observed({
      claimId: "claim-elagolix-route",
      field: "asset.administrationRoute",
      value: "oral",
      sourceId: "src-nejm-elagolix-2017",
      asOf: "2017-05-19",
      limitations: ["The trial publication describes elagolix as oral."],
      ...review,
    }),
    interventionClassIds: ["class-gnrh-antagonist"],
    sourceIds: [
      "src-fda-orilissa-approval-letter",
      "src-fda-orilissa-label-2018",
      "src-nejm-elagolix-2017",
    ],
    limitations: [
      "Originator or licensor history is not established by the sources attached here.",
      "Later labeling supplements are not all normalized. S-009 is recorded only as a later letter.",
    ],
  },
  {
    id: "asset-relugolix-combination",
    canonicalName: "relugolix, estradiol, and norethindrone acetate",
    aliases: ["relugolix combination therapy"],
    codeNames: [],
    brandNames: [
      {
        id: "brand-myfembree",
        jurisdiction: "US",
        name: observed({
          claimId: "claim-myfembree-brand",
          field: "asset.brandName",
          value: "MYFEMBREE",
          sourceId: "src-myfembree-press-2022-08-05",
          asOf: "2022-08-05",
          geography: US,
          limitations: [
            "Brand styling follows the 5 August 2022 press release.",
          ],
          ...review,
        }),
      },
    ],
    sponsorOrganizationId: "org-myovant",
    previousOwnerOrganizationIds: [],
    relationships: [
      {
        id: "rel-myfembree-myovant-applicant",
        organizationId: "org-myovant",
        role: "applicant",
        relationship: observed({
          claimId: "claim-myfembree-applicant",
          field: "asset.applicant",
          value: "Myovant Sciences GmbH",
          sourceId: "src-fda-myfembree-s002-letter",
          asOf: "2022-08-08",
          limitations: [
            "Letter addressee. Knowable from this file's document date, not from the press date alone.",
          ],
          ...review,
        }),
      },
      {
        id: "rel-myfembree-pfizer-partner",
        organizationId: "org-pfizer",
        role: "commercial_partner",
        relationship: observed({
          claimId: "claim-myfembree-pfizer",
          field: "asset.commercialPartner",
          value: "Pfizer Inc.",
          sourceId: "src-myfembree-press-2022-08-05",
          asOf: "2022-08-05",
          limitations: [
            "The press release says the companies will jointly commercialize MYFEMBREE in the US. Equity ownership is not stated.",
          ],
          ...review,
        }),
      },
    ],
    modality: derived({
      claimId: "claim-myfembree-modality",
      field: "asset.modality",
      value: "combination_product",
      sourceId: "src-fda-myfembree-label-2022",
      asOf: "2022-08-08",
      derivation:
        "Mapped from the US label description of a combination of relugolix, estradiol, and norethindrone acetate.",
      geography: US,
      limitations: [
        "combination_product is Lacuna's enum for that label description.",
      ],
      ...review,
    }),
    mechanism: observed({
      claimId: "claim-myfembree-mechanism",
      field: "asset.mechanism",
      value:
        "relugolix, a gonadotropin-releasing hormone (GnRH) receptor antagonist, with estradiol and norethindrone acetate",
      sourceId: "src-fda-myfembree-label-2022",
      asOf: "2022-08-08",
      geography: US,
      limitations: [
        "Label pharmacologic description. Not a comparative claim against elagolix.",
      ],
      ...review,
    }),
    molecularTarget: observed({
      claimId: "claim-myfembree-target",
      field: "asset.molecularTarget",
      value: "GnRH receptor",
      sourceId: "src-fda-myfembree-label-2022",
      asOf: "2022-08-08",
      geography: US,
      limitations: [
        "Target language is limited to the relugolix component named in the label.",
      ],
      ...review,
    }),
    indicationIds: ["ind-myfembree-endo-us"],
    developmentStatuses: [
      {
        id: "stage-myfembree-endo-us",
        jurisdiction: "US",
        indicationId: "ind-myfembree-endo-us",
        stage: observed({
          claimId: "claim-myfembree-endo-stage",
          field: "asset.developmentStage",
          value: "approved",
          sourceId: "src-myfembree-press-2022-08-05",
          asOf: "2022-08-05",
          eventDate: "2022-08-05",
          geography: US,
          limitations: [
            "Approval announcement. The FDA letter file used here has a later document date.",
          ],
          ...review,
        }),
        statusText: observed({
          claimId: "claim-myfembree-endo-status",
          field: "asset.statusText",
          value:
            "FDA approved for moderate to severe pain associated with endometriosis",
          sourceId: "src-myfembree-press-2022-08-05",
          asOf: "2022-08-05",
          eventDate: "2022-08-05",
          geography: US,
          limitations: [
            "Press statement of the approval. Not a market-share statement.",
          ],
          ...review,
        }),
      },
    ],
    administrationRoute: observed({
      claimId: "claim-myfembree-route",
      field: "asset.administrationRoute",
      value: "oral",
      sourceId: "src-fda-myfembree-label-2022",
      asOf: "2022-08-08",
      geography: US,
      limitations: ["US label: tablets for oral use."],
      ...review,
    }),
    interventionClassIds: [
      "class-gnrh-antagonist",
      "class-estrogen-progestin-add-back",
    ],
    sourceIds: [
      "src-myfembree-press-2022-08-05",
      "src-fda-myfembree-s002-letter",
      "src-fda-myfembree-label-2022",
    ],
    limitations: [
      "SPIRIT trials studied relugolix plus estradiol/norethindrone acetate. That is not proof every arm used the marketed one-tablet product.",
      "Uterine-fibroid history is a separate regulatory event and is not collapsed into this indication.",
    ],
  },
  {
    id: "asset-linzagolix",
    canonicalName: "linzagolix",
    aliases: ["linzagolix choline"],
    codeNames: [],
    brandNames: [
      {
        id: "brand-yselty",
        jurisdiction: "EU",
        name: observed({
          claimId: "claim-yselty-brand",
          field: "asset.brandName",
          value: "Yselty",
          sourceId: "src-theramex-yselty-2024-12-20",
          asOf: "2024-12-20",
          limitations: ["Brand name in the sponsor announcement."],
          ...review,
        }),
      },
    ],
    sponsorOrganizationId: "org-theramex",
    previousOwnerOrganizationIds: [],
    relationships: [
      {
        id: "rel-linzagolix-theramex",
        organizationId: "org-theramex",
        role: "marketing_authorisation_holder",
        relationship: observed({
          claimId: "claim-linzagolix-mah",
          field: "asset.marketingAuthorisationHolder",
          value: "Theramex",
          sourceId: "src-theramex-yselty-2024-12-20",
          asOf: "2024-12-20",
          limitations: [
            "The announcement describes Theramex as the company receiving the indication extension. The EMA legal-entity string is not dated in this graph.",
          ],
          ...review,
        }),
      },
      {
        id: "rel-linzagolix-kissei-sponsor",
        organizationId: "org-kissei",
        role: "trial_sponsor",
        relationship: observed({
          claimId: "claim-linzagolix-trial-sponsor",
          field: "asset.trialSponsor",
          value: "Kissei Pharmaceutical Co., Ltd.",
          sourceId: "src-ctg-NCT03992846",
          asOf: "2025-04-02",
          limitations: [
            "EDELWEISS 3 lead sponsor on the current registry snapshot.",
          ],
          ...review,
        }),
      },
    ],
    mechanism: observed({
      claimId: "claim-linzagolix-mechanism",
      field: "asset.mechanism",
      value: "oral gonadotropin-releasing hormone (GnRH) antagonist",
      sourceId: "src-theramex-yselty-2024-12-20",
      asOf: "2024-12-20",
      limitations: [
        "Sponsor wording. A receptor-binding statement was not taken from an undated SmPC.",
      ],
      ...review,
    }),
    indicationIds: ["ind-yselty-endo-eu"],
    developmentStatuses: [
      {
        id: "stage-linzagolix-eu-endo",
        jurisdiction: "EU",
        indicationId: "ind-yselty-endo-eu",
        stage: observed({
          claimId: "claim-linzagolix-eu-stage",
          field: "asset.developmentStage",
          value: "approved",
          sourceId: "src-gba-linzagolix-2025-06-05",
          asOf: "2025-06-05",
          eventDate: "2024-11-22",
          limitations: [
            "EU endometriosis indication as cited by the 5 June 2025 resolution. Not a US approval.",
          ],
          ...review,
        }),
        statusText: observed({
          claimId: "claim-linzagolix-eu-status",
          field: "asset.statusText",
          value:
            "EU marketing authorisation for endometriosis cited as 22 November 2024",
          sourceId: "src-gba-linzagolix-2025-06-05",
          asOf: "2025-06-05",
          eventDate: "2024-11-22",
          limitations: [
            "The authorisation date is the resolution's citation. This source was not public on 22 November 2024.",
          ],
          ...review,
        }),
      },
    ],
    administrationRoute: observed({
      claimId: "claim-linzagolix-route",
      field: "asset.administrationRoute",
      value: "oral",
      sourceId: "src-theramex-yselty-2024-12-20",
      asOf: "2024-12-20",
      limitations: ["The announcement describes an oral GnRH antagonist."],
      ...review,
    }),
    interventionClassIds: ["class-gnrh-antagonist"],
    sourceIds: [
      "src-theramex-yselty-2024-12-20",
      "src-gba-linzagolix-2025-06-05",
      "src-ctg-NCT03992846",
    ],
    limitations: [
      "US approval was not established from an FDA source in this vertical.",
      "Modality and molecular target beyond the GnRH antagonist phrase are unresolved.",
    ],
  },
  {
    id: "asset-hmi-115",
    canonicalName: "HMI-115",
    aliases: [],
    codeNames: [],
    brandNames: [],
    sponsorOrganizationId: "org-hope-medicine",
    previousOwnerOrganizationIds: [],
    relationships: [
      {
        id: "rel-hmi-sponsor",
        organizationId: "org-hope-medicine",
        role: "trial_sponsor",
        relationship: observed({
          claimId: "claim-hmi-sponsor",
          field: "asset.trialSponsor",
          value: "Hope Medicine (Nanjing) Co., Ltd",
          sourceId: "src-ctg-NCT05101317",
          asOf: "2026-01-21",
          limitations: ["Lead sponsor of the phase 2 registry record."],
          ...review,
        }),
      },
    ],
    modality: derived({
      claimId: "claim-hmi-modality",
      field: "asset.modality",
      value: "monoclonal_antibody",
      sourceId: "src-ctg-NCT05101317",
      asOf: "2026-01-21",
      derivation:
        "Mapped from the registry intervention description 'HMI-115 is human monoclonal antibody'.",
      limitations: [
        "The description does not name a molecular target. Target is unresolved.",
      ],
      ...review,
    }),
    indicationIds: [],
    developmentStatuses: [
      {
        id: "stage-hmi-115",
        jurisdiction: "registry",
        stage: derived({
          claimId: "claim-hmi-stage",
          field: "asset.developmentStage",
          value: "phase_2",
          sourceId: "src-ctg-NCT05101317",
          asOf: "2026-01-21",
          derivation:
            "Mapped ClinicalTrials.gov phase PHASE2 to phase_2. Overall status is stored separately and is not an efficacy result.",
          limitations: [
            "Taken from NCT05101317 only. Other registry records are not linked.",
          ],
          ...review,
        }),
        statusText: observed({
          claimId: "claim-hmi-status",
          field: "asset.statusText",
          value: "COMPLETED",
          sourceId: "src-ctg-NCT05101317",
          asOf: "2026-01-21",
          limitations: [
            "Registry overall status. Completed does not mean the endpoint was met.",
          ],
          ...review,
        }),
      },
    ],
    interventionClassIds: [],
    sourceIds: ["src-ctg-NCT05101317"],
    limitations: [
      "No intervention class was assigned because the registry text used here does not state a pathway.",
      "Non-hormonal classification was not verified from this record.",
    ],
  },
  {
    id: "asset-dichloroacetate",
    canonicalName: "dichloroacetate",
    aliases: ["DCA"],
    codeNames: [],
    brandNames: [],
    sponsorOrganizationId: "org-edinburgh",
    previousOwnerOrganizationIds: [],
    relationships: [
      {
        id: "rel-dca-sponsor",
        organizationId: "org-edinburgh",
        role: "trial_sponsor",
        relationship: observed({
          claimId: "claim-dca-sponsor",
          field: "asset.trialSponsor",
          value: "University of Edinburgh",
          sourceId: "src-ctg-NCT04046081",
          asOf: "2024-06-13",
          limitations: ["Lead sponsor of NCT04046081."],
          ...review,
        }),
      },
    ],
    indicationIds: [],
    developmentStatuses: [
      {
        id: "stage-dca",
        jurisdiction: "registry",
        stage: derived({
          claimId: "claim-dca-stage",
          field: "asset.developmentStage",
          value: "not_applicable",
          sourceId: "src-ctg-NCT04046081",
          asOf: "2024-06-13",
          derivation:
            "Mapped ClinicalTrials.gov phase NA to not_applicable. This is not a development ranking.",
          limitations: [
            "The registry phase code is NA on a single-arm exploratory study.",
          ],
          ...review,
        }),
        statusText: observed({
          claimId: "claim-dca-status",
          field: "asset.statusText",
          value: "COMPLETED",
          sourceId: "src-ctg-NCT04046081",
          asOf: "2024-06-13",
          limitations: [
            "Registry overall status. The record used here has no posted results section.",
          ],
          ...review,
        }),
      },
    ],
    interventionClassIds: [],
    sourceIds: ["src-ctg-NCT04046081"],
    limitations: [
      "The protocol discusses a lactate hypothesis. That text is not stored as an observed mechanism.",
      "Route, modality, and molecular target are unresolved.",
    ],
  },
  {
    id: "asset-vipoglanstat",
    canonicalName: "vipoglanstat",
    aliases: [],
    codeNames: [],
    brandNames: [],
    sponsorOrganizationId: "org-gesynta",
    previousOwnerOrganizationIds: [],
    relationships: [
      {
        id: "rel-vipoglanstat-sponsor",
        organizationId: "org-gesynta",
        role: "trial_sponsor",
        relationship: observed({
          claimId: "claim-vipoglanstat-sponsor",
          field: "asset.trialSponsor",
          value: "Gesynta Pharma AB",
          sourceId: "src-ctg-NCT07260669",
          asOf: "2026-09-11",
          limitations: ["Lead sponsor of NCT07260669."],
          ...review,
        }),
      },
    ],
    indicationIds: [],
    developmentStatuses: [
      {
        id: "stage-vipoglanstat",
        jurisdiction: "registry",
        stage: derived({
          claimId: "claim-vipoglanstat-stage",
          field: "asset.developmentStage",
          value: "phase_2",
          sourceId: "src-ctg-NCT07260669",
          asOf: "2026-09-11",
          derivation:
            "Mapped ClinicalTrials.gov phase PHASE2 to phase_2. Recruiting status is stored separately.",
          limitations: ["Taken from NCT07260669 only."],
          ...review,
        }),
        statusText: observed({
          claimId: "claim-vipoglanstat-status",
          field: "asset.statusText",
          value: "RECRUITING",
          sourceId: "src-ctg-NCT07260669",
          asOf: "2026-09-11",
          limitations: [
            "Registry overall status on the current snapshot. Not an efficacy result.",
          ],
          ...review,
        }),
      },
    ],
    administrationRoute: observed({
      claimId: "claim-vipoglanstat-route",
      field: "asset.administrationRoute",
      value: "orally",
      sourceId: "src-ctg-NCT07260669",
      asOf: "2026-09-11",
      limitations: [
        "The registry intervention description says capsules are received orally. Mechanism is not stated there.",
      ],
      ...review,
    }),
    interventionClassIds: [],
    sourceIds: ["src-ctg-NCT07260669"],
    limitations: [
      "Mechanism, target, and intervention class are unresolved. The asset is not labeled non-hormonal in this graph.",
    ],
  },
];

const outcomeLimitations = [
  "Responder percentage from the ClinicalTrials.gov results section. Not a trial-success flag.",
  "The registry p-value is an inequality. No confidence interval was stored because this extract did not include one on the analysis object.",
];

function armOutcome(input: {
  id: string;
  endpoint: string;
  arm: string;
  treatment: number;
  comparator: number;
}): ClinicalOutcome {
  const sourceId = "src-ctg-NCT01620528";
  const asOf = "2018-09-18";
  const common = {
    sourceId,
    asOf,
    limitations: outcomeLimitations,
    ...review,
  };
  return {
    id: input.id,
    trialId: "NCT01620528",
    assetId: "asset-elagolix",
    endpointName: observed({
      ...common,
      claimId: `${input.id}:endpoint`,
      field: "outcome.endpointName",
      value: input.endpoint,
    }),
    endpointHierarchy: observed({
      ...common,
      claimId: `${input.id}:hierarchy`,
      field: "outcome.endpointHierarchy",
      value: "primary",
    }),
    timepoint: observed({
      ...common,
      claimId: `${input.id}:timepoint`,
      field: "outcome.timepoint",
      value: "At Month 3 of the Treatment Period",
    }),
    treatmentArm: observed({
      ...common,
      claimId: `${input.id}:arm`,
      field: "outcome.treatmentArm",
      value: input.arm,
    }),
    comparator: observed({
      ...common,
      claimId: `${input.id}:comparator`,
      field: "outcome.comparator",
      value: "Placebo",
    }),
    effectMeasure: observed({
      ...common,
      claimId: `${input.id}:measure`,
      field: "outcome.effectMeasure",
      value: "responder_percentage",
    }),
    treatmentValue: observed({
      ...common,
      claimId: `${input.id}:treatmentValue`,
      field: "outcome.treatmentValue",
      value: input.treatment,
    }),
    comparatorValue: observed({
      ...common,
      claimId: `${input.id}:comparatorValue`,
      field: "outcome.comparatorValue",
      value: input.comparator,
    }),
    unit: observed({
      ...common,
      claimId: `${input.id}:unit`,
      field: "outcome.unit",
      value: "percentage of participants",
    }),
    pValueRaw: observed({
      ...common,
      claimId: `${input.id}:pValue`,
      field: "outcome.pValueRaw",
      value: "< 0.001",
      limitations: [
        ...outcomeLimitations,
        "Stored as the registry string '< 0.001', not as an exact probability.",
      ],
    }),
    responderRate: observed({
      ...common,
      claimId: `${input.id}:responderRate`,
      field: "outcome.responderRate",
      value: input.treatment,
    }),
    limitations: outcomeLimitations,
  };
}

const dys =
  "Percentage of Responders at Month 3 Based on Daily Assessment of Dysmenorrhea (DYS)";
const nmpp =
  "Percentage of Responders at Month 3 Based on Daily Assessment of Non-Menstrual Pelvic Pain (NMPP)";

export const endometriosisOutcomes: ClinicalOutcome[] = [
  armOutcome({
    id: "out-nct01620528-dys-150",
    endpoint: dys,
    arm: "Elagolix 150 mg QD",
    treatment: 46.4,
    comparator: 19.6,
  }),
  armOutcome({
    id: "out-nct01620528-dys-200",
    endpoint: dys,
    arm: "Elagolix 200 mg BID",
    treatment: 75.8,
    comparator: 19.6,
  }),
  armOutcome({
    id: "out-nct01620528-nmpp-150",
    endpoint: nmpp,
    arm: "Elagolix 150 mg QD",
    treatment: 50.4,
    comparator: 36.5,
  }),
  armOutcome({
    id: "out-nct01620528-nmpp-200",
    endpoint: nmpp,
    arm: "Elagolix 200 mg BID",
    treatment: 54.5,
    comparator: 36.5,
  }),
];

export const endometriosisRegulatoryEvents: RegulatoryEvent[] = [
  {
    id: "reg-elagolix-nda-approval",
    assetId: "asset-elagolix",
    jurisdiction: "US",
    regulator: "FDA",
    eventType: observed({
      claimId: "claim-elagolix-event-type",
      field: "regulatory.eventType",
      value: "approval",
      sourceId: "src-fda-orilissa-approval-letter",
      asOf: "2018-07-23",
      eventDate: "2018-07-23",
      geography: US,
      limitations: ["Original NDA approval."],
      ...review,
    }),
    applicationType: observed({
      claimId: "claim-elagolix-application-type",
      field: "regulatory.applicationType",
      value: "NDA",
      sourceId: "src-fda-orilissa-approval-letter",
      asOf: "2018-07-23",
      geography: US,
      limitations: ["Application type stated in the letter."],
      ...review,
    }),
    applicationNumber: observed({
      claimId: "claim-elagolix-application-number",
      field: "regulatory.applicationNumber",
      value: "NDA 210450",
      sourceId: "src-fda-orilissa-approval-letter",
      asOf: "2018-07-23",
      geography: US,
      limitations: ["Application number on the approval letter."],
      ...review,
    }),
    filingDate: observed({
      claimId: "claim-elagolix-filing-date",
      field: "regulatory.filingDate",
      value: "2017-08-23",
      sourceId: "src-fda-orilissa-approval-letter",
      asOf: "2018-07-23",
      eventDate: "2017-08-23",
      geography: US,
      limitations: [
        "The letter says the NDA was dated and received 23 August 2017. That filing date is knowable from the letter's date, not on the filing day from this source alone.",
      ],
      ...review,
    }),
    decisionDate: observed({
      claimId: "claim-elagolix-decision-date",
      field: "regulatory.decisionDate",
      value: "2018-07-23",
      sourceId: "src-fda-orilissa-approval-letter",
      asOf: "2018-07-23",
      eventDate: "2018-07-23",
      geography: US,
      limitations: [
        "Letter date is used as both the action date and this document's publication date. A separate web-posting timestamp was not extracted.",
      ],
      ...review,
    }),
    indicationId: "ind-orilissa-endo-us",
    indicationText: observed({
      claimId: "claim-elagolix-letter-indication",
      field: "regulatory.indicationText",
      value:
        "management of moderate to severe pain associated with endometriosis",
      sourceId: "src-fda-orilissa-approval-letter",
      asOf: "2018-07-23",
      eventDate: "2018-07-23",
      geography: US,
      limitations: ["Indication sentence in the approval letter."],
      ...review,
    }),
    outcome: observed({
      claimId: "claim-elagolix-outcome",
      field: "regulatory.outcome",
      value: "approval",
      sourceId: "src-fda-orilissa-approval-letter",
      asOf: "2018-07-23",
      eventDate: "2018-07-23",
      geography: US,
      limitations: ["The letter states the application is approved."],
      ...review,
    }),
    limitations: [
      "Publication date is the letter date. Draft label PDF timestamps from before approval are not used.",
    ],
  },
  {
    id: "reg-elagolix-s009-letter",
    assetId: "asset-elagolix",
    jurisdiction: "US",
    regulator: "FDA",
    eventType: observed({
      claimId: "claim-elagolix-s009-type",
      field: "regulatory.eventType",
      value: "label_change",
      sourceId: "src-fda-orilissa-s009-letter",
      asOf: "2023-06-06",
      geography: US,
      limitations: [
        "S-009 is a labeling supplement letter. The label text diff is not in this record.",
      ],
      ...review,
    }),
    applicationNumber: observed({
      claimId: "claim-elagolix-s009-number",
      field: "regulatory.applicationNumber",
      value: "NDA 210450/S-009",
      sourceId: "src-fda-orilissa-s009-letter",
      asOf: "2023-06-06",
      geography: US,
      limitations: ["Identified from the supplement letter URL and file."],
      ...review,
    }),
    labelChange: observed({
      claimId: "claim-elagolix-s009-label",
      field: "regulatory.labelChange",
      value: "labeling supplement letter dated by PDF CreationDate 2023-06-06",
      sourceId: "src-fda-orilissa-s009-letter",
      asOf: "2023-06-06",
      geography: US,
      limitations: [
        "Does not restate the 2018 indication and does not replace it automatically.",
      ],
      ...review,
    }),
    outcome: observed({
      claimId: "claim-elagolix-s009-outcome",
      field: "regulatory.outcome",
      value: "approval",
      sourceId: "src-fda-orilissa-s009-letter",
      asOf: "2023-06-06",
      geography: US,
      limitations: [
        "A supplement letter was issued. The clinical meaning of the labeling change is not interpreted here.",
      ],
      ...review,
    }),
    limitations: [
      "openFDA lists submission status date 2023-06-05 for supplement 9. That API snapshot has no publication date and is not used to make the letter knowable on 5 June.",
    ],
  },
  {
    id: "reg-myfembree-endo-press",
    assetId: "asset-relugolix-combination",
    jurisdiction: "US",
    regulator: "FDA",
    eventType: observed({
      claimId: "claim-myfembree-press-type",
      field: "regulatory.eventType",
      value: "approval",
      sourceId: "src-myfembree-press-2022-08-05",
      asOf: "2022-08-05",
      eventDate: "2022-08-05",
      geography: US,
      limitations: [
        "The press release announces an FDA approval. It is not the FDA letter.",
      ],
      ...review,
    }),
    decisionDate: observed({
      claimId: "claim-myfembree-press-decision",
      field: "regulatory.decisionDate",
      value: "2022-08-05",
      sourceId: "src-myfembree-press-2022-08-05",
      asOf: "2022-08-05",
      eventDate: "2022-08-05",
      geography: US,
      limitations: [
        "Sponsor announcement date. The letter PDF used here was created on 2022-08-08.",
      ],
      ...review,
    }),
    indicationId: "ind-myfembree-endo-us",
    indicationText: observed({
      claimId: "claim-myfembree-press-indication-event",
      field: "regulatory.indicationText",
      value:
        "management of moderate to severe pain associated with endometriosis in pre-menopausal women, with a treatment duration of up to 24 months",
      sourceId: "src-myfembree-press-2022-08-05",
      asOf: "2022-08-05",
      eventDate: "2022-08-05",
      geography: US,
      limitations: [
        "Press wording, including the stated duration limit. Not an adherence rate.",
      ],
      ...review,
    }),
    outcome: observed({
      claimId: "claim-myfembree-press-outcome",
      field: "regulatory.outcome",
      value: "approval",
      sourceId: "src-myfembree-press-2022-08-05",
      asOf: "2022-08-05",
      eventDate: "2022-08-05",
      geography: US,
      limitations: ["Announcement of approval, not the approval letter."],
      ...review,
    }),
    limitations: [
      "A snapshot on 2022-08-05 can use this press release and cannot use the letter file dated 2022-08-08.",
    ],
  },
  {
    id: "reg-myfembree-endo-letter",
    assetId: "asset-relugolix-combination",
    jurisdiction: "US",
    regulator: "FDA",
    eventType: observed({
      claimId: "claim-myfembree-letter-type",
      field: "regulatory.eventType",
      value: "supplement_approval",
      sourceId: "src-fda-myfembree-s002-letter",
      asOf: "2022-08-08",
      geography: US,
      limitations: ["Prior-approval supplement letter."],
      ...review,
    }),
    applicationType: observed({
      claimId: "claim-myfembree-letter-app-type",
      field: "regulatory.applicationType",
      value: "sNDA",
      sourceId: "src-fda-myfembree-s002-letter",
      asOf: "2022-08-08",
      geography: US,
      limitations: [
        "The letter calls the filing a supplemental new drug application.",
      ],
      ...review,
    }),
    applicationNumber: observed({
      claimId: "claim-myfembree-letter-number",
      field: "regulatory.applicationNumber",
      value: "NDA 214846/S-002",
      sourceId: "src-fda-myfembree-s002-letter",
      asOf: "2022-08-08",
      geography: US,
      limitations: ["Application number on the supplement letter."],
      ...review,
    }),
    filingDate: observed({
      claimId: "claim-myfembree-filing",
      field: "regulatory.filingDate",
      value: "2021-07-06",
      sourceId: "src-fda-myfembree-s002-letter",
      asOf: "2022-08-08",
      eventDate: "2021-07-06",
      geography: US,
      limitations: [
        "The letter says the sNDA was dated 6 July 2021. This source's document date is 8 August 2022.",
      ],
      ...review,
    }),
    indicationText: observed({
      claimId: "claim-myfembree-letter-indication",
      field: "regulatory.indicationText",
      value:
        "expand the use for the management of moderate to severe pain associated with endometriosis",
      sourceId: "src-fda-myfembree-s002-letter",
      asOf: "2022-08-08",
      geography: US,
      limitations: [
        "Wording from the supplement letter, not the press release.",
      ],
      ...review,
    }),
    outcome: observed({
      claimId: "claim-myfembree-letter-outcome",
      field: "regulatory.outcome",
      value: "approval",
      sourceId: "src-fda-myfembree-s002-letter",
      asOf: "2022-08-08",
      geography: US,
      limitations: [
        "The letter says the supplement is approved. Its PDF creation date is later than the press announcement.",
      ],
      ...review,
    }),
    limitations: [
      "Document date is the PDF CreationDate 2022-08-08. The openFDA status date 2022-08-05 is not the publication date of this file.",
    ],
  },
  {
    id: "reg-myfembree-fibroids-press",
    assetId: "asset-relugolix-combination",
    jurisdiction: "US",
    regulator: "FDA",
    eventType: observed({
      claimId: "claim-myfembree-fibroid-type",
      field: "regulatory.eventType",
      value: "approval",
      sourceId: "src-myfembree-press-2022-08-05",
      asOf: "2022-08-05",
      geography: US,
      limitations: [
        "The 2022 endometriosis press release also says the product is approved for heavy menstrual bleeding associated with uterine fibroids. It does not date that earlier action.",
      ],
      ...review,
    }),
    indicationText: observed({
      claimId: "claim-myfembree-fibroid-indication",
      field: "regulatory.indicationText",
      value:
        "heavy menstrual bleeding associated with uterine fibroids in pre-menopausal women",
      sourceId: "src-myfembree-press-2022-08-05",
      asOf: "2022-08-05",
      geography: US,
      limitations: [
        "Knowable from the 5 August 2022 press release. Not back-dated to the original approval day.",
      ],
      ...review,
    }),
    outcome: observed({
      claimId: "claim-myfembree-fibroid-outcome",
      field: "regulatory.outcome",
      value: "approval",
      sourceId: "src-myfembree-press-2022-08-05",
      asOf: "2022-08-05",
      geography: US,
      limitations: [
        "States that a fibroid indication exists as of the press date. The 2021 letter body was not transcribed.",
      ],
      ...review,
    }),
    limitations: [
      "openFDA reports original approval status date 2021-05-26. That API payload has no publication date and is not used as 2021 evidence.",
    ],
  },
];

export const endometriosisCatalysts: Catalyst[] = [
  {
    id: "cat-elagolix-approval",
    assetId: "asset-elagolix",
    catalystType: "regulatory_decision",
    relatedRegulatoryEventId: "reg-elagolix-nda-approval",
    questionResolved:
      "Whether FDA approved elagolix for moderate to severe pain associated with endometriosis",
    status: "occurred",
    date: {
      ...observed({
        claimId: "claim-cat-elagolix-date",
        field: "catalyst.date",
        value: "2018-07-23",
        sourceId: "src-fda-orilissa-approval-letter",
        asOf: "2018-07-23",
        eventDate: "2018-07-23",
        limitations: ["Document date of the approval letter."],
        ...review,
      }),
      role: "actual",
      certainty: "document_date",
    },
    limitations: ["Not a forecast and not a price catalyst."],
  },
  {
    id: "cat-myfembree-endo-approval",
    assetId: "asset-relugolix-combination",
    catalystType: "regulatory_decision",
    relatedRegulatoryEventId: "reg-myfembree-endo-press",
    questionResolved:
      "Whether FDA approved MYFEMBREE for endometriosis-associated pain",
    status: "occurred",
    date: {
      ...observed({
        claimId: "claim-cat-myfembree-date",
        field: "catalyst.date",
        value: "2022-08-05",
        sourceId: "src-myfembree-press-2022-08-05",
        asOf: "2022-08-05",
        eventDate: "2022-08-05",
        limitations: [
          "Sponsor announcement date. Not the letter PDF creation date.",
        ],
        ...review,
      }),
      role: "actual",
      certainty: "sponsor_announced",
    },
    limitations: [
      "The FDA letter file is a separate source and is not knowable on this date from its document timestamp.",
    ],
  },
  {
    id: "cat-linzagolix-eu-endo",
    assetId: "asset-linzagolix",
    catalystType: "regulatory_decision",
    questionResolved:
      "Whether an EU marketing authorisation covered symptomatic endometriosis treatment with linzagolix",
    status: "occurred",
    date: {
      ...observed({
        claimId: "claim-cat-linzagolix-date",
        field: "catalyst.date",
        value: "2024-11-22",
        sourceId: "src-gba-linzagolix-2025-06-05",
        asOf: "2025-06-05",
        eventDate: "2024-11-22",
        limitations: [
          "The date value is the authorisation date cited in a later resolution. The resolution date is the publication date.",
        ],
        ...review,
      }),
      role: "actual",
      certainty: "document_date",
    },
    limitations: [
      "A December 2024 sponsor announcement describes the timing differently and is kept as an unresolved conflict.",
    ],
  },
  {
    id: "cat-vipoglanstat-primary-completion",
    assetId: "asset-vipoglanstat",
    catalystType: "trial_readout",
    relatedTrialId: "NCT07260669",
    questionResolved:
      "Whether the NOVA trial meets its non-menstrual pelvic pain responder criterion",
    status: "expected",
    date: {
      ...observed({
        claimId: "claim-cat-vipoglanstat-date",
        field: "catalyst.date",
        value: "2027-06",
        sourceId: "src-ctg-NCT07260669",
        asOf: "2026-09-11",
        limitations: [
          "Registry primary completion date is an estimate. It is not a factual readout date.",
        ],
        ...review,
      }),
      role: "expected",
      certainty: "registry_estimated",
    },
    limitations: [
      "No analyst-estimated date is stored. The question is not resolved.",
    ],
  },
];

export const endometriosisCommercial: CommercialEvidence[] = [
  {
    id: "comm-endo-icd10-n80",
    subjectId: "disease-endometriosis",
    category: "coding",
    metric: observed({
      claimId: "claim-comm-n80-metric",
      field: "commercial.metric",
      value: "icd10_code",
      sourceId: "src-who-icd10-n80",
      asOf: RETRIEVED,
      limitations: [
        "A classification code is not utilization, price, or diagnosis rate.",
      ],
      ...review,
    }),
    value: observed({
      claimId: "claim-comm-n80-value",
      field: "commercial.value",
      value: "N80",
      sourceId: "src-who-icd10-n80",
      asOf: RETRIEVED,
      limitations: [
        "ICD-10 code N80. The browser publication date was not captured.",
      ],
      ...review,
    }),
    limitations: [
      "No price, market share, uptake, adherence, or coverage rate is recorded.",
    ],
  },
];

export const endometriosisConflicts: EvidenceConflict[] = [
  {
    id: "conflict-linzagolix-endo-timing",
    subject: { kind: "asset", id: "asset-linzagolix" },
    field: "endometriosis_indication.timing",
    competingObservations: [
      {
        id: "obs-linzagolix-timing-press",
        value: "December 2024",
        sourceId: "src-theramex-yselty-2024-12-20",
        evidenceKind: "observed",
      },
      {
        id: "obs-linzagolix-timing-gba",
        value: "2024-11-22",
        sourceId: "src-gba-linzagolix-2025-06-05",
        evidenceKind: "observed",
      },
    ],
    reason: "different_values",
    resolutionStatus: "unresolved",
    reviewerNote:
      "The sponsor announcement describes a December 2024 extension. The G-BA resolution cites a 22 November 2024 marketing authorisation. These may be an announcement date and an authorisation date. No precedence rule is applied.",
  },
  {
    id: "conflict-myfembree-sponsor-name",
    subject: { kind: "asset", id: "asset-relugolix-combination" },
    field: "application.sponsor_name",
    competingObservations: [
      {
        id: "obs-myfembree-sponsor-letter",
        value: "Myovant Sciences GmbH",
        sourceId: "src-fda-myfembree-s002-letter",
        evidenceKind: "observed",
      },
      {
        id: "obs-myfembree-sponsor-openfda",
        value: "SUMITOMO PHARMA AM",
        sourceId: "src-openfda-nda214846",
        evidenceKind: "observed",
      },
    ],
    reason: "different_values",
    resolutionStatus: "unresolved",
    reviewerNote:
      "The 2022 letter is addressed to Myovant Sciences GmbH. The openFDA record retrieved in 2026 lists sponsor_name SUMITOMO PHARMA AM. The API snapshot has no publication date and must not be written back onto 2022.",
  },
  {
    id: "conflict-linzagolix-us-status",
    subject: { kind: "asset", id: "asset-linzagolix" },
    field: "developmentStage.us",
    competingObservations: [
      {
        id: "obs-linzagolix-eu-approved",
        value: "approved",
        sourceId: "src-gba-linzagolix-2025-06-05",
        evidenceKind: "observed",
      },
    ],
    gap:
      "No FDA approval letter or openFDA application for linzagolix was included. US development stage is unresolved.",
    reason: "missing_primary_confirmation",
    resolutionStatus: "unresolved",
    reviewerNote:
      "The EU approval does not establish US status. Absence from this graph is not itself an FDA rejection.",
  },
  {
    id: "conflict-elagolix-label-supersession",
    subject: { kind: "asset", id: "asset-elagolix" },
    field: "us_label.version",
    competingObservations: [
      {
        id: "obs-elagolix-label-2018",
        value: "NDA 210450 approval letter 2018-07-23",
        sourceId: "src-fda-orilissa-approval-letter",
        evidenceKind: "observed",
      },
      {
        id: "obs-elagolix-label-s009",
        value: "NDA 210450/S-009 labeling supplement letter 2023-06-06",
        sourceId: "src-fda-orilissa-s009-letter",
        evidenceKind: "observed",
      },
    ],
    reason: "stale_superseded",
    resolutionStatus: "unresolved",
    reviewerNote:
      "A later labeling supplement exists. This graph does not diff the label and does not discard the 2018 approval.",
  },
];

export const endometriosisTheses: InvestmentThesis[] = [
  {
    id: "thesis-endo-oral-gnrh-2026",
    layer: "analyst_assumption",
    question:
      "What is publicly sourceable about oral GnRH-antagonist options for endometriosis-associated pain, and which commercial parameters remain unknown?",
    diseaseId: "disease-endometriosis",
    assetIds: [
      "asset-elagolix",
      "asset-relugolix-combination",
      "asset-linzagolix",
    ],
    supportingEvidenceClaimIds: [
      "claim-elagolix-decision-date",
      "claim-myfembree-press-indication",
      "out-nct01620528-dys-150:treatmentValue",
    ],
    contradictingEvidenceClaimIds: [
      "claim-myfembree-press-indication-event",
    ],
    unknowns: [
      "No price, net revenue, market share, diagnosis rate, or adherence rate is in the evidence layer.",
      "Eligible and treated population counts are not estimated.",
      "US regulatory status for linzagolix is unresolved.",
      "HMI-115 molecular target and dichloroacetate mechanism are unresolved.",
      "Registry status COMPLETED is not evidence that a trial met its endpoint.",
    ],
    assumptions: [
      {
        id: "assumption-duration-limits-not-uptake",
        kind: "assumption",
        statement:
          "Label duration limits may constrain chronic use relative to an unlabeled long-term scenario. No uptake percentage is implied.",
        rationale:
          "Duration language appears in product sources. Turning that language into an adoption rate would be an analyst assumption, so no rate is stored.",
        reviewedBy: REVIEWER,
        reviewedAt: RETRIEVED,
      },
    ],
    catalystIds: [
      "cat-elagolix-approval",
      "cat-myfembree-endo-approval",
      "cat-linzagolix-eu-endo",
      "cat-vipoglanstat-primary-completion",
    ],
    killCriteria: [
      "Do not treat ClinicalTrials.gov status COMPLETED as clinical success.",
      "Do not convert an assumption into an evidence observation.",
      "Do not score a buy, sell, or invest recommendation from this thesis.",
    ],
    lastReviewed: RETRIEVED,
    reviewedBy: REVIEWER,
  },
];
