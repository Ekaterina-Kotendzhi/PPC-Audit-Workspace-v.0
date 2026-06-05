/** J-UX: подрежимы «Данные», сводка, группировка материалов, drawer. */
import { escapeHtml, formatMoney, formatNumber, jsAttr } from '../core/utils.js';
import { formatDate } from '../shared/timezone.js';
import { openModal } from '../core/modals.js';
import { DIRECT_COPY, hasDirectExcelSlice } from './direct-copy.js';
import { resolveDirectEnrichment } from './direct-enrichment-ux.js';
import { runtimeBridge } from '../core/runtime-bridge.js';
import { canWrite } from '../core/auth.js';

const DATA_SUBTAB_KEY = 'ppc_data_subtab';
let activeDataSubtab = 'direct';

const MATERIAL_GROUP_ORDER = [
    { id: 'documents', label: 'Документы и Excel', types: ['document', 'table'] },
    { id: 'screenshots', label: 'Скриншоты', types: ['screenshot', 'screenshot_ocr'] },
    { id: 'notes', label: 'Заметки и аудио', types: ['text_note', 'audio', 'audio_transcript'] },
    { id: 'other', label: 'Прочее', types: [] },
    { id: 'system', label: 'Служебные', types: [], system: true },
];

let materialsSearchQuery = '';
let sourcesAiFilter = 'all';
let lastMaterialsPayload = null;

const SOURCES_AI_FILTERS = [
    { id: 'all', labelKey: 'materialAiFilterAll' },
    { id: 'in_ai', labelKey: 'materialAiFilterInAi' },
    { id: 'out_ai', labelKey: 'materialAiFilterOutAi' },
    { id: 'accounted', labelKey: 'materialAiFilterAccounted' },
    { id: 'stale', labelKey: 'materialAiFilterStale' },
];

const TYPE_LABELS = {
    text_note: 'Заметка',
    audio: 'Аудио',
    audio_transcript: 'Расшифровка',
    screenshot: 'Скриншот',
    screenshot_ocr: 'OCR',
    manual_metrics: 'Метрики',
    table: 'Таблица',
    document: 'Документ',
};

const MATERIAL_CARD_THEME = {
    document: { accent: 'var(--accent-doc)', label: 'Документ' },
    table: { accent: 'var(--accent-doc)', label: 'Таблица' },
    screenshot: { accent: 'var(--primary)', label: 'Скриншот' },
    text_note: { accent: 'var(--accent-note)', label: 'Заметка' },
    audio: { accent: 'var(--accent-audio)', label: 'Аудио' },
    audio_transcript: { accent: 'var(--accent-audio)', label: 'Расшифровка' },
};

export function isDirectDataSubtabActive() {
    const pane = document.getElementById('dataPaneDirect');
    return Boolean(pane && !pane.hidden && pane.classList.contains('is-active'));
}

export function isSourcesDataSubtabActive() {
    const pane = document.getElementById('dataPaneSources');
    return Boolean(pane && !pane.hidden && pane.classList.contains('is-active'));
}

export function findScreenshotOcrSibling(materials, screenshot) {
    if (!screenshot || screenshot.type !== 'screenshot') return null;
    const label = `OCR/описание: ${screenshot.title || ''}`;
    return (materials || []).find((o) => o.type === 'screenshot_ocr' && o.title === label) || null;
}

function switchDataSubtab(name) {
    const normalized = name === 'now' ? 'direct' : name;
    const allowed = ['sources', 'direct'];
    const tab = allowed.includes(normalized) ? normalized : 'direct';
    activeDataSubtab = tab;
    try {
        sessionStorage.setItem(DATA_SUBTAB_KEY, tab);
    } catch (_e) { /* ignore */ }

    document.querySelectorAll('[data-flow-tab]').forEach((btn) => {
        const match = btn.getAttribute('data-flow-tab') === tab;
        btn.classList.toggle('is-active', match);
        btn.setAttribute('aria-selected', match ? 'true' : 'false');
    });

    const panes = {
        sources: document.getElementById('dataPaneSources'),
        direct: document.getElementById('dataPaneDirect'),
    };
    Object.entries(panes).forEach(([key, el]) => {
        if (!el) return;
        const on = key === tab;
        el.classList.toggle('is-active', on);
        el.hidden = !on;
    });
    runtimeBridge.renderDataIssues?.();
    const data = runtimeBridge.getAuditData?.();
    if (data) {
        runtimeBridge.renderGuidedFirstRun?.(data);
        updateDataSubtabsFlow(data);
        if (tab === 'sources') {
            updateSourcesToolbar((data.materials || []).filter((m) => m.type !== 'manual_metrics'));
        }
    }
}

function restoreDataSubtab(data) {
    const hasDirect = hasDirectExcelSlice(data);
    try {
        const saved = sessionStorage.getItem(DATA_SUBTAB_KEY);
        if (saved && ['sources', 'direct', 'now'].includes(saved)) {
            activeDataSubtab = saved === 'now' ? 'direct' : saved;
        } else if (hasDirect) {
            activeDataSubtab = 'direct';
        } else {
            activeDataSubtab = 'direct';
        }
    } catch (_e) { /* ignore */ }
    switchDataSubtab(activeDataSubtab);
}

function isAuditAnalysisCompleted(data) {
    if (!data) return false;
    const ws = data?.workflow_state || {};
    if (ws.analysis_running || data.status === 'in_progress') return false;
    return ws.state === 'ANALYSIS_DONE' || ws.state === 'REPORT_READY' || data.status === 'completed';
}

export function handleDataFlowRunAi() {
    const data = runtimeBridge.getAuditData?.();
    if (!data) return;
    if (isAuditAnalysisCompleted(data)) {
        runtimeBridge.rerunAuditAnalysis?.();
    } else {
        runtimeBridge.runAuditAnalysis?.();
    }
}

export function updateDataSubtabsFlow(data) {
    const nav = document.getElementById('dataSubtabs');
    const dirBtn = document.getElementById('dataSubtabDirect');
    const srcBtn = document.getElementById('dataSubtabSources');
    const runBtn = document.getElementById('dataSubtabRunAi');
    const runLabel = document.getElementById('dataSubtabRunAiLabel');
    if (!nav || !runBtn) return;

    const step1Done = hasDirectExcelSlice(data);
    const materials = (data?.materials || []).filter(
        (m) => m.type !== 'manual_metrics' && !isSystemMaterial(m),
    );
    const step2Done = materials.length > 0;
    const ws = data?.workflow_state || {};
    const running = Boolean(ws.analysis_running || data?.status === 'in_progress');
    const analysisDone = isAuditAnalysisCompleted(data);
    const ui = data?.workflow_ui?.primary_button || {};

    nav.classList.toggle('data-flow--s1-done', step1Done);
    nav.classList.toggle('data-flow--s2-done', step2Done);
    nav.classList.toggle('data-flow--s3-done', analysisDone);
    dirBtn?.classList.toggle('data-flow-btn--done', step1Done);
    srcBtn?.classList.toggle('data-flow-btn--done', step2Done);
    runBtn.classList.toggle('data-flow-btn--done', analysisDone);
    runBtn.classList.toggle('data-flow-btn--ready', step1Done && !running && !analysisDone);
    runBtn.classList.toggle('data-flow-btn--running', running);

    runBtn.disabled = running || !step1Done || (!analysisDone && ui.enabled === false);

    if (runLabel) {
        if (running) runLabel.textContent = DIRECT_COPY.dataFlowStep3Running;
        else if (analysisDone) runLabel.textContent = DIRECT_COPY.dataFlowStep3Rerun;
        else runLabel.textContent = DIRECT_COPY.dataFlowStep3Run;
    }
    runBtn.title = analysisDone
        ? DIRECT_COPY.rerunAnalysisFoot
        : (step1Done
            ? (ui.reason_disabled || 'Excel Директа + материалы с галочкой «В AI»')
            : 'Сначала загрузите Excel на шаге 1 · Директ');

    if (dirBtn) {
        dirBtn.title = step1Done
            ? DIRECT_COPY.healthScoreTooltip
            : 'Шаг 1: загрузите Excel из Яндекс Директа';
    }
    if (srcBtn) {
        const srcCount = materials.length;
        srcBtn.title = srcCount > 0
            ? `Шаг 2: материалов ${srcCount}. Отметьте «В AI» на карточках.`
            : 'Шаг 2: заметки, скрины, документы (по желанию)';
    }
}

function updateDataSubtabBadges(data) {
    updateDataSubtabsFlow(data);
    const materials = data?.materials || [];
    if (isSourcesDataSubtabActive()) {
        updateSourcesToolbar(materials.filter((m) => m.type !== 'manual_metrics'));
    }
}

function isMaterialAiSelectable(m) {
    if (!m || isSystemMaterial(m)) return false;
    if (m.type === 'manual_metrics' || m.type === 'audio' || m.type === 'screenshot_ocr') return false;
    return ['text_note', 'document', 'screenshot', 'audio_transcript', 'table'].includes(m.type);
}

function isMaterialAiIncluded(m) {
    if (!isMaterialAiSelectable(m)) return false;
    return !m.excluded_from_analysis;
}

function isDirectExcelMaterial(m) {
    const sl = m?.document_slice;
    return Boolean(sl && sl.format === 'yandex_direct_xlsx');
}

function buildAiRunContext(data) {
    const fresh = data?.analysis_freshness || {};
    return {
        hasRun: Boolean(fresh.last_analysis_at),
        staleIds: new Set((fresh.stale_materials || []).map((x) => Number(x.id))),
        lastIds: new Set((fresh.material_ids_in_last_analysis || []).map((x) => Number(x))),
    };
}

/** Статус участия в последнем / следующем AI (не путать с галочкой «В AI»). */
function getMaterialAiRunState(m, ctx) {
    if (isSystemMaterial(m)) {
        return { code: 'system', label: null, badgeClass: '' };
    }
    if (isDirectExcelMaterial(m)) {
        if (!ctx.hasRun) {
            return {
                code: 'direct_pending',
                label: DIRECT_COPY.materialAiStatusDirect,
                badgeClass: 'badge-info',
                title: DIRECT_COPY.materialAiStatusTooltip.direct,
            };
        }
        if (ctx.staleIds.has(Number(m.id))) {
            return {
                code: 'direct_stale',
                label: DIRECT_COPY.materialAiStatusDirectStale,
                badgeClass: 'badge-warning',
                title: DIRECT_COPY.materialAiStatusTooltip.direct_stale,
            };
        }
        return {
            code: 'direct_accounted',
            label: DIRECT_COPY.materialAiStatusDirectAccounted,
            badgeClass: 'badge-ready',
            title: DIRECT_COPY.materialAiStatusTooltip.direct_accounted,
        };
    }
    if (!isMaterialAiSelectable(m)) {
        return { code: 'na', label: null, badgeClass: '' };
    }
    if (!isMaterialAiIncluded(m)) {
        return {
            code: 'excluded',
            label: DIRECT_COPY.materialAiFilterOutAi,
            badgeClass: 'badge-draft',
            title: 'Исключён из следующего AI-анализа',
        };
    }
    if (!ctx.hasRun) {
        return {
            code: 'pending_first',
            label: DIRECT_COPY.materialAiStatusPending,
            badgeClass: 'badge-info',
            title: DIRECT_COPY.materialAiStatusTooltip.pending,
        };
    }
    if (ctx.staleIds.has(Number(m.id))) {
        return {
            code: 'stale',
            label: DIRECT_COPY.materialAiStatusStale,
            badgeClass: 'badge-warning',
            title: DIRECT_COPY.materialAiStatusTooltip.stale,
        };
    }
    if (ctx.lastIds.has(Number(m.id))) {
        return {
            code: 'accounted',
            label: DIRECT_COPY.materialAiStatusAccounted,
            badgeClass: 'badge-ready',
            title: DIRECT_COPY.materialAiStatusTooltip.accounted,
        };
    }
    return {
        code: 'queue',
        label: DIRECT_COPY.materialAiStatusQueue,
        badgeClass: 'badge-info',
        title: DIRECT_COPY.materialAiStatusTooltip.queue,
    };
}

function materialAiStatusBadgeHtml(state) {
    if (!state?.label) return '';
    const cls = state.badgeClass || 'badge-draft';
    const title = state.title ? ` title="${escapeHtml(state.title)}"` : '';
    return `<span class="badge source-card__status ${cls}"${title}>${escapeHtml(state.label)}</span>`;
}

function materialMatchesAiFilter(m, filter, ctx) {
    if (filter === 'all' || !filter) return true;
    const state = getMaterialAiRunState(m, ctx);
    if (filter === 'in_ai') {
        return isMaterialAiIncluded(m) || isDirectExcelMaterial(m);
    }
    if (filter === 'out_ai') {
        return state.code === 'excluded';
    }
    if (filter === 'accounted') {
        return state.code === 'accounted' || state.code === 'direct_accounted';
    }
    if (filter === 'stale') {
        return state.code === 'stale' || state.code === 'direct_stale';
    }
    return true;
}

function setSourcesAiFilter(filterId) {
    const allowed = SOURCES_AI_FILTERS.map((f) => f.id);
    sourcesAiFilter = allowed.includes(filterId) ? filterId : 'all';
    if (lastMaterialsPayload) {
        renderMaterialsGrouped(
            lastMaterialsPayload.materials,
            lastMaterialsPayload.coverage,
            lastMaterialsPayload.helpers,
        );
    }
}

function getMaterialAiHint(m) {
    return (m?.marketer_ai_hint || '').trim();
}

function isSemanticsExportMaterial(m) {
    if (m?.document_kind === 'direct_semantics_export') return true;
    if (m?.document_slice?.format === 'direct_semantics_export') return true;
    const head = (m?.extracted_text || '').slice(0, 400).toLowerCase();
    return head.includes('справочник фраз')
        || (head.includes('## тексты') && !head.includes('мастер отчёт'));
}

function materialCardExcerptLine(m, materials) {
    if (isSemanticsExportMaterial(m)) {
        const sheets = m.document_slice?.sheets;
        const sheetHint = Array.isArray(sheets) && sheets.length
            ? `Листы: ${sheets.slice(0, 4).join(', ')}`
            : 'Тексты, фразы, минус-слова';
        return { tone: 'muted', text: `${sheetHint} — семантика для AI, не KPI-отчёт` };
    }
    if (m.type === 'screenshot') {
        const ocr = findScreenshotOcrSibling(materials, m);
        const text = (ocr?.extracted_text || '').trim();
        if (text) {
            return { tone: 'muted', text: text.slice(0, 120) + (text.length > 120 ? '…' : '') };
        }
        return { tone: 'muted', text: 'Без OCR — AI опирается на название' };
    }
    const text = (m.extracted_text || '').trim();
    if (text) {
        if (/не удалось распознать|не распознан/i.test(text)) {
            return {
                tone: 'warn',
                text: 'Нужен «Мастер отчётов» Директа (Расход, Клики, Конверсии, строка «Итого»).',
            };
        }
        if (text.length > 100 && (text.startsWith('#') || text.includes('## '))) {
            return { tone: 'muted', text: 'Текст загружен — детали в карточке' };
        }
        return { tone: 'muted', text: text.slice(0, 120) + (text.length > 120 ? '…' : '') };
    }
    if (m.type === 'audio' && m.file_url) {
        return { tone: 'muted', text: 'Добавьте расшифровку в карточке' };
    }
    return { tone: 'muted', text: 'Откройте карточку' };
}

function materialCardPreview(m, materials) {
    if (m.type === 'screenshot' && m.file_url) {
        return `<div class="source-card__thumb"><img src="${m.file_url}" alt="" loading="lazy" /></div>`;
    }
    const line = materialCardExcerptLine(m, materials);
    const cls = line.tone === 'warn' ? 'source-card__excerpt source-card__excerpt--warn' : 'source-card__excerpt muted';
    return `<p class="${cls}">${escapeHtml(line.text)}</p>`;
}

function countSourcesAiSelection(materials) {
    const rows = (materials || []).filter((m) => isMaterialAiSelectable(m) && m.type !== 'screenshot_ocr');
    const included = rows.filter((m) => isMaterialAiIncluded(m)).length;
    return { total: rows.length, included };
}

function renderSourcesAiFilters(data, materials) {
    const wrap = document.getElementById('sourcesAiFilterWrap');
    if (!wrap) return;
    const rows = (materials || []).filter((m) => m.type !== 'manual_metrics' && !isSystemMaterial(m));
    if (!rows.length) {
        wrap.hidden = true;
        wrap.innerHTML = '';
        return;
    }
    const ctx = buildAiRunContext(data || runtimeBridge.getAuditData?.() || {});
    const counts = { all: rows.length, in_ai: 0, out_ai: 0, accounted: 0, stale: 0 };
    rows.forEach((m) => {
        if (materialMatchesAiFilter(m, 'in_ai', ctx)) counts.in_ai += 1;
        if (materialMatchesAiFilter(m, 'out_ai', ctx)) counts.out_ai += 1;
        if (materialMatchesAiFilter(m, 'accounted', ctx)) counts.accounted += 1;
        if (materialMatchesAiFilter(m, 'stale', ctx)) counts.stale += 1;
    });
    wrap.hidden = false;
    wrap.title = DIRECT_COPY.materialAiFilterLead;
    wrap.innerHTML = SOURCES_AI_FILTERS.map((f) => {
        const active = sourcesAiFilter === f.id;
        const n = counts[f.id] ?? 0;
        const label = DIRECT_COPY[f.labelKey] || f.id;
        return `<button type="button" class="sources-ai-filters__chip${active ? ' is-active' : ''}"
            data-ai-filter="${f.id}" onclick="setSourcesAiFilter('${f.id}')">${escapeHtml(label)}${n ? ` (${n})` : ''}</button>`;
    }).join('');
}

function updateSourcesToolbar(materials) {
    const badge = document.getElementById('sourcesAiCountBadge');
    const searchWrap = document.getElementById('sourcesSearchWrap');
    const reocrBtn = document.getElementById('btnReocrAllScreenshots');
    const data = runtimeBridge.getAuditData?.() || null;
    const screenshotCount = (materials || []).filter((m) => m.type === 'screenshot').length;
    if (reocrBtn) {
        const show = screenshotCount > 0 && typeof canWrite === 'function' && canWrite();
        reocrBtn.style.display = show ? '' : 'none';
        reocrBtn.textContent = DIRECT_COPY.screenshotReocrAll || 'Распознать все скрины';
        reocrBtn.title = 'Tesseract: текст попадёт в AI-анализ';
    }
    const { total, included } = countSourcesAiSelection(materials);
    if (badge) {
        if (!total) {
            badge.hidden = true;
            badge.textContent = '';
        } else {
            badge.hidden = false;
            badge.textContent = DIRECT_COPY.sourcesAiCount(included, total);
            badge.title = DIRECT_COPY.sourcesAiPanelLead;
        }
    }
    if (searchWrap) {
        searchWrap.hidden = total < 4;
    }
    renderSourcesAiFilters(data, materials);
}

function isSystemMaterial(m) {
    const title = String(m?.title || '').toLowerCase();
    if (m?.type === 'document' && /срез данных|яндекс директ/i.test(title)) return true;
    if (m?.type === 'text_note' && title.startsWith('# срез')) return true;
    return false;
}

function renderDataNowSummary(data) {
    const el = document.getElementById('dataNowSummary');
    if (!el) return;
    if (isDirectDataSubtabActive() || !hasDirectExcelSlice(data)) {
        el.innerHTML = '';
        el.style.display = 'none';
        return;
    }
    el.style.display = '';

    const da = data?.direct_analytics;
    const health = da?.health;
    const monthly = da?.monthly || [];

    let summaryLine = '';
    let directActions = '';
    if (health || monthly.length) {
        summaryLine = monthly.length
            ? DIRECT_COPY.sliceLoaded(monthly.length)
            : `Срез ${DIRECT_COPY.product} загружен.`;
        directActions = `
            <button type="button" class="btn btn-outline btn-sm" onclick="switchDataSubtab('direct'); scrollToDirectRisks()">${DIRECT_COPY.scrollToDirectRisksBtn}</button>`;
    } else {
        summaryLine = DIRECT_COPY.healthMissing();
    }

    const blockingBlock = '';

    el.innerHTML = `
        <div class="card data-now-summary-card data-now-summary-card--compact">
            <p class="data-now-value">${summaryLine}</p>
            ${blockingBlock}
            ${directActions ? `<div class="data-now-summary-actions">${directActions}</div>` : ''}
        </div>`;
}

function buildMetricsPeriodsTableHtml(periods, periodHint) {
    const rows = periods.map((p) => {
        const isActive = Boolean(p.is_active);
        const rowClass = isActive ? 'metrics-period-tr--active' : '';
        const onClick = '';
        const status = isActive ? '<span class="data-checklist-pill ready">В отчёте</span>' : '';
        const leadDetail = [
            p.leads != null ? formatNumber(p.leads) : null,
        ].filter(Boolean).join('');
        return `<tr class="${rowClass}"${onClick}>
            <td><strong>${escapeHtml(p.period || '—')}</strong> ${status}</td>
            <td>${p.budget != null ? formatMoney(p.budget) : '—'}</td>
            <td>${leadDetail || '—'}</td>
            <td>${p.cpl != null ? formatMoney(p.cpl) : '—'}</td>
            <td class="metrics-period-td-actions">
                <button type="button" class="btn btn-link btn-sm" onclick="event.stopPropagation(); openMetricsEditorEdit(${p.material_id})">Изменить</button>
            </td>
        </tr>`;
    }).join('');

    return `
        <div class="card data-checklist metrics-periods-card">
            <div class="data-checklist-head">
                <div>
                    <h3>Периоды KPI</h3>
                    <p class="data-checklist-summary metrics-periods-hint">${periodHint}</p>
                </div>
                <button type="button" class="btn btn-primary btn-sm" onclick="openMetricsEditorAddPeriod()">+ Период</button>
            </div>
            <div class="table-responsive">
                <table class="table table-compact metrics-periods-table">
                    <thead>
                        <tr><th>Месяц</th><th>Бюджет</th><th>Лиды</th><th>CPL</th><th></th></tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>`;
}

function wrapDirectCollapsible(title, innerHtml, { open = false, extraClass = '', id = '' } = {}) {
    if (!innerHtml?.trim()) return '';
    const idAttr = id ? ` id="${escapeHtml(id)}"` : '';
    return `
        <details class="direct-collapsible ${extraClass}"${idAttr} ${open ? 'open' : ''}>
            <summary class="direct-collapsible-summary">${escapeHtml(title)}</summary>
            <div class="direct-collapsible-body">${innerHtml}</div>
        </details>`;
}

/** Прокрутка к якорю на вкладке «Данные» → «Яндекс Директ» (после switchDataSubtab). */
function scrollToDirectSliceAnchor(anchorId) {
    const el = document.getElementById(anchorId);
    if (!el) return false;
    const details = el.closest('details.direct-collapsible') || (el.tagName === 'DETAILS' ? el : null);
    if (details) details.open = true;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    el.classList.add('direct-slice-highlight');
    window.setTimeout(() => el.classList.remove('direct-slice-highlight'), 2200);
    return true;
}

function closeMaterialDrawer() {
    const drawer = document.getElementById('materialDrawer');
    if (!drawer) return;
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('material-drawer-open');
}

function openMaterialDrawer(materialId, helpers) {
    const m = (helpers.getMaterialById || (() => null))(materialId);
    if (!m) return;
    const drawer = document.getElementById('materialDrawer');
    const body = document.getElementById('materialDrawerBody');
    const footer = document.getElementById('materialDrawerFooter');
    const titleEl = document.getElementById('materialDrawerTitle');
    if (!drawer || !body || !footer || !titleEl) return;

    const typeLabel = TYPE_LABELS[m.type] || m.type_label || m.type;
    const cardTitle = m.type === 'manual_metrics'
        ? (helpers.manualMetricsTitle?.(m) || 'Метрики')
        : `${typeLabel}${m.title ? ` — ${m.title}` : ''}`;
    titleEl.textContent = cardTitle;

    const materials = helpers.getAuditData?.()?.materials || [];
    const included = isMaterialAiIncluded(m);
    const hint = getMaterialAiHint(m);
    const auditData = helpers.getAuditData?.() || {};
    const runState = getMaterialAiRunState(m, buildAiRunContext(auditData));
    const badges = [
        included ? '<span class="badge badge-ready">В AI</span>' : '<span class="badge badge-draft">Не в AI</span>',
        runState.label ? `<span class="badge ${runState.badgeClass || 'badge-draft'}" title="${escapeHtml(runState.title || '')}">${escapeHtml(runState.label)}</span>` : null,
        m.needs_review ? '<span class="badge badge-draft">Можно уточнить</span>' : null,
    ].filter(Boolean).join(' ');

    let snippet = '';
    if (m.type === 'screenshot') {
        const ocr = findScreenshotOcrSibling(materials, m);
        const ocrText = (ocr?.extracted_text || '').trim();
        if (ocrText) {
            snippet = `<div class="material-drawer-section"><h4 class="material-drawer-section-title">Описание / OCR</h4><p class="material-drawer-snippet">${escapeHtml(ocrText)}</p></div>`;
        }
    } else if (m.extracted_text && m.type !== 'manual_metrics') {
        snippet = `<p class="material-drawer-snippet">${escapeHtml(m.extracted_text.slice(0, 4000))}${m.extracted_text.length > 4000 ? '…' : ''}</p>`;
    }

    const metricsBlock = m.type === 'manual_metrics' && m.raw_content && helpers.renderMetricsCompact
        ? helpers.renderMetricsCompact(m.raw_content)
        : '';

    const img = m.file_url && m.type === 'screenshot'
        ? `<div class="material-drawer-preview"><img src="${m.file_url}" class="material-drawer-img" alt="" /></div>`
        : '';
    const audio = m.file_url && m.type === 'audio'
        ? `<audio controls src="${m.file_url}" class="material-drawer-audio"></audio>`
        : '';

    const canWriteUser = helpers.canWrite?.() ?? false;
    const hintBlock = isMaterialAiSelectable(m) && canWriteUser
        ? `<div class="material-drawer-hint">
            <label class="form-label-compact" for="materialAiHintInput">${escapeHtml(DIRECT_COPY.materialAiHintLabel)}</label>
            <textarea id="materialAiHintInput" class="form-control" rows="3" placeholder="${escapeHtml(DIRECT_COPY.materialAiHintPlaceholder)}">${escapeHtml(hint)}</textarea>
            <button type="button" class="btn btn-outline btn-sm" onclick="saveMaterialAiHint(${m.id}, document.getElementById('materialAiHintInput').value)">${escapeHtml(DIRECT_COPY.materialAiHintSave)}</button>
           </div>`
        : (hint ? `<p class="material-drawer-hint-readonly"><strong>Подсказка:</strong> ${escapeHtml(hint)}</p>` : '');

    const softReview = m.needs_review && m.review_reason
        ? `<p class="material-drawer-soft-review muted">${escapeHtml(DIRECT_COPY.materialDrawerSoftReview)} ${escapeHtml(m.review_reason)}</p>`
        : '';

    body.innerHTML = `
        <div class="material-drawer-meta">${badges}</div>
        ${helpers.formatTimestamps?.(m.created_at, m.updated_at) || ''}
        ${img}
        ${audio}
        ${snippet}
        ${metricsBlock}
        ${hintBlock}
        ${softReview}`;

    const actions = [];
    if (m.type === 'document') {
        actions.push(`<button class="btn btn-primary btn-sm" onclick="openDocumentMaterialById(${m.id}); closeMaterialDrawer();">Открыть файл</button>`);
        if (canWriteUser) actions.push(`<button class="btn btn-outline btn-sm" onclick="editDocumentText(${m.id}); closeMaterialDrawer();">Текст</button>`);
    } else if (canWriteUser) {
        if (m.type === 'screenshot') {
            actions.push(`<button class="btn btn-outline btn-sm" onclick="rerunScreenshotOcr(${m.id})">${escapeHtml(DIRECT_COPY.screenshotRerunOcr)}</button>`);
        }
        actions.push(`<button class="btn btn-primary btn-sm" onclick="editMaterial(${m.id}); closeMaterialDrawer();">Редактировать</button>`);
    }
    if (canWriteUser) {
        actions.push(`<button class="btn btn-danger btn-sm" onclick="deleteMaterial(${m.id}); closeMaterialDrawer();">Удалить</button>`);
    }
    if (isMaterialAiSelectable(m) && canWriteUser) {
        actions.unshift(`<label class="material-ai-toggle material-ai-toggle--drawer">
            <input type="checkbox"${included ? ' checked' : ''}
                onchange="setMaterialAiInclusion(${m.id}, this.checked)" />
            <span>${escapeHtml(DIRECT_COPY.materialAiCheckboxLabel)}</span>
        </label>`);
    }
    footer.innerHTML = actions.join('');

    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('material-drawer-open');
}

function materialDisplayName(m, helpers) {
    if (m.__kpiLink) return 'KPI периоды';
    const typeLabel = TYPE_LABELS[m.type] || m.type || '';
    if (m.type === 'manual_metrics') {
        return helpers.manualMetricsTitle?.(m) || 'Метрики';
    }
    return (m.title || typeLabel || '').trim();
}

function materialMatchesSearch(m, query, helpers) {
    if (!query) return true;
    if (m.__kpiLink) return 'kpi период метрик'.includes(query);
    const typeLabel = TYPE_LABELS[m.type] || m.type || '';
    const haystack = `${materialDisplayName(m, helpers)} ${typeLabel} ${m.type || ''}`.toLowerCase();
    return haystack.includes(query);
}

function filterMaterialsList() {
    const input = document.getElementById('materialsSearchInput');
    materialsSearchQuery = (input?.value || '').trim().toLowerCase();
    if (lastMaterialsPayload) {
        renderMaterialsGrouped(
            lastMaterialsPayload.materials,
            lastMaterialsPayload.coverage,
            lastMaterialsPayload.helpers,
        );
    }
}

function renderMaterialsGrouped(materials, coverage, helpers) {
    const container = document.getElementById('materialsList');
    if (!container) return;

    lastMaterialsPayload = { materials, coverage, helpers };
    const searchQuery = materialsSearchQuery;
    const auditData = helpers.getAuditData?.() || runtimeBridge.getAuditData?.() || {};
    const aiCtx = buildAiRunContext(auditData);

    const filtered = materials.filter((m) => m.type !== 'manual_metrics');

    if (!filtered.length) {
        const optional = (coverage?.upload_suggestions || [])
            .slice(0, 8)
            .map((s) => `<li>${escapeHtml(s)}</li>`).join('');
        updateSourcesToolbar([]);
        container.innerHTML = `
            <div class="empty-state-card">
                <h3>Источники не загружены</h3>
                <p class="muted">Excel — на «Директ». Здесь — заметки, скрины, документы. Нажмите «+ Добавить».</p>
                <ul class="empty-checklist">${optional || '<li>Документ, скрин, заметка</li>'}</ul>
            </div>`;
        return;
    }

    const buckets = {};
    MATERIAL_GROUP_ORDER.forEach((g) => { buckets[g.id] = []; });

    filtered.forEach((m) => {
        if (m.type === 'screenshot_ocr') return;
        if (!materialMatchesAiFilter(m, sourcesAiFilter, aiCtx)) return;
        if (isSystemMaterial(m)) {
            buckets.system.push(m);
            return;
        }
        const g = MATERIAL_GROUP_ORDER.find((gr) => gr.types.includes(m.type));
        if (g) buckets[g.id].push(m);
        else buckets.other.push(m);
    });

    const renderCard = (m) => {
        const theme = MATERIAL_CARD_THEME[m.type] || { accent: 'var(--text-muted)', label: TYPE_LABELS[m.type] || m.type };
        const name = (m.title || theme.label).trim();
        const selectable = isMaterialAiSelectable(m);
        const included = isMaterialAiIncluded(m);
        const runState = getMaterialAiRunState(m, aiCtx);
        const hint = getMaterialAiHint(m);
        const statusBadge = materialAiStatusBadgeHtml(runState);
        const aiToggle = selectable
            ? `<label class="source-card__ai" onclick="event.stopPropagation()">
                <input type="checkbox"${included ? ' checked' : ''}${canWrite() ? '' : ' disabled'}
                    onchange="setMaterialAiInclusion(${m.id}, this.checked)" />
                <span>${escapeHtml(DIRECT_COPY.materialAiCheckboxLabel)}</span>
               </label>`
            : '';
        const cardClass = [
            'source-card',
            included ? 'source-card--in-ai' : 'source-card--out-ai',
            runState.code === 'accounted' || runState.code === 'direct_accounted' ? 'source-card--accounted' : '',
            runState.code === 'stale' || runState.code === 'direct_stale' ? 'source-card--stale' : '',
            m.needs_review ? 'source-card--soft-review' : '',
        ].filter(Boolean).join(' ');
        return `
            <article class="${cardClass}"
                role="button" tabindex="0"
                onclick="openMaterialDrawer(${m.id})"
                onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openMaterialDrawer(${m.id})}">
                <div class="source-card__row">
                    <div class="source-card__body">
                        <div class="source-card__meta">
                            <span class="source-card__type" style="--type-accent:${theme.accent}">${escapeHtml(theme.label)}</span>
                            ${statusBadge ? `<div class="source-card__status-row">${statusBadge}</div>` : ''}
                        </div>
                        <h4 class="source-card__name">${escapeHtml(name)}</h4>
                        ${materialCardPreview(m, filtered)}
                        ${hint ? `<p class="source-card__hint-line">${escapeHtml(hint.slice(0, 72))}${hint.length > 72 ? '…' : ''}</p>` : ''}
                    </div>
                    ${aiToggle ? `<div class="source-card__aside">${aiToggle}</div>` : ''}
                </div>
            </article>`;
    };

    const visibleBuckets = {};
    MATERIAL_GROUP_ORDER.forEach((g) => {
        visibleBuckets[g.id] = (buckets[g.id] || []).filter((m) => materialMatchesSearch(m, searchQuery, helpers));
    });

    const groupsHtml = MATERIAL_GROUP_ORDER.map((g) => {
        const items = visibleBuckets[g.id] || [];
        if (!items.length) return '';
        return `
            <section class="sources-group">
                <header class="sources-group__head">
                    <h3 class="sources-group__title">${escapeHtml(g.label)}</h3>
                    <span class="sources-group__count">${items.length}</span>
                </header>
                <div class="sources-grid">${items.map(renderCard).join('')}</div>
            </section>`;
    }).filter(Boolean).join('');

    const visibleCount = Object.values(visibleBuckets).reduce((n, arr) => n + arr.length, 0);
    if (searchQuery && visibleCount === 0 && filtered.length > 0) {
        container.innerHTML = `<p class="materials-search-empty">Ничего не найдено по запросу «${escapeHtml(searchQuery)}». <button type="button" class="btn btn-link btn-sm" onclick="clearMaterialsSearch()">Сбросить</button></p>`;
        return;
    }
    if (visibleCount === 0 && filtered.length > 0) {
        const filterLabel = (SOURCES_AI_FILTERS.find((f) => f.id === sourcesAiFilter) || {}).labelKey;
        const name = filterLabel ? (DIRECT_COPY[filterLabel] || sourcesAiFilter) : sourcesAiFilter;
        container.innerHTML = `<p class="materials-search-empty">Нет материалов в фильтре «${escapeHtml(name)}». <button type="button" class="btn btn-link btn-sm" onclick="setSourcesAiFilter('all')">Показать все</button></p>`;
        updateSourcesToolbar(filtered);
        return;
    }

    updateSourcesToolbar(filtered);
    container.innerHTML = groupsHtml || '<p class="muted">Нет материалов для отображения.</p>';
}

function clearMaterialsSearch() {
    const input = document.getElementById('materialsSearchInput');
    if (input) input.value = '';
    filterMaterialsList();
}

function openDirectConditionsModalHost(renderTablesFn) {
    const modal = document.getElementById('directConditionsModal');
    const body = document.getElementById('directConditionsModalBody');
    if (!modal || !body) return;
    body.innerHTML = `
        <p class="muted direct-conditions-meta">Полный список условий из Excel. Используйте фильтр кампании.</p>
        <div class="form-group direct-conditions-modal-filter">
            <label class="form-label-compact" for="directConditionsCampaignFilterModal">Кампания</label>
            <select id="directConditionsCampaignFilterModal" class="form-control form-control-compact"
                onchange="updateDirectConditionsViewModal()">
                <option value="">Все кампании</option>
            </select>
        </div>
        <div id="directConditionsTablesModal"></div>`;
    renderTablesFn?.('directConditionsTablesModal', 'directConditionsCampaignFilterModal');
    openModal('directConditionsModal');
}

export {
    switchDataSubtab,
    restoreDataSubtab,
    updateDataSubtabBadges,
    renderDataNowSummary,
    buildMetricsPeriodsTableHtml,
    wrapDirectCollapsible,
    renderMaterialsGrouped,
    filterMaterialsList,
    clearMaterialsSearch,
    setSourcesAiFilter,
    openMaterialDrawer,
    closeMaterialDrawer,
    openDirectConditionsModalHost,
    scrollToDirectSliceAnchor,
    isSystemMaterial,
};
