"""Smoke-test dashboard data paths and optional live Streamlit pages. Run from repo root."""
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

import pandas as pd
import requests

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from scripts.playwright_browsers import ensure_chromium

DATA = ROOT / "data" / "raw"

PAGE_LABELS = [
    "Overview",
    "Health Trends",
    "Stock Analysis",
    "ML Models",
    "Quant Strategy",
    "Portfolio Optimization",
    "Investment Stages",
    "Market Analysis",
]

REQUIRED_FOR_CHARTS = {
    "Overview": ["gene_therapy_pipeline_scd.csv", "fda_approvals_scd.csv"],
    "Health Trends": ["cdc_sickle_cell_data.csv", "clinical_trials_scd.csv"],
    "Stock Analysis": ["company_financials.csv"],
    "Investment Stages": ["vc_deals_scd.csv", "growth_equity_deals_scd.csv"],
    "Market Analysis": ["market_size_scd.csv", "investment_attractiveness_scd.csv"],
}


def _trials_by_start_year(trials: pd.DataFrame) -> pd.DataFrame:
    df = trials.copy()
    if "start_date" not in df.columns:
        return pd.DataFrame(columns=["year", "trial_count"])
    df["start_date"] = pd.to_datetime(df["start_date"], errors="coerce")
    df = df.dropna(subset=["start_date"])
    if df.empty:
        return pd.DataFrame(columns=["year", "trial_count"])
    counts = df.groupby(df["start_date"].dt.year).size().reset_index(name="trial_count")
    counts.columns = ["year", "trial_count"]
    return counts.sort_values("year")


def check_data() -> list[str]:
    errors: list[str] = []
    for page, files in REQUIRED_FOR_CHARTS.items():
        for name in files:
            path = DATA / name
            if not path.exists():
                errors.append(f"{page}: missing {name}")
                continue
            df = pd.read_csv(path)
            if df.empty:
                errors.append(f"{page}: empty {name}")
    cdc_path = DATA / "cdc_sickle_cell_data.csv"
    if cdc_path.exists():
        cdc = pd.read_csv(cdc_path)
        if "scd_prevalence_us" not in cdc.columns:
            errors.append("Health Trends: cdc missing scd_prevalence_us")
    trials_path = DATA / "clinical_trials_scd.csv"
    if trials_path.exists():
        trials = pd.read_csv(trials_path)
        if not trials.empty and _trials_by_start_year(trials).empty:
            errors.append("Health Trends: trials CSV has no parseable start_date for chart")
    return errors


def discover_streamlit_base() -> str | None:
    """Return first reachable Streamlit URL (8501 default, then 18501 for screenshots)."""
    env = os.environ.get("STREAMLIT_SMOKE_URL")
    if env:
        candidates = [env.rstrip("/")]
    else:
        candidates = ["http://127.0.0.1:8501", "http://127.0.0.1:18501"]
    for base in candidates:
        try:
            if requests.get(base, timeout=5).status_code == 200:
                return base
        except requests.RequestException:
            continue
    return None


def check_streamlit(base: str | None = None, *, install_browsers: bool = True) -> list[str]:
    errors: list[str] = []
    if base is None:
        base = discover_streamlit_base()
    if base is None:
        errors.append(
            "Streamlit not reachable at http://127.0.0.1:8501 or :18501 — "
            "start with: streamlit run dashboard/app.py"
        )
        return errors

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        errors.append("playwright not installed — pip install playwright && python3 -m playwright install chromium")
        return errors

    try:
        ensure_chromium(install=install_browsers)
    except Exception as exc:
        errors.append(f"Playwright browsers: {exc}")
        return errors

    pages = PAGE_LABELS
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.goto(base)
        page.wait_for_selector("text=Navigation", timeout=25000)
        for label in pages:
            try:
                expand = page.get_by_role("button", name="keyboard_double_arrow_right").first
                if expand.is_visible(timeout=1000):
                    expand.click()
                page.locator("label").filter(has_text=label).first.click(timeout=5000)
                page.wait_for_timeout(2000)
                if page.locator('[data-testid="stException"]').count() > 0:
                    msg = page.locator('[data-testid="stException"]').first.inner_text()[:200]
                    errors.append(f"{label}: Streamlit exception — {msg}")
            except Exception as e:
                errors.append(f"{label}: navigation failed — {e}")
        browser.close()
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description="Dashboard data + optional Playwright UI smoke test")
    parser.add_argument(
        "--url",
        default=None,
        help="Streamlit base URL (default: auto-detect :8501 then :18501)",
    )
    parser.add_argument(
        "--skip-ui",
        action="store_true",
        help="Only run data/CSV checks",
    )
    parser.add_argument(
        "--no-install-browsers",
        action="store_true",
        help="Do not auto-run playwright install chromium",
    )
    args = parser.parse_args()

    print("=== Dashboard smoke test ===\n")
    data_errors = check_data()
    if data_errors:
        print("DATA issues:")
        for e in data_errors:
            print(f"  ✗ {e}")
    else:
        print("DATA: OK (required CSVs present and non-empty)")

    if args.skip_ui:
        return 1 if data_errors else 0

    base = args.url or discover_streamlit_base()
    print(f"\nChecking Streamlit at {base or '(not running)'} ...")
    print("(Start with: streamlit run dashboard/app.py)\n")
    ui_errors = check_streamlit(
        base,
        install_browsers=not args.no_install_browsers,
    )
    if ui_errors:
        print("UI issues:")
        for e in ui_errors:
            print(f"  ✗ {e}")
    elif not any("not reachable" in e or "not installed" in e for e in ui_errors):
        print("UI: OK (all sidebar pages loaded without exceptions)")

    failed = bool(data_errors) or bool(ui_errors and not all("not reachable" in e or "not installed" in e for e in ui_errors))
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
