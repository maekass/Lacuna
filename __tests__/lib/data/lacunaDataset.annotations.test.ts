import annotationsJson from "@/data/lacunaDataset.annotations.json";
import { getStaticVerifiedDataset } from "@/lib/data/staticDataset";
import { describe, expect, it } from "vitest";

interface AnnotationFile {
  readonly deals: Readonly<Record<string, unknown>>;
}

describe("lacunaDataset annotation coverage", () => {
  it("covers every verified acquisition exactly", () => {
    const annotations = annotationsJson as AnnotationFile;
    const acquisitionIds = new Set(
      getStaticVerifiedDataset().acquisitions.map((acquisition) =>
        acquisition.id
      ),
    );
    const annotationIds = new Set(Object.keys(annotations.deals));
    const missing = [...acquisitionIds].filter((id) => !annotationIds.has(id))
      .sort();
    const stale = [...annotationIds].filter((id) => !acquisitionIds.has(id))
      .sort();

    const details = [
      missing.length > 0 ? `add annotations for: ${missing.join(", ")}` : "",
      stale.length > 0
        ? `remove stale annotations for: ${stale.join(", ")}`
        : "",
    ].filter(Boolean).join("; ");

    expect(
      { missing, stale },
      details || "Annotation coverage is out of sync.",
    ).toEqual({ missing: [], stale: [] });
  });
});
