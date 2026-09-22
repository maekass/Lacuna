"use client";

/**
 * Public note that offline trial classifiers are not a published result.
 * Hold-out metrics from the committed artifact stay off this surface.
 */

export default function ClinicalTrialsMlPanel() {
  return (
    <div className="rounded-xl border border-lacuna-pink/30 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-lacuna-plum">
        Trial registry fields
      </h3>
      <p className="mt-1 text-sm text-lacuna-blue/80" role="status">
        Relevance and completion scores are not published. This panel does not
        show hold-out metrics from the offline training artifact. Trial search
        above uses live ClinicalTrials.gov fields only.
      </p>
    </div>
  );
}
