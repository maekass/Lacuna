"""Nelson–Aalen cumulative hazard (no covariates)."""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np


@dataclass(frozen=True)
class NelsonAalen:
    times: tuple[float, ...]
    cumulative_hazard: tuple[float, ...]
    n_risk: tuple[int, ...]
    n_events: tuple[int, ...]


def nelson_aalen(time: np.ndarray, event: np.ndarray) -> NelsonAalen:
    """Step-function H(t) = Σ_{t_i ≤ t} d_i / n_i. Censoring does not increment H."""
    time = np.asarray(time, dtype=float)
    event = np.asarray(event, dtype=int)
    n = time.shape[0]
    if n == 0:
        return NelsonAalen((), (), (), ())

    order = np.argsort(time, kind="mergesort")
    t_sorted = time[order]
    e_sorted = event[order]

    times: list[float] = []
    haz: list[float] = []
    nrisk: list[int] = []
    nevents: list[int] = []
    h = 0.0
    i = 0
    at_risk = n
    while i < n:
        t = float(t_sorted[i])
        j = i
        d = 0
        c = 0
        while j < n and float(t_sorted[j]) == t:
            if int(e_sorted[j]) == 1:
                d += 1
            else:
                c += 1
            j += 1
        if d > 0 and at_risk > 0:
            h += d / at_risk
            times.append(t)
            haz.append(float(h))
            nrisk.append(at_risk)
            nevents.append(d)
        at_risk -= d + c
        i = j

    return NelsonAalen(
        tuple(times),
        tuple(haz),
        tuple(nrisk),
        tuple(nevents),
    )
