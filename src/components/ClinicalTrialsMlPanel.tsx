"use client";

import { ModelProvenanceHint } from "@/components/ui/ModelProvenanceHint";
import {
  CLINICAL_TRIALS_ML_MODEL,
  getClinicalTrialsTrainingSource,
  getCompletionProxyMetrics,
  getWhRelevanceModelMetrics,
  isCompletionProxyAvailable,
} from "@/lib/ml/clinicalTrials/scoreClinicalTrial";

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-lacuna-lavender/30 bg-lacuna-pink/5 p-3">
      <p className="text-lg font-semibold text-lacuna-plum">{value}</p>
      <p className="text-xs text-lacuna-blue mt-1">{label}</p>
    </div>
  );
}

export default function ClinicalTrialsMlPanel() {
  const wh = getWhRelevanceModelMetrics();
  const completion = getCompletionProxyMetrics();
  const source = getClinicalTrialsTrainingSource();

  return (
    <div className="rounded-xl border border-lacuna-pink/30 bg-white p-5 shadow-sm">
      <ModelProvenanceHint model={CLINICAL_TRIALS_ML_MODEL}>
        <div className="mb-4 max-w-3xl cursor-help">
          <h3 className="text-sm font-semibold text-lacuna-plum">
            Clinical trials ML (offline sklearn)
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-lacuna-blue/80">
            Trained outside the Next.js bundle on ClinicalTrials.gov text fields.
            WH relevance tags women&apos;s-health trials; completion proxy estimates
            P(COMPLETED vs stopped) — not efficacy or approval. Source: {source}.
          </p>
        </div>
      </ModelProvenanceHint>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric label="WH model ROC-AUC" value={wh.roc_auc?.toFixed(2) ?? "—"} />
        <Metric label="WH training n" value={String(wh.n_total ?? "—")} />
        {completion ? (
          <>
            <Metric
              label="Completion ROC-AUC"
              value={completion.roc_auc?.toFixed(2) ?? "—"}
            />
            <Metric
              label="Completion baseline"
              value={
                completion.majority_baseline_accuracy != null
                  ? `${(completion.majority_baseline_accuracy * 100).toFixed(0)}%`
                  : "—"
              }
            />
          </>
        ) : (
          <Metric label="Completion model" value="Not exported" />
        )}
      </div>

      {!isCompletionProxyAvailable() && (
        <p className="mt-3 text-xs text-lacuna-blue/70">
          Completion proxy hidden until hold-out ROC-AUC ≥ 0.55 on live CT.gov data.
          Run <code className="text-lacuna-plum">npm run ml:ct:train</code> locally.
        </p>
      )}
    </div>
  );
}
