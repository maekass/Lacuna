"""Disclosed-only design. Sector dummies and stage are both omitted."""

from __future__ import annotations

from typing import Final, Mapping

# Empty by design: sector dummy indicators (Fertility, Diagnostics, …) are not
# used. Stage is omitted because acquired labels leak the event.
FEATURE_NAMES: Final[tuple[str, ...]] = ()

MIN_EVENTS_OVERALL: Final[int] = 20
MIN_EVENTS_PER_FEATURE: Final[int] = 8


def encode_row(_company: Mapping[str, object]) -> list[float]:
    """Return the empty design row. No covariates are encoded."""
    return []
