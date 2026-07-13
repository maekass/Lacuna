# Model Card: Acquisition Likelihood Indicator

**Component**: `ExitPredictor.tsx`\
**Type**: Deterministic weighted indicator (not a fitted/trained model)\
**Last updated**: June 2026\
**Dataset version**: v5 (58 verified acquisitions)

---

## Summary

This component scores non-acquired companies in the Lacuna dataset on factors
that co-occurred with prior verified acquisitions. It is a **descriptive tool**,
not a predictive model. With n=58 acquisitions total (and a subset available as
"priors" for any given candidate), there is insufficient data to train,
validate, or claim statistical predictive power.

The name "Acquisition Likelihood Indicator" is intentional — it is not called a
"predictor" or "model" in the UI.

---

## What it does

For each non-acquired company in the verified dataset, the scorer:

1. Derives empirical priors from the **verified acquired companies** in the same
   dataset:
   - Median age at acquisition
   - Median last-known valuation
   - Set of sectors with prior exits

2. Scores the candidate company against 5 disclosed factors:

| Factor                                        | Weight | Direction |
| --------------------------------------------- | ------ | --------- |
| Sector has prior verified exits               | +0.25  | Positive  |
| Late-stage funding (Series C+)                | +0.25  | Positive  |
| Valuation ≥ median prior-exit valuation       | +0.20  | Positive  |
| Age within 3 years of median prior-exit age   | +0.15  | Positive  |
| Already public (acquisition less common path) | −0.15  | Negative  |

3. Final score = sum of weights for present factors, clamped to [0, 1].

**Weights are fixed, hand-set, and disclosed.** They are not learned from data.

---

## What it does NOT do

- Does not use TensorFlow.js, neural networks, or any fitted model
- Does not produce statistically valid probability estimates
- Does not generalize beyond the companies in this dataset
- Does not constitute investment advice or a forecast

---

## Honest limitations

| Limitation               | Detail                                                                 |
| ------------------------ | ---------------------------------------------------------------------- |
| **Small n**              | n=58 acquisitions total; per-sector n is often 1–3                     |
| **Selection bias**       | Dataset overrepresents well-documented deals with disclosed valuations |
| **No held-out test set** | Weights not validated against unseen data                              |
| **Circular priors**      | Median valuation/age derived from the same dataset being scored        |
| **No time dimension**    | Does not model when an acquisition might occur                         |
| **Coverage gaps**        | Private company valuations are from last funding round, not current    |

---

## Baseline comparison

Since no model is fitted, formal accuracy metrics are not applicable. As a
sanity check, the indicator correctly assigns the highest scores to companies
sharing the most characteristics with the 6 core FemTech acquisitions (Modern
Fertility, Clue, Talkspace, Maven Clinic-adjacent profiles). This is expected
given the circular prior derivation and is **not** evidence of predictive
validity.

A naive majority-class baseline (predict "not acquired" for all) would be
correct for ~75–80% of companies given base rates — this is cited here as
context, not as a claim that the indicator outperforms it.

---

## Company Similarity Engine

**Component**: `CompanySimilarity.tsx`\
**Type**: Cosine similarity over hand-engineered feature vectors

Each company is represented as an 8-dimensional vector encoding sector, stage,
valuation tier, age, and funding characteristics. Similarity is computed via
cosine distance using `ml-matrix`. This is a **retrieval/comparison tool**, not
a classification or prediction model. No training occurs; the feature encoding
is manually defined.

---

## K-Means Clustering

**Component**: `ClusteringAnalysis.tsx`\
**Algorithm**: Lloyd's algorithm, k=3, 2D space (valuation × funding)\
**Library**: `simple-statistics`

Clusters are labeled Emerging / Growth / Late-stage based on centroid position.
Labels are descriptive post-hoc assignments, not predicted classes. With n≈23
non-acquired companies in the clustering space, cluster stability is low and
results should be interpreted qualitatively.

---

## Citation guidance

If referencing this tool in academic or professional contexts:

> Kass, M. (2026). _Lacuna: Network Intelligence Platform for Women's Health
> M&A_. Open-source portfolio project. Acquisition likelihood indicators use
> deterministic factor scoring derived from n=58 verified public-domain
> acquisitions; no fitted predictive model is employed.
> https://github.com/maekass/Lacuna

---

## Contact

Mae Kass, MPH (PsyD candidate; incoming MBA 2027) ·
[mps5cy@virginia.edu](mailto:mps5cy@virginia.edu) ·
[github.com/maekass](https://github.com/maekass) ·
[H20 Call to Action signatory](https://www.icn.ch/sites/default/files/2024-08/H20%20Call%20to%20action%20-%20Final%20version.pdf)
(G20 & G7 HDP, Aug 2024)
