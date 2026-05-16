import json
from pathlib import Path

from src.data_collection.parsers.cdc_nndss import (
    PARSER_VERSION,
    parse_nndss_labels,
    search_nndss_index,
)

FIXTURES = Path(__file__).parent / "fixtures"


def test_cdc_nndss_parser_version() -> None:
    assert "2026" in PARSER_VERSION


def test_parse_nndss_labels() -> None:
    payload = json.loads((FIXTURES / "cdc_nndss_labels_minimal.json").read_text(encoding="utf-8"))
    rows = parse_nndss_labels(payload)
    assert len(rows) == 4
    assert rows[0]["cdc_label"] == "Anthrax"
    assert rows[0]["source"] == "cdc_nndss"


def test_search_nndss_index() -> None:
    payload = json.loads((FIXTURES / "cdc_nndss_labels_minimal.json").read_text(encoding="utf-8"))
    index = parse_nndss_labels(payload)
    hits = search_nndss_index(index, "hepatitis")
    assert any(h["cdc_label"].startswith("Hepatitis") for h in hits)
