"""
Disease Configuration Module
Maps immunologies to relevant companies, tickers, clinical trial search terms,
and epidemiological data sources for multi-disease convertability.
"""

from typing import Dict, List, Any

class DiseaseConfig:
    """Configuration for all supported immunology diseases"""
    
    DISEASES = {
        "Sickle Cell Disease": {
            "code": "SCD",
            "search_terms": ["sickle cell disease", "sickle cell anemia", "hemoglobin S"],
            "companies": {
                "Global Blood Therapeutics": "GBT",
                "Bluebird Bio": "BLUE",
                "CRISPR Therapeutics": "CRSP",
                "Vertex Pharmaceuticals": "VRTX",
                "Novartis": "NVS",
                "Editas Medicine": "EDIT",
                "Pfizer": "PFE",
                "Bristol Myers Squibb": "BMY",
                "Emmaus Life Sciences": "EMMS",
                "Sangamo Therapeutics": "SGMO"
            },
            "prevalence_us": 118000,
            "prevalence_growth_rate": 0.021,
            "active_trials_estimate": 105,
            "pipeline_focus": [
                "Gene Editing: CRISPR-Cas9 therapies (CTX001, EDIT-301)",
                "Gene Therapy: LentiGlobin for severe SCD",
                "Novel Mechanisms: P-selectin inhibitors (crizanlizumab)",
                "Small Molecules: Hemoglobin polymerization inhibitors (voxelotor)",
                "Allogeneic Stem Cell: Exa-cel gene-edited therapy"
            ],
            "key_metrics": {
                "births_per_1000": 1.5,
                "fda_approvals_2019_2024": 4,
                "avg_trial_success_rate": 0.65
            }
        },
        
        "Systemic Lupus Erythematosus": {
            "code": "SLE",
            "search_terms": ["systemic lupus erythematosus", "lupus", "SLE"],
            "companies": {
                "GSK": "GSK",
                "AstraZeneca": "AZN",
                "Eli Lilly": "LLY",
                "Bristol Myers Squibb": "BMY",
                "Roche": "ROG.SW",
                "Biogen": "BIIB",
                "Johnson & Johnson": "JNJ",
                "UCB": "UCB.BR",
                "Immunovant": "IMVT",
                "Cabaletta Bio": "CABA"
            },
            "prevalence_us": 200000,
            "prevalence_growth_rate": 0.015,
            "active_trials_estimate": 140,
            "pipeline_focus": [
                "B-cell Therapies: Anti-CD20, CD19 CAR-T (Cabaletta)",
                "Type I IFN Inhibitors: Anifrolumab (AstraZeneca)",
                "BTK Inhibitors: Evobrutinib, remibrutinib trials",
                "JAK Inhibitors: Baricitinib expansion studies",
                "T-cell Modulators: Daxdilimab (Horizon)",
                "Complement Inhibitors: Ravulizumab, pegcetacoplan"
            ],
            "key_metrics": {
                "females_affected_ratio": 0.90,
                "fda_approvals_2019_2024": 3,
                "avg_trial_success_rate": 0.58
            }
        },
        
        "Hidradenitis Suppurativa": {
            "code": "HS",
            "search_terms": ["hidradenitis suppurativa", "acne inversa", "HS"],
            "companies": {
                "AbbVie": "ABBV",
                "Novartis": "NVS",
                "Eli Lilly": "LLY",
                "UCB": "UCB.BR",
                "Janssen": "JNJ",
                "Dermavant": "DRMT",  # Private, via IPO potential
                "MoonLake Immunotherapeutics": "MLTX",
                "Incyte": "INCY",
                "Arena Pharmaceuticals": "ARNA",  # Acquired by Pfizer, track PFE
                "Corvus Pharmaceuticals": "CRVS"
            },
            "prevalence_us": 150000,
            "prevalence_growth_rate": 0.025,
            "active_trials_estimate": 65,
            "pipeline_focus": [
                "TNF Inhibitors: Adalimumab (Humira) biosimilars",
                "IL-17 Inhibitors: Secukinumab, ixekizumab trials",
                "IL-23 Inhibitors: Risankizumab (Skyrizi) expansion",
                "IL-1 Pathway: Bermekimab (Janssen)",
                "JAK Inhibitors: Upadacitinib, ritlecitinib",
                "IL-36 Pathway: Spesolimab (Novartis)"
            ],
            "key_metrics": {
                "diagnosis_rate_improving": 0.35,
                "fda_approvals_2019_2024": 2,
                "avg_trial_success_rate": 0.62
            }
        },
        
        "Diabetic Nephropathy": {
            "code": "DN",
            "search_terms": ["diabetic nephropathy", "diabetic kidney disease", "DKD"],
            "companies": {
                "Eli Lilly": "LLY",
                "Novo Nordisk": "NVO",
                "Johnson & Johnson": "JNJ",
                "Boehringer Ingelheim": "BI",  # Private, track partner LLY
                "AstraZeneca": "AZN",
                "FibroGen": "FGEN",
                "AstraZeneca": "AZN",
                "Travere Therapeutics": "TVTX",
                "Chinook Therapeutics": "KDNY",  # Acquired by Novartis
                "Vertex Pharmaceuticals": "VRTX"
            },
            "prevalence_us": 25000000,  # Total diabetes with ~40% developing DN
            "prevalence_growth_rate": 0.035,
            "active_trials_estimate": 180,
            "pipeline_focus": [
                "SGLT2 Inhibitors: Farxiga, Jardiance renal outcomes",
                "GLP-1 Agonists: Ozempic, Trulicity kidney benefits",
                "Endothelin Antagonists: Atrasentan (Chinook/Novartis)",
                "Anti-inflammatory: Bardoxolone methyl (Reata/J&J)",
                "Anti-TGF-beta: Pirfenidone combinations",
                "Stem Cell Therapies: Mesenchymal stem cells"
            ],
            "key_metrics": {
                "of_diabetes_patients": 0.40,
                "fda_approvals_2019_2024": 5,
                "avg_trial_success_rate": 0.70
            }
        },
        
        "Autoimmune Liver Diseases": {
            "code": "ALD",
            "search_terms": ["primary biliary cholangitis", "autoimmune hepatitis", "PBC", "AIH", "autoimmune liver"],
            "companies": {
                "Intercept Pharmaceuticals": "ICPT",
                "Calliditas Therapeutics": "CALT",
                "GSK": "GSK",
                "Novartis": "NVS",
                "Genfit": "GNFT",
                "CymaBay Therapeutics": "CBAY",
                "High Tide Therapeutics": "HDT",  # Private, IPO watch
                "Pliant Therapeutics": "PLRX",
                "Madrigal Pharmaceuticals": "MDGL",
                "Viking Therapeutics": "VKTX"
            },
            "prevalence_us": 120000,  # PBC + AIH combined
            "prevalence_growth_rate": 0.018,
            "active_trials_estimate": 85,
            "pipeline_focus": [
                "FXR Agonists: Obeticholic acid (Intercept), seladelpar",
                "PPAR Agonists: Elafibranor (Genfit/Ipsen), lanifibranor",
                "BTK Inhibitors: Fenebrutinib (Genentech/Roche)",
                "Anti-LOXL2: Simtuzumab follow-ups",
                "Immunosuppressants: Tacrolimus, MMF optimization",
                "B-cell Therapies: Rituximab, obexelimab"
            ],
            "key_metrics": {
                "pbc_prevalence": 65000,
                "aih_prevalence": 55000,
                "fda_approvals_2019_2024": 2,
                "avg_trial_success_rate": 0.55
            }
        },
        
        "Multiple Sclerosis": {
            "code": "MS",
            "search_terms": ["multiple sclerosis", "MS", "relapsing remitting MS", "RRMS"],
            "companies": {
                "Biogen": "BIIB",
                "Novartis": "NVS",
                "Roche": "ROG.SW",
                "Bristol Myers Squibb": "BMY",
                "Sanofi": "SNY",
                "EMD Serono": "MRK.DE",  # Merck KGaA
                "Janssen": "JNJ",
                "TG Therapeutics": "TGTX",
                "Immunic": "IMUX",
                "Atara Biotherapeutics": "ATRA"
            },
            "prevalence_us": 1000000,
            "prevalence_growth_rate": 0.012,
            "active_trials_estimate": 320,
            "pipeline_focus": [
                "BTK Inhibitors: Evobrutinib, tolebrutinib, fenebrutinib",
                "Anti-CD20: Ofatumumab (Kesimpta), ublituximab (Briumvi)",
                "S1P Modulators: Ozanimod (Zeposia), ponesimod",
                "Anti-LINGO-1: Opicinumab (Biogen) remyelination",
                "CAR-T Cell Therapies: KYV-101, ATA188",
                "Nrf2 Activators: Dimethyl fumarate successors"
            ],
            "key_metrics": {
                "rrms_percentage": 0.85,
                "fda_approvals_2019_2024": 8,
                "avg_trial_success_rate": 0.72
            }
        },
        
        "Food Allergy & Anaphylaxis": {
            "code": "FA",
            "search_terms": ["food allergy", "peanut allergy", "anaphylaxis", "oral immunotherapy"],
            "companies": {
                "Aimmune Therapeutics": "AIMT",  # Acquired by Nestle, track via private
                "DBV Technologies": "DBVT",
                "Novartis": "NVS",
                "Regeneron": "REGN",
                "Sanofi": "SNY",
                "Genentech/Roche": "ROG.SW",
                "Alladapt Immunotherapeutics": "ADAP",
                "IgGenix": "IGGX",  # Private
                "Aravax": "ARVX",  # Private
                "Adare Pharmaceuticals": "ADRE"  # Private
            },
            "prevalence_us": 32000000,  # Total food allergies
            "prevalence_growth_rate": 0.028,
            "active_trials_estimate": 95,
            "pipeline_focus": [
                "OIT Platforms: Palforzia (Aimmune/Nestle), Viaskin Peanut",
                "IgE Inhibitors: Dupilumab (Dupixent) expansion",
                "Basophil Activation: Anti-IL-4R, anti-IL-5",
                "Microbiome Approaches: Lactobacillus-based therapies",
                "Gene Therapy: Investigational approaches for hereditary angioedema",
                "Epicutaneous Immunotherapy: Viaskin platform expansion"
            ],
            "key_metrics": {
                "peanut_allergy_prevalence": 1600000,
                "pediatric_percentage": 0.08,
                "fda_approvals_2019_2024": 3,
                "avg_trial_success_rate": 0.68
            }
        }
    }
    
    @classmethod
    def get_disease_names(cls) -> List[str]:
        """Return list of all supported disease names"""
        return list(cls.DISEASES.keys())
    
    @classmethod
    def get_disease_config(cls, disease_name: str) -> Dict[str, Any]:
        """Get configuration for a specific disease"""
        return cls.DISEASES.get(disease_name, cls.DISEASES["Sickle Cell Disease"])
    
    @classmethod
    def get_companies(cls, disease_name: str) -> Dict[str, str]:
        """Get company ticker mapping for a disease"""
        config = cls.get_disease_config(disease_name)
        return config.get("companies", {})
    
    @classmethod
    def get_search_terms(cls, disease_name: str) -> List[str]:
        """Get clinical trial search terms for a disease"""
        config = cls.get_disease_config(disease_name)
        return config.get("search_terms", [])
    
    @classmethod
    def get_prevalence(cls, disease_name: str) -> int:
        """Get US prevalence estimate for a disease"""
        config = cls.get_disease_config(disease_name)
        return config.get("prevalence_us", 0)
    
    @classmethod
    def get_pipeline_focus(cls, disease_name: str) -> List[str]:
        """Get research pipeline focus areas for a disease"""
        config = cls.get_disease_config(disease_name)
        return config.get("pipeline_focus", [])


# ETFs for sector comparison (same across all diseases)
SECTOR_ETFS = {
    "iShares Biotechnology ETF": "IBB",
    "SPDR S&P Biotech ETF": "XBI",
    "Health Care Select Sector SPDR": "XLV",
    "VanEck Biotech ETF": "BBH",
    "iShares U.S. Medical Devices ETF": "IHI",
    "ARK Genomic Revolution ETF": "ARKG"
}

# Common exchange suffixes for international tickers
EXCHANGE_SUFFIXES = {
    ".SW": "SIX Swiss Exchange",
    ".BR": "Euronext Brussels",
    ".DE": "Deutsche Borse"
}
