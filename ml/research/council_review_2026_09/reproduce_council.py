"""Reproduce selected council arithmetic, not estimates from Lacuna data.

Inputs below come from the supplied review. No live cohort was reconstructed.
All results are assumption-conditional; these tests are not model validation.
Uses only Python's standard library.
"""
import math
import unittest


def prior_correct(p_sample, sample_fraction, population_fraction):
    shift = (
        math.log(population_fraction / (1 - population_fraction))
        - math.log(sample_fraction / (1 - sample_fraction))
    )
    corrected = 1 / (
        1 + math.exp(-(math.log(p_sample / (1 - p_sample)) + shift))
    )
    return shift, corrected


def auc_interval(auc, events, nonevents):
    q1 = auc / (2 - auc)
    q2 = 2 * auc**2 / (1 + auc)
    se = math.sqrt(
        (
            auc * (1 - auc)
            + (events - 1) * (q1 - auc**2)
            + (nonevents - 1) * (q2 - auc**2)
        ) / (events * nonevents)
    )
    return se, auc - 1.96 * se, auc + 1.96 * se


def development_scenarios(p, explained_fraction, event_fraction):
    max_r2 = 1 - (
        event_fraction**event_fraction
        * (1 - event_fraction)**(1 - event_fraction)
    )**2
    r2 = explained_fraction * max_r2
    s1 = 0.9
    n1 = p / ((s1 - 1) * math.log(1 - r2 / s1))
    s2 = r2 / (r2 + 0.05 * max_r2)
    n2 = p / ((s2 - 1) * math.log(1 - r2 / s2))
    n3 = (1.96 / 0.05)**2 * event_fraction * (1 - event_fraction)
    return n1, n2, n3, math.ceil(max(n1, n2, n3))


class ArithmeticTests(unittest.TestCase):
    def test_prior_correction_identity(self):
        _, p = prior_correct(0.68, 58 / 150, 58 / 150)
        self.assertAlmostEqual(p, 0.68)

    def test_prior_correction_scenarios(self):
        expected = [0.15067, 0.27247, 0.37297, 0.45731]
        for tau, target in zip([0.05, 0.10, 0.15, 0.20], expected):
            _, p = prior_correct(0.68, 58 / 150, tau)
            self.assertAlmostEqual(p, target, places=5)

    def test_conditional_development_sizes(self):
        scenarios = [
            (8, 0.15, 58 / 150, 611),
            (8, 0.30, 58 / 150, 365),
            (5, 0.15, 58 / 150, 382),
            (8, 0.15, 0.10, 964),
        ]
        for p, f, phi, expected in scenarios:
            self.assertEqual(development_scenarios(p, f, phi)[3], expected)

    def test_hypothetical_auc_interval(self):
        se, lo, hi = auc_interval(0.70, 12, 40)
        self.assertAlmostEqual(se, 0.09259488, places=7)
        self.assertAlmostEqual(lo, 0.51851403, places=7)
        self.assertAlmostEqual(hi, 0.88148597, places=7)
        self.assertGreater(lo, 0.50)


if __name__ == "__main__":
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(ArithmeticTests)
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    if not result.wasSuccessful():
        raise SystemExit(1)
    print("\nScenario outputs; NOT observed performance or calibrated predictions:")
    for tau in [0.05, 0.10, 0.15, 0.20]:
        print("prior", tau, prior_correct(0.68, 58 / 150, tau))
    for args in [(8, .15, 58/150), (8, .3, 58/150), (5, .15, 58/150), (8, .15, .1)]:
        print("sample_size", args, development_scenarios(*args))
    print("hypothetical_auc", auc_interval(.7, 12, 40))
