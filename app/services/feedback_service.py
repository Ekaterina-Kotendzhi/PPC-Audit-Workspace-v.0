from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.config import settings
from app.models import AuditFinding, AuditRun
from app.services.finding_direct_link import get_direct_risk_ref
from app.services.privacy_service import dumps_masked
from app.security import get_current_actor

FEEDBACK_STATUSES = {"human_confirmed", "human_edited"}


def finding_to_dict(finding: AuditFinding) -> dict[str, Any]:
    """Serialize a finding into the structure used by AI and the UI."""
    try:
        evidence = json.loads(finding.evidence_json) if finding.evidence_json else []
    except Exception:  # noqa: BLE001
        evidence = []
    ref = get_direct_risk_ref(finding)
    payload = {
        "id": finding.id,
        "area": finding.area,
        "finding_kind": getattr(finding, "finding_kind", None) or "hypothesis",
        "severity": finding.severity,
        "problem": finding.problem,
        "evidence": evidence,
        "recommendation": finding.recommendation,
        "expected_impact": finding.expected_impact,
        "confidence": finding.confidence,
        "needs_review": bool(finding.needs_review),
        "review_reason": finding.review_reason,
        "approved_for_kb": bool(getattr(finding, "approved_for_kb", False)),
        "status": finding.status or "ai_generated",
        "illustration_material_id": getattr(finding, "illustration_material_id", None),
        "illustration_caption": getattr(finding, "illustration_caption", None),
    }
    if ref:
        payload["direct_risk_ref"] = ref
    return payload


def ensure_original_ai_output(finding: AuditFinding) -> dict[str, Any]:
    """Freeze the first AI version before a human edits/rejects/confirms it."""
    if finding.original_ai_output:
        return finding.original_ai_output
    original = finding_to_dict(finding)
    original.pop("status", None)
    finding.original_ai_output = original
    return original


def edited_payload_from_finding(finding: AuditFinding) -> dict[str, Any]:
    payload = finding_to_dict(finding)
    payload.pop("id", None)
    return payload


def save_feedback_run(db: Session, finding: AuditFinding, action: str, *, comment: str | None = None) -> None:
    """Persist feedback in audit_runs so it survives future result replacement."""
    extra_terms = []
    try:
        if finding.audit_project and finding.audit_project.client and finding.audit_project.client.name:
            extra_terms.append(finding.audit_project.client.name)
    except Exception:  # noqa: BLE001
        extra_terms = []

    payload = {
        "finding_id": finding.id,
        "status": finding.status,
        "original_ai_output": finding.original_ai_output,
        "edited_output": finding.edited_output or edited_payload_from_finding(finding),
        "human_comment": comment if comment is not None else finding.human_comment,
        "edited_by": finding.edited_by,
        "edited_at": finding.edited_at.isoformat() if finding.edited_at else None,
    }
    db.add(AuditRun(
        audit_project_id=finding.audit_project_id,
        action=action,
        input_json=dumps_masked({"finding_id": finding.id}, extra_terms=extra_terms),
        output_json=dumps_masked(payload, extra_terms=extra_terms, indent=2),
        actor=get_current_actor(),
        status="success",
    ))


def _extract_feedback_from_run(run: AuditRun) -> dict[str, Any] | None:
    if run.action not in {"finding_edit", "finding_confirm", "finding_reject", "finding_comment"}:
        return None
    if not run.output_json:
        return None
    try:
        data = json.loads(run.output_json)
    except Exception:  # noqa: BLE001
        return None
    if not isinstance(data, dict):
        return None
    return {
        "original_ai_output": data.get("original_ai_output"),
        "edited_output": data.get("edited_output"),
        "human_comment": data.get("human_comment"),
        "status": data.get("status") or data.get("action") or run.action,
        "source": "audit_runs",
    }


def collect_feedback_examples(db: Session, audit_project_id: int, *, top_k: int | None = None) -> list[dict[str, Any]]:
    """Collect human corrections for repeat analysis.

    MVP version uses the local DB, not ChromaDB: first current findings with human
    statuses, then persisted feedback events from audit_runs. This gives the model
    practical context without extra infrastructure.
    """
    if not settings.FEEDBACK_LOOP_ENABLED:
        return []
    limit = top_k or settings.FEEDBACK_LOOP_MAX_EXAMPLES
    examples: list[dict[str, Any]] = []

    findings = (
        db.query(AuditFinding)
        .filter(AuditFinding.audit_project_id == audit_project_id)
        .filter(AuditFinding.status.in_(FEEDBACK_STATUSES))
        .order_by(AuditFinding.edited_at.desc(), AuditFinding.created_at.desc())
        .limit(limit)
        .all()
    )
    for f in findings:
        ref = get_direct_risk_ref(f)
        examples.append({
            "original_ai_output": f.original_ai_output or finding_to_dict(f),
            "edited_output": f.edited_output or edited_payload_from_finding(f),
            "human_comment": f.human_comment,
            "status": f.status,
            "source": "audit_findings",
            "direct_risk_ref": ref,
        })

    if len(examples) >= limit:
        return examples[:limit]

    runs = (
        db.query(AuditRun)
        .filter(AuditRun.audit_project_id == audit_project_id)
        .filter(AuditRun.action.in_(["finding_edit", "finding_confirm", "finding_comment"]))
        .order_by(AuditRun.created_at.desc())
        .limit(limit * 3)
        .all()
    )
    seen = {json.dumps(ex.get("original_ai_output"), ensure_ascii=False, sort_keys=True) for ex in examples}
    for run in runs:
        ex = _extract_feedback_from_run(run)
        if not ex:
            continue
        key = json.dumps(ex.get("original_ai_output"), ensure_ascii=False, sort_keys=True)
        if key in seen:
            continue
        seen.add(key)
        examples.append(ex)
        if len(examples) >= limit:
            break
    return examples[:limit]


def _direct_risk_ref_from_example(ex: dict[str, Any]) -> dict[str, str] | None:
    ref = ex.get("direct_risk_ref")
    if isinstance(ref, dict) and ref.get("kind") and ref.get("id") is not None:
        return {"kind": str(ref["kind"]), "id": str(ref["id"])}
    for payload in (ex.get("edited_output"), ex.get("original_ai_output")):
        if not isinstance(payload, dict):
            continue
        nested = payload.get("direct_risk_ref")
        if isinstance(nested, dict) and nested.get("kind") and nested.get("id") is not None:
            return {"kind": str(nested["kind"]), "id": str(nested["id"])}
    return None


def build_feedback_prompt_block(examples: list[dict[str, Any]]) -> str:
    if not examples:
        return ""
    lines = [
        "",
        "---",
        "",
        "## Исправления маркетолога из предыдущих запусков — обязательно учти",
        "Ранее AI сделал выводы, а маркетолог их подтвердил, отклонил или исправил.",
        "Не повторяй ошибки, отклонённые выводы не используй как факт.",
        "Если в примере есть direct_risk_ref — сохраняй тот же ref в новом AI-выводе (обогащение 1:1 риска Excel).",
        "",
    ]
    for idx, ex in enumerate(examples, 1):
        lines.append(f"Пример {idx}:")
        lines.append("- Было: " + json.dumps(ex.get("original_ai_output"), ensure_ascii=False))
        if ex.get("edited_output"):
            lines.append("- Исправлено/подтверждено: " + json.dumps(ex.get("edited_output"), ensure_ascii=False))
        if ex.get("status"):
            lines.append(f"- Статус правки: {ex['status']}")
        if ex.get("human_comment"):
            lines.append(f"- Комментарий маркетолога: {ex['human_comment']}")
        ref = _direct_risk_ref_from_example(ex)
        if ref:
            lines.append(f"- direct_risk_ref (1:1 Excel): {json.dumps(ref, ensure_ascii=False)}")
        lines.append("")
    lines.append("Учти эти правки при новом анализе и не выдумывай данные вместо исправлений маркетолога.")
    return "\n".join(lines)
