# Competitive Analysis Methodology - Descriptive, Not Prescriptive

**Version:** 1.0  
**Date:** May 2026  
**Author:** Lacuna Competitive Analysis Framework  
**Status:** For publication/ethics review

---

## Executive Summary

This competitive analysis framework maps acquirer behavior **descriptively** (what they've actually done) rather than inferring their **hidden strategic intent**. Following Cartwright & Schoenberg (2006) and Haleblian et al. (2009), we recognize that most M&A "strategy" is retrospective sense-making, not actual forward planning.

**Core principle:** Report observable facts. Avoid claims about unobservable phenomena (intent, synergy, competitive dynamics).

---

## What We Observe vs What We Infer

### ✓ TIER 1: What We CAN Observe (Stick to This)

| Observable | Method | Reliability |
|------------|--------|-------------|
| **Acquisition patterns** | Count deals by sector per acquirer | High |
| **Portfolio composition** | % distribution across sectors/stages | High |
| **Deal timing** | Year-over-year transaction counts | High |
| **Deal size** | Disclosed values, median + range | Medium (many undisclosed) |
| **Company stage at acquisition** | Funding stage at deal close | High |
| **Geographic patterns** | Country/region of targets | High |
| **Age at acquisition** | Years from founding to acquisition | High |

### ✗ TIER 2: What We CANNOT Infer (Don't Do This)

| Unobservable | Why Not | Common Mistake |
|--------------|---------|----------------|
| **Strategic intent** | Requires internal documents | "This shows buyer is pursuing X strategy" |
| **Synergy realization** | Only knowable ex-post | "We predict $X in synergies" |
| **Competitive overlaps** | We don't see rejected deals | "These buyers compete for these targets" |
| **Future acquisitions** | Cannot model unobserved decisions | "Buyer X will acquire Company Y next" |
| **Failed negotiations** | Private, undisclosed | "Buyer Z lost to Buyer Y" |
| **Internal preferences** | Confidential | "Buyer prefers tech over healthcare" |

---

## Four Analytical Components

### 1. Acquirer Portfolio Analysis (Purely Descriptive)

**Purpose:** Document what each buyer has acquired without inferring why.

**Outputs per acquirer:**
- Total acquisitions count
- Sector composition (% in each sector)
- Stage composition (% pre-seed, seed, Series A, etc.)
- Geographic distribution
- Value statistics (mean, median, range)
- Age at acquisition (median + IQR)

**Visualization:** Stacked bar charts showing portfolio composition

**Honest language example:**
> "CVS has acquired 4 women's health companies: 2 in fertility (both post-Series B), 2 in telehealth mental health (both Series A). Pattern: Prefers post-Series B, sector-diverse."

**❌ Do NOT say:**
> "This shows CVS is pursuing adjacent expansion strategy"

This is inference of unobservable intent.

---

### 2. Deal Velocity Analysis (Time Series)

**Purpose:** Track acquisition pace over time without causal claims.

**Method:**
- Plot acquisitions per year per buyer
- Compare early vs late period averages
- Linear regression for trend (with R²)
- Overlay external events for context (not causation)

**Confidence tiers:**
- **High** (n≥50): Trend reliable
- **Medium** (n=20-49): Trend suggestive
- **Low** (n=5-19): Trend uncertain
- **Insufficient** (n<5): Cannot assess

**Honest language example:**
> "CVS accelerated from 0.5 deals/year (2015-2018) to 2.1 deals/year (2019-2022). Coincides with digital health investment announcement."

**Required caveat:**
> "Correlation observed; causality unclear (confounded by healthcare reform, telehealth adoption post-COVID)."

---

### 3. Competitive Market Structure (Without Claiming Competition)

**Purpose:** Identify "contestable" targets without claiming actual competition.

**Method:**
For each company, count "plausible buyers" using criteria:
1. Same sector as buyer's prior acquisitions
2. Company age within reasonable window (≤8 years)
3. Buyer has demonstrated sector interest

**Contestability tiers:**
- **High**: 3+ plausible buyers
- **Medium**: 2 plausible buyers
- **Low**: 0-1 plausible buyers

**Sector-level analysis:**
- % of companies in sector classified as contestable
- Compare across sectors

**Honest language example:**
> "Fertility sector has 6 companies that fit multiple buyer profiles (CVS, UnitedHealth, private equity). Maternal health has 0. This suggests fertility is more competitive, maternal health less."

**Critical caveat (always include):**
> "This assumes all buyers have equal interest in all companies. Reality: Buyers have internal preferences (unobserved)."

---

### 4. Acquirer Type Variation (Most Reliable)

**Purpose:** Compare behavior across buyer types - this is the most defensible analysis.

**Types analyzed:**
- Strategic Healthcare (e.g., Teladoc, CVS)
- Strategic Tech (e.g., Amazon, Apple)
- Corporate Health (e.g., UnitedHealth)
- Private Equity (e.g., KKR, Bain)
- Venture Capital (limited - typically minority)

**Comparison dimensions:**
- Stage distribution (median target stage)
- Sector distribution (median target sector)
- Value distribution (median target value)
- Age distribution (median target age)

**Why this is reliable:**
- Differences between types are typically large
- Less affected by individual buyer idiosyncrasies
- More defensible generalizations

**Honest language example:**
> "Strategic healthcare buyers acquire later-stage companies (median Series B); PE acquires earlier (median Series A). Valuation multiple differences follow: Strategic pays 5.2x, PE pays 3.1x."

**Acceptable interpretation:**
> "Different buyer types operate in different market segments (late vs early stage)."

---

## Language Guidelines

### ✓ USE THIS LANGUAGE

- "Acquirer X has acquired N companies in [sector]..."
- "Portfolio composition is 60% fertility, 40% mental health..."
- "Deal velocity changed from X/year to Y/year..."
- "Coincides with [external event]; causality unclear..."
- "Different buyer types operate in different segments..."
- "Observed pattern (facts only):..."
- "Causality unclear (confounded by [factors])..."

### ✗ DO NOT USE THIS LANGUAGE

- "This shows buyer is pursuing [strategy]..." (unobservable intent)
- "We predict synergies of $X..." (ex-ante synergy claims unreliable)
- "Buyer Y will likely acquire Company Z next..." (cannot model)
- "Buyer A and B are competing for..." (don't have rejected deals)
- "The strategic rationale is..." (rationale is interpretation)
- "This buyer's vision includes..." (vision is unobservable)
- "We recommend Buyer X should..." (prescriptive, not descriptive)

---

## Common M&A Analysis Mistakes (Avoided)

### Mistake 1: Inferring Intent from Outcomes
**Wrong:** "CVS's Aetna acquisition shows CVS pursuing vertical integration"  
**Right:** "CVS acquired Aetna in 2018; CVS's subsequent acquisitions have been in adjacent health services"

### Mistake 2: Predicting Synergy Ex-Ante
**Wrong:** "Amazon-One Medical will create $5B in synergies through cross-selling"  
**Right:** "Amazon acquired One Medical for $3.9B. Synergy realization will be observable only ex-post."

### Mistake 3: Claiming Competitive Dynamics
**Wrong:** "Teladoc and Amwell compete for telehealth M&A targets"  
**Right:** "Teladoc has acquired 3 telehealth companies; Amwell has acquired 1. Both operate in same sector but we don't observe rejected deals."

### Mistake 4: Predicting Next Targets
**Wrong:** "We predict UnitedHealth will acquire Company X next"  
**Right:** "UnitedHealth's pattern of post-Series B acquisitions in primary care is consistent with potential interest in Company X-type targets; specific predictions require unobservable decision processes."

### Mistake 5: Prescribing Strategy
**Wrong:** "Buyer X should focus on fertility sector"  
**Right:** "Our analysis describes observed acquirer behavior; strategic recommendations require additional information not in this dataset."

---

## Methodological Choices and Justifications

### Why Descriptive Only?

Following the academic M&A literature:
- Cartwright & Schoenberg (2006): "Most strategic rationales for M&A are post-hoc rationalizations"
- Haleblian et al. (2009): "Predictive validity of ex-ante synergy estimates is low"
- King et al. (2004): "Most M&A research is retrospective sense-making"

### Why Contestability Without Competition?

We cannot observe:
- Rejected deals (failed negotiations are private)
- Internal preferences (which targets buyers actually wanted)
- Auction dynamics (who bid against whom)

What we CAN observe: Which buyers have demonstrated interest in similar sectors. This is a "plausibility" claim, not a "competition" claim.

### Why Type Comparison is Most Reliable?

Type-level differences are:
1. Larger (less subject to small-sample noise)
2. Theoretically grounded (PE vs Strategic have known differences)
3. More defensible (don't require buyer-specific claims)

---

## Limitations

### Data Limitations
- Disclosed values only (~60-70% of deals have values)
- Snapshot in time (no temporal dynamics)
- Selection bias (only completed acquisitions)
- Missing pipeline (pre-Series A largely invisible)

### Methodological Limitations
- Cannot observe rejected deals
- Cannot measure synergy realization
- Cannot model buyer decision processes
- Cannot generalize beyond observed acquirers

### Statistical Limitations
- Small sample sizes per acquirer (often n<5)
- Type-level comparisons more reliable than buyer-level
- No formal hypothesis testing
- Effect sizes uncertain

---

## Validation Strategy

### Current State (n=13 acquisitions, 8 acquirers)
- Portfolio composition: Reliable for buyers with n≥3
- Velocity trends: Suggestive only (n too small for robust trends)
- Contestability: Exploratory
- Type comparison: Most reliable component

### Future Validation
1. **Year 2**: Add 10 more acquisitions; verify portfolio compositions
2. **Year 3**: Test if velocity trends persisted or were noise
3. **Year 5**: Sufficient n for type-level statistical comparisons

---

## Citations

1. Cartwright, S., Schoenberg, R. (2006). "Thirty Years of Mergers and Acquisitions Research." *British Journal of Management*, 17(S1), S1-S5.
2. Haleblian, J., Devers, C.E., McNamara, G., Carpenter, M.A., Davison, R.B. (2009). "Taking Stock of What We Know About Mergers and Acquisitions: A Review and Research Agenda." *Journal of Management*, 35(3), 469-502.
3. King, D.R., Dalton, D.R., Daily, C.M., Covin, J.G. (2004). "Meta-analyses of post-acquisition performance." *Strategic Management Journal*, 25(2), 187-200.
4. Bauer, F., Matzler, K. (2014). "Antecedents of M&A success." *Strategic Management Journal*, 35(2), 269-291.
5. Christensen, C.M., Alton, R., Rising, C., Waldeck, A. (2011). "The Big Idea: The New M&A Playbook." *Harvard Business Review*.

---

## Components in This Framework

| Deliverable | File |
|-------------|------|
| acquirer-portfolio-analysis | `src/lib/competitive/acquirerAnalysis.ts` (analyzePortfolio) |
| deal-velocity-tracker | `src/lib/competitive/acquirerAnalysis.ts` (analyzeVelocity) |
| competitive-market-structure | `src/lib/competitive/acquirerAnalysis.ts` (analyzeMarketStructure) |
| acquirer-type-comparison | `src/lib/competitive/acquirerAnalysis.ts` (compareAcquirerTypes) |
| Dashboard | `src/components/CompetitiveAnalysisDashboard.tsx` |
| Limitations document | This file |

---

## What This Framework IS

✓ Honest about what's observable vs inferred  
✓ Defensible (avoids unfounded claims)  
✓ Useful (describes actual buyer behavior)  
✓ Research-quality (can be published without major methodological critique)

## What This Framework IS NOT

✗ Strategic consulting (we don't prescribe)  
✗ Synergy prediction (we don't claim ex-ante)  
✗ Competitive intelligence (we don't have rejected deals)  
✗ Investment recommendations (descriptive only)

---

*Last updated: May 27, 2026*  
*Status: Open for review and improvement*
