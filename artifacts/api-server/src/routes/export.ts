/**
 * Export routes — /api/export/*
 * Serves the verified deal dataset as downloadable CSV.
 */
import { Router, type IRouter } from "express";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const workspaceRoot = process.cwd().endsWith("artifacts/api-server")
  ? resolve(process.cwd(), "../..")
  : process.cwd();

function csvEscape(value: string): string {
  const raw = value ?? "";
  const needsNeutralize = /^[=+\-@]/.test(raw);
  const safe = needsNeutralize ? `'${raw}` : raw;
  const escaped = safe.replace(/"/g, '""');
  return `"${escaped}"`;
}

router.get("/export/deals.csv", (_req, res): void => {
  try {
    const dataPath = resolve(workspaceRoot, "artifacts/lacuna/src/data/dataset.verified.json");
    const dataset = JSON.parse(readFileSync(dataPath, "utf-8")) as {
      acquisitions: Array<{
        id: string;
        announcedDate: string;
        closedDate?: string;
        dealType: string;
        targetName: string;
        acquirerName: string;
        dealValue?: number;
        dealValueNote?: string;
        source?: string;
        strategicRationale: string;
      }>;
    };

    const header = [
      "id",
      "announcedDate",
      "closedDate",
      "dealType",
      "targetName",
      "acquirerName",
      "dealValue_millions",
      "dealValueNote",
      "source",
      "strategicRationale",
    ];

    const rows = dataset.acquisitions.map((d) => [
      d.id,
      d.announcedDate,
      d.closedDate ?? "",
      d.dealType,
      d.targetName,
      d.acquirerName,
      typeof d.dealValue === "number" ? String(d.dealValue) : "",
      d.dealValueNote ?? "",
      d.source ?? "",
      d.strategicRationale,
    ]);

    const csv = [header, ...rows]
      .map((r) => r.map((v) => csvEscape(v)).join(","))
      .join("\n");

    res.setHeader("content-type", "text/csv; charset=utf-8");
    res.setHeader("content-disposition", 'attachment; filename="lacuna-deals.csv"');
    res.setHeader("cache-control", "public, max-age=60");
    res.send(csv);
  } catch (err) {
    logger.error({ err }, "Export CSV error");
    res.status(500).json({ error: "Failed to generate CSV export" });
  }
});

router.get("/docs", (_req, res): void => {
  res.json({
    title: "Lacuna API — Documentation",
    version: "v6",
    description: "Lacuna Women's Health M&A Diligence Stack — public API reference",
    endpoints: {
      "GET /api/health": "Service health check",
      "GET /api/clinical-trials": "Search ClinicalTrials.gov (params: condition, sponsor, phase, status, limit)",
      "GET /api/research/studies": "Domestic research study catalog",
      "GET /api/dataset/verified": "Full verified M&A dataset JSON (params: resource, sector, genomics)",
      "GET /api/evidence/clinical-trials": "Evidence CTG lookup by company (param: company)",
      "GET /api/evidence/fda": "Evidence openFDA lookup by company (param: company)",
      "GET /api/export/deals.csv": "Download all verified deals as CSV",
    },
    source: "https://github.com/maekass/Lacuna",
    license: "BUSL 1.1",
  });
});

export default router;
