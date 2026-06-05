import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


def _secret(name: str, default: str = "") -> str:
    """Read secret from env first, then OS keyring."""
    value = os.getenv(name)
    if value is not None and str(value).strip() != "":
        return value
    backend = (os.getenv("SECRETS_BACKEND", "keyring") or "keyring").strip().lower()
    if backend != "keyring":
        return default
    service = (os.getenv("SECRETS_SERVICE_NAME", "ppc-audit-workspace") or "ppc-audit-workspace").strip()
    try:
        import keyring  # type: ignore
    except Exception:
        return default
    try:
        stored = keyring.get_password(service, name)
    except Exception:
        return default
    return stored if isinstance(stored, str) and stored.strip() else default


def is_force_demo_ai() -> bool:
    """Runtime check: pytest sets PPC_FORCE_DEMO_AI before/during tests."""
    return os.getenv("PPC_FORCE_DEMO_AI", "").lower() in {"1", "true", "yes", "on"}


class Settings:
    APP_NAME: str = "PPC Audit Workspace MVP"
    APP_VERSION: str = "1.4.5"
    APP_DESCRIPTION: str = "Веб-приложение для подготовки предварительного аудита Яндекс Директа и коммерческого предложения"
    
    # База данных
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/data/app.db")
    
    # Папка для загрузок
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", str(BASE_DIR / "app" / "uploads"))
    
    # AI Model Router
    # По умолчанию основной провайдер — Anthropic/Claude, fallback — OpenAI-compatible.
    # Если ключи не заданы, приложение остаётся в безопасном демо-режиме.
    AI_PRIMARY_PROVIDER: str = os.getenv("AI_PRIMARY_PROVIDER", "anthropic")
    AI_FALLBACK_PROVIDER: str = os.getenv("AI_FALLBACK_PROVIDER", "openai")
    AI_ENABLE_FALLBACK: bool = os.getenv("AI_ENABLE_FALLBACK", "true").lower() in {"1", "true", "yes", "on"}
    AI_REQUEST_TIMEOUT_SECONDS: int = int(os.getenv("AI_REQUEST_TIMEOUT_SECONDS", "120"))

    ANTHROPIC_API_KEY: str = _secret("ANTHROPIC_API_KEY", "")
    ANTHROPIC_API_URL: str = os.getenv("ANTHROPIC_API_URL", "https://api.anthropic.com")
    ANTHROPIC_MODEL: str = os.getenv("ANTHROPIC_MODEL", "claude-opus-4-5")
    ANTHROPIC_VERSION: str = os.getenv("ANTHROPIC_VERSION", "2023-06-01")

    OPENAI_API_KEY: str = _secret("OPENAI_API_KEY", "")
    OPENAI_API_URL: str = os.getenv("OPENAI_API_URL", "https://api.openai.com/v1/chat/completions")
    OPENAI_FALLBACK_MODEL: str = os.getenv("OPENAI_FALLBACK_MODEL", "gpt-5.4")
    OPENAI_EMBEDDINGS_API_URL: str = os.getenv("OPENAI_EMBEDDINGS_API_URL", "https://api.openai.com/v1/embeddings")

    # Backward compatibility for older OpenAI-compatible config
    AI_API_KEY: str = _secret("AI_API_KEY", "")
    AI_API_URL: str = os.getenv("AI_API_URL", "https://api.openai.com/v1/chat/completions")
    AI_MODEL: str = os.getenv("AI_MODEL", "gpt-4o")
    AI_PROVIDER_NAME: str = os.getenv("AI_PROVIDER_NAME", "Model Router: Claude primary + OpenAI fallback")
    AI_PROVIDER_PRIVACY_URL: str = os.getenv("AI_PROVIDER_PRIVACY_URL", "")
    AI_FORCE_JSON_RESPONSE_FORMAT: bool = os.getenv("AI_FORCE_JSON_RESPONSE_FORMAT", "true").lower() in {"1", "true", "yes", "on"}
    REQUIRE_AI_CONSENT: bool = os.getenv("REQUIRE_AI_CONSENT", "true").lower() in {"1", "true", "yes", "on"}
    AI_DEFAULT_EXCLUDE_REVENUE: bool = os.getenv("AI_DEFAULT_EXCLUDE_REVENUE", "true").lower() in {"1", "true", "yes", "on"}
    AI_DEFAULT_EXCLUDE_CONTACTS: bool = os.getenv("AI_DEFAULT_EXCLUDE_CONTACTS", "true").lower() in {"1", "true", "yes", "on"}

    # Knowledge base / retrieval feedback loop
    KNOWLEDGE_BASE_ENABLED: bool = os.getenv("KNOWLEDGE_BASE_ENABLED", "true").lower() in {"1", "true", "yes", "on"}
    VECTOR_DB_PROVIDER: str = os.getenv("VECTOR_DB_PROVIDER", "chroma")
    CHROMA_PERSIST_DIR: str = os.getenv("CHROMA_PERSIST_DIR", str(BASE_DIR / "data" / "chroma"))
    CHROMA_COLLECTION_NAME: str = os.getenv("CHROMA_COLLECTION_NAME", "ppc_audit_confirmed_findings")
    KNOWLEDGE_BASE_TOP_K: int = int(os.getenv("KNOWLEDGE_BASE_TOP_K", "3"))
    KNOWLEDGE_BASE_FILTER_BY_NICHE: bool = os.getenv("KNOWLEDGE_BASE_FILTER_BY_NICHE", "false").lower() in {"1", "true", "yes", "on"}
    KNOWLEDGE_BASE_USE_LOCAL_EMBEDDINGS: bool = os.getenv("KNOWLEDGE_BASE_USE_LOCAL_EMBEDDINGS", "false").lower() in {"1", "true", "yes", "on"}

    # M2.13 — KB в чате (дополнение к KNOWLEDGE_BASE_*)
    CHAT_KB_TOP_K: int = int(os.getenv("CHAT_KB_TOP_K", "3"))
    CHAT_KB_MAX_DISTANCE: float = float(os.getenv("CHAT_KB_MAX_DISTANCE", "0.55"))
    EMBEDDING_PROVIDER: str = os.getenv("EMBEDDING_PROVIDER", "openai")
    EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")

    # Температуры AI: ниже = точнее и суше, выше = креативнее.
    AI_TEMPERATURE_ANALYSIS: float = float(os.getenv("AI_TEMPERATURE_ANALYSIS", "0.3"))
    AI_TEMPERATURE_CP: float = float(os.getenv("AI_TEMPERATURE_CP", "0.7"))
    AI_TEMPERATURE_IDEAS: float = float(os.getenv("AI_TEMPERATURE_IDEAS", "0.8"))
    AI_TEMPERATURE_MIN: float = float(os.getenv("AI_TEMPERATURE_MIN", "0.0"))
    AI_TEMPERATURE_MAX: float = float(os.getenv("AI_TEMPERATURE_MAX", "1.0"))

    # M1: выбор модели и стоимость (ProxyAPI)
    AI_TRANSPORT: str = os.getenv("AI_TRANSPORT", "native")  # native | proxyapi_unified
    AI_ALLOW_DIRECT_PROVIDER: bool = os.getenv("AI_ALLOW_DIRECT_PROVIDER", "false").lower() in {"1", "true", "yes", "on"}
    AI_USD_TO_RUB_RATE: float = float(os.getenv("AI_USD_TO_RUB_RATE", "92.0"))
    PROXYAPI_UNIFIED_API_URL: str = os.getenv(
        "PROXYAPI_UNIFIED_API_URL",
        "https://openai.api.proxyapi.ru/v1/chat/completions",
    )

    # Feedback loop: исправления маркетолога добавляются в повторный AI-анализ.
    FEEDBACK_LOOP_ENABLED: bool = os.getenv("FEEDBACK_LOOP_ENABLED", "true").lower() in {"1", "true", "yes", "on"}
    FEEDBACK_LOOP_MAX_EXAMPLES: int = int(os.getenv("FEEDBACK_LOOP_MAX_EXAMPLES", "5"))
    
    # Тесты: PPC_FORCE_DEMO_AI=true блокирует HTTP к ProxyAPI (см. tests/conftest.py).
    # Значение читается через is_force_demo_ai(), не через этот атрибут.
    FORCE_DEMO_AI: bool = False  # legacy; use is_force_demo_ai()

    # Настройки CORS
    # По умолчанию локальный MVP доступен с любого origin.
    # Для продакшена задайте CORS_ORIGINS=http://localhost:8000,https://example.ru
    CORS_ORIGINS: list = [origin.strip() for origin in os.getenv("CORS_ORIGINS", "*").split(",") if origin.strip()]
    
    # Папка для статических файлов
    STATIC_DIR: str = str(BASE_DIR / "app" / "static")
    TEMPLATES_DIR: str = str(BASE_DIR / "app" / "templates")
    
    # Папка для PDF-экспортов
    EXPORT_DIR: str = os.getenv("EXPORT_DIR", str(BASE_DIR / "app" / "exports"))
    
    # Максимальный размер файла для загрузки (50 MB по умолчанию)
    MAX_UPLOAD_SIZE: int = int(os.getenv("MAX_UPLOAD_SIZE", str(50 * 1024 * 1024)))

    # Экспорт в Google Slides через Google Drive API: опционально.
    GOOGLE_SERVICE_ACCOUNT_FILE: str = _secret("GOOGLE_SERVICE_ACCOUNT_FILE", "")
    GOOGLE_DRIVE_FOLDER_ID: str = os.getenv("GOOGLE_DRIVE_FOLDER_ID", "")

    # Speech-to-text стратегия. По умолчанию серверный STT выключен: ручной текст + контроль качества.
    STT_PROVIDER: str = os.getenv("STT_PROVIDER", "manual")  # manual | web_speech | external_stt | server_stt | local_whisper
    LOCAL_WHISPER_MODEL: str = os.getenv("LOCAL_WHISPER_MODEL", "small")
    LOCAL_WHISPER_DEVICE: str = os.getenv("LOCAL_WHISPER_DEVICE", "cpu")
    REQUIRE_WEB_SPEECH_CONSENT: bool = os.getenv("REQUIRE_WEB_SPEECH_CONSENT", "true").lower() in {"1", "true", "yes", "on"}

    # Minimal RBAC (stage 2 hardening). Disabled by default for local MVP compatibility.
    AUTH_ENABLED: bool = os.getenv("AUTH_ENABLED", "false").lower() in {"1", "true", "yes", "on"}
    AUTH_DEFAULT_ROLE: str = os.getenv("AUTH_DEFAULT_ROLE", "marketer").strip().lower()
    AUTH_ROLE_HEADER: str = os.getenv("AUTH_ROLE_HEADER", "X-User-Role").strip()
    AUTH_USER_HEADER: str = os.getenv("AUTH_USER_HEADER", "X-User-Id").strip()
    AUTH_USER_NAME_HEADER: str = os.getenv("AUTH_USER_NAME_HEADER", "X-User-Name").strip()
    UI_STRICT_VIEWER_MODE: bool = os.getenv("UI_STRICT_VIEWER_MODE", "true").lower() in {"1", "true", "yes", "on"}
    AUTH_JWT_SECRET: str = _secret("AUTH_JWT_SECRET", "change-me-dev-secret")
    AUTH_ACCESS_TOKEN_MINUTES: int = int(os.getenv("AUTH_ACCESS_TOKEN_MINUTES", "480"))
    AUTH_ALLOW_HEADER_FALLBACK: bool = os.getenv("AUTH_ALLOW_HEADER_FALLBACK", "true").lower() in {"1", "true", "yes", "on"}
    AUTH_USERS: str = os.getenv("AUTH_USERS", "admin:admin:admin:Administrator,marketer:marketer:marketer:Marketer,viewer:viewer:viewer:Viewer")
    AUTH_LOGIN_MAX_ATTEMPTS: int = int(os.getenv("AUTH_LOGIN_MAX_ATTEMPTS", "7"))
    AUTH_LOGIN_LOCK_MINUTES: int = int(os.getenv("AUTH_LOGIN_LOCK_MINUTES", "15"))

    # OCR для скриншотов: manual | tesseract_cli
    OCR_PROVIDER: str = os.getenv("OCR_PROVIDER", "manual")
    OCR_TESSERACT_CMD: str = os.getenv("OCR_TESSERACT_CMD", "tesseract")
    OCR_TESSERACT_LANG: str = os.getenv("OCR_TESSERACT_LANG", "rus+eng")
    OCR_TESSDATA_PREFIX: str = os.getenv("OCR_TESSDATA_PREFIX", "")
    OCR_TIMEOUT_SECONDS: int = int(os.getenv("OCR_TIMEOUT_SECONDS", "20"))
    OCR_MIN_TEXT_LENGTH: int = int(os.getenv("OCR_MIN_TEXT_LENGTH", "20"))

    # Внешние оповещения по операционному здоровью
    OPS_ALERTS_ENABLED: bool = os.getenv("OPS_ALERTS_ENABLED", "false").lower() in {"1", "true", "yes", "on"}
    OPS_ALERT_MIN_SEVERITY: str = os.getenv("OPS_ALERT_MIN_SEVERITY", "warning")
    OPS_ALERT_COOLDOWN_SECONDS: int = int(os.getenv("OPS_ALERT_COOLDOWN_SECONDS", "900"))
    OPS_ALERT_WEBHOOK_URL: str = _secret("OPS_ALERT_WEBHOOK_URL", "")
    OPS_TELEGRAM_BOT_TOKEN: str = _secret("OPS_TELEGRAM_BOT_TOKEN", "")
    OPS_TELEGRAM_CHAT_ID: str = _secret("OPS_TELEGRAM_CHAT_ID", "")

    # Отображение дат в UI (UTC в БД не меняется)
    DISPLAY_TIMEZONE: str = os.getenv("DISPLAY_TIMEZONE", "Europe/Moscow")
    DISPLAY_TZ_SUFFIX: str = os.getenv("DISPLAY_TZ_SUFFIX", "UTC+3")

settings = Settings()