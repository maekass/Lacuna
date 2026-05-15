"""Ensure Playwright Chromium is installed. Run: python3 scripts/playwright_browsers.py"""

from __future__ import annotations

import subprocess
import sys


def chromium_launchable() -> bool:
    try:
        from playwright.sync_api import sync_playwright

        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            browser.close()
        return True
    except Exception as exc:
        msg = str(exc)
        if "Executable doesn't exist" in msg or "doesn't exist at" in msg:
            return False
        raise


def install_chromium() -> None:
    subprocess.run(
        [sys.executable, "-m", "playwright", "install", "chromium"],
        check=True,
    )


def ensure_chromium(*, install: bool = True) -> None:
    if chromium_launchable():
        print("Playwright Chromium: OK")
        return
    if not install:
        raise RuntimeError(
            "Playwright Chromium is missing. Run: python3 -m playwright install chromium"
        )
    print("Installing Playwright Chromium (one-time download)...")
    install_chromium()
    if not chromium_launchable():
        raise RuntimeError("Playwright Chromium install failed.")
    print("Playwright Chromium: OK")


if __name__ == "__main__":
    ensure_chromium()
