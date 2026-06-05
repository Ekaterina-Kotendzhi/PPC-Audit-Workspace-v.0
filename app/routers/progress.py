from __future__ import annotations

import asyncio
import json

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AuditProject
from app.services.progress_service import get_progress

router = APIRouter(tags=["progress"])


@router.get("/api/audits/{audit_id}/progress")
def read_progress(audit_id: int, db: Session = Depends(get_db)):
    project = db.query(AuditProject).filter(AuditProject.id == audit_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Аудит не найден")
    payload = get_progress(audit_id)
    payload["project_status"] = project.status
    return payload


@router.websocket("/ws/audits/{audit_id}/status")
async def audit_status_ws(websocket: WebSocket, audit_id: int):
    await websocket.accept()
    last_payload = None
    try:
        while True:
            payload = get_progress(audit_id)
            encoded = json.dumps(payload, ensure_ascii=False, sort_keys=True)
            if encoded != last_payload:
                await websocket.send_text(encoded)
                last_payload = encoded
            terminal = payload.get("status") in {"completed", "needs_review", "failed", "success", "draft", "idle"}
            if terminal and int(payload.get("percent") or 0) >= 100:
                await asyncio.sleep(0.8)
                break
            if terminal and payload.get("step") == "reset":
                await asyncio.sleep(0.4)
                break
            await asyncio.sleep(0.6)
    except WebSocketDisconnect:
        return
    except Exception:
        # Клиент закрыл вкладку / обрыв WS — не роняем воркер uvicorn
        return
