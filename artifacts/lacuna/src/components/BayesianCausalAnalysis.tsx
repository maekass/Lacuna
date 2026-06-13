/**
 * Bayesian Causal Analysis Dashboard
 *
 * For small samples (n=22 companies, n=10 acquisitions)
 * Addresses Problem 2: Acknowledging underpowered HTE estimation
 */

"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import CuratedDatasetBanner from "@/components/CuratedDatasetBanner";
import {
  PRE_REGISTERED_HYPOTHESES,
  smallSampleCausalAnalysis,
} from "@/lib/causal/bayesianCausal";

interface AnalysisInputs {
  mleEstimate: number;
  standardError: number;
  sampleSize: number;
  priorMean: number;
  priorVariance: number;
}

export default function BayesianCausalAnalysis() {
  const [inputs, setInputs] = useState<AnalysisInputs>({
    mleEstimate: 0.25, // 25% premium
    standardError: 0.12, // High uncertainty
    sampleSize: 22, // Our actual sample
    priorMean: 0, // Neutral prior
    priorVariance: 0.5, // Moderately informative
  });

  const [showPreRegistration, setShowPreRegistration] = useState(false);
  const [showTransparency, setShowTransparency] = useState(false);

  const analysis = useMemo(() => {
    return smallSampleCausalAnalysis(
      inputs.mleEstimate,
      inputs.standardError,
      inputs.sampleSize,
    );
  }, [inputs]);

  const getProbabilityColor = (
    prob: number,
    direction: "positive" | "negative",
  ): string => {
    const p = direction === "positive" ? prob : 1 - prob;
    if (p > 0.9) return "text-green-600";
    if (p > 0.7) return "text-yellow-600";
    if (p > 0.5) return "text-orange-600";
    return "text-lacuna-text-muted";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <CuratedDatasetBanner />
      {/* Warning Banner */}
      <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
        <div className="flex items-start gap-3">
          <span className="text-amber-600 text-xl">⚠️</span>
          <div>
            <h4
              className="font-medium text-amber-800"
              style={{
                fontFamily: "'Arial Narrow', sans-serif",
                textTransform: "uppercase",
              }}
            >
              Small Sample Limitation Acknowledged
            </h4>
            <p className="text-sm text-amber-700 mt-1">
              Current sample (n={inputs.sampleSize}) is underpowered for
              heterogeneous treatment effects. Causal forest requires n≥200.
              Using Bayesian main effects only with strong priors.
            </p>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="border-b border-lacuna-border pb-4">
        <h3
          className="text-2xl font-light tracking-tight"
          style={{
            fontFamily: "'Bodoni MT', Didot, serif",
            textTransform: "uppercase",
          }}
        >
          Bayesian Causal Inference
        </h3>
        <p
          className="text-sm tracking-widest text-lacuna-text-muted mt-1"
          style={{
            fontFamily: "'Arial Narrow', sans-serif",
            textTransform: "uppercase",
          }}
        >
          Small Sample Analysis | Main Effects Only | Pre-Registered Hypotheses
        </p>
      </div>

      {/* Input Controls */}
      <div className="bg-lacuna-surface-muted p-4 rounded-lg space-y-4">
        <h4
          className="text-sm font-medium tracking-wider uppercase"
          style={{ fontFamily: "'Arial Narrow', sans-serif" }}
        >
          Model Parameters
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: "MLE Estimate", key: "mleEstimate", step: 0.01 },
            { label: "Standard Error", key: "standardError", step: 0.001 },
            { label: "Sample Size", key: "sampleSize", step: 1, min: 5 },
            { label: "Prior Mean", key: "priorMean", step: 0.01 },
            {
              label: "Prior Variance",
              key: "priorVariance",
              step: 0.1,
              min: 0.01,
            },
          ].map((field) => (
            <div key={field.key} className="space-y-1">
              <label
                className="text-xs text-lacuna-text-muted uppercase"
                style={{ fontFamily: "'Arial Narrow', sans-serif" }}
              >
                {field.label}
              </label>
              <input
                type="number"
                step={field.step}
                min={field.min}
                value={inputs[field.key as keyof AnalysisInputs]}
                onChange={(e) =>
                  setInputs({
                    ...inputs,
                    [field.key]: parseFloat(e.target.value) || 0,
                  })}
                className="w-full px-3 py-2 border border-lacuna-border rounded text-sm"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Main Effects Result */}
      <div className="bg-white border border-lacuna-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h4
            className="font-medium"
            style={{ fontFamily: "'Bodoni MT', Didot, serif" }}
          >
            Bayesian Main Effect Estimate
          </h4>
          <span className="px-3 py-1 rounded text-white text-xs font-medium bg-[#5D4E6D]">
            PRIOR INFLUENCE:{" "}
            {(analysis.mainEffects.priorInfluence * 100).toFixed(1)}%
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {/* Posterior Mean */}
          <div className="text-center p-4 bg-lacuna-surface-muted rounded-lg">
            <div
              className="text-3xl font-light mb-1"
              style={{
                fontFamily: "'Bodoni MT', Didot, serif",
                color: "#5D4E6D",
              }}
            >
              {analysis.mainEffects.posteriorMean.toFixed(3)}
            </div>
            <div
              className="text-xs text-lacuna-text-muted uppercase tracking-wider"
              style={{ fontFamily: "'Arial Narrow', sans-serif" }}
            >
              Posterior Mean
            </div>
          </div>

          {/* Credible Interval */}
          <div className="text-center p-4 bg-lacuna-surface-muted rounded-lg">
            <div
              className="text-lg font-light mb-1"
              style={{
                fontFamily: "'Bodoni MT', Didot, serif",
                color: "#4A5D8A",
              }}
            >
              [{analysis.mainEffects.credibleInterval[0].toFixed(3)},{" "}
              {analysis.mainEffects.credibleInterval[1].toFixed(3)}]
            </div>
            <div
              className="text-xs text-lacuna-text-muted uppercase tracking-wider"
              style={{ fontFamily: "'Arial Narrow', sans-serif" }}
            >
              95% Credible Interval
            </div>
          </div>

          {/* Probabilities */}
          <div className="text-center p-4 bg-lacuna-surface-muted rounded-lg">
            <div
              className={`text-2xl font-light mb-1 ${
                getProbabilityColor(
                  analysis.mainEffects.probabilityPositive,
                  "positive",
                )
              }`}
              style={{ fontFamily: "'Bodoni MT', Didot, serif" }}
            >
              {(analysis.mainEffects.probabilityPositive * 100).toFixed(1)}%
            </div>
            <div
              className="text-xs text-lacuna-text-muted uppercase tracking-wider"
              style={{ fontFamily: "'Arial Narrow', sans-serif" }}
            >
              P(Effect &gt; 0)
            </div>
          </div>

          {/* Bayes Factor */}
          <div className="text-center p-4 bg-lacuna-surface-muted rounded-lg">
            <div
              className="text-2xl font-light mb-1"
              style={{
                fontFamily: "'Bodoni MT', Didot, serif",
                color: analysis.mainEffects.bayesFactor > 3
                  ? "#2d6a4f"
                  : analysis.mainEffects.bayesFactor > 1
                  ? "#e9c46a"
                  : "#e76f51",
              }}
            >
              {analysis.mainEffects.bayesFactor.toFixed(1)}
            </div>
            <div
              className="text-xs text-lacuna-text-muted uppercase tracking-wider"
              style={{ fontFamily: "'Arial Narrow', sans-serif" }}
            >
              Bayes Factor
            </div>
          </div>
        </div>

        {/* Interpretation */}
        <div className="mt-4 p-4 bg-lacuna-surface-muted rounded-lg">
          <p className="text-sm text-lacuna-text-primary">
            <strong>Interpretation:</strong>{" "}
            {analysis.mainEffects.probabilityPositive > 0.8
              ? `Evidence supports positive effect (P=${
                (analysis.mainEffects.probabilityPositive * 100).toFixed(1)
              }%). `
              : analysis.mainEffects.probabilityNegative > 0.8
              ? `Evidence supports negative effect (P=${
                (analysis.mainEffects.probabilityNegative * 100).toFixed(1)
              }%). `
              : `Inconclusive evidence (P(positive)=${
                (analysis.mainEffects.probabilityPositive * 100).toFixed(1)
              }%, P(negative)=${
                (analysis.mainEffects.probabilityNegative * 100).toFixed(1)
              }%). `}
            Bayes factor of {analysis.mainEffects.bayesFactor.toFixed(1)}{" "}
            indicates {analysis.mainEffects.bayesFactor > 10
              ? "strong"
              : analysis.mainEffects.bayesFactor > 3
              ? "moderate"
              : "weak"} evidence for effect vs. no effect.
          </p>
          <p className="text-xs text-lacuna-text-muted mt-2">
            Prior influence:{" "}
            {(analysis.mainEffects.priorInfluence * 100).toFixed(1)}% —
            {analysis.mainEffects.priorInfluence > 0.5
              ? "Prior dominates (small sample warning)"
              : "Data dominates (reliable inference)"}
          </p>
        </div>
      </div>

      {/* Pre-Registered Hypotheses */}
      <div className="bg-white border border-lacuna-border rounded-lg">
        <button
          onClick={() => setShowPreRegistration(!showPreRegistration)}
          className="w-full px-6 py-4 flex items-center justify-between text-left"
        >
          <div>
            <span
              className="font-medium"
              style={{
                fontFamily: "'Arial Narrow', sans-serif",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              Pre-Registered Hypotheses
            </span>
            <span className="text-xs text-lacuna-text-muted ml-2">
              ({PRE_REGISTERED_HYPOTHESES.length}{" "}
              hypotheses specified before data analysis)
            </span>
          </div>
          <span className="text-2xl">{showPreRegistration ? "−" : "+"}</span>
        </button>

        {showPreRegistration && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            className="px-6 pb-6"
          >
            <div className="bg-green-50 border-l-4 border-green-500 p-3 mb-4 rounded-r">
              <p className="text-sm text-green-800">
                <strong>✓ All hypotheses pre-registered:</strong> Timestamp:
                {" "}
                {PRE_REGISTERED_HYPOTHESES[0].timestamp}
              </p>
            </div>

            <div className="space-y-3">
              {analysis.preRegisteredResults.map((result) => (
                <div
                  key={result.hypothesis.id}
                  className="border border-lacuna-border rounded-lg p-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono bg-lacuna-surface-subtle px-2 py-0.5 rounded">
                          {result.hypothesis.id}
                        </span>
                        <span className="font-medium">
                          {result.hypothesis.name}
                        </span>
                      </div>
                      <p className="text-sm text-lacuna-text-secondary mt-1">
                        {result.hypothesis.description}
                      </p>
                      <p className="text-xs text-lacuna-text-muted mt-1">
                        Expected:{" "}
                        {result.hypothesis.expectedEffect > 0 ? "+" : ""}
                        {result.hypothesis.expectedEffect}
                        ({result.hypothesis.direction})
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        result.status === "tested"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-lacuna-surface-subtle text-lacuna-text-secondary"
                      }`}
                    >
                      {result.status.replace("_", " ")}
                    </span>
                  </div>

                  {result.result && (
                    <div className="mt-3 pt-3 border-t border-lacuna-border-subtle grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div
                          className="text-lg font-light"
                          style={{ fontFamily: "'Bodoni MT', Didot, serif" }}
                        >
                          {result.result.posteriorMean.toFixed(3)}
                        </div>
                        <div className="text-xs text-lacuna-text-muted">
                          Posterior Mean
                        </div>
                      </div>
                      <div>
                        <div
                          className={`text-lg font-light ${
                            getProbabilityColor(
                              result.result.probabilityPositive,
                              result.hypothesis.direction === "positive"
                                ? "positive"
                                : "negative",
                            )
                          }`}
                        >
                          {result.hypothesis.direction === "positive"
                            ? (result.result.probabilityPositive * 100).toFixed(
                              0,
                            )
                            : (result.result.probabilityNegative * 100).toFixed(
                              0,
                            )}%
                        </div>
                        <div className="text-xs text-lacuna-text-muted">
                          P(Hypothesis)
                        </div>
                      </div>
                      <div>
                        <div
                          className="text-lg font-light"
                          style={{
                            fontFamily: "'Bodoni MT', Didot, serif",
                            color: "#5D4E6D",
                          }}
                        >
                          {result.result.bayesFactor.toFixed(1)}
                        </div>
                        <div className="text-xs text-lacuna-text-muted">
                          Bayes Factor
                        </div>
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-lacuna-text-muted mt-2">
                    {result.note}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Limitations */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h4
          className="font-medium text-red-800 mb-2"
          style={{
            fontFamily: "'Arial Narrow', sans-serif",
            textTransform: "uppercase",
          }}
        >
          Limitations & Warnings
        </h4>
        <ul className="space-y-1 text-sm text-red-700">
          {analysis.limitations.map((limitation, index) => (
            <li key={index} className="flex items-start gap-2">
              <span className="font-bold">{index + 1}.</span>
              <span>{limitation}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Transparency Toggle */}
      <div className="bg-lacuna-surface-muted rounded-lg">
        <button
          onClick={() => setShowTransparency(!showTransparency)}
          className="w-full px-6 py-4 flex items-center justify-between text-left"
        >
          <span
            className="font-medium"
            style={{
              fontFamily: "'Arial Narrow', sans-serif",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            Transparency: What We Cannot Claim
          </span>
          <span className="text-2xl">{showTransparency ? "−" : "+"}</span>
        </button>

        {showTransparency && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            className="px-6 pb-6"
          >
            <pre className="bg-white p-4 rounded border border-lacuna-border text-xs font-mono whitespace-pre-wrap leading-relaxed">
              {analysis.transparencyStatement}
            </pre>
          </motion.div>
        )}
      </div>

      {/* Recommendations */}
      <div className="bg-gradient-to-r from-[#E8B4B8] via-[#B8A9C9] to-[#4A5D8A] p-6 rounded-lg text-white">
        <h4
          className="font-medium mb-3"
          style={{
            fontFamily: "'Arial Narrow', sans-serif",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }}
        >
          Recommendations
        </h4>
        <ul className="space-y-2 text-sm">
          {analysis.recommendations.map((rec, index) => (
            <li key={index} className="flex items-start gap-2">
              <span className="font-bold">{index + 1}.</span>
              <span>{rec}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* HTE Warning */}
      <div className="bg-lacuna-surface-inverse text-white p-4 rounded-lg">
        <h4
          className="font-medium mb-2"
          style={{
            fontFamily: "'Arial Narrow', sans-serif",
            textTransform: "uppercase",
          }}
        >
          Why We&apos;re NOT Using Causal Forests
        </h4>
        <div className="text-sm space-y-1 text-lacuna-text-muted/80">
          <p>Causal forest requirements vs. our data:</p>
          <ul className="ml-4 space-y-1">
            <li>• Required: n≥200 | We have: n={inputs.sampleSize} ❌</li>
            <li>• Required: Power ≥80% for HTEs | We have: Power ≈20% ❌</li>
            <li>
              • Required: Multiple validation splits | We have: Cannot split ❌
            </li>
            <li>
              • Required: Stable CATE estimates | We have: High variance ❌
            </li>
          </ul>
          <p className="mt-2 text-white">
            <strong>Instead:</strong>{" "}
            Bayesian main effects with pre-registration and explicit
            limitations.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
