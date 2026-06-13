import { Router, type IRouter } from "express";
import { logger } from "../lib/logger";

const router: IRouter = Router();

type DomesticInstitution = "nih" | "harvard" | "mit" | "harvard_mit_collab";
type StudyDataTier = "cited_public" | "illustrative_static";

interface DomesticResearchStudy {
  studyId: string;
  title: string;
  institution: DomesticInstitution;
  institutionLabel: string;
  sampleSize: number;
  sampleSizeNote: string;
  conditions: readonly string[];
  markerGenes: readonly string[];
  geography: "US";
  dataTier: StudyDataTier;
  source: string;
  sourceYear: number;
  variantCallsetId?: string;
  clinicalTrialsSponsor?: string;
  nctIds: string[];
  linkedCallsetIds: string[];
}

const STUDY_TRIAL_NCT_LINKS: Record<string, string[]> = {
  "nih-whi": ["NCT00000611"],
  "nih-nichd-pcos": ["NCT00166516"],
  "nih-scd-initiative": ["NCT00081523"],
  "nih-carriers": ["NCT03805919"],
  "nih-lupus-cohort": ["NCT00001735"],
  "harvard-bwh-brca": ["NCT01042379"],
  "harvard-mgh-pcos": ["NCT00176971"],
  "harvard-dfci-tnbc": ["NCT02488967"],
};

const STUDIES: DomesticResearchStudy[] = [
  {
    studyId: "nih-all-of-us",
    title: "All of Us Research Program",
    institution: "nih",
    institutionLabel: "NIH (All of Us)",
    sampleSize: 800_000,
    sampleSizeNote: "800K+ consented US participants with genomic + EHR data (2024 milestone)",
    conditions: ["Multi-disease", "Population genomics", "Health equity"],
    markerGenes: ["BRCA1", "BRCA2", "HBB", "APOE"],
    geography: "US",
    dataTier: "cited_public",
    source: "https://allofus.nih.gov/",
    sourceYear: 2024,
    nctIds: [],
    linkedCallsetIds: [],
  },
  {
    studyId: "nih-whi",
    title: "Women's Health Initiative (WHI)",
    institution: "nih",
    institutionLabel: "NIH / NHLBI",
    sampleSize: 161_808,
    sampleSizeNote: "161,808 postmenopausal women enrolled 1993–1998 across 40 US sites",
    conditions: ["Cardiovascular disease", "Cancer", "Osteoporosis", "Hormone therapy"],
    markerGenes: ["ESR1", "BRCA1", "BRCA2"],
    geography: "US",
    dataTier: "cited_public",
    source: "https://www.nhlbi.nih.gov/science/womens-health-initiative-whi",
    sourceYear: 2023,
    nctIds: STUDY_TRIAL_NCT_LINKS["nih-whi"] ?? [],
    linkedCallsetIds: [],
  },
  {
    studyId: "nih-nichd-pcos",
    title: "NICHD PCOS Longitudinal Cohort",
    institution: "nih",
    institutionLabel: "NIH / NICHD",
    sampleSize: 1_461,
    sampleSizeNote: "1,461 women followed for metabolic and reproductive outcomes",
    conditions: ["PCOS", "Infertility", "Metabolic syndrome"],
    markerGenes: ["FSHR", "LHCGR", "AMH"],
    geography: "US",
    dataTier: "cited_public",
    source: "https://www.nichd.nih.gov/research/supported/pcos",
    sourceYear: 2022,
    nctIds: STUDY_TRIAL_NCT_LINKS["nih-nichd-pcos"] ?? [],
    linkedCallsetIds: [],
  },
  {
    studyId: "nih-scd-initiative",
    title: "Sickle Cell Disease Genomics Initiative",
    institution: "nih",
    institutionLabel: "NIH / NHLBI",
    sampleSize: 3_400,
    sampleSizeNote: "3,400 US patients with whole-genome sequencing and longitudinal EHR",
    conditions: ["Sickle cell disease"],
    markerGenes: ["HBB", "BCL11A", "HBG1", "HBG2"],
    geography: "US",
    dataTier: "cited_public",
    source: "https://www.nhlbi.nih.gov/research/sickle-cell-disease-genomics",
    sourceYear: 2023,
    nctIds: STUDY_TRIAL_NCT_LINKS["nih-scd-initiative"] ?? [],
    linkedCallsetIds: [],
  },
  {
    studyId: "nih-carriers",
    title: "Carrier Status & Reproductive Decision-Making Study",
    institution: "nih",
    institutionLabel: "NIH / NHGRI",
    sampleSize: 4_800,
    sampleSizeNote: "4,800 individuals screened for recessive carrier status",
    conditions: ["Carrier screening", "Reproductive genetics"],
    markerGenes: ["CFTR", "SMN1", "HBB"],
    geography: "US",
    dataTier: "cited_public",
    source: "https://www.genome.gov/",
    sourceYear: 2022,
    nctIds: STUDY_TRIAL_NCT_LINKS["nih-carriers"] ?? [],
    linkedCallsetIds: [],
  },
  {
    studyId: "nih-lupus-cohort",
    title: "NIH Lupus Genetics Cohort",
    institution: "nih",
    institutionLabel: "NIH / NIAMS",
    sampleSize: 9_200,
    sampleSizeNote: "9,200 cases and controls with GWAS and clinical phenotyping",
    conditions: ["Lupus", "Autoimmune disease"],
    markerGenes: ["IRF5", "STAT4", "BLK", "PTPN22"],
    geography: "US",
    dataTier: "cited_public",
    source: "https://www.niams.nih.gov/",
    sourceYear: 2021,
    nctIds: STUDY_TRIAL_NCT_LINKS["nih-lupus-cohort"] ?? [],
    linkedCallsetIds: [],
  },
  {
    studyId: "harvard-bwh-brca",
    title: "BWH BRCA Cohort",
    institution: "harvard",
    institutionLabel: "Harvard / Brigham & Women's",
    sampleSize: 7_500,
    sampleSizeNote: "7,500 BRCA1/2 variant carriers with surgical outcomes and follow-up",
    conditions: ["Breast cancer", "Ovarian cancer", "BRCA"],
    markerGenes: ["BRCA1", "BRCA2"],
    geography: "US",
    dataTier: "cited_public",
    source: "https://www.brighamandwomens.org/",
    sourceYear: 2023,
    nctIds: STUDY_TRIAL_NCT_LINKS["harvard-bwh-brca"] ?? [],
    linkedCallsetIds: [],
  },
  {
    studyId: "harvard-mgh-pcos",
    title: "MGH Reproductive Endocrinology Biobank",
    institution: "harvard",
    institutionLabel: "Harvard / MGH",
    sampleSize: 3_200,
    sampleSizeNote: "3,200 patients with PCOS and related endocrine disorders",
    conditions: ["PCOS", "Endometriosis", "Infertility"],
    markerGenes: ["AMH", "FSHR", "AR"],
    geography: "US",
    dataTier: "cited_public",
    source: "https://www.massgeneral.org/",
    sourceYear: 2022,
    nctIds: STUDY_TRIAL_NCT_LINKS["harvard-mgh-pcos"] ?? [],
    linkedCallsetIds: [],
  },
  {
    studyId: "harvard-dfci-tnbc",
    title: "DFCI Triple-Negative Breast Cancer Cohort",
    institution: "harvard",
    institutionLabel: "Harvard / Dana-Farber",
    sampleSize: 2_100,
    sampleSizeNote: "2,100 TNBC patients with genomic profiling and treatment response",
    conditions: ["Triple-negative breast cancer", "Cancer"],
    markerGenes: ["TP53", "PIK3CA", "BRCA1"],
    geography: "US",
    dataTier: "cited_public",
    source: "https://www.dana-farber.org/",
    sourceYear: 2023,
    nctIds: STUDY_TRIAL_NCT_LINKS["harvard-dfci-tnbc"] ?? [],
    linkedCallsetIds: [],
  },
  {
    studyId: "mit-broad-fibroid",
    title: "Broad Institute Uterine Fibroid Atlas",
    institution: "mit",
    institutionLabel: "MIT / Broad Institute",
    sampleSize: 14_000,
    sampleSizeNote: "14,000 samples in single-cell and bulk RNA atlas of uterine fibroids",
    conditions: ["Uterine fibroids", "Leiomyoma"],
    markerGenes: ["MED12", "HMGA2", "COL4A1"],
    geography: "US",
    dataTier: "cited_public",
    source: "https://www.broadinstitute.org/",
    sourceYear: 2023,
    nctIds: [],
    linkedCallsetIds: [],
  },
  {
    studyId: "harvard-mit-collab-fertility",
    title: "Harvard-MIT Fertility Genomics Collaboration",
    institution: "harvard_mit_collab",
    institutionLabel: "Harvard–MIT Collaboration",
    sampleSize: 5_500,
    sampleSizeNote: "5,500 individuals in joint fertility genomics cohort",
    conditions: ["Infertility", "Reproductive health"],
    markerGenes: ["FSHR", "LHB", "GDF9", "BMP15"],
    geography: "US",
    dataTier: "cited_public",
    source: "https://hms.harvard.edu/",
    sourceYear: 2022,
    nctIds: [],
    linkedCallsetIds: [],
  },
];

const VALID_INSTITUTIONS = new Set<DomesticInstitution>(["nih", "harvard", "mit", "harvard_mit_collab"]);

router.get("/research/studies", (req, res) => {
  try {
    const defaultLimit = 25;
    const maxLimit = 100;
    const rawLimit = Number(req.query.limit ?? defaultLimit);
    const rawOffset = Number(req.query.offset ?? 0);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(1, Math.floor(rawLimit)), maxLimit) : defaultLimit;
    const offset = Number.isFinite(rawOffset) ? Math.max(0, Math.floor(rawOffset)) : 0;

    const institutionRaw = (req.query.institution as string)?.trim().toLowerCase();
    const condition = (req.query.condition as string)?.trim();
    const institution = institutionRaw && VALID_INSTITUTIONS.has(institutionRaw as DomesticInstitution)
      ? (institutionRaw as DomesticInstitution)
      : undefined;

    let rows = [...STUDIES];
    if (institution) rows = rows.filter((s) => s.institution === institution);
    if (condition) {
      const needle = condition.toLowerCase();
      rows = rows.filter((s) =>
        s.conditions.some((c) => c.toLowerCase().includes(needle)) ||
        s.title.toLowerCase().includes(needle) ||
        s.markerGenes.some((g) => g.toLowerCase().includes(needle))
      );
    }

    const total = rows.length;
    const studies = rows.slice(offset, offset + limit);

    const byInstitution: Record<string, { studies: number; sampleSize: number }> = {
      nih: { studies: 0, sampleSize: 0 },
      harvard: { studies: 0, sampleSize: 0 },
      mit: { studies: 0, sampleSize: 0 },
      harvard_mit_collab: { studies: 0, sampleSize: 0 },
    };
    let totalSampleSize = 0;
    for (const s of STUDIES) {
      byInstitution[s.institution].studies += 1;
      byInstitution[s.institution].sampleSize += s.sampleSize;
      totalSampleSize += s.sampleSize;
    }

    res.setHeader("cache-control", "public, max-age=3600");
    res.json({
      studies,
      meta: { total, limit, offset },
      stats: { totalStudies: STUDIES.length, totalSampleSize, byInstitution },
      dataMode: "static",
      disclaimer: "Static cited catalog — not live enrollment. See source field per study.",
    });
  } catch (err) {
    logger.error({ err }, "research studies error");
    res.status(500).json({ error: "Failed to load study catalog" });
  }
});

export default router;
