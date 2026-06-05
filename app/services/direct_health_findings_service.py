"""Sync J16 health templates and rule flags into AuditFinding rows."""
from __future__ import annotations

import json
from typing import Any

from sqlalchemy.orm import Session

from app.models import AuditFinding, AuditProject

DIRECT_HEALTH_SOURCE = "direct_health"
_TEMPLATE_AREA = {
    "top3_budget_share": "semantics",
    "conditions_zero_leads": "semantics",
    "cpl_spread_conditions": "semantics",
    "cpl_spread_campaigns": "budget",
}


def _parse_evidence(raw: str | None) -> list[dict[str, Any]]:
    if not raw:
        return []
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return []
    if isinstance(data, list):
        return [x for x in data if isinstance(x, dict)]
    if isinstance(data, dict):
        return [data]
    return []


def is_direct_health_finding(finding: AuditFinding) -> bool:
    evidence_raw = getattr(finding, "evidence_json", None)
    if any(item.get("source") == DIRECT_HEALTH_SOURCE for item in _parse_evidence(evidence_raw)):
        return True
    orig = getattr(finding, "original_ai_output", None)
    return isinstance(orig, dict) and orig.get("source") == DIRECT_HEALTH_SOURCE


def _is_direct_health_finding(finding: AuditFinding) -> bool:
    return is_direct_health_finding(finding)


def _severity_confidence(severity: str) -> float:
    return {
        "critical": 0.92,
        "high": 0.88,
        "medium": 0.82,
        "low": 0.75,
    }.get(severity or "medium", 0.8)


def _template_to_finding(project_id: int, template: dict[str, Any]) -> AuditFinding:
    tid = template.get("template_id") or "unknown"
    severity = template.get("severity") or "medium"
    evidence = [{
        "source": DIRECT_HEALTH_SOURCE,
        "kind": "template",
        "template_id": tid,
        "ref": "direct_analytics.health.template_findings",
    }]
    return AuditFinding(
        audit_project_id=project_id,
        area=_TEMPLATE_AREA.get(tid, "semantics"),
        finding_kind="confirmed",
        title=template.get("title") or "Риск Директа",
        severity=severity,
        problem=template.get("detail") or "",
        evidence_json=json.dumps(evidence, ensure_ascii=False),
        evidence_level="strong",
        based_on="Мастер отчёт Директа / direct_analytics",
        recommendation=template.get("recommended_action") or "",
        expected_impact="Снижение CPL и рост лидов при оптимизации семантики и бюджета.",
        confidence=_severity_confidence(severity),
        needs_review=False,
        status="ai_generated",
        original_ai_output={"source": DIRECT_HEALTH_SOURCE, "template": template, "direct_risk_ref": {"kind": "template", "id": tid}},
    )


def _rule_to_finding(project_id: int, rule: dict[str, Any]) -> AuditFinding:
    severity = rule.get("severity") or "medium"
    rule_id = rule.get("id")
    evidence = [{
        "source": DIRECT_HEALTH_SOURCE,
        "kind": "rule",
        "rule_id": rule_id,
        "zone": rule.get("zone"),
        "ref": "direct_analytics.health.top_issues",
    }]
    zone = rule.get("zone") or "semantics"
    area = "semantics" if zone == "semantics" else "budget" if zone in ("campaigns", "dynamics") else "analytics"
    return AuditFinding(
        audit_project_id=project_id,
        area=area,
        finding_kind="confirmed",
        title=rule.get("title") or "Риск Директа",
        severity=severity,
        problem=rule.get("detail") or "",
        evidence_json=json.dumps(evidence, ensure_ascii=False),
        evidence_level="strong",
        based_on="Автопроверка Excel (оценка кабинета)",
        recommendation=rule.get("action") or "",
        expected_impact="Улучшение эффективности кабинета.",
        confidence=_severity_confidence(severity),
        needs_review=False,
        review_reason=None,
        status="ai_generated",
        original_ai_output={
            "source": DIRECT_HEALTH_SOURCE,
            "rule": rule,
            "direct_risk_ref": {"kind": "rule", "id": str(rule_id)} if rule_id is not None else None,
        },
    )


def sync_direct_health_findings(
    project: AuditProject,
    direct_analytics: dict[str, Any] | None,
    db: Session,
) -> int:
    """Replace direct_health findings; keep AI and human findings intact."""
    health = (direct_analytics or {}).get("health")
    if not health:
        return 0

    for finding in list(project.findings or []):
        if _is_direct_health_finding(finding):
            db.delete(finding)

    created = 0
    seen_titles: set[str] = set()

    for template in health.get("template_findings") or []:
        title = (template.get("title") or "").strip()
        if not title or title in seen_titles:
            continue
        seen_titles.add(title)
        db.add(_template_to_finding(project.id, template))
        created += 1

    for rule in health.get("performance_issues") or []:
        if rule.get("zone") == "coverage":
            continue
        if rule.get("severity") not in ("critical", "high"):
            continue
        title = (rule.get("title") or "").strip()
        if not title or title in seen_titles:
            continue
        seen_titles.add(title)
        db.add(_rule_to_finding(project.id, rule))
        created += 1

    return created
