/**
 * Gamma API proxy — /api/gamma/*
 * Proxies to https://public-api.gamma.app/v1.0
 * Client provides their own Gamma API key — never stored server-side.
 */
import { Router, type IRouter } from "express";
import { logger } from "../lib/logger";

const router: IRouter = Router();
const GAMMA_API_BASE = "https://public-api.gamma.app/v1.0";
const FETCH_TIMEOUT_MS = 30_000;

async function gammFetch(url: string, opts?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...opts, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

router.post("/gamma/generate", async (req, res): Promise<void> => {
  try {
    const body = req.body as Record<string, unknown>;

    if (!body.apiKey || typeof body.apiKey !== "string") {
      res.status(400).json({ error: "Gamma API key is required" });
      return;
    }

    if (!body.inputText || typeof body.inputText !== "string" || body.inputText.length < 1) {
      res.status(400).json({ error: "inputText is required" });
      return;
    }

    const { apiKey, ...generationParams } = body;

    const response = await gammFetch(`${GAMMA_API_BASE}/generations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey as string,
      },
      body: JSON.stringify(generationParams),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errBody = errorData as { message?: string };
      res.status(response.status).json({
        error: errBody.message ?? `Gamma API error: ${response.status}`,
        details: errorData,
      });
      return;
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    logger.error({ err }, "Gamma generation error");
    res.status(500).json({ error: "Failed to start Gamma generation" });
  }
});

router.get("/gamma/status/:id", async (req, res): Promise<void> => {
  const { id } = req.params;
  const apiKey = req.headers["x-gamma-key"] as string | undefined;

  if (!apiKey) {
    res.status(400).json({ error: "x-gamma-key header is required" });
    return;
  }

  try {
    const response = await gammFetch(`${GAMMA_API_BASE}/generations/${id}`, {
      headers: { "X-API-KEY": apiKey },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errBody = errorData as { message?: string };
      res.status(response.status).json({
        error: errBody.message ?? `Gamma API error: ${response.status}`,
        details: errorData,
      });
      return;
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    logger.error({ err }, "Gamma status poll error");
    res.status(500).json({ error: "Failed to poll Gamma generation status" });
  }
});

export default router;
