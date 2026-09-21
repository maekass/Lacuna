"""Self-check: claim lists stay aligned with the checker."""

from __future__ import annotations

import unittest

from lacuna_hazard.claims import (
    ALLOWED_CLAIMS,
    CLAIM_CLASS,
    DISCLAIMER,
    FORBIDDEN_CLAIMS,
)


class ClaimTests(unittest.TestCase):
    def test_claim_class_is_descriptive(self) -> None:
        self.assertEqual(CLAIM_CLASS, "descriptive")

    def test_disclaimer_rejects_forecast_language(self) -> None:
        lowered = DISCLAIMER.lower()
        self.assertIn("not a forecast", lowered)
        self.assertIn("not an acquisition probability", lowered)
        self.assertIn("not investment advice", lowered)

    def test_allowed_claims_include_exclusion_rule(self) -> None:
        blob = " ".join(ALLOWED_CLAIMS).lower()
        self.assertIn("founded year", blob)
        self.assertIn("stage is unused", blob)

    def test_forbidden_list_covers_product_overclaims(self) -> None:
        blob = " ".join(FORBIDDEN_CLAIMS).lower()
        self.assertIn("acquisition probability", blob)
        self.assertIn("investment advice", blob)
        self.assertIn("invented tam", blob)


if __name__ == "__main__":
    unittest.main()
