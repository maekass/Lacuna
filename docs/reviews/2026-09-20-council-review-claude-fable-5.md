<!--
Provenance: AI-generated methodological review (Model Council run, Claude Fable 5 orchestrator),
commissioned and reviewed by Mae Kass on 2026-09-20. Evaluates the Lacuna quarantine memo for the
TF.js acquisition-likelihood model. Numerical examples are scenario calculations reproduced in
ml/research/council_review_2026_09/reproduce_council.py. Dataset counts (~150 companies, ~58 exits,
CT.gov registry counts) are supplied inputs, not independently re-derived here.
Follow-up analysis and roadmap: docs/plans/evidence-to-decision-roadmap.md
-->

# Council review (Claude Fable 5): "Don't un-quarantine the ML" — is the argument statistically right?

**Scope.** Independent, adversarial evaluation of the methodological memo about
Lacuna (≈150 verified women's-health companies, ≈58 acquisition events, 8-D
similarity vectors, quarantined TF.js "acquisition likelihood" model). Every
substantive claim is checked against primary literature; where I computed
numbers, the formula and inputs are shown so they can be re-run.

**One-paragraph verdict.** The memo's _conclusion_ is right (keep the
quarantine, fix the tags, do not ship a TF.js score), and its three "blockers"
are real. But roughly a third of its supporting statistics are hand-wavy or
wrong in ways a methodologist would catch: (a) it treats the case-control
calibration problem as incurable when a textbook intercept correction exists —
the real problem is that this dataset lacks the one input the correction needs
(a population prevalence from a defined frame) _and_ that its controls were
probably selected on covariates, which breaks the "relative ordering is fine"
claim too; (b) its events-per-variable arithmetic cites a rule the modern
literature has explicitly retired, and the replacement criteria (Riley et al.)
say the dataset is short by a factor of ~3–4 even for 8 predictors; (c) the
discrete-time hazard "unlock" does not relieve the information constraint at all
(58 events is 58 events), adds baseline-hazard parameters that make EPV _worse_,
and "cluster by acquirer" is incoherent because acquirer is undefined for 61% of
the sample and is a function of the outcome; (d) "neural nets lose on tabular
data at any realistic n" is overstated — the benchmark it leans on excluded
datasets under 3,000 rows, and a transformer (TabPFN) now beats tuned GBDTs on
exactly the small-tabular regime — although this does nothing to rescue TF.js;
(e) the ClinicalTrials.gov pivot is far less tractable than "n in the thousands,
fully public" implies: for non-oncology women's health, the free registry holds
only ≈250 industry Phase 2 trials started since 2010, phase labels are ambiguous
for ≈40% of records, and the published transition-rate literature is built on
paid Citeline/Biomedtracker data, not the registry. My recommended path is
below, with a concrete prioritized list.

---

## 0. Claim-by-claim scorecard

| #  | Memo claim                                                                                                    | Verdict                                                                                                                                                                                                                                                                                                  | Key evidence                                                                                                                                                                                                                                           |
| -- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1  | Case-control sampling without a frame ⇒ absolute probabilities are uncalibrated; "more data doesn't fix this" | **Right conclusion, wrong mechanism.** Intercept is recoverable via Prentice–Pyke / King–Zeng correction _if_ population prevalence τ is known; Lacuna lacks τ. Bigger omission: controls likely selected on X, which also biases the slopes — so "relative ordering is fine" is not guaranteed          | [Prentice–Pyke summary](https://pmc.ncbi.nlm.nih.gov/articles/PMC2835459/), [King & Zeng 2001](https://gking.harvard.edu/files/0s.pdf)                                                                                                                 |
| 2  | "~58 events supports 4–6 covariates"                                                                          | **Defensible as folklore, wrong as literature.** 10 EPV is from Peduzzi 1996; Vittinghoff & McCulloch relax it to 5–9; van Smeden 2016 says the evidence for 10 EPV is "weak"; Riley 2019 says "avoid" EPV rules. Under Riley criteria, 8 predictors at this event fraction need ≈610 companies, not 150 | [Peduzzi](https://pubmed.ncbi.nlm.nih.gov/8970487/), [Vittinghoff](https://pubmed.ncbi.nlm.nih.gov/17182981/), [van Smeden 2016](https://link.springer.com/article/10.1186/s12874-016-0267-3), [Riley 2019](https://pubmed.ncbi.nlm.nih.gov/30357870/) |
| 3  | "Not acquired" is a censoring point; binary classification is mis-specified                                   | **Right.** Discrete-time hazard is the right family, but the memo ignores competing risks (shutdown, IPO), left truncation/survivorship in controls, and few-events-per-period                                                                                                                           | [Delayed entry](https://pmc.ncbi.nlm.nih.gov/articles/PMC5502209/), [discrete-time survival](https://pmc.ncbi.nlm.nih.gov/articles/PMC9316420/), [discrete competing risks](https://academic.oup.com/biometrics/article/81/2/ujaf040/8120014)          |
| 4  | Cluster SEs by acquirer and sector                                                                            | **Incoherent as stated.** Acquirer exists only for the 58 acquired firms (post-outcome variable); sector gives G≈6–10 clusters where CRVE overrejects at 12–21% for a nominal 5% test                                                                                                                    | [Cameron & Miller 2015](https://cameron.econ.ucdavis.edu/research/Cameron_Miller_JHR_2015.pdf), [Abadie et al. 2023](https://academic.oup.com/qje/article-abstract/138/1/1/6750017)                                                                    |
| 5  | 150 × 8 = 1,200 company-years "unlocks" the analysis                                                          | **Arithmetic holds, inference doesn't.** Information ≈ events (58), not rows. Period dummies add 7 parameters ⇒ EPV falls from 7.25 to 3.9. Riley survival criteria still demand ≈460 companies / ≈180 events for 8 predictors                                                                           | [Riley 2019](https://pubmed.ncbi.nlm.nih.gov/30357870/), [pmsampsize](https://stat.ethz.ch/CRAN/web/packages/pmsampsize/pmsampsize.pdf)                                                                                                                |
| 6  | Penalized logistic / GBDT beats NNs "at any n you'll realistically reach"                                     | **Overstated.** Grinsztajn benchmark required N ≥ 3,000; TabPFN (a transformer) beats tuned CatBoost on ≤10k-row tabular data. At n=150, GBDT is _also_ inappropriate; the defensible choice is penalized/Firth logistic — and Riley 2021 shows penalization itself is unreliable at small n             | [Grinsztajn](https://arxiv.org/abs/2207.08815), [TabPFN, Nature 2025](https://www.nature.com/articles/s41586-024-08328-6), [Riley 2021](https://pubmed.ncbi.nlm.nih.gov/33307188/)                                                                     |
| 7  | TF.js in client bundle "breaks the reproducibility promise"                                                   | **Half real, half rhetoric.** Device-dependent WebGL precision (fp16 fallback on iOS) is documented; but for a tiny tabular model the numeric drift is immaterial. The real objection is auditability/provenance, not bitwise reproducibility                                                            | [TF.js platform docs](https://github.com/tensorflow/tfjs-website/blob/master/docs/guide/platform_environment.md)                                                                                                                                       |
| 8  | ClinicalTrials.gov phase transitions: "n in the thousands, fully public, defensible"                          | **Materially overstated for women's health.** Non-oncology women's-health industry Phase 2 trials started 2010+: 249 (my API count). Published PoS literature uses paid Citeline/Biomedtracker. Transition definition alone moves Phase II→III PoS from 28.9% to 48.6%                                   | [BIO 2011–2020](https://go.bio.org/rs/490-EHZ-999/images/ClinicalDevelopmentSuccessRates2011_2020.pdf), [Wong, Siah & Lo 2019](https://r.jordan.im/download/research/wong2019.pdf), [CT.gov API](https://clinicaltrials.gov/api/v2/studies)            |
| 9  | "You could call it predictive and survive a methodologist"                                                    | **No.** A model is "predictive" when validated; validation with the ≈10–15 out-of-time events available gives a c-statistic 95% CI of roughly ±0.16–0.18. External-validation guidance asks for ≥100 (ideally 200) events                                                                                | [Collins et al. 2016](https://pmc.ncbi.nlm.nih.gov/articles/PMC4738418/), [Riley 2021 validation](https://pubmed.ncbi.nlm.nih.gov/34031906/)                                                                                                           |
| 10 | Keep quarantine, fix tags                                                                                     | **Right.** See §10 for what to ship instead                                                                                                                                                                                                                                                              |                                                                                                                                                                                                                                                        |

---

## 1. Outcome-dependent sampling and calibration

**What the memo gets right.** If companies entered the catalog _because_ they
were acquired, and the non-acquired set is "whatever else you happened to
catalog," the sample fraction of events (58/150 = 38.7%) bears no relationship
to the population fraction. Any fitted intercept is therefore an artifact of
catalog construction, and "68% likely to be acquired" is uninterpretable as an
absolute probability.

**What it gets wrong: "more data doesn't fix this" is true, but "a defined
sampling frame does" undersells what is actually known.** Under _pure_
outcome-dependent (case-control) sampling, Prentice & Pyke (1979) showed that
prospective logistic regression run naively on the retrospective sample gives
consistent estimates of every coefficient _except_ the intercept, and the
intercept is off by exactly \(\log\frac{P(\text{sampled}\mid
Y=1)}{P(\text{sampled}\mid Y=0)}\), which reduces to a function of the
population prevalence \(q_0\); adding \(\log\frac{q_0}{1-q_0}\)-type correction
recovers the true regression function
([Prentice–Pyke explanation](https://pmc.ncbi.nlm.nih.gov/articles/PMC2835459/)).
King & Zeng's "prior correction" is the same idea written as \[
\tilde\beta_0=\hat\beta_0-\ln\!\left[\left(\frac{1-\tau}{\tau}\right)\left(\frac{\bar
y}{1-\bar y}\right)\right], \] with \(\tau\) the population fraction of ones and
\(\bar y\) the sample fraction; they also give a weighting alternative and a
small-sample bias correction \(\tilde\beta=\hat\beta-\text{bias}(\hat\beta)\),
noting logit coefficients "are biased in small samples (under about 200)"
([King & Zeng 2001](https://gking.harvard.edu/files/0s.pdf)). So calibration is
_not_ destroyed in principle — it is recoverable with one scalar.

**What the correction requires that Lacuna lacks.** Two things:

1. **A value for τ.** τ is "fraction of women's-health companies (in a defined
   universe, over a defined horizon) that are acquired." That number does not
   exist without the sampling frame the memo says costs money. To show how much
   rides on it, the intercept shift for \(\bar y=0.387\) is:

   | Assumed population τ (acquired within horizon) | Intercept shift (logits) | A sample-fitted "68%" becomes |
   | ---------------------------------------------- | ------------------------ | ----------------------------- |
   | 5%                                             | −2.48                    | 15.1%                         |
   | 10%                                            | −1.74                    | 27.2%                         |
   | 15%                                            | −1.27                    | 37.3%                         |
   | 20%                                            | −0.92                    | 45.7%                         |

   The displayed score can move by 50 points depending on a quantity nobody has
   measured. This is the quantitative form of the memo's point, and it is
   stronger than the memo's prose.

2. **Sampling that depends on Y only, not on X.** Prentice–Pyke consistency of
   the _slopes_ requires that inclusion probability depends only on the outcome
   ([Prentice–Pyke explanation](https://pmc.ncbi.nlm.nih.gov/articles/PMC2835459/)).
   Lacuna's controls were almost certainly selected on visibility — funding
   announcements, press coverage, trial registrations — which are also candidate
   predictors. Selection on X within strata of Y biases the slopes, not just the
   intercept. **This means the memo's fallback ("you can get relative ordering")
   is not guaranteed either.** A ranking built on visibility-selected controls
   will systematically say "well-covered companies get acquired," because the
   poorly-covered non-acquired companies were never catalogued. The memo misses
   this entirely.

**Bottom line for §1.** Calibration is fixable in principle (intercept
correction) but requires τ from a frame; ranking is fixable only if control
selection was outcome-only, which is doubtful. The memo's conclusion stands; its
reasoning is incomplete on both sides.

---

## 2. Events per variable: what the literature actually says

The memo's "58 events supports roughly 4–6 covariates" is 58/10 ≈ 5.8 rounded to
a range — i.e., the 10-EPV rule. Trace of the actual literature:

| Source                                                                                                    | What it found                                                                                                                                                                                                                                                                                                                                                                                                                                         | Implication for 58 events                                         |
| --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Peduzzi et al. 1996 — Monte Carlo on 673 patients / 252 deaths / 7 predictors; EPV = 2, 5, 10, 15, 20, 25 | "No major problems" at EPV ≥ 10; below 10, biased coefficients, wrong CI coverage, conservative Wald tests, "paradoxical associations" ([PubMed](https://pubmed.ncbi.nlm.nih.gov/8970487/))                                                                                                                                                                                                                                                           | ≤5 predictors                                                     |
| Vittinghoff & McCulloch 2007 — large simulation, logistic and Cox                                         | At 5–9 EPV vs 10–16 EPV, "any problem" (coverage <93%, type I >7%, relative bias >15%) occurred in 7.2% vs 3.4% of logistic scenarios with a binary predictor; max relative bias 51.3% vs 36.8%; they conclude 10 EPV "may be too conservative" for confounder-adjustment analyses ([PDF](https://scispace.com/pdf/relaxing-the-rule-of-ten-events-per-variable-in-logistic-and-1yg9p2lwg8.pdf), [PubMed](https://pubmed.ncbi.nlm.nih.gov/17182981/)) | 6–11 predictors for _inference on one effect_, not for prediction |
| van Smeden et al. 2016 — 465 scenarios × 10,000 datasets                                                  | "The evidence underlying the EPV = 10 rule as a minimal sample size criterion for binary logistic regression analysis is weak"; ML bias away from zero follows \(\log                                                                                                                                                                                                                                                                                 | \text{bias}                                                       |
| van Smeden et al. 2019 — prediction performance                                                           | "EPV did not have a strong relation with predictive-performance metrics"; the drivers are total N, event fraction, and number of candidate predictors ([PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC6710621/))                                                                                                                                                                                                                                      | EPV is the wrong yardstick for a _prediction_ model               |
| Riley et al. 2019 (Stat Med, Part II)                                                                     | Three criteria: global shrinkage ≥0.9, optimism in Nagelkerke R² ≤0.05, precise intercept; examples requiring 4.8 EPP in one case and 23 EPP in another; "rules of thumb, such as 10 EPP, should be avoided" ([PubMed](https://pubmed.ncbi.nlm.nih.gov/30357870/))                                                                                                                                                                                    | Compute it; do not guess                                          |

**Running the Riley criteria on Lacuna.** Criterion 1 is \(n \ge
\dfrac{p}{(S-1)\ln(1-R^2_{CS}/S)}\) with \(S=0.9\); criterion 3 is \(n \ge
(1.96/0.05)^2\,\phi(1-\phi)\); max
\(R^2_{CS}=1-\big(\phi^\phi(1-\phi)^{1-\phi}\big)^2\), and absent prior evidence
Riley recommends assuming the model explains 15% of the maximum
([pmsampsize manual](https://stat.ethz.ch/CRAN/web/packages/pmsampsize/pmsampsize.pdf)).
With \(\phi = 58/150\):

| Scenario                                    | max R²_CS | assumed R²_CS | n (crit. 1) | n (crit. 3) | **Minimum n** | Events needed | Implied EPP |
| ------------------------------------------- | --------- | ------------- | ----------- | ----------- | ------------- | ------------- | ----------- |
| p = 8, R² = 15% of max                      | 0.737     | 0.111         | 611         | 365         | **611**       | 237           | 29.5        |
| p = 8, R² = 30% of max (optimistic)         | 0.737     | 0.221         | 284         | 365         | **365**       | 141           | 17.6        |
| p = 5, R² = 15% of max                      | 0.737     | 0.111         | 382         | 365         | **382**       | 148           | 29.5        |
| p = 8, _population_ φ = 0.10 (a real frame) | 0.478     | 0.072         | 964         | 139         | **964**       | 97            | 12.0        |

Lacuna has n = 150. The memo's "4–6 covariates" is therefore _too generous_, not
too conservative: under the criteria the field now uses, 150 companies does not
support a well-calibrated 5-predictor model either — the binding constraint is
the intercept-precision criterion (n ≥ 365 at this event fraction) and shrinkage
(n ≥ 382–611).

**Does penalization change the arithmetic?** Less than practitioners assume.
Riley et al. 2021 found that uniform shrinkage, ridge, lasso and elastic net
"can be unreliable because tuning parameters are estimated with large
uncertainty," most severely "when development datasets have a small effective
sample size" and low R² — exactly Lacuna's regime — and conclude penalization
"is not a carte blanche" ([PubMed](https://pubmed.ncbi.nlm.nih.gov/33307188/)).
Firth's penalty handles separation and coefficient bias but biases predicted
probabilities toward 0.5, requiring the FLIC (intercept correction) or FLAC
(added covariate) fixes if predictions are the goal
([Puhr et al. 2017](https://pubmed.ncbi.nlm.nih.gov/28295456/);
[arXiv version](https://arxiv.org/pdf/2101.07620)). So: penalize (Firth+FLIC or
ridge), yes; but the required n barely moves.

---

## 3. Censoring and the discrete-time hazard reframing

**The memo is right that binary classification is mis-specified.** A
2023-founded and a 2011-founded company both labelled 0 carry different
information; the outcome is "acquired by time t," and a company observed for 2
years has simply not had time. Discrete-time survival models fit exactly this: a
person-period (company-year) dataset with a binary event indicator per interval
and a logit or complementary log-log link, where the cloglog link gives the
discrete-time analogue of a proportional-hazards model
([Suresh et al. 2022, discrete-time survival prediction](https://pmc.ncbi.nlm.nih.gov/articles/PMC9316420/)).

**Failure modes at this n the memo does not mention:**

1. **Baseline-hazard parameters consume events.** A fully flexible baseline
   needs one dummy per period: 8 periods → 7 extra parameters. 58 events / (8
   covariates + 7 dummies) = **3.9 EPV**, below even Peduzzi's floor. You would
   have to use a parametric time trend (linear or quadratic in company age, 1–2
   parameters) — a modelling assumption that must be stated in the rubric.
2. **Few events per period.** 58 events over 8 company-age intervals ≈ 7 per
   interval on average, and fewer at ages 1–2 and 7–8. Period-specific hazards
   will have Wilson CIs wider than the point estimates. Even the pooled annual
   hazard, 58/1,200 = 4.8%, has a 95% Wilson CI of **[3.8%, 6.2%]** — before any
   covariate.
3. **Separation.** With ~7 events per cell and 8 covariates, quasi-complete
   separation on any binary covariate (e.g., "has FDA clearance") is likely; van
   Smeden et al. found separation in 5.8% of datasets at EPV = 4 with a single
   strong covariate
   ([BMC MRM](https://link.springer.com/article/10.1186/s12874-016-0267-3)).
   Firth or ridge is mandatory, not optional.
4. **Left truncation / delayed entry.** Companies enter the catalog at
   catalog-construction time, not at founding. Companies that shut down (or were
   quietly acquired) before the catalog existed are never observed. Ignoring
   delayed entry gives "an upward bias that depends on the study entry
   distribution" in survival estimates, because "the shorter survival times are
   underrepresented"
   ([Recognizing the problem of delayed entry](https://pmc.ncbi.nlm.nih.gov/articles/PMC5502209/)).
   Fix: condition each company's risk set on survival to its entry date
   (left-truncated likelihood). The memo's "150 × 8 = 1,200 rows" silently
   counts pre-entry years as observed at-risk time, which is wrong.
5. **Competing risks.** Shutdown, IPO, and "still private" are not equivalent
   censorings. Treating shutdowns as non-informative censoring inflates the
   acquisition hazard. The correct discrete-time treatment is a multinomial
   (cause-specific) model per period
   ([discrete-time competing-risks regression](https://academic.oup.com/biometrics/article/81/2/ujaf040/8120014)),
   which splits 58 events across even more parameters — or at minimum report
   cause-specific hazards and state the assumption.
6. **Right-censoring by data recency.** Deals announced in 2025–26 that are not
   yet "verified" look like non-events. Out-of-time validation on the last 1–2
   years is exactly where label completeness is lowest.

**Verdict:** discrete-time hazard is the right _family_, but the memo's sketch
of it is the easy half. Done properly (left truncation, parametric baseline,
cause-specific events, Firth penalty), it is a descriptive hazard estimate with
a stated rubric — which is worth publishing — not a predictive model.

---

## 4. Clustering standard errors by acquirer and sector

This is the memo's clearest technical error.

- **Acquirer is a post-outcome variable.** It is defined only for the 58
  acquired companies; the 92 non-acquired have no acquirer. Any implementation
  either drops them (destroying the analysis) or assigns singleton clusters
  (which collapses to ordinary heteroskedasticity-robust SEs). Abadie, Athey,
  Imbens & Wooldridge frame clustering as an adjustment for "the correlations
  induced by sampling the outcome variable from a data-generating process with
  unobserved cluster-level components" or by the assignment mechanism
  ([QJE 2023](https://academic.oup.com/qje/article-abstract/138/1/1/6750017)) —
  cluster membership must be defined _before_ the outcome. A cluster defined by
  who bought you is a function of Y.
- **Sector gives too few clusters.** Women's health decomposes into perhaps 6–10
  sub-sectors (fertility, menopause, maternal, contraception, pelvic/sexual
  health, diagnostics, digital). Cameron & Miller report that with the standard
  CRVE and 1.96 critical values, nominal-5% tests reject at 0.118 (G = 10),
  0.208 (G = 5), and 0.183 with unbalanced G = 10; they recommend at minimum
  T(G−1) critical values and the \(\sqrt{G/(G-1)}\) or \(c =
  \frac{G}{G-1}\frac{N-1}{N-K}\) residual scaling, and note even these
  "generally reduce, but do not eliminate, overrejection" — a wild-cluster
  bootstrap is the standard remedy at G < 20–50
  ([Cameron & Miller 2015](https://cameron.econ.ucdavis.edu/research/Cameron_Miller_JHR_2015.pdf)).
- **What the memo is groping toward is real but is a modelling issue, not a
  variance issue.** Repeat acquirers (a strategic buying three fertility clinics
  in two years) create dependence in _outcomes_ through acquirer-side demand.
  That belongs in the mean model as a covariate (e.g., sector-year deal count,
  or a sector-specific baseline hazard), or as a sector random effect — not in a
  post-hoc SE correction on an undefined cluster.

---

## 5. Does the company-year restructuring relieve the EPV constraint?

**Arithmetic:** 150 × 8 = 1,200 rows holds only if every company is observed for
8 years, which conflicts with the memo's own point that founding years range
from 2011 to 2023. Realistic at-risk years (after left-truncation) are probably
600–900. But the row count is beside the point.

**Information:** In a hazard model, the Fisher information is driven by the
number of events, not person-periods; person-period rows are pseudo-observations
that expand the likelihood, not the data. Riley's Part II time-to-event criteria
make this explicit by parameterizing sample size through event rate and mean
follow-up ([Riley 2019](https://pubmed.ncbi.nlm.nih.gov/30357870/);
[pmsampsize](https://stat.ethz.ch/CRAN/web/packages/pmsampsize/pmsampsize.pdf)).
Applying them with rate = 58/1,200 per company-year, mean follow-up 8, R² = 15%
of max:

| Model                             | Parameters | Minimum companies | Events required | EPP |
| --------------------------------- | ---------- | ----------------- | --------------- | --- |
| 8 covariates, parametric baseline | 8          | ≈462              | ≈179            | 22  |
| 8 covariates + 7 period dummies   | 15         | ≈865              | ≈335            | 22  |

Versus 150 companies / 58 events available. **The reframing appears to multiply
n by 8 while leaving the event count, and therefore the effective sample size,
exactly where it was — and it _adds_ parameters.** The memo half-acknowledges
this ("58 events") but then describes the result as an "unlock," which it is
not. The honest framing: the hazard model fixes the _specification_; it does not
fix the _sample size_.

---

## 6. Neural nets vs penalized regression / gradient boosting at this scale

**Where the memo is right.** The two benchmark papers it implicitly leans on are
real and point the way it says: Grinsztajn et al. find "tree-based models remain
state-of-the-art on medium-sized data (∼10K samples)" across 45 datasets with
20,000 compute-hours of tuning per learner
([arXiv](https://arxiv.org/abs/2207.08815)); Shwartz-Ziv & Armon find "XGBoost
outperforms these deep models across the datasets, including the datasets used
in the papers that proposed the deep models"
([arXiv](https://arxiv.org/abs/2106.03253)).

**Where it is overstated.**

1. **The benchmarks do not cover Lacuna's regime.** Grinsztajn's inclusion
   criteria required datasets that were "not too small" (N ≥ 3,000, d ≥ 4) and
   truncated at N = 10,000
   ([dataset criteria as summarized in Trompt, ICML 2023, App. A.1](https://proceedings.mlr.press/v202/chen23c/chen23c.pdf)).
   n = 150 (or 1,200 pseudo-rows) is an order of magnitude below the benchmark
   floor. Neither paper licenses a claim about "any n you'll realistically
   reach."
2. **A neural approach now wins on small tabular data.** TabPFN — a transformer
   pre-trained on synthetic tables — targets datasets up to 10,000 rows and 500
   features and, in default configuration, outperformed CatBoost tuned for 4
   hours (normalized ROC-AUC 0.939 vs 0.752 default; 0.952 vs 0.822 tuned)
   across 29 classification datasets
   ([Nature 2025](https://www.nature.com/articles/s41586-024-08328-6)). "A
   neural net is out of the question — not conservative, just arithmetic" is
   therefore false as a statement about neural nets; it is true as a statement
   about _training a TF.js MLP from scratch on 58 events_.
3. **GBDT is not the safe alternative at n = 150 either.** Boosting on 150 rows
   with 8 features and 58 events will overfit; the per-tree splits are chasing
   individual companies. The empirical "trees beat NNs" result does not imply
   "trees are fine at n = 150."
4. **Penalized logistic is not a free lunch.** See §2: Riley 2021 documents that
   penalty tuning is unreliable at small effective n
   ([PubMed](https://pubmed.ncbi.nlm.nih.gov/33307188/)).

**Corrected statement:** at n ≈ 150 / 58 events, the only defensible supervised
model is a low-dimensional Firth- or ridge-penalized (discrete-time) logistic
regression with a pre-specified covariate set — because it is _auditable and its
failure is visible_, not because it "beats" anything. If the dataset grows to
the 500–1,000 range with a real frame, TabPFN and penalized logistic should both
be evaluated; TF.js MLP should not.

---

## 7. TF.js in a Next.js client bundle: real problem or rhetoric?

**Real, but narrower than stated.** TensorFlow.js documentation states that
"WebGL is hardware-specific, and different devices can have varying precision,"
that WebGL "may fall back to 16-bit floats on iOS devices" (fp16 range
\([5.96\times10^{-8}, 65504]\)), and that only the WASM backend offers "portable
32-bit float arithmetic, offering precision parity across all devices"; backend
selection is automatic unless pinned
([TF.js platform & environment guide](https://github.com/tensorflow/tfjs-website/blob/master/docs/guide/platform_environment.md)).
So the same weights can yield different scores on a MacBook and an iPhone. That
is a genuine bitwise-reproducibility gap.

**Why it is mostly rhetoric here.** For an 8-input MLP producing a percentage,
fp16-vs-fp32 drift is on the order of 10⁻³ — invisible after rounding to "68%."
The drift is trivially eliminated by `tf.setBackend('wasm')` or by moving
inference server-side. If this were the only objection, it would not justify a
quarantine.

**The objection that actually matters (which the memo does not make):** a model
card's reproducibility promise is about _provenance_ — training data snapshot,
code, seed, evaluation protocol — per Mitchell et al.'s model-card framework
([arXiv](https://arxiv.org/abs/1810.03993)). A weights blob shipped in a client
bundle (a) is version-drifted independently of the backend's data snapshot, (b)
is trivially extractable and re-purposable by any visitor, which for a diligence
tool is an IP and misrepresentation risk, and (c) makes the _training_ pipeline
invisible to auditors. Those are strong reasons; the fp16 point is a footnote.

---

## 8. The ClinicalTrials.gov phase-transition pivot

The memo says: "n in the thousands and fully public… where predictive modeling
on free data is actually defensible." Checked against the registry and the
literature:

**8a. Realistic n for women's health (my counts against the CT.gov v2 API,
September 2026):**

| Query (condition terms: endometriosis, PCOS, menopause, preeclampsia, contraception, infertility, fibroids, PPD, BV, preterm birth, VVA, HSDD, HMB, dysmenorrhea) | Count       |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| All registered trials, non-oncology women's health                                                                                                                | 14,561      |
| — of which Phase = N/A (devices, behavioral, diagnostics, digital)                                                                                                | 6,243 (43%) |
| Industry-sponsored Phase 2, started 2010+                                                                                                                         | **249**     |
| — completed / terminated / withdrawn (i.e., transition observable)                                                                                                | 196         |
| — with results posted                                                                                                                                             | 95          |
| Industry-sponsored Phase 3, started 2010+                                                                                                                         | 312         |
| Trials labelled "Phase 2/Phase 3" (combined)                                                                                                                      | 243         |
| Same queries _including_ breast, ovarian, cervical cancer: industry Phase 2 started 2010+                                                                         | 1,802       |

Source: [ClinicalTrials.gov API v2](https://clinicaltrials.gov/api/v2/studies)
(queries `AREA[Phase]`, `AREA[LeadSponsorClass]`, `AREA[StartDate]`,
`AREA[OverallStatus]`, `AREA[HasResults]`). These are _trials_, not programs; a
drug–indication program typically has 1.5–3 Phase 2 trials, so the non-oncology
women's-health universe is on the order of **100–150 Phase 2 programs with an
observable Phase 2→3 outcome** — i.e., the same order of magnitude as the 58
acquisitions, not "thousands." "Thousands" is only true if you (a) include
gyn/breast oncology, which is a different thesis and a different buyer set, or
(b) drop the women's-health restriction altogether.

**8b. Where the published transition rates actually come from.** Both canonical
sources use paid, curated data, not the registry: BIO/Informa/QLS analyzed
12,728 transitions across 9,704 programs from Biomedtracker
([BIO 2011–2020](https://go.bio.org/rs/490-EHZ-999/images/ClinicalDevelopmentSuccessRates2011_2020.pdf));
Wong, Siah & Lo used Citeline Trialtrove + Pharmaprojects (406,038 entries,
185,994 trials, 21,143 compounds), and had to _impute_ end dates for 14.6% of
records and delete 46,524 entries with missing dates or unidentified sponsors
([Wong et al. 2019](https://r.jordan.im/download/research/wong2019.pdf)).
Citeline itself ingests ClinicalTrials.gov nightly _plus_ press releases,
financial reports and analyst reports "to reduce potential bias from
organizations' tendency to report only successful trials"
([Wong et al. 2019](https://r.jordan.im/download/research/wong2019.pdf)). The
free registry alone is the input those vendors consider insufficient.

**8c. The transition is not well-defined on the registry.** There is no
"program" object in ClinicalTrials.gov; you must link a Phase 2 trial to a later
Phase 3 trial of the same intervention–indication–sponsor. Intervention names
are free text and change across licensing deals; sponsors change on acquisition
(the very event Lacuna cares about). Wong et al. had to build a recursive
path-reconstruction algorithm over drug–indication pairs to do this on _curated_
data ([Wong et al. 2019](https://r.jordan.im/download/research/wong2019.pdf)).
And the definition drives the answer: BIO counts a program as transitioned when
it advances _or is suspended_, giving Phase II→III = **28.9%** (n = 4,933);
Wong's path-by-path method gives **48.6%** (n = 21,180) for the same transition
([BIO](https://go.bio.org/rs/490-EHZ-999/images/ClinicalDevelopmentSuccessRates2011_2020.pdf);
[Wong et al.](https://r.jordan.im/download/research/wong2019.pdf)). A 20-point
swing from definition alone means a "prediction" of Phase 3 entry is only as
meaningful as the rubric attached to it — which is the same problem the memo
diagnosed for acquisition.

**8d. Registry-specific hazards.**

- _Incompleteness / compliance._ FDAAA 801 results-reporting applies to
  "applicable clinical trials" (largely non-Phase-1 drug/device trials with a US
  site) and became enforceable April 2017
  ([ClinicalTrials.gov FDAAA 801 page](https://clinicaltrials.gov/policy/fdaaa-801-final-rule));
  Phase 1 registration was never required, and pre-2017 records are
  systematically thinner
  ([common problems using ClinicalTrials.gov](https://pmc.ncbi.nlm.nih.gov/articles/PMC5968400/)).
  Only 95 of 249 women's-health industry Phase 2 trials have posted results (my
  count above).
- _Phase-label ambiguity._ 243 women's-health trials carry the combined "Phase
  2/Phase 3" label and 1,870 (incl. oncology) carry "Phase 1/Phase 2"; the
  analyst must decide unilaterally which transition they represent.
- _Right-censoring._ A Phase 2 completed in 2024 has not had time to spawn a
  Phase 3 (median gap 1–2 years); the most recent — most relevant — cohort is
  exactly the one with unobservable outcomes, so the same time-to-event
  machinery (and the same small-n interval widths) is required.
- _Femtech is device- and software-heavy._ 43% of women's-health trials have no
  phase at all. The companies most relevant to Lacuna's M&A thesis (digital
  health, diagnostics, devices) are structurally excluded from a
  phase-transition target.

**Verdict:** the pivot is well-posed only at the all-therapeutic-area level,
where it is also already done (BIO, Wong et al.) and adds little. Restricted to
women's health it has n comparable to the acquisition problem, worse label
ambiguity, and a program-linkage problem the memo does not mention. It is not
the free lunch described.

**A better use of the registry (non-obvious):** treat CT.gov _sponsors_ as a
**sampling frame**, not as a target. "All industry lead sponsors of a
women's-health trial started 2010+" is a defined, free, reproducible universe of
clinical-stage women's-health companies. Label acquisition outcomes across
_that_ universe and you have solved the §1 problem (τ becomes estimable;
controls are frame-defined, not visibility-defined) for the clinical-stage
subset, at zero data cost. This directly addresses the memo's "the unlock is the
sampling frame, and it costs money" — for the clinical-stage slice, it does not.

---

## 9. What the memo materially misses

1. **Control selection on covariates (§1).** The biggest omission. If controls
   were catalogued because they were visible, slopes — and therefore rankings —
   are biased, not just the intercept. "Relative ordering is fine" is unproven.
2. **Point-in-time features / label leakage.** Nothing in the memo addresses
   whether the 8-D similarity features are measured _before_ the acquisition.
   Headcount, funding total, product count and press volume scraped today for an
   acquired company reflect its post-deal state; any model trained on them
   learns "looks like a company that has been acquired," which is tautological.
   This is the single most common reason M&A-prediction models look good
   in-sample and fail out-of-time.
3. **Undefined prediction horizon.** "68% likely to be acquired" — by when? A
   hazard model forces a horizon (P(acquired within 3 years | survived to age
   a)); the current tag has none, which alone makes it unfalsifiable.
4. **Outcome heterogeneity.** Acquisition ≠ good outcome. Distressed sales,
   acqui-hires and asset purchases are pooled with strategic exits. For an M&A
   diligence platform the interesting quantity is exit _quality_
   (price/valuation multiple), for which 58 events with mostly undisclosed terms
   yields essentially nothing.
5. **Validation is impossible at this n, and the memo's "wide CI" understates
   how wide.** External validation guidance asks for ≥100 events, ideally 200
   ([Collins et al. 2016](https://pmc.ncbi.nlm.nih.gov/articles/PMC4738418/));
   Riley's validation criteria produced, in their worked example, a requirement
   of 9,835 participants / 177 events to estimate calibration slope precisely
   ([Riley 2021](https://pubmed.ncbi.nlm.nih.gov/34031906/)). An out-of-time
   hold-out of the last two years at Lacuna gives perhaps 12 events / 40
   non-events: by the Hanley–McNeil formula
   ([Radiology 1982](https://jhanley.biostat.mcgill.ca/software/Hanley_McNeil_Radiology_82.pdf)),
   a c-statistic of 0.70 has SE ≈ 0.093, i.e., **95% CI ≈ [0.52, 0.88]** —
   indistinguishable from coin-flip at the lower end. Calibration slope is
   unestimable. "Show it as wide" is correct advice, but at this width the
   honest label is "not validated," not "predictive."
6. **The similarity layer is a retrieval problem, not a prediction problem — and
   that is fine.** An 8-D nearest-neighbor "comparable companies" feature is a
   legitimate diligence tool with no calibration claim. The memo treats the ML
   question as binary (predictive or quarantined); the third option is to
   re-describe the existing layer accurately.
7. **Descriptive base rates are publishable now.** Kaplan–Meier-style cumulative
   incidence of acquisition by company age and sub-sector, with Wilson/Greenwood
   intervals, left-truncation adjustment, and an explicit statement that the
   sample is not a frame — that is a defensible, citable artifact that a
   methodologist would respect and an investor would use.

---

## 10. Bottom line and recommended action list

**Is the recommendation right?** Yes: keep the model quarantined, change the
tags, do not ship a TF.js score. The memo's rhetorical closing point — that
un-quarantining to match marketing copy inverts the "audit over sale" story — is
also right and, for an application context, decisive.

**Is the optional middle path ("ship a discrete-time hazard, call it
predictive") right?** No. Ship the hazard as _descriptive_, with intervals; do
not call it predictive. The Riley criteria say a predictive model needs ≈460–610
companies for 8 predictors; validation guidance says ≥100 held-out events.
Lacuna has 150 and could hold out ~12. "Survive a methodologist" is not a
standard that a 12-event validation meets.

**Prioritized actions (cheapest, highest-integrity first):**

| Priority         | Action                                                                                                                                                                                                                                                                                                                | Why / what it buys                                                                                                                                                         | Cost       |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| **P0**           | Rewrite every tag/label from "acquisition likelihood / predictive" to "similarity to acquired comparables (descriptive, 8-D cosine)" and add a horizon-free disclaimer on the model card that no calibrated probability is offered                                                                                    | Removes the misrepresentation today; consistent with Mitchell et al.'s intended-use / limitations sections ([Model Cards](https://arxiv.org/abs/1810.03993))               | Hours      |
| **P0**           | Document the catalog inclusion process (how each company entered; source) and tag each control as "found via deal list / via trial registry / via press / other"                                                                                                                                                      | Makes the §1 selection-on-X problem inspectable; a prerequisite for any later frame-based correction                                                                       | Hours      |
| **P1**           | Publish descriptive survival statistics: cumulative incidence of acquisition by company age (left-truncated at catalog entry), by sub-sector, with Greenwood/Wilson 95% CIs; cause-specific for acquisition vs shutdown vs IPO; state explicitly "sample is not a population frame; absolute rates not generalizable" | This is the honest version of the memo's hazard model. Pooled annual hazard 4.8% [3.8%, 6.2%] is already reportable                                                        | Days       |
| **P1**           | Freeze point-in-time features: every covariate stamped with as-of date ≤ event/censoring date; drop anything unavailable pre-event                                                                                                                                                                                    | Eliminates the leakage that would otherwise make any future model fraudulent                                                                                               | Days       |
| **P2**           | Build the free sampling frame: all industry lead sponsors of women's-health trials started 2010+ from the CT.gov API (~hundreds of unique sponsors; my Phase 2+3 counts above bound it), de-duplicated, then label acquisition outcomes across the frame from press/SEC                                               | Solves the frame problem for the clinical-stage slice at zero data cost; yields an estimable τ and outcome-only control selection; turns §1 from "unfixable" to "fixed"    | 1–3 weeks  |
| **P2**           | On the frame, fit a discrete-time cause-specific hazard with ≤4 pre-specified covariates + linear age term, Firth penalty with FLIC ([Puhr et al.](https://pubmed.ncbi.nlm.nih.gov/28295456/)), sector as random effect (not cluster-SE); report shrinkage factor and Riley criteria met/not met                      | Defensible _estimation_; still label it descriptive until ≥100 held-out events exist                                                                                       | 1 week     |
| **P3**           | Only if frame reaches ≈500+ companies / ≈150+ events: compare Firth/ridge logistic vs TabPFN vs CatBoost under repeated out-of-time CV; report c-statistic and calibration slope with CIs; then — and only then — use the word "predictive"                                                                           | Matches Riley criteria (n ≈ 462–611 for p = 8) and TabPFN's validated regime (≤10k rows) ([Nature 2025](https://www.nature.com/articles/s41586-024-08328-6))               | Contingent |
| **Never**        | Re-enable the TF.js MLP in the client bundle                                                                                                                                                                                                                                                                          | Not the auditability, provenance or precision profile a model card can stand behind; no benchmark supports an MLP trained from scratch at this n                           | —          |
| **Deprioritize** | ClinicalTrials.gov phase-transition prediction as a target                                                                                                                                                                                                                                                            | n ≈ 100–150 non-oncology women's-health programs; ambiguous phase labels; transition definition swings PoS 28.9% ↔ 48.6%; already done at scale by BIO/Wong on better data | —          |

**Application-framing note.** The strongest version of the story is not "I
quarantined the model." It is: "I quarantined the model, quantified exactly why
(Riley n ≈ 611 vs 150 available; 12-event validation ⇒ AUC CI ±0.18; intercept
indeterminate by ±2.5 logits without a frame), replaced the claim with a
descriptive hazard with honest intervals, and identified a zero-cost sampling
frame that would make the prediction claim eventually legitimate." That is an
audit _with a roadmap_, which is what an investor-side role actually buys.

---

## Appendix A — Formulas and inputs used

- **Riley criterion 1 (shrinkage ≥ S = 0.9):** \(n =
  p\,/\,[(S-1)\ln(1-R^2_{CS}/S)]\). **Criterion 2 (optimism ≤ 0.05):** \(S_2 =
  R^2_{CS}/(R^2_{CS}+0.05\,\max R^2_{CS})\), then criterion-1 formula with
  \(S_2\). **Criterion 3 (intercept):** \(n = (1.96/0.05)^2\phi(1-\phi)\). **Max
  R²_CS (binary):** \(1-(\phi^\phi(1-\phi)^{1-\phi})^2\). For time-to-event,
  per-subject null log-likelihood \(\text{rate}\times\bar
  f\,(\ln\text{rate}-1)\) and \(\max R^2_{CS}=1-e^{2\,\ell_0}\), following the
  pmsampsize implementation
  ([CRAN](https://stat.ethz.ch/CRAN/web/packages/pmsampsize/pmsampsize.pdf);
  [Riley et al. 2019](https://pubmed.ncbi.nlm.nih.gov/30357870/)). Inputs: φ =
  58/150 = 0.387; rate = 58/1,200 = 0.0483/yr; mean follow-up 8; R²_CS = 15%
  (and 30%) of max.
- **Prior correction:** \(\tilde\beta_0=\hat\beta_0-\ln[((1-\tau)/\tau)(\bar
  y/(1-\bar y))]\), \(\bar y = 0.387\)
  ([King & Zeng](https://gking.harvard.edu/files/0s.pdf)).
- **Hanley–McNeil SE(AUC):**
  \(\sqrt{[A(1-A)+(n_1-1)(Q_1-A^2)+(n_2-1)(Q_2-A^2)]/(n_1 n_2)}\),
  \(Q_1=A/(2-A)\), \(Q_2=2A^2/(1+A)\)
  ([Hanley & McNeil 1982](https://jhanley.biostat.mcgill.ca/software/Hanley_McNeil_Radiology_82.pdf));
  A = 0.70, (n₁, n₂) = (12, 40) → SE 0.093; (58, 92) → SE 0.045.
- **Wilson interval** for 58/1,200 at 95%: [0.0376, 0.0620].
- **EPV:** 58/8 = 7.25; 58/5 = 11.6; 58/(8+7) = 3.87.
- **ClinicalTrials.gov counts:**
  [API v2 `/studies`](https://clinicaltrials.gov/api/v2/studies) with
  `countTotal=true`; filters as listed in §8a; run 2026-09-20.

## Appendix B — Sources consulted (all cited inline above)

Peduzzi et al. 1996 ([PubMed](https://pubmed.ncbi.nlm.nih.gov/8970487/));
Vittinghoff & McCulloch 2007
([PubMed](https://pubmed.ncbi.nlm.nih.gov/17182981/),
[PDF](https://scispace.com/pdf/relaxing-the-rule-of-ten-events-per-variable-in-logistic-and-1yg9p2lwg8.pdf));
van Smeden et al. 2016
([BMC MRM](https://link.springer.com/article/10.1186/s12874-016-0267-3)); van
Smeden et al. 2019 ([PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC6710621/));
Riley et al. 2019 ([PubMed](https://pubmed.ncbi.nlm.nih.gov/30357870/));
pmsampsize
([CRAN](https://stat.ethz.ch/CRAN/web/packages/pmsampsize/pmsampsize.pdf));
Riley et al. 2021 penalization
([PubMed](https://pubmed.ncbi.nlm.nih.gov/33307188/)); Riley et al. 2021
validation ([PubMed](https://pubmed.ncbi.nlm.nih.gov/34031906/)); Collins et al.
2016 ([PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC4738418/)); King & Zeng
2001 ([PDF](https://gking.harvard.edu/files/0s.pdf)); Prentice–Pyke summary
([PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC2835459/)); Puhr et al. 2017
([PubMed](https://pubmed.ncbi.nlm.nih.gov/28295456/),
[arXiv](https://arxiv.org/pdf/2101.07620)); Grinsztajn et al. 2022
([arXiv](https://arxiv.org/abs/2207.08815)); Trompt App. A.1 dataset criteria
([ICML 2023](https://proceedings.mlr.press/v202/chen23c/chen23c.pdf));
Shwartz-Ziv & Armon ([arXiv](https://arxiv.org/abs/2106.03253)); TabPFN
([Nature 2025](https://www.nature.com/articles/s41586-024-08328-6)); Cameron &
Miller 2015
([PDF](https://cameron.econ.ucdavis.edu/research/Cameron_Miller_JHR_2015.pdf));
Abadie et al. 2023
([QJE](https://academic.oup.com/qje/article-abstract/138/1/1/6750017)); TF.js
platform guide
([GitHub](https://github.com/tensorflow/tfjs-website/blob/master/docs/guide/platform_environment.md));
Mitchell et al. Model Cards ([arXiv](https://arxiv.org/abs/1810.03993)); delayed
entry ([PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC5502209/)); discrete-time
survival ([PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC9316420/));
discrete-time competing risks
([Biometrics 2025](https://academic.oup.com/biometrics/article/81/2/ujaf040/8120014));
BIO/Informa/QLS 2011–2020
([PDF](https://go.bio.org/rs/490-EHZ-999/images/ClinicalDevelopmentSuccessRates2011_2020.pdf));
Wong, Siah & Lo 2019 ([PDF](https://r.jordan.im/download/research/wong2019.pdf),
[PubMed](https://pubmed.ncbi.nlm.nih.gov/29394327/)); FDAAA 801
([ClinicalTrials.gov](https://clinicaltrials.gov/policy/fdaaa-801-final-rule));
problems using ClinicalTrials.gov
([PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC5968400/)); Hanley & McNeil 1982
([PDF](https://jhanley.biostat.mcgill.ca/software/Hanley_McNeil_Radiology_82.pdf)).
