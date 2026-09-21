"""Disclosed-only covariates. Stage is intentionally omitted (outcome leakage)."""

from __future__ import annotations

from typing import Final, Mapping

# Binary indicators vs the collapsed "other sectors" reference group.
# Only groups that typically clear the event-count floor are named here;
# the fitter still drops a column when that floor is missed on a given run.
SECTOR_FEATURES: Final[tuple[tuple[str, str], ...]] = (
    ("sector_fertility", "Fertility"),
    ("sector_diagnostics", "Diagnostics"),
)

FEATURE_NAMES: Final[tuple[str, ...]] = tuple(name for name, _ in SECTOR_FEATURES)

MIN_EVENTS_OVERALL: Final[int] = 20
MIN_EVENTS_PER_FEATURE: Final[int] = 8


def encode_sector(sector: str) -> list[float]:
    """Return the disclosed sector dummy row (reference = other sectors)."""
    return [1.0 if sector == label else 0.0 for _, label in SECTOR_FEATURES]


def encode_row(company: Mapping[str, object]) -> list[float] | None:
    """Encode a verified company, or None when sector is missing."""
    sector = company.get("sector")
    if not isinstance(sector, str) or not sector.strip():
        return None
    return encode_sector(sector)
