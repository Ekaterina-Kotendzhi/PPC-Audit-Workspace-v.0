/** Зоны оценки кабинета — общая разметка (отчёт и вкладка «Директ»). */
import { escapeHtml, formatNumber } from '../core/utils.js';

export const DIRECT_HEALTH_ZONE_MAX = {
    semantics: 35,
    campaigns: 25,
    dynamics: 20,
    coverage: 40,
    quality: 15,
};

export function renderDirectHealthZoneRows(zoneBreakdown) {
    return (zoneBreakdown || []).map((z) => {
        const zoneKey = String(z.zone || '').toLowerCase();
        const maxScore = Number(z.cap ?? z.max_score ?? DIRECT_HEALTH_ZONE_MAX[zoneKey] ?? 0);
        const penalty = Number(z.penalty || 0);
        const left = Math.max(0, maxScore - penalty);
        const fill = maxScore > 0 ? Math.max(0, Math.min(100, (left / maxScore) * 100)) : 0;
        return `
        <div class="direct-health-zone-row">
            <div class="direct-health-zone-row-top">
                <span class="direct-health-zone-name">${escapeHtml(z.label || z.zone || 'Зона')}</span>
                <span class="direct-health-zone-score">−${formatNumber(penalty)} / ${formatNumber(maxScore)}</span>
            </div>
            <div class="direct-health-zone-progress" aria-hidden="true">
                <div class="direct-health-zone-progress-fill" style="--zone-fill:${fill}%"></div>
            </div>
        </div>`;
    }).join('');
}
