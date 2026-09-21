/**
 * ClinicalTrials.gov sponsor presets for domestic research hubs.
 * Used by the live trial search panel — separate from Postgres `study_trial_links`.
 */

export interface InstitutionTrialPreset {
  id: string;
  label: string;
  sponsor?: string;
  condition: string;
  description: string;
}

export const DOMESTIC_TRIAL_PRESETS: readonly InstitutionTrialPreset[] = [
  {
    id: "nih-cancer",
    label: "NIH Cancer (NCI)",
    sponsor: "National Cancer Institute",
    condition: "breast ovarian cervical endometrial BRCA cancer",
    description:
      "NCI trials — breast and gynecologic oncology, hereditary cancer, genomic screening",
  },
  {
    id: "breast-gyn-oncology",
    label: "Breast & Gyn Oncology",
    condition: "breast ovarian cervical endometrial BRCA cancer",
    description:
      "Broad oncology scan — breast, ovarian, cervical, and endometrial cancer plus hereditary risk",
  },
  {
    id: "pelvic-pain-endometriosis",
    label: "Pelvic Pain & Endometriosis",
    condition: "endometriosis pelvic pain adenomyosis uterine fibroids",
    description:
      "Live pelvic health scan — endometriosis, adenomyosis, chronic pelvic pain, and fibroids",
  },
  {
    id: "uterine-fibroids",
    label: "Uterine Fibroids",
    condition: "uterine fibroids leiomyoma heavy menstrual bleeding",
    description:
      "Fibroid care trials — uterine fibroids, leiomyoma, and heavy menstrual bleeding",
  },
  {
    id: "infertility-ivf",
    label: "Infertility & IVF",
    condition: "infertility IVF assisted reproduction ovulation",
    description:
      "Fertility treatment trials — infertility, IVF, assisted reproduction, and ovulation support",
  },
  {
    id: "contraception-family-planning",
    label: "Contraception & Family Planning",
    condition: "contraception contraceptive IUD family planning",
    description:
      "Family planning trials — contraception, contraceptive devices, IUDs, and reproductive planning",
  },
  {
    id: "maternal-health",
    label: "Maternal Health",
    condition:
      "maternal mortality morbidity preeclampsia gestational hypertension",
    description:
      "Maternal health scan — maternal mortality and morbidity, hypertensive disorders, and gestational complications",
  },
  {
    id: "pregnancy-postpartum",
    label: "Pregnancy & Postpartum",
    condition: "pregnancy prenatal postpartum preterm birth delivery recovery",
    description:
      "Pregnancy and postpartum trials — prenatal care, preterm birth, delivery, and postpartum recovery",
  },
  {
    id: "perinatal-mental-health",
    label: "Perinatal Mental Health",
    condition:
      "postpartum depression perinatal depression maternal mental health anxiety",
    description:
      "Perinatal mental health trials — postpartum depression, perinatal depression, anxiety, and maternal behavioral health",
  },
  {
    id: "nih-scd",
    label: "NIH Sickle Cell",
    sponsor: "National Heart, Lung, and Blood Institute",
    condition: "sickle cell anemia hemoglobinopathy",
    description: "NHLBI sickle cell disease and gene therapy trials",
  },
  {
    id: "grail-mced",
    label: "GRAIL Galleri MCED",
    sponsor: "GRAIL",
    condition: "multi-cancer early detection Galleri PATHFINDER",
    description:
      "GRAIL-sponsored MCED studies behind the 23 Sep 2026 Galleri advisory committee — live registry search, not a verified-deal name scrape",
  },
  {
    id: "nci-her2-pertuzumab",
    label: "NCI HER2 / pertuzumab",
    sponsor: "National Cancer Institute",
    condition: "HER2 pertuzumab trastuzumab MATCH",
    description:
      "NCI-sponsored HER2 / pertuzumab trials (including MATCH subprotocol J). NIH piece adjacent to this week's Pebrilzo CHMP — not the biosimilar dossier",
  },
  {
    id: "platinum-resistant-ovarian",
    label: "Platinum-resistant ovarian",
    condition: "platinum-resistant ovarian relacorilant senaparib PARP",
    description:
      "Live scan for platinum-resistant and maintenance ovarian programs — research enrichment for this week's CHMP ovarian opinions",
  },
] as const;
