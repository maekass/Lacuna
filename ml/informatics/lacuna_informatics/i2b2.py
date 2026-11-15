"""Load FHIR R4 resources into an i2b2-style star schema in DuckDB.

The schema mirrors the core i2b2 CRC tables (patient_dimension,
visit_dimension, concept_dimension, observation_fact). It is a reimplementation
of the published data model, not the i2b2 software, and it is not affiliated
with or endorsed by i2b2, Harvard Catalyst or Harvard Medical School.

Licensing: concept names store code numbers only. AMA CPT descriptors are
never copied (see docs/REIMBURSEMENT_CPT_LICENSING.md).
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable, Iterator

import duckdb

SCHEMA = """
CREATE TABLE patient_dimension (
  patient_num INTEGER PRIMARY KEY,
  source_id VARCHAR NOT NULL UNIQUE,
  sex_cd VARCHAR,
  birth_year INTEGER,
  data_class VARCHAR NOT NULL
);
CREATE TABLE visit_dimension (
  encounter_num INTEGER PRIMARY KEY,
  source_id VARCHAR NOT NULL UNIQUE,
  patient_num INTEGER NOT NULL,
  start_date DATE,
  end_date DATE
);
CREATE TABLE concept_dimension (
  concept_cd VARCHAR PRIMARY KEY,
  concept_path VARCHAR NOT NULL,
  name_char VARCHAR NOT NULL
);
CREATE TABLE observation_fact (
  encounter_num INTEGER,
  patient_num INTEGER NOT NULL,
  concept_cd VARCHAR NOT NULL,
  modifier_cd VARCHAR NOT NULL DEFAULT '@',
  instance_num INTEGER NOT NULL DEFAULT 1,
  start_date DATE,
  valtype_cd VARCHAR,
  nval_num DOUBLE,
  units_cd VARCHAR,
  sourcesystem_cd VARCHAR NOT NULL
);
"""

# FHIR code-system URIs to i2b2 concept prefixes.
SYSTEMS = {
    "http://hl7.org/fhir/sid/icd-10-cm": "ICD10CM",
    "http://www.ama-assn.org/go/cpt": "CPT",
    "https://www.cms.gov/Medicare/Coding/HCPCSReleaseCodeSets": "HCPCS",
    "http://loinc.org": "LOINC",
    "http://snomed.info/sct": "SNOMED",
}

# EOB adjudication categories kept as numeric modifiers on a code fact.
ADJUDICATION = {"submitted", "eligible", "benefit", "copay", "deductible", "paidtoprovider"}

ALLOWED_DATA_CLASSES = {"synthetic", "public_deidentified_opt_in"}


class LoadError(ValueError):
    """Raised when input violates the load contract."""


@dataclass
class LoadReport:
    patients: int = 0
    encounters: int = 0
    facts: int = 0
    skipped_codes: int = 0


def iter_resources(path: Path) -> Iterator[dict[str, Any]]:
    """Yield resources from a FHIR Bundle (.json) or NDJSON (.ndjson) file."""
    text = path.read_text(encoding="utf-8")
    if path.suffix == ".ndjson":
        for line in text.splitlines():
            if line.strip():
                yield json.loads(line)
        return
    doc = json.loads(text)
    if doc.get("resourceType") == "Bundle":
        for entry in doc.get("entry", []):
            yield entry["resource"]
    else:
        yield doc


def _ref_id(ref: str | None) -> str | None:
    if not ref:
        return None
    return ref.split("/")[-1].removeprefix("urn:uuid:")


def _concepts(codeable: dict[str, Any] | None) -> Iterable[tuple[str, str]]:
    for coding in (codeable or {}).get("coding", []):
        prefix = SYSTEMS.get(coding.get("system", ""))
        code = coding.get("code")
        if prefix and code:
            yield prefix, code


class Store:
    """An in-memory or file-backed i2b2-style store."""

    def __init__(self, path: str = ":memory:") -> None:
        self.con = duckdb.connect(path)
        self.con.execute(SCHEMA)
        self._pnum: dict[str, int] = {}
        self._enum: dict[str, int] = {}
        self._enc_patient: dict[str, str] = {}

    def _concept(self, prefix: str, code: str) -> str:
        cd = f"{prefix}:{code}"
        # Code number only, never a licensed descriptor.
        self.con.execute(
            "INSERT OR IGNORE INTO concept_dimension VALUES (?, ?, ?)",
            [cd, f"\\{prefix}\\{code}\\", cd],
        )
        return cd

    def _fact(self, patient: str, encounter: str | None, cd: str, date: str | None,
              source: str, modifier: str = "@", value: float | None = None,
              units: str | None = None, instance: int = 1) -> None:
        pnum = self._pnum.get(patient)
        if pnum is None:
            raise LoadError(f"fact references unknown patient {patient!r}")
        self.con.execute(
            "INSERT INTO observation_fact VALUES (?,?,?,?,?,?,?,?,?,?)",
            [self._enum.get(encounter) if encounter else None, pnum, cd, modifier,
             instance, (date or "")[:10] or None, "N" if value is not None else "T",
             value, units, source],
        )

    def load(self, resources: Iterable[dict[str, Any]], data_class: str,
             source: str) -> LoadReport:
        """Load resources. Patients and encounters are loaded before facts."""
        if data_class not in ALLOWED_DATA_CLASSES:
            raise LoadError(f"data_class must be one of {sorted(ALLOWED_DATA_CLASSES)}")
        items = list(resources)
        rep = LoadReport()
        order = {"Patient": 0, "Encounter": 1}
        for r in sorted(items, key=lambda x: order.get(x.get("resourceType"), 2)):
            rt = r.get("resourceType")
            if rt == "Patient":
                if r["id"] in self._pnum:
                    raise LoadError(f"duplicate patient {r['id']!r}")
                n = len(self._pnum) + 1
                self._pnum[r["id"]] = n
                by = r.get("birthDate")
                # Year only: no full birth dates are stored.
                self.con.execute(
                    "INSERT INTO patient_dimension VALUES (?,?,?,?,?)",
                    [n, r["id"], r.get("gender"), int(by[:4]) if by else None, data_class],
                )
                rep.patients += 1
            elif rt == "Encounter":
                pid = _ref_id(r.get("subject", {}).get("reference"))
                if pid not in self._pnum:
                    raise LoadError(f"encounter {r['id']!r} has unknown subject")
                n = len(self._enum) + 1
                self._enum[r["id"]] = n
                self._enc_patient[r["id"]] = pid
                per = r.get("period", {})
                self.con.execute(
                    "INSERT INTO visit_dimension VALUES (?,?,?,?,?)",
                    [n, r["id"], self._pnum[pid], (per.get("start") or "")[:10] or None,
                     (per.get("end") or "")[:10] or None],
                )
                rep.encounters += 1
            elif rt in ("Condition", "Procedure"):
                pid = _ref_id(r.get("subject", {}).get("reference"))
                enc = _ref_id(r.get("encounter", {}).get("reference"))
                date = r.get("recordedDate") or r.get("performedDateTime") or r.get("onsetDateTime")
                found = False
                for prefix, code in _concepts(r.get("code")):
                    self._fact(pid, enc, self._concept(prefix, code), date, source)
                    rep.facts += 1
                    found = True
                rep.skipped_codes += 0 if found else 1
            elif rt == "ExplanationOfBenefit":
                pid = _ref_id(r.get("patient", {}).get("reference"))
                enc_refs = [_ref_id(e.get("reference")) for item in r.get("item", [])
                            for e in item.get("encounter", [])]
                date = (r.get("billablePeriod") or {}).get("start")
                for i, item in enumerate(r.get("item", []), start=1):
                    enc = enc_refs[0] if enc_refs else None
                    for prefix, code in _concepts(item.get("productOrService")):
                        cd = self._concept(prefix, code)
                        self._fact(pid, enc, cd, date, source, instance=i)
                        rep.facts += 1
                        for adj in item.get("adjudication", []):
                            cat = next((c.get("code") for c in adj.get("category", {}).get("coding", [])), None)
                            amt = adj.get("amount", {})
                            if cat in ADJUDICATION and "value" in amt:
                                self._fact(pid, enc, cd, date, source, modifier=f"EOB:{cat}",
                                           value=float(amt["value"]), units=amt.get("currency", "USD"),
                                           instance=i)
                                rep.facts += 1
        return rep
