"""AI JSON extraction and repair."""
from __future__ import annotations

import json

import pytest

from app.services.ai_json_parse import extract_json_from_response, parse_ai_response_json


def test_extract_json_from_markdown_fence():
    raw = '```json\n{"ok": true}\n```'
    assert extract_json_from_response(raw) == '{"ok": true}'


def test_parse_ai_response_json_repairs_trailing_comma():
    data = parse_ai_response_json('{"findings": [], "metrics": {"leads": 1,},}')
    assert data["metrics"]["leads"] == 1


def test_parse_ai_response_json_raises_on_garbage():
    with pytest.raises(json.JSONDecodeError):
        parse_ai_response_json("not json at all")
