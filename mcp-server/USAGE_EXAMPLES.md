# Cascade Registry MCP - Usage Examples

Real-world examples of how to use the Cascade Registry MCP server with AI assistants.

## Clinical Trial Research

### Example 1: Find Active Gene Therapy Trials

**User Query:**
> "What gene therapy trials are currently recruiting for Sickle Cell Disease?"

**AI Assistant Uses:**
```json
Tool: search_clinical_trials
{
  "disease": "Sickle Cell Disease",
  "status": "Recruiting",
  "limit": 50
}
```

**Response Includes:**
- NCT IDs for all recruiting trials
- Trial phases, enrollment targets
- Sponsor information
- Trial status and outcomes

---

### Example 2: Company Pipeline Analysis

**User Query:**
> "What is CRISPR Therapeutics working on in the sickle cell space?"

**AI Assistant Uses:**
```json
Tool: get_company_pipeline
{
  "company_name": "CRISPR Therapeutics"
}
```

**Response Includes:**
- All diseases the company is targeting
- Pipeline focus areas (e.g., CTX001 gene editing)
- Stock ticker (CRSP)
- Active trial information

---

## Investment Research

### Example 3: Market Sizing

**User Query:**
> "What's the market opportunity for Multiple Sclerosis therapies?"

**AI Assistant Uses:**
```json
Tool: run_market_analysis
{
  "disease": "Multiple Sclerosis"
}
```

**Response Includes:**
- TAM (Total Addressable Market) estimate: ~$50-100B
- US prevalence: 1,000,000 patients
- Active companies and trials (320+ trials)
- Investment stage breakdown
- Key pipeline focus areas

---

### Example 4: Disease Burden Analysis

**User Query:**
> "How fast is the Hidradenitis Suppurativa patient population growing?"

**AI Assistant Uses:**
```json
Tool: analyze_disease_burden
{
  "disease": "Hidradenitis Suppurativa"
}
```

**Response Includes:**
- Current US prevalence: 150,000
- Annual growth rate: 2.5%
- 5-year projection: ~167,000 patients
- Unmet need assessment
- Active trial count and success rates

---

## ML Predictions

### Example 5: Trial Success Prediction

**User Query:**
> "What are the chances of success for a Phase 2 trial with 200 patients sponsored by a major pharma company?"

**AI Assistant Uses:**
```json
Tool: predict_trial_success
{
  "phase": "Phase 2",
  "enrollment": 200,
  "sponsor_type": "Industry"
}
```

**Response Includes:**
- Success probability: ~68%
- 95% confidence interval: [62%, 74%]
- Model ensemble breakdown:
  - Random Forest: 71%
  - Gradient Boosting: 69%
  - Logistic Regression: 65%
  - XGBoost: 67%
- Top feature importance:
  1. Phase (28%)
  2. Enrollment (19%)
  3. Sponsor Type (15%)
  4. Disease Prevalence (12%)
  5. Prior Approvals (10%)

---

## Regulatory Intelligence

### Example 6: FDA Approval Landscape

**User Query:**
> "What drugs have been approved for Systemic Lupus Erythematosus in recent years?"

**AI Assistant Uses:**
```json
Tool: query_fda_approvals
{
  "disease": "Systemic Lupus Erythematosus",
  "limit": 20
}
```

**Response Includes:**
- Drug names (e.g., Benlysta, Saphnelo)
- Approval dates
- Sponsors/manufacturers
- Indications and mechanisms

---

## Competitive Intelligence

### Example 7: Find All Companies in a Space

**User Query:**
> "Which biotech companies are working on Diabetic Nephropathy?"

**AI Assistant Uses:**
```json
Tool: search_biotech_companies
{
  "disease": "Diabetic Nephropathy"
}
```

**Response Includes:**
- Company names and tickers
- Pipeline focus areas (SGLT2 inhibitors, kidney protection)
- Active trial counts
- Disease-specific strategies

---

### Example 8: Trial Statistics

**User Query:**
> "What's the breakdown of clinical trials by phase across all diseases?"

**AI Assistant Uses:**
```json
Tool: get_trial_statistics
{
  "group_by": "phase"
}
```

**Response Includes:**
- Phase 1: X trials
- Phase 2: Y trials
- Phase 3: Z trials
- Phase 4: W trials
- Total trials in database

---

## Epidemiology Research

### Example 9: Disease Prevalence Data

**User Query:**
> "What's the prevalence of Sickle Cell Disease in the US and how is it trending?"

**AI Assistant Uses:**
```json
Tool: get_epidemiology_data
{
  "disease": "Sickle Cell Disease"
}
```

**Response Includes:**
- US prevalence: 118,000 patients
- Growth rate: 2.1% annually
- Key metrics:
  - Births per 1,000: 1.5
  - FDA approvals (2019-2024): 4
  - Avg trial success rate: 65%
- Time series data (if available)
- Data sources: CDC, Orphanet

---

### Example 10: Comprehensive Disease Profile

**User Query:**
> "Give me a complete overview of the Food Allergy therapeutic landscape"

**AI Assistant Uses:**
```json
Tool: get_disease_info
{
  "disease": "Food Allergy"
}
```

**Response Includes:**
- Disease code: FA
- US prevalence: 32,000,000
- Growth rate: 3.2%
- Active trials estimate: 75
- Pipeline focus:
  - Oral immunotherapy
  - Biologics (anti-IgE, anti-IL-4)
  - Epicutaneous immunotherapy
  - Sublingual immunotherapy
- Key companies:
  - Aimmune Therapeutics
  - DBV Technologies
  - Regeneron
  - Genentech
  - etc.

---

## Multi-Tool Workflows

### Example 11: Complete Due Diligence

**User Query:**
> "I'm evaluating an investment in the lupus space. Give me a comprehensive analysis."

**AI Assistant Uses Multiple Tools:**

1. **Disease Overview**
```json
Tool: get_disease_info
{"disease": "Systemic Lupus Erythematosus"}
```

2. **Market Analysis**
```json
Tool: run_market_analysis
{"disease": "Systemic Lupus Erythematosus"}
```

3. **Active Trials**
```json
Tool: search_clinical_trials
{
  "disease": "Systemic Lupus Erythematosus",
  "status": "Active",
  "limit": 50
}
```

4. **FDA Approvals**
```json
Tool: query_fda_approvals
{"disease": "Systemic Lupus Erythematosus"}
```

5. **Companies**
```json
Tool: search_biotech_companies
{"disease": "Systemic Lupus Erythematosus"}
```

**Combined Response Provides:**
- Complete disease profile
- Market size and opportunity
- Competitive landscape
- Regulatory environment
- Active trial pipeline
- Investment thesis support

---

## Advanced Queries

### Example 12: Cross-Disease Comparison

**User Query:**
> "Compare the market opportunities for Sickle Cell Disease vs Multiple Sclerosis"

**AI Assistant Uses:**
```json
Tool: run_market_analysis (for SCD)
{"disease": "Sickle Cell Disease"}

Tool: run_market_analysis (for MS)
{"disease": "Multiple Sclerosis"}
```

**Comparison Shows:**
- **SCD**: Smaller market (~$6B TAM), orphan drug status, high unmet need
- **MS**: Larger market (~$75B TAM), competitive, established therapies
- **Investment Angle**: SCD = high-risk/high-reward gene therapy plays; MS = stable, diversified portfolios

---

### Example 13: Trial Success by Sponsor Type

**User Query:**
> "Do industry-sponsored trials have better success rates than academic trials?"

**AI Assistant Uses:**
```json
Tool: get_trial_statistics
{"group_by": "sponsor_type"}

Tool: predict_trial_success (Industry)
{
  "phase": "Phase 2",
  "enrollment": 150,
  "sponsor_type": "Industry"
}

Tool: predict_trial_success (Academic)
{
  "phase": "Phase 2",
  "enrollment": 150,
  "sponsor_type": "Academic"
}
```

**Analysis Shows:**
- Industry trials: Higher success rates (better resourced)
- Academic trials: More novel mechanisms (higher risk)
- Enrollment and phase matter more than sponsor type

---

## Tips for Effective Use

1. **Be Specific**: Use exact disease names from the supported list
2. **Combine Tools**: Use multiple tools for comprehensive analysis
3. **Filter Wisely**: Use phase/status filters to narrow results
4. **Iterate**: Start broad, then drill down with specific queries
5. **Cross-Reference**: Validate predictions with actual trial data

## Supported Disease Names (Exact Matches)

- "Sickle Cell Disease"
- "Systemic Lupus Erythematosus"
- "Sarcoidosis"
- "Hidradenitis Suppurativa"
- "Diabetic Nephropathy"
- "Autoimmune Liver Disease"
- "Multiple Sclerosis"
- "Food Allergy"
- "Crohn's Disease"

---

**Ready to explore?** Start with simple queries and build up to complex multi-tool workflows!
