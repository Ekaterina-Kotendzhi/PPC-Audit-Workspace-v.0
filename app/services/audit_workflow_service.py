"""Single entry point for audit workflow: coverage, issues, workflow_ui."""
from __future__ import annotations

from typing import Any

from app.models import AuditProject
from app.services.audit_gate_service import build_analysis_readiness
from app.services.audit_state_service import resolve_workflow_state
from app.services.data_coverage_service import assess_data_coverage
from app.services.review_service import build_review_queue
from app.services.workflow_ui_service import build_data_issues, build_workflow_ui


def build_audit_workflow_context(project: AuditProject) -> dict[str, Any]:
    """Compute readiness, coverage, workflow, issues and workflow_ui once."""
    readiness = build_analysis_readiness(project)
    coverage = assess_data_coverage(project)
    workflow = resolve_workflow_state(project, readiness=readiness, coverage=coverage)
    review_queue = build_review_queue(project)
    if coverage["is_preliminary"]:
        review_queue = [q for q in review_queue if q.item_type == "material"]
    include_findings = not coverage["is_preliminary"] and not workflow["analysis_failed"]
    analysis_completed = workflow.get("state") in {"ANALYSIS_DONE", "REPORT_READY"}
    issues = build_data_issues(
        project,
        coverage=coverage,
        review_queue=review_queue,
        include_findings=include_findings,
        analysis_completed=analysis_completed,
    )
    workflow_ui = build_workflow_ui(
        project,
        issues=issues,
        readiness=readiness,
        workflow=workflow,
        coverage=coverage,
    )
    readiness_out = {
        **readiness,
        "issues_open_count": workflow_ui["issues_open_count"],
        "issues_blocking_count": workflow_ui["issues_blocking_count"],
    }
    return {
        "readiness": readiness_out,
        "coverage": coverage,
        "workflow": workflow,
        "review_queue": review_queue,
        "issues": issues,
        "workflow_ui": workflow_ui,
    }
