/** Report tab: comparison, PDF/PPTX export — epic H4. */
import { escapeHtml, formatNumber, formatMoney, showLoader, hideLoader } from '../core/utils.js';
import { showAlert } from '../core/alerts.js';
import { showConfirmDialog } from '../core/modals.js';
import { apiRequest } from '../core/api.js';
import { runtimeBridge } from '../core/runtime-bridge.js';
import { scrollToDirectRisks } from './findings.js';
import { DIRECT_COPY } from './direct-copy.js';
import {
    COMPARISON_METRIC_OPTIONS,
    renderComparisonSvgChart,
    wireComparisonMetricTabs,
} from './direct-dynamics-chart.js';

const REPORT_CLIENT_VIEW_KEY = 'ppc_report_client_view';

const SEND_CHECKLIST_ITEMS = [
    { id: 'kpi_period', label: 'Период Excel Директа совпадает с договорённостью с клиентом' },
    { id: 'direct_ai_overlap', label: 'Direct vs AI: нет конфликтов period/leads/CPL/budget в pre-PDF' },
    { id: 'goal_ok', label: 'Цель аудита осмысленна (не тестовый мусор)' },
    { id: 'findings_queue', label: 'Все AI-выводы: confirm или reject (или осознанный черновик)' },
    { id: 'analysis_fresh', label: 'Нет устаревшего AI без перезапуска (или клиент предупреждён)' },
    { id: 'offer_ok', label: 'КП: этапы и срок адекватны нише' },
    { id: 'preview_match', label: 'Предпросмотр PDF совпадает с preview на экране' },
];

function sendChecklistStorageKey(auditId) {
    return `ppc_send_checklist_${auditId}`;
}

function loadSendChecklistState(auditId) {
    try {
        const raw = sessionStorage.getItem(sendChecklistStorageKey(auditId));
        return raw ? JSON.parse(raw) : {};
    } catch (_e) {
        return {};
    }
}

function saveSendChecklistItem(auditId, itemId, checked) {
    const state = loadSendChecklistState(auditId);
    state[itemId] = Boolean(checked);
    try {
        sessionStorage.setItem(sendChecklistStorageKey(auditId), JSON.stringify(state));
    } catch (_e) { /* ignore */ }
    renderReportSendChecklist(auditId);
}

function renderReportSendChecklist(auditId) {
    const body = document.getElementById('reportSendChecklistBody');
    if (!body || !auditId) return;
    const state = loadSendChecklistState(auditId);
    const rows = SEND_CHECKLIST_ITEMS.map((item) => {
        const checked = Boolean(state[item.id]);
        return `<label class="report-send-checklist-row">
            <input type="checkbox" ${checked ? 'checked' : ''} onchange="saveSendChecklistItem(${auditId}, '${item.id}', this.checked)">
            <span>${escapeHtml(item.label)}</span>
        </label>`;
    }).join('');
    body.innerHTML = `<div class="report-send-checklist">${rows}</div>`;
}

function setReportClientView(enabled) {
    document.body.classList.toggle('report-client-view-mode', Boolean(enabled));
    try {
        localStorage.setItem(REPORT_CLIENT_VIEW_KEY, enabled ? '1' : '0');
    } catch (_e) { /* ignore */ }
}

function initReportClientViewToggle() {
    const el = document.getElementById('reportClientViewToggle');
    if (!el) return;
    let on = false;
    try {
        on = localStorage.getItem(REPORT_CLIENT_VIEW_KEY) === '1';
    } catch (_e) { /* ignore */ }
    // Клиентский вид только скрывает чеклисты; редактирование всегда доступно.
    el.checked = on;
    document.body.classList.toggle('report-client-view-mode', on);
}

function getCurrentAuditId() {
    return runtimeBridge.getCurrentAuditId?.() || runtimeBridge.getAuditIdFromUrl?.() || null;
}

async function loadComparison() {
    const container = document.getElementById('comparisonContainer');
    const auditId = getCurrentAuditId();
    if (!container || !auditId) return;
    container.innerHTML = '<p class="muted comparison-loading-state">Загрузка сравнения...</p>';
    try {
        const data = await apiRequest(`/api/audits/${auditId}/comparison`);
        renderComparison(data);
        renderHealthKpiStrip(runtimeBridge.getAuditData?.() || null, data);
    } catch (error) {
        container.innerHTML = `<div class="alert alert-danger">Ошибка сравнения: ${escapeHtml(error.message)}</div>`;
    }
}

function renderDelta(delta, lowerIsBetter = false) {
    if (!delta || delta.absolute === null || delta.absolute === undefined) return '<span class="delta-neutral">—</span>';
    const value = Number(delta.percent);
    const cls = value === 0 || Number.isNaN(value) ? 'delta-neutral' : ((value > 0) !== lowerIsBetter ? 'delta-positive' : 'delta-negative');
    const sign = value > 0 ? '+' : '';
    return `<span class="${cls}">${sign}${value}%</span>`;
}

function comparisonMetricHasData(before, after, key) {
    const pick = (row) => row?.[key];
    const vals = [pick(before), pick(after)];
    return vals.some((v) => v !== null && v !== undefined && v !== '' && !Number.isNaN(Number(v)));
}

function buildComparisonCards(before, after, deltas) {
    const cards = [
        {
            label: 'Период',
            html: `${escapeHtml(before.period)} → ${escapeHtml(after.period)}`,
            show: true,
        },
        {
            label: 'Заявки',
            html: `${formatNumber(before.leads)} → ${formatNumber(after.leads)} ${renderDelta(deltas.leads)}`,
            show: comparisonMetricHasData(before, after, 'leads'),
        },
        {
            label: 'Продажи',
            html: `${formatNumber(before.sales)} → ${formatNumber(after.sales)} ${renderDelta(deltas.sales)}`,
            show: comparisonMetricHasData(before, after, 'sales'),
        },
        {
            label: 'CPL',
            html: `${formatMoney(before.cpl)} → ${formatMoney(after.cpl)} ${renderDelta(deltas.cpl, true)}`,
            show: comparisonMetricHasData(before, after, 'cpl'),
        },
        {
            label: 'CPA',
            html: `${formatMoney(before.cpa)} → ${formatMoney(after.cpa)} ${renderDelta(deltas.cpa, true)}`,
            show: comparisonMetricHasData(before, after, 'cpa'),
        },
        {
            label: 'ROMI',
            html: `${before.romi ?? '—'}% → ${after.romi ?? '—'}% ${renderDelta(deltas.romi)}`,
            show: comparisonMetricHasData(before, after, 'romi'),
        },
    ];
    return cards.filter((c) => c.show);
}

function renderHealthScoreHowHtml(health) {
    const bd = health?.score_breakdown || {};
    const base = bd.base ?? 100;
    const pr = bd.penalty_rules ?? 0;
    const pc = bd.penalty_coverage ?? 0;
    const pm = bd.penalty_ml ?? 0;
    const bonus = bd.bonus_improvement ?? 0;
    const score = health?.health_score ?? 0;
    const issues = (health?.top_issues || health?.performance_issues || []).slice(0, 4);
    const issueList = issues.length
        ? `<ul class="health-score-issues">${issues.map((i) =>
            `<li><strong>−${escapeHtml(String(i.penalty || '?'))}</strong> ${escapeHtml(i.title || i.id || '')}</li>`
        ).join('')}</ul>`
        : '<p class="muted">Нет сработавших правил — оценка близка к максимуму.</p>';
    return `
        <details class="health-score-how">
            <summary>Как считается оценка</summary>
            <p class="muted health-score-formula">
                ${base} − ${pr} (Excel) − ${pc} (данные) − ${pm} (аномалии) + ${bonus} (динамика KPI) = <strong>${formatNumber(score)}</strong>
            </p>
            <p class="muted">Оценка <strong>не</strong> берётся из таблицы «Ключевые метрики» и не равна числу заявок на графике. Пересчитывается при каждой загрузке Excel.</p>
            ${issueList}
            <button type="button" class="btn btn-link btn-sm" onclick="switchTab('data'); switchDataSubtab('direct')">Подробнее на «Данные → Директ»</button>
        </details>`;
}

function renderHealthKpiStrip(auditData, comparison) {
    const el = document.getElementById('healthKpiStrip');
    if (!el) return;
    const health = auditData?.direct_analytics?.health;
    if (!health) {
        el.innerHTML = '';
        return;
    }
    const breakdown = health.score_breakdown || {};
    const bonus = breakdown.bonus_improvement || 0;
    const scoreLine = `${DIRECT_COPY.healthScoreLabel}: ${formatNumber(health.health_score || 0)} (${escapeHtml(health.grade || '—')})`;
    const howHtml = renderHealthScoreHowHtml(health);
    const activePeriod = auditData?.metrics_summary?.period;
    if (comparison?.available) {
        const d = comparison.deltas || {};
        const b = comparison.before || {};
        const a = comparison.after || {};
        const leadsPct = d.leads?.percent;
        const cplPct = d.cpl?.percent;
        const kpiParts = [];
        if (leadsPct != null) kpiParts.push(`заявки ${leadsPct > 0 ? '+' : ''}${leadsPct}%`);
        if (cplPct != null) kpiParts.push(`CPL ${cplPct > 0 ? '+' : ''}${cplPct}%`);
        if (bonus > 0) kpiParts.push(`бонус +${bonus}`);
        const kpiLine = kpiParts.length
            ? `${escapeHtml(b.period)} → ${escapeHtml(a.period)}: ${kpiParts.join(', ')}`
            : `${escapeHtml(b.period)} → ${escapeHtml(a.period)}`;
        el.innerHTML = `
            <div class="card health-kpi-strip-card health-kpi-strip-card--compact">
                <div class="health-kpi-strip-lines">
                    <p class="health-kpi-strip-line"><strong>${scoreLine}</strong></p>
                    <p class="health-kpi-strip-line health-kpi-strip-line--kpi"><span class="muted">KPI было/стало:</span> ${kpiLine}</p>
                    ${activePeriod ? `<p class="health-kpi-strip-line health-kpi-strip-line--kpi"><span class="muted">В таблице отчёта:</span> <strong>${escapeHtml(activePeriod)}</strong></p>` : ''}
                </div>
                ${howHtml}
            </div>`;
        return;
    }
    el.innerHTML = `
        <div class="card health-kpi-strip-card health-kpi-strip-card--compact">
            <div class="health-kpi-strip-lines">
                <p class="health-kpi-strip-line"><strong>${scoreLine}</strong></p>
                ${activePeriod ? `<p class="health-kpi-strip-line health-kpi-strip-line--kpi"><span class="muted">В таблице отчёта:</span> <strong>${escapeHtml(activePeriod)}</strong></p>` : ''}
                <p class="muted health-kpi-strip-note">Добавьте 2+ периода KPI для сравнения «было/стало».</p>
            </div>
            ${howHtml}
        </div>`;
}

/** Report tab: no duplicate Direct Health card — full block lives on Data → Direct (card.js). */
function renderDirectHealthReport(_auditData) {
    const container = document.getElementById('directHealthReportContainer');
    if (!container) return;
    container.style.display = 'none';
    container.innerHTML = '';
}

function renderComparison(data) {
    const container = document.getElementById('comparisonContainer');
    if (!data.available) {
        container.innerHTML = `<div class="card needs-review-block"><p>${escapeHtml(data.message || 'Сравнение появится после добавления минимум двух корректных периодов.')}</p></div>`;
        return;
    }
    const before = data.before || {};
    const after = data.after || {};
    const d = data.deltas || {};
    const cards = buildComparisonCards(before, after, d);
    const gridClass = cards.length <= 4 ? 'comparison-grid comparison-grid--compact' : 'comparison-grid';
    const cardsHtml = cards.map((c) =>
        `<div class="comparison-card"><strong>${escapeHtml(c.label)}</strong>${c.html}</div>`
    ).join('');
    container.innerHTML = `
        <div class="${gridClass}">
            ${cardsHtml}
        </div>
        <div class="card comparison-chart-card">
            <h2 class="comparison-chart-title">Динамика по периодам</h2>
            <div class="period-picker comparison-period-picker" role="tablist" aria-label="Метрика графика">
                <span class="period-picker-label">Метрика</span>
                ${COMPARISON_METRIC_OPTIONS.map((item, idx) => `
                    <button type="button" class="period-btn comparison-metric-tab${idx === 0 ? ' active' : ''}"
                        data-metric="${item.key}" role="tab" aria-selected="${idx === 0 ? 'true' : 'false'}">
                        ${escapeHtml(item.label)}
                    </button>`).join('')}
            </div>
            <div class="chart-wrap" id="comparison_chart_host" role="presentation"></div>
        </div>
    `;
    setTimeout(() => {
        const host = document.getElementById('comparison_chart_host');
        const periods = Array.isArray(data?.periods) ? data.periods : [];
        if (!host || periods.length < 2) return;
        renderComparisonSvgChart(host, periods, 'leads');
        wireComparisonMetricTabs(container, data);
    }, 80);
}

function previewAuditReport() {
    const auditId = getCurrentAuditId();
    if (!auditId) return;
    const ts = Date.now();
    window.open(`/api/audits/${auditId}/export/html?t=${ts}`, '_blank');
}

function exportAuditReport() {
    const auditId = getCurrentAuditId();
    if (!auditId) return;
    const ts = Date.now();
    window.open(`/api/audits/${auditId}/export/pdf?t=${ts}`, '_blank');
}

async function runPrePdfCheck() {
    const auditId = getCurrentAuditId();
    const box = document.getElementById('prePdfCheckResult');
    if (!auditId || !box) return;
    box.innerHTML = '<p class="muted">Проверка…</p>';
    try {
        const data = await apiRequest(`/api/audits/${auditId}/report/pre-pdf-check`);
        const directIds = new Set(['direct_ai_consistency', 'direct_ai_no_overlap', 'direct_ai_enrichment']);
        const directItems = (data.items || []).filter((item) => directIds.has(item.id));
        const directFailed = directItems.some((item) => !item.ok && item.severity !== 'warning');
        const enrichmentFailed = (data.items || []).some(
            (item) => item.id === 'direct_ai_enrichment' && !item.ok,
        );
        const checklistHtml = directFailed
            ? `<div class="pre-pdf-consistency-checklist">
                <p class="muted">${escapeHtml(DIRECT_COPY.prePdf10SecIntro)}</p>
                <ul>${DIRECT_COPY.prePdf10SecItems.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ul>
            </div>`
            : '';
        const actionsHtml = directFailed
            ? `<div class="pre-pdf-actions-row">
                <button type="button" class="btn btn-sm btn-outline-primary" onclick="goFixDirectAiConsistency()">
                    Перейти к исправлению
                </button>
                <button type="button" class="btn btn-sm btn-outline" onclick="openAiSummaryForConsistency()">
                    Открыть AI-summary
                </button>
                <button type="button" class="btn btn-sm btn-outline" onclick="rerunAuditAnalysis()">
                    Перезапустить AI-анализ
                </button>
              </div>`
            : '';
        const enrichmentActions = enrichmentFailed
            ? `<div class="pre-pdf-actions-row">
                <button type="button" class="btn btn-sm btn-outline-primary" onclick="switchTab('data'); switchDataSubtab('direct')">Открыть «Директ»</button>
                <button type="button" class="btn btn-sm btn-outline" onclick="rerunAuditAnalysis()">Перезапустить AI-анализ</button>
                <button type="button" class="btn btn-sm btn-outline" onclick="setFindingsMarketerFilter('no_ai'); switchTab('results')">Без AI-обогащения</button>
              </div>`
            : '';
        let directBlockInserted = false;
        const items = (data.items || []).map((item) => {
            const isDirect = directIds.has(item.id);
            const isWarning = item.severity === 'warning';
            const statusCls = item.ok ? 'pre-pdf-ok' : (isWarning ? 'pre-pdf-warn' : 'pre-pdf-fail');
            const badge = isDirect && !item.ok && !isWarning
                ? `<span class="badge badge-medium pre-pdf-consistency-badge">${DIRECT_COPY.prePdfConflictBadge}</span>`
                : '';
            let extra = '';
            if (item.id === 'direct_ai_enrichment' && !item.ok) {
                extra = enrichmentActions;
            } else if (isDirect && !directBlockInserted && (directFailed || item.id === 'direct_ai_no_overlap')) {
                if (item.id === 'direct_ai_no_overlap') {
                    extra = checklistHtml + actionsHtml;
                    directBlockInserted = true;
                }
            }
            return `
                <li class="pre-pdf-item ${statusCls}">
                    <span>${item.ok ? '✓' : '○'}</span>
                    <strong>${escapeHtml(item.label)}</strong>${badge}
                    <p class="muted">${escapeHtml(item.detail || '')}</p>
                    ${extra}
                </li>
            `;
        }).join('');
        const cls = data.ready ? 'alert-success' : 'alert-warning';
        box.innerHTML = `
            <div class="alert ${cls} pre-pdf-summary-alert">${escapeHtml(data.summary || '')}</div>
            <ul class="pre-pdf-checklist">${items}</ul>`;
        if (!data.ready) {
            showAlert(data.summary || 'PDF пока не готов к отправке', 'warning');
        } else {
            showAlert(data.summary || 'Можно отправлять PDF', 'success');
        }
    } catch (error) {
        box.innerHTML = `<p class="muted">Ошибка: ${escapeHtml(error.message)}</p>`;
        showAlert('Ошибка проверки: ' + error.message, 'danger');
    }
}

function goFixDirectAiConsistency() {
    runtimeBridge.switchTab?.('data');
    runtimeBridge.switchDataSubtab?.('direct');
    const direct = document.getElementById('directAnalyticsPanel');
    if (direct) {
        direct.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    showAlert(
        DIRECT_COPY.prePdfConsistencyHint,
        'warning',
    );
}

function openAiSummaryForConsistency() {
    runtimeBridge.switchTab?.('report');
    const card = document.getElementById('reportAiSummaryCard');
    if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'start' });
        card.classList.add('focus-target');
        setTimeout(() => card.classList.remove('focus-target'), 1400);
    }
    showAlert('Проверьте приоритет и формулировки AI-summary перед отправкой PDF.', 'warning');
}

function exportSlidesPptx() {
    const auditId = getCurrentAuditId();
    window.open(`/api/audits/${auditId}/export/slides/pptx`, '_blank');
}

async function exportGoogleSlides() {
    const auditId = getCurrentAuditId();
    try {
        showLoader();
        const result = await apiRequest(`/api/audits/${auditId}/export/google-slides`, { method: 'POST' });
        const url = result.presentation && result.presentation.webViewLink;
        if (url) {
            showAlert('Google Slides создан. Открываю презентацию.', 'success');
            window.open(url, '_blank');
        } else {
            showAlert('Google Slides экспорт выполнен, но ссылка не получена.', 'warning');
        }
    } catch (error) {
        showAlert('Google Slides не настроен: ' + error.message + '. Скачайте PPTX и загрузите его в Google Slides вручную.', 'warning');
    } finally {
        hideLoader();
    }
}

async function syncDirectHealthFindings(options = {}) {
    const {
        silent = false,
        scrollToRisks = true,
        promptAnalysis = false,
    } = options;
    const auditId = getCurrentAuditId();
    if (!auditId) return null;
    try {
        if (!silent) showLoader();
        const data = await apiRequest(`/api/audits/${auditId}/health/sync-findings`, { method: 'POST', body: {} });
        if (!silent) {
            showAlert(DIRECT_COPY.syncRisksSuccess(data.created || 0), 'success');
        }
        await runtimeBridge.loadAuditDetail?.();
        if (scrollToRisks) scrollToDirectRisks();
        if (promptAnalysis) {
            const audit = runtimeBridge.getAuditData?.();
            const ws = audit?.workflow_state || {};
            const analysisDone = ws.state === 'ANALYSIS_DONE' || ws.state === 'REPORT_READY';
            if (!analysisDone && !ws.analysis_running) {
                const run = await showConfirmDialog({
                    title: 'AI-анализ',
                    message: DIRECT_COPY.promptRunAnalysisAfterExcel,
                    confirmText: 'Запустить',
                    cancelText: 'Позже',
                });
                if (run) runtimeBridge.runAuditAnalysis?.();
            }
        }
        return data;
    } catch (error) {
        if (!silent) {
            showAlert('Не удалось обновить риски: ' + error.message, 'danger');
        }
        return null;
    } finally {
        if (!silent) hideLoader();
    }
}

async function maybeAutoSyncDirectHealthAfterExcelUpload() {
    const audit = runtimeBridge.getAuditData?.();
    if (!audit?.direct_analytics?.health) return;
    const data = await syncDirectHealthFindings({
        silent: true,
        scrollToRisks: false,
        promptAnalysis: true,
    });
    if (data != null) {
        showAlert(DIRECT_COPY.risksSyncedFromExcel, 'success');
    }
}

export {
    loadComparison,
    renderDirectHealthReport,
    renderHealthKpiStrip,
    syncDirectHealthFindings,
    maybeAutoSyncDirectHealthAfterExcelUpload,
    renderComparison,
    previewAuditReport,
    exportAuditReport,
    runPrePdfCheck,
    goFixDirectAiConsistency,
    openAiSummaryForConsistency,
    exportSlidesPptx,
    exportGoogleSlides,
    renderReportSendChecklist,
    saveSendChecklistItem,
    setReportClientView,
    initReportClientViewToggle,
};
