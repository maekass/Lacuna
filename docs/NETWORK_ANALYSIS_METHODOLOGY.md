# Honest Network Analysis Methodology

**Version:** 1.0  
**Date:** May 2026  
**Author:** Lacuna Network Analysis Framework  
**Status:** For publication/ethics review

---

## Executive Summary

This network analysis framework is HONEST about its limitations. With n=15-20 nodes, standard network science methods (power laws, preferential attachment, centrality rankings) are unreliable. We instead provide:

1. **Descriptive metrics with bootstrap CIs** (not point estimates)
2. **Concentration analysis** (Gini, HHI) instead of power law fitting
3. **Null model comparison** to assess meaningfulness of observed patterns
4. **Stability analysis** to identify which findings would survive larger samples
5. **Qualitative strategic positioning** (explicitly not statistical claims)
6. **Explicit acknowledgment** of what we cannot reliably claim

**Critical principle:** We use language like "exploratory," "preliminary," "with n=15 we cannot..." consistently.

---

## What We CANNOT Reliably Claim

### ✗ Power-law degree distribution
- **Why**: Power law fitting requires n>100 minimum (Clauset et al., 2009)
- **Alternative**: Use Gini coefficient and HHI for concentration

### ✗ Preferential attachment mechanism
- **Why**: Requires temporal data showing growth dynamics + n>100
- **Alternative**: Acknowledge static snapshot; describe observed concentration

### ✗ Generalizable network topology
- **Why**: This is one snapshot of FemTech acquisitions, not a representative sample
- **Alternative**: Bound claims to this specific dataset and time window

### ✗ Specific centrality rankings
- **Why**: Betweenness/eigenvector centrality has high variance at n=15
- **Alternative**: Report only top-level concentration metrics

### ✗ "Statistically significant communities"
- **Why**: Modularity tests have low power for small networks
- **Alternative**: Stability score from subset perturbation; qualitative description

---

## Tier 2: What We CAN Descriptively Explore

### 1. Basic Network Descriptives

**Reported with bootstrap confidence intervals:**
- Degree distribution: median + IQR (more robust than mean ± SD)
- Clustering coefficient: average with 95% bootstrap CI
- Network density: actual edges / possible edges
- Connected components: number and sizes
- Diameter: longest shortest path

**Honest language:**
> "Median acquisitions per buyer: 2 [IQR: 1-3]. With n=15 edges, network is sparse and statistics are unstable."

### 2. Buyer Concentration Analysis

**More defensible than power law fitting:**

#### Gini Coefficient (0-1)
- 0 = perfect equality
- 1 = perfect inequality
- DOJ-aligned interpretation

#### Herfindahl-Hirschman Index (0-10000)
- &lt;1500: Unconcentrated
- 1500-2500: Moderately concentrated
- &gt;2500: Highly concentrated

#### Top-K Concentration
- Top 1, 3, 5 acquirer share of deals

**Sample output:**
> "Top 3 acquirers account for 62% of deals. Network is moderately concentrated (Gini = 0.41, HHI = 2400)."

### 3. Null Model Comparison

**Method**: 1000 random simulations where deals are randomly assigned to acquirers
- Compare observed concentration to random baseline
- Report z-scores
- z > 2: meaningfully concentrated
- z < 2: consistent with random

**Sample output:**
> "Observed Gini = 0.41 vs random baseline 0.18 ± 0.07 (z = 3.3). Suggests strategic targeting beyond random."

### 4. Temporal Analysis

**With explicit caveats:**
- Yearly counts (bar chart)
- Median + IQR per year
- Linear regression for trend (with R²)
- Confidence tiers: insufficient_data | low | medium | high

**Honest language:**
> "With 11 events over 7 years, trends are noisy. Slope = 0.18/year (R² = 0.12). Do not extrapolate."

### 5. Community Detection

**Simplified Louvain (greedy modularity optimization):**
- Run algorithm
- Report modularity Q
- **Critical addition**: Stability score via 10 random subset perturbations
- Reliability flag: only if stability > 85%

**Honest language:**
> "Detected 3 communities (Q = 0.42, stability = 73%). Moderate signal but likely some artifacts. Adding 5 more nodes would change structure."

### 6. Strategic Positioning Map

**QUALITATIVE 2D visualization:**
- X: Sector breadth (Shannon entropy, normalized)
- Y: Deal velocity (deals per year)
- 4 quadrants: Focused Aggressive | Selective Specialist | Aggressive Diversifier | Diversified Observer

**Honest language:**
> "This is qualitative pattern recognition from n=5 acquirers. Not statistical hypothesis testing."

### 7. Stability Analysis

**Tests robustness via 100 bootstrap simulations:**
- For each metric: mean, SD, coefficient of variation (CV)
- CV &lt; 15% = stable
- CV 15-30% = moderate
- CV &gt; 30% = unstable

**Recommended sample size:** Based on observed CV scaling (need 4x sample to halve CV)

---

## Methodological Choices and Justifications

### Why Bootstrap Instead of Parametric CIs?
- No distributional assumptions
- Works for any statistic
- More accurate for small samples
- Standard practice for network analysis (Newman 2003)

### Why Median + IQR Instead of Mean ± SD?
- Mean is sensitive to outliers (e.g., Amazon's 3 acquisitions inflate average)
- IQR captures spread without extreme values
- More appropriate for skewed distributions

### Why Gini + HHI Instead of Power Law?
- Power law fitting requires n>100 (Clauset et al., 2009)
- Gini and HHI are well-established (DOJ uses HHI for antitrust)
- More interpretable for non-technical audiences

### Why Null Model Comparison?
- Tests whether observed concentration is "meaningful" vs random chance
- Provides z-score for effect size
- Standard practice in network science (Newman 2010)

---

## Validation Strategy

### Current State
- Sample: n=15 nodes, 11 edges
- Bootstrap CV for key metrics: ~25-35% (unstable)
- Findings should be considered exploratory

### Path to Validation
1. **Year 1 (current)**: Report findings as exploratory with stability caveats
2. **Year 2 (n≈25)**: Refit all models; compare to current results
3. **Year 3 (n≈40)**: Test for stability; identify which patterns persisted
4. **Year 5 (n≈80)**: Approach minimum sample for power law fitting

### Pre-Registration
To avoid post-hoc rationalization:
- Document expected findings before data collection
- Specify which patterns we expect to persist
- Acknowledge if patterns disappear with more data

---

## Language Guidelines

### ✓ USE THIS LANGUAGE

- "Exploratory network analysis with n=15..."
- "While underpowered for formal hypothesis testing, we observe..."
- "This pattern should be confirmed with larger sample..."
- "Network concentration (Gini=0.58) suggests strategic targeting..."
- "Bootstrap CI [0.31, 0.49] reflects substantial uncertainty..."
- "Qualitative pattern: tech acquirers tend to be more diversified..."
- "Stability score 73% indicates moderate reliability..."

### ✗ DO NOT USE THIS LANGUAGE

- "Our network exhibits power-law degree distribution..." (wrong test)
- "We found statistically significant preferential attachment..." (wrong claim)
- "Centrality rankings show that X is most influential..." (unstable)
- "The community structure proves..." (wrong language for n=15)
- "This pattern generalizes to all M&A networks..." (over-generalization)

---

## Limitations

### Data Limitations
- Snapshot in time (no temporal dynamics)
- Selection bias (only acquired companies)
- Missing pre-acquisition pipeline
- No private deal flow data

### Methodological Limitations
- Binary edge types (acquisition vs partnership)
- No edge weights (deal size not used as weight)
- No directed analysis (acquirer → target ignored in some metrics)
- Static analysis (network evolution not modeled)

### Statistical Limitations
- Cannot fit distributions (n too small)
- Cannot test most network hypotheses
- Confidence intervals are wide
- Power for hypothesis tests is low

---

## Citations

1. Newman, M.E.J. (2003). "The structure and function of complex networks." *SIAM Review*, 45(2), 167-256.
2. Clauset, A., Shalizi, C.R., Newman, M.E.J. (2009). "Power-law distributions in empirical data." *SIAM Review*, 51(4), 661-703.
3. Efron, B., Tibshirani, R. (1993). *An Introduction to the Bootstrap*. Chapman & Hall.
4. Newman, M.E.J. (2010). *Networks: An Introduction*. Oxford University Press.
5. Blondel, V.D., et al. (2008). "Fast unfolding of communities in large networks." *Journal of Statistical Mechanics*, 2008(10), P10008.
6. US DOJ. (2010). *Horizontal Merger Guidelines* (HHI thresholds).

---

## Components in This Framework

| Deliverable | File |
|-------------|------|
| network-descriptives.ts | `src/lib/network/networkStatistics.ts` |
| concentration-analysis.ts | (same file - giniCoefficient, herfindahlIndex) |
| temporal-trends | `src/lib/network/networkStatistics.ts` (temporalAnalysis) |
| strategic-positioning-map.tsx | `src/components/StrategicPositioningMap.tsx` |
| network-stability-analysis.ts | (same file - networkStabilityAnalysis) |
| limitations-document | This file |

---

*Last updated: May 27, 2026*
*Status: Open for review and improvement*
