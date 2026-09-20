"""Self-check: Cox PH recovers a known two-group hazard ratio."""

from __future__ import annotations

import unittest

import numpy as np

from lacuna_hazard.concordance import concordance_index
from lacuna_hazard.cox import fit_cox_ph, linear_predictor
from lacuna_hazard.features import FEATURE_NAMES, encode_sector
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

    def test_drops_rare_dummy(self) -> None:
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

    def test_sector_encoder_matches_feature_names(self) -> None:
        self.assertEqual(len(encode_sector("Fertility")), len(FEATURE_NAMES))
        self.assertEqual(encode_sector("Fertility"), [1.0, 0.0])
        self.assertEqual(encode_sector("Diagnostics"), [0.0, 1.0])
        self.assertEqual(encode_sector("Menopause"), [0.0, 0.0])

    def test_linear_predictor_uses_kept_subset(self) -> None:
        X = np.array([[1.0, 0.0], [0.0, 1.0], [0.0, 0.0]])
        time = np.array([1.0, 2.0, 3.0])
        event = np.array([1, 1, 0])
        fit = fit_cox_ph(
            X,
            time,
            event,
            FEATURE_NAMES,
            min_events_per_feature=1,
        )
        lp = linear_predictor(X, fit, FEATURE_NAMES)
        self.assertEqual(lp.shape, (3,))


if __name__ == "__main__":
    unittest.main()
