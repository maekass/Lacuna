"""
Build epidemiology CSV time series from Orphanet rates, CDC anchors, and trial samples.
"""

from __future__ import annotations

import pandas as pd

from src.data_collection.parsers.cdc_scd import (
    CDC_SCD_PREVALENCE_US,
    scd_births_per_1000_black,
)
from src.disease_registry import DiseaseSpec

# Mid-year U.S. population estimates (Census vintage, millions) for scaling per-100k rates.
US_POPULATION_BY_YEAR: dict[int, int] = {
    2015: 321_000_000,
    2016: 323_000_000,
    2017: 325_000_000,
    2018: 327_000_000,
    2019: 329_000_000,
    2020: 331_000_000,
    2021: 332_000_000,
    2022: 333_000_000,
    2023: 335_000_000,
    2024: 337_000_000,
}

FDA_SCD_APPROVALS_BY_YEAR: dict[int, int] = {
    2017: 1,
    2019: 2,
}


def _annual_dates() -> pd.DatetimeIndex:
    return pd.date_range(start="2015-01-01", end="2024-12-31", freq="YE")


def prevalence_us_from_rate(per_100k: float, year: int) -> int:
    pop = US_POPULATION_BY_YEAR.get(year, 335_000_000)
    return int(round(per_100k / 100_000.0 * pop))


def count_active_trials(trials: pd.DataFrame | None) -> int | None:
    if trials is None or trials.empty or "status" not in trials.columns:
        return None
    active_tokens = ("RECRUITING", "ACTIVE", "ENROLLING", "NOT_YET_RECRUITING")
    mask = trials["status"].astype(str).str.upper().apply(
        lambda s: any(tok in s for tok in active_tokens)
    )
    n = int(mask.sum())
    return n if n > 0 else int(len(trials))


def build_scd_epidemiology(
    *,
    us_prevalence_per_100k: float | None,
    trials: pd.DataFrame | None,
) -> pd.DataFrame:
    dates = _annual_dates()
    years = [d.year for d in dates]
    if us_prevalence_per_100k is not None:
        prevalence_series = [prevalence_us_from_rate(us_prevalence_per_100k, y) for y in years]
    else:
        prevalence_series = [CDC_SCD_PREVALENCE_US] * len(years)

    trial_n = count_active_trials(trials)
    if trial_n is None:
        trial_n = 80

    return pd.DataFrame(
        {
            "date": dates,
            "scd_births_per_1000": [scd_births_per_1000_black()] * len(dates),
            "scd_prevalence_us": prevalence_series,
            "new_treatments_approved": [FDA_SCD_APPROVALS_BY_YEAR.get(y, 0) for y in years],
            "clinical_trials_active": [trial_n] * len(dates),
        }
    )


def build_generic_epidemiology(
    spec: DiseaseSpec,
    *,
    us_prevalence_per_100k: float | None,
    trials: pd.DataFrame | None,
) -> pd.DataFrame:
    dates = _annual_dates()
    years = [d.year for d in dates]
    if us_prevalence_per_100k is not None:
        prev = [prevalence_us_from_rate(us_prevalence_per_100k, y) for y in years]
    else:
        base = spec.prevalence_us
        prev = [int(round(base * (0.95 + 0.05 * i / max(len(years) - 1, 1)))) for i in range(len(years))]

    trial_n = count_active_trials(trials)
    if trial_n is None:
        trial_n = min(100, max(40, len(trials) if trials is not None and not trials.empty else 50))

    return pd.DataFrame(
        {
            "date": dates,
            "prevalence_us": prev,
            "clinical_trials_active": [trial_n] * len(dates),
            "new_treatments_approved": [0] * len(dates),
            "disease_id": spec.disease_id,
        }
    )


def build_epidemiology_dataframe(
    spec: DiseaseSpec,
    *,
    us_prevalence_per_100k: float | None,
    trials: pd.DataFrame | None,
) -> pd.DataFrame:
    if spec.disease_id == "scd":
        return build_scd_epidemiology(
            us_prevalence_per_100k=us_prevalence_per_100k,
            trials=trials,
        )
    return build_generic_epidemiology(
        spec,
        us_prevalence_per_100k=us_prevalence_per_100k,
        trials=trials,
    )
