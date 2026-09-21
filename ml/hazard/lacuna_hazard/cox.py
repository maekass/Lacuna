"""Breslow-tied Cox partial likelihood with a tiny ridge for stability."""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from lacuna_hazard.features import MIN_EVENTS_PER_FEATURE


@dataclass(frozen=True)
class CoxFit:
    feature_names: tuple[str, ...]
    coefficients: np.ndarray
    hazard_ratios: np.ndarray
    log_partial_likelihood: float
    n: int
    n_events: int
    n_iter: int
    converged: bool
    dropped_features: tuple[str, ...]
    notes: tuple[str, ...]


def _unique_event_times(time: np.ndarray, event: np.ndarray) -> np.ndarray:
    return np.unique(time[event == 1])


def _partial_likelihood_stats(
    X: np.ndarray,
    time: np.ndarray,
    event: np.ndarray,
    beta: np.ndarray,
    l2: float,
) -> tuple[np.ndarray, np.ndarray, float]:
    """Return score, observed information, and penalized log partial likelihood."""
    eta = X @ beta
    eta = eta - float(np.max(eta)) if eta.size else eta
    exp_eta = np.exp(np.clip(eta, -50.0, 50.0))
    p = X.shape[1]
    score = np.zeros(p)
    info = np.zeros((p, p))
    loglik = 0.0

    for t in _unique_event_times(time, event):
        risk = time >= t
        fail = (time == t) & (event == 1)
        d = int(fail.sum())
        if d == 0:
            continue
        w = exp_eta[risk]
        s0 = float(w.sum())
        if s0 <= 0.0:
            continue
        Xr = X[risk]
        s1 = Xr.T @ w
        s2 = (Xr * w[:, None]).T @ Xr
        mean = s1 / s0
        s_k = X[fail].sum(axis=0)
        score += s_k - d * mean
        var = s2 / s0 - np.outer(mean, mean)
        info += d * var
        loglik += float(eta[fail].sum() - d * np.log(s0))

    if l2 > 0:
        score = score - l2 * beta
        info = info + l2 * np.eye(p)
        loglik -= 0.5 * l2 * float(beta @ beta)
    return score, info, loglik


def select_feature_mask(
    X: np.ndarray,
    event: np.ndarray,
    names: tuple[str, ...],
    min_events: int = MIN_EVENTS_PER_FEATURE,
) -> tuple[np.ndarray, tuple[str, ...], tuple[str, ...]]:
    """Keep dummies that have enough events in the exposed group."""
    kept: list[int] = []
    dropped: list[str] = []
    for j, name in enumerate(names):
        exposed_events = int(((X[:, j] > 0) & (event == 1)).sum())
        if exposed_events >= min_events:
            kept.append(j)
        else:
            dropped.append(name)
    mask = np.array(kept, dtype=int)
    kept_names = tuple(names[j] for j in kept)
    return mask, kept_names, tuple(dropped)


def fit_cox_ph(
    X: np.ndarray,
    time: np.ndarray,
    event: np.ndarray,
    feature_names: tuple[str, ...],
    *,
    max_iter: int = 50,
    tol: float = 1e-8,
    l2: float = 1e-6,
    min_events_per_feature: int = MIN_EVENTS_PER_FEATURE,
) -> CoxFit:
    """Fit Cox PH (Breslow ties). Empty feature set → intercept-only (all β = [])."""
    X = np.asarray(X, dtype=float)
    time = np.asarray(time, dtype=float)
    event = np.asarray(event, dtype=int)
    n = int(X.shape[0])
    n_events = int(event.sum())
    notes: list[str] = [
        "Breslow tie handling; no intercept (absorbed into the baseline hazard).",
        "Coefficients are log hazard ratios vs the collapsed reference group.",
    ]

    mask, kept_names, dropped = select_feature_mask(
        X,
        event,
        feature_names,
        min_events_per_feature,
    )
    if mask.size == 0:
        return CoxFit(
            feature_names=(),
            coefficients=np.zeros(0),
            hazard_ratios=np.zeros(0),
            log_partial_likelihood=0.0,
            n=n,
            n_events=n_events,
            n_iter=0,
            converged=True,
            dropped_features=dropped,
            notes=tuple(
                notes + ["No sector dummy cleared the event-count floor; baseline only."]
            ),
        )

    Xc = X[:, mask]
    beta = np.zeros(Xc.shape[1], dtype=float)
    loglik = 0.0
    converged = False
    n_iter = 0
    for n_iter in range(1, max_iter + 1):
        score, info, loglik = _partial_likelihood_stats(Xc, time, event, beta, l2)
        try:
            delta = np.linalg.solve(info, score)
        except np.linalg.LinAlgError:
            notes.append("Observed information was singular; stopped early.")
            break
        beta = beta + delta
        if float(np.linalg.norm(delta)) < tol:
            converged = True
            break
    else:
        notes.append(f"Reached max_iter={max_iter} without meeting tol={tol}.")

    hr = np.exp(beta)
    return CoxFit(
        feature_names=kept_names,
        coefficients=beta,
        hazard_ratios=hr,
        log_partial_likelihood=float(loglik),
        n=n,
        n_events=n_events,
        n_iter=n_iter,
        converged=converged,
        dropped_features=dropped,
        notes=tuple(notes),
    )


def linear_predictor(X: np.ndarray, fit: CoxFit, feature_names: tuple[str, ...]) -> np.ndarray:
    """Compute xβ using the kept feature subset (missing kept columns → 0)."""
    if not fit.feature_names:
        return np.zeros(X.shape[0])
    index = {name: j for j, name in enumerate(feature_names)}
    cols = []
    for name in fit.feature_names:
        j = index.get(name)
        if j is None:
            cols.append(np.zeros(X.shape[0]))
        else:
            cols.append(X[:, j])
    Xk = np.column_stack(cols) if cols else np.zeros((X.shape[0], 0))
    return Xk @ fit.coefficients


def breslow_baseline(
    X: np.ndarray,
    time: np.ndarray,
    event: np.ndarray,
    fit: CoxFit,
    feature_names: tuple[str, ...],
) -> tuple[list[float], list[float], list[float]]:
    """Breslow cumulative baseline hazard and S0(t) = exp(-H0(t))."""
    lp = linear_predictor(X, fit, feature_names)
    lp = lp - float(np.max(lp)) if lp.size else lp
    exp_eta = np.exp(np.clip(lp, -50.0, 50.0))
    times: list[float] = []
    cumhaz: list[float] = []
    surv: list[float] = []
    h = 0.0
    for t in _unique_event_times(time, event):
        risk = time >= t
        fail = (time == t) & (event == 1)
        d = float(fail.sum())
        s0 = float(exp_eta[risk].sum())
        if s0 <= 0.0:
            continue
        h += d / s0
        s = float(np.exp(-h))
        times.append(float(t))
        cumhaz.append(float(h))
        surv.append(max(0.0, min(1.0, s)))
    return times, cumhaz, surv
