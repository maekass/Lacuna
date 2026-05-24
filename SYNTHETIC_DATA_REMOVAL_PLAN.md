# Synthetic Data Removal Plan

## Problem

The platform currently uses **synthetic data** in several places:

### 🔴 Critical: Trial Success Predictor
- **File**: `data/demo/ml/trial_success_training.csv` (250KB)
- **Source**: `TrialSuccessPredictor._generate_training_data()` 
- **Issue**: Generates 2500 fake trials with made-up features
- **Used by**: Dashboard ML predictions page
- **Impact**: **All trial success predictions are based on fake data**

### 🟡 Medium: Health Market Analysis
- **File**: `src/models/health_market_analysis.py`
- **Method**: `_make_synthetic_health_series()`
- **Issue**: Generates fake health metrics (disease burden, trials, approvals)
- **Used by**: Correlation analysis, event studies
- **Impact**: Health-market correlations are based on fake data

### 🟢 Minor: Demo CSVs
- **Files**: Various `data/demo/*.csv` files
- **Issue**: Some may be manually created examples
- **Impact**: Used for UI demonstration only

---

## Solution: Replace with Real Data

### Step 1: Replace Trial Success Training Data

**Current (Synthetic)**:
```python
# src/models/trial_success_predictor.py
def _generate_training_data(self, n_samples: int = 3000):
    """Generate synthetic training data"""
    # Creates fake trials with random features
```

**New (Real Data)**:
```python
# Use real_data_validator.py to fetch actual trials
from src.models.real_data_validator import RealDataValidator

validator = RealDataValidator()
real_trials = validator.fetch_trials(
    disease="sickle cell disease",
    min_year=2010,
    max_year=2023
)
```

**Implementation**:
1. Modify `TrialSuccessPredictor` to use `RealDataValidator`
2. Fetch real trials from ClinicalTrials.gov
3. Use same features as `real_data_validator.py`
4. Retrain models on real data
5. Update `data/demo/ml/trial_success_training.csv` with real data

---

### Step 2: Replace Synthetic Health Metrics

**Current (Synthetic)**:
```python
def _make_synthetic_health_series(self, n_months: int = 36):
    """Generate synthetic but calibrated monthly health metric time series"""
    # Creates fake disease burden, trials, approvals
```

**New (Real Data)**:
```python
# Use actual CDC data and ClinicalTrials.gov API
from src.data_collection.cdc_nndss import fetch_cdc_data
from src.data_collection.clinical_trials import fetch_trial_counts

def _fetch_real_health_series(self, disease: str, start_date: str):
    """Fetch real health metrics from CDC and ClinicalTrials.gov"""
    # Real disease burden from CDC
    # Real trial counts from ClinicalTrials.gov
    # Real approval counts from FDA
```

**Implementation**:
1. Create new method `_fetch_real_health_series()`
2. Integrate CDC NNDSS data
3. Integrate ClinicalTrials.gov trial counts
4. Integrate FDA approval data
5. Replace all calls to `_make_synthetic_health_series()`

---

### Step 3: Audit All Demo CSVs

**Check each file in `data/demo/`**:
- ✅ Real data: Keep
- ❌ Synthetic: Replace or remove
- ⚠️ Manually created: Document source

**Files to audit**:
```bash
data/demo/
├── cdc_sickle_cell_data.csv          # ✅ Real (from CDC)
├── clinical_trials_scd.csv            # ✅ Real (from ClinicalTrials.gov)
├── fda_approvals_scd.csv              # ✅ Real (from FDA)
├── stock_prices_companies.csv         # ✅ Real (from yfinance)
├── sample_enhanced_trials.csv         # ❌ SYNTHETIC - remove
├── gene_therapy_pipeline.csv          # ⚠️ Manual - verify source
├── market_size_scd.csv                # ⚠️ Manual - verify source
└── ...
```

---

## Implementation Steps

### Phase 1: Replace Trial Success Predictor (CRITICAL)

```bash
# 1. Create new real-data-based predictor
python scripts/create_real_trial_predictor.py

# 2. Retrain on real data
python scripts/retrain_with_real_data.py

# 3. Verify accuracy
python scripts/validate_real_predictor.py

# 4. Update dashboard
# Modify dashboard/app.py to use real predictor
```

### Phase 2: Replace Health Metrics (MEDIUM)

```bash
# 1. Create real health data fetcher
python scripts/fetch_real_health_metrics.py

# 2. Update health_market_analysis.py
# Replace _make_synthetic_health_series()

# 3. Verify correlations
python scripts/validate_health_correlations.py
```

### Phase 3: Audit Demo Data (MINOR)

```bash
# 1. Audit all demo CSVs
python scripts/audit_demo_data.py

# 2. Remove synthetic files
rm data/demo/sample_enhanced_trials.csv

# 3. Document sources
python scripts/document_data_sources.py
```

---

## Expected Outcomes

### Before (Current State)
- ❌ Trial predictions based on 2500 synthetic trials
- ❌ Health metrics are fake random numbers
- ❌ Correlations are meaningless
- ❌ Cannot make honest claims about accuracy

### After (Real Data)
- ✅ Trial predictions based on 877+ real trials
- ✅ Health metrics from CDC, FDA, ClinicalTrials.gov
- ✅ Correlations are scientifically valid
- ✅ Can make honest, defensible claims

---

## Honest Claims

### Current (WRONG)
> "Our ML model predicts trial success with 85% accuracy"
> 
> **Problem**: Trained on synthetic data, meaningless

### After Fix (HONEST)
> "Validated on 877 real clinical trials from ClinicalTrials.gov"
> "Predicts trial completion with 77.9% accuracy (baseline: 80%)"
> "Demonstrates that public data alone is insufficient"
> 
> **Honest**: Acknowledges limitations, shows real validation

---

## Priority

1. **🔴 CRITICAL**: Replace `TrialSuccessPredictor` synthetic data
   - **Why**: This is the core ML claim
   - **Impact**: Affects all trial predictions in dashboard
   - **Timeline**: Do this FIRST

2. **🟡 MEDIUM**: Replace health metrics synthetic data
   - **Why**: Affects correlation analysis
   - **Impact**: Health-market correlations
   - **Timeline**: Do this SECOND

3. **🟢 MINOR**: Audit demo CSVs
   - **Why**: Some may be real, some synthetic
   - **Impact**: Documentation and transparency
   - **Timeline**: Do this LAST

---

## Next Steps

Run this to start:

```bash
# Create the real trial predictor
python scripts/create_real_trial_predictor.py
```

This will:
1. Use `RealDataValidator` to fetch real trials
2. Train on real ClinicalTrials.gov data
3. Replace synthetic training data
4. Update dashboard to use real predictor
5. Generate honest validation report

**Result**: No more synthetic data in ML predictions! 🎉
