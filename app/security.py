from __future__ import annotations

from contextvars import ContextVar, Token
from typing import Final

from fastapi import HTTPException, Request

from app.config import settings
from app.services.auth_token_service import parse_access_token

ROLE_ORDER: Final[dict[str, int]] = {"viewer": 1, "marketer": 2, "admin": 3}
_CTX_ROLE: ContextVar[str] = ContextVar("current_role", default="admin")
_CTX_ACTOR: ContextVar[str] = ContextVar("current_actor", default="system")


def normalize_role(raw: str | None) -> str:
    role = (raw or "").strip().lower()
    if role in ROLE_ORDER:
        return role
    return settings.AUTH_DEFAULT_ROLE if settings.AUTH_DEFAULT_ROLE in ROLE_ORDER else "marketer"


def current_role(request: Request) -> str:
    if not settings.AUTH_ENABLED:
        return "admin"
    token_payload = _token_payload_from_request(request)
    if token_payload and token_payload.get("role"):
        return normalize_role(str(token_payload.get("role")))
    if not settings.AUTH_ALLOW_HEADER_FALLBACK:
        return normalize_role(None)
    header_name = settings.AUTH_ROLE_HEADER or "X-User-Role"
    return normalize_role(request.headers.get(header_name))


def current_actor(request: Request) -> str:
    if not settings.AUTH_ENABLED:
        return "local_admin"
    token_payload = _token_payload_from_request(request)
    if token_payload:
        actor = str(token_payload.get("sub") or "").strip()
        if actor:
            return actor
    user_id_header = settings.AUTH_USER_HEADER or "X-User-Id"
    user_name_header = settings.AUTH_USER_NAME_HEADER or "X-User-Name"
    user_id = (request.headers.get(user_id_header) or "").strip()
    user_name = (request.headers.get(user_name_header) or "").strip()
    role = current_role(request)
    if user_id:
        return user_id
    if user_name:
        return user_name
    return f"role:{role}"


def _token_payload_from_request(request: Request) -> dict | None:
    cached = getattr(request.state, "auth_token_payload", None)
    if cached is not None:
        return cached
    token: str | None = None
    auth = (request.headers.get("Authorization") or "").strip()
    if auth.lower().startswith("bearer "):
        token = auth[7:].strip()
    if not token:
        token = (request.cookies.get("ppc_access_token") or "").strip() or None
    payload = parse_access_token(token)
    request.state.auth_token_payload = payload
    return payload


def set_request_identity(request: Request) -> tuple[Token, Token]:
    role = current_role(request)
    actor = current_actor(request)
    request.state.user_role = role
    request.state.actor = actor
    token_role = _CTX_ROLE.set(role)
    token_actor = _CTX_ACTOR.set(actor)
    return token_role, token_actor


def reset_request_identity(tokens: tuple[Token, Token]) -> None:
    token_role, token_actor = tokens
    _CTX_ROLE.reset(token_role)
    _CTX_ACTOR.reset(token_actor)


def get_current_role() -> str:
    return _CTX_ROLE.get()


def get_current_actor() -> str:
    return _CTX_ACTOR.get()


def ensure_role(request: Request, required: str) -> None:
    if not settings.AUTH_ENABLED:
        return
    required_role = normalize_role(required)
    role = current_role(request)
    if ROLE_ORDER[role] < ROLE_ORDER[required_role]:
        raise HTTPException(
            status_code=403,
            detail=f"Недостаточно прав: требуется роль '{required_role}' или выше",
        )


def required_role_for_request(path: str, method: str) -> str | None:
    normalized = path.lower()
    if normalized in {"/health", "/metrics"}:
        return None
    if not normalized.startswith("/api/"):
        return None

    verb = method.upper()
    if verb in {"GET", "HEAD", "OPTIONS"}:
        return "viewer"
    return "marketer"
