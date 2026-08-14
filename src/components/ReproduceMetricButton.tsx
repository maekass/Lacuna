"use client";

import { useCallback, useMemo } from "react";
import { createReproductionArtifact } from "@/lib/lineage";
import type {
  MeasuredMetric,
  WithheldMetric,
} from "@/lib/provenance/metricProvenance";
import { lineageForMetric } from "@/lib/provenance/metricProvenance";

export default function ReproduceMetricButton({
  provenance,
  filenameHint,
}: {
  readonly provenance: MeasuredMetric | WithheldMetric;
  readonly filenameHint?: string;
}) {
  const artifact = useMemo(
    () =>
      createReproductionArtifact(
        provenance.estimate,
        lineageForMetric(provenance),
      ),
    [provenance],
  );
  const suffix = filenameHint
    ? `-${filenameHint.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`
    : "";
  const filename = `lacuna-${
    artifact.metricId.replaceAll(".", "-")
  }${suffix}.json`;
  const command = `npm run reproduce -- ${filename}`;
  const datasetCommand = `${command} --dataset`;
  const download = useCallback(() => {
    const blob = new Blob(
      [JSON.stringify(artifact, null, 2) + "\n"],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [artifact, filename]);
  return (
    <section className="rounded-lg border border-lacuna-lavender/40 p-3">
      <button
        type="button"
        className="font-semibold underline"
        onClick={download}
      >
        Reproduce this number
      </button>
      <p className="mt-1 text-xs text-lacuna-text-muted">
        Downloads a self-contained artifact.
      </p>
      <code className="mt-2 block overflow-x-auto text-xs">{command}</code>
      <code className="block overflow-x-auto text-xs">
        {datasetCommand}
      </code>
    </section>
  );
}
