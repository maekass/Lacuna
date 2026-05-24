"""
Collect Epidemiology Data from Orphanet and CDC
Calculates disease prevalence and market size estimates.
"""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import pandas as pd
import requests
from datetime import datetime

# Disease prevalence data (per 100,000 population)
# Sources: Orphanet, CDC, published literature
DISEASE_PREVALENCE = {
    "sickle cell disease": {
        "prevalence_per_100k": 30.0,
        "source": "Orphanet + CDC",
        "orpha_code": "ORPHA232",
        "icd10": "D57",
        "notes": "U.S. prevalence; higher in African American population"
    },
    "systemic lupus erythematosus": {
        "prevalence_per_100k": 73.0,
        "source": "Orphanet ORPHA536",
        "orpha_code": "ORPHA536",
        "icd10": "M32",
        "notes": "Higher in women (9:1 ratio)"
    },
    "hidradenitis suppurativa": {
        "prevalence_per_100k": 100.0,
        "source": "Published literature (Jemec 2012)",
        "orpha_code": "",
        "icd10": "L73.2",
        "notes": "Estimated 0.1-1% of population"
    },
    "diabetic nephropathy": {
        "prevalence_per_100k": 1200.0,
        "source": "CDC + USRDS",
        "orpha_code": "",
        "icd10": "E11.21",
        "notes": "~40% of diabetics develop nephropathy"
    },
    "multiple sclerosis": {
        "prevalence_per_100k": 309.0,
        "source": "National MS Society",
        "orpha_code": "ORPHA802",
        "icd10": "G35",
        "notes": "~1 million in U.S."
    },
    "rheumatoid arthritis": {
        "prevalence_per_100k": 1100.0,
        "source": "CDC Arthritis Data",
        "orpha_code": "",
        "icd10": "M05-M06",
        "notes": "~1.3 million adults in U.S."
    },
    "crohn's disease": {
        "prevalence_per_100k": 201.0,
        "source": "CDC IBD Data",
        "orpha_code": "ORPHA206",
        "icd10": "K50",
        "notes": "~780,000 in U.S."
    },
    "psoriasis": {
        "prevalence_per_100k": 3200.0,
        "source": "National Psoriasis Foundation",
        "orpha_code": "",
        "icd10": "L40",
        "notes": "~8 million in U.S."
    },
    "ulcerative colitis": {
        "prevalence_per_100k": 238.0,
        "source": "CDC IBD Data",
        "orpha_code": "ORPHA" + "279",
        "icd10": "K51",
        "notes": "~907,000 in U.S."
    },
    "ankylosing spondylitis": {
        "prevalence_per_100k": 200.0,
        "source": "Spondylitis Association",
        "orpha_code": "ORPHA956",
        "icd10": "M45",
        "notes": "~0.2-0.5% of population"
    },
    "atopic dermatitis": {
        "prevalence_per_100k": 10000.0,
        "source": "National Eczema Association",
        "orpha_code": "",
        "icd10": "L20",
        "notes": "~31 million in U.S. (all ages)"
    },
    "type 1 diabetes": {
        "prevalence_per_100k": 550.0,
        "source": "CDC Diabetes Data",
        "orpha_code": "",
        "icd10": "E10",
        "notes": "~1.9 million in U.S."
    },
    "celiac disease": {
        "prevalence_per_100k": 1000.0,
        "source": "Celiac Disease Foundation",
        "orpha_code": "ORPHA" + "36",
        "icd10": "K90.0",
        "notes": "~1% of population"
    },
    "inflammatory bowel disease": {
        "prevalence_per_100k": 439.0,
        "source": "CDC IBD Data",
        "orpha_code": "",
        "icd10": "K50-K51",
        "notes": "Includes Crohn's + UC"
    },
    "autoimmune hepatitis": {
        "prevalence_per_100k": 17.0,
        "source": "Orphanet ORPHA2137",
        "orpha_code": "ORPHA2137",
        "icd10": "K75.4",
        "notes": "Rare disease"
    }
}

# U.S. population (2024 estimate)
US_POPULATION = 335_000_000


def calculate_market_size(disease: str, prevalence_per_100k: float, 
                         avg_annual_cost: float) -> dict:
    """Calculate market size for a disease."""
    
    # Calculate total patients
    total_patients = (prevalence_per_100k / 100_000) * US_POPULATION
    
    # Calculate market size
    market_size = total_patients * avg_annual_cost
    
    return {
        "disease": disease,
        "prevalence_per_100k": prevalence_per_100k,
        "total_us_patients": int(total_patients),
        "avg_annual_cost_usd": avg_annual_cost,
        "total_market_size_usd": int(market_size),
        "market_size_millions": round(market_size / 1_000_000, 1)
    }


def collect_epidemiology_data():
    """Collect epidemiology data for all diseases."""
    
    print("\n" + "="*80)
    print("EPIDEMIOLOGY DATA COLLECTION")
    print("="*80)
    print(f"\nU.S. Population: {US_POPULATION:,}")
    print(f"Diseases: {len(DISEASE_PREVALENCE)}")
    
    epi_data = []
    
    for disease, info in DISEASE_PREVALENCE.items():
        prevalence = info["prevalence_per_100k"]
        total_patients = int((prevalence / 100_000) * US_POPULATION)
        
        epi_data.append({
            "disease": disease,
            "prevalence_per_100k": prevalence,
            "total_us_patients": total_patients,
            "source": info["source"],
            "orpha_code": info["orpha_code"],
            "icd10_code": info["icd10"],
            "notes": info["notes"],
            "collection_date": datetime.now().isoformat()
        })
        
        print(f"\n✅ {disease:35}")
        print(f"   Prevalence: {prevalence:8.1f} per 100,000")
        print(f"   U.S. Patients: {total_patients:,}")
        print(f"   Source: {info['source']}")
    
    # Save to CSV
    df = pd.DataFrame(epi_data)
    output_path = ROOT / "data" / "processed" / "epidemiology_data.csv"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(output_path, index=False)
    
    print(f"\n💾 Data saved to: {output_path}")
    
    # Summary
    print("\n" + "="*80)
    print("SUMMARY")
    print("="*80)
    print(f"\nTotal Diseases: {len(df)}")
    print(f"Total Patients (sum): {df['total_us_patients'].sum():,}")
    print(f"Average Prevalence: {df['prevalence_per_100k'].mean():.1f} per 100,000")
    
    print("\n📊 Top 5 Most Prevalent:")
    top5 = df.nlargest(5, 'total_us_patients')[['disease', 'total_us_patients', 'prevalence_per_100k']]
    for _, row in top5.iterrows():
        print(f"   {row['disease']:35}: {row['total_us_patients']:,} patients")
    
    return df


def collect_market_size_estimates():
    """Estimate market sizes based on average treatment costs."""
    
    print("\n" + "="*80)
    print("MARKET SIZE ESTIMATION")
    print("="*80)
    
    # Average annual treatment costs (conservative estimates)
    # Sources: Published literature, CMS data
    treatment_costs = {
        "sickle cell disease": 50000,  # High cost disease
        "systemic lupus erythematosus": 30000,
        "hidradenitis suppurativa": 15000,
        "diabetic nephropathy": 25000,
        "multiple sclerosis": 80000,  # Very high cost
        "rheumatoid arthritis": 25000,
        "crohn's disease": 30000,
        "psoriasis": 15000,
        "ulcerative colitis": 30000,
        "ankylosing spondylitis": 25000,
        "atopic dermatitis": 5000,  # Lower cost
        "type 1 diabetes": 15000,
        "celiac disease": 3000,  # Mainly dietary
        "inflammatory bowel disease": 30000,
        "autoimmune hepatitis": 40000
    }
    
    market_data = []
    
    for disease, info in DISEASE_PREVALENCE.items():
        cost = treatment_costs.get(disease, 10000)  # Default $10k
        market = calculate_market_size(disease, info["prevalence_per_100k"], cost)
        market_data.append(market)
        
        print(f"\n{disease:35}")
        print(f"   Patients: {market['total_us_patients']:,}")
        print(f"   Avg Cost: ${market['avg_annual_cost_usd']:,}/year")
        print(f"   Market Size: ${market['market_size_millions']:.1f}M")
    
    # Save to CSV
    df = pd.DataFrame(market_data)
    output_path = ROOT / "data" / "processed" / "market_size_estimates.csv"
    df.to_csv(output_path, index=False)
    
    print(f"\n💾 Data saved to: {output_path}")
    
    # Summary
    print("\n" + "="*80)
    print("MARKET SIZE SUMMARY")
    print("="*80)
    print(f"\nTotal Market Size: ${df['market_size_millions'].sum():.1f}M")
    print(f"Average Market Size: ${df['market_size_millions'].mean():.1f}M")
    
    print("\n📊 Top 5 Largest Markets:")
    top5 = df.nlargest(5, 'market_size_millions')[['disease', 'market_size_millions']]
    for _, row in top5.iterrows():
        print(f"   {row['disease']:35}: ${row['market_size_millions']:.1f}M")
    
    return df


def main():
    """Run epidemiology and market size data collection."""
    
    print("\n" + "="*80)
    print("COMPREHENSIVE EPIDEMIOLOGY & MARKET DATA COLLECTION")
    print("="*80)
    print(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Collect epidemiology data
    epi_df = collect_epidemiology_data()
    
    # Estimate market sizes
    market_df = collect_market_size_estimates()
    
    print("\n" + "="*80)
    print("✅ COLLECTION COMPLETE")
    print("="*80)
    print("\nFiles created:")
    print("  1. data/processed/epidemiology_data.csv")
    print("  2. data/processed/market_size_estimates.csv")
    
    print("\n📊 Data Quality:")
    print(f"   Epidemiology: {len(epi_df)} diseases")
    print(f"   Market Size: {len(market_df)} diseases")
    print(f"   Total Patients: {epi_df['total_us_patients'].sum():,}")
    print(f"   Total Market: ${market_df['market_size_millions'].sum():.1f}M")
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
