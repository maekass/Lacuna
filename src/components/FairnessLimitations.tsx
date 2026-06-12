/**
 * Fairness Audit Limitations Component
 *
 * EXPLICITLY states what we cannot test
 * Including:
 * - Power analysis showing detection thresholds
 * - Selection bias visualization
 * - Mathematical incompatibility of fairness metrics
 * - Causal vs descriptive distinction
 */

"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { cohenH, powerAnalysis } from "@/lib/fairness/statisticalMethods";

interface FairnessLimitationsProps {
  sampleSize: number;
  observedEffect?: number; // For power analysis
  baselineRate?: number;
}

const FAIRNESS_METRIC_INCOMPATIBILITY = [
  {
    metric: "Demographic Parity",
    definition: "P(Ŷ=1|A=a) = P(Ŷ=1|A=b)",
    interpretation: "Equal positive prediction rates across groups",
    requires: "Same selection rate",
    conflicts: "Cannot satisfy if base rates differ between groups",
  },
  {
    metric: "Equalized Odds",
    definition: "P(Ŷ=1|Y=y, A=a) = P(Ŷ=1|Y=y, A=b)",
    interpretation: "Equal true positive and false positive rates",
    requires: "Equal accuracy across groups",
    conflicts:
      "Mathematically incompatible with Demographic Parity (Kleinberg 2016)",
  },
  {
    metric: "Calibration",
    definition: "P(Y=1|Ŷ=s, A=a) = P(Y=1|Ŷ=s, A=b)",
    interpretation: "Predictions mean the same thing across groups",
    requires: "Equal precision across groups",
    conflicts: "Cannot satisfy with Equalized Odds when base rates differ",
  },
];

export default function FairnessLimitations({
  sampleSize,
  observedEffect = 0.07,
  baselineRate = 0.30,
}: FairnessLimitationsProps) {
  const [activeSection, setActiveSection] = useState<
    "power" | "metrics" | "selection" | "causal" | null
  >(null);

  // Power analysis for different effect sizes
  const powerByEffect = [0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5].map(
    (effectSize) => {
      const power = powerAnalysis(
        baselineRate,
        baselineRate + effectSize,
        sampleSize / 2,
        sampleSize / 2,
      );
      return { effectSize, ...power };
    },
  );

  const observedPower = powerAnalysis(
    baselineRate,
    baselineRate + observedEffect,
    sampleSize / 2,
    sampleSize / 2,
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
        <h3
          className="text-xl font-light tracking-tight text-red-800"
          style={{
            fontFamily: "'Bodoni MT', Didot, serif",
            textTransform: "uppercase",
          }}
        >
          What This Audit CANNOT Tell You
        </h3>
        <p
          className="text-xs tracking-widest text-red-600 mt-1"
          style={{
            fontFamily: "'Arial Narrow', sans-serif",
            textTransform: "uppercase",
          }}
        >
          Explicit Acknowledgment of Methodological Limitations
        </p>
      </div>

      {/* Key Limitations Cards */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() =>
            setActiveSection(activeSection === "power" ? null : "power")}
          className={`p-4 rounded-lg border-2 text-left transition-all ${
            activeSection === "power"
              ? "border-red-500 bg-red-50"
              : "border-red-200 bg-white hover:border-red-300"
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-red-500">✗</span>
            <span
              className="font-medium text-red-800"
              style={{ fontFamily: "'Arial Narrow', sans-serif" }}
            >
              Heterogeneous Treatment Effects
            </span>
          </div>
          <p className="text-xs text-red-600">
            With n={sampleSize}, we have only{" "}
            {(observedPower.power * 100).toFixed(0)}% power to detect this
            effect size
          </p>
        </button>

        <button
          onClick={() =>
            setActiveSection(activeSection === "metrics" ? null : "metrics")}
          className={`p-4 rounded-lg border-2 text-left transition-all ${
            activeSection === "metrics"
              ? "border-red-500 bg-red-50"
              : "border-red-200 bg-white hover:border-red-300"
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-red-500">✗</span>
            <span
              className="font-medium text-red-800"
              style={{ fontFamily: "'Arial Narrow', sans-serif" }}
            >
              All Three Fairness Metrics
            </span>
          </div>
          <p className="text-xs text-red-600">
            Mathematically impossible per Kleinberg et al. (2016) when base
            rates differ
          </p>
        </button>

        <button
          onClick={() =>
            setActiveSection(
              activeSection === "selection" ? null : "selection",
            )}
          className={`p-4 rounded-lg border-2 text-left transition-all ${
            activeSection === "selection"
              ? "border-red-500 bg-red-50"
              : "border-red-200 bg-white hover:border-red-300"
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-red-500">✗</span>
            <span
              className="font-medium text-red-800"
              style={{ fontFamily: "'Arial Narrow', sans-serif" }}
            >
              Selection Bias Correction
            </span>
          </div>
          <p className="text-xs text-red-600">
            Only acquired companies in dataset; failures unobserved
          </p>
        </button>

        <button
          onClick={() =>
            setActiveSection(activeSection === "causal" ? null : "causal")}
          className={`p-4 rounded-lg border-2 text-left transition-all ${
            activeSection === "causal"
              ? "border-red-500 bg-red-50"
              : "border-red-200 bg-white hover:border-red-300"
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-red-500">✗</span>
            <span
              className="font-medium text-red-800"
              style={{ fontFamily: "'Arial Narrow', sans-serif" }}
            >
              Causal Discrimination Claims
            </span>
          </div>
          <p className="text-xs text-red-600">
            Observational data; cannot establish causality
          </p>
        </button>
      </div>

      {/* Power Analysis Section */}
      {activeSection === "power" && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="bg-white border border-lacuna-border rounded-lg p-6"
        >
          <h4
            className="font-medium mb-4"
            style={{ fontFamily: "'Bodoni MT', Didot, serif" }}
          >
            Statistical Power Analysis
          </h4>
          <p className="text-sm text-lacuna-text-secondary mb-4">
            With n={sampleSize}{" "}
            companies, what effect sizes can we reliably detect?
          </p>

          <table className="w-full text-sm">
            <thead>
              <tr
                className="text-xs text-lacuna-text-muted uppercase border-b border-lacuna-border"
                style={{ fontFamily: "'Arial Narrow', sans-serif" }}
              >
                <th className="text-left py-2">Effect Size (Δ)</th>
                <th className="text-left py-2">Cohen&apos;s h</th>
                <th className="text-right py-2">Power</th>
                <th className="text-right py-2">Min n for 80%</th>
                <th className="text-left py-2 pl-4">Interpretation</th>
              </tr>
            </thead>
            <tbody>
              {powerByEffect.map(
                (
                  { effectSize, power, recommendedSampleSize, interpretation },
                ) => {
                  const h = cohenH(baselineRate, baselineRate + effectSize);
                  return (
                    <tr
                      key={effectSize}
                      className="border-b border-lacuna-border-subtle"
                    >
                      <td className="py-2">
                        +{(effectSize * 100).toFixed(0)}pp
                      </td>
                      <td className="py-2 text-lacuna-text-muted">
                        {h.h.toFixed(2)} ({h.magnitude})
                      </td>
                      <td className="py-2 text-right">
                        <span
                          className={power >= 0.8
                            ? "text-green-600"
                            : power >= 0.5
                            ? "text-yellow-600"
                            : "text-red-600"}
                        >
                          {(power * 100).toFixed(0)}%
                        </span>
                      </td>
                      <td className="py-2 text-right text-lacuna-text-muted">
                        {recommendedSampleSize < 10000
                          ? recommendedSampleSize
                          : "∞"}
                      </td>
                      <td className="py-2 pl-4 text-xs text-lacuna-text-secondary">
                        {interpretation}
                      </td>
                    </tr>
                  );
                },
              )}
            </tbody>
          </table>

          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
            <strong>Bottom Line:</strong>{" "}
            With our current sample size, we can only reliably detect very large
            effects (≥{(powerByEffect.find((p) =>
              p.power >= 0.8
            )?.effectSize || 0.4) * 100}pp). A null finding does NOT mean
            &quot;no bias exists&quot; - it means &quot;we couldn&apos;t detect
            bias smaller than this threshold.&quot;
          </div>
        </motion.div>
      )}

      {/* Metrics Incompatibility */}
      {activeSection === "metrics" && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="bg-white border border-lacuna-border rounded-lg p-6"
        >
          <h4
            className="font-medium mb-4"
            style={{ fontFamily: "'Bodoni MT', Didot, serif" }}
          >
            Mathematical Incompatibility of Fairness Metrics
          </h4>
          <p className="text-sm text-lacuna-text-secondary mb-4">
            Kleinberg, Mullainathan, and Raghavan (2016) proved that three
            popular fairness definitions cannot simultaneously be satisfied when
            base rates differ between groups.
          </p>

          <div className="space-y-3">
            {FAIRNESS_METRIC_INCOMPATIBILITY.map((m) => (
              <div
                key={m.metric}
                className="border border-lacuna-border rounded-lg p-3"
              >
                <div className="font-medium text-sm mb-1">{m.metric}</div>
                <div className="text-xs font-mono bg-lacuna-surface-muted p-2 rounded mb-2">
                  {m.definition}
                </div>
                <div className="text-xs text-lacuna-text-secondary mb-1">
                  <strong>Means:</strong> {m.interpretation}
                </div>
                <div className="text-xs text-amber-700">
                  <strong>Conflicts:</strong> {m.conflicts}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
            <strong>Our Choice:</strong> We chose Demographic Parity because:
            <ul className="mt-1 ml-4 space-y-0.5">
              <li>• Simplest to interpret</li>
              <li>• Most defensible with small samples</li>
              <li>• Does not require ground truth labels</li>
              <li>• Widely understood by non-technical stakeholders</li>
            </ul>
            We explicitly acknowledge this choice trades off against other
            fairness properties.
          </div>
        </motion.div>
      )}

      {/* Selection Bias */}
      {activeSection === "selection" && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="bg-white border border-lacuna-border rounded-lg p-6"
        >
          <h4
            className="font-medium mb-4"
            style={{ fontFamily: "'Bodoni MT', Didot, serif" }}
          >
            Selection Bias in Our Dataset
          </h4>

          <div className="bg-lacuna-surface-muted p-4 rounded-lg mb-4">
            <h5 className="text-sm font-medium mb-2">The Hidden Population</h5>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">
                  ✓
                </div>
                <span>Observed: Acquired companies (n={sampleSize})</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs">
                  ✗
                </div>
                <span className="text-red-600">
                  Unobserved: Failed companies (n=?)
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs">
                  ✗
                </div>
                <span className="text-red-600">
                  Unobserved: Companies that never got funded
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs">
                  ✗
                </div>
                <span className="text-red-600">
                  Unobserved: Pipeline (pre-Series A)
                </span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
            <strong>Why this matters:</strong>{" "}
            If women-founded companies disproportionately fail (and therefore
            don&apos;t appear in our dataset), we are systematically
            undersampling &quot;discrimination victims.&quot; Apparent equality
            in our data could mask substantial discrimination in the broader
            population.
          </div>

          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
            <strong>Honest disclosure:</strong>{" "}
            To properly test for discrimination, we would need:
            <ul className="mt-1 ml-4 space-y-0.5">
              <li>• Data on failed companies (largely unobservable)</li>
              <li>• Data on rejected funding rounds (private)</li>
              <li>• Inverse probability weighting for selection</li>
              <li>• Heckman-style selection models</li>
            </ul>
          </div>
        </motion.div>
      )}

      {/* Causal Distinction */}
      {activeSection === "causal" && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="bg-white border border-lacuna-border rounded-lg p-6"
        >
          <h4
            className="font-medium mb-4"
            style={{ fontFamily: "'Bodoni MT', Didot, serif" }}
          >
            Descriptive vs Causal: Critical Distinction
          </h4>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h5 className="text-sm font-medium text-green-800 mb-2">
                ✓ We CAN claim (Descriptive)
              </h5>
              <ul className="text-xs text-green-700 space-y-1">
                <li>
                  • &quot;In our dataset, women-founded companies comprise
                  X%&quot;
                </li>
                <li>
                  • &quot;Acquisition rates differ by founder gender&quot;
                </li>
                <li>
                  • &quot;Sector distributions vary by founder gender&quot;
                </li>
                <li>
                  • &quot;After controlling for stage/sector, the gender
                  coefficient is Z&quot;
                </li>
              </ul>
            </div>

            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <h5 className="text-sm font-medium text-red-800 mb-2">
                ✗ We CANNOT claim (Causal)
              </h5>
              <ul className="text-xs text-red-700 space-y-1">
                <li>• &quot;Women founders are discriminated against&quot;</li>
                <li>• &quot;Gender causes lower acquisition rates&quot;</li>
                <li>• &quot;Bias is responsible for the disparity&quot;</li>
                <li>• &quot;This proves systemic gender inequity&quot;</li>
              </ul>
            </div>
          </div>

          <div className="p-3 bg-lacuna-surface-subtle rounded text-sm text-lacuna-text-primary">
            <strong>Why the distinction matters:</strong>{" "}
            Causal claims require either:
            <ul className="mt-1 ml-4 space-y-0.5">
              <li>• Randomized assignment (impossible here)</li>
              <li>• Natural experiments (none available)</li>
              <li>• Strong identifying assumptions (sensitivity-tested)</li>
              <li>• Complete control of confounders (impossible)</li>
            </ul>
            Our observational data fails all four criteria.
          </div>
        </motion.div>
      )}

      {/* Honest Summary */}
      <div className="bg-gradient-to-br from-red-100 to-amber-100 p-6 rounded-lg border border-red-300">
        <h4
          className="font-medium text-red-900 mb-3"
          style={{
            fontFamily: "'Arial Narrow', sans-serif",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }}
        >
          Honest Methodological Confession
        </h4>
        <p className="text-sm text-red-800 leading-relaxed">
          This fairness audit is fundamentally limited. With n={sampleSize}{" "}
          acquired companies, gender inference at{" "}
          {Math.round(94)}% accuracy, and no observation of failures or pipeline
          data, we cannot make definitive claims about fairness, discrimination,
          or bias.
          <br />
          <br />
          <strong>What we CAN do:</strong>{" "}
          Provide transparent descriptive analysis, quantify our measurement
          uncertainty, conduct power analyses, and explicitly acknowledge what
          we don&apos;t know. This is the academically responsible approach for
          small-sample observational data.
          <br />
          <br />
          <strong>What you should NOT do:</strong>{" "}
          Use this analysis to make policy decisions, publish findings as
          evidence of discrimination, or extrapolate to broader populations
          without much larger and properly designed studies.
        </p>
      </div>
    </motion.div>
  );
}
