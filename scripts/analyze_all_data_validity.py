"""
Comprehensive Data Validity Analysis
Analyzes ALL data files across the entire Streamlit app and calculates validity percentages.
"""

import json
import sys
from pathlib import Path
from collections import defaultdict

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))


def analyze_data_validity():
    """Analyze all data files and calculate validity percentages."""
    
    print("\n" + "="*80)
    print("COMPREHENSIVE DATA VALIDITY ANALYSIS")
    print("="*80)
    
    # Load manifest
    manifest_path = ROOT / "data" / "raw" / "data_manifest.json"
    
    if not manifest_path.exists():
        print("❌ No data manifest found")
        return
    
    with open(manifest_path) as f:
        manifest = json.load(f)
    
    artifacts = manifest.get("artifacts", {})
    
    # Categorize files
    categories = {
        "sourced_public": [],
        "sourced_public_delayed": [],
        "illustrative": [],
        "mixed": [],
        "unknown": []
    }
    
    for filename, meta in artifacts.items():
        kind = meta.get("kind", "unknown")
        tier = meta.get("tier", "")
        
        if kind == "sourced_public":
            if tier == "mixed":
                categories["mixed"].append(filename)
            else:
                categories["sourced_public"].append(filename)
        elif kind == "sourced_public_delayed":
            categories["sourced_public_delayed"].append(filename)
        elif kind == "illustrative":
            categories["illustrative"].append(filename)
        else:
            categories["unknown"].append(filename)
    
    # Calculate totals
    total_files = len(artifacts)
    real_files = len(categories["sourced_public"]) + len(categories["sourced_public_delayed"])
    synthetic_files = len(categories["illustrative"])
    mixed_files = len(categories["mixed"])
    
    real_percentage = (real_files / total_files * 100) if total_files > 0 else 0
    synthetic_percentage = (synthetic_files / total_files * 100) if total_files > 0 else 0
    mixed_percentage = (mixed_files / total_files * 100) if total_files > 0 else 0
    
    # Print summary
    print(f"\n📊 OVERALL STATISTICS")
    print(f"{'='*80}")
    print(f"Total Data Files: {total_files}")
    print(f"")
    print(f"✅ Real Data Files: {real_files} ({real_percentage:.1f}%)")
    print(f"❌ Synthetic Data Files: {synthetic_files} ({synthetic_percentage:.1f}%)")
    print(f"⚠️  Mixed Data Files: {mixed_files} ({mixed_percentage:.1f}%)")
    
    # Print by category
    print(f"\n📁 BREAKDOWN BY CATEGORY")
    print(f"{'='*80}")
    
    print(f"\n✅ REAL DATA - Sourced from Public APIs ({len(categories['sourced_public'])} files):")
    for f in sorted(categories["sourced_public"]):
        source = artifacts[f].get("source_summary", "")
        print(f"  • {f}")
        print(f"    └─ {source}")
    
    print(f"\n✅ REAL DATA - Sourced with Delay ({len(categories['sourced_public_delayed'])} files):")
    for f in sorted(categories["sourced_public_delayed"]):
        source = artifacts[f].get("source_summary", "")
        print(f"  • {f}")
        print(f"    └─ {source}")
    
    print(f"\n⚠️  MIXED DATA - Partially Real ({len(categories['mixed'])} files):")
    for f in sorted(categories["mixed"]):
        source = artifacts[f].get("source_summary", "")
        print(f"  • {f}")
        print(f"    └─ {source}")
    
    print(f"\n❌ SYNTHETIC DATA - Illustrative/Demo ({len(categories['illustrative'])} files):")
    for f in sorted(categories["illustrative"]):
        source = artifacts[f].get("source_summary", "")
        print(f"  • {f}")
        print(f"    └─ {source}")
    
    # Identify what needs to be replaced
    print(f"\n🎯 ACTION ITEMS")
    print(f"{'='*80}")
    
    needs_replacement = []
    
    # Group synthetic files by type
    synthetic_by_type = defaultdict(list)
    for f in categories["illustrative"]:
        if "pipeline" in f:
            synthetic_by_type["Pipeline Data"].append(f)
        elif "deal" in f or "vc" in f or "equity" in f:
            synthetic_by_type["Investment/Deal Data"].append(f)
        elif "market_size" in f:
            synthetic_by_type["Market Size Data"].append(f)
        elif "pharma" in f or "competitive" in f:
            synthetic_by_type["Competitive/Company Data"].append(f)
        elif "regulatory" in f:
            synthetic_by_type["Regulatory Data"].append(f)
        elif "investment_attractiveness" in f:
            synthetic_by_type["Investment Scoring Data"].append(f)
        else:
            synthetic_by_type["Other"].append(f)
    
    for data_type, files in synthetic_by_type.items():
        print(f"\n{data_type} ({len(files)} files):")
        for f in files:
            print(f"  ❌ {f}")
        
        # Suggest replacement source
        if "Pipeline" in data_type:
            print(f"  💡 Replace with: ClinicalTrials.gov API + company SEC filings")
        elif "Investment/Deal" in data_type:
            print(f"  💡 Replace with: SEC EDGAR filings + press releases")
        elif "Market Size" in data_type:
            print(f"  💡 Replace with: CDC prevalence data + market research reports")
        elif "Competitive" in data_type:
            print(f"  💡 Replace with: Company SEC filings + ClinicalTrials.gov")
        elif "Regulatory" in data_type:
            print(f"  💡 Replace with: FDA.gov + openFDA API")
        elif "Investment Scoring" in data_type:
            print(f"  💡 Replace with: Calculated metrics from real data sources")
    
    # Save detailed report
    report = {
        "timestamp": manifest.get("last_manifest_write_utc"),
        "total_files": total_files,
        "real_files": real_files,
        "synthetic_files": synthetic_files,
        "mixed_files": mixed_files,
        "real_percentage": round(real_percentage, 2),
        "synthetic_percentage": round(synthetic_percentage, 2),
        "mixed_percentage": round(mixed_percentage, 2),
        "categories": {
            "sourced_public": categories["sourced_public"],
            "sourced_public_delayed": categories["sourced_public_delayed"],
            "mixed": categories["mixed"],
            "illustrative": categories["illustrative"]
        },
        "replacement_needed": list(categories["illustrative"])
    }
    
    report_path = ROOT / "data" / "raw" / "data_validity_report.json"
    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2)
    
    print(f"\n📄 Detailed report saved to: {report_path}")
    
    # Final summary
    print(f"\n{'='*80}")
    print(f"SUMMARY")
    print(f"{'='*80}")
    print(f"Current Data Validity: {real_percentage:.1f}% real data")
    print(f"Target: 100% real data")
    print(f"Files to Replace: {synthetic_files}")
    print(f"")
    print(f"Next Steps:")
    print(f"1. Replace {synthetic_files} synthetic files with real data sources")
    print(f"2. Update {mixed_files} mixed files to be fully sourced")
    print(f"3. Document all data collection methods")
    print(f"4. Re-run validation to confirm 100% real data")
    
    return report


if __name__ == "__main__":
    analyze_data_validity()
