import json
from pathlib import Path

from src.data_collection.parsers.orphanet_search import (
    PARSER_VERSION,
    parse_orphanet_index,
    search_orphanet_index,
)

FIXTURES = Path(__file__).parent / "fixtures"


def test_orphanet_search_parser_version() -> None:
    assert "2026" in PARSER_VERSION


def test_search_index_substring() -> None:
    payload = json.loads((FIXTURES / "orphanet_index_minimal.json").read_text(encoding="utf-8"))
    index = parse_orphanet_index(payload)
    hits = search_orphanet_index(index, "lupus")
    terms = [h["preferred_term"] for h in hits]
    assert "Systemic lupus erythematosus" in terms


def test_search_index_limit() -> None:
    payload = json.loads((FIXTURES / "orphanet_index_minimal.json").read_text(encoding="utf-8"))
    index = parse_orphanet_index(payload)
    assert len(search_orphanet_index(index, "a", limit=2)) <= 2
