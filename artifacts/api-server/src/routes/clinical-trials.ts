import { Router, type IRouter } from "express";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const CLINICAL_TRIALS_API_BASE = "https://clinicaltrials.gov/api/v2";
const DEFAULT_TRIAL_LIMIT = 10;
const MAX_TRIAL_LIMIT = 100;

function clampInt(value: string | null, fallback: number, max: number): number {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(1, Math.floor(parsed)), max);
}

router.get("/clinical-trials", async (req, res) => {
  const condition = (req.query.condition as string) || "";
  const sponsor = (req.query.sponsor as string) || "";
  const phase = (req.query.phase as string) || "";
  const status = (req.query.status as string) || "";
  const limit = clampInt(req.query.limit as string, DEFAULT_TRIAL_LIMIT, MAX_TRIAL_LIMIT);

  try {
    const params = new URLSearchParams();
    if (condition) params.append("query.cond", condition);
    if (sponsor) params.append("query.spons", sponsor);
    if (phase) params.append("filter.phase", phase);
    if (status) params.append("filter.status", status);
    params.append("pageSize", limit.toString());
    params.append("sort", "LastUpdatePostDate:desc");

    const response = await fetch(
      `${CLINICAL_TRIALS_API_BASE}/studies?${params.toString()}`,
      { headers: { Accept: "application/json" } },
    );

    if (!response.ok) {
      throw new Error(`ClinicalTrials.gov API error: ${response.status}`);
    }

    const data = await response.json() as { studies?: unknown[]; totalCount?: number };

    const trials = (data.studies ?? []).map((study: unknown) => {
      try {
        const s = study as Record<string, unknown>;
        const protocol = (s.protocolSection ?? {}) as Record<string, unknown>;
        const statusMod = (protocol.statusModule ?? {}) as Record<string, unknown>;
        const identification = (protocol.identificationModule ?? {}) as Record<string, unknown>;
        const sponsorMod = (protocol.sponsorCollaboratorsModule ?? {}) as Record<string, unknown>;
        const design = (protocol.designModule ?? {}) as Record<string, unknown>;
        const arms = (protocol.armsInterventionsModule ?? {}) as Record<string, unknown>;
        const contacts = (protocol.contactsLocationsModule ?? {}) as Record<string, unknown>;
        const leadSponsor = (sponsorMod.leadSponsor ?? {}) as Record<string, unknown>;
        const enrollmentInfo = (design.enrollmentInfo ?? {}) as Record<string, unknown>;
        const startDateStruct = (statusMod.startDateStruct ?? {}) as Record<string, unknown>;
        const completionDateStruct = (statusMod.completionDateStruct ?? {}) as Record<string, unknown>;

        return {
          nctId: identification.nctId ?? "",
          title: identification.briefTitle ?? "",
          phase: (design.phases as string[])?.[0] ?? "Not Applicable",
          status: statusMod.overallStatus ?? "Unknown",
          condition: ((protocol.conditionsModule as Record<string, unknown>)?.conditions as string[] ?? []).join(", "),
          sponsor: leadSponsor.name ?? "Unknown",
          enrollment: (enrollmentInfo.count as number) ?? 0,
          startDate: startDateStruct.date ?? "",
          completionDate: completionDateStruct.date,
          locations: ((contacts.locations as unknown[]) ?? []).map((loc: unknown) => {
            const l = loc as Record<string, unknown>;
            const fac = (l.facility ?? {}) as Record<string, unknown>;
            const addr = (fac.address ?? {}) as Record<string, unknown>;
            return `${fac.name ?? ""}, ${addr.city ?? ""}`;
          }).filter(Boolean),
          interventions: ((arms.interventions as unknown[]) ?? []).map((int: unknown) => {
            return ((int as Record<string, unknown>).name as string) ?? "";
          }).filter(Boolean),
        };
      } catch {
        return null;
      }
    }).filter(Boolean);

    res.setHeader("cache-control", "public, max-age=300, stale-while-revalidate=600");
    res.json({ trials, total: data.totalCount ?? trials.length, query: { condition, sponsor, phase, status } });
  } catch (err) {
    logger.error({ err }, "ClinicalTrials.gov API error");
    res.status(503).json({ error: "ClinicalTrials.gov is currently unavailable. Try again later." });
  }
});

export default router;
