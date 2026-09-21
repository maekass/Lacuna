"""Harrell's concordance for a risk score (higher = earlier event)."""

from __future__ import annotations

import numpy as np


def concordance_index(
    risk: np.ndarray,
    time: np.ndarray,
    event: np.ndarray,
) -> float | None:
    """Return C-index or None when there are no comparable pairs.

    Pair (i, j) is comparable when i is an event and j is still at risk after
    t_i (time_j > time_i). Tied event times are skipped.
    """
    risk = np.asarray(risk, dtype=float)
    time = np.asarray(time, dtype=float)
    event = np.asarray(event, dtype=int)
    n = risk.shape[0]
    conc = 0.0
    disc = 0.0
    tied = 0.0
    for i in range(n):
        if int(event[i]) != 1:
            continue
        later = time > time[i]
        if not np.any(later):
            continue
        ri = risk[i]
        rj = risk[later]
        conc += float(np.sum(ri > rj))
        disc += float(np.sum(ri < rj))
        tied += float(np.sum(ri == rj))
    denom = conc + disc + tied
    if denom == 0:
        return None
    return (conc + 0.5 * tied) / denom
