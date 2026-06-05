"""CRUD helpers for client contacts (stage G2). Contacts are never sent to AI."""
from __future__ import annotations

from typing import Any

from app.models import Client, ClientContact, AuditProject
from app.services.privacy_service import mask_emails, mask_phones


CONTACT_ROLE_PRESETS = ("ЛПР", "Маркетолог", "Специалист", "Другое")


def contact_to_dict(contact: ClientContact) -> dict[str, Any]:
    return {
        "id": contact.id,
        "client_id": contact.client_id,
        "name": contact.name,
        "role": contact.role,
        "phone": contact.phone,
        "email": contact.email,
        "messenger": contact.messenger,
        "comment": contact.comment,
        "sort_order": contact.sort_order or 0,
        "created_at": contact.created_at,
        "updated_at": contact.updated_at,
    }


def list_client_contacts(client: Client) -> list[ClientContact]:
    return sorted(client.contacts or [], key=lambda c: (c.sort_order or 0, c.id or 0))


def next_sort_order(client: Client) -> int:
    contacts = client.contacts or []
    if not contacts:
        return 0
    return max((c.sort_order or 0 for c in contacts), default=-1) + 1


def create_client_contact(client: Client, data: dict[str, Any]) -> ClientContact:
    contact = ClientContact(
        client_id=client.id,
        name=str(data["name"]).strip(),
        role=(data.get("role") or "").strip() or None,
        phone=(data.get("phone") or "").strip() or None,
        email=(data.get("email") or "").strip() or None,
        messenger=(data.get("messenger") or "").strip() or None,
        comment=(data.get("comment") or "").strip() or None,
        sort_order=data.get("sort_order", next_sort_order(client)),
    )
    return contact


def apply_contact_fields(contact: ClientContact, data: dict[str, Any]) -> None:
    if "name" in data and data["name"] is not None:
        contact.name = str(data["name"]).strip()
    if "role" in data:
        contact.role = (data["role"] or "").strip() or None
    if "phone" in data:
        contact.phone = (data["phone"] or "").strip() or None
    if "email" in data:
        contact.email = (data["email"] or "").strip() or None
    if "messenger" in data:
        contact.messenger = (data["messenger"] or "").strip() or None
    if "comment" in data:
        contact.comment = (data["comment"] or "").strip() or None
    if "sort_order" in data and data["sort_order"] is not None:
        contact.sort_order = int(data["sort_order"])


def get_contact_for_client(client: Client, contact_id: int) -> ClientContact | None:
    for contact in client.contacts or []:
        if contact.id == contact_id:
            return contact
    return None


def client_has_contacts(client: Client | None) -> bool:
    return bool(client and client.contacts)


def contact_log_summary(contact: ClientContact, *, action: str) -> str:
    """Privacy-safe audit log line (no raw phone/email)."""
    role = contact.role or "контакт"
    name = contact.name or "—"
    masked_phone = mask_phones(contact.phone or "") if contact.phone else ""
    masked_email = mask_emails(contact.email or "") if contact.email else ""
    parts = [f"{action}: {name} ({role})"]
    if masked_phone and masked_phone != contact.phone:
        parts.append("тел. скрыт")
    elif contact.phone:
        parts.append("тел. указан")
    if masked_email and masked_email != contact.email:
        parts.append("email скрыт")
    elif contact.email:
        parts.append("email указан")
    if contact.messenger:
        parts.append("мессенджер указан")
    return ", ".join(parts)


def assert_contacts_excluded_from_ai_payload(payload: dict[str, Any]) -> None:
    """Guardrail for tests: structured client contacts must not appear in AI input."""
    forbidden_keys = {"client_contacts", "contacts"}
    for key in forbidden_keys:
        if key in payload:
            raise AssertionError(f"AI payload must not include '{key}'")
