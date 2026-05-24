"""
Collect Enhanced Clinical Trial Data
Fetches real trial data with all required fields for analysis.
"""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import requests
import pandas as pd
from datetime import datetime, timezone
from src.data_collection.parsers.clinical_trials import parse_v2_studies


def collect_trials_for_disease(disease_name: str, max_trials: int = 200) -> pd.DataFrame:
    """
    Collect enhanced trial data for a specific disease.
    
    Returns DataFrame with columns:
    - nct_id: NCT ID (verifiable on ClinicalTrials.gov)
    - title: Trial title
    - status: Status (Completed, Terminated, etc.)
    - phase: Phase (1, 2, 3, 4)
    - start_date: Trial start date
    - completion_date: Trial completion date
    - enrollment: Enrollment numbers
    - sponsor_name: Sponsor organization name
    - sponsor_type: Sponsor type (INDUSTRY, NIH, OTHER)
    - outcome: Actual outcomes (Success/Failure/Ongoing/Unknown)
    """
    
    print(f"\n📡 Collecting trials for: {disease_name}")
    print(f"   Max trials: {max_trials}")
    
    url = "https://clinicaltrials.gov/api/v2/studies"
    params = {
        "query.cond": disease_name,
        "pageSize": min(max_trials, 1000),  # API limit
        "format": "json"
    }
    
    try:
        response = requests.get(url, params=params, timeout=60)
        
        if response.status_code != 200:
            print(f"   ❌ API Error: HTTP {response.status_code}")
            return pd.DataFrame()
        
        data = response.json()
        trials = parse_v2_studies(data, max_trials=max_trials)
        
        if not trials:
            print("   ⚠️  No trials found")
            return pd.DataFrame()
        
        df = pd.DataFrame(trials)
        df["disease"] = disease_name
        df["collection_date"] = datetime.now(timezone.utc).isoformat()
        
        print(f"   ✅ Collected {len(df)} trials")
        print(f"      - Success: {(df['outcome'] == 'Success').sum()}")
        print(f"      - Failure: {(df['outcome'] == 'Failure').sum()}")
        print(f"      - Ongoing: {(df['outcome'] == 'Ongoing').sum()}")
        print(f"      - Unknown: {(df['outcome'] == 'Unknown').sum()}")
        
        return df
        
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return pd.DataFrame()


def main():
    """Collect enhanced trial data for all diseases."""
    
    print("\n" + "="*70)
    print("ENHANCED CLINICAL TRIAL DATA COLLECTION")
    print("="*70)
    print("\nCollecting real trial data with full metadata:")
    print("  ✓ NCT ID (verifiable)")
    print("  ✓ Phase (1, 2, 3, 4)")
    print("  ✓ Status (Completed, Terminated, etc.)")
    print("  ✓ Enrollment numbers")
    print("  ✓ Sponsor type")
    print("  ✓ Outcomes (Success/Failure)")
    
    # Diseases to collect (expanded to 15)
    diseases = [
        # Original 7
        "sickle cell disease",
        "systemic lupus erythematosus",
        "hidradenitis suppurativa",
        "diabetic nephropathy",
        "multiple sclerosis",
        "rheumatoid arthritis",
        "crohn's disease",
        # New 8
        "psoriasis",
        "ulcerative colitis",
        "ankylosing spondylitis",
        "atopic dermatitis",
        "type 1 diabetes",
        "celiac disease",
        "inflammatory bowel disease",
        "autoimmune hepatitis"
    ]
    
    all_trials = []
    
    for disease in diseases:
        df = collect_trials_for_disease(disease, max_trials=500)
        if not df.empty:
            all_trials.append(df)
    
    if not all_trials:
        print("\n❌ No trials collected")
        return 1
    
    # Combine all trials
    combined = pd.concat(all_trials, ignore_index=True)
    
    # Save to CSV
    output_dir = ROOT / "data" / "processed"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    output_path = output_dir / "enhanced_clinical_trials.csv"
    combined.to_csv(output_path, index=False)
    
    # Summary
    print("\n" + "="*70)
    print("COLLECTION SUMMARY")
    print("="*70)
    print(f"\nTotal Trials Collected: {len(combined)}")
    print(f"Diseases Covered: {len(diseases)}")
    print("\nOutcome Distribution:")
    for outcome, count in combined["outcome"].value_counts().items():
        pct = (count / len(combined)) * 100
        print(f"  {outcome:10}: {count:4} trials ({pct:.1f}%)")
    
    print("\nSponsor Type Distribution:")
    for sponsor, count in combined["sponsor_type"].value_counts().items():
        pct = (count / len(combined)) * 100
        print(f"  {sponsor:20}: {count:4} trials ({pct:.1f}%)")
    
    print("\nPhase Distribution:")
    phase_counts = combined["phase"].value_counts()
    for phase, count in phase_counts.items():
        if phase:  # Skip empty phases
            pct = (count / len(combined)) * 100
            print(f"  {phase:20}: {count:4} trials ({pct:.1f}%)")
    
    print(f"\n💾 Data saved to: {output_path}")
    
    # Data quality report
    print("\n" + "="*70)
    print("DATA QUALITY REPORT")
    print("="*70)
    
    fields = ["nct_id", "phase", "status", "enrollment", "sponsor_type", "outcome"]
    for field in fields:
        non_empty = combined[field].notna().sum()
        pct = (non_empty / len(combined)) * 100
        status = "✅" if pct >= 90 else "⚠️" if pct >= 70 else "❌"
        print(f"{status} {field:15}: {pct:5.1f}% complete ({non_empty}/{len(combined)})")
    
    print("\n✅ COLLECTION COMPLETE!")
    print("\nYour data now contains:")
    print("  ✓ NCT ID (verifiable on ClinicalTrials.gov)")
    print("  ✓ Phase (1, 2, 3, 4)")
    print("  ✓ Status (Completed, Terminated, etc.)")
    print("  ✓ Enrollment numbers")
    print("  ✓ Sponsor type")
    print("  ✓ Actual outcomes (Success/Failure)")
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
