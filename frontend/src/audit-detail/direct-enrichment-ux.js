/** Подсказки и переходы после AI на вкладке «Директ». */
import { escapeHtml } from '../core/utils.js';
import { DIRECT_COPY } from './direct-copy.js';
import { runtimeBridge } from '../core/runtime-bridge.js';

function directRiskRefKey(ref) {
    if (!ref?.kind || ref.id == null) return '';
    return `${ref.kind}:${ref.id}`;
}

export function buildDirectRiskCatalogFromHealth(health) {
    if (!health) return [];
    const catalog = [];
    const seen = new Set();

    for (const template of health.template_findings || []) {
        const id = String(template.template_id || '').trim();
        if (!id) continue;
        const key = `template:${id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        catalog.push({
            direct_risk_ref: { kind: 'template', id },
            title: template.title || '',
        });
    }

    for (const rule of health.performance_issues || []) {
        if (rule.zone === 'coverage') continue;
        if (!['critical', 'high'].includes(rule.severity)) continue;
        if (rule.id == null) continue;
        const key = `rule:${rule.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        catalog.push({
            direct_risk_ref: { kind: 'rule', id: String(rule.id) },
            title: rule.title || '',
        });
    }
    return catalog;
}

function isDirectHealthFinding(f) {
    if (!f) return false;
    if (f.finding_source === 'direct_health') return true;
    if (f.original_ai_output?.source === 'direct_health') return true;
    if ((f.evidence || []).some((e) => e?.source === 'direct_health')) return true;
    return false;
}

function getDirectRiskRef(f) {
    if (!f) return null;
    const fromField = f.direct_risk_ref;
    if (fromField?.kind && fromField.id != null) {
        return { kind: String(fromField.kind), id: String(fromField.id) };
    }
    const fromOrig = f.original_ai_output?.direct_risk_ref;
    if (fromOrig?.kind && fromOrig.id != null) {
        return { kind: String(fromOrig.kind), id: String(fromOrig.id) };
    }
    const ev = (f.evidence || []).find((e) => e?.source === 'direct_health');
    if (ev?.kind === 'template' && ev.template_id) {
        return { kind: 'template', id: String(ev.template_id) };
    }
    if (ev?.kind === 'rule' && ev.rule_id != null) {
        return { kind: 'rule', id: String(ev.rule_id) };
    }
    return null;
}

function isAiInterpretationFinding(f) {
    return Boolean(f) && !isDirectHealthFinding(f) && Boolean(getDirectRiskRef(f));
}

function isStubEnrichmentFinding(f) {
    if (!f || isDirectHealthFinding(f)) return false;
    const orig = f.original_ai_output || {};
    if (orig.enrichment_status === 'stub' || f.enrichment_status === 'stub') return true;
    return Boolean(f.needs_review && /AI не детализировал/i.test(String(f.review_reason || '')));
}

function hasCompletedAnalysis(data) {
    const ws = data?.workflow_state || {};
    if (ws.analysis_running || data?.status === 'in_progress') return false;
    return ws.state === 'ANALYSIS_DONE' || ws.state === 'REPORT_READY' || data?.status === 'completed';
}

function deriveDirectEnrichmentFromFindings(data, catalog) {
    const total = catalog.length;
    const covered = new Set();
    let stubs = 0;
    for (const f of data?.findings || []) {
        if (!isAiInterpretationFinding(f)) continue;
        const key = directRiskRefKey(getDirectRiskRef(f));
        if (key) covered.add(key);
        if (isStubEnrichmentFinding(f)) stubs += 1;
    }
    const enriched = covered.size;
    return {
        direct_risks_total: total,
        enriched_count: enriched,
        stubs_created: stubs,
        coverage_percent: total ? Math.round(100 * enriched / total) : 100,
    };
}

function resolveDirectEnrichment(data) {
    const api = data?.direct_enrichment;
    const health = data?.direct_analytics?.health;
    const catalog = buildDirectRiskCatalogFromHealth(health);
    if (api && typeof api === 'object') {
        const total = Number(api.direct_risks_total ?? catalog.length);
        const enriched = Number(api.enriched_count ?? 0);
        const stubs = Number(api.stubs_created ?? 0);
        return {
            direct_risks_total: total,
            enriched_count: enriched,
            stubs_created: stubs,
            coverage_percent: Number(api.coverage_percent ?? (total ? Math.round(100 * enriched / total) : 100)),
        };
    }
    return deriveDirectEnrichmentFromFindings(data, catalog);
}

function goToDirectResultsRisks() {
    runtimeBridge.switchTab?.('results');
    window.requestAnimationFrame(() => {
        window.setTimeout(() => {
            runtimeBridge.scrollToDirectRisks?.();
        }, 120);
    });
}

function renderDirectStepRow(num, title, hint, btnHtml) {
    return `
        <div class="direct-steps-flow-item">
            <span class="direct-steps-flow-num" aria-hidden="true">${num}</span>
            <div class="direct-steps-flow-body">
                <strong>${escapeHtml(title)}</strong>
                <p class="muted direct-steps-flow-hint">${escapeHtml(hint)}</p>
                ${btnHtml}
            </div>
        </div>`;
}

/** Один блок «следующий шаг» под графиком — без дублирования вкладок кнопками в ряд. */
function renderDirectStepsCard(data) {
    const ws = data?.workflow_state || {};
    const running = ws.analysis_running || data?.status === 'in_progress';
    const analysisDone = hasCompletedAnalysis(data);
    const ui = data?.workflow_ui?.primary_button || {};

    if (!analysisDone) {
        let actionHtml;
        if (running) {
            actionHtml = `<p class="muted">${escapeHtml(DIRECT_COPY.dataFlowStep3Running)} — шаг 3 в полосе сверху.</p>`;
        } else if (document.getElementById('dataSubtabRunAi')) {
            const disabled = ui.enabled === false;
            const warn = disabled && ui.reason_disabled
                ? `<p class="direct-steps-warn muted">${escapeHtml(ui.reason_disabled)}</p>`
                : '';
            actionHtml = `<p class="muted">${escapeHtml(DIRECT_COPY.dataFlowDirectHint)}</p>${warn}`;
        } else {
            const disabled = ui.enabled === false;
            const title = escapeHtml(ui.reason_disabled || '');
            actionHtml = `<button type="button" class="btn btn-success btn-lg" onclick="runAnalysis()"${disabled ? ' disabled' : ''}${title ? ` title="${title}"` : ''}>Запустить AI-анализ</button>`;
            if (disabled && title) {
                actionHtml += `<p class="direct-steps-warn muted">${title}</p>`;
            }
        }
        return `
        <div id="direct-slice-ai-enrichment" class="direct-steps-card">
            <p class="direct-steps-title">${escapeHtml(DIRECT_COPY.nextStepTitle)}</p>
            <p class="muted direct-steps-lead">${escapeHtml(DIRECT_COPY.nextStepBeforeLead)}</p>
            <div class="direct-steps-primary-action">${actionHtml}</div>
            <p class="muted direct-steps-foot">${escapeHtml(DIRECT_COPY.nextStepBeforeFoot)}</p>
        </div>`;
    }

    const cov = resolveDirectEnrichment(data);
    const total = cov.direct_risks_total || 0;
    const enriched = cov.enriched_count;
    const statusClass = total > 0 && enriched >= total ? 'direct-steps-card--ok' : 'direct-steps-card--warn';
    const progressHint = total
        ? `Связано с AI: ${enriched} из ${total} важных рисков.`
        : '';
    const rerunFootExtra = document.getElementById('dataSubtabRunAi')
        ? ' Перезапуск — шаг <strong>3</strong> в полосе сверху.'
        : `<button type="button" class="btn btn-link btn-sm direct-steps-rerun" onclick="rerunAuditAnalysis()" title="${escapeHtml(DIRECT_COPY.rerunAnalysisFoot)}">${escapeHtml(DIRECT_COPY.rerunAnalysisBtn)}</button>
                <span class="muted"> — ${escapeHtml(DIRECT_COPY.rerunAnalysisFoot)}</span>`;

    return `
        <div id="direct-slice-ai-enrichment" class="direct-steps-card ${statusClass}">
            <p class="direct-steps-title">${escapeHtml(DIRECT_COPY.checkBeforeReportTitle)}</p>
            ${progressHint ? `<p class="muted direct-steps-lead">${escapeHtml(progressHint)}</p>` : ''}
            <div class="direct-steps-flow">
                ${renderDirectStepRow(
                    1,
                    DIRECT_COPY.stepResultsTitle,
                    DIRECT_COPY.stepResultsHint,
                    `<button type="button" class="btn btn-primary btn-sm" onclick="goToDirectResultsRisks()">${escapeHtml(DIRECT_COPY.stepResultsBtn)}</button>`,
                )}
                ${renderDirectStepRow(
                    2,
                    DIRECT_COPY.stepReportTitle,
                    DIRECT_COPY.stepReportHint,
                    `<button type="button" class="btn btn-outline btn-sm" onclick="switchTab('report')">${escapeHtml(DIRECT_COPY.stepReportBtn)}</button>`,
                )}
            </div>
            <p class="muted direct-steps-foot">${escapeHtml(DIRECT_COPY.directRisksOnPageHint)}${rerunFootExtra}</p>
        </div>`;
}

function renderDirectAiEnrichmentBlock(data) {
    return renderDirectStepsCard(data);
}

function openFindingsStubEnrichment() {
    const data = runtimeBridge.getAuditData?.() || null;
    const stubs = (data?.findings || []).filter(isStubEnrichmentFinding);
    const missing = Math.max(
        0,
        (resolveDirectEnrichment(data).direct_risks_total || 0) - (resolveDirectEnrichment(data).enriched_count || 0),
    );
    runtimeBridge.switchTab?.('results');
    window.requestAnimationFrame(() => {
        window.setTimeout(() => {
            if (stubs.length) {
                const target = document.getElementById(`finding-${stubs[0].id}`)
                    || document.querySelector('.finding-item--enrichment-stub');
                target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                target?.classList.add('direct-slice-highlight');
                window.setTimeout(() => target?.classList.remove('direct-slice-highlight'), 2200);
                return;
            }
            if (missing > 0) {
                runtimeBridge.scrollToPendingFindings?.();
                return;
            }
            runtimeBridge.scrollToPendingFindings?.();
        }, 120);
    });
}

export function getCatalogRefsWithoutAi(data) {
    const catalog = buildDirectRiskCatalogFromHealth(data?.direct_analytics?.health);
    const covered = new Set();
    for (const f of data?.findings || []) {
        if (!isAiInterpretationFinding(f)) continue;
        const key = directRiskRefKey(getDirectRiskRef(f));
        if (key) covered.add(key);
    }
    return catalog.filter((entry) => {
        const key = directRiskRefKey(entry.direct_risk_ref);
        return key && !covered.has(key);
    });
}

export {
    resolveDirectEnrichment,
    renderDirectStepsCard,
    renderDirectAiEnrichmentBlock,
    openFindingsStubEnrichment,
    isStubEnrichmentFinding,
    goToDirectResultsRisks,
};
