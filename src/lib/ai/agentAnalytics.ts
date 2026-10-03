/**
 * Amplitude Agent Analytics for Lacuna server inference.
 *
 * LLM calls go through the Vercel AI SDK (`generateText`, `generateObject`,
 * `streamText`) and the AI Gateway, which `@amplitude/ai` provider wrappers
 * do not intercept. Each call is one short-lived session with a canonical
 * user line plus the model response.
 *
 * No-ops when `AMPLITUDE_AI_API_KEY` is unset so tests and unconfigured
 * deploys keep running.
 */

import { AIConfig, AmplitudeAI, type BoundAgent } from "@amplitude/ai";

/** Named agents. Ids are stable dashboard filters — do not rename casually. */
export const LACUNA_AGENTS = {
  "ui-insights": "Grounded company insight narratives for the product UI",
  "ui-stream": "Streaming company insight narratives",
  "space-wh-gap": "Space research, trial, and transaction gap analyst",
  "patient-empowerment-gap":
    "Patient empowerment baseline versus portfolio gap analyst",
  "sec-deal-classification": "SEC 8-K women's health acquisition classifier",
  "study-discovery": "Domestic women's health study catalog expansion",
  "lacuna-inference": "Lacuna inference call outside the named feature catalog",
} as const;

export type LacunaAgentId = keyof typeof LACUNA_AGENTS;

const USER_LINES: Record<LacunaAgentId, string> = {
  "ui-insights": "Write a grounded company insight from verified public data",
  "ui-stream": "Stream a grounded company insight from verified public data",
  "space-wh-gap": "Explain the space research to trial to transaction gap",
  "patient-empowerment-gap":
    "Explain the patient empowerment gap against the portfolio",
  "sec-deal-classification":
    "Classify whether this SEC filing is a women's health acquisition",
  "study-discovery":
    "Extract women's health study candidates from public source text",
  "lacuna-inference": "Run a Lacuna inference call",
};

/** Anonymous server identity. Amplitude rejects ids shorter than 5 characters. */
const SERVER_USER_ID = "lacuna-server";

export interface AgentResponseRecord {
  content: string;
  inputTokens: number;
  outputTokens: number;
  totalCostUsd: number;
  isError?: boolean;
  errorMessage?: string;
}

export interface AgentTurn {
  /** Record the model result and close the session. Idempotent. */
  complete(record: AgentResponseRecord): Promise<void>;
}

let amplitudeClient: AmplitudeAI | null = null;
let missingKeyWarned = false;
const agents = new Map<string, BoundAgent>();

function getClient(): AmplitudeAI | null {
  if (amplitudeClient) return amplitudeClient;
  const apiKey = process.env.AMPLITUDE_AI_API_KEY?.trim();
  if (!apiKey) {
    if (!missingKeyWarned && process.env.VITEST !== "true") {
      missingKeyWarned = true;
      console.warn(
        "AMPLITUDE_AI_API_KEY missing — agent analytics disabled",
      );
    }
    return null;
  }
  amplitudeClient = new AmplitudeAI({
    apiKey,
    config: new AIConfig({
      contentMode: "full",
      redactPii: true,
    }),
  });
  return amplitudeClient;
}

function agentIdFor(feature: string): LacunaAgentId {
  if (feature in LACUNA_AGENTS) return feature as LacunaAgentId;
  return "lacuna-inference";
}

function getAgent(client: AmplitudeAI, feature: string): BoundAgent {
  const agentId = agentIdFor(feature);
  const existing = agents.get(agentId);
  if (existing) return existing;
  const created = client.agent(agentId, {
    description: LACUNA_AGENTS[agentId],
  });
  agents.set(agentId, created);
  return created;
}

function userLine(feature: string): string {
  return USER_LINES[agentIdFor(feature)];
}

function providerFor(modelId: string): string {
  const id = modelId.toLowerCase();
  if (id === "mock") return "mock";
  if (id.startsWith("anthropic/") || id.includes("claude")) return "anthropic";
  if (id.startsWith("spacexai/") || id.includes("grok")) return "xai";
  if (id.startsWith("openai/") || id.startsWith("gpt-")) return "openai";
  const slash = id.indexOf("/");
  if (slash > 0) return id.slice(0, slash);
  return "openai";
}

/** Gateway slugs (`openai/gpt-4o-mini`) become the provider model id. */
export function canonicalModelId(modelId: string): string {
  const slash = modelId.lastIndexOf("/");
  const bare = slash >= 0 ? modelId.slice(slash + 1) : modelId;
  return bare.trim() || modelId;
}

function responseText(content: string, isError: boolean | undefined): string {
  const trimmed = content.trim();
  if (trimmed.length > 0) {
    return trimmed.length > 8000 ? `${trimmed.slice(0, 8000)}...` : trimmed;
  }
  return isError ? "[Inference failed]" : "[Empty model response]";
}

interface BrowserLink {
  deviceId?: string;
  browserSessionId?: string;
}

/**
 * Read Amplitude browser SDK headers when this call is inside a Next.js
 * request. CLI and unit tests have no request scope.
 */
async function readBrowserLink(): Promise<BrowserLink> {
  if (!process.env.NEXT_RUNTIME) return {};
  try {
    const { headers } = await import("next/headers");
    const incoming = await headers();
    const deviceId = incoming.get("x-amplitude-device-id")?.trim();
    const browserSessionId = incoming.get("x-amplitude-session-id")?.trim();
    return {
      deviceId: deviceId || undefined,
      browserSessionId: browserSessionId || undefined,
    };
  } catch {
    return {};
  }
}

async function flushClient(client: AmplitudeAI): Promise<void> {
  try {
    await client.flush();
  } catch (error) {
    console.warn("Amplitude agent analytics flush failed", error);
  }
}

/**
 * Open one agent session for a single inference call.
 * The user message is tracked immediately; {@link AgentTurn.complete} sends
 * the model response and closes the session.
 */
export async function openAgentTurn(
  feature: string,
  modelId: string,
): Promise<AgentTurn> {
  const client = getClient();
  const started = Date.now();
  if (!client) {
    return { complete: () => Promise.resolve() };
  }

  const link = await readBrowserLink();
  const session = getAgent(client, feature).session({
    sessionId: crypto.randomUUID(),
    userId: SERVER_USER_ID,
    deviceId: link.deviceId,
    browserSessionId: link.browserSessionId,
  });
  session.newTrace();
  session.trackUserMessage(userLine(feature), {
    context: { feature, modelId },
  });

  let settled = false;
  return {
    async complete(record) {
      if (settled) return;
      settled = true;
      try {
        const latencyMs = Math.max(Date.now() - started, 1);
        session.trackAiMessage(
          responseText(record.content, record.isError),
          canonicalModelId(modelId),
          providerFor(modelId),
          latencyMs,
          {
            inputTokens: record.inputTokens,
            outputTokens: record.outputTokens,
            totalTokens: record.inputTokens + record.outputTokens,
            totalCostUsd: record.totalCostUsd,
            isError: record.isError,
            errorMessage: record.errorMessage,
          },
        );
        // Closes the session (Session End) and flushes on serverless.
        await session.run(() => undefined);
      } catch (error) {
        console.warn("Amplitude agent analytics failed to record", error);
      } finally {
        await flushClient(client);
      }
    },
  };
}
