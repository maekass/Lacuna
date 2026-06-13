/**
 * Stub routes for endpoints that require external services not yet configured:
 * - /api/ingest/sec/status — requires DATABASE_URL
 * - /api/ingest/free-apis/status — requires CLI download step
 * - /api/genomics/* — requires LACUNA_VARIANT_STORE=clickhouse + CLICKHOUSE_URL
 *
 * Note: /api/ai/insights and /api/gamma/* are now handled by ai.ts and gamma.ts
 * with proper configuration gating (not stubs).
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
