/**
 * AI Insights — /api/ai/insights
 * Optional LLM narrative blurbs. Gated by OPENAI_API_KEY, AI_GATEWAY_API_KEY, or VERCEL_OIDC_TOKEN.
 * Returns {configured:false} / 503 when no inference provider is configured.
 */
import { Router, type IRouter } from "express";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function isAIConfigured(): boolean {
  return Boolean(
    process.env.AI_GATEWAY_API_KEY?.trim() ||
    process.env.VERCEL_OIDC_TOKEN?.trim() ||
    process.env.OPENAI_API_KEY?.trim(),
  );
}

const SYSTEM_PROMPT = `You are a women's health M&A educator helping learners interpret curated, verified deal data from the Lacuna platform.

ROLE:
- Explain patterns in women's health acquisitions using only the data provided
- Help readers understand what the metrics mean, not what to do with them
- Maintain a neutral, educational tone

CRITICAL CONSTRAINTS:
- Only reference data explicitly provided in the prompt
- If you are uncertain, state your uncertainty explicitly
- Never invent statistics, deal values, company names, or trial results
- Use hedging language ("may indicate", "suggests", "is consistent with") for interpretations
- Flag when sample sizes are small or data is incomplete

FORMAT: Respond in plain text only. No markdown headings, no bullet lists, no code blocks. Use complete sentences in paragraph form.

DISCLAIMER: This is an educational demonstration using curated historical data. It is not investment advice, a clinical recommendation, or a forecast.`;

function buildAcquisitionPrompt(
  companyName: string, sector: string, topAcquirer: string,
  matchScore: number, estimatedValue: number, competitiveThreat: string,
  evidenceScore?: number,
): string {
  const evidenceLine = evidenceScore !== undefined
    ? `Evidence maturity score (descriptive heuristic): ${evidenceScore}/100`
    : "";
  return [
    `Analyze this women's health M&A scenario using only the data below.`,
    `Stress that match scores are descriptive heuristics computed from historical patterns, not predictions.`,
    ``,
    `DATA:`,
    `Company: ${companyName} (${sector})`,
    `Top acquirer fit (heuristic match): ${topAcquirer} (${matchScore}% match score)`,
    `Estimated value context: $${estimatedValue}M`,
    `Competitive threat label: ${competitiveThreat}`,
    evidenceLine,
    ``,
    `TASK: In 2-3 short paragraphs, explain what this scenario illustrates about women's health M&A patterns.`,
  ].filter(Boolean).join("\n");
}

function buildEvidencePrompt(
  companyName: string, phase: string, fdaStatus: string,
  trialCount: number, overallScore: number,
): string {
  return [
    `Summarize this clinical evidence profile using only the data below.`,
    ``,
    `DATA:`,
    `Company: ${companyName}`,
    `Phase: ${phase} | FDA status: ${fdaStatus} | Clinical trials: ${trialCount}`,
    `Descriptive evidence score: ${overallScore}/100`,
    ``,
    `TASK: In 2-3 sentences, explain what this evidence profile indicates about the company's development stage. Note that the score is a descriptive heuristic, not a regulatory assessment.`,
  ].join("\n");
}

function buildReimbursementPrompt(
  companyName: string, businessModel: string,
  insuranceRevenue: number, valuationMultiple: number, sectorBenchmark: number,
): string {
  const premium = ((valuationMultiple / sectorBenchmark - 1) * 100).toFixed(0);
  return [
    `Explain the reimbursement context for ${companyName} using only the data below.`,
    ``,
    `DATA:`,
    `Business model: ${businessModel}`,
    `Insurance revenue estimate: ${(insuranceRevenue * 100).toFixed(0)}%`,
    `Valuation multiple: ${valuationMultiple.toFixed(1)}x vs sector benchmark ${sectorBenchmark.toFixed(1)}x (${premium}% difference)`,
    ``,
    `TASK: In 2-3 sentences, describe what the reimbursement profile suggests about the company's commercial positioning.`,
  ].join("\n");
}

async function callOpenAI(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY!;
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      max_tokens: 400,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json() as {
    choices: Array<{ message: { content: string } }>;
  };
  return data.choices[0]?.message?.content ?? "";
}

router.get("/ai/insights", (_req, res): void => {
  res.json({ configured: isAIConfigured() });
});

router.post("/ai/insights", async (req, res): Promise<void> => {
  if (!isAIConfigured()) {
    res.status(503).json({
      error: "Server inference is not configured (AI Gateway or OPENAI_API_KEY).",
    });
    return;
  }

  const body = req.body as Record<string, unknown>;
  const { type, companyName, sector } = body;

  if (typeof type !== "string" || typeof companyName !== "string" || typeof sector !== "string") {
    res.status(400).json({ error: "type, companyName, and sector are required strings" });
    return;
  }

  try {
    let prompt: string;

    switch (type) {
      case "acquisition": {
        const analysis = body.analysis as {
          topAcquirer: string; matchScore: number;
          estimatedValue: number; competitiveThreat: string;
        } | undefined;
        if (!analysis?.topAcquirer) {
          res.status(400).json({ error: "analysis payload required for acquisition insights" });
          return;
        }
        const evidenceScore = typeof body.evidenceScore === "number" ? body.evidenceScore : undefined;
        prompt = buildAcquisitionPrompt(
          companyName, sector, analysis.topAcquirer, analysis.matchScore,
          analysis.estimatedValue, analysis.competitiveThreat, evidenceScore,
        );
        break;
      }
      case "evidence": {
        const evidence = body.evidence as {
          phase: string; fdaStatus: string; trialCount: number; overallScore: number;
        } | undefined;
        if (!evidence?.phase) {
          res.status(400).json({ error: "evidence payload required for evidence insights" });
          return;
        }
        prompt = buildEvidencePrompt(companyName, evidence.phase, evidence.fdaStatus, evidence.trialCount, evidence.overallScore);
        break;
      }
      case "reimbursement": {
        const reimb = body.reimbursement as {
          businessModel: string; insuranceRevenue: number;
          valuationMultiple: number; sectorBenchmark: number;
        } | undefined;
        if (!reimb?.businessModel) {
          res.status(400).json({ error: "reimbursement payload required for reimbursement insights" });
          return;
        }
        prompt = buildReimbursementPrompt(companyName, reimb.businessModel, reimb.insuranceRevenue, reimb.valuationMultiple, reimb.sectorBenchmark);
        break;
      }
      default:
        res.status(400).json({ error: `Unknown insight type: ${type}` });
        return;
    }

    const content = await callOpenAI(prompt);
    res.json({ content });
  } catch (err) {
    logger.error({ err }, "AI insights error");
    const message = err instanceof Error ? err.message : "Insight generation failed";
    res.status(500).json({ error: message });
  }
});

export default router;
