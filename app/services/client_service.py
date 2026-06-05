"""Client niche display and PATCH helpers (stage G1)."""
from __future__ import annotations

from typing import Any

from app.models import Client, AuditProject


def format_niche_display(
    *,
    niche_category: str | None = None,
    niche_subcategory: str | None = None,
    legacy_niche: str | None = None,
) -> str | None:
    cat = (niche_category or "").strip()
    sub = (niche_subcategory or "").strip()
    if cat and sub:
        return f"{cat} / {sub}"
    if cat:
        return cat
    if sub:
        return sub
    legacy = (legacy_niche or "").strip()
    return legacy or None


def sync_client_niche_display(client: Client) -> None:
    cat = (client.niche_category or "").strip()
    sub = (client.niche_subcategory or "").strip()
    if cat or sub:
        client.niche = format_niche_display(niche_category=cat, niche_subcategory=sub)


def apply_client_fields(client: Client, data: dict[str, Any]) -> None:
    """Apply partial client update; syncs computed niche column."""
    if "client_name" in data and data["client_name"] is not None:
        client.name = str(data["client_name"]).strip()
    if "region" in data:
        client.region = (data["region"] or "").strip() or None
    if "website" in data:
        client.website = (data["website"] or "").strip() or None
    if "comment" in data:
        client.comment = (data["comment"] or "").strip() or None
    if "niche_category" in data:
        client.niche_category = (data["niche_category"] or "").strip() or None
    if "niche_subcategory" in data:
        client.niche_subcategory = (data["niche_subcategory"] or "").strip() or None
    sync_client_niche_display(client)


def init_client_from_create(
    *,
    client_name: str,
    website: str | None = None,
    comment: str | None = None,
    region: str | None = None,
    niche_category: str | None = None,
    niche_subcategory: str | None = None,
    legacy_niche: str | None = None,
) -> Client:
    client = Client(
        name=client_name.strip(),
        website=(website or "").strip() or None,
        comment=(comment or "").strip() or None,
        region=(region or "").strip() or None,
        niche_category=(niche_category or "").strip() or None,
        niche_subcategory=(niche_subcategory or "").strip() or None,
    )
    if not client.niche_category and not client.niche_subcategory and legacy_niche:
        client.niche = (legacy_niche or "").strip() or None
    else:
        sync_client_niche_display(client)
    return client


def client_info_dict(project: AuditProject) -> dict[str, Any]:
    client = project.client
    return {
        "audit_id": project.id,
        "client_id": client.id if client else None,
        "client_name": client.name if client else "—",
        "region": client.region if client else None,
        "niche_category": client.niche_category if client else None,
        "niche_subcategory": client.niche_subcategory if client else None,
        "niche_display": client.niche if client else None,
        "website": client.website if client else None,
        "comment": client.comment if client else None,
        "goal": project.goal,
    }
