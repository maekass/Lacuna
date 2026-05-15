"""
Capture wide-viewport screenshots of each Streamlit dashboard page.
Run from project root with Streamlit already running on port 18501:
    python3 scripts/capture_screenshots.py
"""
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE_URL = "http://127.0.0.1:18501"
OUT_DIR = Path(__file__).resolve().parent.parent / "docs" / "screenshots"
OUT_DIR.mkdir(parents=True, exist_ok=True)

PAGES = [
    ("Overview",          "overview.png"),
    ("Health Trends",     "health-trends.png"),
    ("Stock Analysis",    "stock-analysis.png"),
    ("Investment Stages", "investment-stages.png"),
    ("Market Analysis",   "market-analysis.png"),
]

def wait_for_app(page):
    page.wait_for_selector("text=Sickle Cell Investment Analysis", timeout=20000)
    time.sleep(2)   # let Plotly/charts finish rendering

def collapse_sidebar(page):
    """Click the << collapse button if sidebar is open."""
    try:
        btn = page.locator('button[aria-label="Collapse sidebar"]').first
        if btn.is_visible(timeout=2000):
            btn.click()
            time.sleep(0.5)
    except Exception:
        pass
    # fallback: click the double-left-chevron button
    try:
        chevron = page.get_by_role("button", name="keyboard_double_arrow_left").first
        if chevron.is_visible(timeout=2000):
            chevron.click()
            time.sleep(0.5)
    except Exception:
        pass

def select_page(page, label):
    """Click the radio button for the given page label in the sidebar."""
    # expand sidebar if collapsed first
    try:
        expand = page.get_by_role("button", name="keyboard_double_arrow_right").first
        if expand.is_visible(timeout=1500):
            expand.click()
            time.sleep(0.3)
    except Exception:
        pass
    page.get_by_text(label, exact=True).first.click()
    time.sleep(2.5)   # wait for page content + charts

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(viewport={"width": 1440, "height": 900})
        pg = ctx.new_page()

        pg.goto(BASE_URL)
        wait_for_app(pg)

        for page_label, filename in PAGES:
            print(f"  → {page_label}")
            select_page(pg, page_label)
            wait_for_app(pg)
            collapse_sidebar(pg)
            time.sleep(1.5)
            # scroll to top of main content
            pg.evaluate("window.scrollTo(0, 0)")
            time.sleep(0.5)
            dest = OUT_DIR / filename
            pg.screenshot(path=str(dest), full_page=True)
            size = dest.stat().st_size // 1024
            print(f"     saved {filename} ({size} KB, {dest})")

        browser.close()
    print("\nDone — screenshots in", OUT_DIR)

if __name__ == "__main__":
    main()
