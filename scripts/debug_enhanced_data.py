"""Debug script for enhanced data collection."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import pandas as pd
import requests
from src.data_collection.parsers.clinical_trials import parse_v2_studies, _determine_outcome


def test_data_file():
    """Test that data file exists and is valid."""
    print("\n" + "="*70)
    print("1. TESTING DATA FILE")
    print("="*70)
    
    data_path = ROOT / "data" / "processed" / "enhanced_clinical_trials.csv"
    
    if not data_path.exists():
        print(f"❌ Data file not found: {data_path}")
        return False
    
    try:
        df = pd.read_csv(data_path)
        print(f"✅ Data loads successfully")
        print(f"   Rows: {len(df)}")
        print(f"   Columns: {len(df.columns)}")
        
        # Check required fields
        required = ['nct_id', 'phase', 'status', 'enrollment', 'sponsor_type', 'outcome']
        missing = [f for f in required if f not in df.columns]
        
        if missing:
            print(f"❌ Missing required fields: {missing}")
            return False
        else:
            print(f"✅ All required fields present")
        
        # Check for null values in critical fields
        print(f"\n   Null values in critical fields:")
        for field in required:
            null_count = df[field].isnull().sum()
            pct = (null_count / len(df)) * 100
            status = "✅" if pct < 10 else "⚠️" if pct < 50 else "❌"
            print(f"   {status} {field:15}: {null_count:4} ({pct:5.1f}%)")
        
        return True
        
    except Exception as e:
        print(f"❌ Error loading data: {e}")
        return False


def test_api():
    """Test ClinicalTrials.gov API v2."""
    print("\n" + "="*70)
    print("2. TESTING API CONNECTION")
    print("="*70)
    
    url = "https://clinicaltrials.gov/api/v2/studies"
    params = {
        "query.cond": "sickle cell disease",
        "pageSize": 5,
        "format": "json"
    }
    
    try:
        print(f"   Connecting to: {url}")
        response = requests.get(url, params=params, timeout=10)
        
        if response.status_code != 200:
            print(f"❌ API Error: HTTP {response.status_code}")
            return False
        
        print(f"✅ API Status: {response.status_code}")
        
        data = response.json()
        if "studies" not in data:
            print(f"❌ Invalid response structure")
            return False
        
        print(f"✅ Response structure valid")
        print(f"   Studies in response: {len(data.get('studies', []))}")
        
        return True
        
    except Exception as e:
        print(f"❌ API Error: {e}")
        return False


def test_parser():
    """Test enhanced parser."""
    print("\n" + "="*70)
    print("3. TESTING ENHANCED PARSER")
    print("="*70)
    
    url = "https://clinicaltrials.gov/api/v2/studies"
    params = {
        "query.cond": "sickle cell disease",
        "pageSize": 3,
        "format": "json"
    }
    
    try:
        response = requests.get(url, params=params, timeout=10)
        
        if response.status_code != 200:
            print(f"❌ Cannot fetch test data")
            return False
        
        trials = parse_v2_studies(response.json(), max_trials=3)
        
        if not trials:
            print(f"❌ Parser returned no trials")
            return False
        
        print(f"✅ Parser works: {len(trials)} trials parsed")
        
        # Check fields in parsed data
        required_fields = ['nct_id', 'phase', 'status', 'enrollment', 'sponsor_type', 'outcome']
        
        for i, trial in enumerate(trials, 1):
            print(f"\n   Trial {i}:")
            for field in required_fields:
                value = trial.get(field, 'MISSING')
                status = "✅" if value and value != 'MISSING' else "⚠️"
                print(f"   {status} {field:15}: {value}")
        
        return True
        
    except Exception as e:
        print(f"❌ Parser Error: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_outcome_logic():
    """Test outcome determination logic."""
    print("\n" + "="*70)
    print("4. TESTING OUTCOME LOGIC")
    print("="*70)
    
    test_cases = [
        ("COMPLETED", "Success"),
        ("ACTIVE_NOT_RECRUITING", "Success"),
        ("TERMINATED", "Failure"),
        ("WITHDRAWN", "Failure"),
        ("SUSPENDED", "Failure"),
        ("RECRUITING", "Ongoing"),
        ("ENROLLING_BY_INVITATION", "Ongoing"),
        ("NOT_YET_RECRUITING", "Ongoing"),
        ("UNKNOWN", "Unknown"),
        ("", "Unknown"),
    ]
    
    all_passed = True
    
    for status, expected in test_cases:
        result = _determine_outcome(status)
        passed = result == expected
        status_icon = "✅" if passed else "❌"
        
        print(f"   {status_icon} {status:30} → {result:10} (expected: {expected})")
        
        if not passed:
            all_passed = False
    
    return all_passed


def test_sample_data():
    """Show sample of actual data."""
    print("\n" + "="*70)
    print("5. SAMPLE DATA VERIFICATION")
    print("="*70)
    
    data_path = ROOT / "data" / "processed" / "enhanced_clinical_trials.csv"
    
    if not data_path.exists():
        print(f"❌ Data file not found")
        return False
    
    try:
        df = pd.read_csv(data_path)
        
        # Show first 3 trials
        print(f"\n   First 3 trials:")
        for idx in range(min(3, len(df))):
            trial = df.iloc[idx]
            print(f"\n   Trial {idx + 1}:")
            print(f"   NCT ID:       {trial['nct_id']}")
            print(f"   Status:       {trial['status']}")
            print(f"   Phase:        {trial['phase'] if pd.notna(trial['phase']) else 'N/A'}")
            print(f"   Enrollment:   {trial['enrollment']}")
            print(f"   Sponsor Type: {trial['sponsor_type']}")
            print(f"   Outcome:      {trial['outcome']}")
            print(f"   Verify:       https://clinicaltrials.gov/study/{trial['nct_id']}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def main():
    """Run all debug tests."""
    
    print("\n" + "="*70)
    print("ENHANCED DATA COLLECTION - DEBUG SUITE")
    print("="*70)
    
    tests = [
        ("Data File", test_data_file),
        ("API Connection", test_api),
        ("Enhanced Parser", test_parser),
        ("Outcome Logic", test_outcome_logic),
        ("Sample Data", test_sample_data),
    ]
    
    results = []
    
    for name, test_func in tests:
        try:
            passed = test_func()
            results.append((name, passed))
        except Exception as e:
            print(f"\n❌ Test '{name}' crashed: {e}")
            results.append((name, False))
    
    # Summary
    print("\n" + "="*70)
    print("DEBUG SUMMARY")
    print("="*70)
    
    for name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status}: {name}")
    
    all_passed = all(passed for _, passed in results)
    
    if all_passed:
        print("\n✅ ALL TESTS PASSED - System is working correctly!")
        return 0
    else:
        print("\n❌ SOME TESTS FAILED - See details above")
        return 1


if __name__ == "__main__":
    sys.exit(main())
