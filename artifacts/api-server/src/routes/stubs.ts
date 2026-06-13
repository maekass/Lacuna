/**
 * Stub routes for endpoints that require external services not yet configured:
 * - /api/ingest/sec/status
 * - /api/ingest/free-apis/status
 * - /api/ai/insights
 * - /api/gamma/*
 * - /api/genomics/*
 */
import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.get("/ingest/sec/status", (_req, res) => {
  res.json({
    ok: false,
    error: "DATABASE_URL is not configured",
    docs: "/docs/SEC_INGESTION.md",
  });
});

router.get("/ingest/free-apis/status", (_req, res) => {
  res.json({
    ok: true,
    latest: null,
    message: "No export yet. Run: npm run download:free-apis",
    cli: "npm run download:free-apis",
    docs: "/docs/FREE_API_DOWNLOADS.md",
  });
});

router.get("/ai/insights", (_req, res) => {
  res.json({ configured: false });
});

router.post("/ai/insights", (_req, res) => {
  res.status(503).json({ error: "AI inference not configured." });
});

router.get("/gamma/status/:id", (_req, res) => {
  res.status(404).json({ error: "Gamma export not configured." });
});

router.post("/gamma/generate", (_req, res) => {
  res.status(503).json({ error: "Gamma export not configured." });
});

router.get("/genomics/callsets", (_req, res) => {
  res.status(503).json({
    error: "Variant store is not enabled. Set LACUNA_VARIANT_STORE=clickhouse and configure CLICKHOUSE_URL.",
    code: "VARIANT_STORE_DISABLED",
  });
});

router.get("/genomics/markers", (_req, res) => {
  res.status(503).json({
    error: "Variant store is not enabled.",
    code: "VARIANT_STORE_DISABLED",
  });
});

router.get("/genomics/variants", (_req, res) => {
  res.status(503).json({
    error: "Variant store is not enabled.",
    code: "VARIANT_STORE_DISABLED",
  });
});

export default router;
