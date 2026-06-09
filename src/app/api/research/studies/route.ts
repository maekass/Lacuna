import { NextResponse } from "next/server";
import { parsePageParams } from "@/lib/api/pageParams";
import {
  computeStudySampleStats,
  filterDomesticStudies,
  STUDY_TRIAL_NCT_LINKS,
  type DomesticInstitution,
  type DomesticResearchStudy,
} from "@/lib/research/domesticStudyCatalog";
import {
  getStudyLinkageMap,
  isResearchStudyDbSeeded,
} from "@/lib/research/studyLinkage";

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

/** Attach Postgres linkage when seeded; otherwise use static catalog hints. */
async function enrichStudiesWithLinkage(
  studies: DomesticResearchStudy[],
): Promise<StudyWithLinkage[]> {
  if (!process.env.DATABASE_URL) {
    return studies.map((study) => ({
      ...study,
      nctIds: [...(STUDY_TRIAL_NCT_LINKS[study.studyId] ?? [])],
      linkedCallsetIds: study.variantCallsetId ? [study.variantCallsetId] : [],
    }));
  }

  try {
    const seeded = await isResearchStudyDbSeeded();
    if (!seeded) {
      return studies.map((study) => ({
        ...study,
        nctIds: [...(STUDY_TRIAL_NCT_LINKS[study.studyId] ?? [])],
        linkedCallsetIds: study.variantCallsetId ? [study.variantCallsetId] : [],
      }));
    }

    const linkage = await getStudyLinkageMap(studies.map((s) => s.studyId));
    return studies.map((study) => {
      const bundle = linkage.get(study.studyId);
      return {
        ...study,
        nctIds: bundle?.nctIds ?? [],
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

    const page = filterDomesticStudies({
      institution,
      condition,
      limit,
      offset,
    });
    const stats = computeStudySampleStats();
    const studies = await enrichStudiesWithLinkage(page.studies);

    return NextResponse.json(
      {
        ...page,
        studies,
        stats,
        disclaimer:
          "Static cited catalog — not live enrollment. See source field per study.",
      },
      { headers: { "cache-control": "public, max-age=3600" } },
    );
  } catch (error) {
    console.error("research studies error:", error);
    return NextResponse.json({ error: "Failed to load study catalog" }, {
      status: 500,
    });
  }
}
