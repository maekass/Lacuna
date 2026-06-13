/**
 * Sensitivity Analysis Dashboard Component
 *
 * Displays Oster's Delta and Rotnitzky Bounds with visualizations
 * Emphasizes TRANSPARENCY about causal assumptions
 */

"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import CuratedDatasetBanner from "@/components/CuratedDatasetBanner";
import {
  generateSensitivityReport,
  scenarioBounds,
  type SensitivityConfig,
} from "@/lib/causal/sensitivityAnalysis";

interface AnalysisInputs {
  ateWithConfounders: number;
  ateNaive: number;
  rSquaredFull: number;
  rSquaredPartial: number;
  standardError: number;
  outcomeVariance: number;
}

export default function SensitivityAnalysis() {
  const [inputs, setInputs] = useState<AnalysisInputs>({
    ateWithConfounders: -0.15,
    ateNaive: -0.25,
    rSquaredFull: 0.65,
    rSquaredPartial: 0.45,
    standardError: 0.03,
    outcomeVariance: 1.0,
  });

  const [showTransparency, setShowTransparency] = useState(false);

  const config: SensitivityConfig = {
    treatmentVariable: "intervention",
    outcomeVariable: "outcome",
    measuredConfounders: ["observed_1", "observed_2", "observed_3"],
    treatmentEffectWithConfounders: inputs.ateWithConfounders,
    treatmentEffectNaive: inputs.ateNaive,
    rSquaredFull: inputs.rSquaredFull,
    rSquaredPartial: inputs.rSquaredPartial,
    outcomeVariance: inputs.outcomeVariance,
    sampleSize: 1000,
  };

  const report = generateSensitivityReport(config, inputs.standardError);
  const scenarios = scenarioBounds(
    inputs.ateWithConfounders,
    inputs.standardError,
    inputs.rSquaredFull,
  );

  const getRobustnessColor = (delta: number): string => {
    if (delta > 2) return "bg-green-500";
    if (delta > 1) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getRobustnessText = (delta: number): string => {
    if (delta > 2) return "ROBUST";
    if (delta > 1) return "MODERATE";
    return "FRAGILE";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <CuratedDatasetBanner />
      {/* Header */}
      <div className="border-b border-lacuna-border pb-4">
        <h3
          className="text-2xl font-light tracking-tight"
          style={{
            fontFamily: "'Bodoni MT', Didot, serif",
            textTransform: "uppercase",
          }}
        >
          Causal Sensitivity Analysis
        </h3>
        <p
          className="text-sm tracking-widest text-lacuna-text-muted mt-1"
          style={{
            fontFamily: "'Arial Narrow', sans-serif",
            textTransform: "uppercase",
          }}
        >
          Oster&apos;s δ & Rotnitzky Bounds | Unobserved Confounding Assessment
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
            {
              label: "ATE (with confounders)",
              key: "ateWithConfounders",
              step: 0.01,
            },
            { label: "ATE (naive)", key: "ateNaive", step: 0.01 },
            {
              label: "R² (full model)",
              key: "rSquaredFull",
              step: 0.01,
              min: 0,
              max: 1,
            },
            {
              label: "R² (partial model)",
              key: "rSquaredPartial",
              step: 0.01,
              min: 0,
              max: 1,
            },
            { label: "Standard Error", key: "standardError", step: 0.001 },
            { label: "Outcome Variance", key: "outcomeVariance", step: 0.1 },
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
                max={field.max}
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

      {/* Oster's Delta Display */}
      <div className="bg-white border border-lacuna-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h4
            className="font-medium"
            style={{ fontFamily: "'Bodoni MT', Didot, serif" }}
          >
            Oster&apos;s Delta (δ)
          </h4>
          <span
            className={`px-3 py-1 rounded text-white text-xs font-medium ${
              getRobustnessColor(report.oster.delta)
            }`}
          >
            {getRobustnessText(report.oster.delta)}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Delta Value */}
          <div className="text-center">
            <div
              className="text-4xl font-light mb-2"
              style={{
                fontFamily: "'Bodoni MT', Didot, serif",
                color: "#5D4E6D",
              }}
            >
              {report.oster.delta.toFixed(2)}
            </div>
            <div
              className="text-xs text-lacuna-text-muted uppercase tracking-wider"
              style={{ fontFamily: "'Arial Narrow', sans-serif" }}
            >
              Delta Value
            </div>
          </div>

          {/* Interpretation */}
          <div className="md:col-span-2 space-y-2">
            <p
              className="text-sm font-medium"
              style={{
                fontFamily: "'Arial Narrow', sans-serif",
                textTransform: "uppercase",
              }}
            >
              {report.oster.interpretation}
            </p>
            <p className="text-sm text-lacuna-text-secondary leading-relaxed">
              {report.oster.explanation}
            </p>
            <div className="text-xs text-lacuna-text-muted mt-2 p-2 bg-lacuna-surface-muted rounded">
              <strong>Threshold:</strong> δ &gt;{" "}
              {report.oster.robustnessThreshold} required for robustness
              <br />
              <strong>Critical δ:</strong> {report.oster.criticalDelta}{" "}
              (would flip result)
            </div>
          </div>
        </div>

        {/* Delta Visualization */}
        <div className="mt-6">
          <div className="h-4 bg-lacuna-surface-subtle rounded-full overflow-hidden relative">
            {/* Threshold marker */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-black z-10"
              style={{ left: "33.33%" }}
              title="Robustness threshold (δ = 1)"
            />
            {/* Delta bar */}
            <motion.div
              initial={{ width: 0 }}
              animate={{
                width: `${Math.min(report.oster.delta * 33.33, 100)}%`,
              }}
              className={`h-full ${getRobustnessColor(report.oster.delta)}`}
            />
          </div>
          <div
            className="flex justify-between text-xs text-lacuna-text-muted mt-1"
            style={{ fontFamily: "'Arial Narrow', sans-serif" }}
          >
            <span>0</span>
            <span>δ = 1 (threshold)</span>
            <span>δ = 2 (strong)</span>
            <span>δ = 3 (very strong)</span>
          </div>
        </div>
      </div>

      {/* Rotnitzky Bounds */}
      <div className="bg-white border border-lacuna-border rounded-lg p-6">
        <h4
          className="font-medium mb-4"
          style={{ fontFamily: "'Bodoni MT', Didot, serif" }}
        >
          Rotnitzky Bounds
        </h4>

        <div className="space-y-4">
          {/* Bounds Visualization */}
          <div className="relative h-24 bg-lacuna-surface-muted rounded-lg p-4">
            {/* Center line (zero) */}
            <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-lacuna-border-strong" />

            {/* Point estimate */}
            <motion.div
              initial={{ left: "50%" }}
              animate={{
                left: `${
                  50 +
                  (report.rotnitzky.pointEstimate /
                    Math.max(
                      Math.abs(report.rotnitzky.lowerBound),
                      Math.abs(report.rotnitzky.upperBound),
                    ) * 40)
                }%`,
              }}
              className="absolute top-4 w-3 h-3 bg-[#5D4E6D] rounded-full transform -translate-x-1/2"
              title={`Point estimate: ${
                report.rotnitzky.pointEstimate.toFixed(3)
              }`}
            />

            {/* Bounds region */}
            <div
              className="absolute top-8 h-4 bg-[#E8B4B8] opacity-50 rounded"
              style={{
                left: `${
                  50 +
                  (report.rotnitzky.lowerBound /
                    Math.max(
                      Math.abs(report.rotnitzky.lowerBound),
                      Math.abs(report.rotnitzky.upperBound),
                    ) * 40)
                }%`,
                right: `${
                  50 -
                  (report.rotnitzky.upperBound /
                    Math.max(
                      Math.abs(report.rotnitzky.lowerBound),
                      Math.abs(report.rotnitzky.upperBound),
                    ) * 40)
                }%`,
              }}
            />

            {/* Labels */}
            <div className="absolute bottom-1 left-2 text-xs text-lacuna-text-muted">
              Lower: {report.rotnitzky.lowerBound.toFixed(3)}
            </div>
            <div className="absolute bottom-1 right-2 text-xs text-lacuna-text-muted">
              Upper: {report.rotnitzky.upperBound.toFixed(3)}
            </div>
            <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 text-xs font-medium">
              {report.rotnitzky.pointEstimate.toFixed(3)}
            </div>
          </div>

          <p className="text-sm text-lacuna-text-secondary">
            {report.rotnitzky.interpretation}
          </p>
        </div>

        {/* Scenario Table */}
        <div className="mt-4">
          <h5
            className="text-xs font-medium uppercase mb-2"
            style={{ fontFamily: "'Arial Narrow', sans-serif" }}
          >
            Bounds Under Different Confounding Scenarios
          </h5>
          <table className="w-full text-sm">
            <thead>
              <tr
                className="text-xs text-lacuna-text-muted uppercase"
                style={{ fontFamily: "'Arial Narrow', sans-serif" }}
              >
                <th className="text-left py-2">Scenario</th>
                <th className="text-right py-2">Lower Bound</th>
                <th className="text-right py-2">Upper Bound</th>
                <th className="text-right py-2">Width</th>
              </tr>
            </thead>
            <tbody>
              {scenarios.map((s) => (
                <tr
                  key={s.scenario}
                  className="border-t border-lacuna-border-subtle"
                >
                  <td className="py-2">{s.scenario}</td>
                  <td className="text-right font-mono">
                    {s.bounds.lowerBound.toFixed(3)}
                  </td>
                  <td className="text-right font-mono">
                    {s.bounds.upperBound.toFixed(3)}
                  </td>
                  <td className="text-right font-mono">
                    {(s.bounds.upperBound - s.bounds.lowerBound).toFixed(3)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
            Transparency: What Assumptions Would Need to Be True?
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
              {report.transparencyStatement}
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
          {report.recommendations.map((rec, index) => (
            <li key={index} className="flex items-start gap-2">
              <span className="font-bold">{index + 1}.</span>
              <span>{rec}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Summary Box */}
      <div className="bg-white border border-lacuna-border rounded-lg p-4">
        <pre className="text-xs font-mono text-lacuna-text-secondary whitespace-pre-wrap">
          {report.summary}
        </pre>
      </div>
    </motion.div>
  );
}
