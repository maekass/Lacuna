"""Outcome label builders for clinical trial ML."""

from __future__ import annotations

TERMINAL_FAILURE = frozenset({"TERMINATED", "WITHDRAWN", "SUSPENDED"})
TERMINAL_SUCCESS = frozenset({"COMPLETED"})
IN_FLIGHT = frozenset(
    {
        "RECRUITING",
        "ACTIVE_NOT_RECRUITING",
        "ENROLLING_BY_INVITATION",
        "NOT_YET_RECRUITING",
        "AVAILABLE",
    }
)


def normalize_status(status: str) -> str:
    return status.upper().replace(" ", "_")


def label_completed(status: str) -> int | None:
    """1 = COMPLETED, 0 = failed/stopped early, None = still active or unknown."""
    normalized = normalize_status(status)
    if normalized in TERMINAL_SUCCESS:
        return 1
    if normalized in TERMINAL_FAILURE:
        return 0
    return None


def label_terminated(status: str) -> int | None:
    """1 = terminated/withdrawn/suspended, 0 = completed or in-flight, None = unknown."""
    normalized = normalize_status(status)
    if normalized in TERMINAL_FAILURE:
        return 1
    if normalized in TERMINAL_SUCCESS or normalized in IN_FLIGHT:
        return 0
    return None
