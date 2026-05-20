"""
Write CSVs with schema validation and provenance recording on every pull.
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd

from src.data_collection.csv_schemas import validate_dataframe
from src.data_collection.provenance import PullRecord, ProvenanceStore


def write_csv(
    df: pd.DataFrame,
    path: str | Path,
    *,
    artifact: str | None = None,
    pull: PullRecord | None = None,
    provenance_store: ProvenanceStore | None = None,
    enrich_ontology: bool = True,
) -> Path:
    """
    Validate schema, optionally enrich ontology columns, write CSV, record provenance.
    """
    path = Path(path)
    artifact = artifact or path.name
    df_out = df.copy()

    if enrich_ontology:
        from src.ontology.enrich import enrich_artifact

        df_out = enrich_artifact(artifact, df_out)

    validate_dataframe(df_out, artifact)
    path.parent.mkdir(parents=True, exist_ok=True)
    df_out.to_csv(path, index=False)

    if pull is not None:
        pull.artifact = artifact
        pull.row_count = len(df_out)
        store = provenance_store or ProvenanceStore(path.parent)
        store.record(pull)

    return path
