"""Fetch selected primary sources for the council-to-career synthesis."""
import pplx_sdk

import os
ROOT = os.path.dirname(os.path.abspath(__file__))
SHA = "5bddc415dfd57bd5bf1c417ed7d9e5c59040c7a3"
URLS = [
    f"https://github.com/maekass/Lacuna/blob/{SHA}/src/components/ExitPredictor.tsx",
    f"https://github.com/maekass/Lacuna/blob/{SHA}/src/components/CompanySimilarity.tsx",
    f"https://github.com/maekass/Lacuna/blob/{SHA}/src/lib/data/lacunaDataset/samplingFrame.ts",
    f"https://github.com/maekass/Lacuna/blob/{SHA}/docs/MODEL_CARD.md",
    f"https://github.com/maekass/Lacuna/blob/{SHA}/docs/plans/ct-effectiveness-labels.md",
    f"https://github.com/maekass/Lacuna/blob/{SHA}/docs/AI_ORCHESTRATION_MESH_IC.md",
    "https://go.bio.org/rs/490-EHZ-999/images/ClinicalDevelopmentSuccessRates2011_2020.pdf",
    "https://r.jordan.im/download/research/wong2019.pdf",
]

pages = pplx_sdk.content.fetch(
    URLS,
    prompt=(
        "For code: extract exact actual behavior and caveats relevant to "
        "acquisition scores, confidence, cosine feature count and acquired flag, "
        "sampling frames, or clinical endpoint label plans. Distinguish plan "
        "from implementation. For clinical success-rate papers: extract study "
        "period, unit of analysis, data vendor, phase II to III success definition "
        "and rate. Do not attribute differences between studies solely to method."
    ),
)
rows = [dict(page) for page in pages]
output = f"{ROOT}/verified_sources.jsonl"
pplx_sdk.utils.write_jsonl(output, rows)
pplx_sdk.utils.print_preview_jsonl(output, limit=8, max_chars=2400)
print(f"{output}\nFetched {len(rows)} selected sources.")
