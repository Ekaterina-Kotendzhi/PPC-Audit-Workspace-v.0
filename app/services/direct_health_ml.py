"""Lightweight ML-style signals for Direct Health Score (no sklearn)."""
from __future__ import annotations

import statistics
from typing import Any


def _iqr_bounds(values: list[float], multiplier: float = 1.5) -> tuple[float, float]:
    if len(values) < 4:
        return (min(values), max(values))
    qs = statistics.quantiles(values, n=4, method="inclusive")
    q1, q3 = qs[0], qs[2]
    iqr = q3 - q1
    return q1 - multiplier * iqr, q3 + multiplier * iqr


def detect_monthly_anomalies(monthly: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Flag months where cost or CPL is an outlier vs the series."""
    out: list[dict[str, Any]] = []
    if len(monthly) < 4:
        return out

    for metric, label in (("cost", "расход"), ("cpl", "CPL")):
        points: list[tuple[str, float]] = []
        for row in monthly:
            val = row.get(metric)
            if isinstance(val, (int, float)) and float(val) > 0:
                points.append((str(row.get("month") or "?"), float(val)))
        if len(points) < 4:
            continue
        values = [p[1] for p in points]
        lo, hi = _iqr_bounds(values)
        for month, val in points:
            if val < lo or val > hi:
                out.append({
                    "id": f"anomaly_{metric}_{month}",
                    "metric": metric,
                    "month": month,
                    "value": round(val, 2),
                    "expected_range": {"min": round(max(0, lo), 2), "max": round(hi, 2)},
                    "label": label,
                })
    return out


def cluster_campaigns_simple(campaigns: list[dict[str, Any]]) -> dict[str, Any]:
    """Quartile buckets instead of KMeans — leaders / average / underperformers."""
    if len(campaigns) < 3:
        return {"available": False, "clusters": [], "reason": "insufficient_campaigns"}

    scored: list[dict[str, Any]] = []
    for c in campaigns:
        cost = float(c.get("cost") or 0)
        leads = int(c.get("leads") or 0)
        cpl = float(c.get("cpl") or 0) if leads > 0 else None
        efficiency = (leads / cost * 1000) if cost > 0 else 0
        scored.append({
            "campaign_id": c.get("campaign_id"),
            "campaign_name": c.get("campaign_name"),
            "cost": cost,
            "leads": leads,
            "cpl": cpl,
            "efficiency_score": efficiency,
        })

    by_eff = sorted(scored, key=lambda x: -x["efficiency_score"])
    n = len(by_eff)
    third = max(1, n // 3)
    leaders = by_eff[:third]
    under = by_eff[-third:]
    mid = by_eff[third:-third] if n > 2 * third else []

    return {
        "available": True,
        "clusters": [
            {
                "name": "leaders",
                "label_ru": "Лидеры",
                "members": leaders[:5],
                "count": len(leaders),
            },
            {
                "name": "average",
                "label_ru": "Среднячки",
                "members": mid[:5],
                "count": len(mid),
            },
            {
                "name": "underperformers",
                "label_ru": "Аутсайдеры",
                "members": under[:5],
                "count": len(under),
            },
        ],
    }


def build_ml_signals(
    direct_analytics: dict[str, Any],
    *,
    comparison: dict[str, Any] | None = None,
) -> dict[str, Any]:
    monthly = direct_analytics.get("monthly") or []
    campaigns = direct_analytics.get("campaigns") or []
    anomalies = detect_monthly_anomalies(monthly)
    clusters = cluster_campaigns_simple(campaigns)

    cpl_values = [
        float(m["cpl"]) for m in monthly
        if isinstance(m.get("cpl"), (int, float)) and float(m["cpl"]) > 0
    ]
    cv = 0.0
    if len(cpl_values) >= 3:
        mean = statistics.mean(cpl_values)
        stdev = statistics.pstdev(cpl_values)
        cv = stdev / mean if mean else 0.0

    trend = None
    if comparison and comparison.get("available"):
        deltas = comparison.get("deltas") or {}
        trend = {
            "leads_pct": (deltas.get("leads") or {}).get("percent"),
            "cpl_pct": (deltas.get("cpl") or {}).get("percent"),
        }

    return {
        "anomalies": anomalies,
        "campaign_clusters": clusters,
        "cpl_cv": round(cv, 3) if cpl_values else None,
        "cpl_stable": cv < 0.35 if cpl_values else None,
        "trend": trend,
        "insufficient_data": len(monthly) < 3,
    }
