#!/usr/bin/env python3
"""Fail if hazard surfaces overclaim relative to the committed artifact."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "ml" / "hazard"))

from lacuna_hazard.claims import (  # noqa: E402
    ALLOWED_CLAIMS,
    CLAIM_CLASS,
    DISCLAIMER,
    FORBIDDEN_CLAIM_PATTERNS,
    FORBIDDEN_CLAIMS,
    HAZARD_SURFACE_GLOBS,
)
from lacuna_hazard.paths import artifact_path  # noqa: E402

# Files that *define* forbidden language so the checker can list it.
DEFINITION_SUFFIXES = (
    "lacuna_hazard/claims.py",
    "scripts/check_claim_consistency.py",
    "ml/hazard/tests/test_claims.py",
)

NEGATION = re.compile(
    r"\b(not|never|do not|does not|must not|don't|isn't|is not)\b",
    re.IGNORECASE,
)


def _is_definition_file(path: Path, root: Path) -> bool:
    rel = path.relative_to(root).as_posix()
    return any(rel.endswith(suffix) for suffix in DEFINITION_SUFFIXES)


def _iter_surface_files(root: Path) -> list[Path]:
    files: list[Path] = []
    for pattern in HAZARD_SURFACE_GLOBS:
        files.extend(root.glob(pattern))
    unique = []
    seen: set[Path] = set()
    for path in files:
        if path.is_file() and path not in seen:
            seen.add(path)
            unique.append(path)
    return sorted(unique)


def check_artifact(root: Path) -> list[str]:
    errors: list[str] = []
    path = artifact_path(root)
    if not path.is_file():
        return [f"missing artifact {path.relative_to(root)}"]
    artifact = json.loads(path.read_text(encoding="utf-8"))
    if artifact.get("claimClass") != CLAIM_CLASS:
        errors.append(f"artifact claimClass must be {CLAIM_CLASS!r}")
    if artifact.get("disclaimer") != DISCLAIMER:
        errors.append("artifact disclaimer drifted from lacuna_hazard.claims")
    if artifact.get("allowedClaims") != list(ALLOWED_CLAIMS):
        errors.append("artifact allowedClaims drifted from lacuna_hazard.claims")
    if artifact.get("forbiddenClaims") != list(FORBIDDEN_CLAIMS):
        errors.append("artifact forbiddenClaims drifted from lacuna_hazard.claims")
    sufficiency = artifact.get("sufficiency") or {}
    if sufficiency.get("fits") is True:
        metrics = artifact.get("metrics") or {}
        if metrics.get("concordance") is None:
            errors.append("fitting artifact must record a concordance index")
    return errors


def check_surfaces(root: Path) -> list[str]:
    compiled = [
        (pattern, re.compile(pattern, re.IGNORECASE))
        for pattern in FORBIDDEN_CLAIM_PATTERNS
    ]
    errors: list[str] = []
    for path in _iter_surface_files(root):
        if _is_definition_file(path, root):
            continue
        text = path.read_text(encoding="utf-8")
        rel = path.relative_to(root).as_posix()
        if "/tests/" in f"/{rel}" or rel.endswith(".test.ts"):
            continue
        if path.suffix == ".json":
            payload = json.loads(text)
            # JSON artifacts may enumerate forbiddenClaims as data, not claims.
            if isinstance(payload, dict) and "forbiddenClaims" in payload:
                continue
        lines = text.splitlines()
        for pattern, rx in compiled:
            for i, line in enumerate(lines, start=1):
                match = rx.search(line)
                if not match:
                    continue
                prev = lines[i - 2] if i > 1 else ""
                window = f"{prev} {line}"
                prefix = line[: match.start()]
                if NEGATION.search(prefix) or NEGATION.search(window):
                    continue
                errors.append(f"{rel}:{i}: matched forbidden claim /{pattern}/")
    return errors


def check_ts_consumer(root: Path) -> list[str]:
    path = root / "src" / "lib" / "scoring" / "hazard.ts"
    if not path.is_file():
        return ["missing src/lib/scoring/hazard.ts"]
    text = path.read_text(encoding="utf-8")
    errors: list[str] = []
    if "insufficient_disclosed_data" not in text:
        errors.append("hazard.ts must emit insufficient_disclosed_data")
    if "claimClass" not in text:
        errors.append("hazard.ts must surface claimClass from the artifact")
    if re.search(r"acquisition probability", text, re.IGNORECASE):
        errors.append("hazard.ts must not mention acquisition probability")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=ROOT)
    args = parser.parse_args()
    root = args.root.resolve()
    errors = check_artifact(root) + check_surfaces(root) + check_ts_consumer(root)
    if errors:
        print("claim consistency failed:", file=sys.stderr)
        for err in errors:
            print(f"  {err}", file=sys.stderr)
        return 1
    print("claim consistency: ok")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
