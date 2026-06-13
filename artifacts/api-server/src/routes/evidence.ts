/**
 * Evidence routes — /api/evidence/*
 * Proxies ClinicalTrials.gov and openFDA by company name for evidence maturity scoring.
 */
import { Router, type IRouter } from "express";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const CTG_API = "https://clinicaltrials.gov/api/v2";
const OPENFDA_BASE = "https://api.fda.gov";
const FETCH_TIMEOUT_MS = 10_000;

function clampInt(value: string | undefined, fallback: number, max: number): number {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(1, Math.floor(parsed)), max);
}

async function fetchWithTimeout(url: string, opts?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...opts, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

router.get("/evidence/clinical-trials", async (req, res): Promise<void> => {
  const company = req.query.company as string | undefined;
  if (!company) {
    res.status(400).json({ error: "company parameter required" });
    return;
  }

  try {
    const pageSize = clampInt(req.query.limit as string, 50, 100);
    const params = new URLSearchParams({
      "query.spons": company,
      pageSize: String(pageSize),
      sort: "LastUpdatePostDate:desc",
    });

    const response = await fetchWithTimeout(
      `${CTG_API}/studies?${params}`,
      { headers: { Accept: "application/json" } },
    );

    if (!response.ok) throw new Error(`CTG API ${response.status}`);

    const data = await response.json() as { studies?: unknown[] };
    const studies = (data.studies ?? []) as Array<Record<string, unknown>>;

    const phaseBreakdown: Record<string, number> = {};
    const statusBreakdown: Record<string, number> = {};
    let hasPostedResults = false;
    let totalEnrollment = 0;

    const trials = studies.map((s) => {
      const proto = (s.protocolSection ?? {}) as Record<string, unknown>;
      const design = (proto.designModule ?? {}) as Record<string, unknown>;
      const statusMod = (proto.statusModule ?? {}) as Record<string, unknown>;
      const idMod = (proto.identificationModule ?? {}) as Record<string, unknown>;
      const condMod = (proto.conditionsModule ?? {}) as Record<string, unknown>;
      const enrollInfo = (design.enrollmentInfo ?? {}) as Record<string, unknown>;
      const primaryCompl = (statusMod.primaryCompletionDateStruct ?? {}) as Record<string, unknown>;

      const phase = (design.phases as string[])?.[0] ?? "Not Applicable";
      const status = (statusMod.overallStatus as string) ?? "Unknown";
      const enrollment = (enrollInfo.count as number) ?? 0;
      const studyHasResults = (s.hasResults as boolean) ?? false;

      phaseBreakdown[phase] = (phaseBreakdown[phase] ?? 0) + 1;
      statusBreakdown[status] = (statusBreakdown[status] ?? 0) + 1;
      totalEnrollment += enrollment;
      if (studyHasResults) hasPostedResults = true;

      return {
        nctId: (idMod.nctId as string) ?? "",
        title: (idMod.briefTitle as string) ?? "",
        phase,
        status,
        enrollment,
        conditions: (condMod.conditions as string[]) ?? [],
        primaryCompletionDate: (primaryCompl.date as string) ?? undefined,
        hasResults: studyHasResults,
      };
    });

    const phaseOrder = ["PHASE3", "PHASE2", "PHASE1", "EARLY_PHASE1", "NA"];
    const highestPhase = phaseOrder.find((p) => phaseBreakdown[p]) ?? "None";

    res.setHeader("cache-control", "public, max-age=300, stale-while-revalidate=600");
    res.json({
      companyName: company,
      totalTrials: trials.length,
      highestPhase,
      phaseBreakdown,
      statusBreakdown,
      hasPostedResults,
      totalEnrollment,
      trials,
    });
  } catch (err) {
    logger.error({ err }, "Evidence CTG error");
    res.status(502).json({
      companyName: company,
      totalTrials: 0,
      trials: [],
      error: "CTG unavailable",
    });
  }
});

router.get("/evidence/fda", async (req, res): Promise<void> => {
  const company = req.query.company as string | undefined;
  if (!company) {
    res.status(400).json({ error: "company parameter required" });
    return;
  }

  try {
    const encoded = encodeURIComponent(`"${company}"`);

    const [deviceResp, drugResp] = await Promise.all([
      fetchWithTimeout(`${OPENFDA_BASE}/device/510k.json?search=applicant:${encoded}&limit=10`).catch(() => null),
      fetchWithTimeout(`${OPENFDA_BASE}/drug/drugsfda.json?search=sponsor_name:${encoded}&limit=10`).catch(() => null),
    ]);

    type DeviceResult = {
      k_number?: string; pma_number?: string;
      openfda?: { device_name?: string; device_class?: string };
      clearance_type?: string; decision_date?: string;
      advisory_committee_description?: string;
    };
    type DrugResult = {
      application_number?: string;
      openfda?: { brand_name?: string[]; generic_name?: string[] };
      products?: Array<{ marketing_status?: string }>;
      submissions?: Array<{ submission_type?: string; submission_status?: string; submission_status_date?: string }>;
    };

    const deviceData: ReturnType<typeof mapDevice>[] = [];
    const drugData: ReturnType<typeof mapDrug>[] = [];

    function mapDevice(r: DeviceResult) {
      return {
        number: r.k_number ?? r.pma_number ?? "",
        name: r.openfda?.device_name ?? "",
        clearanceType: r.clearance_type ?? "510(K)",
        deviceClass: r.openfda?.device_class ?? "",
        decisionDate: r.decision_date ?? "",
        advisoryCommittee: r.advisory_committee_description ?? "",
      };
    }
    function mapDrug(r: DrugResult) {
      const latestSub = r.submissions
        ?.filter((s) => s.submission_status === "AP")
        .sort((a, b) => (b.submission_status_date ?? "").localeCompare(a.submission_status_date ?? ""))[0];
      return {
        applicationNumber: r.application_number ?? "",
        brandName: r.openfda?.brand_name?.[0] ?? "",
        genericName: r.openfda?.generic_name?.[0] ?? "",
        submissionType: latestSub?.submission_type ?? "NDA",
        approvalDate: latestSub?.submission_status_date ?? "",
        marketingStatus: r.products?.[0]?.marketing_status ?? "",
      };
    }

    if (deviceResp?.ok) {
      const d = await deviceResp.json() as { results?: DeviceResult[] };
      for (const r of d.results ?? []) deviceData.push(mapDevice(r));
    }
    if (drugResp?.ok) {
      const d = await drugResp.json() as { results?: DrugResult[] };
      for (const r of d.results ?? []) drugData.push(mapDrug(r));
    }

    const clearanceRank: Record<string, number> = { PMA: 3, "DE NOVO": 2, "510(K)": 1 };
    const highestDeviceClearance = deviceData.reduce((best, d) => {
      const rank = clearanceRank[d.clearanceType.toUpperCase()] ?? 0;
      return rank > (clearanceRank[best.toUpperCase()] ?? 0) ? d.clearanceType : best;
    }, "None");

    res.setHeader("cache-control", "public, max-age=300, stale-while-revalidate=600");
    res.json({
      companyName: company,
      devices: deviceData,
      drugs: drugData,
      highestDeviceClearance,
      hasDrugApproval: drugData.length > 0,
      totalProducts: deviceData.length + drugData.length,
    });
  } catch (err) {
    logger.error({ err }, "openFDA evidence error");
    res.status(502).json({
      companyName: company,
      devices: [],
      drugs: [],
      totalProducts: 0,
      error: "openFDA unavailable",
    });
  }
});

export default router;
