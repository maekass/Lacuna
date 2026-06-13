import { Router, type IRouter } from "express";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const workspaceRoot = process.cwd().endsWith("artifacts/api-server")
  ? resolve(process.cwd(), "../..")
  : process.cwd();

let _dataset: unknown = null;
function getDataset(): unknown {
  if (!_dataset) {
    try {
      const dataPath = resolve(workspaceRoot, "artifacts/lacuna/src/data/dataset.verified.json");
      _dataset = JSON.parse(readFileSync(dataPath, "utf-8"));
    } catch (err) {
      logger.error({ err }, "Failed to load dataset.verified.json");
      _dataset = { companies: [], acquisitions: [], acquirers: [] };
    }
  }
  return _dataset;
}

router.get("/dataset/verified", (req, res): void => {
  try {
    const dataset = getDataset() as Record<string, unknown[]>;

    const resourceParam = (req.query.resource as string) ?? "all";
    const sector = req.query.sector as string | undefined;
    const genomics = req.query.genomics === "true";

    let companies: unknown[] = dataset.companies ?? [];
    const acquisitions: unknown[] = dataset.acquisitions ?? [];
    const acquirers: unknown[] = dataset.acquirers ?? [];

    if (sector) {
      companies = companies.filter((c) =>
        ((c as Record<string, unknown>).sector as string)
          ?.toLowerCase()
          .includes(sector.toLowerCase()),
      );
    }
    if (genomics) {
      companies = companies.filter(
        (c) => (c as Record<string, unknown>).hasGenomicsData === true,
      );
    }

    let result: unknown;
    if (resourceParam === "companies") {
      result = { companies };
    } else if (resourceParam === "acquisitions") {
      result = { acquisitions };
    } else if (resourceParam === "acquirers") {
      result = { acquirers };
    } else {
      result = { companies, acquisitions, acquirers };
    }

    res.setHeader(
      "cache-control",
      "public, max-age=3600, stale-while-revalidate=86400",
    );
    res.json(result);
  } catch (err) {
    logger.error({ err }, "Dataset route error");
    res.status(500).json({ error: "Failed to load dataset" });
  }
});

export default router;
