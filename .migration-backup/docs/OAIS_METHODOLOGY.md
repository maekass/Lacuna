# Opportunity-Adjusted Impact Score (OAIS) Methodology

**Version:** 1.0\
**Date:** May 2026\
**Author:** Lacuna Health Impact Framework\
**Status:** Living document; will be updated as validation data becomes
available

---

## Executive Summary

The Opportunity-Adjusted Impact Score (OAIS) is a defensible health impact
assessment framework for FemTech and women's health investments. Unlike
traditional metrics like DALYs averted, OAIS explicitly acknowledges what we can
measure, what we can proxy, and what we cannot measure—providing investors with
actionable insights without overstating confidence.

**Key Principle:** OAIS measures **OPPORTUNITY MAGNITUDE**, not guaranteed
health impact. Real impact depends on execution (largely unobservable
pre-acquisition).

---

## Why Not DALYs?

Disability-Adjusted Life Years (DALYs) require:

- ❌ Patient volume per company (proprietary; not disclosed)
- ❌ Clinical efficacy data (not published for most pre-acquisition startups)
- ❌ Patient adherence rates (only known post-launch)
- ❌ Counterfactual outcomes (fundamental causal inference problem)

Calculating DALYs without these would require fabricating numbers and presenting
them as measurements. **This is unacceptable epistemologically and ethically.**

OAIS instead measures what we CAN defensibly assess: the strategic opportunity
magnitude.

---

## Three-Tier Data Framework

### Tier 1: Reliably Measured (High Confidence)

**Sources:**

- CDC National Center for Health Statistics
- NICHD (National Institute of Child Health and Human Development)
- Peer-reviewed epidemiology literature (PubMed indexed)
- Sensor Tower market data

**Data Points:**

#### Addressable Population (95% CIs reported)

| Condition                     | Estimate | Range      | Source                               |
| ----------------------------- | -------- | ---------- | ------------------------------------ |
| PCOS                          | 1.5M     | 1.2-1.8M   | CDC NCHS (2021)                      |
| Endometriosis                 | 1.75M    | 1.5-2.0M   | NICHD (2019), Fertility & Sterility  |
| Maternal Health Complications | 0.85M    | 0.7-1.0M   | CDC PMSS (2022)                      |
| Uterine Fibroids              | 17.5M    | 16.0-19.0M | NIH/NICHD (2020), J Women's Health   |
| Fertility Challenges          | 6.1M     | 5.8-6.4M   | CDC NSFG (2022)                      |
| Postpartum Depression         | 0.4M     | 0.35-0.45M | JAMA Psychiatry Meta-Analysis (2020) |

#### Market Penetration (with caveats)

| Category                | Installed Base | Active User Estimate | Transparency Note                              |
| ----------------------- | -------------- | -------------------- | ---------------------------------------------- |
| Fertility Apps          | 2.3M           | 1.15-1.61M           | 50-70% active rate; 30-50% overestimate likely |
| Mental Health (Women's) | ~30M           | 15-25M               | Highly competitive; high churn                 |
| Pelvic Health           | 0.8M           | 0.24-0.4M            | Niche category; low retention                  |

**Critical Transparency:** "Installed base ≠ active users; likely 30-50%
overestimate"

#### Unmet Need (from published surveys)

| Condition             | % Guideline Care | % Specialist Visit | Source                                  |
| --------------------- | ---------------- | ------------------ | --------------------------------------- |
| PCOS                  | 22%              | 35%                | NICHD PCOS Survey (2020)                |
| Endometriosis         | 28%              | 42%                | Endometriosis Foundation (2021)         |
| Postpartum Depression | 45%              | 38%                | Postpartum Support International (2022) |

---

### Tier 2: Proxies (Medium Confidence)

These are indirect measurements that approximate underlying constructs.

#### Clinical Stage Credibility

| Stage               | Credibility Score | Data Basis              | Limitation                          |
| ------------------- | ----------------- | ----------------------- | ----------------------------------- |
| Pre-clinical        | 0.3               | No RCT data             | High failure risk; efficacy unknown |
| Pilot               | 0.5               | Small pilot, no control | Selection bias likely               |
| Clinical Validation | 0.7               | Observational pre/post  | Confounding possible                |
| Post-RCT            | 1.0               | Completed RCT           | Efficacy-effectiveness gap          |

**Proxy For:** Clinical efficacy (unmeasurable pre-acquisition)

#### Founder Quality Signals

**Data Source:** LinkedIn public profiles

- Previous healthcare exits (count)
- FDA/regulatory experience (binary)
- Years of healthcare/biotech experience

**Calculation:**

```
Founder Quality = min(1.0, 0.5 + (Prior Exits × 0.15) + (FDA Experience ? 0.2 : 0))
```

**Limitation:** Only captures publicly available information; biased toward
visible founders.

#### Acquirer Scaling Track Record

| Acquirer | Acquisitions | Scaling Multiplier | Data Quality                          |
| -------- | ------------ | ------------------ | ------------------------------------- |
| Teladoc  | 3            | 2.3×               | Estimated from investor presentations |
| Ro       | 2            | 1.9×               | Estimated from press releases         |
| Amazon   | 1            | 3.1×               | Inferred from platform reach          |

**Limitation:** Small sample; past performance ≠ future results.

---

### Tier 3: Cannot Measure (Acknowledged Limitations)

| Factor                                | Why We Cannot Measure         | Proxy Used                        | Proxy Limitation                              |
| ------------------------------------- | ----------------------------- | --------------------------------- | --------------------------------------------- |
| **Patient volume per company**        | Proprietary; not disclosed    | Addressable pop × penetration gap | Overestimates if company has <1% market share |
| **Clinical efficacy**                 | Not published pre-acquisition | Stage credibility score           | Stage ≠ efficacy                              |
| **Patient outcomes post-acquisition** | HIPAA; private                | Acquirer track record             | Past performance ≠ future                     |
| **Counterfactual impact**             | Cannot observe alternative    | None                              | Fundamental causal problem                    |
| **Scale-up multiplier**               | Rarely disclosed              | Acquirer scaling estimate         | Market conditions change                      |

---

## OAIS Calculation

### Formula

```
OAIS = [Addressable Pop] × [Penetration Gap] × [Stage Credibility] 
       × [Founder Quality] × [Acquirer Scaling] / [Market Saturation Penalty]
```

### Component Definitions

| Component          | Source                                 | Type           | Range        |
| ------------------ | -------------------------------------- | -------------- | ------------ |
| Addressable Pop    | CDC/NICHD epidemiology                 | Measured       | 0.4M - 17.5M |
| Penetration Gap    | 1 - (installed base / addressable pop) | Measured Proxy | 0 - 1        |
| Stage Credibility  | Clinical stage proxy                   | Proxy          | 0.3 - 1.0    |
| Founder Quality    | LinkedIn experience score              | Proxy          | 0.5 - 1.0    |
| Acquirer Scaling   | Historical multiplier                  | Proxy          | 1.0 - 4.0    |
| Saturation Penalty | Competitor count / 20                  | Measured       | 0 - 0.5      |

### Normalization

Raw OAIS is normalized to a 0-10 scale for interpretability:

```
Normalized OAIS = min(10, max(0, Raw OAIS × 2))
```

### Interpretation Guide

| OAIS Range | Interpretation       | Investment Thesis                                                        |
| ---------- | -------------------- | ------------------------------------------------------------------------ |
| 7-10       | High opportunity     | Strong portfolio candidate; large underserved population + credible team |
| 4-6        | Moderate opportunity | Consider as part of diversified portfolio                                |
| 0-3        | Limited opportunity  | Strategic tuck-in only; not platform bet                                 |

---

## Confidence Level System

Every data point is tagged with one of three confidence levels:

### 🟢 MEASURED (High Confidence)

- Direct data from verified public source
- Examples: CDC population estimates, SEC filings, Sensor Tower active users
- Visualization: Dark green badge

### 🟡 PROXY (Medium Confidence)

- Indirect indicator; not direct measurement
- Examples: Clinical stage → credibility, LinkedIn → execution
- Visualization: Yellow badge

### 🔴 ASSUMPTION (Low Confidence)

- Required estimate; not measurable from available data
- Examples: Future scaling rate, patient outcomes
- Visualization: Red badge

---

## Validation Framework

### Pre-Acquisition Predictions Tracked

1. Expected scaling multiplier
2. Expected patient volume
3. Product continuation strategy (standalone vs integrated)
4. Outcomes study expectation

### Post-Acquisition Reality Tracked

1. Actual scaling multiplier (when disclosed)
2. Disclosed patient volume (when public)
3. Actual product status
4. Outcomes studies published

### Model Calibration

- Compare predictions to reality as acquisitions mature
- Update model weights based on calibration data
- Document systematic biases (e.g., scaling overestimates)

**Current Limitation:** Only ~50% of post-acquisition data is publicly
available; calibration is necessarily incomplete.

---

## Critical Transparency Statements

These appear prominently in all OAIS outputs:

1. **"Patient volume per company is unknown. We proxy with addressable
   population × penetration gap."**
2. **"Post-acquisition scaling is assumed from acquirer track record, not
   measured."**
3. **"Clinical efficacy is unknown for most pre-acquisition companies. We use
   stage as proxy."**
4. **"This framework captures opportunity, not guaranteed impact. Real impact
   depends on execution (unobservable)."**

---

## What OAIS Does NOT Claim

- ❌ Lives saved per dollar invested
- ❌ DALYs averted
- ❌ Quality-Adjusted Life Years (QALYs)
- ❌ Cost-effectiveness ratios
- ❌ Comparable impact across conditions
- ❌ Causal attribution of outcomes

## What OAIS Provides

- ✅ Strategic opportunity magnitude
- ✅ Transparent data sources for every estimate
- ✅ Explicit confidence levels (measured/proxy/assumption)
- ✅ Comparison framework for portfolio prioritization
- ✅ Auditable methodology
- ✅ Acknowledged limitations

---

## Use Cases

### Appropriate Uses ✓

- Portfolio prioritization across companies
- Identifying underserved opportunities
- Communicating market opportunity to LPs
- Internal investment committee discussions
- Quantifying gaps in current solutions

### Inappropriate Uses ✗

- Reporting impact to LPs as "lives saved"
- Comparing to validated health economics frameworks
- Regulatory submissions
- Public health policy decisions
- Clinical decision-making

---

## Methodology Updates Log

### Version 1.0 (May 2026)

- Initial framework with 3-tier confidence system
- 6 conditions in epidemiology database
- 4 example companies validated
- ConfidenceLevelIndicator and ValidationTracker components

### Planned Updates

- Add more conditions as epidemiology data verified
- Update penetration data quarterly (Sensor Tower)
- Recalibrate scaling multipliers as more acquisitions complete
- Add real-time tracking dashboard for prediction-reality comparison

---

## Citations

1. Centers for Disease Control and Prevention. National Center for Health
   Statistics. (2021). PCOS Prevalence Estimates.
2. NICHD. (2019). Endometriosis Research Findings. _Fertility & Sterility_,
   112(3), 503-512.
3. CDC. (2022). Pregnancy Mortality Surveillance System.
4. NIH/NICHD. (2020). Uterine Fibroid Research. _Journal of Women's Health_,
   29(4), 542-557.
5. CDC. (2022). National Survey of Family Growth.
6. JAMA Psychiatry. (2020). Meta-Analysis of Postpartum Depression Prevalence.
7. Sensor Tower. (2023). Women's Health App Market Report.
8. Oster, E. (2019). "Unobservable Selection and Coefficient Stability."
   _Journal of Business & Economic Statistics_, 37(2), 187-204.

---

## Repository & Implementation

**Code:** github.com/maekass/Lacuna

**Core implementation:**

- `src/lib/impact/oaisCalculator.ts` — OAIS formula, normalization,
  confidence-level tagging
- `src/data/dataset.verified.json` — population estimates, source citations
  (CDC/NICHD)

**UI components:**

- `src/components/ImpactOpportunityCard.tsx` — primary OAIS dashboard rendered
  on the home page (`#impact-assessment` anchor)
- `src/components/ValidationTracker.tsx` — pre/post-acquisition
  prediction-vs-reality calibration (`#validation-tracker` anchor)
- `src/components/ConfidenceLevelIndicator.tsx` — sub-component: 🟢🟡🔴
  confidence-tier badges used throughout

---

## Contact & Contributions

This methodology is open for review and improvement. Submit issues or pull
requests to: **Repository:** github.com/maekass/Lacuna

**Maintainer:** Lacuna Health Impact Framework Team

---

_Last updated: May 30, 2026_
