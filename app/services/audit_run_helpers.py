"""Select latest audit runs by timestamp (joinedload can scramble collection order)."""
from __future__ import annotations

from datetime import datetime, timezone

from app.models import AuditProject, AuditRun


def _run_sort_key(run: AuditRun) -> tuple[datetime, int]:
    dt = run.created_at
    if dt is None:
        dt = datetime.min.replace(tzinfo=timezone.utc)
    elif dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt, run.id or 0


def latest_run(
    project: AuditProject,
    *,
    action: str | None = None,
    status: str | None = "success",
    require_output: bool = False,
) -> AuditRun | None:
    candidates: list[AuditRun] = []
    for run in project.runs or []:
        if status is not None and run.status != status:
            continue
        if action is not None and run.action != action:
            continue
        if require_output and not run.output_json:
            continue
        candidates.append(run)
    if not candidates:
        return None
    return max(candidates, key=_run_sort_key)
