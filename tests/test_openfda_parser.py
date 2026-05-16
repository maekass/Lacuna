import json
from pathlib import Path

from src.data_collection.parsers.openfda import PARSER_VERSION, parse_label_results

FIXTURES = Path(__file__).parent / "fixtures"


def test_openfda_parser_version() -> None:
    assert "2026" in PARSER_VERSION


def test_parse_label_minimal() -> None:
    payload = json.loads((FIXTURES / "openfda_label_minimal.json").read_text(encoding="utf-8"))
    rows = parse_label_results(payload)
    assert len(rows) == 1
    assert rows[0]["drug_name"] == "Hydroxyurea"
    assert "Sickle cell" in rows[0]["efficacy"]
