from __future__ import annotations

import json
from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
from typing import Any

from app.config import settings

_DATA_DIR = Path(__file__).resolve().parent.parent / "data"
_PRICING_PATH = _DATA_DIR / "ai_model_pricing.json"

_USD_QUANT = Decimal("0.0001")
_RUB_QUANT = Decimal("0.01")


@dataclass(frozen=True)
class UsageDTO:
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int


@dataclass(frozen=True)
class ModelPricingRow:
    model_id: str
    input_usd_per_1m: Decimal
    output_usd_per_1m: Decimal
    input_rub_per_1m: Decimal | None
    output_rub_per_1m: Decimal | None


@dataclass(frozen=True)
class CostDTO:
    cost_usd: Decimal | None
    cost_rub: Decimal | None


def _load_pricing_file() -> dict[str, Any]:
    with _PRICING_PATH.open(encoding="utf-8") as handle:
        return json.load(handle)


def pricing_updated_at() -> str:
    return str(_load_pricing_file().get("pricing_updated_at") or "")


def usd_to_rub_rate() -> Decimal:
    raw = _load_pricing_file().get("usd_to_rub_rate")
    if raw is not None:
        return Decimal(str(raw))
    return Decimal(str(settings.AI_USD_TO_RUB_RATE))


def get_pricing_row(model_id: str) -> ModelPricingRow | None:
    payload = _load_pricing_file()
    models = payload.get("models") or {}
    row = models.get(model_id)
    if not isinstance(row, dict):
        return None
    # Legacy keys *_per_1k held the same numeric values but were divided by 1000 in code (bug).
    input_usd = row.get("input_usd_per_1m", row.get("input_usd_per_1k", "0"))
    output_usd = row.get("output_usd_per_1m", row.get("output_usd_per_1k", "0"))
    input_rub = row.get("input_rub_per_1m", row.get("input_rub_per_1k"))
    output_rub = row.get("output_rub_per_1m", row.get("output_rub_per_1k"))
    return ModelPricingRow(
        model_id=model_id,
        input_usd_per_1m=Decimal(str(input_usd)),
        output_usd_per_1m=Decimal(str(output_usd)),
        input_rub_per_1m=Decimal(str(input_rub)) if input_rub is not None else None,
        output_rub_per_1m=Decimal(str(output_rub)) if output_rub is not None else None,
    )


def normalize_model_usage(provider: str, raw_usage: dict[str, Any] | None) -> UsageDTO | None:
    if not raw_usage or not isinstance(raw_usage, dict):
        return None
    provider_key = (provider or "").lower()
    if provider_key == "anthropic":
        prompt = raw_usage.get("input_tokens")
        completion = raw_usage.get("output_tokens")
    else:
        prompt = raw_usage.get("prompt_tokens")
        completion = raw_usage.get("completion_tokens")
    if prompt is None and completion is None:
        return None
    prompt_tokens = int(prompt or 0)
    completion_tokens = int(completion or 0)
    total = raw_usage.get("total_tokens")
    total_tokens = int(total) if total is not None else prompt_tokens + completion_tokens
    return UsageDTO(
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        total_tokens=total_tokens,
    )


def calculate_cost(model_id: str, usage: UsageDTO | None) -> CostDTO:
    if usage is None:
        return CostDTO(cost_usd=None, cost_rub=None)
    row = get_pricing_row(model_id)
    if row is None:
        return CostDTO(cost_usd=None, cost_rub=None)

    million = Decimal(1_000_000)
    prompt_m = Decimal(usage.prompt_tokens) / million
    completion_m = Decimal(usage.completion_tokens) / million
    cost_usd = (
        prompt_m * row.input_usd_per_1m + completion_m * row.output_usd_per_1m
    ).quantize(_USD_QUANT, rounding=ROUND_HALF_UP)

    if row.input_rub_per_1m is not None and row.output_rub_per_1m is not None:
        cost_rub = (
            prompt_m * row.input_rub_per_1m + completion_m * row.output_rub_per_1m
        ).quantize(_RUB_QUANT, rounding=ROUND_HALF_UP)
    else:
        cost_rub = (cost_usd * usd_to_rub_rate()).quantize(_RUB_QUANT, rounding=ROUND_HALF_UP)

    return CostDTO(cost_usd=cost_usd, cost_rub=cost_rub)


def format_cost_usd(value: Decimal | None) -> str | None:
    if value is None:
        return None
    return f"{value.quantize(_USD_QUANT, rounding=ROUND_HALF_UP):f}"


def format_cost_rub(value: Decimal | None) -> str | None:
    if value is None:
        return None
    return f"{value.quantize(_RUB_QUANT, rounding=ROUND_HALF_UP):f}"


def usage_to_api_dict(
    *,
    model_id: str,
    model_label: str,
    provider: str,
    usage: UsageDTO | None,
    cost: CostDTO,
    transport_host: str | None,
    fallback_used: bool = False,
    fallback_model_label: str | None = None,
) -> dict[str, Any]:
    row = get_pricing_row(model_id)
    return {
        "model_id": model_id,
        "model_label": model_label,
        "provider": provider,
        "prompt_tokens": usage.prompt_tokens if usage else None,
        "completion_tokens": usage.completion_tokens if usage else None,
        "total_tokens": usage.total_tokens if usage else None,
        "cost_usd": format_cost_usd(cost.cost_usd),
        "cost_rub": format_cost_rub(cost.cost_rub),
        "transport": "proxyapi",
        "transport_host": transport_host,
        "pricing_updated_at": pricing_updated_at(),
        "tariff_input_rub_per_1m": format_cost_rub(row.input_rub_per_1m) if row else None,
        "tariff_output_rub_per_1m": format_cost_rub(row.output_rub_per_1m) if row else None,
        "tariff_input_usd_per_1m": format_cost_usd(row.input_usd_per_1m) if row else None,
        "tariff_output_usd_per_1m": format_cost_usd(row.output_usd_per_1m) if row else None,
        "fallback_used": fallback_used,
        "fallback_model_label": fallback_model_label,
    }
