"""
Automated Verification System
Runs continuous data quality checks and alerts on issues.
"""

import sys
from pathlib import Path
from datetime import datetime, timezone
import json

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import pandas as pd
import requests
from src.models.real_data_validator import RealDataValidator


class AutomatedVerification:
    """Automated verification system for continuous monitoring."""
    
    def __init__(self):
        self.validator = RealDataValidator()
        self.results = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "checks": {},
            "status": "UNKNOWN",
            "alerts": []
        }
    
    def check_api_health(self) -> bool:
        """Check if ClinicalTrials.gov API is healthy."""
        print("\n🔍 Checking API health...")
        
        try:
            url = "https://clinicaltrials.gov/api/v2/studies"
            params = {"query.cond": "cancer", "pageSize": 1}
            response = requests.get(url, params=params, timeout=10)
            
            if response.status_code == 200:
                print("✅ API is healthy")
                self.results["checks"]["api_health"] = {
                    "status": "PASS",
                    "response_time_ms": response.elapsed.total_seconds() * 1000
                }
                return True
            else:
                print(f"❌ API returned {response.status_code}")
                self.results["checks"]["api_health"] = {
                    "status": "FAIL",
                    "error": f"HTTP {response.status_code}"
                }
                self.results["alerts"].append(f"API health check failed: HTTP {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ API check failed: {e}")
            self.results["checks"]["api_health"] = {
                "status": "FAIL",
                "error": str(e)
            }
            self.results["alerts"].append(f"API health check failed: {e}")
            return False
    
    def check_data_quality(self) -> bool:
        """Check data quality thresholds."""
        print("\n🔍 Checking data quality...")
        
        data_path = ROOT / "data" / "processed" / "enhanced_clinical_trials.csv"
        
        if not data_path.exists():
            print("⚠️  Data file not found")
            self.results["checks"]["data_quality"] = {
                "status": "SKIP",
                "reason": "Data file not found"
            }
            return True  # Not a failure, just skip
        
        try:
            df = pd.read_csv(data_path)
            
            # Check for empty dataframe
            if len(df) == 0:
                print("❌ Data file is empty")
                self.results["checks"]["data_quality"] = {
                    "status": "FAIL",
                    "error": "Empty dataframe"
                }
                self.results["alerts"].append("Data file is empty")
                return False
            
            # Define quality thresholds
            thresholds = {
                'nct_id': 100.0,
                'status': 100.0,
                'sponsor_type': 100.0,
                'outcome': 100.0,
                'enrollment': 95.0,
            }
            
            quality_results = {}
            all_passed = True
            
            for field, min_pct in thresholds.items():
                if field not in df.columns:
                    quality_results[field] = {
                        "status": "MISSING",
                        "completeness": 0.0
                    }
                    all_passed = False
                    self.results["alerts"].append(f"Missing field: {field}")
                    continue
                
                non_null = df[field].notna().sum()
                pct = (non_null / len(df)) * 100
                
                passed = pct >= min_pct
                quality_results[field] = {
                    "status": "PASS" if passed else "FAIL",
                    "completeness": round(pct, 2),
                    "threshold": min_pct
                }
                
                if not passed:
                    all_passed = False
                    self.results["alerts"].append(
                        f"Data quality below threshold: {field} = {pct:.1f}% < {min_pct}%"
                    )
                    print(f"❌ {field}: {pct:.1f}% < {min_pct}%")
                else:
                    print(f"✅ {field}: {pct:.1f}%")
            
            self.results["checks"]["data_quality"] = {
                "status": "PASS" if all_passed else "FAIL",
                "fields": quality_results,
                "total_rows": len(df)
            }
            
            return all_passed
            
        except Exception as e:
            print(f"❌ Data quality check failed: {e}")
            self.results["checks"]["data_quality"] = {
                "status": "FAIL",
                "error": str(e)
            }
            self.results["alerts"].append(f"Data quality check failed: {e}")
            return False
    
    def check_data_freshness(self) -> bool:
        """Check if data is recent."""
        print("\n🔍 Checking data freshness...")
        
        data_path = ROOT / "data" / "processed" / "enhanced_clinical_trials.csv"
        
        if not data_path.exists():
            self.results["checks"]["data_freshness"] = {
                "status": "SKIP",
                "reason": "Data file not found"
            }
            return True
        
        try:
            df = pd.read_csv(data_path)
            
            if 'collection_date' not in df.columns:
                print("⚠️  No collection_date field")
                self.results["checks"]["data_freshness"] = {
                    "status": "SKIP",
                    "reason": "No collection_date field"
                }
                return True
            
            collection_dates = pd.to_datetime(df['collection_date'], errors='coerce')
            latest = collection_dates.max()
            
            # Check if we have valid dates
            if pd.isna(latest):
                print("⚠️  No valid collection dates found")
                self.results["checks"]["data_freshness"] = {
                    "status": "SKIP",
                    "reason": "No valid collection dates"
                }
                return True
            
            age_days = (datetime.now(timezone.utc) - latest).days
            
            # Warn if older than 30 days
            if age_days > 30:
                print(f"⚠️  Data is {age_days} days old")
                self.results["checks"]["data_freshness"] = {
                    "status": "WARN",
                    "age_days": age_days,
                    "latest_collection": latest.isoformat()
                }
                self.results["alerts"].append(
                    f"Data is {age_days} days old - consider refreshing"
                )
            else:
                print(f"✅ Data is fresh ({age_days} days old)")
                self.results["checks"]["data_freshness"] = {
                    "status": "PASS",
                    "age_days": age_days,
                    "latest_collection": latest.isoformat()
                }
            
            return True
            
        except Exception as e:
            print(f"❌ Freshness check failed: {e}")
            self.results["checks"]["data_freshness"] = {
                "status": "FAIL",
                "error": str(e)
            }
            return False
    
    def check_no_synthetic_data(self) -> bool:
        """Check for synthetic data markers."""
        print("\n🔍 Checking for synthetic data...")
        
        manifest_path = ROOT / "data" / "raw" / "data_manifest.json"
        
        if not manifest_path.exists():
            self.results["checks"]["synthetic_data"] = {
                "status": "SKIP",
                "reason": "No manifest file"
            }
            return True
        
        try:
            with open(manifest_path) as f:
                manifest = json.load(f)
            
            synthetic_files = []
            
            # Handle new manifest format with "artifacts" key
            artifacts = manifest.get('artifacts', manifest)
            
            for file, meta in artifacts.items():
                if isinstance(meta, dict) and meta.get('kind') == 'illustrative':
                    synthetic_files.append(file)
            
            if synthetic_files:
                print(f"❌ Found {len(synthetic_files)} synthetic data file(s)")
                self.results["checks"]["synthetic_data"] = {
                    "status": "FAIL",
                    "synthetic_files": synthetic_files
                }
                self.results["alerts"].append(
                    f"Synthetic data detected: {len(synthetic_files)} file(s)"
                )
                return False
            else:
                print("✅ No synthetic data detected")
                self.results["checks"]["synthetic_data"] = {
                    "status": "PASS",
                    "synthetic_files": []
                }
                return True
                
        except Exception as e:
            print(f"❌ Synthetic data check failed: {e}")
            self.results["checks"]["synthetic_data"] = {
                "status": "FAIL",
                "error": str(e)
            }
            return False
    
    def run_all_checks(self) -> bool:
        """Run all verification checks."""
        print("\n" + "="*70)
        print("AUTOMATED VERIFICATION SYSTEM")
        print("="*70)
        print(f"Timestamp: {self.results['timestamp']}")
        
        checks = [
            ("API Health", self.check_api_health),
            ("Data Quality", self.check_data_quality),
            ("Data Freshness", self.check_data_freshness),
            ("Synthetic Data", self.check_no_synthetic_data),
        ]
        
        all_passed = True
        
        for name, check_func in checks:
            try:
                passed = check_func()
                if not passed:
                    all_passed = False
            except Exception as e:
                print(f"\n❌ {name} check crashed: {e}")
                check_key = name.lower().replace(" ", "_")
                self.results["checks"][check_key] = {
                    "status": "FAIL",
                    "error": f"Check crashed: {str(e)}"
                }
                self.results["alerts"].append(f"{name} check crashed: {e}")
                all_passed = False
        
        # Set overall status
        if all_passed:
            self.results["status"] = "PASS"
        elif self.results["alerts"]:
            self.results["status"] = "FAIL"
        else:
            self.results["status"] = "WARN"
        
        # Save results
        self.save_results()
        
        # Print summary
        self.print_summary()
        
        return all_passed
    
    def save_results(self):
        """Save verification results to file."""
        output_path = ROOT / "data" / "raw" / "automated_verification.json"
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_path, 'w') as f:
            json.dump(self.results, f, indent=2)
        
        print(f"\n📄 Results saved to: {output_path}")
    
    def print_summary(self):
        """Print verification summary."""
        print("\n" + "="*70)
        print("VERIFICATION SUMMARY")
        print("="*70)
        
        for check_name, check_result in self.results["checks"].items():
            status = check_result.get("status", "UNKNOWN")
            icon = {
                "PASS": "✅",
                "FAIL": "❌",
                "WARN": "⚠️",
                "SKIP": "⏭️",
                "UNKNOWN": "❓"
            }.get(status, "❓")
            
            print(f"{icon} {check_name:20}: {status}")
        
        print(f"\n{'='*70}")
        
        if self.results["status"] == "PASS":
            print("✅ ALL CHECKS PASSED")
        elif self.results["status"] == "FAIL":
            print("❌ VERIFICATION FAILED")
            if self.results["alerts"]:
                print(f"\nAlerts ({len(self.results['alerts'])}):")
                for alert in self.results["alerts"]:
                    print(f"  • {alert}")
        else:
            print("⚠️  VERIFICATION COMPLETED WITH WARNINGS")
            if self.results["alerts"]:
                print(f"\nWarnings ({len(self.results['alerts'])}):")
                for alert in self.results["alerts"]:
                    print(f"  • {alert}")


def main():
    """Run automated verification."""
    verifier = AutomatedVerification()
    passed = verifier.run_all_checks()
    
    return 0 if passed else 1


if __name__ == "__main__":
    sys.exit(main())
