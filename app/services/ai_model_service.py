from __future__ import annotations

import json
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from app.config import settings
from app.services.model_pricing_service import pricing_updated_at, usd_to_rub_rate

_DATA_DIR = Path(__file__).resolve().parent.parent / "data"
_CATALOG_PATH = _DATA_DIR / "ai_model_catalog.json"


def _is_placeholder(value: str | None) -> bool:
    if not value:
        return True
    return value.strip() in {"your-api-key-here", "", "changeme", "replace-me"}


def _load_catalog_raw() -> list[dict[str, Any]]:
    with _CATALOG_PATH.open(encoding="utf-8") as handle:
        payload = json.load(handle)
    models = payload.get("models")
    if not isinstance(models, list):
        return []
    return [item for item in models if isinstance(item, dict)]


def get_catalog_entry(model_id: str) -> dict[str, Any] | None:
    for item in _load_catalog_raw():
        if item.get("id") == model_id:
            return item
    return None


def transport_mode() -> str:
    mode = (settings.AI_TRANSPORT or "native").strip().lower()
    return "unified" if mode in {"proxyapi_unified", "unified"} else "native"


def _url_host(url: str) -> str | None:
    if not url:
        return None
    parsed = urlparse(url)
    return parsed.netloc or None


def _is_proxyapi_url(url: str) -> bool:
    return "proxyapi.ru" in (url or "").lower()


def _provider_api_url(provider: str) -> str:
    if transport_mode() == "unified":
        return settings.PROXYAPI_UNIFIED_API_URL
    if provider == "anthropic":
        return settings.ANTHROPIC_API_URL
    return settings.OPENAI_API_URL or settings.AI_API_URL


def _provider_has_key(provider: str) -> bool:
    if provider in {"openai", "gemini"}:
        return not _is_placeholder(settings.OPENAI_API_KEY or settings.AI_API_KEY)
    if provider == "anthropic":
        return not _is_placeholder(settings.ANTHROPIC_API_KEY)
    return False


def _model_api_name(entry: dict[str, Any]) -> str | None:
    if transport_mode() == "unified":
        return entry.get("proxyapi_model_b")
    return entry.get("proxyapi_model_a")


def model_availability(entry: dict[str, Any]) -> tuple[bool, str | None]:
    provider = str(entry.get("provider") or "")
    api_name = _model_api_name(entry)
    if not api_name:
        return False, "Модель недоступна в текущем режиме транспорта"

    if not _provider_has_key(provider):
        return False, "Нет ключа ProxyAPI"

    api_url = _provider_api_url(provider)
    if not settings.AI_ALLOW_DIRECT_PROVIDER and not _is_proxyapi_url(api_url):
        return False, "URL не указывает на ProxyAPI"

    return True, None


def list_available_model_ids() -> list[str]:
    ids: list[str] = []
    for entry in _load_catalog_raw():
        available, _ = model_availability(entry)
        if available:
            ids.append(str(entry["id"]))
    return ids


def default_model_id() -> str:
    available = list_available_model_ids()
    if available:
        if "gpt-4o" in available:
            return "gpt-4o"
        return available[0]
    for entry in _load_catalog_raw():
        model_id = entry.get("id")
        if model_id:
            return str(model_id)
    return "gpt-4o"


def resolve_api_model(entry: dict[str, Any]) -> str | None:
    return _model_api_name(entry)


def provider_api_url(provider: str) -> str:
    return _provider_api_url(provider)


def validate_model_id(model_id: str | None, *, require_available: bool = True) -> dict[str, Any]:
    if not model_id or not str(model_id).strip():
        raise ValueError("Не указана модель AI")
    entry = get_catalog_entry(str(model_id).strip())
    if entry is None:
        raise ValueError(f"Неизвестная модель: {model_id}")
    available, reason = model_availability(entry)
    if require_available and not available:
        raise ValueError(reason or "Модель недоступна")
    return entry


def transport_info() -> dict[str, Any]:
    openai_url = _provider_api_url("openai")
    anthropic_url = _provider_api_url("anthropic")
    hosts = sorted({host for host in (_url_host(openai_url), _url_host(anthropic_url)) if host})
    unified = transport_mode() == "unified"
    return {
        "name": "proxyapi" if any(_is_proxyapi_url(url) for url in (openai_url, anthropic_url)) else "direct",
        "label": "ProxyAPI" if any(_is_proxyapi_url(url) for url in (openai_url, anthropic_url)) else "Direct API",
        "docs_url": "https://proxyapi.ru/docs",
        "mode": "unified" if unified else "native",
        "openai_configured": _provider_has_key("openai"),
        "anthropic_configured": _provider_has_key("anthropic"),
        "unified_compatible_available": unified,
        "hosts": hosts,
    }


def models_catalog_response() -> dict[str, Any]:
    models: list[dict[str, Any]] = []
    for entry in _load_catalog_raw():
        available, disabled_reason = model_availability(entry)
        models.append({
            "id": entry.get("id"),
            "label": entry.get("label"),
            "provider": entry.get("provider"),
            "transport": "proxyapi",
            "available": available,
            "disabled_reason": disabled_reason,
        })
    return {
        "default_model_id": default_model_id(),
        "pricing_updated_at": pricing_updated_at(),
        "usd_to_rub_rate": float(usd_to_rub_rate()),
        "transport": transport_info(),
        "models": models,
        "local_mode": not any(item["available"] for item in models),
    }
