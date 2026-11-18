"""Aggregate-only cohort queries over the i2b2-style store.

Query semantics follow i2b2 panels: codes inside a panel are OR'ed, panels are
AND'ed, and an excluded panel removes matching patients. Results are counts
only, with small-cell suppression, in the spirit of federated count networks
such as SHRINE and of PIC-SURE's JSON query contract. This is not SHRINE or
PIC-SURE software and does not reproduce their exact privacy parameters.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from .i2b2 import Store

DEFAULT_MIN_CELL = 11  # CMS cell-size suppression convention: report 1-10 as suppressed.


@dataclass
class Panel:
    concepts: list[str]
    exclude: bool = False


@dataclass
class CohortQuery:
    panels: list[Panel] = field(default_factory=list)

    @classmethod
    def from_json(cls, doc: dict[str, Any]) -> "CohortQuery":
        if doc.get("expectedResultType") != "COUNT":
            raise ValueError("only expectedResultType=COUNT is supported; row-level output is not offered")
        panels = [Panel(list(p["concepts"]), bool(p.get("exclude", False))) for p in doc.get("panels", [])]
        if not panels or all(p.exclude for p in panels):
            raise ValueError("at least one inclusion panel is required")
        if any(not p.concepts for p in panels):
            raise ValueError("empty panel")
        return cls(panels)


def _patients(store: Store, concepts: list[str]) -> set[int]:
    marks = ",".join("?" * len(concepts))
    rows = store.con.execute(
        f"SELECT DISTINCT patient_num FROM observation_fact WHERE modifier_cd='@' AND concept_cd IN ({marks})",
        concepts,
    ).fetchall()
    return {r[0] for r in rows}


def raw_count(store: Store, q: CohortQuery) -> int:
    """Exact count. Internal use and tests only; never return this to a caller."""
    include = [p for p in q.panels if not p.exclude]
    result = _patients(store, include[0].concepts)
    for p in include[1:]:
        result &= _patients(store, p.concepts)
    for p in q.panels:
        if p.exclude:
            result -= _patients(store, p.concepts)
    return len(result)


def count(store: Store, q: CohortQuery, min_cell: int = DEFAULT_MIN_CELL) -> dict[str, Any]:
    """Return a suppressed aggregate count suitable for display."""
    n = raw_count(store, q)
    if 0 < n < min_cell:
        return {"count": None, "display": f"1 to {min_cell - 1}", "suppressed": True}
    return {"count": n, "display": str(n), "suppressed": False}


def paid_summary(store: Store, concept: str, modifier: str = "EOB:paidtoprovider",
                 min_cell: int = DEFAULT_MIN_CELL) -> dict[str, Any]:
    """Patient count and mean adjudicated amount for one code, suppressed when small."""
    n, mean = store.con.execute(
        "SELECT COUNT(DISTINCT patient_num), AVG(nval_num) FROM observation_fact "
        "WHERE concept_cd=? AND modifier_cd=?", [concept, modifier]).fetchone()
    if n == 0:
        return {"patients": 0, "mean": None, "suppressed": False}
    if n < min_cell:
        return {"patients": None, "mean": None, "suppressed": True}
    return {"patients": n, "mean": round(mean, 2), "suppressed": False}
