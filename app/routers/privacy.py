from fastapi import APIRouter

from app.config import settings
from app.services.privacy_service import build_ai_privacy_notice
from app.services.model_router import ModelRouter
from app.services.knowledge_base_service import knowledge_base_status

router = APIRouter(prefix="/api/privacy", tags=["privacy"])


@router.get("/settings")
def get_privacy_settings():
    router = ModelRouter()
    router_summary = router.settings_summary()
    external_ai_enabled = bool(router_summary.get("configured"))
    return {
        # Backward-compatible root fields for tests and simple UI checks.
        # Detailed settings remain in the nested `ai` block.
        "external_ai_enabled": external_ai_enabled,
        "provider_name": settings.AI_PROVIDER_NAME,
        "ai": build_ai_privacy_notice(
            provider_name=settings.AI_PROVIDER_NAME,
            privacy_url=settings.AI_PROVIDER_PRIVACY_URL,
            external_ai_enabled=external_ai_enabled,
        ),
        "defaults": {
            "send_metrics": True,
            "send_business_category": True,
            "send_revenue_sales": not settings.AI_DEFAULT_EXCLUDE_REVENUE,
            "hide_revenue": settings.AI_DEFAULT_EXCLUDE_REVENUE,
            "hide_company_name": True,
            "hide_contacts": True,
            "hide_file_urls": True,
            "require_ai_consent": settings.REQUIRE_AI_CONSENT,
        },
        "temperature": {
            "analysis": settings.AI_TEMPERATURE_ANALYSIS,
            "commercial_offer": settings.AI_TEMPERATURE_CP,
            "ideas": settings.AI_TEMPERATURE_IDEAS,
            "min": settings.AI_TEMPERATURE_MIN,
            "max": settings.AI_TEMPERATURE_MAX,
            "recommendations": [
                "0.0–0.3: точные расчёты, проверка данных",
                "0.3–0.5: основной анализ",
                "0.5–0.7: коммерческое предложение",
                "0.7–1.0: гипотезы и идеи",
            ],
        },
        "model_router": router_summary,
        "feedback_loop": {
            "enabled": settings.FEEDBACK_LOOP_ENABLED,
            "max_examples": settings.FEEDBACK_LOOP_MAX_EXAMPLES,
            "source": "audit_findings + audit_runs + ChromaDB knowledge base",
        },
        "knowledge_base": knowledge_base_status(),
        "speech": {
            "stt_provider": settings.STT_PROVIDER,
            "web_speech_requires_consent": settings.REQUIRE_WEB_SPEECH_CONSENT,
            "web_speech_notice": "Web Speech API работает в Chrome/Edge и может отправлять аудио на серверы Google. Используйте только с явным согласием клиента или замените на локальный Whisper.",
            "local_whisper_available_when": "STT_PROVIDER=local_whisper и установлен faster-whisper или openai-whisper",
        },
        "files": {
            "public_uploads_enabled": False,
            "access_model": "Файлы отдаются только через защищённый endpoint с проверкой audit_id/material_id.",
        },
    }
