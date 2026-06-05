"""Server-side OCR for uploaded screenshots."""
from __future__ import annotations

import os
import subprocess
import tempfile
from pathlib import Path
from typing import Any

from app.config import settings


class OCRUnavailable(RuntimeError):
    """Raised when OCR provider is configured but unavailable."""


def _resolve_tessdata_prefix() -> str:
    """Windows Tesseract expects *.traineddata directly under TESSDATA_PREFIX."""
    configured = (getattr(settings, "OCR_TESSDATA_PREFIX", None) or "").strip()
    candidates: list[Path] = []
    if configured:
        p = Path(configured)
        candidates.append(p)
        if p.name.lower() != "tessdata":
            candidates.append(p / "tessdata")
    base = Path(__file__).resolve().parents[2]
    candidates.extend([
        base / "data" / "tessdata",
        Path(r"C:\Program Files\Tesseract-OCR\tessdata"),
    ])
    for folder in candidates:
        if (folder / "eng.traineddata").is_file() or (folder / "rus.traineddata").is_file():
            return str(folder)
    return configured


def _prepare_ocr_images(path: Path) -> list[Path]:
    """Original + preprocessed variants (scale/contrast) for UI screenshots."""
    paths = [path]
    try:
        from PIL import Image, ImageEnhance, ImageFilter
    except ImportError:
        return paths

    try:
        with Image.open(path) as img:
            rgb = img.convert("RGB")
            w, h = rgb.size
            if max(w, h) < 1400:
                scale = 2
                rgb = rgb.resize((w * scale, h * scale), Image.Resampling.LANCZOS)
            gray = ImageEnhance.Contrast(rgb.convert("L")).enhance(1.6)
            sharp = gray.filter(ImageFilter.SHARPEN)
            tmp = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
            sharp.save(tmp.name, format="PNG")
            paths.append(Path(tmp.name))
    except OSError:
        return paths
    return paths


def _cleanup_temp_paths(paths: list[Path], original: Path) -> None:
    for p in paths:
        if p == original:
            continue
        try:
            p.unlink(missing_ok=True)
        except OSError:
            pass


def _run_tesseract_once(
    cmd: str,
    image_path: Path,
    lang: str,
    psm: str,
    env: dict[str, str],
    timeout: int,
) -> tuple[str, str, int]:
    """Returns (stdout_text, stderr_text, return_code). UTF-8 safe on Windows."""
    result = subprocess.run(
        [cmd, str(image_path), "stdout", "-l", lang, "--psm", psm, "--oem", "1"],
        capture_output=True,
        encoding="utf-8",
        errors="replace",
        timeout=timeout,
        check=False,
        env=env,
    )
    return (
        (result.stdout or "").strip(),
        (result.stderr or "").strip(),
        int(result.returncode),
    )


def _pick_best_ocr_text(path: Path) -> tuple[str, str]:
    cmd = settings.OCR_TESSERACT_CMD or "tesseract"
    lang = (getattr(settings, "OCR_TESSERACT_LANG", None) or "rus+eng").strip() or "rus+eng"
    timeout = max(1, int(settings.OCR_TIMEOUT_SECONDS))
    env = os.environ.copy()
    tess_prefix = _resolve_tessdata_prefix()
    if tess_prefix:
        env["TESSDATA_PREFIX"] = tess_prefix

    best = ""
    last_err = ""
    psms = ("6", "4", "11", "3", "12")
    variants = _prepare_ocr_images(path)
    try:
        for variant in variants:
            for psm in psms:
                try:
                    out, err, code = _run_tesseract_once(cmd, variant, lang, psm, env, timeout)
                except FileNotFoundError as exc:
                    raise OCRUnavailable("Tesseract CLI не найден в PATH") from exc
                except subprocess.TimeoutExpired as exc:
                    raise OCRUnavailable(f"OCR timeout after {timeout}s") from exc

                if code != 0 and not out:
                    last_err = err or f"exit {code}"
                    continue
                if err and "Error" in err and not out:
                    last_err = err
                    continue
                if len(out) > len(best):
                    best = out
                if len(best) >= 40:
                    return best, ""
    finally:
        _cleanup_temp_paths(variants, path)

    return best, last_err


def _run_tesseract_cli(path: Path) -> dict[str, Any]:
    text, err = _pick_best_ocr_text(path)
    if not text and err and "Error" in err:
        raise OCRUnavailable(f"Tesseract: {err}")

    return {
        "text": text,
        "provider": "tesseract_cli",
        "confidence": min(0.95, 0.45 + len(text) / 400.0) if text else 0.0,
    }


def extract_text_from_screenshot(path: Path) -> dict[str, Any]:
    """Extract OCR text based on configured provider."""
    provider = (settings.OCR_PROVIDER or "manual").strip().lower()
    if provider in {"manual", "off", "disabled"}:
        return {"text": "", "provider": "manual", "confidence": 0.0}
    if provider == "tesseract_cli":
        return _run_tesseract_cli(path)
    raise OCRUnavailable(f"Неизвестный OCR_PROVIDER: {provider}")
