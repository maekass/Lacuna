"use client";

import { useEffect, useRef, useState } from "react";
import RnpvFields from "@/components/rnpv/RnpvFields";
import RnpvResults from "@/components/rnpv/RnpvResults";
import { buildRnpvExport } from "@/lib/research/rnpvExport";
import {
  blankScenarioForm,
  illustrativePreset,
  parseScenarioForm,
} from "@/lib/research/rnpvScenarioForm";
import type {
  NumericFormKey,
  ScenarioFormState,
  StageId,
} from "@/lib/research/rnpvScenarioForm";
import {
  calculateRnpv,
  simulateRnpvYielding,
} from "@/lib/research/rnpvSimulator";
import type {
  MonteCarloResult,
  SimulationProgress,
} from "@/lib/research/rnpvSimulator";

type MonteCarloSummary = Omit<MonteCarloResult, "samples">;

const NOTE_FIELDS = new Set<keyof ScenarioFormState>([
  "assumptionNotes",
  "preclinicalRationale",
]);

function summaryOf(result: MonteCarloResult): MonteCarloSummary {
  return {
    modelVersion: result.modelVersion,
    timingConvention: result.timingConvention,
    valuationPoint: result.valuationPoint,
    settings: result.settings,
    mean: result.mean,
    standardError: result.standardError,
    meanInterval95: result.meanInterval95,
    p10: result.p10,
    median: result.median,
    p90: result.p90,
    negativeProbability: result.negativeProbability,
    approvalFrequency: result.approvalFrequency,
  };
}

/** Native, browser-only analyst sandbox. No dataset or benchmark imports. */
export default function RnpvSimulator() {
  const [accepted, setAccepted] = useState(false);
  const [form, setForm] = useState<ScenarioFormState>(() =>
    blankScenarioForm()
  );
  const [showErrors, setShowErrors] = useState(false);
  const [summary, setSummary] = useState<MonteCarloSummary | null>(null);
  const [progress, setProgress] = useState<SimulationProgress | null>(null);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const resultRef = useRef<MonteCarloResult | null>(null);
  const revisionRef = useRef(0);

  useEffect(() => {
    const abort = () => abortRef.current?.abort();
    return abort;
  }, []);

  const parsed = parseScenarioForm(form);
  const deterministic = parsed.ok ? calculateRnpv(parsed.scenario) : null;

  function invalidate() {
    revisionRef.current += 1;
    abortRef.current?.abort();
    resultRef.current = null;
    setSummary(null);
    setProgress(null);
    setRunning(false);
    setRunError("");
  }

  function patch(partial: Partial<ScenarioFormState>) {
    const keys = Object.keys(partial) as (keyof ScenarioFormState)[];
    const keepPreset = keys.length > 0 &&
      keys.every((key) => NOTE_FIELDS.has(key));
    if (keys.some((key) => !NOTE_FIELDS.has(key))) invalidate();
    setForm((current) => ({
      ...current,
      ...partial,
      presetId: keepPreset ? current.presetId : null,
    }));
  }

  function onField(key: NumericFormKey, value: string) {
    const partial: Partial<ScenarioFormState> = {};
    partial[key] = value;
    patch(partial);
  }

  function onStage(
    id: StageId,
    key: "years" | "probabilityPercent" | "cost",
    value: string,
  ) {
    invalidate();
    setForm((current) => ({
      ...current,
      presetId: null,
      stages: {
        ...current.stages,
        [id]: { ...current.stages[id], [key]: value },
      },
    }));
  }

  function loadPreset() {
    if (!accepted) return;
    invalidate();
    setShowErrors(false);
    setForm(illustrativePreset());
  }

  async function run() {
    if (!parsed.ok) {
      setShowErrors(true);
      setRunError("Fix the highlighted assumptions before running.");
      return;
    }
    const revision = revisionRef.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    if (revisionRef.current !== revision) return;
    setRunning(true);
    setRunError("");
    setProgress({ completed: 0, total: parsed.settings.iterations });
    try {
      const result = await simulateRnpvYielding(
        parsed.scenario,
        parsed.settings,
        {
          chunkSize: 2_000,
          signal: controller.signal,
          onProgress: (next) => {
            if (revisionRef.current === revision) setProgress(next);
          },
        },
      );
      if (revisionRef.current !== revision || controller.signal.aborted) return;
      resultRef.current = result;
      setSummary(summaryOf(result));
      setProgress(null);
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      if (revisionRef.current !== revision) return;
      resultRef.current = null;
      setSummary(null);
      setRunError(cause instanceof Error ? cause.message : "Simulation failed");
    } finally {
      if (abortRef.current === controller) {
        setRunning(false);
        setProgress(null);
      }
    }
  }

  function cancel() {
    abortRef.current?.abort();
    setRunning(false);
    setProgress(null);
  }

  function download() {
    if (!parsed.ok || !deterministic) {
      setShowErrors(true);
      setRunError("Fix the highlighted assumptions before exporting.");
      return;
    }
    const payload = buildRnpvExport({
      form,
      scenario: parsed.scenario,
      settings: parsed.settings,
      deterministic,
      simulation: resultRef.current,
      fresh: resultRef.current !== null,
    });
    const url = URL.createObjectURL(
      new Blob(
        [JSON.stringify(payload, null, 2)],
        { type: "application/json" },
      ),
    );
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = "lacuna-rnpv-scenario.json";
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="space-y-6">
      <p
        className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-relaxed text-amber-950"
        role="note"
      >
        Analyst scenario sandbox for researchers and early-stage teams. It
        explores how development risk, commercial assumptions, timing, and
        capital needs change a hypothetical asset value. It is not an investment
        recommendation, a clinical prediction, a company ranking, or a verified
        valuation. Outputs stay on this page and do not feed Lacuna deal scores
        or verified records. No live data or model service is used.
      </p>
      <label className="flex items-start gap-3 text-sm text-lacuna-plum">
        <input
          className="mt-1 h-4 w-4 accent-lacuna-plum"
          type="checkbox"
          checked={accepted}
          onChange={(event) => {
            const next = event.target.checked;
            setAccepted(next);
            if (!next) {
              invalidate();
              setShowErrors(false);
            }
          }}
        />
        <span>
          I understand these inputs are hypothetical assumptions, including any
          illustrative preset I load. They are not investment advice or clinical
          guidance.
        </span>
      </label>
      <fieldset disabled={!accepted} className="space-y-8 disabled:opacity-60">
        <legend className="sr-only">Hypothetical rNPV assumptions</legend>
        <RnpvFields
          form={form}
          fieldErrors={parsed.ok ? {} : parsed.fieldErrors}
          showErrors={showErrors}
          onPatch={patch}
          onField={onField}
          onStage={onStage}
          onLoadPreset={loadPreset}
        />
        {accepted && showErrors && !parsed.ok
          ? (
            <div
              role="alert"
              className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"
            >
              <p className="font-medium">These assumptions need attention.</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {parsed.errors.map((error) => <li key={error}>{error}</li>)}
              </ul>
            </div>
          )
          : null}
        {accepted
          ? (
            <RnpvResults
              startStage={form.startStage}
              deterministic={deterministic}
              summary={summary}
              progress={progress}
              running={running}
              runError={runError}
              canRun={parsed.ok}
              showIncomplete={!parsed.ok && !showErrors}
              onRun={() => void run()}
              onCancel={cancel}
              onExport={download}
            />
          )
          : null}
      </fieldset>
      <details className="rounded-xl border border-lacuna-lavender/50 bg-white p-4 text-sm text-lacuna-blue">
        <summary className="cursor-pointer font-medium text-lacuna-plum">
          Method and limitations
        </summary>
        <div className="mt-3 space-y-3 leading-relaxed">
          <p>
            Amounts are USD millions. The valuation date is entry into the
            selected stage. A certain upfront cost is paid at that date and is
            not discounted. Remaining stage costs are equal year-end
            installments, weighted in the expected-value view by the probability
            of entering the stage. Failure is recognized at the stage end and
            cancels every later cost. Launch investment is paid at the
            development-completion year-end only on success. First revenue is
            one year later.
          </p>
          <p>
            Sales rise linearly to the peak in the final ramp year, stay there
            for the additional peak years, then decline geometrically.
            Commercial cash flow is sales times operating cash margin times one
            minus the tax rate. There is no terminal value, intra-stage
            stopping, royalty, milestone, tax-loss carryforward, dilution, or
            financing bridge.
          </p>
          <p>
            The Monte Carlo draws Bernoulli stage outcomes and does not
            probability-weight those paths again. Positive uncertainty ranges
            are independent and uniform. They are not empirical posteriors. The
            reported sampling interval is finite-simulation error only.
          </p>
        </div>
      </details>
    </div>
  );
}
