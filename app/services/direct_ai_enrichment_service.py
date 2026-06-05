"""Post-process AI findings for 1:1 Direct risk enrichment (DAI-2)."""
from __future__ import annotations

import re
from typing import Any

from app.services.finding_direct_link import (
    direct_risk_ref_from_evidence,
    direct_risk_ref_key,
    normalize_direct_risk_ref,
)

STUB_REVIEW_REASON = "AI не детализировал — проверьте вручную или перезапустите анализ."
REF_LINK_HINT = (
    "Вывод похож на риск Direct из Excel — укажите direct_risk_ref или перезапустите анализ."
)


def _norm_text(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "").lower().strip())


def _normalize_severity(severity: str | None) -> str:
    if severity == "critical":
        return "high"
    if severity in ("low", "medium", "high"):
        return severity
    return "medium"


def _severity_to_area(severity: str | None) -> str:
    if severity in ("critical", "high"):
        return "budget"
    return "structure"


def _catalog_index(catalog: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    out: dict[str, dict[str, Any]] = {}
    for entry in catalog:
        ref = normalize_direct_risk_ref(entry.get("direct_risk_ref"))
        if not ref:
            continue
        key = direct_risk_ref_key(ref)
        if key:
            out[key] = entry
    return out


def compute_enrichment_coverage(
    catalog: list[dict[str, Any]],
    findings: list[dict[str, Any]],
) -> dict[str, Any]:
    catalog_keys = set(_catalog_index(catalog).keys())
    total = len(catalog_keys)
    covered: set[str] = set()
    for finding in findings:
        ref = normalize_direct_risk_ref(finding.get("direct_risk_ref"))
        if not ref:
            ref = direct_risk_ref_from_evidence(finding.get("evidence") or [])
        key = direct_risk_ref_key(ref)
        if key in catalog_keys:
            covered.add(key)
    missing = [
        _catalog_index(catalog)[key]["direct_risk_ref"]
        for key in sorted(catalog_keys - covered)
    ]
    enriched = len(covered)
    percent = 100 if total == 0 else int(round(100 * enriched / total))
    return {
        "direct_risks_total": total,
        "enriched_count": enriched,
        "missing_refs": missing,
        "coverage_percent": percent,
    }


def _stub_finding(entry: dict[str, Any]) -> dict[str, Any]:
    ref = normalize_direct_risk_ref(entry.get("direct_risk_ref"))
    title = (entry.get("title") or "").strip() or "Риск Direct"
    detail = (entry.get("detail") or "").strip()
    problem = title
    if detail and detail not in problem:
        problem = f"{title}: {detail}"
    evidence: list[dict[str, Any]] = []
    if detail:
        evidence.append({
            "material_id": "direct_excel",
            "material_type": "document",
            "quote_or_description": detail[:500],
        })
    return {
        "area": _severity_to_area(entry.get("severity")),
        "severity": _normalize_severity(entry.get("severity")),
        "finding_kind": "hypothesis",
        "title": title,
        "problem": problem,
        "recommendation": entry.get("recommended_action") or "",
        "expected_impact": "Требуется ручная детализация после AI-анализа.",
        "direct_risk_ref": ref,
        "enrichment_status": "stub",
        "evidence": evidence,
        "confidence": 0.35,
        "needs_review": True,
        "review_reason": STUB_REVIEW_REASON,
    }


def _attach_refs_from_evidence(findings: list[dict[str, Any]], catalog_keys: set[str]) -> None:
    for finding in findings:
        if normalize_direct_risk_ref(finding.get("direct_risk_ref")):
            continue
        ref = direct_risk_ref_from_evidence(finding.get("evidence") or [])
        if ref and direct_risk_ref_key(ref) in catalog_keys:
            finding["direct_risk_ref"] = ref
            finding.setdefault("enrichment_status", "complete")


def _try_fuzzy_attach_ref(
    finding: dict[str, Any],
    catalog: list[dict[str, Any]],
    covered_keys: set[str],
) -> None:
    if normalize_direct_risk_ref(finding.get("direct_risk_ref")):
        return
    blob = _norm_text(finding.get("title") or finding.get("problem"))
    if not blob:
        return
    for entry in catalog:
        ref = normalize_direct_risk_ref(entry.get("direct_risk_ref"))
        if not ref:
            continue
        key = direct_risk_ref_key(ref)
        if key in covered_keys:
            continue
        title = _norm_text(entry.get("title"))
        if title and len(title) >= 6 and title in blob:
            finding["direct_risk_ref"] = ref
            finding["enrichment_status"] = "complete"
            return


def _flag_catalog_overlap_orphans(
    findings: list[dict[str, Any]],
    catalog: list[dict[str, Any]],
) -> None:
    for finding in findings:
        if normalize_direct_risk_ref(finding.get("direct_risk_ref")):
            continue
        blob = _norm_text(finding.get("title") or finding.get("problem"))
        if not blob:
            continue
        for entry in catalog:
            title = _norm_text(entry.get("title"))
            detail = _norm_text(entry.get("detail"))
            if not title:
                continue
            if title in blob or (detail and len(detail) >= 12 and detail[:80] in blob):
                finding["needs_review"] = True
                finding["review_reason"] = finding.get("review_reason") or REF_LINK_HINT
                finding["enrichment_status"] = finding.get("enrichment_status") or "orphan"
                break


def _drop_orphan_duplicates(
    findings: list[dict[str, Any]],
    catalog: list[dict[str, Any]],
    covered_keys: set[str],
) -> list[dict[str, Any]]:
    titles = {
        direct_risk_ref_key(normalize_direct_risk_ref(e.get("direct_risk_ref"))): _norm_text(e.get("title"))
        for e in catalog
        if normalize_direct_risk_ref(e.get("direct_risk_ref"))
    }
    kept: list[dict[str, Any]] = []
    for finding in findings:
        ref = normalize_direct_risk_ref(finding.get("direct_risk_ref"))
        if ref:
            kept.append(finding)
            continue
        ev_ref = direct_risk_ref_from_evidence(finding.get("evidence") or [])
        if ev_ref and direct_risk_ref_key(ev_ref) in covered_keys:
            continue
        blob = _norm_text(finding.get("title") or finding.get("problem"))
        duplicate = False
        for key in covered_keys:
            catalog_title = titles.get(key) or ""
            if catalog_title and len(catalog_title) >= 6 and catalog_title in blob:
                duplicate = True
                break
        if not duplicate:
            if finding.get("enrichment_status") is None:
                finding["enrichment_status"] = "standalone"
            kept.append(finding)
    return kept


def _dedupe_by_ref(findings: list[dict[str, Any]]) -> tuple[dict[str, dict[str, Any]], list[dict[str, Any]]]:
    by_ref: dict[str, dict[str, Any]] = {}
    standalone: list[dict[str, Any]] = []
    for finding in findings:
        if not isinstance(finding, dict):
            continue
        ref = normalize_direct_risk_ref(finding.get("direct_risk_ref"))
        if not ref:
            ref = direct_risk_ref_from_evidence(finding.get("evidence") or [])
        if ref:
            finding = dict(finding)
            finding["direct_risk_ref"] = ref
            if finding.get("enrichment_status") != "stub":
                finding.setdefault("enrichment_status", "complete")
            key = direct_risk_ref_key(ref)
            if key and key not in by_ref:
                by_ref[key] = finding
            elif key and key in by_ref:
                existing = by_ref[key]
                if existing.get("enrichment_status") == "stub" and finding.get("enrichment_status") != "stub":
                    by_ref[key] = finding
        else:
            standalone.append(dict(finding))
    return by_ref, standalone


def apply_direct_ai_enrichment(
    ai_data: dict[str, Any],
    catalog: list[dict[str, Any]],
) -> dict[str, Any]:
    """Ensure one AI finding per Direct catalog risk; return coverage metadata."""
    if not catalog:
        coverage = {
            "direct_risks_total": 0,
            "enriched_count": 0,
            "missing_refs": [],
            "stubs_created": 0,
            "coverage_percent": 100,
        }
        ai_data["enrichment_coverage"] = coverage
        return coverage

    catalog_keys = set(_catalog_index(catalog).keys())
    findings = [dict(f) for f in (ai_data.get("findings") or []) if isinstance(f, dict)]

    _attach_refs_from_evidence(findings, catalog_keys)
    covered_after_evidence = {
        direct_risk_ref_key(normalize_direct_risk_ref(f.get("direct_risk_ref")))
        for f in findings
        if normalize_direct_risk_ref(f.get("direct_risk_ref"))
    }
    for finding in findings:
        _try_fuzzy_attach_ref(finding, catalog, covered_after_evidence)
        ref = normalize_direct_risk_ref(finding.get("direct_risk_ref"))
        if ref:
            covered_after_evidence.add(direct_risk_ref_key(ref))

    _flag_catalog_overlap_orphans(findings, catalog)

    by_ref, standalone = _dedupe_by_ref(findings)
    covered_keys = set(by_ref.keys())
    standalone = _drop_orphan_duplicates(standalone, catalog, covered_keys)

    missing_before_stubs = [
        key for key in sorted(catalog_keys - covered_keys)
    ]
    stubs_created = 0
    for key in missing_before_stubs:
        entry = _catalog_index(catalog)[key]
        by_ref[key] = _stub_finding(entry)
        stubs_created += 1

    merged = list(by_ref.values()) + standalone
    ai_data["findings"] = merged

    coverage = compute_enrichment_coverage(catalog, merged)
    coverage["stubs_created"] = stubs_created
    coverage["missing_refs"] = []
    ai_data["enrichment_coverage"] = coverage

    reasons = list(ai_data.get("global_review_reasons") or [])
    if stubs_created:
        reasons.append(
            f"AI не детализировал {stubs_created} риск(ов) Direct — созданы карточки для ручной проверки."
        )
        ai_data["global_needs_review"] = True
    ai_data["global_review_reasons"] = list(dict.fromkeys(reasons))

    return coverage
