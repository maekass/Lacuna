"""Numeric trial features for tabular + hybrid models."""

from __future__ import annotations

import math
from typing import Any

from lacuna_ct.constants import PHASE_TO_NUM

NUMERIC_FEATURE_NAMES: tuple[str, ...] = (
    "phase_num",
    "enrollment_log10",
)


def phase_to_num(phase: str) -> float:
    return PHASE_TO_NUM.get(phase, PHASE_TO_NUM.get(phase.upper(), 0.0))


def row_numeric_features(row: dict[str, Any]) -> list[float]:
    enrollment = int(row.get("enrollment") or 0)
    return [
        phase_to_num(str(row.get("phase") or "")),
        math.log10(max(enrollment, 1)),
    ]
