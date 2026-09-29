import { describe, expect, it } from "vitest";
import { z } from "zod";
import { evidenceObservationSchema } from "@/lib/evidenceGraph/schema";
import { endometriosisTherapeuticsGraph } from "@/data/therapeutics/endometriosis";
import { projectTherapeuticClaims } from "@/lib/therapeutics/claims";
import { sourcedSchema } from "@/lib/therapeutics/primitives";
import {
  catalystSchema,
  investmentThesisSchema,
  nctIdSchema,
} from "@/lib/therapeutics/schema";

describe("therapeutics evidence separation", () => {
  it("rejects analyst assumptions as evidence observations", () => {
    const parsed = evidenceObservationSchema.safeParse({
      schemaVersion: "1.0.0",
      id: "obs-assumption",
      subject: { kind: "drug", id: "asset-elagolix", label: "elagolix" },
      metric: "invest",
      value: "buy",
      source: {
        id: "src",
        title: "note",
        publisher: "analyst",
        url: "https://example.com/note",
        locator: "page 1",
        retrievedAt: "2026-09-28",
      },
      sourceClass: "other",
      asOf: "2026-09-28",
      evidenceKind: "assumption",
      limitations: ["An assumption is not an observation."],
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects assumptions on sourced therapeutic fields", () => {
    const parsed = sourcedSchema(z.string()).safeParse({
      claimId: "claim-bad",
      field: "asset.mechanism",
      value: "inferred",
      evidenceKind: "assumption",
      sourceId: "src",
      asOf: "2026-09-28",
      limitations: ["Not evidence."],
    });
    expect(parsed.success).toBe(false);
  });

  it("does not project thesis assumptions into claims", () => {
    const claims = projectTherapeuticClaims(endometriosisTherapeuticsGraph);
    const ids = claims.map((claim) => claim.claimId);
    expect(ids).not.toContain("assumption-duration-limits-not-uptake");
    expect(
      claims.every((claim) =>
        claim.evidenceKind === "observed" || claim.evidenceKind === "derived" ||
        claim.evidenceKind === "proxy"
      ),
    ).toBe(true);
  });

  it("rejects a score field on an investment thesis", () => {
    const thesis = endometriosisTherapeuticsGraph.theses[0];
    const parsed = investmentThesisSchema.safeParse({ ...thesis, score: 1 });
    expect(parsed.success).toBe(false);
  });

  it("rejects a registry estimate used as an actual catalyst date", () => {
    const parsed = catalystSchema.safeParse({
      id: "cat-bad",
      assetId: "asset-elagolix",
      catalystType: "readout",
      questionResolved: "Whether a readout occurred",
      status: "occurred",
      date: {
        claimId: "claim-bad-date",
        field: "catalyst.date",
        value: "2020-01-01",
        evidenceKind: "observed",
        sourceId: "src",
        asOf: "2020-01-01",
        limitations: ["Estimate stored as a fact."],
        role: "actual",
        certainty: "registry_estimated",
      },
      limitations: ["A registry estimate is not a factual date."],
    });
    expect(parsed.success).toBe(false);
  });

  it("requires eight digits in an NCT ID", () => {
    expect(nctIdSchema.safeParse("NCT01620528").success).toBe(true);
    expect(nctIdSchema.safeParse("NCT123").success).toBe(false);
    expect(nctIdSchema.safeParse("nct01620528").success).toBe(false);
  });
});
