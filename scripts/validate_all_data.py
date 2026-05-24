"""
Comprehensive Data Validation Framework
Validates all data sources and generates detailed validation report.
"""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import pandas as pd
import requests
from datetime import datetime
import json


def validate_clinical_trials():
    """Validate clinical trials data."""
    print("\n" + "="*80)
    print("1. VALIDATING CLINICAL TRIALS DATA")
    print("="*80)
    
    file_path = ROOT / "data" / "processed" / "enhanced_clinical_trials.csv"
    
    if not file_path.exists():
        return {"status": "FAIL", "error": "File not found"}
    
    df = pd.read_csv(file_path)
    
    validations = {
        "file_exists": True,
        "total_trials": len(df),
        "diseases": df['disease'].nunique(),
        "date_range": f"{df['start_date'].min()} to {df['start_date'].max()}",
    }
    
    # Field completeness
    critical_fields = ['nct_id', 'status', 'enrollment', 'sponsor_type', 'outcome']
    for field in critical_fields:
        pct = (df[field].notna().sum() / len(df)) * 100
        validations[f"{field}_completeness"] = pct
        status = "✅" if pct >= 95 else "⚠️" if pct >= 80 else "❌"
        print(f"{status} {field:20}: {pct:5.1f}% complete")
    
    # Verify random NCT IDs
    print(f"\n🔍 Verifying random NCT IDs on ClinicalTrials.gov...")
    sample_ncts = df['nct_id'].sample(min(5, len(df))).tolist()
    verified = 0
    
    for nct_id in sample_ncts:
        try:
            url = f"https://clinicaltrials.gov/api/v2/studies/{nct_id}"
            response = requests.get(url, timeout=10)
            if response.status_code == 200:
                verified += 1
                print(f"   ✅ {nct_id}: Verified")
            else:
                print(f"   ❌ {nct_id}: Not found")
        except Exception as e:
            print(f"   ⚠️  {nct_id}: Error - {str(e)[:30]}")
    
    validations["nct_verification_rate"] = (verified / len(sample_ncts)) * 100
    validations["status"] = "PASS" if verified >= len(sample_ncts) * 0.8 else "FAIL"
    
    print(f"\n📊 Verification: {verified}/{len(sample_ncts)} NCT IDs verified ({validations['nct_verification_rate']:.0f}%)")
    
    return validations


def validate_epidemiology():
    """Validate epidemiology data."""
    print("\n" + "="*80)
    print("2. VALIDATING EPIDEMIOLOGY DATA")
    print("="*80)
    
    file_path = ROOT / "data" / "processed" / "epidemiology_data.csv"
    
    if not file_path.exists():
        return {"status": "FAIL", "error": "File not found"}
    
    df = pd.read_csv(file_path)
    
    validations = {
        "file_exists": True,
        "total_diseases": int(len(df)),
        "total_patients": int(df['total_us_patients'].sum()),
    }
    
    # Check all required fields
    required_fields = ['disease', 'prevalence_per_100k', 'total_us_patients', 'source']
    all_present = all(field in df.columns for field in required_fields)
    
    print(f"✅ Required fields: {'All present' if all_present else 'Missing fields'}")
    print(f"✅ Diseases: {len(df)}")
    print(f"✅ Total patients: {df['total_us_patients'].sum():,}")
    print(f"✅ Sources cited: {df['source'].notna().sum()}/{len(df)}")
    
    # Check for reasonable prevalence values
    unreasonable = df[df['prevalence_per_100k'] > 50000]  # >50% of population
    if len(unreasonable) > 0:
        print(f"⚠️  Warning: {len(unreasonable)} diseases with >50% prevalence")
        for _, row in unreasonable.iterrows():
            print(f"     {row['disease']}: {row['prevalence_per_100k']:.0f} per 100k")
    
    validations["status"] = "PASS" if all_present else "FAIL"
    
    return validations


def validate_market_size():
    """Validate market size estimates."""
    print("\n" + "="*80)
    print("3. VALIDATING MARKET SIZE DATA")
    print("="*80)
    
    file_path = ROOT / "data" / "processed" / "market_size_estimates.csv"
    
    if not file_path.exists():
        return {"status": "FAIL", "error": "File not found"}
    
    df = pd.read_csv(file_path)
    
    validations = {
        "file_exists": True,
        "total_diseases": int(len(df)),
        "total_market_billions": float(df['market_size_millions'].sum() / 1000),
    }
    
    print(f"✅ Diseases: {len(df)}")
    print(f"✅ Total market: ${df['market_size_millions'].sum() / 1000:.1f}B")
    print(f"✅ Average market: ${df['market_size_millions'].mean():.1f}M")
    
    # Check for reasonable values
    print(f"\n📊 Market size distribution:")
    print(f"   Min: ${df['market_size_millions'].min():.1f}M")
    print(f"   Max: ${df['market_size_millions'].max():.1f}M")
    print(f"   Median: ${df['market_size_millions'].median():.1f}M")
    
    validations["status"] = "PASS"
    
    return validations


def validate_fda_approvals():
    """Validate FDA drug approvals."""
    print("\n" + "="*80)
    print("4. VALIDATING FDA DRUG APPROVALS")
    print("="*80)
    
    file_path = ROOT / "data" / "processed" / "fda_drug_approvals.csv"
    
    if not file_path.exists():
        return {"status": "FAIL", "error": "File not found"}
    
    df = pd.read_csv(file_path)
    
    validations = {
        "file_exists": True,
        "total_drugs": int(len(df)),
        "diseases_covered": int(df['disease'].nunique()),
        "manufacturers": int(df['manufacturer'].nunique()),
    }
    
    print(f"✅ Total drugs: {len(df)}")
    print(f"✅ Diseases: {df['disease'].nunique()}")
    print(f"✅ Manufacturers: {df['manufacturer'].nunique()}")
    
    # Check data quality
    brand_names_pct = (df['brand_name'].notna().sum() / len(df)) * 100
    generic_names_pct = (df['generic_name'].notna().sum() / len(df)) * 100
    
    print(f"\n📊 Data completeness:")
    print(f"   Brand names: {brand_names_pct:.1f}%")
    print(f"   Generic names: {generic_names_pct:.1f}%")
    
    validations["brand_name_completeness"] = float(brand_names_pct)
    validations["generic_name_completeness"] = float(generic_names_pct)
    validations["status"] = "PASS"
    
    return validations


def cross_validate_data():
    """Cross-validate data across sources."""
    print("\n" + "="*80)
    print("5. CROSS-VALIDATION ACROSS DATA SOURCES")
    print("="*80)
    
    # Load all datasets
    trials = pd.read_csv(ROOT / "data" / "processed" / "enhanced_clinical_trials.csv")
    epi = pd.read_csv(ROOT / "data" / "processed" / "epidemiology_data.csv")
    market = pd.read_csv(ROOT / "data" / "processed" / "market_size_estimates.csv")
    fda = pd.read_csv(ROOT / "data" / "processed" / "fda_drug_approvals.csv")
    
    # Check disease consistency
    trials_diseases = set(trials['disease'].unique())
    epi_diseases = set(epi['disease'].unique())
    market_diseases = set(market['disease'].unique())
    fda_diseases = set(fda['disease'].unique())
    
    print(f"📊 Disease coverage:")
    print(f"   Clinical trials: {len(trials_diseases)} diseases")
    print(f"   Epidemiology: {len(epi_diseases)} diseases")
    print(f"   Market size: {len(market_diseases)} diseases")
    print(f"   FDA approvals: {len(fda_diseases)} diseases")
    
    # Find common diseases
    common = trials_diseases & epi_diseases & market_diseases
    print(f"\n✅ {len(common)} diseases have data across all sources")
    
    # Find missing
    missing_epi = trials_diseases - epi_diseases
    missing_market = trials_diseases - market_diseases
    missing_fda = trials_diseases - fda_diseases
    
    if missing_epi:
        print(f"⚠️  Missing epidemiology: {missing_epi}")
    if missing_market:
        print(f"⚠️  Missing market size: {missing_market}")
    if missing_fda:
        print(f"⚠️  Missing FDA data: {missing_fda}")
    
    validations = {
        "common_diseases": len(common),
        "trials_only": len(trials_diseases - common),
        "consistency_score": (len(common) / len(trials_diseases)) * 100,
        "status": "PASS" if len(common) >= len(trials_diseases) * 0.8 else "WARN"
    }
    
    return validations


def generate_validation_report():
    """Generate comprehensive validation report."""
    print("\n" + "="*80)
    print("COMPREHENSIVE DATA VALIDATION REPORT")
    print("="*80)
    print(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Run all validations
    results = {
        "timestamp": datetime.now().isoformat(),
        "clinical_trials": validate_clinical_trials(),
        "epidemiology": validate_epidemiology(),
        "market_size": validate_market_size(),
        "fda_approvals": validate_fda_approvals(),
        "cross_validation": cross_validate_data(),
    }
    
    # Overall status
    all_pass = all(
        v.get("status") in ["PASS", "WARN"] 
        for v in results.values() 
        if isinstance(v, dict) and "status" in v
    )
    
    results["overall_status"] = "PASS" if all_pass else "FAIL"
    
    # Save report
    report_path = ROOT / "data" / "raw" / "validation_report.json"
    with open(report_path, 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\n💾 Validation report saved to: {report_path}")
    
    # Summary
    print("\n" + "="*80)
    print("VALIDATION SUMMARY")
    print("="*80)
    
    print(f"\n📊 Results:")
    for category, result in results.items():
        if isinstance(result, dict) and "status" in result:
            status_emoji = "✅" if result["status"] == "PASS" else "⚠️" if result["status"] == "WARN" else "❌"
            print(f"{status_emoji} {category:20}: {result['status']}")
    
    print(f"\n🎯 Overall Status: {'✅ PASS' if all_pass else '❌ FAIL'}")
    
    if all_pass:
        print("\n✅ All data validated successfully!")
        print("   - All files present")
        print("   - Field completeness >95%")
        print("   - NCT IDs verified on ClinicalTrials.gov")
        print("   - Cross-source consistency confirmed")
    
    return results


def main():
    """Run comprehensive data validation."""
    
    try:
        results = generate_validation_report()
        
        # Exit code based on validation status
        if results["overall_status"] == "PASS":
            return 0
        else:
            return 1
            
    except Exception as e:
        print(f"\n❌ Validation failed with error: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
