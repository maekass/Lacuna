# Native analyst rNPV sandbox

Route: `/research/rnpv`, linked from the research workspace. The calculator is
React and TypeScript in this Next.js app. It runs in the browser. It does not
add a Python service, a new dependency, a database, or another host.

It does not import `src/lib/research/rnpvBenchmarks.ts`. That reference layer
stays isolated. Scenario defaults are blank. The only filled example is an
illustrative preset of round hypothetical inputs, and the page will not load it
until the reader acknowledges that the inputs are assumptions. Those inputs are
not observed company data and are not copied from the benchmark layer.

Outputs stay in the sandbox. They do not feed deal scores, rankings, comps, or
verified records.

## What is valued

The asset is valued at **entry** into the selected stage, not halfway through
that stage. Stages before the selection are omitted. Historical spend is sunk
unless the analyst types it into the certain upfront cost, which is paid at the
valuation date whether or not development succeeds.

Preclinical work is optional. The page does not supply a preclinical
probability, duration, or cost. Choosing Preclinical requires the analyst to
enter all three and a written rationale.

Model version: `native-rnpv-0.2.0`. Timing id: `year-end-stage-entry-v1`.
Amounts are USD millions.

## Deterministic rNPV

Cash flows use year-end discounting. The discount factor is `1 / (1 + r) ^ t`.

- Certain upfront cost is undiscounted at t = 0.
- A stage of N years pays `cost / N` at the end of each of those years. In the
  expected-value view that payment is multiplied by the probability of
  **entering** the stage, which is the product of the conditional success
  probabilities of the earlier remaining stages.
- Conditional success is applied at the stage end. Failure cancels every later
  cost. There is no intra-stage stopping rule.
- Launch investment is paid at the development-completion year-end and
  multiplied by the probability of completing every remaining stage.
- The first commercial cash flow is one year after that completion year, and the
  whole commercial forecast is multiplied by the same completion probability.

Sales rise linearly and hit the peak in the final ramp year. Additional peak
years stay at that peak. Later years decline geometrically. Commercial cash flow
is sales × operating cash margin × (1 − tax). The horizon is finite. There is no
terminal value, royalty, milestone, tax shield on development cost, tax-loss
carryforward, dilution, or financing bridge.

## Monte Carlo

Each iteration draws one development path. A uniform random number fails the
stage when it is greater than or equal to that stage's conditional probability.
Exact 0% and 100% probabilities stay fixed. After a failure the path pays no
later stage cost, no launch investment, and no commercial cash flow. The path
NPV is not multiplied by a success probability again.

Optional uncertainty ranges are independent and uniform:

- Discount rate, peak sales, launch investment, and stage costs move by a
  multiplicative fraction around the entered value. A zero base stays zero. The
  sampled discount rate is capped at 100%.
- Conditional probabilities that are not exactly 0% or 100% move by an absolute
  percentage-point range and are clipped to 0–100%.

Durations, margin, tax, upfront cost, and the sales shape stay fixed. These
ranges are analyst choices. They are not estimated confidence intervals,
posterior distributions, or claims of clinical performance.

The generator is a non-cryptographic seeded PRNG. Iterations are limited to
100–10,000. The same seed and inputs reproduce the same paths. With both ranges
at zero, the mean converges to the deterministic rNPV. The reported standard
error and approximate 95% interval describe sampling noise in that mean, not
uncertainty about a true asset value.

The run yields between chunks so the page can keep scrolling. Changing a model
assumption aborts the run and drops the previous distribution. An export
includes the simulation only when that run still matches the inputs on screen.
The export records the model version, timing id, seed, settings, rationale, and,
when the run is current, the path samples.

## What this is not

A hypothetical rNPV is not an equity value, a company ranking, a clinical
prediction, or an investment recommendation. Do not describe the sandbox as a
deployed valuation product.
