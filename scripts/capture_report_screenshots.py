"""Capture UI and PDF screenshots for submission report."""
from __future__ import annotations

import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

OUT = Path(__file__).resolve().parent.parent / "docs" / "screenshots"
BASE = "http://host.docker.internal:8000"
AUDIT_ID = 1


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 900})

        page.goto(f"{BASE}/audits/{AUDIT_ID}", wait_until="networkidle", timeout=120_000)
        page.wait_for_timeout(3000)
        page.screenshot(path=str(OUT / "01-ui-audit-data.png"), full_page=False)

        page.evaluate("typeof switchTab === 'function' && switchTab('results')")
        page.wait_for_selector("#findingsList .finding-item", timeout=60_000)
        page.wait_for_timeout(1000)
        page.screenshot(path=str(OUT / "02-ui-findings.png"), full_page=False)

        page.evaluate("typeof switchTab === 'function' && switchTab('report')")
        page.wait_for_selector("#reportAiSummaryCard, #reportExecutiveHero", timeout=60_000)
        page.wait_for_timeout(1000)
        page.screenshot(path=str(OUT / "03-ui-report.png"), full_page=False)

        pdf_url = f"{BASE}/api/audits/{AUDIT_ID}/export/pdf"
        html_url = f"{BASE}/api/audits/{AUDIT_ID}/export"
        pdf_path = OUT / "report.pdf"
        resp = page.request.get(pdf_url)
        if resp.ok:
            pdf_path.write_bytes(resp.body())
            preview = browser.new_page(viewport={"width": 900, "height": 1200})
            preview.goto(html_url, wait_until="networkidle", timeout=120_000)
            preview.wait_for_timeout(2000)
            preview.screenshot(path=str(OUT / "04-pdf-preview.png"), full_page=True)
            preview.close()
        else:
            print(f"PDF fetch failed: {resp.status}", file=sys.stderr)

        browser.close()

    print("Saved to", OUT)
    for f in sorted(OUT.iterdir()):
        print(" -", f.name)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
