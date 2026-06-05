from __future__ import annotations

import json
import logging
import time
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

import requests

logger = logging.getLogger(__name__)

from app.config import settings, is_force_demo_ai
from app.services.ai_model_service import get_catalog_entry, model_availability, resolve_api_model, provider_api_url, transport_mode
from app.services.model_pricing_service import (
    CostDTO,
    UsageDTO,
    calculate_cost,
    normalize_model_usage,
)


class ModelRouterError(RuntimeError):
    """Raised when no configured model provider can return a usable response."""


@dataclass
class ModelCallResult:
    content: str
    provider_used: str
    model_used: str
    fallback_used: bool
    fallback_reason: Optional[str]
    duration_ms: int
    raw_response: Dict[str, Any] | None = None
    model_id: str | None = None
    display_model: str | None = None
    usage: UsageDTO | None = None
    cost_usd: Any = None
    cost_rub: Any = None
    transport_host: str | None = None


RETRYABLE_HTTP_STATUSES = {408, 409, 425, 429, 500, 502, 503, 504}


def _openai_max_tokens_key(model: str) -> str:
    """Use model-specific token key for OpenAI-compatible APIs."""
    lower = (model or "").lower()
    if lower.startswith("gpt-5") or lower.startswith("o1") or lower.startswith("o3") or lower.startswith("o4"):
        return "max_completion_tokens"
    return "max_tokens"


def _post_with_retry(
    url: str,
    *,
    headers: dict[str, str],
    payload: dict[str, Any],
    timeout: int,
    attempts: int = 3,
    base_delay: float = 0.8,
) -> requests.Response:
    """HTTP POST with lightweight retry/backoff for transient failures."""
    last_error: Exception | None = None
    for attempt in range(1, attempts + 1):
        try:
            response = requests.post(
                url,
                headers=headers,
                json=payload,
                timeout=timeout,
            )
            if response.status_code in RETRYABLE_HTTP_STATUSES and attempt < attempts:
                retry_after = response.headers.get("Retry-After")
                if retry_after and str(retry_after).isdigit():
                    sleep_for = max(0.0, float(retry_after))
                else:
                    sleep_for = base_delay * attempt
                time.sleep(sleep_for)
                continue
            return response
        except requests.RequestException as exc:
            last_error = exc
            if attempt >= attempts:
                raise
            time.sleep(base_delay * attempt)
    if last_error:
        raise last_error
    raise RuntimeError("Unexpected retry loop state")


def _is_placeholder(value: str | None) -> bool:
    if not value:
        return True
    return value.strip() in {"your-api-key-here", "", "changeme", "replace-me"}


class BaseProvider:
    name: str = "base"

    def is_configured(self) -> bool:
        raise NotImplementedError

    def call(self, *, system_prompt: str, user_prompt: str, temperature: float, max_tokens: int, timeout_seconds: int | None = None) -> ModelCallResult:
        raise NotImplementedError


class OpenAIProvider(BaseProvider):
    name = "openai"

    def __init__(self, *, api_key: str | None, api_url: str, model: str, display_name: str = "OpenAI") -> None:
        self.api_key = api_key or ""
        self.api_url = api_url
        self.model = model
        self.display_name = display_name

    def is_configured(self) -> bool:
        return not _is_placeholder(self.api_key)

    def call(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        temperature: float,
        max_tokens: int,
        json_mode: bool = True,
        timeout_seconds: int | None = None,
        image_data_urls: list[str] | None = None,
    ) -> ModelCallResult:
        if not self.is_configured():
            raise ModelRouterError(f"{self.display_name}: API key is not configured")
        started = time.perf_counter()
        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
        if image_data_urls:
            user_content: str | list[dict[str, Any]] = [{"type": "text", "text": user_prompt}]
            for url in image_data_urls:
                user_content.append({"type": "image_url", "image_url": {"url": url}})
        else:
            user_content = user_prompt
        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
            ],
            "temperature": temperature,
        }
        payload[_openai_max_tokens_key(self.model)] = max_tokens
        if json_mode and getattr(settings, "AI_FORCE_JSON_RESPONSE_FORMAT", True):
            payload["response_format"] = {"type": "json_object"}
        response = _post_with_retry(
            self.api_url,
            headers=headers,
            payload=payload,
            timeout=timeout_seconds or settings.AI_REQUEST_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        data = response.json()
        try:
            content = data["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError) as exc:
            raise ModelRouterError(f"{self.display_name}: unexpected response schema") from exc
        return ModelCallResult(
            content=content,
            provider_used=self.name,
            model_used=self.model,
            fallback_used=False,
            fallback_reason=None,
            duration_ms=int((time.perf_counter() - started) * 1000),
            raw_response={"id": data.get("id"), "usage": data.get("usage")},
        )


class AnthropicProvider(BaseProvider):
    name = "anthropic"

    def __init__(self, *, api_key: str | None, api_url: str, model: str) -> None:
        self.api_key = api_key or ""
        self.api_url = api_url.rstrip("/")
        self.model = model

    def is_configured(self) -> bool:
        return not _is_placeholder(self.api_key)

    def _resolve_openai_compatible_model(self) -> str:
        """ProxyAPI: Claude через OpenAI-совместимый endpoint с response_format=json_object."""
        from app.services.ai_model_service import get_catalog_entry

        for entry_id in ("claude-opus-4-5", "claude-sonnet-4-5", "claude-haiku-4-5"):
            entry = get_catalog_entry(entry_id)
            if not entry:
                continue
            if str(entry.get("proxyapi_model_a") or "") == self.model:
                return str(entry.get("proxyapi_model_b") or entry.get("proxyapi_model_a") or self.model)
        if self.model.startswith("claude-"):
            return f"anthropic/{self.model}"
        return f"anthropic/{self.model}"

    def _openai_compatible_json_call(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        temperature: float,
        max_tokens: int,
        timeout_seconds: int | None,
        started: float,
    ) -> ModelCallResult | None:
        """ProxyAPI не принимает native structured output (HTTP 400) — JSON через OpenAI API."""
        openai_key = settings.OPENAI_API_KEY or settings.AI_API_KEY
        if _is_placeholder(openai_key):
            return None
        # Старый openai/v1/chat/completions не принимает anthropic/* («Model not supported»).
        # Рабочий путь для Claude + response_format=json_object — unified endpoint ProxyAPI.
        api_url = settings.PROXYAPI_UNIFIED_API_URL or settings.OPENAI_API_URL or settings.AI_API_URL
        if "proxyapi.ru" not in (api_url or "").lower():
            return None
        model_name = self._resolve_openai_compatible_model()
        try:
            result = OpenAIProvider(
                api_key=openai_key,
                api_url=api_url,
                model=model_name,
                display_name="Claude via ProxyAPI OpenAI",
            ).call(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=temperature,
                max_tokens=max_tokens,
                json_mode=True,
                timeout_seconds=timeout_seconds,
            )
            result.provider_used = self.name
            result.model_used = self.model
            result.duration_ms = int((time.perf_counter() - started) * 1000)
            return result
        except Exception as exc:  # noqa: BLE001
            logger.warning("Claude OpenAI-compatible JSON call failed: %s", exc)
            return None

    def _messages_request(
        self,
        *,
        headers: dict[str, str],
        payload: dict[str, Any],
        timeout_seconds: int | None,
        started: float,
    ) -> ModelCallResult:
        response = _post_with_retry(
            f"{self.api_url}/v1/messages",
            headers=headers,
            payload=payload,
            timeout=timeout_seconds or settings.AI_REQUEST_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        data = response.json()
        content_blocks = data.get("content") or []
        text_parts: List[str] = []
        for block in content_blocks:
            if isinstance(block, dict) and block.get("type") == "text":
                text_parts.append(block.get("text") or "")
            elif isinstance(block, str):
                text_parts.append(block)
        content = "\n".join(part for part in text_parts if part).strip()
        if not content:
            raise ModelRouterError("Anthropic: empty response")
        return ModelCallResult(
            content=content,
            provider_used=self.name,
            model_used=self.model,
            fallback_used=False,
            fallback_reason=None,
            duration_ms=int((time.perf_counter() - started) * 1000),
            raw_response={
                "id": data.get("id"),
                "usage": data.get("usage"),
                "stop_reason": data.get("stop_reason"),
            },
        )

    def call(self, *, system_prompt: str, user_prompt: str, temperature: float, max_tokens: int, json_mode: bool = True, timeout_seconds: int | None = None) -> ModelCallResult:
        if not self.is_configured():
            raise ModelRouterError("Anthropic: API key is not configured")
        started = time.perf_counter()
        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": settings.ANTHROPIC_VERSION,
            "content-type": "application/json",
        }
        payload: dict[str, Any] = {
            "model": self.model,
            "system": system_prompt,
            "messages": [{"role": "user", "content": user_prompt}],
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        use_structured = json_mode and getattr(settings, "AI_FORCE_JSON_RESPONSE_FORMAT", True)
        if use_structured:
            via_openai = self._openai_compatible_json_call(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=temperature,
                max_tokens=max_tokens,
                timeout_seconds=timeout_seconds,
                started=started,
            )
            if via_openai is not None:
                return via_openai
            structured_headers = {
                **headers,
                "anthropic-beta": "structured-outputs-2025-11-13",
            }
            structured_payload = {
                **payload,
                "output_format": {
                    "type": "json_schema",
                    "schema": {"type": "object", "additionalProperties": True},
                },
            }
            try:
                return self._messages_request(
                    headers=structured_headers,
                    payload=structured_payload,
                    timeout_seconds=timeout_seconds,
                    started=started,
                )
            except requests.HTTPError as exc:
                status = exc.response.status_code if exc.response is not None else None
                logger.warning(
                    "Anthropic structured JSON unavailable (HTTP %s), falling back to plain mode",
                    status,
                )
            except Exception as exc:  # noqa: BLE001
                logger.warning("Anthropic structured JSON failed (%s), falling back to plain mode", exc)

        return self._messages_request(
            headers=headers,
            payload=payload,
            timeout_seconds=timeout_seconds,
            started=started,
        )


class ModelRouter:
    """Routes analysis calls: Claude/Anthropic primary, OpenAI-compatible fallback.

    The router is intentionally HTTP-based and SDK-free to keep the MVP portable.
    In demo mode or without configured keys, callers should skip the router and use
    deterministic local analysis.
    """

    def __init__(self) -> None:
        self.primary_provider = (settings.AI_PRIMARY_PROVIDER or "anthropic").lower()
        self.fallback_provider = (settings.AI_FALLBACK_PROVIDER or "openai").lower()
        self.providers = {
            "anthropic": AnthropicProvider(
                api_key=settings.ANTHROPIC_API_KEY,
                api_url=settings.ANTHROPIC_API_URL,
                model=settings.ANTHROPIC_MODEL,
            ),
            "openai": OpenAIProvider(
                api_key=settings.OPENAI_API_KEY or settings.AI_API_KEY,
                api_url=settings.OPENAI_API_URL or settings.AI_API_URL,
                model=settings.OPENAI_FALLBACK_MODEL or settings.AI_MODEL,
                display_name="OpenAI fallback",
            ),
            "openai_legacy": OpenAIProvider(
                api_key=settings.AI_API_KEY,
                api_url=settings.AI_API_URL,
                model=settings.AI_MODEL,
                display_name="OpenAI-compatible API",
            ),
        }

    def has_any_configured_provider(self) -> bool:
        if is_force_demo_ai():
            return False
        provider_names = [self.primary_provider]
        if settings.AI_ENABLE_FALLBACK:
            provider_names.append(self.fallback_provider)
        return any(self.providers.get(name) and self.providers[name].is_configured() for name in provider_names)

    def call(self, *, system_prompt: str, user_prompt: str, temperature: float, max_tokens: int = 5000, json_mode: bool = True, timeout_seconds: int | None = None, model_id: str | None = None) -> ModelCallResult:
        if model_id:
            return self.call_for_model(
                model_id=model_id,
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=temperature,
                max_tokens=max_tokens,
                json_mode=json_mode,
                timeout_seconds=timeout_seconds,
            )
        primary = self.providers.get(self.primary_provider)
        if not primary:
            raise ModelRouterError(f"Unknown primary provider: {self.primary_provider}")

        errors: list[str] = []
        try:
            result = primary.call(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=temperature,
                max_tokens=max_tokens,
                json_mode=json_mode,
                timeout_seconds=timeout_seconds,
            )
            return result
        except Exception as exc:  # noqa: BLE001 - fallback should catch provider/network errors
            errors.append(f"primary {self.primary_provider}: {exc}")
            primary_error = str(exc)

        if not settings.AI_ENABLE_FALLBACK:
            raise ModelRouterError("; ".join(errors))

        fallback = self.providers.get(self.fallback_provider)
        if not fallback:
            raise ModelRouterError(f"Unknown fallback provider: {self.fallback_provider}; " + "; ".join(errors))
        try:
            result = fallback.call(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=temperature,
                max_tokens=max_tokens,
                json_mode=json_mode,
                timeout_seconds=timeout_seconds,
            )
            result.fallback_used = True
            result.fallback_reason = primary_error
            return result
        except Exception as exc:  # noqa: BLE001
            errors.append(f"fallback {self.fallback_provider}: {exc}")
            raise ModelRouterError("; ".join(errors))

    def call_text(self, *, system_prompt: str, user_prompt: str, temperature: float, max_tokens: int = 1200, timeout_seconds: int | None = None, model_id: str | None = None) -> ModelCallResult:
        """Plain-text completion (Q&A, no JSON response_format)."""
        if model_id:
            return self.call_for_model(
                model_id=model_id,
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=temperature,
                max_tokens=max_tokens,
                json_mode=False,
                timeout_seconds=timeout_seconds,
            )
        return self.call(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            temperature=temperature,
            max_tokens=max_tokens,
            json_mode=False,
            timeout_seconds=timeout_seconds,
        )

    def _provider_for_entry(self, entry: dict[str, Any]) -> BaseProvider:
        provider = str(entry.get("provider") or "")
        api_model = resolve_api_model(entry)
        if not api_model:
            raise ModelRouterError("Модель недоступна в текущем режиме транспорта")
        if transport_mode() == "unified" or provider == "gemini":
            return OpenAIProvider(
                api_key=settings.OPENAI_API_KEY or settings.AI_API_KEY,
                api_url=provider_api_url(provider),
                model=api_model,
                display_name="ProxyAPI unified",
            )
        if provider == "anthropic":
            return AnthropicProvider(
                api_key=settings.ANTHROPIC_API_KEY,
                api_url=settings.ANTHROPIC_API_URL,
                model=api_model,
            )
        return OpenAIProvider(
            api_key=settings.OPENAI_API_KEY or settings.AI_API_KEY,
            api_url=provider_api_url(provider),
            model=api_model,
            display_name="OpenAI via ProxyAPI",
        )

    def _enrich_result(self, result: ModelCallResult, *, model_id: str, display_model: str, provider: str) -> ModelCallResult:
        from urllib.parse import urlparse

        raw_usage = (result.raw_response or {}).get("usage")
        usage = normalize_model_usage(provider, raw_usage if isinstance(raw_usage, dict) else None)
        cost: CostDTO = calculate_cost(model_id, usage)
        api_url = provider_api_url(provider)
        host = urlparse(api_url).netloc or None
        result.model_id = model_id
        result.display_model = display_model
        result.usage = usage
        result.cost_usd = cost.cost_usd
        result.cost_rub = cost.cost_rub
        result.transport_host = host
        return result

    def call_for_model(
        self,
        *,
        model_id: str,
        system_prompt: str,
        user_prompt: str,
        temperature: float,
        max_tokens: int = 5000,
        json_mode: bool = True,
        timeout_seconds: int | None = None,
        image_data_urls: list[str] | None = None,
    ) -> ModelCallResult:
        entry = get_catalog_entry(model_id)
        if entry is None:
            raise ModelRouterError(f"Неизвестная модель: {model_id}")
        available, reason = model_availability(entry)
        if not available:
            raise ModelRouterError(reason or "Модель недоступна")

        provider_name = str(entry.get("provider") or "")
        display_model = str(entry.get("label") or model_id)
        primary = self._provider_for_entry(entry)
        errors: list[str] = []
        primary_error: str | None = None

        vision_kw = {"image_data_urls": image_data_urls} if isinstance(primary, OpenAIProvider) else {}

        try:
            result = primary.call(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=temperature,
                max_tokens=max_tokens,
                json_mode=json_mode,
                timeout_seconds=timeout_seconds,
                **vision_kw,
            )
            result.provider_used = provider_name
            return self._enrich_result(result, model_id=model_id, display_model=display_model, provider=provider_name)
        except Exception as exc:  # noqa: BLE001
            errors.append(f"primary {provider_name}: {exc}")
            primary_error = str(exc)

        if not settings.AI_ENABLE_FALLBACK:
            raise ModelRouterError("; ".join(errors))

        fallback_name = self.fallback_provider
        fallback = self.providers.get(fallback_name)
        if not fallback or not fallback.is_configured():
            raise ModelRouterError("; ".join(errors))

        fallback_vision_kw = {"image_data_urls": image_data_urls} if isinstance(fallback, OpenAIProvider) else {}

        try:
            result = fallback.call(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=temperature,
                max_tokens=max_tokens,
                json_mode=json_mode,
                timeout_seconds=timeout_seconds,
                **fallback_vision_kw,
            )
            result.fallback_used = True
            result.fallback_reason = primary_error
            fallback_label = getattr(fallback, "model", fallback_name)
            return self._enrich_result(
                result,
                model_id=model_id,
                display_model=f"{display_model} (fallback → {fallback_label})",
                provider=fallback_name,
            )
        except Exception as exc:  # noqa: BLE001
            errors.append(f"fallback {fallback_name}: {exc}")
            raise ModelRouterError("; ".join(errors)) from exc

    def settings_summary(self) -> Dict[str, Any]:
        return {
            "primary_provider": self.primary_provider,
            "primary_model": getattr(self.providers.get(self.primary_provider), "model", None),
            "fallback_enabled": settings.AI_ENABLE_FALLBACK,
            "fallback_provider": self.fallback_provider,
            "fallback_model": getattr(self.providers.get(self.fallback_provider), "model", None),
            "configured": self.has_any_configured_provider(),
        }
