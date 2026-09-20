"""Self-check: Cox PH recovers a known two-group hazard ratio."""

from __future__ import annotations

import unittest

import numpy as np

from lacuna_hazard.concordance import concordance_index
from lacuna_hazard.cox import fit_cox_ph, linear_predictor
from lacuna_hazard.features import FEATURE_NAMES, encode_row
from lacuna_hazard.nelson_aalen import nelson_aalen


class NelsonAalenTests(unittest.TestCase):
    def test_known_two_event_sample(self) -> None:
        time = np.array([1.0, 2.0, 3.0, 4.0])
        event = np.array([1, 0, 1, 0])
        na = nelson_aalen(time, event)
        self.assertEqual(na.times, (1.0, 3.0))
        self.assertAlmostEqual(na.cumulative_hazard[0], 1 / 4)
        self.assertAlmostEqual(na.cumulative_hazard[1], 1 / 4 + 1 / 2)
        self.assertEqual(na.n_risk, (4, 2))


class CoxTests(unittest.TestCase):
    def test_recovers_log2_hazard_ratio(self) -> None:
        rng = np.random.default_rng(0)
        n = 400
        x = rng.integers(0, 2, size=n).astype(float)
        # Exponential times: λ = 0.2 for x=0, λ = 0.4 for x=1 (HR = 2).
        rate = 0.2 * np.exp(np.log(2.0) * x)
        u = rng.random(n)
        time = -np.log(u) / rate
        censor = rng.uniform(0.5, 6.0, size=n)
        event = (time <= censor).astype(int)
        time = np.minimum(time, censor)
        X = x.reshape(-1, 1)
        fit = fit_cox_ph(X, time, event, ("exposed",), min_events_per_feature=20)
        self.assertTrue(fit.converged)
        self.assertEqual(fit.feature_names, ("exposed",))
        self.assertAlmostEqual(float(fit.coefficients[0]), np.log(2.0), delta=0.2)

    def test_drops_rare_feature(self) -> None:
        X = np.array([[1.0], [0.0], [0.0], [0.0]])
        time = np.array([1.0, 2.0, 3.0, 4.0])
        event = np.array([1, 1, 1, 0])
        fit = fit_cox_ph(X, time, event, ("rare",), min_events_per_feature=8)
        self.assertEqual(fit.feature_names, ())
        self.assertEqual(fit.dropped_features, ("rare",))

    def test_concordance_ranks_higher_risk_first(self) -> None:
        risk = np.array([3.0, 1.0, 2.0])
        time = np.array([1.0, 3.0, 2.0])
        event = np.array([1, 0, 1])
        c = concordance_index(risk, time, event)
        self.assertIsNotNone(c)
        self.assertGreater(c or 0.0, 0.9)

    def test_design_matrix_has_no_sector_dummies(self) -> None:
        self.assertEqual(FEATURE_NAMES, ())
        self.assertEqual(encode_row({"sector": "Fertility"}), [])
        self.assertEqual(encode_row({"sector": "Diagnostics"}), [])
        self.assertEqual(encode_row({}), [])

    def test_empty_design_returns_zero_linear_predictor(self) -> None:
        X = np.zeros((3, 0))
        time = np.array([1.0, 2.0, 3.0])
        event = np.array([1, 1, 0])
        fit = fit_cox_ph(X, time, event, FEATURE_NAMES)
        self.assertEqual(fit.feature_names, ())
        self.assertEqual(fit.coefficients.shape, (0,))
        lp = linear_predictor(X, fit, FEATURE_NAMES)
        self.assertEqual(lp.shape, (3,))
        self.assertTrue(np.allclose(lp, 0.0))


if __name__ == "__main__":
    unittest.main()
