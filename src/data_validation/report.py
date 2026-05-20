"""
Generate human-readable and machine-readable validation reports.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from src.data_validation.validators import ValidationResult, ValidationSeverity


def summary_stats(results: list[ValidationResult]) -> dict[str, Any]:
    """Compute aggregate statistics from validation results."""
    total = len(results)
    passed = sum(1 for r in results if r.passed)
    failed = sum(1 for r in results if not r.passed)
    errors = sum(
        1 for r in results if not r.passed and r.severity == ValidationSeverity.ERROR
    )
    warnings = sum(
        1 for r in results if not r.passed and r.severity == ValidationSeverity.WARNING
    )
    artifacts_checked = len({r.artifact for r in results})
    artifacts_with_issues = len({r.artifact for r in results if not r.passed})
    return {
        "total_checks": total,
        "passed": passed,
        "failed": failed,
        "errors": errors,
        "warnings": warnings,
        "artifacts_checked": artifacts_checked,
        "artifacts_with_issues": artifacts_with_issues,
        "pass_rate": f"{passed / total:.1%}" if total else "N/A",
    }


def format_text_report(results: list[ValidationResult]) -> str:
    """Format results as a human-readable text report."""
    lines: list[str] = []
    stats = summary_stats(results)
    lines.append("=" * 70)
    lines.append("DATA VALIDATION REPORT")
    lines.append(f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}")
    lines.append("=" * 70)
    lines.append("")
    lines.append(f"Total checks: {stats['total_checks']}")
    lines.append(f"Passed:       {stats['passed']}")
    lines.append(f"Failed:       {stats['failed']} ({stats['errors']} errors, {stats['warnings']} warnings)")
    lines.append(f"Pass rate:    {stats['pass_rate']}")
    lines.append(f"Artifacts:    {stats['artifacts_checked']} checked, {stats['artifacts_with_issues']} with issues")
    lines.append("")

    failures = [r for r in results if not r.passed]
    if failures:
        lines.append("-" * 70)
        lines.append("FAILURES")
        lines.append("-" * 70)
        by_artifact: dict[str, list[ValidationResult]] = {}
        for r in failures:
            by_artifact.setdefault(r.artifact, []).append(r)
        for artifact in sorted(by_artifact):
            lines.append(f"\n  {artifact}:")
            for r in by_artifact[artifact]:
                icon = "ERROR" if r.severity == ValidationSeverity.ERROR else "WARN"
                lines.append(f"    [{icon}] {r.check}: {r.message}")
    else:
        lines.append("All checks passed.")

    lines.append("")
    lines.append("=" * 70)
    return "\n".join(lines)


def format_json_report(results: list[ValidationResult]) -> str:
    """Format results as a JSON report."""
    report = {
        "generated_utc": datetime.now(timezone.utc).isoformat(),
        "summary": summary_stats(results),
        "results": [r.as_dict() for r in results],
    }
    return json.dumps(report, indent=2, default=str)


def write_report(
    results: list[ValidationResult],
    output_dir: str | Path = "data",
    *,
    text: bool = True,
    json_out: bool = True,
) -> list[Path]:
    """Write validation reports to disk. Returns list of written file paths."""
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    written: list[Path] = []

    if text:
        txt_path = output_dir / "validation_report.txt"
        txt_path.write_text(format_text_report(results), encoding="utf-8")
        written.append(txt_path)

    if json_out:
        json_path = output_dir / "validation_report.json"
        json_path.write_text(format_json_report(results), encoding="utf-8")
        written.append(json_path)

    return written
