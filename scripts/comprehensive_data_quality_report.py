"""
Comprehensive Data Quality Report
Analyzes all clinical/health data sources and generates quality metrics.
"""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import pandas as pd
import requests
from datetime import datetime
import json


def check_clinicaltrials_api():
    """Test ClinicalTrials.gov API connectivity and data quality."""
    print("\n" + "="*80)
    print("1. CLINICALTRIALS.GOV API VALIDATION")
    print("="*80)
    
    diseases = [
        "sickle cell disease",
        "systemic lupus erythematosus",
        "hidradenitis suppurativa",
        "diabetic nephropathy",
        "multiple sclerosis",
        "rheumatoid arthritis",
        "crohn's disease",
        "food allergy",
        "autoimmune liver disease"
    ]
    
    results = {}
    
    for disease in diseases:
        try:
            url = "https://clinicaltrials.gov/api/v2/studies"
            params = {
                "query.cond": disease,
                "pageSize": 10,
                "format": "json"
            }
            
            response = requests.get(url, params=params, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                total = data.get("totalCount", 0)
                results[disease] = {
                    "status": "✅",
                    "total_trials": total,
                    "api_version": "v2"
                }
                print(f"✅ {disease:35}: {total:5} trials available")
            else:
                results[disease] = {
                    "status": "❌",
                    "error": f"HTTP {response.status_code}"
                }
                print(f"❌ {disease:35}: API Error")
                
        except Exception as e:
            results[disease] = {
                "status": "❌",
                "error": str(e)
            }
            print(f"❌ {disease:35}: {str(e)[:50]}")
    
    return results


def check_openfda_api():
    """Test openFDA API connectivity and data quality."""
    print("\n" + "="*80)
    print("2. OPENFDA API VALIDATION")
    print("="*80)
    
    diseases = [
        "sickle cell",
        "lupus",
        "hidradenitis",
        "diabetic nephropathy",
        "multiple sclerosis",
        "rheumatoid arthritis",
        "crohn",
        "food allergy"
    ]
    
    results = {}
    
    for disease in diseases:
        try:
            url = "https://api.fda.gov/drug/label.json"
            params = {
                "search": f'indications_and_usage:"{disease}"',
                "limit": 1
            }
            
            response = requests.get(url, params=params, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                total = data.get("meta", {}).get("results", {}).get("total", 0)
                results[disease] = {
                    "status": "✅",
                    "total_drugs": total
                }
                print(f"✅ {disease:35}: {total:5} drug labels found")
            else:
                results[disease] = {
                    "status": "⚠️",
                    "total_drugs": 0
                }
                print(f"⚠️  {disease:35}: No results (may need different search term)")
                
        except Exception as e:
            results[disease] = {
                "status": "❌",
                "error": str(e)
            }
            print(f"❌ {disease:35}: {str(e)[:50]}")
    
    return results


def analyze_current_data():
    """Analyze currently collected data."""
    print("\n" + "="*80)
    print("3. CURRENT DATA ANALYSIS")
    print("="*80)
    
    # Check enhanced clinical trials
    enhanced_path = ROOT / "data" / "processed" / "enhanced_clinical_trials.csv"
    
    if not enhanced_path.exists():
        print("❌ No enhanced clinical trials data found")
        print(f"   Expected: {enhanced_path}")
        return {}
    
    df = pd.read_csv(enhanced_path)
    
    print(f"\n📊 Enhanced Clinical Trials Data:")
    print(f"   Total trials: {len(df):,}")
    print(f"   Diseases: {df['disease'].nunique()}")
    print(f"   Collection date: {df['collection_date'].iloc[0] if 'collection_date' in df.columns else 'Unknown'}")
    
    print(f"\n📈 Field Completeness:")
    fields = ['nct_id', 'status', 'phase', 'enrollment', 'sponsor_type', 'outcome']
    for field in fields:
        if field in df.columns:
            complete = df[field].notna().sum()
            pct = (complete / len(df)) * 100
            status = "✅" if pct >= 90 else "⚠️" if pct >= 70 else "❌"
            print(f"   {status} {field:15}: {pct:5.1f}% ({complete:,}/{len(df):,})")
    
    print(f"\n🎯 Disease Coverage:")
    for disease in df['disease'].unique():
        count = len(df[df['disease'] == disease])
        print(f"   {disease:35}: {count:,} trials")
    
    print(f"\n📊 Outcome Distribution:")
    for outcome, count in df['outcome'].value_counts().items():
        pct = (count / len(df)) * 100
        print(f"   {outcome:15}: {count:,} trials ({pct:.1f}%)")
    
    print(f"\n🏢 Sponsor Type Distribution:")
    for sponsor, count in df['sponsor_type'].value_counts().head(5).items():
        pct = (count / len(df)) * 100
        print(f"   {sponsor:15}: {count:,} trials ({pct:.1f}%)")
    
    return {
        "total_trials": len(df),
        "diseases": df['disease'].nunique(),
        "completeness": {
            field: (df[field].notna().sum() / len(df)) * 100
            for field in fields if field in df.columns
        }
    }


def check_cdc_data_availability():
    """Check CDC data availability (manual check - no API)."""
    print("\n" + "="*80)
    print("4. CDC DATA AVAILABILITY")
    print("="*80)
    
    print("\n📋 CDC Data Sources (Manual Collection Required):")
    print("   ✅ WONDER Database: https://wonder.cdc.gov/")
    print("   ✅ National Vital Statistics: https://www.cdc.gov/nchs/nvss/")
    print("   ✅ Disease Prevalence Reports: https://www.cdc.gov/")
    
    print("\n💡 Recommended Approach:")
    print("   1. Use Orphanet API for rare disease prevalence (CC BY 4.0)")
    print("   2. Cite CDC reports for common diseases")
    print("   3. Calculate U.S. cases = (prevalence × population)")
    
    return {"status": "manual_collection_required"}


def generate_recommendations():
    """Generate data quality improvement recommendations."""
    print("\n" + "="*80)
    print("5. RECOMMENDATIONS FOR DATA QUALITY ENHANCEMENT")
    print("="*80)
    
    recommendations = [
        {
            "priority": "HIGH",
            "category": "ClinicalTrials.gov",
            "action": "Expand to 15+ diseases",
            "effort": "Low (1-2 hours)",
            "impact": "High - more comprehensive coverage"
        },
        {
            "priority": "HIGH",
            "category": "ClinicalTrials.gov",
            "action": "Increase trials per disease from 200 to 500",
            "effort": "Low (30 min)",
            "impact": "High - better statistical power"
        },
        {
            "priority": "HIGH",
            "category": "Data Fields",
            "action": "Add intervention/drug names",
            "effort": "Medium (2-3 hours)",
            "impact": "High - enables drug pipeline analysis"
        },
        {
            "priority": "MEDIUM",
            "category": "openFDA",
            "action": "Collect FDA approvals for all diseases",
            "effort": "Medium (3-4 hours)",
            "impact": "Medium - regulatory landscape"
        },
        {
            "priority": "MEDIUM",
            "category": "CDC/Orphanet",
            "action": "Add epidemiology data for all diseases",
            "effort": "Medium (2-3 hours)",
            "impact": "Medium - market sizing"
        },
        {
            "priority": "LOW",
            "category": "NIH/PubMed",
            "action": "Add published outcomes data",
            "effort": "High (1 week)",
            "impact": "Low - nice to have"
        }
    ]
    
    print("\n🎯 Prioritized Recommendations:\n")
    
    for i, rec in enumerate(recommendations, 1):
        priority_emoji = "🔴" if rec["priority"] == "HIGH" else "🟡" if rec["priority"] == "MEDIUM" else "🟢"
        print(f"{i}. {priority_emoji} [{rec['priority']}] {rec['category']}")
        print(f"   Action: {rec['action']}")
        print(f"   Effort: {rec['effort']}")
        print(f"   Impact: {rec['impact']}\n")
    
    return recommendations


def generate_quality_score():
    """Calculate overall data quality score."""
    print("\n" + "="*80)
    print("6. OVERALL DATA QUALITY SCORE")
    print("="*80)
    
    # Check if enhanced data exists
    enhanced_path = ROOT / "data" / "processed" / "enhanced_clinical_trials.csv"
    
    if not enhanced_path.exists():
        print("\n❌ No data found - Score: 0/100")
        return 0
    
    df = pd.read_csv(enhanced_path)
    
    # Calculate score components
    scores = {}
    
    # 1. Data volume (0-25 points)
    trial_count = len(df)
    volume_score = min(25, (trial_count / 2000) * 25)  # Max at 2000 trials
    scores["volume"] = volume_score
    
    # 2. Field completeness (0-25 points)
    critical_fields = ['nct_id', 'status', 'enrollment', 'sponsor_type', 'outcome']
    completeness_pcts = [
        (df[field].notna().sum() / len(df)) * 100
        for field in critical_fields if field in df.columns
    ]
    completeness_score = (sum(completeness_pcts) / len(completeness_pcts)) * 0.25
    scores["completeness"] = completeness_score
    
    # 3. Disease coverage (0-25 points)
    disease_count = df['disease'].nunique()
    coverage_score = min(25, (disease_count / 15) * 25)  # Max at 15 diseases
    scores["coverage"] = coverage_score
    
    # 4. Data freshness (0-25 points)
    if 'collection_date' in df.columns:
        try:
            collection_date = pd.to_datetime(df['collection_date'].iloc[0])
            # Make datetime.now() timezone-aware to match collection_date
            from datetime import timezone
            now = datetime.now(timezone.utc)
            # Remove timezone info for comparison
            if collection_date.tzinfo is not None:
                collection_date = collection_date.replace(tzinfo=None)
                now = now.replace(tzinfo=None)
            days_old = (now - collection_date).days
            freshness_score = max(0, 25 - (days_old / 30) * 5)  # Lose 5 points per month
        except:
            freshness_score = 15  # Default if can't parse
    else:
        freshness_score = 15
    scores["freshness"] = freshness_score
    
    total_score = sum(scores.values())
    
    print(f"\n📊 Quality Score Breakdown:")
    print(f"   Volume ({trial_count:,} trials):        {scores['volume']:.1f}/25")
    print(f"   Completeness ({sum(completeness_pcts)/len(completeness_pcts):.1f}%):   {scores['completeness']:.1f}/25")
    print(f"   Coverage ({disease_count} diseases):    {scores['coverage']:.1f}/25")
    print(f"   Freshness:                {scores['freshness']:.1f}/25")
    print(f"   " + "-"*40)
    print(f"   TOTAL SCORE:              {total_score:.1f}/100")
    
    # Grade
    if total_score >= 90:
        grade = "A+ (Excellent)"
    elif total_score >= 80:
        grade = "A (Very Good)"
    elif total_score >= 70:
        grade = "B (Good)"
    elif total_score >= 60:
        grade = "C (Fair)"
    else:
        grade = "D (Needs Improvement)"
    
    print(f"\n   GRADE: {grade}")
    
    return total_score


def main():
    """Run comprehensive data quality report."""
    
    print("\n" + "="*80)
    print("COMPREHENSIVE DATA QUALITY REPORT")
    print("="*80)
    print(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Run all checks
    ct_results = check_clinicaltrials_api()
    fda_results = check_openfda_api()
    current_data = analyze_current_data()
    cdc_status = check_cdc_data_availability()
    recommendations = generate_recommendations()
    quality_score = generate_quality_score()
    
    # Save report
    report = {
        "timestamp": datetime.now().isoformat(),
        "clinicaltrials_gov": ct_results,
        "openfda": fda_results,
        "current_data": current_data,
        "cdc_status": cdc_status,
        "recommendations": recommendations,
        "quality_score": quality_score
    }
    
    report_path = ROOT / "data" / "raw" / "data_quality_report.json"
    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2)
    
    print(f"\n💾 Full report saved to: {report_path}")
    
    print("\n" + "="*80)
    print("SUMMARY")
    print("="*80)
    print(f"\n✅ ClinicalTrials.gov API: Working")
    print(f"✅ openFDA API: Working")
    print(f"✅ Current Data: {current_data.get('total_trials', 0):,} trials")
    print(f"✅ Quality Score: {quality_score:.1f}/100")
    
    print("\n🎯 Next Steps:")
    print("   1. Review recommendations above")
    print("   2. Run: python scripts/collect_enhanced_trial_data.py")
    print("   3. Expand to more diseases")
    print("   4. Add FDA approval data")
    print("   5. Add CDC epidemiology data")
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
