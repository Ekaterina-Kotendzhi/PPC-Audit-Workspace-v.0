"""Cache-busting token for static assets (dev: any CSS/JS change bumps version)."""
from __future__ import annotations

from pathlib import Path

from app.config import settings


def static_build_token() -> str:
    """Version query for /static/* — max mtime of main UI assets (JS + CSS)."""
    static = Path(settings.STATIC_DIR)
    stamps: list[int] = []
    for rel in (
        "js/app.js",
        "css/style.css",
        "css/audits-list.css",
    ):
        path = static / rel
        try:
            stamps.append(int(path.stat().st_mtime))
        except OSError:
            continue
    stamp = max(stamps) if stamps else 0
    return f"{settings.APP_VERSION}-{stamp}"
