"""Link Direct health risks with AI interpretation findings."""
from __future__ import annotations

import json
from typing import Any

from app.models import AuditFinding
from app.services.direct_health_findings_service import DIRECT_HEALTH_SOURCE, is_direct_health_finding

DirectRiskRef = dict[str, str]


def normalize_direct_risk_ref(raw: Any) -> DirectRiskRef | None:
    if not isinstance(raw, dict):
        return None
    kind = str(raw.get("kind") or "").strip().lower()
    ref_id = raw.get("id")
    if ref_id is None or kind not in {"template", "rule"}:
        return None
    return {"kind": kind, "id": str(ref_id).strip()}


def direct_risk_ref_key(ref: DirectRiskRef | None) -> str:
    if not ref:
        return ""
    return f"{ref['kind']}:{ref['id']}"


def direct_risk_ref_from_evidence(evidence: list[dict[str, Any]]) -> DirectRiskRef | None:
    for item in evidence:
        if not isinstance(item, dict):
            continue
        if item.get("source") != DIRECT_HEALTH_SOURCE:
            continue
        if item.get("kind") == "template" and item.get("template_id"):
            return {"kind": "template", "id": str(item["template_id"])}
        if item.get("kind") == "rule" and item.get("rule_id") is not None:
            return {"kind": "rule", "id": str(item["rule_id"])}
    return None


def _parse_evidence_json(raw: str | None) -> list[dict[str, Any]]:
    if not raw:
        return []
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return []
    if isinstance(data, list):
        return [x for x in data if isinstance(x, dict)]
    return []


def get_direct_risk_ref(finding: AuditFinding | dict[str, Any]) -> DirectRiskRef | None:
    if isinstance(finding, dict):
        ref = normalize_direct_risk_ref(finding.get("direct_risk_ref"))
        if ref:
            return ref
        orig = finding.get("original_ai_output")
        if isinstance(orig, dict):
            ref = normalize_direct_risk_ref(orig.get("direct_risk_ref"))
            if ref:
                return ref
        evidence = finding.get("evidence") or []
        return direct_risk_ref_from_evidence(evidence)

    orig = finding.original_ai_output
    if isinstance(orig, dict):
        ref = normalize_direct_risk_ref(orig.get("direct_risk_ref"))
        if ref:
            return ref
    return direct_risk_ref_from_evidence(_parse_evidence_json(finding.evidence_json))


def is_ai_interpretation_finding(finding: AuditFinding | dict[str, Any]) -> bool:
    if isinstance(finding, dict):
        if finding.get("finding_source") == DIRECT_HEALTH_SOURCE:
            return False
        return bool(get_direct_risk_ref(finding))
    if is_direct_health_finding(finding):
        return False
    return bool(get_direct_risk_ref(finding))


def build_direct_risk_catalog(direct_analytics: dict[str, Any] | None) -> list[dict[str, Any]]:
    """Catalog of Direct risks AI must enrich 1:1 (for prompt)."""
    health = (direct_analytics or {}).get("health") or {}
    catalog: list[dict[str, Any]] = []
    seen: set[str] = set()

    for template in health.get("template_findings") or []:
        tid = str(template.get("template_id") or "").strip()
        if not tid:
            continue
        ref = {"kind": "template", "id": tid}
        key = direct_risk_ref_key(ref)
        if key in seen:
            continue
        seen.add(key)
        catalog.append({
            "direct_risk_ref": ref,
            "title": template.get("title") or "",
            "detail": template.get("detail") or "",
            "recommended_action": template.get("recommended_action") or "",
            "severity": template.get("severity") or "medium",
        })

    for rule in health.get("performance_issues") or []:
        if rule.get("zone") == "coverage":
            continue
        if rule.get("severity") not in ("critical", "high"):
            continue
        rid = rule.get("id")
        if rid is None:
            continue
        ref = {"kind": "rule", "id": str(rid)}
        key = direct_risk_ref_key(ref)
        if key in seen:
            continue
        seen.add(key)
        catalog.append({
            "direct_risk_ref": ref,
            "title": rule.get("title") or "",
            "detail": rule.get("detail") or "",
            "recommended_action": rule.get("action") or "",
            "severity": rule.get("severity") or "high",
        })

    return catalog
