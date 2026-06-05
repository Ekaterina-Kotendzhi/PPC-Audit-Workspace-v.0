/** Audits list page (index.html) — epic H2. */
import { formatDate, formatAuditListDateTime, parseApiDateMs } from '../shared/timezone.js';
import { escapeHtml, showLoader, hideLoader } from '../core/utils.js';
import { showAlert } from '../core/alerts.js';
import { closeModal, openModal, showConfirmDialog } from '../core/modals.js';
import { apiRequest } from '../core/api.js';
import { requireWriteAccess } from '../core/auth.js';
import { runtimeBridge } from '../core/runtime-bridge.js';
import { normalizeOpsAlertSummary } from '../core/utils.js';


const AUDITS_FILTER_STORAGE_KEY = 'ppc_audits_filter';
const AUDITS_FILTER_INITIALIZED_KEY = 'ppc_audits_filter_initialized';
const AUDITS_PAGE_SIZE_STORAGE_KEY = 'ppc_audits_page_size';
const AUDITS_LIST_FILTER_MODES = new Set(['all', 'drafts', 'review', 'ready', 'archive']);

let auditsListCache = [];
let auditsActiveTabCache = [];
let auditsListTotal = 0;
let auditsActiveTotal = 0;
let auditsArchiveTotal = 0;
let auditsListFilter = 'all';
let auditsListSort = '-updated_at';
let auditsListPage = 1;
let auditsListPageSize = 10;
let auditsListSearchTimer = null;
const AUDITS_TABLE_COLSPAN = 6;
const AUDIT_ACTIONS_MENU_ID = 'auditActionsMenuFloating';
let auditActionsOpenForId = null;
let auditActionsMenuIgnoreOutsideClick = false;

function auditIssuesOpenCount(a) {
    return Number(a?.issues_open_count ?? a?.needs_review_count ?? 0) || 0;
}

function resolveAuditListUx(a) {
    if (a?.list_state && a?.primary_action) {
        return {
            listState: a.list_state,
            findingsDisplay: a.findings_display || '—',
            tasksDisplay: a.tasks_display || '—',
            primaryAction: a.primary_action,
            primaryActionLabel: a.primary_action_label || 'Открыть',
            exportAllowed: Boolean(a.export_allowed),
            exportBlockReason: a.export_block_reason || 'Доступен после AI-анализа и проверки выводов',
            goalFull: a.goal_full || a.goal || '',
            goalShort: a.goal_short || _goalShortClient(a.goal),
            statusLabel: a.list_state_label || a.status,
            statusBadge: a.status_badge || a.status,
            dataIndicatorsLabel: a.data_indicators_label || '—',
            dataIndicatorsTitle: a.data_indicators_tooltip || '',
            timezoneLabel: a.timezone_label || formatDate(a.created_at),
        };
    }
    const legacy = deriveAuditListUx(a);
    return {
        ...legacy,
        statusLabel: AUDITS_STATUS_LABELS[a?.status] || a?.status,
        statusBadge: a?.status,
        dataIndicatorsLabel: '—',
        dataIndicatorsTitle: '',
        timezoneLabel: formatDate(a.created_at),
    };
}

function _goalShortClient(goal) {
    const text = (goal || '').trim();
    if (!text) return '—';
    return text.length > 50 ? `${text.substring(0, 50)}…` : text;
}

function deriveAuditListUx(a) {
    const status = a?.status || 'draft';
    const findings = Number(a?.findings_count ?? 0) || 0;
    const materials = Number(a?.materials_count ?? 0) || 0;
    const issues = auditIssuesOpenCount(a);
    const stale = Boolean(a?.analysis_stale);
    const needsData = Boolean(a?.needs_data_attention);

    let listState;
    if (status === 'in_progress') {
        listState = 'ANALYSIS_RUNNING';
    } else if (status === 'failed') {
        listState = 'ANALYSIS_FAILED';
    } else if (stale && findings > 0) {
        listState = 'STALE';
    } else if (status === 'draft') {
        if (materials === 0) listState = 'DRAFT_EMPTY';
        else if (needsData || issues > 0) listState = 'DRAFT_DATA';
        else listState = 'READY_ANALYSIS';
    } else if (issues > 0 || status === 'needs_review') {
        listState = 'REVIEW_PENDING';
    } else if (status === 'completed') {
        listState = 'REPORT_READY';
    } else {
        listState = 'DRAFT_DATA';
    }

    let findingsDisplay;
    if (listState === 'DRAFT_EMPTY') findingsDisplay = '— · нет данных';
    else if (listState === 'DRAFT_DATA' || listState === 'READY_ANALYSIS') findingsDisplay = '— · анализ не запускался';
    else if (listState === 'ANALYSIS_RUNNING' || listState === 'ANALYSIS_FAILED') findingsDisplay = '—';
    else if (findings > 0 && stale) findingsDisplay = `${findings} · устар.`;
    else if (findings > 0) findingsDisplay = String(findings);
    else findingsDisplay = '0 · нет данных';

    let tasksDisplay;
    if (listState === 'DRAFT_EMPTY') tasksDisplay = 'Заполните данные';
    else if (listState === 'DRAFT_DATA') {
        tasksDisplay = issues > 0 ? `${issues} на проверке` : (needsData ? 'Заполните данные' : '—');
    } else if (listState === 'READY_ANALYSIS') tasksDisplay = '—';
    else if (listState === 'ANALYSIS_RUNNING') tasksDisplay = '—';
    else if (listState === 'ANALYSIS_FAILED') tasksDisplay = '1 · повторить';
    else if (issues > 0) tasksDisplay = `${issues} на проверке`;
    else tasksDisplay = '—';

    let primaryAction;
    let primaryActionLabel;
    if (listState === 'ANALYSIS_RUNNING') {
        primaryAction = 'disabled_running';
        primaryActionLabel = 'Анализ…';
    } else if (listState === 'ANALYSIS_FAILED' || listState === 'STALE') {
        primaryAction = 'run_analysis';
        primaryActionLabel = listState === 'STALE' ? 'Перезапустить AI' : 'Повторить анализ';
    } else if (listState === 'READY_ANALYSIS') {
        primaryAction = 'run_analysis';
        primaryActionLabel = 'Запустить анализ';
    } else if (listState === 'REVIEW_PENDING') {
        primaryAction = 'review_findings';
        primaryActionLabel = 'Проверить выводы';
    } else if (listState === 'REPORT_READY') {
        primaryAction = 'open';
        primaryActionLabel = 'Открыть отчёт';
    } else {
        primaryAction = 'continue';
        primaryActionLabel = 'Продолжить';
    }

    const exportAllowed = listState === 'REPORT_READY' && findings > 0;
    const exportBlockReason = exportAllowed ? '' : 'Доступен после AI-анализа и проверки выводов';

    const goalFull = a?.goal || '';
    const goalShort = goalFull
        ? (goalFull.length > 50 ? `${goalFull.substring(0, 50)}…` : goalFull)
        : '—';

    return {
        listState,
        findingsDisplay,
        tasksDisplay,
        primaryAction,
        primaryActionLabel,
        exportAllowed,
        exportBlockReason,
        goalFull,
        goalShort,
    };
}

function auditNeedsAttention(a) {
    if (typeof a?.requires_attention === 'boolean') return a.requires_attention;
    const ux = resolveAuditListUx(a);
    const issues = auditIssuesOpenCount(a);
    if (ux.listState === 'REPORT_READY' && issues === 0) return false;
    return (
        issues > 0
        || a?.status === 'needs_review'
        || a?.status === 'failed'
        || ux.listState === 'DRAFT_EMPTY'
        || (ux.listState === 'DRAFT_DATA' && Boolean(a?.needs_data_attention))
        || Boolean(a?.analysis_stale)
    );
}

function countAuditsNeedingAttention(audits) {
    return (audits || []).filter(auditNeedsAttention).length;
}

function auditIsDraft(a) {
    const ux = resolveAuditListUx(a);
    return ['DRAFT_EMPTY', 'DRAFT_DATA', 'READY_ANALYSIS'].includes(ux.listState);
}

/** Черновики без открытых задач (не пересекаются с вкладкой «На проверке»). */
function auditIsDraftOnly(a) {
    return auditIsDraft(a) && !auditNeedsAttention(a);
}

function auditIsReady(a) {
    return resolveAuditListUx(a).listState === 'REPORT_READY';
}

function countAuditsDrafts(audits) {
    return (audits || []).filter(auditIsDraftOnly).length;
}

function countAuditsReady(audits) {
    return (audits || []).filter(auditIsReady).length;
}

function auditsListFilterUsesTabLock() {
    return auditsListFilter !== 'all';
}

function setAuditsListFilter(mode) {
    if (!AUDITS_LIST_FILTER_MODES.has(mode)) return;
    auditsListFilter = mode;
    auditsListPage = 1;
    sessionStorage.setItem(AUDITS_FILTER_STORAGE_KEY, mode);
    sessionStorage.setItem(AUDITS_FILTER_INITIALIZED_KEY, '1');
    syncAuditsListFilterControls();
    loadAuditsList();
}

function auditsListToolbarFiltersActive() {
    const q = document.getElementById('auditsSearchInput')?.value?.trim();
    const statusEl = document.getElementById('auditsStatusFilter');
    const status = statusEl?.disabled ? '' : (statusEl?.value || '');
    const exportReady = Boolean(document.getElementById('auditsExportReadyFilter')?.checked);
    const errors = Boolean(document.getElementById('auditsErrorsFilter')?.checked);
    return Boolean(q || status || exportReady || errors);
}

function auditsListFiltersAreActive() {
    return auditsListToolbarFiltersActive() || auditsListFilter !== 'all';
}

function auditsListWorkspaceHasAudits() {
    return auditsActiveTotal > 0 || auditsArchiveTotal > 0 || auditsActiveTabCache.length > 0;
}

function auditsListChromeShouldShow(totalLoaded) {
    return totalLoaded > 0
        || auditsListWorkspaceHasAudits()
        || auditsListToolbarFiltersActive()
        || auditsListFilter !== 'all';
}

async function refreshAuditsTabBaseline() {
    try {
        const response = await fetch('/api/audits/?archived=false&limit=100&sort=-updated_at', {
            headers: { Accept: 'application/json' },
        });
        if (!response.ok) return;
        const audits = await response.json();
        auditsActiveTabCache = audits;
        auditsActiveTotal = parseInt(response.headers.get('X-Total-Count') || String(audits.length), 10);
    } catch {
        /* сохраняем предыдущие счётчики вкладок */
    }
}

function resolveAuditsListEmptyState() {
    if (auditsListToolbarFiltersActive()) {
        return {
            title: 'Ничего не найдено',
            body: 'По выбранному фильтру аудитов нет. Измените статус или поиск либо сбросьте фильтры.',
            showResetFilters: true,
            showShowAllTab: false,
        };
    }
    if (auditsListFilter !== 'all') {
        const msg = auditsListEmptyMessage(auditsListFilter);
        return { ...msg, showResetFilters: false, showShowAllTab: true };
    }
    if (auditsListWorkspaceHasAudits()) {
        return {
            title: 'Ничего не найдено',
            body: 'В текущей вкладке нет подходящих аудитов.',
            showResetFilters: false,
            showShowAllTab: false,
        };
    }
    const msg = auditsListEmptyMessage('all');
    return { ...msg, showResetFilters: false, showShowAllTab: false };
}

function renderAuditsListEmptyHtml(emptyState) {
    const buttons = [];
    if (emptyState.showResetFilters) {
        buttons.push('<button type="button" class="btn btn-outline btn-sm btn-mt-section" onclick="resetAuditsListFilters()">Сбросить фильтры</button>');
    }
    if (emptyState.showShowAllTab) {
        buttons.push('<button type="button" class="btn btn-outline btn-sm btn-mt-section" onclick="setAuditsListFilter(\'all\')">Показать все</button>');
    }
    return `
        <p class="audit-list-empty-title">${escapeHtml(emptyState.title)}</p>
        <p class="muted audit-list-empty-body">${escapeHtml(emptyState.body)}</p>
        ${buttons.length ? `<div class="audit-list-empty-actions">${buttons.join(' ')}</div>` : ''}`;
}

function updateAuditsResetFiltersVisibility() {
    const btn = document.getElementById('auditsResetFiltersBtn');
    const row = document.querySelector('.audits-toolbar-row-primary');
    const active = auditsListFiltersAreActive();
    if (btn) {
        btn.classList.toggle('is-hidden', !active);
        if (active) btn.removeAttribute('hidden');
        else btn.setAttribute('hidden', '');
    }
    if (row) row.classList.toggle('has-active-filters', active);
}

function resetAuditsListFilters() {
    const searchInput = document.getElementById('auditsSearchInput');
    const statusFilter = document.getElementById('auditsStatusFilter');
    if (searchInput) searchInput.value = '';
    if (statusFilter) statusFilter.value = '';
    ['auditsExportReadyFilter', 'auditsErrorsFilter'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.checked = false;
    });
    auditsListPage = 1;
    if (auditsListFilter !== 'all') {
        setAuditsListFilter('all');
    } else {
        loadAuditsList();
    }
    updateAuditsResetFiltersVisibility();
}

function syncAuditsListFilterControls() {
    const statusEl = document.getElementById('auditsStatusFilter');
    const mode = auditsListFilter;
    const tabLocksStatus = mode !== 'all';
    if (statusEl) {
        statusEl.disabled = tabLocksStatus;
        statusEl.title = tabLocksStatus ? 'На этой вкладке фильтр статуса задан вкладкой списка' : '';
        if (tabLocksStatus) statusEl.value = '';
    }
    updateAuditsResetFiltersVisibility();
}

function paginateAudits(list) {
    const total = list.length;
    const totalPages = Math.max(1, Math.ceil(total / auditsListPageSize));
    if (auditsListPage > totalPages) auditsListPage = totalPages;
    if (auditsListPage < 1) auditsListPage = 1;
    const startIndex = (auditsListPage - 1) * auditsListPageSize;
    return {
        items: list.slice(startIndex, startIndex + auditsListPageSize),
        total,
        totalPages,
        start: total ? startIndex + 1 : 0,
        end: Math.min(startIndex + auditsListPageSize, total),
    };
}

function goToAuditsPage(page) {
    auditsListPage = Math.max(1, page);
    applyAuditsListView();
}

function setAuditsListPageSize(size) {
    const next = parseInt(size, 10);
    if (![10, 25, 50].includes(next)) return;
    auditsListPageSize = next;
    auditsListPage = 1;
    sessionStorage.setItem(AUDITS_PAGE_SIZE_STORAGE_KEY, String(next));
    applyAuditsListView();
}

function renderAuditsPagination(meta) {
    const wrap = document.getElementById('auditsPagination');
    if (!wrap) return;
    if (!meta.total) {
        wrap.style.display = 'none';
        wrap.innerHTML = '';
        return;
    }
    wrap.style.display = 'flex';
    const { totalPages, total, start, end } = meta;
    const cur = auditsListPage;

    let pageButtons = '';
    const addPage = (p) => {
        const active = p === cur ? ' is-active' : '';
        pageButtons += `<button type="button" class="btn btn-outline btn-sm audits-page-btn${active}" onclick="goToAuditsPage(${p})">${p}</button>`;
    };
    if (totalPages <= 7) {
        for (let p = 1; p <= totalPages; p += 1) addPage(p);
    } else {
        addPage(1);
        if (cur > 3) pageButtons += '<span class="muted audits-page-ellipsis">…</span>';
        const from = Math.max(2, cur - 1);
        const to = Math.min(totalPages - 1, cur + 1);
        for (let p = from; p <= to; p += 1) addPage(p);
        if (cur < totalPages - 2) pageButtons += '<span class="muted audits-page-ellipsis">…</span>';
        addPage(totalPages);
    }

    const prevDisabled = cur <= 1 ? ' disabled' : '';
    const nextDisabled = cur >= totalPages ? ' disabled' : '';

    wrap.innerHTML = `
        <span class="audits-pagination-info">Показано ${start}–${end} из ${total}</span>
        <div class="audits-pagination-pages" role="navigation" aria-label="Страницы">
            <button type="button" class="btn btn-outline btn-sm audits-page-btn" onclick="goToAuditsPage(${cur - 1})"${prevDisabled} aria-label="Предыдущая страница">←</button>
            ${pageButtons}
            <button type="button" class="btn btn-outline btn-sm audits-page-btn" onclick="goToAuditsPage(${cur + 1})"${nextDisabled} aria-label="Следующая страница">→</button>
        </div>
        <label class="audits-pagination-size">Показывать по:
            <select id="auditsPageSizeSelect" class="form-control" aria-label="Записей на странице" onchange="setAuditsListPageSize(this.value)">
                <option value="10"${auditsListPageSize === 10 ? ' selected' : ''}>10</option>
                <option value="25"${auditsListPageSize === 25 ? ' selected' : ''}>25</option>
                <option value="50"${auditsListPageSize === 50 ? ' selected' : ''}>50</option>
            </select>
        </label>`;
}

async function fetchAuditsArchiveCount() {
    try {
        const response = await fetch('/api/audits/?archived=true&limit=1', {
            headers: { Accept: 'application/json' },
        });
        if (!response.ok) return;
        auditsArchiveTotal = parseInt(response.headers.get('X-Total-Count') || '0', 10);
    } catch {
        auditsArchiveTotal = 0;
    }
}

async function fetchAuditsActiveCount() {
    try {
        const response = await fetch('/api/audits/?archived=false&limit=1', {
            headers: { Accept: 'application/json' },
        });
        if (!response.ok) return;
        auditsActiveTotal = parseInt(response.headers.get('X-Total-Count') || '0', 10);
    } catch {
        auditsActiveTotal = 0;
    }
}

function sortAuditsForDisplay(audits, filterMode) {
    const list = [...(audits || [])];
    if (filterMode === 'review' && (!auditsListSort || auditsListSort === '-updated_at' || auditsListSort === '-created_at')) {
        list.sort((a, b) => {
            const diff = auditIssuesOpenCount(b) - auditIssuesOpenCount(a);
            if (diff !== 0) return diff;
            return parseApiDateMs(b.created_at) - parseApiDateMs(a.created_at);
        });
        return list;
    }

    const sort = auditsListSort || '-updated_at';
    const reverse = sort.startsWith('-');
    const field = sort.replace(/^-/, '');

    list.sort((a, b) => {
        let av;
        let bv;
        if (field === 'client_name') {
            av = (a.client_name || '').toLowerCase();
            bv = (b.client_name || '').toLowerCase();
            return reverse ? bv.localeCompare(av, 'ru') : av.localeCompare(bv, 'ru');
        }
        if (field === 'findings_count') {
            av = Number(a.findings_count) || 0;
            bv = Number(b.findings_count) || 0;
            return reverse ? bv - av : av - bv;
        }
        if (field === 'status') {
            av = (a.list_state_label || a.status || '').toLowerCase();
            bv = (b.list_state_label || b.status || '').toLowerCase();
            return reverse ? bv.localeCompare(av, 'ru') : av.localeCompare(bv, 'ru');
        }
        if (field === 'updated_at') {
            av = parseApiDateMs(a.updated_at || a.created_at);
            bv = parseApiDateMs(b.updated_at || b.created_at);
            return reverse ? bv - av : av - bv;
        }
        av = parseApiDateMs(a.created_at);
        bv = parseApiDateMs(b.created_at);
        return reverse ? bv - av : av - bv;
    });

    return list;
}

function filterAuditsForView(audits, filterMode) {
    const list = audits || [];
    switch (filterMode) {
        case 'drafts':
            return list.filter(auditIsDraftOnly);
        case 'review':
            return list.filter(auditNeedsAttention);
        case 'ready':
            return list.filter(auditIsReady);
        case 'archive':
            return [...list];
        case 'all':
        default:
            return [...list];
    }
}

function auditsListEmptyMessage(filterMode) {
    switch (filterMode) {
        case 'drafts':
            return {
                title: 'Нет черновиков',
                body: 'Черновики без открытых задач появятся здесь после создания аудита.',
            };
        case 'ready':
            return {
                title: 'Нет готовых отчётов',
                body: 'Завершённые аудиты с готовым отчётом появятся здесь после AI-анализа.',
            };
        case 'archive':
            return {
                title: 'Архив пуст',
                body: 'Архивированные аудиты будут показаны здесь.',
            };
        case 'review':
            return {
                title: 'Нет аудитов, требующих вашего действия',
                body: 'Среди показанных записей открытых задач и черновиков без данных нет.',
            };
        default:
            return {
                title: 'Нет аудитов',
                body: 'Создайте первый аудит, нажав кнопку «Новый аудит»',
            };
    }
}

function updateAuditsFilterChrome(reviewCount, totalLoaded) {
    const bar = document.getElementById('auditsListFilter');
    const toolbar = document.getElementById('auditsListToolbar');
    const tabs = {
        all: document.getElementById('auditsFilterAll'),
        drafts: document.getElementById('auditsFilterDrafts'),
        review: document.getElementById('auditsFilterReview'),
        ready: document.getElementById('auditsFilterReady'),
        archive: document.getElementById('auditsFilterArchive'),
    };
    const counts = {
        all: document.getElementById('auditsFilterAllCount'),
        drafts: document.getElementById('auditsFilterDraftsCount'),
        review: document.getElementById('auditsFilterReviewCount'),
        ready: document.getElementById('auditsFilterReadyCount'),
        archive: document.getElementById('auditsFilterArchiveCount'),
    };
    if (!bar || !tabs.all) return;

    const countSource = auditsListFilter === 'archive'
        ? auditsActiveTabCache
        : (auditsActiveTabCache.length ? auditsActiveTabCache : auditsListCache);
    const keepChrome = auditsListChromeShouldShow(totalLoaded);
    bar.style.display = keepChrome ? 'flex' : 'none';
    if (toolbar) toolbar.style.display = keepChrome ? 'flex' : 'none';

    const allCount = auditsListFilter === 'archive'
        ? (auditsActiveTotal || auditsActiveTabCache.length)
        : (auditsActiveTotal || totalLoaded);
    const draftCount = countAuditsDrafts(countSource);
    const readyCount = countAuditsReady(countSource);
    const reviewTabCount = countAuditsNeedingAttention(countSource);

    if (counts.all) counts.all.textContent = String(allCount);
    if (counts.drafts) counts.drafts.textContent = String(draftCount);
    if (counts.review) counts.review.textContent = String(reviewTabCount);
    if (counts.ready) counts.ready.textContent = String(readyCount);
    if (counts.archive) counts.archive.textContent = String(auditsArchiveTotal);

    Object.entries(tabs).forEach(([mode, btn]) => {
        if (!btn) return;
        const active = auditsListFilter === mode;
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-selected', String(active));
    });
    updateAuditsSortHeaderChrome();
}

function updateAuditsListHint(totalLoaded, filteredCount) {
    const hint = document.getElementById('auditsListHint');
    if (!hint) return;

    if (totalLoaded === 0 && auditsListFilter !== 'archive') {
        if (auditsListToolbarFiltersActive() && auditsActiveTotal > 0) {
            hint.innerHTML = `Нет аудитов по фильтру · всего в базе <strong>${auditsActiveTotal}</strong>`;
            hint.style.display = 'block';
            return;
        }
        if (auditsListToolbarFiltersActive()) {
            hint.textContent = 'Нет аудитов по текущим фильтрам';
            hint.style.display = 'block';
            return;
        }
        hint.style.display = 'none';
        hint.textContent = '';
        hint.innerHTML = '';
        return;
    }

    const reviewCount = countAuditsNeedingAttention(
        auditsListFilter === 'archive' ? auditsActiveTabCache : auditsListCache
    );
    const shown = auditsListFilter === 'archive' ? totalLoaded : totalLoaded;
    const parts = [];

    if (auditsListFilter !== 'archive') {
        hint.innerHTML = `<strong>${reviewCount}</strong> требуют проверки из <strong>${shown}</strong> показанных`;
        hint.style.display = 'block';
    } else {
        hint.textContent = `В архиве: ${shown} аудитов`;
        hint.style.display = shown ? 'block' : 'none';
    }

    if (auditsListTotal > totalLoaded && auditsListFilter !== 'archive') {
        parts.push(`загружено ${totalLoaded} из ${auditsListTotal} по текущим фильтрам`);
    }
    if (auditsListFilter === 'review' && filteredCount === 0 && totalLoaded > 0) {
        parts.push('нет аудитов, требующих вашего действия');
    }
    if (parts.length) {
        hint.innerHTML += `<span class="audits-hint-extra"> · ${escapeHtml(parts.join(' · '))}</span>`;
    }
}

const AUDITS_STATUS_LABELS = {
    draft: 'Черновик',
    in_progress: 'В обработке',
    completed: 'Завершён',
    needs_review: 'Требует проверки',
    failed: 'Ошибка',
};

function resolveAuditPrimaryShortLabel(ux) {
    if (ux.primaryActionLabel) {
        return ux.primaryActionLabel;
    }
    switch (ux.listState) {
        case 'ANALYSIS_RUNNING':
            return 'Анализ…';
        case 'ANALYSIS_FAILED':
            return 'Повторить анализ';
        case 'STALE':
            return 'Перезапустить AI';
        default:
            break;
    }
    if (ux.primaryAction === 'disabled_running') return 'Анализ…';
    if (ux.primaryAction === 'run_analysis') return 'Запустить анализ';
    if (ux.primaryAction === 'review_findings') return 'Проверить выводы';
    if (ux.primaryAction === 'open') return 'Открыть отчёт';
    return 'Продолжить';
}

function renderAuditPrimaryAction(a, ux) {
    const id = a.id;
    const shortLabel = resolveAuditPrimaryShortLabel(ux);
    const label = escapeHtml(shortLabel);
    const fullLabel = ux.primaryActionLabel || shortLabel;
    const titleAttr = fullLabel !== shortLabel ? ` title="${escapeHtml(fullLabel)}"` : (fullLabel ? ` title="${escapeHtml(fullLabel)}"` : '');
    if (ux.primaryAction === 'run_analysis') {
        return `<button type="button" class="btn btn-primary btn-sm btn-audit-primary"${titleAttr} onclick="runAnalysis(${id})">${label}</button>`;
    }
    if (ux.primaryAction === 'disabled_running') {
        return `<button type="button" class="btn btn-primary btn-sm btn-audit-primary" disabled${titleAttr}>${label}</button>`;
    }
    return `<button type="button" class="btn btn-primary btn-sm btn-audit-primary"${titleAttr} onclick="openAudit(${id})">${label}</button>`;
}

function renderAuditRowActionsCell(a, ux) {
    const primary = `
        <div class="audit-row-actions-stack">
            ${renderAuditPrimaryAction(a, ux)}
            ${renderAuditActionsMenu(a, ux)}
        </div>`;
    return renderAuditRowSurface(primary, '', { compact: true });
}

function formatClientNameDisplay(name) {
    const text = (name || '').trim();
    if (!text) return { display: '—', full: '' };
    return { display: text, full: text };
}

function updateAuditsSortHeaderChrome() {
    const sort = auditsListSort || '-updated_at';
    const field = sort.replace(/^-/, '');
    const reverse = sort.startsWith('-');
    document.querySelectorAll('.audits-sort-btn').forEach((btn) => {
        const btnField = btn.getAttribute('data-sort-field');
        const active = btnField === field;
        btn.classList.toggle('is-active', active);
        let indicator = btn.querySelector('.sort-indicator');
        if (!indicator) {
            indicator = document.createElement('span');
            indicator.className = 'sort-indicator';
            btn.appendChild(indicator);
        }
        indicator.textContent = active ? (reverse ? '▼' : '▲') : '';
    });
}

function toggleAuditsListSort(field) {
    if (auditsListSort === field) {
        auditsListSort = `-${field}`;
    } else if (auditsListSort === `-${field}`) {
        auditsListSort = field;
    } else {
        auditsListSort = field === 'updated_at' ? '-updated_at' : `-${field}`;
    }
    auditsListPage = 1;
    applyAuditsListView();
}

function buildAuditsListUrl() {
    const params = new URLSearchParams({ limit: '100' });
    const q = document.getElementById('auditsSearchInput')?.value?.trim();
    const statusEl = document.getElementById('auditsStatusFilter');
    const status = statusEl?.disabled ? '' : statusEl?.value;
    if (q) params.set('q', q);
    if (status) params.set('status', status);
    if (document.getElementById('auditsExportReadyFilter')?.checked) params.set('export_ready', 'true');
    if (document.getElementById('auditsErrorsFilter')?.checked) params.set('has_errors', 'true');
    params.set('archived', auditsListFilter === 'archive' ? 'true' : 'false');
    if (auditsListSort) params.set('sort', auditsListSort);
    return `/api/audits/?${params.toString()}`;
}

function initAuditsListToolbar() {
    const savedPageSize = parseInt(sessionStorage.getItem(AUDITS_PAGE_SIZE_STORAGE_KEY) || '10', 10);
    if ([10, 25, 50].includes(savedPageSize)) auditsListPageSize = savedPageSize;

    const searchInput = document.getElementById('auditsSearchInput');
    const statusFilter = document.getElementById('auditsStatusFilter');
    const exportReady = document.getElementById('auditsExportReadyFilter');
    const errorsFilter = document.getElementById('auditsErrorsFilter');
    if (!searchInput) return;

    const reload = () => {
        auditsListPage = 1;
        updateAuditsResetFiltersVisibility();
        loadAuditsList();
    };
    searchInput.addEventListener('input', () => {
        clearTimeout(auditsListSearchTimer);
        auditsListSearchTimer = setTimeout(reload, 350);
    });
    searchInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            clearTimeout(auditsListSearchTimer);
            reload();
        }
    });
    searchInput.addEventListener('input', updateAuditsResetFiltersVisibility);
    statusFilter?.addEventListener('change', () => {
        if (auditsListFilterUsesTabLock()) setAuditsListFilter('all');
        reload();
    });
    [exportReady, errorsFilter].forEach((el) => {
        if (!el) return;
        el.addEventListener('change', reload);
    });
    syncAuditsListFilterControls();
    updateAuditsResetFiltersVisibility();
    window.addEventListener('resize', closeAllAuditActionsMenus);
    window.addEventListener('scroll', closeAllAuditActionsMenus, true);
}

function renderFindingsCell(ux) {
    const text = ux.findingsDisplay || '—';
    let cls = 'audit-findings-status';
    if (text === 'Анализ не запускался') cls += ' is-pending';
    else if (text === 'Нет данных' || text.startsWith('0')) cls += ' is-empty';
    return `<span class="${cls}">${escapeHtml(text)}</span>`;
}

function renderStatusNote(ux) {
    const draftStates = ['DRAFT_EMPTY', 'DRAFT_DATA', 'READY_ANALYSIS'];
    if (draftStates.includes(ux.listState)) return 'Без анализа';
    const fd = (ux.findingsDisplay || '').toLowerCase();
    if (fd.includes('анализ не запускался') || fd.includes('нет данных')) return 'Без анализа';
    if (fd.includes('устар')) return ux.findingsDisplay;
    return '';
}

function resolveAuditRowAccentClass(listState) {
    return resolveAuditPlaqueClass(listState).replace('is-plaque-', 'audit-row-accent-');
}

function renderAuditRowSurface(primaryHtml, secondaryHtml, options = {}) {
    const secondary = (secondaryHtml || '').trim();
    const compact = options.compact ? ' audit-row-surface-compact' : '';
    const secondaryClass = secondary ? 'audit-row-line-secondary' : 'audit-row-line-secondary is-empty';
    return `
        <div class="audit-row-surface${compact}">
            <div class="audit-row-line-primary">${primaryHtml}</div>
            <div class="${secondaryClass}">${secondary ? secondary : ''}</div>
        </div>`;
}

function renderDataIndicatorsBadges(a, ux) {
    const ind = (a?.data_indicators && typeof a.data_indicators === 'object') ? a.data_indicators : {};
    const badge = (label, ok) => {
        const cls = ok ? 'audit-data-badge is-ok' : 'audit-data-badge is-empty';
        const check = ok ? '<span class="audit-data-check" aria-hidden="true">✓</span>' : '';
        return `<span class="${cls}">${escapeHtml(label)}${check}</span>`;
    };
    const filesCount = Number(ind.files_count) || 0;
    const primary = `<div class="audit-data-inline">
        ${badge('Метрика', Boolean(ind.metrics))}
        ${badge('Заметки', Boolean(ind.notes))}
    </div>`;
    const secondary = badge(`Файлы ${filesCount}`, filesCount > 0);
    return renderAuditRowSurface(primary, secondary);
}

function normalizeTasksLabel(rawLabel, hasCount) {
    const text = (rawLabel || '').trim();
    if (!text || text === '—') return '—';
    if (text === 'Заполните данные') return text;
    if (hasCount || /^\d+\s/.test(text) || /проверк/i.test(text)) return 'на проверке';
    return text;
}

function parseTasksDisplay(tasksDisplay) {
    const text = (tasksDisplay || '').trim();
    if (!text || text === '—' || text === 'Заполните данные') {
        return { count: null, label: text || '—', showOpen: false };
    }
    const match = text.match(/^(\d+)\s*(.*)$/);
    if (match) {
        return { count: match[1], label: normalizeTasksLabel(text, true), showOpen: true };
    }
    return { count: null, label: normalizeTasksLabel(text, false), showOpen: /проверк/i.test(text) };
}

function renderTasksCell(a, ux) {
    const parsed = parseTasksDisplay(ux.tasksDisplay);
    const showLink = Boolean(parsed.count) || parsed.label === 'Заполните данные';
    const openLink = showLink
        ? `<a href="/audit/${a.id}" class="audit-task-link" onclick="event.preventDefault(); openAudit(${a.id})">Открыть →</a>`
        : '';
    const labelCls = !parsed.count && parsed.label === 'Заполните данные'
        ? 'audit-task-muted'
        : (!parsed.count ? 'audit-list-cell-muted' : 'audit-task-label');
    const primary = `
        <div class="audit-task-stack">
            <span class="audit-task-count${parsed.count ? '' : ' is-empty'}">${escapeHtml(parsed.count || '')}</span>
            <span class="${labelCls}">${escapeHtml(parsed.label)}</span>
        </div>`;
    return renderAuditRowSurface(primary, openLink);
}

function resolveAuditPlaqueClass(listState) {
    switch (listState) {
        case 'REPORT_READY':
            return 'is-plaque-ready';
        case 'REVIEW_PENDING':
            return 'is-plaque-review';
        case 'READY_ANALYSIS':
            return 'is-plaque-ready';
        case 'ANALYSIS_RUNNING':
            return 'is-plaque-running';
        case 'ANALYSIS_FAILED':
        case 'STALE':
            return 'is-plaque-warn';
        default:
            return 'is-plaque-draft';
    }
}

function renderAuditRowPlaque(a, ux) {
    const plaqueClass = resolveAuditPlaqueClass(ux.listState);
    const statusLabel = ux.statusLabel || '';
    const title = statusLabel ? ` title="${escapeHtml(statusLabel)}"` : '';
    return `<span class="audit-row-plaque ${plaqueClass}"${title} aria-label="Аудит ${a.id}${statusLabel ? `, ${statusLabel}` : ''}">${a.id}</span>`;
}

function _isPlaceholderText(text) {
    const t = (text || '').trim();
    return !t || t === '—';
}

function renderAuditClientCell(a, ux) {
    const client = formatClientNameDisplay(a.client_name);
    const clientTitle = client.full ? ` title="${escapeHtml(client.full)}"` : '';
    const nicheRaw = (a.niche_display || a.niche || '').trim();
    const goalText = ux.goalShort || '';
    const secondaryParts = [];
    if (!_isPlaceholderText(nicheRaw)) secondaryParts.push(nicheRaw);
    if (!_isPlaceholderText(goalText)) secondaryParts.push(goalText);
    if (a.has_contacts) secondaryParts.push('контакт ✓');
    const secondaryText = secondaryParts.join(' · ');
    const secondaryTitle = secondaryParts.length
        ? ` title="${escapeHtml(secondaryParts.join(' · '))}"`
        : '';
    const primary = `<a href="/audit/${a.id}" class="audit-client-name"${clientTitle}
            onclick="event.preventDefault(); openAudit(${a.id})">${escapeHtml(client.display)}</a>`;
    const surface = renderAuditRowSurface(primary, secondaryText ? escapeHtml(secondaryText) : '');
    return `
        <div class="audit-client-head">
            ${renderAuditRowPlaque(a, ux)}
            ${surface.replace('class="audit-row-surface"', `class="audit-row-surface"${secondaryTitle}`)}
        </div>`;
}

function resolveAuditStatusBadgeClass(ux) {
    if (ux.listState === 'READY_ANALYSIS') return 'is-status-ready';
    return '';
}

function renderAuditStatusCell(a, ux) {
    const note = renderStatusNote(ux);
    const statusClass = resolveAuditStatusBadgeClass(ux);
    const extraCls = statusClass ? ` ${statusClass}` : '';
    const primary = `<span class="audit-status-badge is-list-status${extraCls}">${escapeHtml(ux.statusLabel)}</span>`;
    return renderAuditRowSurface(primary, note ? escapeHtml(note) : '');
}

function renderAuditDateCell(a, ux) {
    const dt = a.updated_at || a.created_at;
    const primary = formatAuditListDateTime(dt);
    const created = formatAuditListDateTime(a.created_at);
    const showCreatedHint = a.created_at && a.updated_at && a.created_at !== a.updated_at;
    const source = a.source_label ? ` · источник: ${a.source_label}` : '';
    const title = showCreatedHint
        ? `Создан: ${created.full}\nИзменён: ${primary.full}${source}`
        : `${primary.full}${source}`;
    const primaryHtml = `<span class="audit-date-day">${escapeHtml(primary.date)}</span>`;
    const secondaryHtml = `<span class="audit-date-time">${escapeHtml(primary.time)}</span>`;
    return `
        <div class="audit-row-surface audit-row-surface-date" title="${escapeHtml(title)}">
            <div class="audit-row-line-primary">${primaryHtml}</div>
            <div class="audit-row-line-secondary">${secondaryHtml}</div>
        </div>`;
}

function buildAuditActionsMenuItems(a, ux) {
    const id = a.id;
    const isDraft = ['DRAFT_EMPTY', 'DRAFT_DATA', 'READY_ANALYSIS'].includes(ux.listState);
    const items = [];

    items.push({ label: 'Редактировать клиента', onclick: `openEditClientModal(${id})` });
    items.push({
        label: a.has_contacts ? 'Изменить контакты' : 'Добавить контакт',
        onclick: `openContactModalFromList(${id})`,
    });
    items.push({ divider: true });
    items.push({ label: 'Дублировать аудит', onclick: `duplicateAudit(${id})` });
    if (!isDraft) {
        items.push({ label: 'История запусков', onclick: `window.location.href='/audit-runs?audit_id=${id}'` });
    }
    if (a.is_archived) {
        items.push({ label: 'Из архива', onclick: `toggleArchiveAudit(${id}, false)` });
    } else {
        items.push({ label: 'Архивировать', onclick: `toggleArchiveAudit(${id}, true)` });
    }
    if (ux.exportAllowed && !['export'].includes(ux.primaryAction)) {
        items.push({ label: 'Экспорт PDF', onclick: `exportAudit(${id})` });
    }
    items.push({ divider: true });
    items.push({ label: 'Удалить аудит', onclick: `deleteAudit(${id})`, className: 'is-danger' });
    return items;
}

function renderAuditActionsMenu(a, ux) {
    const id = a.id;
    return `
        <div class="audit-actions-menu-wrap" data-audit-menu-wrap="${id}">
            <button type="button" id="auditActionsBtn-${id}" class="btn btn-outline btn-sm audit-actions-menu-btn" aria-haspopup="menu" aria-expanded="false" aria-controls="${AUDIT_ACTIONS_MENU_ID}" aria-label="Дополнительные действия" onclick="toggleAuditActionsMenu(event, ${id})" title="Дополнительные действия"><span class="menu-chevron" aria-hidden="true">▾</span></button>
        </div>`;
}

function ensureAuditActionsFloatingMenu() {
    let menu = document.getElementById(AUDIT_ACTIONS_MENU_ID);
    if (!menu) {
        menu = document.createElement('div');
        menu.id = AUDIT_ACTIONS_MENU_ID;
        menu.className = 'audit-actions-menu';
        menu.hidden = true;
        menu.setAttribute('role', 'menu');
        document.body.appendChild(menu);
    }
    return menu;
}

function buildAuditActionsMenuHtml(a, ux) {
    const items = buildAuditActionsMenuItems(a, ux);
    return items.map((item) => {
        if (item.divider) return '<div class="audit-actions-menu-divider" role="separator"></div>';
        return `
            <button type="button" class="audit-actions-menu-item ${item.className || ''}" role="menuitem"
                onclick="closeAllAuditActionsMenus(); ${item.onclick}">${escapeHtml(item.label)}</button>`;
    }).join('');
}

function closeAllAuditActionsMenus() {
    const menu = document.getElementById(AUDIT_ACTIONS_MENU_ID);
    if (menu) {
        menu.hidden = true;
        menu.innerHTML = '';
        menu.style.top = '';
        menu.style.left = '';
        menu.style.maxHeight = '';
        menu.style.overflowY = '';
        menu.style.visibility = '';
        menu.classList.remove('is-open');
    }
    document.querySelectorAll('.audit-actions-menu-btn').forEach((el) => el.setAttribute('aria-expanded', 'false'));
    auditActionsOpenForId = null;
}

function positionAuditActionsMenu(menu, btn) {
    menu.hidden = false;
    menu.classList.add('is-open');
    menu.style.position = 'fixed';
    menu.style.zIndex = '10000';
    menu.style.visibility = 'hidden';
    menu.style.top = '0';
    menu.style.left = '0';
    menu.style.maxHeight = 'none';
    menu.style.overflowY = 'visible';

    const margin = 8;
    const gap = 6;
    const rect = btn.getBoundingClientRect();
    const menuWidth = menu.offsetWidth || 230;
    const menuHeight = menu.scrollHeight;

    let left = rect.right - menuWidth;
    left = Math.max(margin, Math.min(left, window.innerWidth - menuWidth - margin));

    let top = rect.bottom + gap;
    if (top + menuHeight > window.innerHeight - margin) {
        top = rect.top - menuHeight - gap;
    }
    if (top < margin) {
        top = margin;
    }
    if (top + menuHeight > window.innerHeight - margin) {
        menu.style.maxHeight = `${window.innerHeight - margin * 2}px`;
        menu.style.overflowY = 'auto';
    }

    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
    menu.style.visibility = 'visible';
}

function toggleAuditActionsMenu(event, auditId) {
    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === 'function') {
        event.stopImmediatePropagation();
    }
    const btn = event.currentTarget;
    if (!btn) return;

    if (auditActionsOpenForId === auditId) {
        closeAllAuditActionsMenus();
        return;
    }

    const audit = auditsListCache.find((row) => String(row.id) === String(auditId));
    if (!audit) return;
    const ux = resolveAuditListUx(audit);
    const menu = ensureAuditActionsFloatingMenu();

    closeAllAuditActionsMenus();
    menu.innerHTML = buildAuditActionsMenuHtml(audit, ux);
    positionAuditActionsMenu(menu, btn);
    btn.setAttribute('aria-expanded', 'true');
    auditActionsOpenForId = auditId;
    auditActionsMenuIgnoreOutsideClick = true;
    requestAnimationFrame(() => {
        auditActionsMenuIgnoreOutsideClick = false;
    });
}
document.addEventListener('click', (event) => {
    if (auditActionsMenuIgnoreOutsideClick) return;
    if (!event.target.closest('.audit-actions-menu-wrap') && !event.target.closest(`#${AUDIT_ACTIONS_MENU_ID}`)) {
        closeAllAuditActionsMenus();
    }
});
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeAllAuditActionsMenus();
});

function renderAuditTableRow(a) {
    const ux = resolveAuditListUx(a);
    const dataTitle = ux.dataIndicatorsTitle ? ` title="${escapeHtml(ux.dataIndicatorsTitle)}"` : '';
    const rowAccent = resolveAuditRowAccentClass(ux.listState);
    return `
        <tr class="audit-table-row ${rowAccent}">
            <td class="audit-client-cell">${renderAuditClientCell(a, ux)}</td>
            <td class="audit-col-status">${renderAuditStatusCell(a, ux)}</td>
            <td class="audit-list-data-cell"${dataTitle}>${renderDataIndicatorsBadges(a, ux)}</td>
            <td class="audit-col-tasks">${renderTasksCell(a, ux)}</td>
            <td class="col-date">${renderAuditDateCell(a, ux)}</td>
            <td class="col-actions">${renderAuditRowActionsCell(a, ux)}</td>
        </tr>`;
}

function renderAuditsListError(tbody, message, cardsWrap) {
    const errorHtml = `
        <p class="audit-list-error-title">Не удалось загрузить список</p>
        <p class="muted audit-list-error-body">${escapeHtml(message)}</p>
        <button type="button" class="btn btn-outline btn-sm" onclick="loadAuditsList()">Повторить</button>`;
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="${AUDITS_TABLE_COLSPAN}" class="audit-list-state-cell audit-list-state-cell--error">
                    ${errorHtml}
                </td>
            </tr>`;
    }
    if (cardsWrap) {
        cardsWrap.innerHTML = `<div class="audit-list-card audit-list-card-error">${errorHtml}</div>`;
    }
}

function renderAuditsCards(audits, cardsWrap, emptyKind) {
    if (!cardsWrap) return;
    if (!audits.length) {
        const empty = emptyKind === 'filter' || emptyKind === 'toolbar'
            ? resolveAuditsListEmptyState()
            : auditsListEmptyMessage('all');
        const emptyState = emptyKind === 'filter' || emptyKind === 'toolbar'
            ? empty
            : { ...empty, showResetFilters: false, showShowAllTab: false };
        cardsWrap.innerHTML = `
            <div class="audit-list-card audit-list-card-empty">
                ${renderAuditsListEmptyHtml(emptyState)}
            </div>`;
        return;
    }
    cardsWrap.innerHTML = audits.map((a) => {
        const ux = resolveAuditListUx(a);
        const dataTitle = ux.dataIndicatorsTitle ? ` title="${escapeHtml(ux.dataIndicatorsTitle)}"` : '';
        return `
        <article class="audit-list-card">
            <div class="audit-list-card-section audit-list-card-client-wrap">
                ${renderAuditClientCell(a, ux)}
            </div>
            <div class="audit-list-card-section audit-list-card-status-wrap">
                ${renderAuditStatusCell(a, ux)}
            </div>
            <div class="audit-list-card-section audit-list-data-cell"${dataTitle}>
                ${renderDataIndicatorsBadges(a, ux)}
            </div>
            <div class="audit-list-card-section audit-col-tasks">
                ${renderTasksCell(a, ux)}
            </div>
            <div class="audit-list-card-section audit-list-card-date-wrap col-date">
                ${renderAuditDateCell(a, ux)}
            </div>
            <div class="audit-list-card-actions">
                ${renderAuditRowActionsCell(a, ux)}
            </div>
        </article>`;
    }).join('');
}

function applyAuditsListView() {
    const tbody = document.getElementById('auditsTableBody');
    const cardsWrap = document.getElementById('auditsCardsWrap');
    if (!tbody) return;

    closeAllAuditActionsMenus();
    syncAuditsListFilterControls();

    const totalLoaded = auditsListCache.length;
    const reviewCount = countAuditsNeedingAttention(
        auditsListFilter === 'archive' ? auditsActiveTabCache : auditsListCache
    );
    updateAuditsFilterChrome(reviewCount, totalLoaded);

    if (totalLoaded === 0) {
        const emptyState = resolveAuditsListEmptyState();
        tbody.innerHTML = `
            <tr>
                <td colspan="${AUDITS_TABLE_COLSPAN}" class="audit-list-state-cell audit-list-state-cell--muted">
                    ${renderAuditsListEmptyHtml(emptyState)}
                </td>
            </tr>`;
        renderAuditsCards([], cardsWrap, auditsListToolbarFiltersActive() ? 'toolbar' : 'filter');
        updateAuditsListHint(0, 0);
        renderAuditsPagination({ total: 0, totalPages: 1, start: 0, end: 0, items: [] });
        runtimeBridge.applyRoleUiRestrictions?.();
        runtimeBridge.applyAdminUiSegmentation?.();
        return;
    }

    const filtered = filterAuditsForView(auditsListCache, auditsListFilter);
    const sorted = sortAuditsForDisplay(filtered, auditsListFilter);
    const page = paginateAudits(sorted);
    updateAuditsListHint(totalLoaded, filtered.length);
    renderAuditsPagination(page);

    if (!page.items.length) {
        const emptyState = resolveAuditsListEmptyState();
        tbody.innerHTML = `
            <tr>
                <td colspan="${AUDITS_TABLE_COLSPAN}" class="audit-list-state-cell audit-list-state-cell--muted">
                    ${renderAuditsListEmptyHtml(emptyState)}
                </td>
            </tr>`;
        renderAuditsCards([], cardsWrap, 'filter');
    } else {
        tbody.innerHTML = page.items.map(renderAuditTableRow).join('');
        renderAuditsCards(page.items, cardsWrap, 'none');
    }

    runtimeBridge.applyRoleUiRestrictions?.();
    runtimeBridge.applyAdminUiSegmentation?.();
    updateAuditsSortHeaderChrome();
}

async function loadAuditsList() {
    const tbody = document.getElementById('auditsTableBody');
    const cardsWrap = document.getElementById('auditsCardsWrap');
    const hint = document.getElementById('auditsListHint');
    if (!tbody) return;

    const savedFilter = sessionStorage.getItem(AUDITS_FILTER_STORAGE_KEY);
    if (savedFilter && AUDITS_LIST_FILTER_MODES.has(savedFilter)) {
        auditsListFilter = savedFilter;
    }

    const loadingHtml = `
        <div class="loader loader-dark audit-list-loader"></div>
        Загрузка...`;
    tbody.innerHTML = `
        <tr>
            <td colspan="${AUDITS_TABLE_COLSPAN}" class="audit-list-state-cell">
                ${loadingHtml}
            </td>
        </tr>`;
    if (cardsWrap) {
        cardsWrap.innerHTML = `<div class="audit-list-card audit-list-loader-wrap">${loadingHtml}</div>`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
        const response = await fetch(buildAuditsListUrl(), {
            headers: { 'Accept': 'application/json' },
            signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            const detail = error.detail;
            let message = typeof detail === 'string' ? detail : '';
            if (!message && response.status === 500) {
                message = 'Ошибка сервера (500). Часто: повреждённая база data/app.db — остановите Docker, выполните scripts/reset-dev-data.ps1 -Force и перезапустите сервер.';
            }
            if (!message) {
                message = `Ошибка сервера (${response.status})`;
            }
            throw new Error(message);
        }

        const audits = await response.json();
        const toolbarFiltered = auditsListToolbarFiltersActive();
        auditsListCache = audits;
        auditsListTotal = parseInt(response.headers.get('X-Total-Count') || String(audits.length), 10);
        if (auditsListFilter === 'archive') {
            auditsArchiveTotal = auditsListTotal;
        } else if (!toolbarFiltered) {
            auditsActiveTabCache = audits;
            auditsActiveTotal = auditsListTotal;
        }

        if (!sessionStorage.getItem(AUDITS_FILTER_INITIALIZED_KEY)) {
            const reviewSource = toolbarFiltered ? auditsActiveTabCache : audits;
            const reviewCount = countAuditsNeedingAttention(reviewSource.length ? reviewSource : audits);
            if (reviewCount > 0) {
                auditsListFilter = 'review';
                sessionStorage.setItem(AUDITS_FILTER_STORAGE_KEY, 'review');
            }
            sessionStorage.setItem(AUDITS_FILTER_INITIALIZED_KEY, '1');
        }

        const finalizeListLoad = async () => {
            if (auditsListFilter !== 'archive' && toolbarFiltered) {
                await refreshAuditsTabBaseline();
            } else if (auditsListFilter === 'archive' && !auditsActiveTabCache.length) {
                await fetchAuditsActiveCount();
            }
            await fetchAuditsArchiveCount();
            applyAuditsListView();
        };
        await finalizeListLoad();

    } catch (error) {
        clearTimeout(timeoutId);
        auditsListCache = [];
        auditsListTotal = 0;
        const message = error.name === 'AbortError'
            ? 'Превышено время ожидания. Проверьте, что сервер запущен.'
            : (error.message || 'Неизвестная ошибка');
        renderAuditsListError(tbody, message, cardsWrap);
        const filterBar = document.getElementById('auditsListFilter');
        if (filterBar) filterBar.style.display = 'none';
        if (hint) hint.style.display = 'none';
        showAlert('Ошибка загрузки списка аудитов: ' + message, 'danger');
    }
}

async function loadOpsAlerts() {
    const banner = document.getElementById('opsAlertBanner');
    if (!banner) return;
    try {
        const data = await apiRequest('/api/telemetry/ops?hours=24');
        const alerts = Array.isArray(data?.alerts) ? data.alerts : [];
        if (!alerts.length) {
            banner.style.display = 'none';
            banner.classList.remove('critical');
            banner.innerHTML = '';
            return;
        }
        const hasCritical = alerts.some((a) => String(a?.severity || '').toLowerCase() === 'critical');
        banner.classList.toggle('critical', hasCritical);
        const failedLine = alerts.find((a) => /неуспешн/i.test(String(a.message || '')));
        const summary = normalizeOpsAlertSummary(
            failedLine?.message || alerts[0]?.message || 'Есть операционные предупреждения'
        );
        banner.innerHTML = `
            <div class="ops-alert-compact">
                <span class="ops-alert-icon" aria-hidden="true">⚠</span>
                <p class="ops-alert-title">${escapeHtml(summary)}</p>
                <a class="ops-alert-link" href="/audit-runs?status=failed">История запусков →</a>
            </div>`;
        banner.style.display = 'flex';
    } catch (_error) {
        banner.style.display = 'none';
    }
}
let nichePresetsCache = null;

async function ensureNichePresetsLoaded() {
    if (nichePresetsCache) return nichePresetsCache;
    try {
        nichePresetsCache = await apiRequest('/api/niche-presets');
    } catch (_e) {
        nichePresetsCache = { categories: [] };
    }
    return nichePresetsCache;
}

function nicheFormIds(mode) {
    const prefix = mode === 'create' ? 'create' : 'edit';
    return {
        category: `${prefix}NicheCategory`,
        subcategory: `${prefix}NicheSubcategory`,
        hint: `${prefix}NicheSubnicheHint`,
        preview: `${prefix}NichePreview`,
    };
}

function populateNicheCategorySelect(mode) {
    const ids = nicheFormIds(mode);
    const select = document.getElementById(ids.category);
    if (!select || !nichePresetsCache?.categories) return;
    const current = select.value;
    select.innerHTML = '<option value="">— выберите —</option>' + nichePresetsCache.categories.map((cat) =>
        `<option value="${escapeHtml(cat.label)}">${escapeHtml(cat.label)}</option>`
    ).join('');
    if (current) select.value = current;
    updateNicheSubnicheUi(mode);
}

function updateNicheSubnicheUi(mode) {
    const ids = nicheFormIds(mode);
    const select = document.getElementById(ids.category);
    const hint = document.getElementById(ids.hint);
    const label = select?.value || '';
    const cat = (nichePresetsCache?.categories || []).find((c) => c.label === label);
    if (hint) {
        hint.textContent = cat?.subniche_placeholder || 'Уточните поднишу для более точного аудита';
    }
    updateNichePreview(mode);
}

function updateNichePreview(mode) {
    const ids = nicheFormIds(mode);
    const select = document.getElementById(ids.category);
    const sub = document.getElementById(ids.subcategory);
    const preview = document.getElementById(ids.preview);
    if (!preview) return;
    const cat = (select?.value || '').trim();
    const subVal = (sub?.value || '').trim();
    if (!cat && !subVal) {
        preview.style.display = 'none';
        preview.textContent = '';
        return;
    }
    preview.style.display = 'block';
    preview.textContent = cat && subVal ? `Показывается как: ${cat} / ${subVal}` : (cat || subVal);
}

function fillEditClientForm(data) {
    const form = document.getElementById('editClientForm');
    if (!form || !data) return;
    form.querySelector('#editClientAuditId').value = data.audit_id;
    form.client_name.value = data.client_name || '';
    if (form.region) form.region.value = data.region || '';
    form.niche_category.value = data.niche_category || '';
    form.niche_subcategory.value = data.niche_subcategory || '';
    if (!data.niche_category && !data.niche_subcategory && data.niche_display) {
        const preview = document.getElementById('editNichePreview');
        if (preview) {
            preview.style.display = 'block';
            preview.textContent = `Legacy-ниша: «${data.niche_display}». Выберите категорию и поднишу для уточнения.`;
        }
    }
    form.website.value = data.website || '';
    form.goal.value = data.goal || '';
    form.comment.value = data.comment || '';
    updateNicheSubnicheUi('edit');
}

async function openEditClientModal(auditId) {
    if (!requireWriteAccess('Редактирование клиента')) return;
    const id = auditId || runtimeBridge.getCurrentAuditId() || runtimeBridge.getAuditIdFromUrl();
    if (!id) return;
    showLoader();
    try {
        await ensureNichePresetsLoaded();
        populateNicheCategorySelect('edit');
        const data = await apiRequest(`/api/audits/${id}/client`);
        fillEditClientForm(data);
        openModal('editClientModal');
    } catch (error) {
        showAlert('Не удалось загрузить данные клиента: ' + error.message, 'danger');
    } finally {
        hideLoader();
    }
}

async function saveEditClient() {
    if (!requireWriteAccess('Редактирование клиента')) return;
    const form = document.getElementById('editClientForm');
    if (!form) return;
    const auditId = form.querySelector('#editClientAuditId')?.value;
    if (!auditId) return;
    const formData = new FormData(form);
    const payload = {
        client_name: formData.get('client_name'),
        region: formData.get('region'),
        niche_category: formData.get('niche_category'),
        niche_subcategory: formData.get('niche_subcategory'),
        website: formData.get('website'),
        goal: formData.get('goal'),
        comment: formData.get('comment'),
    };
    if (!String(payload.client_name || '').trim()) {
        showAlert('Введите название клиента', 'warning');
        return;
    }
    showLoader();
    try {
        const updated = await apiRequest(`/api/audits/${auditId}/client`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
        });
        closeModal('editClientModal');
        const path = window.location.pathname;
        if (path === '/' || path === '/index.html') {
            loadAuditsList();
        } else {
            runtimeBridge.onClientSaved?.(auditId, updated);
        }
        showAlert('Данные клиента сохранены', 'success');
    } catch (error) {
        showAlert('Ошибка сохранения: ' + error.message, 'danger');
    } finally {
        hideLoader();
    }
}

let clientContactsCache = [];
let listPageContactAuditId = null;

async function openContactModalFromList(auditId) {
    if (!requireWriteAccess('Контакты клиента')) return;
    listPageContactAuditId = auditId;
    showLoader();
    try {
        const contacts = await apiRequest(`/api/audits/${auditId}/contacts`);
        clientContactsCache = contacts || [];
        if (clientContactsCache.length > 0) {
            window.location.href = `/audits/${auditId}#client-contacts`;
            return;
        }
        fillContactForm(null);
        const title = document.getElementById('editContactModalTitle');
        if (title) title.textContent = 'Добавить контакт';
        openModal('editContactModal');
    } catch (error) {
        showAlert('Не удалось открыть контакты: ' + error.message, 'danger');
    } finally {
        hideLoader();
    }
}

function renderClientContacts(contacts) {
    clientContactsCache = contacts || [];
    const wrap = document.getElementById('clientContactsList');
    if (!wrap) return;
    if (!clientContactsCache.length) {
        wrap.innerHTML = '<p class="muted">Контакты не добавлены. Добавьте ЛПР или маркетолога — данные не уходят в AI.</p>';
        return;
    }
    wrap.innerHTML = clientContactsCache.map((c) => {
        const lines = [
            c.phone ? `<div>Тел.: ${escapeHtml(c.phone)}</div>` : '',
            c.email ? `<div>Email: ${escapeHtml(c.email)}</div>` : '',
            c.messenger ? `<div>Мессенджер: ${escapeHtml(c.messenger)}</div>` : '',
            c.comment ? `<div class="muted">${escapeHtml(c.comment)}</div>` : '',
        ].filter(Boolean).join('');
        return `
            <article class="client-contact-card">
                <div class="client-contact-head">
                    <div>
                        <span class="client-contact-name">${escapeHtml(c.name)}</span>
                        ${c.role ? `<span class="client-contact-role">${escapeHtml(c.role)}</span>` : ''}
                    </div>
                    <div class="client-contact-actions">
                        <button type="button" class="btn btn-outline btn-sm" onclick="openContactModal(${c.id})">Изм.</button>
                        <button type="button" class="btn btn-outline btn-sm" onclick="deleteContact(${c.id})">Удалить</button>
                    </div>
                </div>
                ${lines ? `<div class="client-contact-lines">${lines}</div>` : ''}
            </article>`;
    }).join('');
}

function fillContactForm(contact) {
    const form = document.getElementById('editContactForm');
    if (!form) return;
    form.name.value = contact?.name || '';
    form.role.value = contact?.role || '';
    form.phone.value = contact?.phone || '';
    form.email.value = contact?.email || '';
    form.messenger.value = contact?.messenger || '';
    form.comment.value = contact?.comment || '';
    document.getElementById('editContactId').value = contact?.id || '';
}

function openContactModal(contactId) {
    if (!requireWriteAccess('Контакты клиента')) return;
    const title = document.getElementById('editContactModalTitle');
    if (contactId) {
        const contact = clientContactsCache.find((c) => c.id === contactId);
        if (!contact) return;
        fillContactForm(contact);
        if (title) title.textContent = 'Редактировать контакт';
    } else {
        fillContactForm(null);
        if (title) title.textContent = 'Добавить контакт';
    }
    openModal('editContactModal');
}

async function refreshClientContacts() {
    const auditId = runtimeBridge.getCurrentAuditId() || runtimeBridge.getAuditIdFromUrl();
    if (!auditId) return [];
    const contacts = await apiRequest(`/api/audits/${auditId}/contacts`);
    const auditData = runtimeBridge.getAuditData?.();
    if (auditData) {
        auditData.contacts = contacts;
        auditData.has_contacts = contacts.length > 0;
    }
    renderClientContacts(contacts);
    return contacts;
}

async function saveContact() {
    if (!requireWriteAccess('Контакты клиента')) return;
    const auditId = listPageContactAuditId || runtimeBridge.getCurrentAuditId() || runtimeBridge.getAuditIdFromUrl();
    if (!auditId) return;
    const form = document.getElementById('editContactForm');
    if (!form) return;
    const formData = new FormData(form);
    const payload = {
        name: formData.get('name'),
        role: formData.get('role'),
        phone: formData.get('phone'),
        email: formData.get('email'),
        messenger: formData.get('messenger'),
        comment: formData.get('comment'),
    };
    if (!String(payload.name || '').trim()) {
        showAlert('Введите имя контакта', 'warning');
        return;
    }
    const contactId = formData.get('contact_id');
    showLoader();
    try {
        if (contactId) {
            await apiRequest(`/api/audits/${auditId}/contacts/${contactId}`, {
                method: 'PATCH',
                body: JSON.stringify(payload),
            });
        } else {
            await apiRequest(`/api/audits/${auditId}/contacts`, {
                method: 'POST',
                body: JSON.stringify(payload),
            });
        }
        closeModal('editContactModal');
        const fromList = Boolean(listPageContactAuditId);
        if (fromList) {
            listPageContactAuditId = null;
            await loadAuditsList();
        } else {
            await refreshClientContacts();
        }
        showAlert('Контакт сохранён', 'success');
    } catch (error) {
        showAlert('Ошибка сохранения контакта: ' + error.message, 'danger');
    } finally {
        hideLoader();
    }
}

async function deleteContact(contactId) {
    if (!requireWriteAccess('Контакты клиента')) return;
    const auditId = runtimeBridge.getCurrentAuditId() || runtimeBridge.getAuditIdFromUrl();
    if (!auditId || !contactId) return;
    const ok = await showConfirmDialog({
        title: 'Удалить контакт',
        message: 'Контакт будет удалён из карточки клиента.',
        confirmText: 'Удалить',
    });
    if (!ok) return;
    showLoader();
    try {
        await apiRequest(`/api/audits/${auditId}/contacts/${contactId}`, { method: 'DELETE' });
        await refreshClientContacts();
        showAlert('Контакт удалён', 'success');
    } catch (error) {
        showAlert('Ошибка удаления: ' + error.message, 'danger');
    } finally {
        hideLoader();
    }
}

async function initNicheFormUi() {
    if (!document.getElementById('createNicheCategory') && !document.getElementById('editNicheCategory')) return;
    await ensureNichePresetsLoaded();
    if (document.getElementById('createNicheCategory')) populateNicheCategorySelect('create');
}

async function createAudit() {
    if (!requireWriteAccess('Создание аудита')) return;
    const form = document.getElementById('createAuditForm');
    const formData = new FormData(form);
    
    const data = {
        client_name: formData.get('client_name'),
        region: formData.get('region'),
        niche_category: formData.get('niche_category'),
        niche_subcategory: formData.get('niche_subcategory'),
        website: formData.get('website'),
        goal: formData.get('goal'),
        comment: formData.get('comment'),
    };
    
    if (!data.client_name) {
        showAlert('Введите название клиента', 'warning');
        return;
    }
    
    showLoader();
    
    try {
        await apiRequest('/api/audits/', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        
        closeModal('createAuditModal');
        form.reset();
        loadAuditsList();
        showAlert('Аудит создан', 'success');
    } catch (error) {
        showAlert('Ошибка создания аудита: ' + error.message, 'danger');
    } finally {
        hideLoader();
    }
}

function openAudit(id) {
    window.location.href = `/audits/${id}`;
}

async function runAnalysis(id) {
    if (!requireWriteAccess('Запуск анализа')) return;
    if (!runtimeBridge.getPrivacySettings?.()) await runtimeBridge.loadPrivacySettings?.();
    const payload = await runtimeBridge.buildAnalysisPayload?.();
    if (!payload) return;
    showLoader();
    try {
        await apiRequest(`/api/audits/${id}/analyze/start`, { method: 'POST', body: JSON.stringify(payload) });
        window.location.href = `/audits/${id}`;
    } catch (error) {
        showAlert('Ошибка анализа: ' + error.message, 'danger');
        hideLoader();
    }
}

function previewAudit(id) {
    window.open(`/api/audits/${id}/export/html`, '_blank');
}

function exportAudit(id) {
    window.open(`/api/audits/${id}/export/pdf`, '_blank');
}

async function duplicateAudit(id) {
    if (!requireWriteAccess('Дублирование аудита')) return;
    try {
        const data = await apiRequest(`/api/audits/${id}/duplicate`, { method: 'POST' });
        showAlert('Копия аудита создана', 'success');
        await loadAuditsList();
        if (data?.audit_id) openAudit(data.audit_id);
    } catch (error) {
        showAlert('Ошибка дублирования: ' + error.message, 'danger');
    }
}

async function toggleArchiveAudit(id, archive) {
    if (!requireWriteAccess('Архивирование аудита')) return;
    const ok = archive
        ? await showConfirmDialog({
            title: 'Архивировать аудит',
            message: 'Аудит скроется из основного списка. Его можно найти через фильтр «Архив».',
            confirmText: 'Архивировать',
        })
        : true;
    if (!ok) return;
    try {
        await apiRequest(`/api/audits/${id}/archive`, {
            method: 'POST',
            body: JSON.stringify({ archived: archive }),
        });
        showAlert(archive ? 'Аудит архивирован' : 'Аудит возвращён из архива', 'success');
        loadAuditsList();
    } catch (error) {
        showAlert('Ошибка архивирования: ' + error.message, 'danger');
    }
}

async function deleteAudit(id) {
    if (!requireWriteAccess('Удаление аудита')) return;
    const ok = await showConfirmDialog({
        title: 'Удалить аудит',
        message: 'Это действие необратимо. Аудит и связанные материалы будут удалены.',
        confirmText: 'Удалить',
    });
    if (!ok) return;
    
    try {
        await apiRequest(`/api/audits/${id}`, { method: 'DELETE' });
        showAlert('Аудит удалён', 'success');
        loadAuditsList();
    } catch (error) {
        showAlert('Ошибка удаления: ' + error.message, 'danger');
    }
}
let auditTemplatesCache = [];

async function loadAuditTemplates() {
    const select = document.getElementById('auditTemplateSelect');
    if (!select) return;
    try {
        auditTemplatesCache = await apiRequest('/api/templates');
        const current = select.value;
        select.innerHTML = '<option value="">Без шаблона</option>' + auditTemplatesCache.map(t =>
            `<option value="${escapeHtml(t.id)}">${escapeHtml(t.name)}</option>`
        ).join('');
        select.value = current;
    } catch (error) {
        console.warn('Templates load error:', error);
    }
}

function applyAuditTemplate(templateId) {
    const box = document.getElementById('templateChecklist');
    if (!templateId) {
        if (box) box.style.display = 'none';
        return;
    }
    const template = auditTemplatesCache.find(t => t.id === templateId);
    if (!template) return;
    const form = document.getElementById('createAuditForm');
    if (form) {
        const goal = form.querySelector('[name="goal"]');
        const comment = form.querySelector('[name="comment"]');
        const category = form.querySelector('[name="niche_category"]');
        const sub = form.querySelector('[name="niche_subcategory"]');
        if (template.niche && category && !category.value) {
            const match = (nichePresetsCache?.categories || []).find(
                (c) => c.label.toLowerCase() === String(template.niche).toLowerCase()
            );
            if (match) {
                category.value = match.label;
                updateNicheSubnicheUi('create');
            } else if (sub && !sub.value) {
                sub.value = template.niche;
                updateNichePreview('create');
            }
        }
        if (goal && !goal.value) goal.value = template.goal || '';
        if (comment && !comment.value) comment.value = template.starter_note || '';
    }
    if (box) {
        box.style.display = 'block';
        box.innerHTML = `<strong>${escapeHtml(template.name)}</strong><ul>${(template.checklist || []).map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
    }
}

export {
    loadAuditsList,
    initAuditsListToolbar,
    loadOpsAlerts,
    loadAuditTemplates,
    applyAuditTemplate,
    initNicheFormUi,
    updateNicheSubnicheUi,
    updateNichePreview,
    setAuditsListFilter,
    resetAuditsListFilters,
    goToAuditsPage,
    setAuditsListPageSize,
    toggleAuditsListSort,
    toggleAuditActionsMenu,
    closeAllAuditActionsMenus,
    createAudit,
    openAudit,
    runAnalysis,
    duplicateAudit,
    toggleArchiveAudit,
    deleteAudit,
    previewAudit,
    exportAudit,
    openEditClientModal,
    saveEditClient,
    openContactModalFromList,
    openContactModal,
    saveContact,
    deleteContact,
    renderClientContacts,
    refreshClientContacts,
};
