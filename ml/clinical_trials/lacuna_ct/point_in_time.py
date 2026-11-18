"""Point-in-time features for the completion-proxy decision model (v4 candidate).

Two sources were planned (see ``preregistration/completion-decision-v1.json``):

1. **ClinicalTrials.gov version history** (first-registered enrollment, start
   slips, amendment count, site count, recruitment-status changes). The
   official API v2 has no history endpoint. The website's internal endpoint
   ``/api/int/studies/{nct}/history`` exists but answers HTTP 403 to scripted
   clients from this environment. ``probe_history_api`` records that result;
   these features are omitted rather than reconstructed from the current
   record (which would reintroduce leakage: current site counts and
   enrollment are overwritten after a trial stops).

2. **Sponsor track record**, built only from trials whose final status was
   public strictly before the target trial's anchor date
   ``min(StartDate, StudyFirstSubmitDate)``. ``LastUpdatePostDate`` is used as
   the conservative "outcome public by" date for the other trials.

Date fields come from a supplementary CT.gov API v2 fetch keyed by NCT id
(``fetch_supplement``) and are frozen with their own provenance hash.
"""

from __future__ import annotations

import hashlib
import json
import math
import re
import time
from bisect import bisect_left
from collections import Counter
from dataclasses import dataclass
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any, Iterable, Mapping, Sequence

import numpy as np

CTG_STUDIES = "https://clinicaltrials.gov/api/v2/studies"
HISTORY_PROBE_URLS = (
    "https://clinicaltrials.gov/api/v2/studies/{nct}/history",
    "https://clinicaltrials.gov/api/int/studies/{nct}/history",
    "https://clinicaltrials.gov/api/int/studies/{nct}?history=true",
)
SUPPLEMENT_FIELDS = (
    "NCTId,OverallStatus,StartDate,StudyFirstSubmitDate,LastUpdatePostDate,CompletionDate"
)
SPONSOR_FEATURE_NAMES: tuple[str, ...] = (
    "sponsor_prior_trials_log1p",
    "sponsor_prior_stop_rate_smoothed",
    "sponsor_has_prior",
)
SMOOTHING_ALPHA = 5.0
MIN_FOLLOW_UP_MONTHS = 24


# --------------------------------------------------------------------------- #
# Dates
# --------------------------------------------------------------------------- #


def parse_ctgov_date(value: str | None) -> date | None:
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


def add_months(value: date, months: int) -> date:
    total = value.month - 1 + months
    year, month = value.year + total // 12, total % 12 + 1
    days = [31, 29 if year % 4 == 0 and (year % 100 or year % 400 == 0) else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    return date(year, month, min(value.day, days[month - 1]))


def passes_min_follow_up(
    start: date | None, reference: date, months: int = MIN_FOLLOW_UP_MONTHS
) -> bool:
    """Minimum follow-up label filter: start + ``months`` <= reference date."""
    return start is not None and add_months(start, months) <= reference


# --------------------------------------------------------------------------- #
# Supplement fetch (official API v2 only)
# --------------------------------------------------------------------------- #


def parse_supplement_study(study: Mapping[str, Any]) -> dict[str, Any]:
    protocol = study.get("protocolSection") or {}
    status = protocol.get("statusModule") or {}
    ident = protocol.get("identificationModule") or {}
    return {
        "nct_id": ident.get("nctId", ""),
        "overall_status_at_fetch": status.get("overallStatus"),
        "start_date": (status.get("startDateStruct") or {}).get("date"),
        "study_first_submit_date": status.get("studyFirstSubmitDate"),
        "last_update_post_date": (status.get("lastUpdatePostDateStruct") or {}).get("date"),
        "completion_date": (status.get("completionDateStruct") or {}).get("date"),
    }


def fetch_supplement(
    nct_ids: Sequence[str],
    *,
    batch_size: int = 200,
    delay_s: float = 0.4,
    client: Any = None,
    user_agent: str = "Lacuna-ML-Research/1.0 (educational; mps5cy@virginia.edu)",
) -> dict[str, dict[str, Any]]:
    import httpx

    own = client is None
    client = client or httpx.Client(timeout=60.0, follow_redirects=True)
    out: dict[str, dict[str, Any]] = {}
    try:
        ids = sorted(set(nct_ids))
        for start in range(0, len(ids), batch_size):
            batch = ids[start : start + batch_size]
            response = client.get(
                CTG_STUDIES,
                params={
                    "filter.ids": ",".join(batch),
                    "fields": SUPPLEMENT_FIELDS,
                    "pageSize": "1000",
                },
                headers={"Accept": "application/json", "User-Agent": user_agent},
            )
            response.raise_for_status()
            for study in response.json().get("studies") or []:
                row = parse_supplement_study(study)
                if row["nct_id"]:
                    out[row["nct_id"]] = row
            time.sleep(delay_s)
    finally:
        if own:
            client.close()
    return out


def probe_history_api(nct_id: str = "NCT04280705", client: Any = None) -> dict[str, Any]:
    """Record whether a version-history endpoint is reachable (no retries)."""
    import httpx

    own = client is None
    client = client or httpx.Client(timeout=30.0, follow_redirects=True)
    attempts = []
    try:
        for template in HISTORY_PROBE_URLS:
            url = template.format(nct=nct_id)
            try:
                response = client.get(
                    url,
                    headers={
                        "Accept": "application/json",
                        "User-Agent": "Lacuna-ML-Research/1.0 (educational; mps5cy@virginia.edu)",
                    },
                )
                ok = response.status_code == 200 and response.headers.get(
                    "content-type", ""
                ).startswith("application/json")
                attempts.append({"url": url, "status_code": response.status_code, "json": ok})
            except Exception as exc:  # network errors are recorded, not raised
                attempts.append({"url": url, "error": type(exc).__name__})
    finally:
        if own:
            client.close()
    return {
        "probed_at_utc": datetime.now(timezone.utc).isoformat(),
        "nct_id": nct_id,
        "attempts": attempts,
        "reachable": any(a.get("json") for a in attempts),
    }


def sha256_bytes(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def write_frozen(path: Path, rows: Any, meta: dict[str, Any]) -> dict[str, Any]:
    path.parent.mkdir(parents=True, exist_ok=True)
    body = json.dumps(rows, indent=1, sort_keys=True).encode("utf-8")
    path.write_bytes(body)
    meta = {**meta, "file": path.name, "file_sha256": sha256_bytes(body)}
    path.with_suffix(".meta.json").write_text(
        json.dumps(meta, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    return meta


def load_frozen(path: Path) -> tuple[Any, dict[str, Any]]:
    body = path.read_bytes()
    meta = json.loads(path.with_suffix(".meta.json").read_text(encoding="utf-8"))
    if sha256_bytes(body) != meta.get("file_sha256"):
        raise ValueError(f"Frozen file hash mismatch for {path}")
    return json.loads(body), meta


# --------------------------------------------------------------------------- #
# Sponsor track record
# --------------------------------------------------------------------------- #


def normalize_sponsor(name: str | None) -> str:
    return re.sub(r"\s+", " ", str(name or "").strip().lower())


def anchor_date(start: str | None, first_submit: str | None) -> date | None:
    dates = [d for d in (parse_ctgov_date(start), parse_ctgov_date(first_submit)) if d]
    return min(dates) if dates else None


@dataclass(frozen=True)
class SponsorOutcome:
    nct_id: str
    sponsor: str
    public_by: date
    stopped: int  # 1 = TERMINATED/WITHDRAWN/SUSPENDED, 0 = COMPLETED


class SponsorHistory:
    """Index of sponsor outcomes ordered by the date they were public."""

    def __init__(self, outcomes: Iterable[SponsorOutcome]) -> None:
        by_sponsor: dict[str, list[SponsorOutcome]] = {}
        for item in outcomes:
            by_sponsor.setdefault(item.sponsor, []).append(item)
        self._dates: dict[str, list[date]] = {}
        self._cum_stopped: dict[str, list[int]] = {}
        self._ids: dict[str, list[str]] = {}
        for sponsor, items in by_sponsor.items():
            items.sort(key=lambda o: (o.public_by, o.nct_id))
            self._dates[sponsor] = [o.public_by for o in items]
            self._ids[sponsor] = [o.nct_id for o in items]
            cum, total = [0], 0
            for o in items:
                total += o.stopped
                cum.append(total)
            self._cum_stopped[sponsor] = cum

    def counts(self, sponsor: str, anchor: date | None, exclude_nct: str) -> tuple[int, int]:
        """(n_prior, n_prior_stopped) for outcomes public strictly before ``anchor``."""
        if anchor is None or sponsor not in self._dates:
            return 0, 0
        cut = bisect_left(self._dates[sponsor], anchor)  # strictly before anchor
        n, stopped = cut, self._cum_stopped[sponsor][cut]
        ids = self._ids[sponsor][:cut]
        if exclude_nct in ids:  # cannot happen when anchor <= own public date, kept as a guard
            i = ids.index(exclude_nct)
            n -= 1
            stopped -= self._cum_stopped[sponsor][i + 1] - self._cum_stopped[sponsor][i]
        return n, stopped


def build_sponsor_history(
    records: Iterable[Any], supplement: Mapping[str, Mapping[str, Any]]
) -> SponsorHistory:
    outcomes = []
    for r in records:
        label = getattr(r, "label_completed", None)
        sup = supplement.get(r.nct_id) or {}
        public_by = parse_ctgov_date(sup.get("last_update_post_date"))
        if label is None or public_by is None:
            continue
        outcomes.append(
            SponsorOutcome(r.nct_id, normalize_sponsor(r.sponsor), public_by, 1 - int(label))
        )
    return SponsorHistory(outcomes)


def sponsor_features(
    n_prior: int, n_stopped: int, prior_stop_rate: float, alpha: float = SMOOTHING_ALPHA
) -> list[float]:
    return [
        math.log1p(n_prior),
        (n_stopped + alpha * prior_stop_rate) / (n_prior + alpha),
        1.0 if n_prior > 0 else 0.0,
    ]


def sponsor_feature_matrix(
    records: Sequence[Any],
    supplement: Mapping[str, Mapping[str, Any]],
    history: SponsorHistory,
    prior_stop_rate: float,
) -> tuple[list[list[float]], list[dict[str, Any]]]:
    rows, audit = [], []
    for r in records:
        sup = supplement.get(r.nct_id) or {}
        anchor = anchor_date(sup.get("start_date"), sup.get("study_first_submit_date"))
        n, s = history.counts(normalize_sponsor(r.sponsor), anchor, r.nct_id)
        rows.append(sponsor_features(n, s, prior_stop_rate))
        audit.append({"nct_id": r.nct_id, "anchor": anchor.isoformat() if anchor else None, "n_prior": n, "n_prior_stopped": s})
    return rows, audit


# --------------------------------------------------------------------------- #
# Version history (first registered version)
# --------------------------------------------------------------------------- #

HISTORY_BASE = "https://clinicaltrials.gov/api/int/studies/{nct}/history"
TERMINAL_STATUSES = frozenset({"COMPLETED", "TERMINATED", "WITHDRAWN", "SUSPENDED"})
V0_FEATURE_NAMES: tuple[str, ...] = (
    "v0_enrollment_log10",
    "v0_site_count_log1p",
    "v0_not_yet_recruiting",
    "v0_planned_duration_months",
    "v0_registration_lead_months",
)


def months_between(a: date | None, b: date | None) -> float | None:
    if a is None or b is None:
        return None
    return (b - a).days / 30.4375


def parse_first_version(nct_id: str, payload: Mapping[str, Any], changes: Sequence[Mapping[str, Any]] | None = None) -> dict[str, Any]:
    """Extract registration-time fields from history version 0."""
    study = payload.get("study") or {}
    protocol = study.get("protocolSection") or {}
    status = protocol.get("statusModule") or {}
    design = protocol.get("designModule") or {}
    locations = (protocol.get("contactsLocationsModule") or {}).get("locations") or []
    enrollment = design.get("enrollmentInfo") or {}
    return {
        "nct_id": nct_id,
        "version": payload.get("studyVersion"),
        "v0_status": status.get("overallStatus"),
        "v0_enrollment": enrollment.get("count"),
        "v0_enrollment_type": enrollment.get("type"),
        "v0_site_count": len(locations),
        "v0_start_date": (status.get("startDateStruct") or {}).get("date"),
        "v0_completion_date": (status.get("completionDateStruct") or {}).get("date"),
        "v0_first_submit_date": status.get("studyFirstSubmitDate"),
        "n_versions": len(changes) if changes is not None else None,
    }


def fetch_first_versions(
    nct_ids: Sequence[str],
    *,
    workers: int = 4,
    delay_s: float = 0.1,
    max_consecutive_failures: int = 25,
    progress: Any = None,
) -> tuple[dict[str, dict[str, Any]], dict[str, Any]]:
    """Fetch history version 0 for each id. Stops (does not hammer) on repeated 403/429."""
    import threading
    from concurrent.futures import ThreadPoolExecutor

    import httpx

    headers = {
        "Accept": "application/json",
        "User-Agent": "Lacuna-ML-Research/1.0 (educational; mps5cy@virginia.edu)",
    }
    local = threading.local()
    lock = threading.Lock()
    state = {"consecutive_failures": 0, "stopped": False, "status_counts": Counter()}
    out: dict[str, dict[str, Any]] = {}

    def client() -> Any:
        if not hasattr(local, "c"):
            local.c = httpx.Client(timeout=45.0, follow_redirects=True)
            local.c.get("https://clinicaltrials.gov/api/v2/version", headers=headers)  # session cookie
        return local.c

    def one(nct: str) -> None:
        if state["stopped"]:
            return
        c = client()
        try:
            r = c.get(HISTORY_BASE.format(nct=nct) + "/0", headers=headers)
            if r.status_code == 403:  # refresh session cookie once
                c.get("https://clinicaltrials.gov/api/v2/version", headers=headers)
                r = c.get(HISTORY_BASE.format(nct=nct) + "/0", headers=headers)
            code = r.status_code
            ok = code == 200 and r.headers.get("content-type", "").startswith("application/json")
            row = parse_first_version(nct, r.json()) if ok else None
        except Exception as exc:
            code, ok, row = type(exc).__name__, False, None
        with lock:
            state["status_counts"][str(code)] += 1
            if ok and row is not None:
                out[nct] = row
                state["consecutive_failures"] = 0
            elif code != 404:
                state["consecutive_failures"] += 1
                if state["consecutive_failures"] >= max_consecutive_failures:
                    state["stopped"] = True
            if progress and len(out) % 500 == 0 and ok:
                progress(len(out))
        time.sleep(delay_s)

    with ThreadPoolExecutor(max_workers=workers) as pool:
        list(pool.map(one, sorted(set(nct_ids))))
    report = {
        "requested": len(set(nct_ids)),
        "returned": len(out),
        "http_status_counts": dict(state["status_counts"]),
        "stopped_early_on_repeated_failures": state["stopped"],
        "workers": workers,
        "delay_s": delay_s,
    }
    return out, report


def v0_feature_row(v0: Mapping[str, Any] | None, medians: Sequence[float]) -> tuple[list[float], bool]:
    """Registration-time features. Returns (row, usable).

    A row is *not usable* (imputed with training medians, no indicator) when
    version 0 is missing or already carries a terminal status, i.e. the trial
    was registered after its outcome, so version 0 is post-outcome.
    """
    if not v0 or str(v0.get("v0_status") or "").upper() in TERMINAL_STATUSES:
        return list(medians), False
    enroll = v0.get("v0_enrollment")
    start = parse_ctgov_date(v0.get("v0_start_date"))
    end = parse_ctgov_date(v0.get("v0_completion_date"))
    submit = parse_ctgov_date(v0.get("v0_first_submit_date"))
    duration = months_between(start, end)
    lead = months_between(submit, start)
    raw = [
        math.log10(max(float(enroll), 1.0)) if enroll is not None else None,
        math.log1p(float(v0.get("v0_site_count") or 0)),
        1.0 if str(v0.get("v0_status") or "").upper() == "NOT_YET_RECRUITING" else 0.0,
        float(np.clip(duration, -24, 240)) if duration is not None else None,
        float(np.clip(lead, -120, 60)) if lead is not None else None,
    ]
    return [medians[i] if v is None else float(v) for i, v in enumerate(raw)], True


def v0_training_medians(v0_rows: Sequence[Mapping[str, Any] | None]) -> list[float]:
    cols: list[list[float]] = [[] for _ in V0_FEATURE_NAMES]
    zeros = [0.0] * len(V0_FEATURE_NAMES)
    for v0 in v0_rows:
        row, usable = v0_feature_row(v0, [float("nan")] * len(V0_FEATURE_NAMES))
        if not usable:
            continue
        for i, v in enumerate(row):
            if not math.isnan(v):
                cols[i].append(v)
    return [float(np.median(c)) if c else zeros[i] for i, c in enumerate(cols)]
