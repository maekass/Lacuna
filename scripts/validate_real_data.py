"""
Validate Real Data Script
Tests all data sources and identifies synthetic data that needs replacement.
"""

import sys
from pathlib import Path

# Add project root to path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from src.data_collection.real_data_validator import RealDataValidator


def main():
    """Run comprehensive real data validation."""
    
    print("\n" + "="*70)
    print("REAL DATA VALIDATION - Immunology Investment Platform")
    print("="*70)
    print("\nThis script validates that all data comes from real API sources,")
    print("not synthetic generation.\n")
    
    validator = RealDataValidator(data_dir=str(ROOT / "data" / "raw"))
    
    # Test diseases from your platform
    diseases = [
        "sickle cell disease",
        "systemic lupus erythematosus",
        "hidradenitis suppurativa",
        "diabetic nephropathy",
        "autoimmune liver disease",
        "multiple sclerosis",
        "food allergy"
    ]
    
    print(f"Testing {len(diseases)} disease areas...\n")
    
    # Run full validation
    report = validator.run_full_validation(diseases)
    
    # Detailed recommendations
    print("\n" + "="*70)
    print("RECOMMENDATIONS")
    print("="*70)
    
    if report["summary"]["synthetic_data_files"] > 0:
        print("\n⚠️  Action Required: Remove synthetic data files")
        print("\nFiles to remove or regenerate with real data:")
        for file, result in report["csv_validations"].items():
            if not result["is_real_data"]:
                print(f"\n  📁 {file}")
                for issue in result["issues"]:
                    print(f"     - {issue}")
                print("     → Regenerate using ClinicalTrials.gov API")
    
    if report["summary"]["apis_accessible"] < len(diseases):
        print("\n⚠️  API Issues Detected")
        print("\nDiseases with API problems:")
        for disease, result in report["api_tests"].items():
            if not result["api_accessible"]:
                print(f"\n  🔴 {disease}")
                for error in result["errors"]:
                    print(f"     - {error}")
    
    # Success criteria
    print("\n" + "="*70)
    print("VALIDATION CRITERIA")
    print("="*70)
    print(f"\n✓ All APIs accessible: {report['summary']['apis_accessible'] == len(diseases)}")
    print(f"✓ No synthetic data: {report['summary']['synthetic_data_files'] == 0}")
    print(f"✓ Real trials found: {report['summary']['total_trials_found'] > 0}")
    
    # Exit code
    if report["summary"]["synthetic_data_files"] == 0 and report["summary"]["apis_accessible"] == len(diseases):
        print("\n✅ VALIDATION PASSED - All data is real and verified")
        return 0
    else:
        print("\n❌ VALIDATION FAILED - Action required")
        return 1


if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
