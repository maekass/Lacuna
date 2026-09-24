import { describe, expect, it } from "vitest";
import {
  BIOTHERANOSTICS_CLAIMS,
  BIOTHERANOSTICS_DOSSIER,
  BIOTHERANOSTICS_SOURCES,
  biotheranosticsSource,
} from "@/lib/research/biotheranosticsDossier";
import { biotheranosticsBrief } from "@/lib/research/biotheranosticsBrief";
import { GET } from "@/app/(product)/research/biotheranostics/brief/route";

describe("Biotheranostics source contract", () => {
  it("resolves every claim and interpretation anchor to a dated, specific source", () => {
    const ids = BIOTHERANOSTICS_CLAIMS.map((claim) => claim.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of BIOTHERANOSTICS_DOSSIER.answerClaimIds) {
      expect(ids).toContain(id);
    }
    for (const claim of BIOTHERANOSTICS_CLAIMS) {
      const source = biotheranosticsSource(claim.sourceId);
      const url = new URL(source.url);
      expect(url.protocol).toBe("https:");
      expect(url.pathname).not.toBe("/");
      expect(url.pathname).not.toContain("browse-edgar");
      expect(source.accessedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(claim.locator.length).toBeGreaterThan(10);
      expect(claim.uncertainty.length).toBeGreaterThan(10);
    }
    expect(() => biotheranosticsSource("deleted-source")).toThrow(
      "Unknown dossier source",
    );
  });

  it("does not turn SEC hosting or manufacturer-supported research into independent attestation", () => {
    const filings = BIOTHERANOSTICS_SOURCES.filter((source) =>
      source.url.includes("sec.gov")
    );
    expect(filings).toHaveLength(2);
    expect(filings.every((source) => source.sourceGroup === "hologic")).toBe(
      true,
    );
    expect(biotheranosticsSource("b42-study").relationship).toContain(
      "Biotheranostics support",
    );
    expect(BIOTHERANOSTICS_DOSSIER.reviewStatus).toBe(
      "Human specialist review pending",
    );
  });
});

describe("portable research brief", () => {
  it("keeps different price vintages and clinical limitations attached to the exported findings", () => {
    const brief = biotheranosticsBrief();
    expect(brief).toContain("approximately US$230.0 million");
    expect(brief).toContain("US$232.5 million");
    expect(brief).toContain("The allocation was preliminary");
    expect(brief).toContain("do not establish a valuation premium");
    expect(brief).toContain("primary recurrence-free-interval endpoint");
    expect(brief).toContain("time-dependent secondary");
    expect(brief).toContain("underpowered primary analysis");
    expect(brief).toContain("within-group benefit does not by itself prove");
    expect(brief).toContain("Source group: hologic");
    expect(brief).toContain("Human specialist review pending");
    expect(brief).toContain("What would weaken the thesis");
    expect(brief).not.toContain("Dual-source corroboration");
  });

  it("serves the complete brief as a download rather than an indexable duplicate page", async () => {
    const response = GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe(
      "text/markdown; charset=utf-8",
    );
    expect(response.headers.get("Content-Disposition")).toContain(
      'filename="biotheranostics-evidence-dossier.md"',
    );
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex");
    expect(await response.text()).toBe(biotheranosticsBrief());
  });
});
