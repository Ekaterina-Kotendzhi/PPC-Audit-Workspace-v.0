from fastapi import APIRouter, HTTPException

from app.services.templates_service import AUDIT_TEMPLATES, get_template

router = APIRouter(prefix="/api/templates", tags=["templates"])


@router.get("")
def list_templates():
    return AUDIT_TEMPLATES


@router.get("/{template_id}")
def read_template(template_id: str):
    template = get_template(template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Шаблон не найден")
    return template
