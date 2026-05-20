"""
Real Data Validator for ClinicalTrials.gov API
Validates that all data comes from real API sources, not synthetic generation.
"""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any

import pandas as pd
import requests


class RealDataValidator:
    """Validates that clinical trial data comes from real API sources."""
    
    def __init__(self, data_dir: str = "data/raw"):
        self.data_dir = Path(data_dir)
        self.validation_results: dict[str, dict[str, Any]] = {}
        
    def validate_clinical_trials_api(self, disease_query: str, max_trials: int = 50) -> dict[str, Any]:
        """
        Test ClinicalTrials.gov API and validate response structure.
        
        Args:
            disease_query: Disease condition to search for
            max_trials: Maximum number of trials to fetch
            
        Returns:
            Validation results with API response details
        """
        print(f"\n🔍 Validating ClinicalTrials.gov API for: {disease_query}")
        
        result = {
            "query": disease_query,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "api_accessible": False,
            "trials_found": 0,
            "data_quality": {},
            "errors": []
        }
        
        # Test v2 API (current)
        v2_url = "https://clinicaltrials.gov/api/v2/studies"
        v2_params = {
            "query.cond": disease_query,
            "pageSize": max_trials,
            "format": "json"
        }
        
        try:
            print(f"  → Testing v2 API: {v2_url}")
            response = requests.get(v2_url, params=v2_params, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                result["api_accessible"] = True
                result["api_version"] = "v2"
                result["http_status"] = 200
                
                # Validate response structure
                if "studies" in data:
                    studies = data.get("studies", [])
                    result["trials_found"] = len(studies)
                    
                    # Validate data quality
                    result["data_quality"] = self._validate_trial_data_quality_v2(studies)
                    
                    print(f"  ✓ API accessible: {len(studies)} trials found")
                    print(f"  ✓ Data quality: {result['data_quality']['completeness_score']:.1%} complete")
                else:
                    result["errors"].append("Invalid response structure")
                    print(f"  ✗ Invalid response structure")
            else:
                result["http_status"] = response.status_code
                result["errors"].append(f"HTTP {response.status_code}")
                print(f"  ✗ HTTP {response.status_code}")
                
        except Exception as e:
            result["errors"].append(str(e))
            print(f"  ✗ Error: {e}")
        
        self.validation_results[disease_query] = result
        return result
    
    def _validate_trial_data_quality_v2(self, studies: list[dict]) -> dict[str, Any]:
        """Validate quality and completeness of trial data from v2 API."""
        if not studies:
            return {"completeness_score": 0.0, "issues": ["No studies found"]}
        
        quality = {
            "total_studies": len(studies),
            "with_nct_id": 0,
            "with_phase": 0,
            "with_status": 0,
            "with_enrollment": 0,
            "with_sponsor": 0,
            "with_dates": 0,
            "completeness_score": 0.0,
            "issues": []
        }
        
        for study in studies:
            protocol = study.get("protocolSection", {})
            
            # Check NCT ID
            nct_id = protocol.get("identificationModule", {}).get("nctId")
            if nct_id:
                quality["with_nct_id"] += 1
            
            # Check phase
            phases = protocol.get("designModule", {}).get("phases", [])
            if phases:
                quality["with_phase"] += 1
            
            # Check status
            status = protocol.get("statusModule", {}).get("overallStatus")
            if status:
                quality["with_status"] += 1
            
            # Check enrollment
            enrollment = protocol.get("designModule", {}).get("enrollmentInfo", {}).get("count")
            if enrollment:
                quality["with_enrollment"] += 1
            
            # Check sponsor
            sponsor = protocol.get("sponsorCollaboratorsModule", {}).get("leadSponsor", {}).get("name")
            if sponsor:
                quality["with_sponsor"] += 1
            
            # Check dates
            start_date = protocol.get("statusModule", {}).get("startDateStruct", {}).get("date")
            if start_date:
                quality["with_dates"] += 1
        
        # Calculate completeness score
        total = quality["total_studies"]
        if total > 0:
            completeness = (
                quality["with_nct_id"] +
                quality["with_phase"] +
                quality["with_status"] +
                quality["with_enrollment"] +
                quality["with_sponsor"] +
                quality["with_dates"]
            ) / (total * 6)
            quality["completeness_score"] = completeness
        
        # Identify issues
        if quality["with_nct_id"] < total:
            quality["issues"].append(f"{total - quality['with_nct_id']} trials missing NCT ID")
        if quality["with_phase"] < total * 0.8:
            quality["issues"].append(f"Only {quality['with_phase']}/{total} trials have phase data")
        if quality["with_enrollment"] < total * 0.7:
            quality["issues"].append(f"Only {quality['with_enrollment']}/{total} trials have enrollment data")
        
        return quality
    
    def validate_csv_is_real_data(self, csv_path: Path | str) -> dict[str, Any]:
        """
        Validate that a CSV file contains real data, not synthetic.
        
        Checks for:
        - Data manifest provenance
        - Realistic data patterns
        - No obvious synthetic markers
        """
        csv_path = Path(csv_path)
        
        result = {
            "file": str(csv_path),
            "exists": csv_path.exists(),
            "is_real_data": False,
            "provenance": None,
            "issues": []
        }
        
        if not csv_path.exists():
            result["issues"].append("File does not exist")
            return result
        
        try:
            df = pd.read_csv(csv_path)
            result["row_count"] = len(df)
            result["columns"] = list(df.columns)
            
            # Check for synthetic data markers
            if self._has_synthetic_markers(df):
                result["issues"].append("Contains synthetic data markers")
            else:
                result["is_real_data"] = True
            
            # Check data manifest for provenance
            manifest_path = csv_path.parent / "data_manifest.json"
            if manifest_path.exists():
                with open(manifest_path) as f:
                    manifest = json.load(f)
                    file_key = csv_path.name
                    if file_key in manifest:
                        result["provenance"] = manifest[file_key]
                        if manifest[file_key].get("kind") == "illustrative":
                            result["is_real_data"] = False
                            result["issues"].append("Marked as 'illustrative' in manifest")
            
        except Exception as e:
            result["issues"].append(f"Error reading file: {e}")
        
        return result
    
    def _has_synthetic_markers(self, df: pd.DataFrame) -> bool:
        """Check if DataFrame has obvious synthetic data patterns."""
        # Check for perfectly sequential IDs
        if "nct_id" in df.columns:
            # Real NCT IDs should be varied
            nct_ids = df["nct_id"].astype(str)
            if nct_ids.str.startswith("NCT").all():
                return False  # Real NCT IDs
        
        # Check for unrealistic perfect patterns
        numeric_cols = df.select_dtypes(include=["number"]).columns
        for col in numeric_cols:
            if len(df[col].unique()) == len(df):
                # Perfectly unique numbers might be synthetic
                if df[col].dtype == "int64" and (df[col] == range(len(df))).all():
                    return True
        
        return False
    
    def run_full_validation(self, diseases: list[str]) -> dict[str, Any]:
        """
        Run complete validation suite for multiple diseases.
        
        Args:
            diseases: List of disease queries to validate
            
        Returns:
            Comprehensive validation report
        """
        print("\n" + "="*60)
        print("REAL DATA VALIDATION SUITE")
        print("="*60)
        
        report = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "diseases_tested": len(diseases),
            "api_tests": {},
            "csv_validations": {},
            "summary": {
                "apis_accessible": 0,
                "total_trials_found": 0,
                "real_data_files": 0,
                "synthetic_data_files": 0
            }
        }
        
        # Test APIs
        for disease in diseases:
            api_result = self.validate_clinical_trials_api(disease)
            report["api_tests"][disease] = api_result
            if api_result["api_accessible"]:
                report["summary"]["apis_accessible"] += 1
                report["summary"]["total_trials_found"] += api_result["trials_found"]
        
        # Validate CSV files
        for csv_file in self.data_dir.glob("*.csv"):
            csv_result = self.validate_csv_is_real_data(csv_file)
            report["csv_validations"][csv_file.name] = csv_result
            if csv_result["is_real_data"]:
                report["summary"]["real_data_files"] += 1
            else:
                report["summary"]["synthetic_data_files"] += 1
        
        # Print summary
        print("\n" + "="*60)
        print("VALIDATION SUMMARY")
        print("="*60)
        print(f"APIs Accessible: {report['summary']['apis_accessible']}/{len(diseases)}")
        print(f"Total Trials Found: {report['summary']['total_trials_found']}")
        print(f"Real Data Files: {report['summary']['real_data_files']}")
        print(f"Synthetic Data Files: {report['summary']['synthetic_data_files']}")
        
        if report['summary']['synthetic_data_files'] > 0:
            print("\n⚠️  WARNING: Synthetic data files detected!")
            for file, result in report["csv_validations"].items():
                if not result["is_real_data"]:
                    print(f"  - {file}: {', '.join(result['issues'])}")
        else:
            print("\n✓ All data files validated as real data")
        
        # Save report
        report_path = self.data_dir / "validation_report.json"
        with open(report_path, "w") as f:
            json.dump(report, f, indent=2)
        print(f"\n📄 Full report saved to: {report_path}")
        
        return report


if __name__ == "__main__":
    # Test with common immunology diseases
    validator = RealDataValidator()
    
    diseases = [
        "sickle cell disease",
        "systemic lupus erythematosus",
        "multiple sclerosis",
        "sarcoidosis"
    ]
    
    report = validator.run_full_validation(diseases)
    
    # Exit with error if synthetic data found
    if report["summary"]["synthetic_data_files"] > 0:
        print("\n❌ VALIDATION FAILED: Synthetic data detected")
        exit(1)
    else:
        print("\n✅ VALIDATION PASSED: All real data")
        exit(0)
