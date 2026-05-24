"""
Collect FDA Drug Approval Data from openFDA API
Fetches approved drugs for each disease indication.
"""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import pandas as pd
import requests
from datetime import datetime
import time

# Disease search terms for openFDA
DISEASE_SEARCH_TERMS = {
    "sickle cell disease": ["sickle cell", "sickle cell disease", "sickle cell anemia"],
    "systemic lupus erythematosus": ["lupus", "systemic lupus", "SLE"],
    "hidradenitis suppurativa": ["hidradenitis", "hidradenitis suppurativa"],
    "diabetic nephropathy": ["diabetic nephropathy", "diabetic kidney"],
    "multiple sclerosis": ["multiple sclerosis", "MS"],
    "rheumatoid arthritis": ["rheumatoid arthritis", "RA"],
    "crohn's disease": ["crohn", "crohn's disease", "crohns"],
    "psoriasis": ["psoriasis", "psoriatic"],
    "ulcerative colitis": ["ulcerative colitis", "UC"],
    "ankylosing spondylitis": ["ankylosing spondylitis", "AS"],
    "atopic dermatitis": ["atopic dermatitis", "eczema"],
    "type 1 diabetes": ["type 1 diabetes", "diabetes mellitus type 1", "T1D"],
    "celiac disease": ["celiac", "celiac disease", "coeliac"],
    "inflammatory bowel disease": ["inflammatory bowel", "IBD"],
    "autoimmune hepatitis": ["autoimmune hepatitis", "AIH"]
}


def search_openfda(disease: str, search_terms: list) -> list:
    """Search openFDA for drug approvals for a disease."""
    
    print(f"\n🔍 Searching openFDA for: {disease}")
    
    all_drugs = []
    
    for term in search_terms:
        try:
            url = "https://api.fda.gov/drug/label.json"
            params = {
                "search": f'indications_and_usage:"{term}"',
                "limit": 100
            }
            
            response = requests.get(url, params=params, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                results = data.get("results", [])
                
                print(f"   ✅ '{term}': {len(results)} drugs found")
                
                for result in results:
                    # Extract drug information
                    openfda = result.get("openfda", {})
                    
                    brand_names = openfda.get("brand_name", [])
                    generic_names = openfda.get("generic_name", [])
                    manufacturer = openfda.get("manufacturer_name", [])
                    application_numbers = openfda.get("application_number", [])
                    
                    # Get first approval date if available
                    approval_date = ""
                    if application_numbers:
                        # Try to get from drugsfda (would need separate API call)
                        # For now, leave blank
                        pass
                    
                    # Add drug entry
                    if brand_names or generic_names:
                        all_drugs.append({
                            "disease": disease,
                            "brand_name": brand_names[0] if brand_names else "",
                            "generic_name": generic_names[0] if generic_names else "",
                            "manufacturer": manufacturer[0] if manufacturer else "",
                            "application_number": application_numbers[0] if application_numbers else "",
                            "search_term": term,
                            "source": "openFDA",
                            "collection_date": datetime.now().isoformat()
                        })
                
                # Rate limiting
                time.sleep(0.5)
                
            elif response.status_code == 404:
                print(f"   ⚠️  '{term}': No results")
            else:
                print(f"   ❌ '{term}': HTTP {response.status_code}")
                
        except Exception as e:
            print(f"   ❌ '{term}': Error - {str(e)[:50]}")
    
    # Remove duplicates based on brand_name + generic_name
    seen = set()
    unique_drugs = []
    for drug in all_drugs:
        key = (drug["brand_name"], drug["generic_name"])
        if key not in seen:
            seen.add(key)
            unique_drugs.append(drug)
    
    print(f"   📊 Total unique drugs: {len(unique_drugs)}")
    
    return unique_drugs


def collect_all_fda_approvals():
    """Collect FDA approvals for all diseases."""
    
    print("\n" + "="*80)
    print("FDA DRUG APPROVAL DATA COLLECTION")
    print("="*80)
    print(f"\nSource: openFDA API")
    print(f"Diseases: {len(DISEASE_SEARCH_TERMS)}")
    
    all_approvals = []
    
    for disease, search_terms in DISEASE_SEARCH_TERMS.items():
        drugs = search_openfda(disease, search_terms)
        all_approvals.extend(drugs)
    
    # Create DataFrame
    df = pd.DataFrame(all_approvals)
    
    # Save to CSV
    output_path = ROOT / "data" / "processed" / "fda_drug_approvals.csv"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(output_path, index=False)
    
    print(f"\n💾 Data saved to: {output_path}")
    
    # Summary
    print("\n" + "="*80)
    print("SUMMARY")
    print("="*80)
    print(f"\nTotal Drugs Collected: {len(df)}")
    print(f"Diseases Covered: {df['disease'].nunique()}")
    
    print("\n📊 Drugs per Disease:")
    disease_counts = df['disease'].value_counts()
    for disease, count in disease_counts.items():
        print(f"   {disease:35}: {count:3} drugs")
    
    print("\n📊 Top 10 Manufacturers:")
    mfg_counts = df[df['manufacturer'] != '']['manufacturer'].value_counts().head(10)
    for mfg, count in mfg_counts.items():
        print(f"   {mfg[:40]:40}: {count:3} drugs")
    
    return df


def main():
    """Run FDA approval data collection."""
    
    print("\n" + "="*80)
    print("COMPREHENSIVE FDA DRUG APPROVAL COLLECTION")
    print("="*80)
    print(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Collect FDA approvals
    df = collect_all_fda_approvals()
    
    print("\n" + "="*80)
    print("✅ COLLECTION COMPLETE")
    print("="*80)
    print("\nFile created:")
    print("  data/processed/fda_drug_approvals.csv")
    
    print("\n📊 Data Quality:")
    print(f"   Total Drugs: {len(df)}")
    print(f"   Diseases: {df['disease'].nunique()}")
    print(f"   Manufacturers: {df[df['manufacturer'] != '']['manufacturer'].nunique()}")
    
    print("\n💡 Note:")
    print("   - Approval dates not available from openFDA label endpoint")
    print("   - Would need drugsfda.gov API for approval dates")
    print("   - Data represents drugs with indication mentions in labels")
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
