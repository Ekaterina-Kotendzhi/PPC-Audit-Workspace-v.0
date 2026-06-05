"""AI model catalog API."""
from __future__ import annotations

from fastapi import APIRouter

from app.services.ai_model_service import models_catalog_response

router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.get("/models")
def get_ai_models():
    """Каталог моделей, транспорт ProxyAPI и дата обновления цен."""
    return models_catalog_response()
