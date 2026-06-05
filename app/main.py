import json
import logging
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, PlainTextResponse
from pydantic import ValidationError
from app.config import settings
from app.database import init_db, SessionLocal
from app.routers import audits, materials, runs, progress, templates as templates_router, comparison, slides, privacy, findings, knowledge_base, chat, telemetry, ai_models
from app.services.chat_telemetry_service import chat_telemetry, aggregate_chat_telemetry_db, as_prometheus_text
from app.services.ops_telemetry_service import ops_telemetry
from app.security import current_actor, current_role, ensure_role, required_role_for_request, reset_request_identity, set_request_identity
from app.schemas import AuthLoginRequest, AuthLoginResponse
from app.services.auth_security_service import auth_security_limiter
from app.services.auth_token_service import create_access_token
from app.services.asset_build import static_build_token

logger = logging.getLogger("ppc_audit")

@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    build = static_build_token()
    logger.info(
        "PPC Audit started | UI %s | python=%s | cwd=%s",
        build,
        sys.executable,
        os.getcwd(),
    )
    yield


# Создаем приложение
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=settings.APP_DESCRIPTION,
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def role_guard(request: Request, call_next):
    tokens = set_request_identity(request)
    try:
        required = required_role_for_request(request.url.path, request.method)
        if required:
            try:
                ensure_role(request, required)
            except HTTPException as exc:
                return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
        return await call_next(request)
    finally:
        reset_request_identity(tokens)


@app.middleware("http")
async def dev_no_cache_html(request: Request, call_next):
    response = await call_next(request)
    content_type = (response.headers.get("content-type") or "").lower()
    build = static_build_token()
    response.headers["X-UI-Build"] = build
    path = request.url.path or ""
    if "text/html" in content_type or path.startswith("/static/"):
        response.headers["Cache-Control"] = "no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
    return response


@app.middleware("http")
async def ops_request_meter(request: Request, call_next):
    try:
        response = await call_next(request)
        ops_telemetry.record_status(response.status_code)
        return response
    except Exception:
        ops_telemetry.record_status(500)
        raise


def _friendly_validation_message(exc: Exception) -> str:
    if isinstance(exc, ValidationError):
        for err in exc.errors():
            msg = err.get("msg", "")
            if msg.startswith("Value error, "):
                return msg.replace("Value error, ", "", 1)
            if msg and "FriendlyValidationError" not in msg:
                return msg
    return "Проверьте правильность заполнения формы"


@app.exception_handler(RequestValidationError)
async def request_validation_handler(_request: Request, exc: RequestValidationError):
    messages = []
    for err in exc.errors():
        msg = err.get("msg", "")
        if msg.startswith("Value error, "):
            msg = msg.replace("Value error, ", "", 1)
        loc = err.get("loc") or []
        field = loc[-1] if loc else "поле"
        if msg:
            messages.append(f"{field}: {msg}" if field != "body" else msg)
    return JSONResponse(status_code=422, content={"detail": messages[0] if len(messages) == 1 else "; ".join(messages)})


@app.exception_handler(ValidationError)
async def pydantic_validation_handler(_request: Request, exc: ValidationError):
    return JSONResponse(status_code=422, content={"detail": _friendly_validation_message(exc)})


# Статические файлы
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory=settings.STATIC_DIR), name="static")
# Uploads are intentionally not mounted as public static files.
# Files are served only via /api/audits/{audit_id}/materials/{material_id}/file
# with an audit_id/material_id ownership check.

# Шаблоны (cache disabled: Starlette + Jinja3 pass context dict as template name key)
templates = Jinja2Templates(directory=settings.TEMPLATES_DIR)
templates.env.cache = None
templates.env.globals["app_version"] = settings.APP_VERSION


def _html_context(request: Request, **extra):
    """Per-request template context including fresh static_build token."""
    return {
        "request": request,
        "static_build": static_build_token(),
        **extra,
    }


def _template_response(request: Request, name: str, **extra):
    """Starlette 0.27 (template, context) vs 1.x (request, name, context)."""
    ctx = _html_context(request, **extra)
    try:
        import starlette

        parts = [int(x) for x in starlette.__version__.split(".")[:2]]
        major, minor = (parts + [0, 0])[:2]
        if (major, minor) >= (0, 37):
            return templates.TemplateResponse(request, name, ctx)
    except (TypeError, ValueError, AttributeError):
        pass
    return templates.TemplateResponse(name, ctx)


FAVICON_SVG = (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">'
    '<rect width="32" height="32" rx="6" fill="#2f5aa8"/>'
    '<text x="16" y="22" text-anchor="middle" font-size="16" fill="#fff" font-family="sans-serif">P</text>'
    '</svg>'
)


@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    return PlainTextResponse(FAVICON_SVG, media_type="image/svg+xml")


@app.get("/api/dev/ui-build")
def ui_build_info():
    """Проверка, что браузер и сервер на одной версии UI."""
    max_mb = max(1, int(settings.MAX_UPLOAD_SIZE) // (1024 * 1024))
    return {
        "app_version": settings.APP_VERSION,
        "static_build": static_build_token(),
        "has_open_metrics_editor": True,
        "max_upload_mb": max_mb,
        "document_parse_timeout_sec": 120,
        "display_timezone": settings.DISPLAY_TIMEZONE,
        "display_tz_suffix": settings.DISPLAY_TZ_SUFFIX,
    }


@app.get("/api/niche-presets")
def niche_presets():
    """Справочник категорий и подсказок для ниши (G1)."""
    path = Path(__file__).resolve().parent / "data" / "niche_presets.json"
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Справочник ниш не найден")
    return json.loads(path.read_text(encoding="utf-8"))

# Подключаем роутеры
app.include_router(audits.router)
app.include_router(materials.router)
app.include_router(runs.router)
app.include_router(progress.router)
app.include_router(templates_router.router)
app.include_router(comparison.router)
app.include_router(slides.router)
app.include_router(privacy.router)
app.include_router(findings.router)
app.include_router(knowledge_base.router)
app.include_router(chat.router)
app.include_router(ai_models.router)
app.include_router(telemetry.router)

# === Веб-страницы ===

@app.get("/")
def index(request: Request):
    """Витрина аудитов"""
    return _template_response(request, "index.html")

@app.get("/audits/{audit_id}")
def audit_card(request: Request, audit_id: int):
    """Карточка аудита"""
    return _template_response(request, "audit_card.html", audit_id=audit_id)

@app.get("/audit-runs")
def audit_runs_page(request: Request):
    """История запусков"""
    return _template_response(request, "audit_runs.html")


@app.get("/ops-health")
def ops_health_page(request: Request):
    """Операторский экран здоровья системы"""
    return _template_response(request, "ops_health.html")

# Healthcheck
@app.get("/health")
def health():
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "static_build": static_build_token(),
        "python": sys.executable,
    }


@app.get("/metrics", response_class=PlainTextResponse)
def metrics():
    db = SessionLocal()
    try:
        in_memory = chat_telemetry.snapshot()
        persisted = aggregate_chat_telemetry_db(db, hours=24)
        return as_prometheus_text(in_memory, persisted)
    finally:
        db.close()


@app.get("/api/auth/me")
def auth_me(request: Request):
    role = current_role(request)
    token_payload = getattr(request.state, "auth_token_payload", None)
    auth_source = "token" if token_payload else ("header" if settings.AUTH_ENABLED else "disabled")
    actor = current_actor(request)
    user_name = str((token_payload or {}).get("name") or actor)
    return {
        "auth_enabled": bool(settings.AUTH_ENABLED),
        "role": role,
        "actor": actor,
        "user_name": user_name,
        "auth_source": auth_source,
        "can_write": role in {"marketer", "admin"},
        "ui_strict_viewer_mode": bool(settings.UI_STRICT_VIEWER_MODE),
        "role_header": settings.AUTH_ROLE_HEADER,
        "user_header": settings.AUTH_USER_HEADER,
        "user_name_header": settings.AUTH_USER_NAME_HEADER,
    }


def _auth_users() -> list[dict[str, str]]:
    users: list[dict[str, str]] = []
    for row in (settings.AUTH_USERS or "").split(","):
        raw = row.strip()
        if not raw:
            continue
        parts = [p.strip() for p in raw.split(":", 3)]
        if len(parts) < 3:
            continue
        username, password, role = parts[:3]
        display = parts[3] if len(parts) >= 4 and parts[3] else username
        users.append({
            "username": username,
            "password": password,
            "role": role.lower(),
            "name": display,
        })
    return users


@app.post("/api/auth/login", response_model=AuthLoginResponse)
def auth_login(data: AuthLoginRequest, request: Request):
    if not settings.AUTH_ENABLED:
        raise HTTPException(status_code=400, detail="AUTH_ENABLED=false: login недоступен")
    client_ip = (request.client.host if request.client else "") or "unknown"
    allowed, retry_after = auth_security_limiter.check_allowed(data.username, client_ip)
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail=f"Слишком много попыток входа. Повторите через {retry_after} сек.",
        )
    for user in _auth_users():
        if data.username == user["username"] and data.password == user["password"]:
            role = user["role"] if user["role"] in {"viewer", "marketer", "admin"} else "viewer"
            actor = user["username"]
            token = create_access_token(actor=actor, role=role, user_name=user["name"])
            auth_security_limiter.register_success(data.username, client_ip)
            response = JSONResponse(content=AuthLoginResponse(
                access_token=token,
                role=role,
                actor=actor,
                user_name=user["name"],
            ).model_dump())
            expires = datetime.now(timezone.utc) + timedelta(minutes=max(1, int(settings.AUTH_ACCESS_TOKEN_MINUTES)))
            response.set_cookie(
                key="ppc_access_token",
                value=token,
                httponly=True,
                secure=False,
                samesite="lax",
                expires=expires,
                path="/",
            )
            return response
    locked, seconds = auth_security_limiter.register_failure(data.username, client_ip)
    if locked:
        raise HTTPException(
            status_code=429,
            detail=f"Аккаунт временно заблокирован после неудачных попыток. Повторите через {seconds} сек.",
        )
    raise HTTPException(status_code=401, detail="Неверный логин или пароль")


@app.post("/api/auth/logout")
def auth_logout():
    response = JSONResponse(content={"ok": True})
    response.delete_cookie("ppc_access_token", path="/")
    return response