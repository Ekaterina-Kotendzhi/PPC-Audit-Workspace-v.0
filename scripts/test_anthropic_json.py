#!/usr/bin/env python3
"""Quick smoke test for Anthropic JSON mode via ProxyAPI."""
from __future__ import annotations

import json
import sys

from app.config import settings
from app.services.ai_json_parse import parse_ai_response_json
from app.services.model_router import AnthropicProvider


def main() -> int:
    model = sys.argv[1] if len(sys.argv) > 1 else "claude-sonnet-4-5"
    provider = AnthropicProvider(
        api_key=settings.ANTHROPIC_API_KEY,
        api_url=settings.ANTHROPIC_API_URL,
        model=model,
    )
    if not provider.is_configured():
        print("Anthropic not configured")
        return 1
    try:
        result = provider.call(
            system_prompt="You are a JSON API. Reply with valid JSON only.",
            user_prompt='Return {"ok": true, "test": "json"}',
            temperature=0,
            max_tokens=200,
            json_mode=True,
        )
        parsed = parse_ai_response_json(result.content)
        print("success:", json.dumps(parsed, ensure_ascii=False))
        print("stop_reason:", (result.raw_response or {}).get("stop_reason"))
        return 0
    except Exception as exc:
        print("FAILED:", type(exc).__name__, exc)
        return 2


if __name__ == "__main__":
    sys.exit(main())
