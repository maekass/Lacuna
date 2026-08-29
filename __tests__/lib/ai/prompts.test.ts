import { describe, expect, it } from "vitest";
import {
  ANTI_HALLUCINATION_GUARD,
  buildAcquisitionInsightPrompt,
  buildClassificationPrompt,
  buildEvidenceSummaryPrompt,
  buildReimbursementInsightPrompt,
  buildSectorInsightPrompt,
  CLASSIFICATION_SYSTEM_PROMPT,
  EDUCATIONAL_DISCLAIMER,
  INSIGHTS_SYSTEM_PROMPT,
  OUTPUT_FORMAT_CONSTRAINT,
  PROMPT_VERSION,
  sanitizeLLMOutput,
  validatePromptTemplate,
} from "@/lib/ai/prompts";

// ---------------------------------------------------------------------------
// Version & constants
// ---------------------------------------------------------------------------

describe("prompts > version", () => {
  it("has a semver version tag", () => {
    expect(PROMPT_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe("prompts > guardrails", () => {
  it("ANTI_HALLUCINATION_GUARD contains key constraints", () => {
    expect(ANTI_HALLUCINATION_GUARD).toContain("Only reference data");
    expect(ANTI_HALLUCINATION_GUARD).toContain("uncertain");
    expect(ANTI_HALLUCINATION_GUARD).toContain("Never invent");
  });

  it("EDUCATIONAL_DISCLAIMER is present and non-empty", () => {
    expect(EDUCATIONAL_DISCLAIMER.length).toBeGreaterThan(20);
    expect(EDUCATIONAL_DISCLAIMER).toContain("educational");
    expect(EDUCATIONAL_DISCLAIMER).toContain("not investment advice");
  });

  it("OUTPUT_FORMAT_CONSTRAINT specifies plain text", () => {
    expect(OUTPUT_FORMAT_CONSTRAINT).toContain("plain text");
    expect(OUTPUT_FORMAT_CONSTRAINT).toContain("No markdown");
  });
});

// ---------------------------------------------------------------------------
// System prompts
// ---------------------------------------------------------------------------

describe("prompts > system prompts", () => {
  it("INSIGHTS_SYSTEM_PROMPT includes all guardrails", () => {
    expect(INSIGHTS_SYSTEM_PROMPT).toContain("CRITICAL CONSTRAINTS");
    expect(INSIGHTS_SYSTEM_PROMPT).toContain("educational demonstration");
    expect(INSIGHTS_SYSTEM_PROMPT).toContain("plain text only");
  });

  it("CLASSIFICATION_SYSTEM_PROMPT includes classification rules", () => {
    expect(CLASSIFICATION_SYSTEM_PROMPT).toContain("women's health relevant");
    expect(CLASSIFICATION_SYSTEM_PROMPT).toContain("Be conservative");
    expect(CLASSIFICATION_SYSTEM_PROMPT).toContain("EVIDENCE REQUIREMENTS");
  });

  it("CLASSIFICATION_SYSTEM_PROMPT includes anti-hallucination guard", () => {
    expect(CLASSIFICATION_SYSTEM_PROMPT).toContain("Never invent");
  });
});

// ---------------------------------------------------------------------------
// Prompt templates — deterministic output
// ---------------------------------------------------------------------------

describe("prompts > buildAcquisitionInsightPrompt", () => {
  it("produces deterministic output for same input", () => {
    const a = buildAcquisitionInsightPrompt({
      companyName: "Acme",
      sector: "Fertility",
      topAcquirer: "BigCo",
      matchScore: 85,
      estimatedValue: 200,
      competitiveThreat: "medium",
    });
    const b = buildAcquisitionInsightPrompt({
      companyName: "Acme",
      sector: "Fertility",
      topAcquirer: "BigCo",
      matchScore: 85,
      estimatedValue: 200,
      competitiveThreat: "medium",
    });
    expect(a).toBe(b);
  });

  it("includes all input values in output", () => {
    const prompt = buildAcquisitionInsightPrompt({
      companyName: "Acme",
      sector: "Fertility",
      topAcquirer: "BigCo",
      matchScore: 85,
      estimatedValue: 200,
      competitiveThreat: "medium",
      evidenceScore: 72,
    });
    expect(prompt).toContain("Acme");
    expect(prompt).toContain("Fertility");
    expect(prompt).toContain("BigCo");
    expect(prompt).toContain("85%");
    expect(prompt).toContain("$200M");
    expect(prompt).toContain("medium");
    expect(prompt).toContain("72/100");
  });

  it("omits evidence line when score is undefined", () => {
    const prompt = buildAcquisitionInsightPrompt({
      companyName: "Acme",
      sector: "Fertility",
      topAcquirer: "BigCo",
      matchScore: 85,
      estimatedValue: 200,
      competitiveThreat: "medium",
    });
    expect(prompt).not.toContain("Evidence maturity");
  });

  it("passes template validation", () => {
    const prompt = buildAcquisitionInsightPrompt({
      companyName: "Acme",
      sector: "Fertility",
      topAcquirer: "BigCo",
      matchScore: 85,
      estimatedValue: 200,
      competitiveThreat: "medium",
    });
    const { valid, issues } = validatePromptTemplate(prompt);
    expect(valid).toBe(true);
    expect(issues).toHaveLength(0);
  });
});

describe("prompts > buildEvidenceSummaryPrompt", () => {
  it("includes all input values", () => {
    const prompt = buildEvidenceSummaryPrompt({
      companyName: "BioGen",
      phase: "Phase 2",
      fdaStatus: "Fast Track",
      trialCount: 5,
      overallScore: 68,
    });
    expect(prompt).toContain("BioGen");
    expect(prompt).toContain("Phase 2");
    expect(prompt).toContain("Fast Track");
    expect(prompt).toContain("5");
    expect(prompt).toContain("68/100");
  });

  it("passes template validation", () => {
    const prompt = buildEvidenceSummaryPrompt({
      companyName: "BioGen",
      phase: "Phase 2",
      fdaStatus: "Fast Track",
      trialCount: 5,
      overallScore: 68,
    });
    const { valid } = validatePromptTemplate(prompt);
    expect(valid).toBe(true);
  });
});

describe("prompts > buildSectorInsightPrompt", () => {
  it("includes all input values", () => {
    const prompt = buildSectorInsightPrompt({
      sector: "Fertility",
      dealCount: 12,
      avgMultiple: 4.5,
      medianTimeToExit: 36,
      topAcquirers: ["BigCo", "MedCorp"],
    });
    expect(prompt).toContain("Fertility");
    expect(prompt).toContain("12");
    expect(prompt).toContain("4.5x");
    expect(prompt).toContain("36");
    expect(prompt).toContain("BigCo, MedCorp");
  });

  it("passes template validation", () => {
    const prompt = buildSectorInsightPrompt({
      sector: "Fertility",
      dealCount: 12,
      avgMultiple: 4.5,
      medianTimeToExit: 36,
      topAcquirers: ["BigCo"],
    });
    const { valid } = validatePromptTemplate(prompt);
    expect(valid).toBe(true);
  });
});

describe("prompts > buildReimbursementInsightPrompt", () => {
  it("includes all input values and computes premium", () => {
    const prompt = buildReimbursementInsightPrompt({
      companyName: "HealthInc",
      businessModel: "B2B SaaS",
      insuranceRevenue: 0.65,
      valuationMultiple: 6.0,
      sectorBenchmark: 4.0,
    });
    expect(prompt).toContain("HealthInc");
    expect(prompt).toContain("B2B SaaS");
    expect(prompt).toContain("65%");
    expect(prompt).toContain("6.0x");
    expect(prompt).toContain("4.0x");
    expect(prompt).toContain("50%");
  });

  it("passes template validation", () => {
    const prompt = buildReimbursementInsightPrompt({
      companyName: "HealthInc",
      businessModel: "B2B SaaS",
      insuranceRevenue: 0.65,
      valuationMultiple: 6.0,
      sectorBenchmark: 4.0,
    });
    const { valid } = validatePromptTemplate(prompt);
    expect(valid).toBe(true);
  });
});

describe("prompts > buildClassificationPrompt", () => {
  it("includes filing metadata and excerpt", () => {
    const prompt = buildClassificationPrompt({
      filingText: "Acquisition of FemTech Inc for $50M",
      targetName: "FemTech Inc",
      acquirerName: "BigPharma",
      sicCode: "2834",
      sicDescription: "Pharmaceutical Preparations",
    });
    expect(prompt).toContain("BigPharma");
    expect(prompt).toContain("FemTech Inc");
    expect(prompt).toContain("2834");
    expect(prompt).toContain("Pharmaceutical Preparations");
    expect(prompt).toContain("Acquisition of FemTech Inc");
    expect(prompt).toContain("CLASSIFICATION CHECKLIST");
  });

  it("omits optional fields when absent", () => {
    const prompt = buildClassificationPrompt({
      filingText: "Generic acquisition text",
    });
    expect(prompt).not.toContain("Acquirer:");
    expect(prompt).not.toContain("Target");
    expect(prompt).not.toContain("SIC:");
  });

  it("truncates filing text to 6000 chars", () => {
    const longText = "x".repeat(10000);
    const prompt = buildClassificationPrompt({
      filingText: longText,
    });
    // Should not contain the full 10000 chars
    expect(prompt.length).toBeLessThan(8000);
  });

  it("passes template validation", () => {
    const prompt = buildClassificationPrompt({
      filingText: "Acquisition of FemTech Inc for $50M",
      acquirerName: "BigPharma",
    });
    const { valid } = validatePromptTemplate(prompt);
    expect(valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Output sanitization
// ---------------------------------------------------------------------------

describe("prompts > sanitizeLLMOutput", () => {
  it("strips markdown headings", () => {
    const { clean } = sanitizeLLMOutput("## Summary\n\nThis is a test.");
    expect(clean).not.toContain("##");
    expect(clean).toContain("Summary");
    expect(clean).toContain("This is a test.");
  });

  it("strips bold and italic formatting", () => {
    const { clean } = sanitizeLLMOutput(
      "This is **bold** and *italic* text.",
    );
    expect(clean).not.toContain("**");
    expect(clean).not.toContain("*");
    expect(clean).toContain("bold");
    expect(clean).toContain("italic");
  });

  it("strips inline code", () => {
    const { clean } = sanitizeLLMOutput("Use `generateText` function.");
    expect(clean).not.toContain("`");
    expect(clean).toContain("generateText");
  });

  it("strips bullet list markers", () => {
    const { clean } = sanitizeLLMOutput(
      "- Item one\n- Item two\n* Item three",
    );
    expect(clean).not.toContain("- ");
    expect(clean).not.toContain("* ");
    expect(clean).toContain("Item one");
    expect(clean).toContain("Item two");
    expect(clean).toContain("Item three");
  });

  it("strips numbered list markers", () => {
    const { clean } = sanitizeLLMOutput("1. First\n2. Second");
    expect(clean).not.toMatch(/^\d+\.\s/m);
    expect(clean).toContain("First");
    expect(clean).toContain("Second");
  });

  it("collapses excessive newlines", () => {
    const { clean } = sanitizeLLMOutput("Para one\n\n\n\nPara two");
    expect(clean).not.toContain("\n\n\n");
    expect(clean).toBe("Para one\n\nPara two");
  });

  it("detects potential hallucination with dollar amounts", () => {
    const { warnings } = sanitizeLLMOutput(
      "The deal was valued at $500 million and closed in March 2024.",
    );
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0]).toContain("hallucination");
  });

  it("detects potential hallucination with FDA claims", () => {
    const { warnings } = sanitizeLLMOutput(
      "The product received FDA approved status last year.",
    );
    expect(warnings.length).toBeGreaterThan(0);
  });

  it("detects potential hallucination with percentage changes", () => {
    const { warnings } = sanitizeLLMOutput(
      "Revenue grew by 25% increase year over year.",
    );
    expect(warnings.length).toBeGreaterThan(0);
  });

  it("does not flag safe educational output", () => {
    const { clean, warnings } = sanitizeLLMOutput(
      "This company operates in the fertility sector. The match score suggests alignment with historical patterns, though the sample size is limited.",
    );
    expect(warnings).toHaveLength(0);
    expect(clean.length).toBeGreaterThan(0);
  });

  it("truncates output exceeding 2000 characters", () => {
    const longText = "Safe educational text. ".repeat(150);
    const { clean, warnings } = sanitizeLLMOutput(longText);
    expect(clean.length).toBeLessThanOrEqual(2000);
    expect(clean).toContain("...");
    expect(warnings.some((w) => w.includes("truncated"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Prompt template validation
// ---------------------------------------------------------------------------

describe("prompts > validatePromptTemplate", () => {
  it("passes a valid prompt", () => {
    const { valid, issues } = validatePromptTemplate(
      "DATA:\nCompany: Acme Corp in the fertility sector\n\nTASK: Analyze this data and provide insights.",
    );
    expect(valid).toBe(true);
    expect(issues).toHaveLength(0);
  });

  it("flags unresolved template literals", () => {
    const { valid, issues } = validatePromptTemplate(
      "Company: ${companyName} in ${sector}",
    );
    expect(valid).toBe(false);
    expect(issues.some((i) => i.includes("Unresolved"))).toBe(true);
  });

  it("flags empty DATA sections", () => {
    const { valid, issues } = validatePromptTemplate(
      "DATA:\n\nTASK: Do something.",
    );
    expect(valid).toBe(false);
    expect(issues.some((i) => i.includes("Empty DATA"))).toBe(true);
  });

  it("flags prompts that are too short", () => {
    const { valid, issues } = validatePromptTemplate("Hi");
    expect(valid).toBe(false);
    expect(issues.some((i) => i.includes("too short"))).toBe(true);
  });

  it("flags prompts that are too long", () => {
    const { valid, issues } = validatePromptTemplate("x".repeat(9000));
    expect(valid).toBe(false);
    expect(issues.some((i) => i.includes("exceeds"))).toBe(true);
  });

  it("scans nested ${{ payloads in linear time", () => {
    const payload = "${{".repeat(20_000);
    const started = Date.now();
    const { valid, issues } = validatePromptTemplate(payload);
    expect(Date.now() - started).toBeLessThan(250);
    expect(valid).toBe(false);
    expect(issues.some((i) => i.includes("exceeds"))).toBe(true);
    expect(issues.some((i) => i.includes("Unresolved"))).toBe(false);
  });
});
