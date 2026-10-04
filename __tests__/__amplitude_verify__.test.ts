import {
  AIConfig,
  PROP_COST_USD,
  PROP_INPUT_TOKENS,
  PROP_LATENCY_MS,
  PROP_MODEL_NAME,
  PROP_OUTPUT_TOKENS,
  PROP_PROVIDER,
  PROP_SESSION_ID,
} from "@amplitude/ai";
import { MockAmplitudeAI } from "@amplitude/ai/testing";
import { describe, expect, it } from "vitest";
import { LACUNA_AGENTS, openAgentTurn } from "@/lib/ai/agentAnalytics";

const VERIFY_USER = "lacuna-verify-user";

describe("Amplitude agent analytics", () => {
  it("records a closed session with a priced AI response for each agent", async () => {
    const mock = new MockAmplitudeAI(new AIConfig({ contentMode: "full" }));

    for (const agentId of Object.keys(LACUNA_AGENTS)) {
      const sessionId = `verify-${agentId}`;
      const agent = mock.agent(agentId, { userId: VERIFY_USER });
      await agent.session({ sessionId, userId: VERIFY_USER }).run((s) => {
        s.trackUserMessage("Summarize the verified women's health deal");
        s.trackAiMessage(
          "Grounded summary from the verified dataset.",
          "gpt-4o-mini",
          "openai",
          150,
          { inputTokens: 42, outputTokens: 96 },
        );
      });

      mock.assertEventTracked("[Agent] User Message", { userId: VERIFY_USER });
      mock.assertSessionClosed(sessionId);
      expect(mock.eventsForAgent(agentId).length).toBeGreaterThan(0);
    }

    const aiEvents = mock.getEvents("[Agent] AI Response");
    expect(aiEvents.length).toBe(Object.keys(LACUNA_AGENTS).length);
    for (const event of aiEvents) {
      const properties = event.event_properties ?? {};
      expect(event.user_id || event.device_id).toBeTruthy();
      expect(properties[PROP_SESSION_ID]).toBeTruthy();
      expect(properties[PROP_MODEL_NAME]).toBe("gpt-4o-mini");
      expect(properties[PROP_PROVIDER]).toBe("openai");
      expect(properties[PROP_LATENCY_MS]).toBeGreaterThan(0);
      expect(properties[PROP_INPUT_TOKENS]).toBeGreaterThan(0);
      expect(properties[PROP_OUTPUT_TOKENS]).toBeGreaterThan(0);
      expect(properties[PROP_COST_USD]).toBeDefined();
    }
  });

  it("runs inference tracking as a no-op when the API key is unset", async () => {
    const previous = process.env.AMPLITUDE_AI_API_KEY;
    delete process.env.AMPLITUDE_AI_API_KEY;
    try {
      const turn = await openAgentTurn("ui-insights", "gpt-4o-mini");
      await turn.complete({
        content: "not sent",
        inputTokens: 4,
        outputTokens: 8,
        totalCostUsd: 0,
      });
    } finally {
      if (previous === undefined) delete process.env.AMPLITUDE_AI_API_KEY;
      else process.env.AMPLITUDE_AI_API_KEY = previous;
    }
  });
});
