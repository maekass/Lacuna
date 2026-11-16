"""Point-in-time featurizer for completion-proxy v4 (``4.0.0-logreg-pit``).

Dependency-free on purpose. An identical copy lives at
``services/python-api/app/completion_pit_features.py`` so the API can build v4
rows without importing the training package; a unit test fails if the copies
diverge, and another checks that these functions reproduce
``lacuna_ct.point_in_time`` on the same inputs.

A v4 row is ``[*completion_features.model_row(trial), *sponsor(3), *v0(5)]``:

- sponsor track record: other trials of the same normalized lead sponsor whose
  final status was public (``LastUpdatePostDate``) strictly before the anchor
  date ``min(start_date, first_submit_date)``. Looked up in a frozen index
  built from the training snapshot (``sponsor_history.json``).
- version-0 features: the record as first registered (planned enrollment,
  site count, initial status, planned duration, registration lead). Missing or
  terminal version 0 -> training-fit medians, as pre-registered in
  ``completion-decision-v1-addendum-1.json``.
"""

from __future__ import annotations

import math
import re
from bisect import bisect_left
from datetime import date
from typing import Any, Mapping, Sequence

FEATURIZER_VERSION = "completion-features-v4-pit"

SPONSOR_FEATURE_NAMES: tuple[str, ...] = (
    "sponsor_prior_trials_log1p",
    "sponsor_prior_stop_rate_smoothed",
    "sponsor_has_prior",
)
V0_FEATURE_NAMES: tuple[str, ...] = (
    "v0_enrollment_log10",
    "v0_site_count_log1p",
    "v0_not_yet_recruiting",
    "v0_planned_duration_months",
    "v0_registration_lead_months",
)
PIT_FEATURE_NAMES: tuple[str, ...] = (*SPONSOR_FEATURE_NAMES, *V0_FEATURE_NAMES)
TERMINAL_STATUSES = frozenset({"COMPLETED", "TERMINATED", "WITHDRAWN", "SUSPENDED"})
DAYS_PER_MONTH = 30.4375


def parse_date(value: str | None) -> date | None:
    """Parse ``YYYY``, ``YYYY-MM`` or ``YYYY-MM-DD`` (missing parts -> 1)."""
    if not value:
        return None
    match = re.fullmatch(r"(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?", str(value).strip())
    if not match:
        return None
    year, month, day = match.groups()
    try:
        return date(int(year), int(month or 1), int(day or 1))
    except ValueError:
        return None


def months_between(a: date | None, b: date | None) -> float | None:
    if a is None or b is None:
        return None
    return (b - a).days / DAYS_PER_MONTH


def _clip(value: float, low: float, high: float) -> float:
    return float(min(max(value, low), high))


def normalize_sponsor(name: str | None) -> str:
    return re.sub(r"\s+", " ", str(name or "").strip().lower())


def anchor_date(start: str | None, first_submit: str | None) -> date | None:
    dates = [d for d in (parse_date(start), parse_date(first_submit)) if d]
    return min(dates) if dates else None


def sponsor_features(n_prior: int, n_stopped: int, prior_stop_rate: float, alpha: float) -> list[float]:
    return [
        math.log1p(n_prior),
        (n_stopped + alpha * prior_stop_rate) / (n_prior + alpha),
        1.0 if n_prior > 0 else 0.0,
    ]


def v0_feature_row(v0: Mapping[str, Any] | None, medians: Sequence[float]) -> tuple[list[float], bool]:
    """Registration-time features; returns ``(row, usable)``."""
    if not v0 or str(v0.get("v0_status") or "").upper() in TERMINAL_STATUSES:
        return [float(m) for m in medians], False
    enroll = v0.get("v0_enrollment")
    duration = months_between(parse_date(v0.get("v0_start_date")), parse_date(v0.get("v0_completion_date")))
    lead = months_between(parse_date(v0.get("v0_first_submit_date")), parse_date(v0.get("v0_start_date")))
    raw = [
        math.log10(max(float(enroll), 1.0)) if enroll is not None else None,
        math.log1p(float(v0.get("v0_site_count") or 0)),
        1.0 if str(v0.get("v0_status") or "").upper() == "NOT_YET_RECRUITING" else 0.0,
        _clip(duration, -24, 240) if duration is not None else None,
        _clip(lead, -120, 60) if lead is not None else None,
    ]
    return [float(medians[i]) if v is None else float(v) for i, v in enumerate(raw)], True


class SponsorIndex:
    """Frozen sponsor outcome index: ``{sponsor: [[public_by_iso, stopped], ...]}``."""

    def __init__(self, payload: Mapping[str, Any]) -> None:
        self.prior_stop_rate = float(payload["prior_stop_rate"])
        self.alpha = float(payload["smoothing_alpha"])
        self.as_of = str(payload.get("as_of") or "")
        self._dates: dict[str, list[date]] = {}
        self._cum: dict[str, list[int]] = {}
        for sponsor, events in (payload.get("sponsors") or {}).items():
            pairs = sorted((parse_date(d), int(s)) for d, s in events)
            self._dates[sponsor] = [d for d, _ in pairs if d is not None]
            cum, total = [0], 0
            for d, s in pairs:
                if d is None:
                    continue
                total += s
                cum.append(total)
            self._cum[sponsor] = cum

    def counts(self, sponsor: str | None, anchor: date | None) -> tuple[int, int]:
        key = normalize_sponsor(sponsor)
        if anchor is None or key not in self._dates:
            return 0, 0
        cut = bisect_left(self._dates[key], anchor)  # strictly before the anchor
        return cut, self._cum[key][cut]

    def features(self, sponsor: str | None, anchor: date | None) -> tuple[list[float], int, int]:
        n, stopped = self.counts(sponsor, anchor)
        return sponsor_features(n, stopped, self.prior_stop_rate, self.alpha), n, stopped


def trial_v0(trial: Mapping[str, Any]) -> dict[str, Any] | None:
    """Map API ``registered_*`` inputs to a version-0 dict (None when absent)."""
    if not trial.get("registered_status"):
        return None
    return {
        "v0_status": trial.get("registered_status"),
        "v0_enrollment": trial.get("registered_enrollment"),
        "v0_site_count": trial.get("registered_site_count"),
        "v0_start_date": trial.get("registered_start_date"),
        "v0_completion_date": trial.get("registered_completion_date"),
        "v0_first_submit_date": trial.get("first_submit_date"),
    }


def pit_features(
    trial: Mapping[str, Any], index: SponsorIndex, v0_medians: Sequence[float]
) -> tuple[list[float], dict[str, Any]]:
    """Sponsor + version-0 features for one API request, plus an audit dict."""
    anchor = anchor_date(trial.get("start_date") or trial.get("registered_start_date"), trial.get("first_submit_date"))
    sponsor_row, n_prior, n_stopped = index.features(trial.get("sponsor"), anchor)
    v0_row, usable = v0_feature_row(trial_v0(trial), v0_medians)
    audit = {
        "anchor_date": anchor.isoformat() if anchor else None,
        "sponsor_prior_trials": n_prior,
        "sponsor_prior_stopped": n_stopped,
        "sponsor_index_as_of": index.as_of,
        "registration_features_imputed": not usable,
    }
    return [*sponsor_row, *v0_row], audit
