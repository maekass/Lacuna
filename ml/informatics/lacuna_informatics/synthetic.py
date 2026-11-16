"""Deterministic synthetic FHIR R4 bundle for tests and demos.

Every value here is invented. Dollar amounts are placeholders, not observed
payer rates. Code numbers only; no CPT descriptors.
"""

from __future__ import annotations

import random
from typing import Any

ICD = "http://hl7.org/fhir/sid/icd-10-cm"
CPT = "http://www.ama-assn.org/go/cpt"

# (diagnosis, procedure) pairs used to build members.
PROFILES = [
    ("N80.0", "58662"),   # endometriosis, laparoscopic procedure code
    ("N80.3", "58662"),
    ("N92.0", "58558"),   # heavy menstrual bleeding, hysteroscopy code
    ("Z30.430", "58300"), # contraception management, IUD insertion code
    ("N95.1", None),      # menopausal state, no procedure
]


def make_bundle(n: int = 40, seed: int = 7) -> dict[str, Any]:
    rng = random.Random(seed)
    entries: list[dict[str, Any]] = []
    for i in range(n):
        pid, eid = f"syn-p{i:03d}", f"syn-e{i:03d}"
        dx, px = PROFILES[i % len(PROFILES)]
        day = f"2025-{1 + i % 12:02d}-{1 + i % 27:02d}"
        entries.append({"resource": {"resourceType": "Patient", "id": pid, "gender": "female",
                                     "birthDate": f"{1960 + rng.randint(0, 40)}-01-01"}})
        entries.append({"resource": {"resourceType": "Encounter", "id": eid,
                                     "subject": {"reference": f"Patient/{pid}"},
                                     "period": {"start": day, "end": day}}})
        entries.append({"resource": {"resourceType": "Condition", "id": f"syn-c{i:03d}",
                                     "subject": {"reference": f"Patient/{pid}"},
                                     "encounter": {"reference": f"Encounter/{eid}"},
                                     "recordedDate": day,
                                     "code": {"coding": [{"system": ICD, "code": dx}]}}})
        if px:
            entries.append({"resource": {"resourceType": "Procedure", "id": f"syn-x{i:03d}",
                                         "subject": {"reference": f"Patient/{pid}"},
                                         "encounter": {"reference": f"Encounter/{eid}"},
                                         "performedDateTime": day,
                                         "code": {"coding": [{"system": CPT, "code": px}]}}})
            submitted = 1000 + rng.randint(0, 500)
            paid = round(submitted * rng.uniform(0.3, 0.7), 2)
            entries.append({"resource": {
                "resourceType": "ExplanationOfBenefit", "id": f"syn-b{i:03d}",
                "patient": {"reference": f"Patient/{pid}"},
                "billablePeriod": {"start": day},
                "item": [{"sequence": 1,
                          "encounter": [{"reference": f"Encounter/{eid}"}],
                          "productOrService": {"coding": [{"system": CPT, "code": px}]},
                          "adjudication": [
                              {"category": {"coding": [{"code": "submitted"}]},
                               "amount": {"value": submitted, "currency": "USD"}},
                              {"category": {"coding": [{"code": "paidtoprovider"}]},
                               "amount": {"value": paid, "currency": "USD"}}]}]}})
    return {"resourceType": "Bundle", "type": "collection", "meta": {"tag": [{"code": "synthetic"}]},
            "entry": entries}
