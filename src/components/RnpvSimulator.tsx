"use client";

import { useState } from "react";
import { calculateRnpv, RNPV_MODEL_VERSION, simulateRnpv } from "@/lib/research/rnpvSimulator";
import type { RnpvScenario } from "@/lib/research/rnpvSimulator";

const initial: RnpvScenario = { discount: 0.12, peakSales: 500, margin: 0.35, tax: 0.21, commercialYears: 12, rampYears: 4, plateauYears: 3, decline: 0.15, upfront: 0, launchCost: 20, stages: [{ name: "Phase I", years: 2, probability: 0.5, cost: 15 }, { name: "Phase II", years: 3, probability: 0.3, cost: 40 }, { name: "Phase III", years: 3, probability: 0.6, cost: 100 }, { name: "Submission", years: 1, probability: 0.9, cost: 10 }] };

interface NumericInputProps { label: string; value: number; onChange: (value: number) => void; }
function NumericInput({ label, value, onChange }: NumericInputProps) {
  return <label className="flex flex-col gap-1 text-sm">{label}<input className="rounded border p-2" type="number" step="any" value={Number.isFinite(value) ? value : ""} onChange={(event) => onChange(event.target.value === "" ? NaN : Number(event.target.value))} /></label>;
}

/** Native, browser-only analyst sandbox; no dataset or reference-layer imports. */
export default function RnpvSimulator() {
  const [scenario, setScenario] = useState<RnpvScenario>(initial);
  const [accepted, setAccepted] = useState(false);
  const [seed, setSeed] = useState(42);
  const [iterations, setIterations] = useState(5000);
  const [spread, setSpread] = useState(0);
  const [probabilitySpread, setProbabilitySpread] = useState(0);
  const [rationale, setRationale] = useState("");
  const [result, setResult] = useState<ReturnType<typeof simulateRnpv> | null>(null);
  const [error, setError] = useState("");
  const update = (next: RnpvScenario) => { setScenario(next); setResult(null); setError(""); };
  let expected: ReturnType<typeof calculateRnpv> | null = null;
  let validationError = "";
  try { expected = calculateRnpv(scenario); } catch (cause) { validationError = cause instanceof Error ? cause.message : "Invalid inputs"; }
  const run = () => {
    try { setResult(simulateRnpv(scenario, { seed, iterations, financialSpread: spread, probabilitySpread })); setError(""); } catch (cause) { setResult(null); setError(cause instanceof Error ? cause.message : "Simulation failed"); }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ modelVersion: RNPV_MODEL_VERSION, scenario, rationale, expected, simulation: result, exportedAt: new Date().toISOString(), limitations: "Independent uniform input ranges; hypothetical analyst assumptions; not calibrated probabilities or investment advice." }, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "lacuna-rnpv-scenario.json"; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <section className="space-y-6">
    <p className="rounded border p-4" role="note">Analyst scenario sandbox. All initial inputs are illustrative, not published benchmarks or company forecasts. Outputs do not feed Lacuna deal scores, rankings, or verified records. No live data or LLM is used.</p>
    <label className="flex gap-2"><input type="checkbox" checked={accepted} onChange={(event) => { setAccepted(event.target.checked); setResult(null); }} />I understand these are hypothetical assumptions, not investment advice or clinical guidance.</label>
    <fieldset disabled={!accepted} className="space-y-6 disabled:opacity-60">
      <legend className="text-lg font-semibold">Financial assumptions — USD millions; rates are fractions (0.12 = 12%)</legend>
      <div className="grid gap-4 sm:grid-cols-3">{(["discount", "peakSales", "margin", "tax", "commercialYears", "rampYears", "plateauYears", "decline", "upfront", "launchCost"] as const).map((key) => <NumericInput key={key} label={key} value={scenario[key]} onChange={(value) => update({ ...scenario, [key]: value })} />)}</div>
      <h2 className="text-lg font-semibold">Remaining stages — conditional success, full stage cost, year-end cash flows</h2>
      {scenario.stages.map((stage, index) => <fieldset key={index} className="grid gap-3 rounded border p-3 sm:grid-cols-3"><legend>{stage.name}</legend>{(["years", "probability", "cost"] as const).map((key) => <NumericInput key={key} label={key} value={stage[key]} onChange={(value) => update({ ...scenario, stages: scenario.stages.map((entry, i) => i === index ? { ...entry, [key]: value } : entry) })} />)}</fieldset>)}
      <p className="text-sm">Starts at the beginning of Phase I. Preclinical risk and costs are excluded. For an earlier-stage asset, do not interpret this as its present value.</p>
      <label className="flex flex-col gap-1">Assumption rationale and source citations<textarea className="rounded border p-2" value={rationale} onChange={(event) => setRationale(event.target.value)} /></label>
      {validationError && <p role="alert">{validationError}</p>}
      {expected && <div aria-live="polite"><h2 className="text-lg font-semibold">Deterministic expected-value calculation</h2><p>Asset rNPV: ${expected.rnpv.toFixed(2)}m · Approval probability: {(expected.approvalProbability * 100).toFixed(2)}% · Development: {expected.developmentYears} years</p><p>PV expected commercial cash flows: ${expected.expectedCommercialPv.toFixed(2)}m · PV expected costs: ${expected.expectedCostPv.toFixed(2)}m</p></div>}
      <h2 className="text-lg font-semibold">Monte Carlo — realized development paths</h2>
      <div className="grid gap-4 sm:grid-cols-2"><NumericInput label="Iterations (100–10,000)" value={iterations} onChange={(value) => { setIterations(value); setResult(null); }} /><NumericInput label="Seed (uint32)" value={seed} onChange={(value) => { setSeed(value); setResult(null); }} /><NumericInput label="Independent financial ranges ±fraction (0–1)" value={spread} onChange={(value) => { setSpread(value); setResult(null); }} /><NumericInput label="Conditional probability ranges ±absolute fraction (0–1)" value={probabilitySpread} onChange={(value) => { setProbabilitySpread(value); setResult(null); }} /></div>
      <p className="text-sm">Zero spreads isolate clinical outcome risk. Positive spreads independently sample uniform ranges for discount rate, peak sales, launch and stage costs; probabilities use clipped uniform ranges and preserve exact 0/1 endpoints. Durations, margin, taxes and upfront cost stay fixed. These distributions are analyst choices, not estimated confidence intervals.</p>
      <button className="rounded border px-4 py-2" type="button" disabled={!!validationError} onClick={run}>Run seeded simulation</button>
      {error && <p role="alert">{error}</p>}
      {result && <div aria-live="polite" className="space-y-2"><h3 className="font-semibold">Simulated realized NPV distribution — USD millions</h3><p>Mean: {result.mean.toFixed(2)} · P10: {result.p10.toFixed(2)} · Median: {result.median.toFixed(2)} · P90: {result.p90.toFixed(2)}</p><p>Negative NPV: {(result.negativeProbability * 100).toFixed(1)}% · Approval frequency: {(result.approvalFrequency * 100).toFixed(1)}%</p><p>Mean Monte Carlo standard error: {result.standardError.toFixed(3)} · Approximate 95% sampling interval for mean: {result.meanInterval95.map((value) => value.toFixed(2)).join(" to ")}</p><p>This interval measures finite-simulation error, not uncertainty about true asset value. Path outcomes are not probability-weighted a second time.</p></div>}
      <button className="rounded border px-4 py-2" type="button" disabled={!!validationError} onClick={download}>Export scenario and simulation JSON</button>
    </fieldset>
    <details><summary>Method and limitations</summary><p>Stage costs are spread evenly and fully incurred conditional on entering a stage. Failure is recognized at stage end and stops all later spending. Launch cost is incurred at development completion only on success. First revenue follows one year later. Sales ramp linearly, plateau, then decline geometrically. Commercial cash flow is sales × margin × (1 − tax). No terminal value, intra-stage stopping, royalties, milestones, tax-loss carryforwards, dilution, debt/cash bridge, or empirical correlations. Do not substitute aggregate cost-per-successful-launch benchmarks for asset stage costs. Results are hypothetical asset values, not equity values or investment recommendations.</p></details>
  </section>;
}
