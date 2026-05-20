"""
Test Enhanced Clinical Trials Parser
Verifies all required fields are extracted from real API data.
"""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import requests
import pandas as pd
from src.data_collection.parsers.clinical_trials import parse_v2_studies


def test_enhanced_parser():
    """Test that parser extracts all required fields."""
    
    print("\n" + "="*70)
    print("TESTING ENHANCED CLINICAL TRIALS PARSER")
    print("="*70)
    
    # Fetch real data from API
    print("\n📡 Fetching real trial data from ClinicalTrials.gov...")
    url = "https://clinicaltrials.gov/api/v2/studies"
    params = {
        "query.cond": "sickle cell disease",
        "pageSize": 10,
        "format": "json"
    }
    
    response = requests.get(url, params=params, timeout=30)
    
    if response.status_code != 200:
        print(f"❌ API Error: HTTP {response.status_code}")
        return False
    
    print("✅ API Response received")
    
    # Parse data
    print("\n🔧 Parsing trial data...")
    trials = parse_v2_studies(response.json(), max_trials=10)
    
    if not trials:
        print("❌ No trials parsed")
        return False
    
    print(f"✅ Parsed {len(trials)} trials")
    
    # Convert to DataFrame
    df = pd.DataFrame(trials)
    
    # Check required fields
    print("\n📋 Checking Required Fields:")
    print("-" * 70)
    
    required_fields = [
        ("nct_id", "NCT ID (verifiable on ClinicalTrials.gov)"),
        ("phase", "Phase (1, 2, 3, 4)"),
        ("status", "Status (Completed, Terminated, etc.)"),
        ("enrollment", "Enrollment numbers"),
        ("sponsor_type", "Sponsor type"),
        ("outcome", "Actual outcomes (success/failure)")
    ]
    
    all_present = True
    for field, description in required_fields:
        if field in df.columns:
            non_empty = df[field].notna().sum()
            pct = (non_empty / len(df)) * 100
            print(f"✅ {field:15} - {description}")
            print(f"   └─ Present in {non_empty}/{len(df)} trials ({pct:.0f}%)")
        else:
            print(f"❌ {field:15} - MISSING")
            all_present = False
    
    # Show sample data
    print("\n" + "="*70)
    print("SAMPLE DATA (First 3 Trials)")
    print("="*70)
    
    display_cols = ["nct_id", "phase", "status", "enrollment", "sponsor_type", "outcome"]
    sample = df[display_cols].head(3)
    
    for idx, row in sample.iterrows():
        print(f"\nTrial {idx + 1}:")
        for col in display_cols:
            value = row[col] if row[col] else "(empty)"
            print(f"  {col:15}: {value}")
    
    # Summary statistics
    print("\n" + "="*70)
    print("OUTCOME DISTRIBUTION")
    print("="*70)
    
    outcome_counts = df["outcome"].value_counts()
    for outcome, count in outcome_counts.items():
        pct = (count / len(df)) * 100
        print(f"  {outcome:10}: {count:2} trials ({pct:.0f}%)")
    
    # Sponsor type distribution
    print("\n" + "="*70)
    print("SPONSOR TYPE DISTRIBUTION")
    print("="*70)
    
    sponsor_counts = df["sponsor_type"].value_counts()
    for sponsor, count in sponsor_counts.items():
        pct = (count / len(df)) * 100
        print(f"  {sponsor:20}: {count:2} trials ({pct:.0f}%)")
    
    # Save sample to CSV
    output_path = ROOT / "data" / "raw" / "sample_enhanced_trials.csv"
    df.to_csv(output_path, index=False)
    print(f"\n💾 Sample data saved to: {output_path}")
    
    # Final verdict
    print("\n" + "="*70)
    if all_present:
        print("✅ SUCCESS: All required fields are present!")
        print("\nYour data now contains:")
        print("  ✓ NCT ID (verifiable on ClinicalTrials.gov)")
        print("  ✓ Phase (1, 2, 3, 4)")
        print("  ✓ Status (Completed, Terminated, etc.)")
        print("  ✓ Enrollment numbers")
        print("  ✓ Sponsor type")
        print("  ✓ Actual outcomes (success/failure)")
        return True
    else:
        print("❌ FAILURE: Some required fields are missing")
        return False


if __name__ == "__main__":
    success = test_enhanced_parser()
    sys.exit(0 if success else 1)
