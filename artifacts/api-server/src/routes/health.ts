import { Router, type IRouter } from "express";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { logger } from "../lib/logger";
import { HealthCheckResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const workspaceRoot = process.cwd().endsWith("artifacts/api-server")
  ? resolve(process.cwd(), "../..")
  : process.cwd();

function getDatasetCounts(): { companies: number; acquisitions: number; acquirers: number } {
  try {
    const dataPath = resolve(workspaceRoot, "artifacts/lacuna/src/data/dataset.verified.json");
    const data = JSON.parse(readFileSync(dataPath, "utf-8")) as {
      companies: unknown[]; acquisitions: unknown[]; acquirers: unknown[];
    };
    return {
      companies: data.companies?.length ?? 0,
      acquisitions: data.acquisitions?.length ?? 0,
      acquirers: data.acquirers?.length ?? 0,
    };
  } catch (err) {
    logger.warn({ err }, "Failed to read dataset for readiness check");
    return { companies: 0, acquisitions: 0, acquirers: 0 };
  }
}

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/health", (_req, res) => {
  res.setHeader("cache-control", "no-store");
  res.setHeader("x-lacuna-probe", "live");
  res.json({
    ok: true,
    service: "lacuna",
    probe: "live",
    timestamp: new Date().toISOString(),
  });
});

router.get("/health/ready", (_req, res) => {
  res.setHeader("cache-control", "no-store");
  res.setHeader("x-lacuna-probe", "ready");
  try {
    const counts = getDatasetCounts();
    const datasetOk = counts.acquisitions > 0;
    res.status(datasetOk ? 200 : 503).json({
      ok: datasetOk,
      service: "lacuna",
      probe: "ready",
      dataMode: "static",
      dataset: counts,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error({ err }, "Readiness check failed");
    res.status(503).json({
      ok: false,
      service: "lacuna",
      probe: "ready",
      error: err instanceof Error ? err.message : "readiness check failed",
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
