"""Parse and repair JSON from external AI responses (Claude/GPT)."""
from __future__ import annotations

import json
import re
from typing import Any


def extract_json_from_response(text: str) -> str:
    """Извлекает JSON из ответа AI, очищая markdown-обёртки."""
    json_match = re.search(r"```(?:json)?\s*\n?(.*?)\n?```", text, re.DOTALL)
    if json_match:
        return json_match.group(1).strip()
    brace_start = text.find("{")
    brace_end = text.rfind("}")
    if brace_start != -1 and brace_end != -1 and brace_end > brace_start:
        return text[brace_start : brace_end + 1]
    return text.strip()


def _repair_json_text(text: str) -> str:
    """Best-effort fixes for common model JSON syntax mistakes."""
    cleaned = text.strip().lstrip("\ufeff")
    cleaned = re.sub(r",\s*}", "}", cleaned)
    cleaned = re.sub(r",\s*]", "]", cleaned)
    return cleaned


def parse_ai_response_json(text: str) -> dict[str, Any]:
    """Parse AI analysis JSON; raises json.JSONDecodeError if all attempts fail."""
    if not (text or "").strip():
        raise json.JSONDecodeError("AI returned empty content", text or "", 0)

    extracted = extract_json_from_response(text)
    attempts = [extracted, _repair_json_text(extracted)]
    last_error: json.JSONDecodeError | None = None
    for candidate in attempts:
        try:
            parsed = json.loads(candidate)
        except json.JSONDecodeError as exc:
            last_error = exc
            continue
        if not isinstance(parsed, dict):
            raise json.JSONDecodeError("AI JSON root must be an object", candidate, 0)
        return parsed

    if last_error is not None:
        raise last_error
    raise json.JSONDecodeError("AI JSON parse failed", extracted, 0)
