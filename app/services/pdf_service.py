from __future__ import annotations

import re
from datetime import datetime
from pathlib import Path
from typing import Optional

from app.config import settings
from app.models import AuditProject
from app.services.export_service import generate_html_report


class PdfExportError(RuntimeError):
    """Raised when the server cannot create a PDF report."""


EXPORTS_DIR = Path(settings.EXPORT_DIR)
EXPORTS_DIR.mkdir(parents=True, exist_ok=True)


def _safe_filename_part(value: Optional[str]) -> str:
    if not value:
        return "audit"
    value = re.sub(r"[^A-Za-z0-9_-]+", "_", value.strip())
    value = re.sub(r"_+", "_", value).strip("_")
    return value[:80] or "audit"


async def generate_pdf_report(project: AuditProject) -> Path:
    """Render a print-ready HTML report to PDF via Playwright/Chromium."""
    try:
        from playwright.async_api import TimeoutError as PlaywrightTimeoutError
        from playwright.async_api import async_playwright
    except Exception as exc:  # pragma: no cover
        raise PdfExportError(
            "Playwright не установлен. Установите зависимости: pip install -r requirements.txt "
            "и выполните: python -m playwright install --with-deps chromium"
        ) from exc

    html = generate_html_report(project)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    name_part = _safe_filename_part(project.client.name)
    pdf_path = EXPORTS_DIR / f"ppc_audit_{project.id}_{name_part}_{timestamp}.pdf"

    try:
        async with async_playwright() as playwright:
            browser = await playwright.chromium.launch(
                headless=True,
                args=["--no-sandbox", "--disable-dev-shm-usage"],
            )
            page = await browser.new_page(viewport={"width": 1240, "height": 1754}, device_scale_factor=1)
            await page.set_content(html, wait_until="load")
            try:
                await page.wait_for_function("window.__reportReady === true", timeout=8000)
            except PlaywrightTimeoutError:
                pass
            await page.emulate_media(media="print")
            await page.pdf(
                path=str(pdf_path),
                format="A4",
                print_background=True,
                prefer_css_page_size=True,
                display_header_footer=True,
                header_template="<div></div>",
                footer_template=(
                    "<div style='font-size:8px;color:#667085;width:100%;padding:0 12mm;"
                    "display:flex;justify-content:space-between;font-family:Arial,sans-serif;'>"
                    "<span>PPC Audit Workspace</span>"
                    "<span><span class='pageNumber'></span>/<span class='totalPages'></span></span>"
                    "</div>"
                ),
                margin={"top": "14mm", "right": "12mm", "bottom": "16mm", "left": "12mm"},
            )
            await browser.close()
    except Exception as exc:
        pdf_path.unlink(missing_ok=True)
        raise PdfExportError(f"Не удалось сформировать PDF: {exc}") from exc

    if not pdf_path.exists() or pdf_path.stat().st_size == 0:
        raise PdfExportError("PDF-файл не был создан или получился пустым")
    return pdf_path
