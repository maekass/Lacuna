import process from "node:process";
import { NextResponse } from "next/server";
import { parsePageParams } from "@/lib/api/pageParams";
import type { DomesticInstitution } from "@/lib/research/domesticStudyCatalog";
import type { DomesticResearchStudy } from "@/lib/research/domesticStudyCatalog";
import { getResearchStudyPage } from "@/lib/research/researchStudyProvider";
import { getStudyLinkageMap } from "@/lib/research/studyLinkage";
import { STUDY_TRIAL_NCT_LINKS } from "@/lib/research/domesticStudyCatalog";

const VALID_INSTITUTIONS = new Set<DomesticInstitution>([
  "nih",
  "harvard",
  "mit",
  "harvard_mit_collab",
]);

type StudyWithLinkage = DomesticResearchStudy & {
  nctIds: string[];
  linkedCallsetIds: string[];
};

/** Attach trial and callset links from Postgres linkage tables. */
async function enrichStudiesWithLinkage(
  studies: DomesticResearchStudy[],
  dataMode: "static" | "db",
): Promise<StudyWithLinkage[]> {
  if (dataMode === "static" || !process.env.DATABASE_URL) {
    return studies.map((study) => ({
      ...study,
      nctIds: [...(STUDY_TRIAL_NCT_LINKS[study.studyId] ?? [])],
      linkedCallsetIds: study.variantCallsetId ? [study.variantCallsetId] : [],
    }));
  }

  try {
    const linkage = await getStudyLinkageMap(studies.map((s) => s.studyId));
    return studies.map((study) => {
      const bundle = linkage.get(study.studyId);
      return {
        ...study,
        nctIds: bundle?.nctIds ??
          [...(STUDY_TRIAL_NCT_LINKS[study.studyId] ?? [])],
        linkedCallsetIds: bundle?.callsetIds ??
          (study.variantCallsetId ? [study.variantCallsetId] : []),
      };
    });
  } catch (error) {
    console.error("research study linkage fallback:", error);
    return studies.map((study) => ({
      ...study,
      nctIds: [...(STUDY_TRIAL_NCT_LINKS[study.studyId] ?? [])],
      linkedCallsetIds: study.variantCallsetId ? [study.variantCallsetId] : [],
    }));
  }
}

/** Curated domestic study catalog with published sample sizes (NIH, Harvard, MIT). */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { limit, offset } = parsePageParams(url.searchParams, {
      defaultLimit: 25,
      maxLimit: 100,
    });
    const institutionRaw = url.searchParams.get("institution")?.trim()
      .toLowerCase();
    const condition = url.searchParams.get("condition")?.trim() ?? undefined;

    const institution = institutionRaw &&
        VALID_INSTITUTIONS.has(institutionRaw as DomesticInstitution)
      ? (institutionRaw as DomesticInstitution)
      : undefined;

    const page = await getResearchStudyPage({
      institution,
      condition,
      limit,
      offset,
    });
    const studies = await enrichStudiesWithLinkage(page.studies, page.dataMode);

    return NextResponse.json(
      {
        studies,
        meta: page.meta,
        stats: page.stats,
        dataMode: page.dataMode,
        disclaimer: page.dataMode === "db"
          ? "Postgres-backed catalog — run npm run db:seed-research after migrate. Not live enrollment."
          : "Static cited catalog — not live enrollment. See source field per study.",
      },
      {
        headers: {
          "cache-control": page.dataMode === "db"
            ? "private, max-age=300"
            : "public, max-age=3600",
        },
      },
    );
  } catch (error) {
    console.error("research studies error:", error);
    return NextResponse.json({ error: "Failed to load study catalog" }, {
      status: 500,
    });
  }
}
