from __future__ import annotations

import hashlib
import json
import math
import os
import re
from pathlib import Path
from typing import Any, Dict, List, Optional

import requests

os.environ.setdefault("ANONYMIZED_TELEMETRY", "False")

from app.config import settings, is_force_demo_ai
from app.models import AuditFinding
from app.services.feedback_service import finding_to_dict
from app.services.direct_health_findings_service import is_direct_health_finding
from app.services.finding_direct_link import direct_risk_ref_key, get_direct_risk_ref
from app.services.privacy_service import mask_for_log


CONFIRMED_STATUSES = {"human_confirmed", "human_edited"}
MIN_KB_CONFIDENCE = 0.6
DOC_SOURCE_CONFIRMED = "confirmed_audit_finding"
FINDING_DOC_PREFIX = "finding:"
_DATA_LIMITATION_RE = re.compile(r"недостаточно.*данн", re.IGNORECASE)
_DATA_GAP_TEXT_RE = re.compile(
    r"нужн|не хватает|отсутств|нет выгрузк|для подтверждения|недостаточно данных",
    re.IGNORECASE,
)
_DATA_GAP_AREAS = frozenset(
    {"crm", "semantics", "landing", "analytics", "budget", "structure", "creatives"}
)
_RISK_PATTERN_CONFIRM_KINDS = frozenset({"needs_data", "risk_pattern", "hypothesis", "confirmed"})


def is_data_limitation_problem(problem: str | None) -> bool:
    return bool(problem and _DATA_LIMITATION_RE.search(problem))


def finding_is_data_gap_for_risk_pattern(finding: AuditFinding) -> bool:
    """Match UI «Нужны данные» cards (findings.js isFindingDataGapCard), excluding direct_health."""
    if is_direct_health_finding(finding):
        return False
    kind = str(getattr(finding, "finding_kind", "") or "").strip().lower()
    if kind == "risk_pattern":
        return False
    status = str(getattr(finding, "status", "") or "").strip().lower()
    if status in {"human_confirmed", "human_edited", "human_rejected"}:
        return False
    if kind in {"needs_data"} or is_data_limitation_problem(getattr(finding, "problem", None)):
        return True
    if str(getattr(finding, "missing_data", "") or "").strip():
        return True
    if str(getattr(finding, "review_reason", "") or "").strip():
        return True
    area = str(getattr(finding, "area", "") or "").lower()
    if area in _DATA_GAP_AREAS:
        if bool(getattr(finding, "needs_review", False)):
            return True
        # Согласовано с UI: карточка «Нужны данные» в очереди проверки (ещё не human_confirmed)
        if status not in {"human_confirmed", "human_edited", "human_rejected"}:
            return True
    hay = " ".join(
        str(getattr(finding, field, "") or "")
        for field in ("problem", "recommendation", "missing_data")
    )
    return bool(_DATA_GAP_TEXT_RE.search(hay))


def prepare_risk_pattern_confirm(finding: AuditFinding) -> bool:
    """Normalize finding_kind before risk-pattern confirm when the card is a data-gap in the UI."""
    kind = str(getattr(finding, "finding_kind", "") or "").strip().lower()
    if kind == "risk_pattern":
        return True
    if kind == "needs_data":
        finding.approved_for_kb = False
        return True
    if kind not in _RISK_PATTERN_CONFIRM_KINDS:
        return False
    if not finding_is_data_gap_for_risk_pattern(finding):
        return False
    finding.finding_kind = "needs_data"
    finding.approved_for_kb = False
    return True


def normalize_data_limitation_finding(finding: AuditFinding) -> None:
    """Ensure systemic «needs data» findings never enter global KB unless confirmed as risk_pattern."""
    if getattr(finding, "finding_kind", None) == "risk_pattern":
        finding.approved_for_kb = True
        return
    if getattr(finding, "finding_kind", None) == "needs_data" or is_data_limitation_problem(
        getattr(finding, "problem", None)
    ):
        finding.finding_kind = "needs_data"
        finding.approved_for_kb = False


def _safe_text(value: Any, limit: int = 16000) -> str:
    if isinstance(value, str):
        text = value
    else:
        text = json.dumps(value, ensure_ascii=False, default=str)
    text = re.sub(r"\s+", " ", text).strip()
    return text[:limit]


def _hash_embedding(text: str, dim: int = 384) -> list[float]:
    """Deterministic local fallback embedding for tests/offline demo.

    It is not a semantic model and should not be used for production quality.
    It keeps ChromaDB flows testable without paid embedding calls.
    """
    vector = [0.0] * dim
    tokens = re.findall(r"[a-zа-яё0-9_]+", text.lower())
    if not tokens:
        return vector
    for token in tokens:
        digest = hashlib.sha256(token.encode("utf-8")).digest()
        index = int.from_bytes(digest[:4], "big") % dim
        sign = 1.0 if digest[4] % 2 == 0 else -1.0
        vector[index] += sign
    norm = math.sqrt(sum(v * v for v in vector)) or 1.0
    return [round(v / norm, 8) for v in vector]


class EmbeddingService:
    def __init__(self) -> None:
        self.provider = (settings.EMBEDDING_PROVIDER or "openai").lower()
        self.model = settings.EMBEDDING_MODEL
        self.api_key = settings.OPENAI_API_KEY or settings.AI_API_KEY
        self.api_url = settings.OPENAI_EMBEDDINGS_API_URL.rstrip("/")

    def uses_local_embeddings(self) -> bool:
        return (
            is_force_demo_ai()
            or self.provider == "local_hash"
            or settings.KNOWLEDGE_BASE_USE_LOCAL_EMBEDDINGS
            or not self.api_key
            or self.api_key == "your-api-key-here"
        )

    def embed(self, text: str) -> list[float]:
        text = _safe_text(text)
        if self.uses_local_embeddings():
            return _hash_embedding(text)
        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
        payload = {"model": self.model, "input": text}
        response = requests.post(self.api_url, headers=headers, json=payload, timeout=settings.AI_REQUEST_TIMEOUT_SECONDS)
        response.raise_for_status()
        data = response.json()
        return data["data"][0]["embedding"]


class KnowledgeBaseService:
    """ChromaDB-backed knowledge base for confirmed PPC audit expertise.

    Policy: only human-confirmed/edited findings from real audits (`finding:{id}`).
    Synthetic seed documents and other ids are ignored on search and can be removed
    via cleanup_non_finding_documents().
    """

    def __init__(self) -> None:
        self.enabled = settings.KNOWLEDGE_BASE_ENABLED
        self.provider = (settings.VECTOR_DB_PROVIDER or "chroma").lower()
        self.persist_dir = Path(settings.CHROMA_PERSIST_DIR)
        self.embedding_service = EmbeddingService()
        # Keep demo/local-hash vectors separate from real OpenAI embeddings because
        # Chroma collections have a fixed vector dimension after first insert.
        self.collection_name = settings.CHROMA_COLLECTION_NAME
        if self.embedding_service.uses_local_embeddings() and not self.collection_name.endswith("_local_hash"):
            self.collection_name = f"{self.collection_name}_local_hash"
        self._client = None
        self._collection = None
        self._last_error: Optional[str] = None

    @property
    def last_error(self) -> Optional[str]:
        return self._last_error

    def available(self) -> bool:
        if not self.enabled or self.provider != "chroma":
            return False
        try:
            self._ensure_collection()
            return True
        except Exception as exc:  # noqa: BLE001
            self._last_error = str(exc)
            return False

    def _ensure_collection(self):
        if self._collection is not None:
            return self._collection
        if not self.enabled:
            raise RuntimeError("Knowledge base is disabled")
        if self.provider != "chroma":
            raise RuntimeError(f"Unsupported vector DB provider in MVP: {self.provider}")
        try:
            import chromadb  # type: ignore
        except Exception as exc:  # noqa: BLE001
            raise RuntimeError("chromadb is not installed. Run pip install -r requirements.txt") from exc
        self.persist_dir.mkdir(parents=True, exist_ok=True)
        try:
            from chromadb.config import Settings as ChromaSettings  # type: ignore

            chroma_settings = ChromaSettings(anonymized_telemetry=False)
        except Exception:  # noqa: BLE001
            chroma_settings = None
        self._client = chromadb.PersistentClient(
            path=str(self.persist_dir),
            settings=chroma_settings,
        )
        self._collection = self._client.get_or_create_collection(name=self.collection_name)
        return self._collection

    def _finding_document(self, finding: AuditFinding) -> Dict[str, Any]:
        payload = finding.edited_output or finding.original_ai_output or finding_to_dict(finding)
        project = finding.audit_project
        client = project.client if project else None
        niche = getattr(client, "niche", None) or "не указана"
        area = finding.area or payload.get("area") or "other"
        document = {
            "niche": niche,
            "area": area,
            "status": finding.status,
            "problem": finding.problem or payload.get("problem"),
            "recommendation": finding.recommendation or payload.get("recommendation"),
            "expected_impact": finding.expected_impact or payload.get("expected_impact"),
            "human_comment": finding.human_comment,
            "edited_output": payload,
        }
        return document

    @staticmethod
    def finding_doc_id(finding_id: int) -> str:
        return f"{FINDING_DOC_PREFIX}{finding_id}"

    @staticmethod
    def is_confirmed_finding_doc(doc_id: str | None, metadata: dict[str, Any] | None = None) -> bool:
        if doc_id and str(doc_id).startswith(FINDING_DOC_PREFIX):
            return True
        meta = metadata or {}
        return meta.get("doc_source") == DOC_SOURCE_CONFIRMED or bool(meta.get("finding_id"))

    def finding_kb_eligible(self, finding: AuditFinding) -> bool:
        return self._eligibility_reason(finding) is None

    @staticmethod
    def _direct_risk_ref_metadata(finding: AuditFinding) -> dict[str, str]:
        ref = get_direct_risk_ref(finding)
        if not ref:
            return {}
        return {
            "direct_risk_ref_kind": str(ref["kind"]),
            "direct_risk_ref_id": str(ref["id"]),
            "direct_risk_ref_key": direct_risk_ref_key(ref),
        }

    def _eligibility_reason(self, finding: AuditFinding) -> str | None:
        if not self.enabled:
            return "kb_disabled"
        if is_direct_health_finding(finding):
            return "direct_health_source"
        if finding.status not in CONFIRMED_STATUSES:
            return "status_not_confirmed"
        if getattr(finding, "finding_kind", None) == "risk_pattern":
            pass
        elif getattr(finding, "finding_kind", None) == "needs_data" or is_data_limitation_problem(
            getattr(finding, "problem", None)
        ):
            return "needs_data_limitation"
        if not bool(getattr(finding, "approved_for_kb", False)):
            return "not_approved_for_kb"
        if bool(finding.needs_review):
            return "needs_review"
        confidence = finding.confidence
        if finding.status not in CONFIRMED_STATUSES:
            if confidence is None or confidence < MIN_KB_CONFIDENCE:
                return "low_confidence"
        if not (finding.problem or "").strip():
            return "missing_problem"
        if not (finding.recommendation or "").strip():
            return "missing_recommendation"
        if not (finding.expected_impact or "").strip():
            return "missing_impact"
        return None

    def delete_finding(self, finding_id: int) -> bool:
        if not self.enabled:
            return False
        try:
            collection = self._ensure_collection()
            collection.delete(ids=[self.finding_doc_id(finding_id)])
            return True
        except Exception as exc:  # noqa: BLE001
            self._last_error = str(exc)
            return False

    def sync_finding(self, finding: AuditFinding) -> bool:
        """Upsert into KB when eligible; remove stale index when not."""
        if self._eligibility_reason(finding):
            self.delete_finding(finding.id)
            return False
        return self.save_finding(finding)

    def save_finding(self, finding: AuditFinding) -> bool:
        reason = self._eligibility_reason(finding)
        if reason:
            self._last_error = f"Skipped finding {finding.id}: {reason}"
            return False
        try:
            collection = self._ensure_collection()
            document = self._finding_document(finding)
            text = _safe_text(document)
            embedding = self.embedding_service.embed(text)
            doc_id = self.finding_doc_id(finding.id)
            doc_source = (
                "risk_pattern"
                if getattr(finding, "finding_kind", None) == "risk_pattern"
                else DOC_SOURCE_CONFIRMED
            )
            metadata = {
                "doc_source": doc_source,
                "finding_id": str(finding.id),
                "audit_project_id": str(finding.audit_project_id),
                "niche": str(document.get("niche") or ""),
                "area": str(document.get("area") or ""),
                "status": str(finding.status or ""),
                "finding_kind": str(getattr(finding, "finding_kind", None) or ""),
                **self._direct_risk_ref_metadata(finding),
            }
            # Chroma metadata values must be primitives. Document is masked before storage.
            collection.upsert(
                ids=[doc_id],
                documents=[mask_for_log(text)],
                embeddings=[embedding],
                metadatas=[metadata],
            )
            return True
        except Exception as exc:  # noqa: BLE001
            self._last_error = str(exc)
            return False

    def cleanup_non_finding_documents(self) -> dict[str, int]:
        """Remove legacy synthetic/orphan vectors (e.g. seed_001) from the collection."""
        if not self.enabled:
            return {"removed": 0, "remaining": 0}
        try:
            collection = self._ensure_collection()
            data = collection.get(include=[])
            ids = list(data.get("ids") or [])
            to_remove = [doc_id for doc_id in ids if not str(doc_id).startswith(FINDING_DOC_PREFIX)]
            if to_remove:
                collection.delete(ids=to_remove)
            remaining = len(ids) - len(to_remove)
            return {"removed": len(to_remove), "remaining": remaining}
        except Exception as exc:  # noqa: BLE001
            self._last_error = str(exc)
            return {"removed": 0, "remaining": 0}

    def _document_counts(self) -> dict[str, int]:
        if not self.available():
            return {
                "total_documents": 0,
                "confirmed_finding_count": 0,
                "non_finding_count": 0,
            }
        try:
            collection = self._ensure_collection()
            data = collection.get(include=[])
            ids = list(data.get("ids") or [])
            confirmed = sum(1 for doc_id in ids if str(doc_id).startswith(FINDING_DOC_PREFIX))
            return {
                "total_documents": len(ids),
                "confirmed_finding_count": confirmed,
                "non_finding_count": len(ids) - confirmed,
            }
        except Exception as exc:  # noqa: BLE001
            self._last_error = str(exc)
            return {
                "total_documents": 0,
                "confirmed_finding_count": 0,
                "non_finding_count": 0,
            }

    def quality_report(self, findings: list[AuditFinding]) -> dict[str, Any]:
        total = len(findings)
        eligible = 0
        reasons: dict[str, int] = {}
        for finding in findings:
            reason = self._eligibility_reason(finding)
            if reason is None:
                eligible += 1
                continue
            reasons[reason] = reasons.get(reason, 0) + 1
        return {
            "total_findings": total,
            "eligible_for_kb": eligible,
            "skipped": total - eligible,
            "skip_reasons": reasons,
            "min_confidence": MIN_KB_CONFIDENCE,
        }

    def search_similar_examples(self, *, niche: str | None, materials_text: str, metrics: dict[str, Any] | None = None, top_k: int | None = None) -> List[Dict[str, Any]]:
        if not self.enabled:
            return []
        limit = top_k or settings.KNOWLEDGE_BASE_TOP_K
        query_context = {
            "niche": niche or "не указана",
            "materials": materials_text,
            "metrics": metrics or {},
        }
        try:
            collection = self._ensure_collection()
            query_text = _safe_text(query_context)
            query_embedding = self.embedding_service.embed(query_text)
            where = None
            if niche and settings.KNOWLEDGE_BASE_FILTER_BY_NICHE:
                where = {"niche": str(niche)}
            fetch_limit = max(limit * 4, limit)
            result = collection.query(
                query_embeddings=[query_embedding],
                n_results=fetch_limit,
                where=where,
                include=["documents", "metadatas", "distances"],
            )
            documents = (result.get("documents") or [[]])[0]
            metadatas = (result.get("metadatas") or [[]])[0]
            distances = (result.get("distances") or [[]])[0]
            ids = (result.get("ids") or [[]])[0]
            examples: list[dict[str, Any]] = []
            for idx, doc in enumerate(documents):
                meta = metadatas[idx] if idx < len(metadatas) else {}
                doc_id = ids[idx] if idx < len(ids) else None
                if not self.is_confirmed_finding_doc(doc_id, meta):
                    continue
                ref_key = meta.get("direct_risk_ref_key")
                ref_payload = None
                if ref_key and meta.get("direct_risk_ref_kind") and meta.get("direct_risk_ref_id") is not None:
                    ref_payload = {
                        "kind": str(meta.get("direct_risk_ref_kind")),
                        "id": str(meta.get("direct_risk_ref_id")),
                    }
                examples.append({
                    "source": "knowledge_base_confirmed_finding",
                    "finding_id": meta.get("finding_id"),
                    "status": meta.get("status"),
                    "niche": meta.get("niche"),
                    "area": meta.get("area"),
                    "direct_risk_ref": ref_payload,
                    "direct_risk_ref_key": ref_key,
                    "similarity_note": f"distance={distances[idx]:.4f}" if idx < len(distances) and distances[idx] is not None else None,
                    "edited_output": doc,
                    "human_comment": "Проверенный вывод из прошлого аудита (база знаний).",
                })
                if len(examples) >= limit:
                    break
            return examples
        except Exception as exc:  # noqa: BLE001
            self._last_error = str(exc)
            return []

    def status(self) -> Dict[str, Any]:
        available = self.available()
        counts = self._document_counts() if available else {
            "total_documents": 0,
            "confirmed_finding_count": 0,
            "non_finding_count": 0,
        }
        return {
            "enabled": self.enabled,
            "policy": "confirmed_audit_findings_only",
            "provider": self.provider,
            "available": available,
            "collection": self.collection_name,
            "persist_dir": str(self.persist_dir),
            "embedding_provider": self.embedding_service.provider,
            "embedding_model": self.embedding_service.model,
            "local_embeddings": bool(self.embedding_service.uses_local_embeddings()),
            "min_confidence": MIN_KB_CONFIDENCE,
            "last_error": self._last_error,
            **counts,
        }


_kb_service_singleton: KnowledgeBaseService | None = None


def _kb() -> KnowledgeBaseService:
    global _kb_service_singleton
    if _kb_service_singleton is None:
        _kb_service_singleton = KnowledgeBaseService()
    return _kb_service_singleton


def save_finding_to_knowledge_base(finding: AuditFinding) -> bool:
    return _kb().sync_finding(finding)


def delete_finding_from_knowledge_base(finding_id: int) -> bool:
    return _kb().delete_finding(finding_id)


def finding_kb_eligible(finding: AuditFinding) -> bool:
    return _kb().finding_kb_eligible(finding)


def finding_kb_eligibility_reason(finding: AuditFinding) -> str | None:
    return _kb()._eligibility_reason(finding)


def reconcile_project_findings_kb(project) -> int:
    """Fix stale KB flags/docs for needs_data limitations. Returns count of DB fixes."""
    from app.models import AuditFinding

    fixed = 0
    for finding in getattr(project, "findings", None) or []:
        if not isinstance(finding, AuditFinding):
            continue
        before = bool(getattr(finding, "approved_for_kb", False))
        normalize_data_limitation_finding(finding)
        if before and not getattr(finding, "approved_for_kb", False):
            fixed += 1
        _kb().sync_finding(finding)
    return fixed


def purge_kb_for_project_findings(finding_ids: list[int]) -> int:
    removed = 0
    for finding_id in finding_ids:
        if delete_finding_from_knowledge_base(finding_id):
            removed += 1
    return removed


def purge_stale_kb_index(db: Session) -> dict[str, int]:
    """Remove Chroma docs for deleted or ineligible findings."""
    from sqlalchemy.orm import Session as OrmSession

    if not isinstance(db, OrmSession):
        return {"removed": 0}
    service = _kb()
    if not service.enabled:
        return {"removed": 0}
    try:
        collection = service._ensure_collection()
        data = collection.get(include=["metadatas"])
        ids = list(data.get("ids") or [])
        finding_ids = []
        for doc_id in ids:
            if str(doc_id).startswith(FINDING_DOC_PREFIX):
                try:
                    finding_ids.append(int(str(doc_id).replace(FINDING_DOC_PREFIX, "", 1)))
                except ValueError:
                    continue
        if not finding_ids:
            return {"removed": 0}
        rows = {
            row.id: row
            for row in db.query(AuditFinding).filter(AuditFinding.id.in_(finding_ids)).all()
        }
        to_remove: list[str] = []
        for doc_id in ids:
            if not str(doc_id).startswith(FINDING_DOC_PREFIX):
                continue
            try:
                fid = int(str(doc_id).replace(FINDING_DOC_PREFIX, "", 1))
            except ValueError:
                to_remove.append(str(doc_id))
                continue
            row = rows.get(fid)
            if row is None or service._eligibility_reason(row) is not None:
                to_remove.append(str(doc_id))
        if to_remove:
            collection.delete(ids=to_remove)
        return {"removed": len(to_remove)}
    except Exception as exc:  # noqa: BLE001
        service._last_error = str(exc)
        return {"removed": 0}


def cleanup_non_finding_kb_documents() -> dict[str, int]:
    return _kb().cleanup_non_finding_documents()


def search_knowledge_examples(*, niche: str | None, materials_text: str, metrics: dict[str, Any] | None, top_k: int | None = None) -> List[Dict[str, Any]]:
    return _kb().search_similar_examples(niche=niche, materials_text=materials_text, metrics=metrics, top_k=top_k)


def knowledge_base_status() -> Dict[str, Any]:
    return _kb().status()


def knowledge_base_quality_report(findings: list[AuditFinding]) -> dict[str, Any]:
    return _kb().quality_report(findings)
