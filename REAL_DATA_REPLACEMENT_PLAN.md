# Real Data Replacement Plan
**Goal:** Replace illustrative files with real data where feasible, remove VC/PE files

---

## 📊 Current 14 Illustrative Files - Action Plan

### ✅ EASY WINS - Replace with Real Data (4 files, 1-2 weeks)

#### 1. `market_size_scd.csv` ⭐ START HERE
**Feasibility:** ✅ Very Easy  
**Time:** 1 week  
**Quality:** 90-95%

**Real Data Sources:**
- **CDC Wonder Database** (FREE) - Disease prevalence
- **CMS Data** (FREE) - Medicare reimbursement rates
- **Census Bureau** (FREE) - U.S. population data

**Calculation:**
```python
# Market Size = Prevalence × Population × Average Cost
# Example for SCD:
prevalence = 30 per 100,000  # CDC data
us_population = 330,000,000
patients = (prevalence / 100000) * us_population = 99,000

avg_annual_cost = 10000  # CMS data
market_size = patients * avg_annual_cost = $990M
```

**Script to create:** `scripts/collect_market_size.py`

---

#### 2. `regulatory_landscape_scd.csv` ⭐ START HERE
**Feasibility:** ✅ Very Easy  
**Time:** 1 week  
**Quality:** 95-100%

**Real Data Sources:**
- **FDA.gov** (FREE) - Approval timelines, designations
- **openFDA API** (FREE) - Drug approvals, labels
- **ClinicalTrials.gov** (FREE) - Trial phases

**Data to collect:**
```python
{
    'drug_name': 'Oxbryta',
    'approval_date': '2019-11-25',
    'designation': 'Breakthrough Therapy',
    'orphan_drug': True,
    'fast_track': True,
    'approval_time_months': 10,
    'indication': 'Sickle Cell Disease'
}
```

**Script to create:** `scripts/collect_regulatory_data.py`

---

#### 3. `investment_attractiveness_scd.csv`
**Feasibility:** ✅ Easy  
**Time:** 1 week (after other data collected)  
**Quality:** 100% (calculated)

**Approach:** Calculate scores from real data
```python
score = weighted_average([
    trial_count_score,        # from ClinicalTrials.gov
    phase_distribution_score, # from ClinicalTrials.gov
    market_size_score,        # from CDC/CMS (above)
    approval_count_score,     # from openFDA (above)
    company_count_score,      # from SEC EDGAR
])
```

**Script to create:** `scripts/calculate_investment_scores.py`

---

#### 4. `stage_returns_analysis.csv`
**Feasibility:** ✅ Easy  
**Time:** 1 week  
**Quality:** 100% (calculated from public data)

**Real Data Sources:**
- Historical biotech IPO data (public)
- Public M&A transactions (SEC 8-K)
- Stock price data (Yahoo Finance)

**Script to create:** `scripts/calculate_stage_returns.py`

---

### ✅ MEDIUM EFFORT - Replace with Real Data (5 files, 2-3 weeks)

#### 5-7. Pipeline Files (3 files)
- `gene_therapy_pipeline_scd.csv`
- `pipeline_sle.csv`
- `pipeline_sarc.csv`

**Feasibility:** ✅ Medium  
**Time:** 2-3 weeks  
**Quality:** 80-90%

**Real Data Sources:**
- **ClinicalTrials.gov API** (FREE) - Active trials by company
- **SEC EDGAR** (FREE) - Company 10-K/10-Q pipeline disclosures
- **Company IR sites** (FREE) - Pipeline presentations

**Data to collect:**
```python
{
    'company': 'Vertex Pharmaceuticals',
    'drug_name': 'CTX001',
    'mechanism': 'CRISPR gene editing',
    'phase': 'Phase 3',
    'indication': 'Sickle Cell Disease',
    'enrollment': 45,
    'nct_id': 'NCT03655678',
    'status': 'Recruiting'
}
```

**Script to create:** `scripts/collect_pipeline_data.py`

---

#### 8. `precision_medicine_pipeline.csv`
**Feasibility:** ✅ Medium  
**Time:** 2-3 weeks  
**Quality:** 80-90%

**Real Data Sources:**
- ClinicalTrials.gov (gene therapy trials)
- Company disclosures
- Published research

**Script to create:** `scripts/collect_precision_medicine.py`

---

#### 9. `public_equity_companies_scd.csv`
**Feasibility:** ✅ Medium  
**Time:** 2-3 weeks  
**Quality:** 80-90%

**Real Data Sources:**
- **Yahoo Finance API** (FREE) - Stock prices, market cap
- **SEC EDGAR** (FREE) - Company financials
- **ClinicalTrials.gov** (FREE) - Company pipelines

**Data to collect:**
```python
{
    'ticker': 'VRTX',
    'company': 'Vertex Pharmaceuticals',
    'market_cap': 115_000_000_000,
    'revenue': 9_200_000_000,
    'rd_spending': 3_100_000_000,
    'scd_trials': 3,
    'stock_price': 450.25
}
```

**Script to create:** `scripts/collect_public_companies.py`

---

#### 10. `large_pharma_investments_scd.csv`
**Feasibility:** ✅ Medium  
**Time:** 2-3 weeks  
**Quality:** 80-90%

**Real Data Sources:**
- SEC EDGAR 10-K filings (R&D spending by therapeutic area)
- Company earnings calls
- ClinicalTrials.gov (trials by sponsor)

**Script to create:** `scripts/collect_pharma_investments.py`

---

#### 11. `competitive_landscape_scd.csv`
**Feasibility:** ✅ Medium  
**Time:** 2-3 weeks  
**Quality:** 80-90%

**Real Data Sources:**
- ClinicalTrials.gov (trials by company)
- SEC EDGAR (company disclosures)
- FDA approvals (openFDA)

**Script to create:** `scripts/collect_competitive_landscape.py`

---

### ⚠️ PARTIAL - Public M&A Only (1 file)

#### 12. `deal_flow_scd.csv`
**Feasibility:** ⚠️ Partial  
**Time:** 2-3 weeks  
**Quality:** 60-70% (public deals only)

**Real Data Sources (Public M&A only):**
- **SEC 8-K filings** (FREE) - Public company acquisitions
- **Press releases** (FREE) - Deal announcements

**What you CAN get:**
- Public company M&A (100% coverage)
- Deal size, date, acquirer, target

**What you CANNOT get:**
- Private VC/PE deals (requires PitchBook/Crunchbase)
- Valuations for private companies
- Investor details

**Recommendation:** 
- Rename to `public_ma_deals_scd.csv`
- Focus on public M&A only
- Be transparent about limitations

**Script to create:** `scripts/collect_public_ma.py`

---

### ❌ REMOVE - Cannot Replace (2 files)

#### 13. `vc_deals_scd.csv` ❌ REMOVE
**Feasibility:** ❌ No (requires paid data)  
**Reason:** Private VC deal data requires PitchBook ($20k-50k/year)

**Free alternatives only give ~40% coverage:**
- SEC Form D (partial)
- Press releases (incomplete)

**Recommendation:** **DELETE THIS FILE**
- Cannot get quality data for free
- Misleading to show incomplete data
- Remove VC section from dashboard

---

#### 14. `growth_equity_deals_scd.csv` ❌ REMOVE
**Feasibility:** ❌ No (requires paid data)  
**Reason:** Private growth equity data requires paid databases

**Recommendation:** **DELETE THIS FILE**
- Same issues as VC deals
- Remove growth equity section from dashboard

---

## 📋 Implementation Plan

### Phase 1: Quick Wins (Week 1)
**Goal:** Replace 4 easiest files

**Day 1-2:**
```bash
# Create market size data
python scripts/collect_market_size.py
# Output: data/raw/market_size_scd.csv (REAL DATA)
```

**Day 3-4:**
```bash
# Create regulatory landscape
python scripts/collect_regulatory_data.py
# Output: data/raw/regulatory_landscape_scd.csv (REAL DATA)
```

**Day 5:**
```bash
# Calculate investment scores
python scripts/calculate_investment_scores.py
# Output: data/raw/investment_attractiveness_scd.csv (REAL DATA)

# Calculate stage returns
python scripts/calculate_stage_returns.py
# Output: data/raw/stage_returns_analysis.csv (REAL DATA)
```

**Result:** 4/14 files replaced with real data (29%)

---

### Phase 2: Pipeline Data (Week 2-3)
**Goal:** Replace pipeline files

**Week 2:**
```bash
# Collect gene therapy pipeline
python scripts/collect_pipeline_data.py --disease scd --type gene-therapy
# Output: data/raw/gene_therapy_pipeline_scd.csv (REAL DATA)

# Collect SLE pipeline
python scripts/collect_pipeline_data.py --disease sle
# Output: data/raw/pipeline_sle.csv (REAL DATA)
```

**Week 3:**
```bash
# Collect SARC pipeline
python scripts/collect_pipeline_data.py --disease sarc
# Output: data/raw/pipeline_sarc.csv (REAL DATA)

# Collect precision medicine
python scripts/collect_precision_medicine.py
# Output: data/raw/precision_medicine_pipeline.csv (REAL DATA)
```

**Result:** 8/14 files replaced (57%)

---

### Phase 3: Company/Competitive Data (Week 4-5)
**Goal:** Replace company and competitive files

**Week 4:**
```bash
# Collect public companies
python scripts/collect_public_companies.py
# Output: data/raw/public_equity_companies_scd.csv (REAL DATA)

# Collect pharma investments
python scripts/collect_pharma_investments.py
# Output: data/raw/large_pharma_investments_scd.csv (REAL DATA)
```

**Week 5:**
```bash
# Collect competitive landscape
python scripts/collect_competitive_landscape.py
# Output: data/raw/competitive_landscape_scd.csv (REAL DATA)

# Collect public M&A (partial)
python scripts/collect_public_ma.py
# Output: data/raw/public_ma_deals_scd.csv (REAL DATA - public only)
```

**Result:** 11/14 files replaced (79%)

---

### Phase 4: Cleanup (Week 6)
**Goal:** Remove VC/PE files, update dashboard

**Actions:**
```bash
# Remove VC/PE files
rm data/raw/vc_deals_scd.csv
rm data/raw/growth_equity_deals_scd.csv
rm data/demo/vc_deals_scd.csv
rm data/demo/growth_equity_deals_scd.csv

# Update data manifest
python scripts/update_manifest.py --remove vc_deals growth_equity_deals

# Update dashboard to remove VC/PE sections
# Edit dashboard/app.py to remove VC/PE visualizations
```

**Result:** 11/12 remaining files are real data (92%)

---

## 📊 Final State

### What You'll Have (Real Data):
1. ✅ Market size (CDC + CMS)
2. ✅ Regulatory landscape (FDA + openFDA)
3. ✅ Investment scores (calculated)
4. ✅ Stage returns (calculated)
5. ✅ Gene therapy pipeline (ClinicalTrials.gov)
6. ✅ SLE pipeline (ClinicalTrials.gov)
7. ✅ SARC pipeline (ClinicalTrials.gov)
8. ✅ Precision medicine (ClinicalTrials.gov)
9. ✅ Public companies (SEC + Yahoo Finance)
10. ✅ Pharma investments (SEC EDGAR)
11. ✅ Competitive landscape (SEC + ClinicalTrials.gov)
12. ⚠️ Public M&A only (SEC 8-K) - partial but honest

### What You'll Remove:
13. ❌ VC deals (requires paid data)
14. ❌ Growth equity deals (requires paid data)

---

## 🎯 Your New Claim

**Before:**
- "100% real clinical/health data"
- "Business data removed (was synthetic)"

**After Phase 1-4:**
- "100% real data across all categories"
- "11/12 business data files from public sources (SEC, FDA, CDC, CMS)"
- "Public M&A data only (private VC/PE excluded - requires paid databases)"
- "All sources documented and reproducible"

---

## 💰 Cost

**Total Cost:** $0 (all free public data)

**Time Investment:** 5-6 weeks part-time

**Quality:** 80-95% coverage (excellent for free data)

---

## 🚀 Ready to Start?

**I can create the scripts for Phase 1 (Week 1) right now:**

1. `scripts/collect_market_size.py`
2. `scripts/collect_regulatory_data.py`
3. `scripts/calculate_investment_scores.py`
4. `scripts/calculate_stage_returns.py`

**Would you like me to:**
1. Create these 4 scripts now?
2. Start with just market size (easiest)?
3. Remove VC/PE files first, then work on replacements?
4. Something else?
