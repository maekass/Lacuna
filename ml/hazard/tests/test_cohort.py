"""Self-check: cohort construction from verified-shaped rows."""

from __future__ import annotations

import unittest

from lacuna_hazard.cohort import build_cohort


def _dataset(**kwargs):
    base = {
        "provenance": {
            "lastUpdated": "2026-09-05",
            "datasetVersion": "v8",
            "purpose": "test",
            "disclaimer": "test",
            "sources": [],
            "notes": [],
        },
        "companies": [],
        "acquirers": [],
        "acquisitions": [],
    }
    base.update(kwargs)
    return base


class CohortTests(unittest.TestCase):
    def test_excludes_missing_founded(self) -> None:
        data = _dataset(
            companies=[
                {"id": "c1", "name": "NoYear", "sector": "Fertility"},
                {
                    "id": "c2",
                    "name": "HasYear",
                    "sector": "Fertility",
                    "founded": 2018,
                },
            ],
            acquisitions=[
                {
                    "id": "d1",
                    "targetId": "c2",
                    "announcedDate": "2021-06-15",
                }
            ],
        )
        cohort = build_cohort(data)
        self.assertEqual(cohort.n_missing_founded, 1)
        self.assertEqual(cohort.n, 1)
        self.assertEqual(cohort.n_events, 1)
        self.assertEqual(cohort.included[0].company_id, "c2")
        self.assertGreater(cohort.included[0].time_years, 3.0)
        self.assertLess(cohort.included[0].time_years, 4.0)

    def test_right_censors_independents_at_last_updated(self) -> None:
        data = _dataset(
            companies=[
                {
                    "id": "c3",
                    "name": "StillIndependent",
                    "sector": "Diagnostics",
                    "founded": 2020,
                }
            ]
        )
        cohort = build_cohort(data)
        row = cohort.included[0]
        self.assertEqual(row.event, 0)
        self.assertEqual(cohort.censor_date, "2026-09-05")
        self.assertGreater(row.time_years, 6.0)

    def test_excludes_nonpositive_time(self) -> None:
        data = _dataset(
            companies=[
                {
                    "id": "c4",
                    "name": "FoundedAfterDeal",
                    "sector": "Fertility",
                    "founded": 2022,
                }
            ],
            acquisitions=[
                {
                    "id": "d2",
                    "targetId": "c4",
                    "announcedDate": "2020-01-01",
                }
            ],
        )
        cohort = build_cohort(data)
        self.assertEqual(cohort.n, 0)
        self.assertEqual(cohort.n_nonpositive_time, 1)


if __name__ == "__main__":
    unittest.main()
