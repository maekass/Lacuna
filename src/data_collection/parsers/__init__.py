"""API response parsers with versioned extractors for regression testing."""

from src.data_collection.parsers.clinical_trials import (
    PARSER_VERSION,
    parse_legacy_full_studies,
    parse_v2_studies,
)
from src.data_collection.parsers.openfda import PARSER_VERSION as OPENFDA_PARSER_VERSION
from src.data_collection.parsers.openfda import fetch_labels_for_query, parse_label_results

__all__ = [
    "PARSER_VERSION",
    "OPENFDA_PARSER_VERSION",
    "parse_legacy_full_studies",
    "parse_v2_studies",
    "parse_label_results",
    "fetch_labels_for_query",
]
