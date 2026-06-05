/** Guided workflow, command bar, focus mode — epic H3. */
import { parseApiDateMs } from '../shared/timezone.js';
import { escapeHtml, formatMoney, formatNumber } from '../core/utils.js';
import { showAlert, dismissAlertsMatching } from '../core/alerts.js';
import { showConfirmDialog } from '../core/modals.js';
import { apiRequest } from '../core/api.js';
import { requireWriteAccess, isAdminUser, canWrite } from '../core/auth.js';
import { runtimeBridge } from '../core/runtime-bridge.js';
import { DIRECT_COPY, hasDirectExcelSlice } from './direct-copy.js';
import { isDirectDataSubtabActive, isSourcesDataSubtabActive } from './data-tab-ux.js';
import {
    getFindingReviewProgress,
    formatReviewProgressLine,
    formatReviewRemainingLine,
    buildFindingReviewBannerModel,
    pluralizeFindingsReview,
    auditHasDataLimitations,
} from './findings.js';

function getAuditData() {
    return runtimeBridge.getAuditData?.() || null;
}

function getCurrentAuditId() {
    return runtimeBridge.getCurrentAuditId?.() || runtimeBridge.getAuditIdFromUrl?.() || null;
}

let guidedStepState = null;
let guidedLastRenderedStep = null;
let pendingMetricsFocusFieldId = null;
let focusModeEnabled = localStorage.getItem('ppc_focus_mode') !== 'off';
let focusModeSecondaryExpanded = false;
let focusActionState = { mode: 'none' };
let focusKpiTrendState = { auditKey: null, blocking: null, open: null };
let currentScreenState = 'UNKNOWN';
let jumpToPostAnalysisTab = false;
let pendingAnalysisCompleteModal = false;
let analysisCompleteModalShownForRun = null;
function workflowUi() {
    return getAuditData()?.workflow_ui || {};
}

function isPreliminaryAudit() {
    const ui = workflowUi();
    return ui.export_mode === 'template' || Boolean(getAuditData()?.data_coverage?.is_preliminary);
}

function hasGuidedChecklistMetrics(data) {
    const checklist = data?.data_coverage?.checklist || [];
    const hasPresent = (id) => {
        const item = checklist.find((x) => x.id === id);
        return item?.status === 'present';
    };
    return hasPresent('period') && hasPresent('budget') && hasPresent('clicks');
}

function parseJsonSafe(text) {
    try {
        return JSON.parse(text || '{}');
    } catch (_error) {
        return {};
    }
}

function hasGuidedMetricsMaterial(data) {
    const materials = data?.materials || [];
    const metricMaterial = materials
        .filter((m) => m?.type === 'manual_metrics' && !m.excluded_from_analysis)
        .sort((a, b) => parseApiDateMs(b.updated_at || b.created_at) - parseApiDateMs(a.updated_at || a.created_at))[0];
    if (!metricMaterial) return false;
    const raw = parseJsonSafe(metricMaterial.raw_content);
    return Boolean(
        String(raw.period || '').trim()
        && raw.budget != null
        && raw.clicks != null
    );
}

function hasGuidedRequiredMetrics(data) {
    return hasDirectExcelSlice(data);
}

function isConfirmedTranscriptMaterial(material) {
    if (material?.type !== 'audio_transcript') return false;
    try {
        const raw = JSON.parse(material.raw_content || '{}');
        return Boolean(raw.confirmed);
    } catch (_error) {
        return false;
    }
}

function hasGuidedEvidenceSource(data) {
    const materials = data?.materials || [];
    return materials.some((material) => {
        if (!material || material.excluded_from_analysis) return false;
        if (material.type === 'document' || material.type === 'screenshot' || material.type === 'text_note') return true;
        return isConfirmedTranscriptMaterial(material);
    });
}

function hasGuidedCompletedAnalysis(data) {
    const ws = data?.workflow_state || {};
    if (ws.analysis_running) return false;
    return ws.state === 'ANALYSIS_DONE'
        || ws.state === 'REPORT_READY'
        || data?.status === 'completed';
}
function getOpenDataIssues(data, options = {}) {
    const all = (data?.data_issues || []).filter((i) => !i.resolved && !i.visible_after_analysis);
    if (options.blockingOnly) {
        return all.filter((i) => i.severity === 'blocking');
    }
    return all;
}

function getPostAnalysisReviewIssues(data) {
    return (data?.data_issues || []).filter((i) => !i.resolved && i.visible_after_analysis);
}

function getPostAnalysisDataImprovements(data) {
    return (data?.data_issues || []).filter(
        (i) => !i.resolved && i.visible_after_analysis && i.issue_type === 'missing_data'
    );
}
function isPostAnalysisScreen(state) {
    return ['RESULTS_READY', 'PRELIMINARY_REPORT', 'RESULTS_NEED_REVIEW'].includes(state);
}

function usesPostAnalysisHero(state) {
    return isPostAnalysisScreen(state);
}

/** Единая точка видимости command bar (guided / post-analysis / screen state). */
function setAuditCommandBarVisible(visible) {
    const commandBar = document.getElementById('auditCommandBar');
    if (commandBar) commandBar.style.display = visible ? '' : 'none';
    const strip = document.getElementById('dataCommandStrip');
    if (strip) strip.classList.toggle('is-guided-only', !visible);
}

/** DAI-6.1: одна полоса #dataCommandStrip — command bar + guided без дублирования отступов. */
function syncDataCommandStrip(screenState, guidedVisible = false) {
    const strip = document.getElementById('dataCommandStrip');
    if (!strip) return;
    document.body.classList.remove('guided-hide-commandbar');
    const showBar = screenState !== 'BLOCKED_REQUIRED';
    setAuditCommandBarVisible(showBar);
    strip.classList.toggle('has-guided', Boolean(guidedVisible));
    strip.classList.toggle('is-guided-only', showBar === false && guidedVisible);
}

function syncPostAnalysisChrome(screenState) {
    const topBtn = document.getElementById('btnAnalyze');
    const hero = usesPostAnalysisHero(screenState);
    setAuditCommandBarVisible(!hero);
    if (topBtn && hero) topBtn.style.display = 'none';
}

function getLatestMetricsMaterial(data, { includeExcluded = false } = {}) {
    const materials = data?.materials || [];
    return materials
        .filter((m) => m?.type === 'manual_metrics' && (includeExcluded || !m.excluded_from_analysis))
        .sort((a, b) => parseApiDateMs(b.updated_at || b.created_at) - parseApiDateMs(a.updated_at || a.created_at))[0] || null;
}

function resolveGuidedMetricsMaterialId(data, metricFix) {
    const periods = data?.metrics_periods?.periods || [];
    const materials = data?.materials || [];
    const refId = Number(metricFix?.materialId || metricFix?.issue?.ref_id || 0) || null;
    const activeId = Number(
        data?.metrics_periods?.active_material_id || data?.active_metrics_material_id || 0
    ) || null;

    const isMetricsMaterial = (id) => materials.some(
        (m) => Number(m.id) === Number(id) && m.type === 'manual_metrics' && !m.excluded_from_analysis
    );

    if (refId && (periods.some((p) => Number(p.material_id) === refId) || isMetricsMaterial(refId))) {
        return refId;
    }
    if (activeId && isMetricsMaterial(activeId)) {
        return activeId;
    }
    const needsReviewPeriod = periods.find((p) => p.needs_review);
    if (needsReviewPeriod?.material_id) {
        return Number(needsReviewPeriod.material_id);
    }
    return refId;
}

function getGuidedMetricFixIssue(data) {
    const issues = getOpenDataIssues(data, { blockingOnly: true });
    const latestMetrics = getLatestMetricsMaterial(data);
    const keywordRe = /(метрик|бюджет|клик|заявк|продаж|выруч|cpa|cpl|romi)/i;
    const idRe = /^(period|budget|clicks|leads|sales|revenue|metrics)$/i;
    const issue = issues.find((i) => {
        const actions = i.actions || [];
        const hasFixAction = actions.includes('fix') || actions.includes('add_data');
        if (!hasFixAction) return false;
        if (i.ref_type === 'material' && Number(i.ref_id) > 0) {
            if (!latestMetrics) return true;
            return Number(i.ref_id) === Number(latestMetrics.id);
        }
        const text = `${i.id || ''} ${i.label || ''} ${i.reason || ''}`;
        return keywordRe.test(text) || idRe.test(String(i.id || ''));
    }) || null;
    if (!issue) return null;
    const materialId = Number(issue.ref_id) > 0 ? Number(issue.ref_id) : latestMetrics?.id || null;
    return { issue, materialId };
}

function getGuidedStepState(data) {
    const blockingIssues = getOpenDataIssues(data, { blockingOnly: true });
    const hasBlocking = blockingIssues.length > 0;
    const done1 = hasDirectExcelSlice(data);
    const done2 = hasGuidedEvidenceSource(data);
    const done3 = done1 && done2 && hasGuidedCompletedAnalysis(data);
    const metricFix = getGuidedMetricFixIssue(data);
    let step = 'done';
    if (hasBlocking) {
        if (!done1) step = 1;
        else if (!done2) step = 2;
        else if (!done3) step = 3;
    } else {
        step = done3 ? 'done' : 3;
    }
    return { step, done1, done2, done3, metricFix };
}

function resolveScreenState(data) {
    const ws = data?.workflow_state || {};
    if (ws.analysis_running || data?.status === 'in_progress') return 'RUNNING';
    if (ws.analysis_failed || data?.status === 'failed') return 'FAILED';
    const analysisDone = hasGuidedCompletedAnalysis(data);
    if (!analysisDone && hasDirectExcelSlice(data)) {
        return 'READY_TO_RUN';
    }
    const blockingCount = getOpenDataIssues(data, { blockingOnly: true }).length;
    if (blockingCount > 0 && !analysisDone) {
        return 'BLOCKED_REQUIRED';
    }
    if (analysisDone) {
        if (data?.data_coverage?.is_preliminary) return 'PRELIMINARY_REPORT';
        if (getFindingReviewProgress(data).pending > 0) return 'RESULTS_NEED_REVIEW';
        return 'RESULTS_READY';
    }
    return 'READY_TO_RUN';
}

function buildScreenStateUiModel(screenState, ctx = {}) {
    const {
        blockingCount = 0,
        optionalCount = 0,
        missingLabels = [],
        reviewCount = 0,
        reviewProgress = { reviewed: 0, total: 0, pending: 0 },
    } = ctx;
    const missingText = missingLabels.join(', ') || 'дополнительных источников';
    return {
        BLOCKED_REQUIRED: {
            status: 'Подготовка данных',
            hint: '',
            primaryLabel: '',
            primaryClass: '',
            primaryAction: 'guided',
        },
        READY_TO_RUN: {
            status: 'Готов к AI-анализу',
            hint: '',
            primaryLabel: 'Запустить AI-анализ',
            primaryClass: 'btn-success',
            primaryAction: 'run',
        },
        RUNNING: {
            status: 'AI-анализ выполняется',
            hint: 'AI-анализ выполняется. Обновите статус через несколько секунд.',
            primaryLabel: 'Обновить статус',
            primaryClass: 'btn-outline',
            primaryAction: 'refresh',
        },
        FAILED: {
            status: 'Ошибка AI-анализа',
            hint: 'Исправьте данные и перезапустите AI-анализ.',
            primaryLabel: 'Перезапустить анализ',
            primaryClass: 'btn-danger',
            primaryAction: 'run',
        },
        RESULTS_NEED_REVIEW: {
            status: reviewProgress.total > 0
                ? `Черновик — ${formatReviewProgressLine(reviewProgress)}`
                : 'Черновик готов',
            hint: reviewProgress.pending > 0
                ? `${formatReviewProgressLine(reviewProgress)}. ${formatReviewRemainingLine(reviewProgress)}.`
                : 'Все выводы проверены. Можно улучшить данные или открыть черновик отчёта.',
            primaryLabel: reviewProgress.pending === 1 ? 'Проверить вывод' : (reviewProgress.pending > 0 ? 'Проверить выводы' : 'Открыть черновик отчёта'),
            primaryClass: 'btn-primary',
            primaryAction: reviewProgress.pending > 0 ? 'open_review' : 'open_report',
        },
        RESULTS_READY: {
            status: 'Отчёт готов',
            hint: 'Все выводы проверены. Откройте отчёт для клиента.',
            primaryLabel: 'Открыть отчёт',
            primaryClass: 'btn-outline',
            primaryAction: 'open_report',
        },
        PRELIMINARY_REPORT: {
            status: 'Предварительный отчёт по базовым данным',
            hint: `Метрики загружены. Для полноценного аудита не хватает: ${missingText}.`,
            primaryLabel: 'Открыть отчёт',
            primaryClass: 'btn-outline',
            primaryAction: 'open_report',
        },
    }[screenState] || {
        status: 'Статус аудита',
        hint: 'Добавьте данные для аудита.',
        primaryLabel: 'Запустить AI-анализ',
        primaryClass: 'btn-success',
        primaryAction: 'run',
    };
}

function syncCommandBarWithGuidedStep() {
    const btn = document.getElementById('btnAnalyze');
    if (!btn) return;
    if (currentScreenState !== 'BLOCKED_REQUIRED') return;
    if (guidedStepState?.step === 1) {
        btn.textContent = 'Открыть «Директ»';
        btn.classList.remove('btn-success');
        btn.classList.add('btn-outline');
        btn.disabled = false;
        btn.title = 'Загрузить Excel из Яндекс Директа';
        return;
    }
    if (guidedStepState?.step === 2) {
        btn.textContent = 'Загрузить источник';
        btn.classList.remove('btn-success');
        btn.classList.add('btn-outline');
        btn.disabled = false;
        btn.title = 'Добавить документ, скриншот или заметку';
        return;
    }
    if (guidedStepState?.step === 3) {
        btn.textContent = 'Запустить AI-анализ';
        btn.classList.remove('btn-outline');
        btn.classList.add('btn-success');
        btn.disabled = false;
        btn.title = 'Запустить анализ по собранным данным';
    }
}

function renderGuidedFirstRun(data) {
    const container = document.getElementById('guidedFirstRun');
    const badge = document.getElementById('guidedStepBadge');
    const dots = document.getElementById('guidedStepDots');
    const title = document.getElementById('guidedTitle');
    const hint = document.getElementById('guidedHint');
    const primary = document.getElementById('guidedPrimaryBtn');
    const secondary = document.getElementById('guidedSecondaryBtn');
    if (!container || !badge || !dots || !title || !hint || !primary || !secondary) return;

    const state = getGuidedStepState(data);
    const previousRenderedStep = guidedLastRenderedStep;
    guidedStepState = state;
    guidedLastRenderedStep = state.step;
    const hideGuidedOnDirect = isDirectDataSubtabActive();
    const hideGuidedOnSources = isSourcesDataSubtabActive() && isPostAnalysisScreen(currentScreenState);
    const showGuided = !hideGuidedOnDirect && !hideGuidedOnSources && (
        currentScreenState === 'BLOCKED_REQUIRED'
        || currentScreenState === 'RESULTS_NEED_REVIEW'
        || currentScreenState === 'RESULTS_READY'
        || currentScreenState === 'PRELIMINARY_REPORT'
    );
    container.style.display = showGuided ? 'grid' : 'none';
    syncDataCommandStrip(currentScreenState, showGuided);
    container.classList.remove('is-step-1', 'is-step-2', 'is-step-3', 'is-done', 'is-review');
    const reviewMode = currentScreenState === 'RESULTS_NEED_REVIEW';
    container.classList.toggle('is-review', reviewMode);
    container.classList.toggle('is-done', state.step === 'done' && !reviewMode);

    secondary.style.display = 'none';
    secondary.textContent = '';
    secondary.title = '';
    primary.style.display = 'inline-flex';

    if (state.step === 1 && currentScreenState === 'BLOCKED_REQUIRED') {
        container.classList.add('is-step-1');
        badge.textContent = '1/3 · Директ';
        dots.textContent = '●○○';
        title.textContent = 'Загрузите Excel из Яндекс Директа';
        hint.textContent = 'Статистика по кампаниям за период (файл Мастера отчётов). Цифры и риски появятся на вкладке «Директ».';
        primary.textContent = 'Открыть «Директ»';
    } else if (state.step === 2 && currentScreenState === 'BLOCKED_REQUIRED') {
        container.classList.add('is-step-2');
        badge.textContent = '2/3 · Источник';
        dots.textContent = '●●○';
        title.textContent = 'Подтвердите данные источником';
        hint.textContent = 'Добавьте минимум один материал: документ, скриншот или заметку.';
        primary.textContent = 'Загрузить источник';
        secondary.style.display = 'inline-flex';
        secondary.textContent = 'Добавить заметку';
    } else if (state.step === 3 && currentScreenState === 'BLOCKED_REQUIRED') {
        container.classList.add('is-step-3');
        badge.textContent = '3/3 · Анализ';
        dots.textContent = '●●●';
        title.textContent = 'Запустите AI-анализ';
        hint.textContent = 'Минимальные данные собраны. Запустите анализ для первого отчёта.';
        primary.textContent = 'Запустить AI-анализ';
    } else {
        const banner = buildFindingReviewBannerModel(data);
        const improvements = banner.improvements;
        if (currentScreenState === 'RESULTS_NEED_REVIEW') {
            badge.textContent = banner.badge;
            dots.style.display = 'none';
            title.textContent = banner.title;
            let hintText = banner.hint;
            if (improvements.length > 0) {
                hintText += ` Улучшения данных (не блокируют отчёт): ${improvements.length}.`;
            }
            hint.textContent = hintText;
            primary.textContent = banner.pending > 0
                ? (banner.pending === 1 ? 'К выводу' : 'К выводам')
                : 'Открыть черновик отчёта';
            secondary.style.display = 'inline-flex';
            if (improvements.length > 0 && banner.pending === 0) {
                secondary.textContent = 'Открыть список';
                secondary.title = 'Вкладка «Данные», блок «Можно улучшить»';
            } else {
                secondary.textContent = 'Открыть черновик отчёта';
                secondary.title = 'Вкладка «Отчёт» без финального подтверждения';
            }
        } else {
            dots.style.display = '';
            badge.textContent = 'Готово';
            dots.textContent = '✓';
        }
        if (currentScreenState === 'RESULTS_READY') {
            const hasLimits = auditHasDataLimitations(data);
            const stale = runtimeBridge.isAnalysisStale?.(data);
            if (stale) {
                title.textContent = hasLimits ? 'Отчёт устарел (есть ограничения)' : 'Данные новее отчёта';
                hint.textContent = hasLimits
                    ? 'Выводы проверены. KPI в таблице уже новые — перезапустите AI-анализ, чтобы обновить краткий вывод и findings. Ограничения (CRM, запросы) останутся, пока нет материалов.'
                    : 'Выводы проверены. KPI в таблице уже новые — перезапустите AI-анализ, чтобы обновить краткий вывод и графики.';
                primary.textContent = 'Перезапустить AI-анализ';
                secondary.style.display = 'inline-flex';
                secondary.textContent = 'Открыть отчёт';
                secondary.title = 'Черновик: таблица KPI актуальна, текст AI может отставать';
            } else {
                title.textContent = hasLimits ? 'Отчёт готов с ограничениями' : 'Отчёт готов';
                hint.textContent = hasLimits
                    ? 'Все выводы проверены. В отчёте отмечены ограничения по данным (не блокируют просмотр).'
                    : 'Все выводы проверены. Можно открыть отчёт для клиента.';
                primary.textContent = 'Открыть отчёт';
                secondary.style.display = 'inline-flex';
                secondary.textContent = 'Перезапустить AI-анализ';
                secondary.title = 'Повторный анализ по текущим материалам';
            }
        } else if (currentScreenState === 'PRELIMINARY_REPORT') {
            const missingLabels = (data?.data_coverage?.missing_items || []).slice(0, 4).map((i) => i.label).filter(Boolean);
            title.textContent = 'Предварительный отчёт по базовым данным';
            hint.textContent = `Метрики загружены. Для полноценного аудита не хватает: ${missingLabels.join(', ') || 'дополнительных источников'}.`;
            primary.textContent = 'Открыть отчёт';
            secondary.style.display = 'inline-flex';
            secondary.textContent = 'Перезапустить AI-анализ';
            secondary.title = 'Повторный анализ по текущим материалам';
        } else if (currentScreenState !== 'RESULTS_NEED_REVIEW') {
            title.textContent = 'Готово к запуску';
            hint.textContent = 'Обязательные шаги закрыты. Можно запустить AI-анализ.';
            primary.textContent = 'Запустить AI-анализ';
        }
    }
    if (currentScreenState === 'BLOCKED_REQUIRED') {
        const step = guidedStepState?.step;
        if (step === 1 || step === 2 || step === 3) {
            primary.style.display = 'inline-flex';
            if (step === 1 && !primary.textContent?.trim()) {
                primary.textContent = 'Открыть «Директ»';
            }
        } else {
            primary.style.display = 'none';
        }
    } else {
        primary.style.display = ['RESULTS_READY', 'PRELIMINARY_REPORT', 'RESULTS_NEED_REVIEW'].includes(currentScreenState)
            ? 'inline-flex'
            : 'none';
    }
    const keepSecondary = currentScreenState === 'RESULTS_NEED_REVIEW'
        || currentScreenState === 'RESULTS_READY'
        || currentScreenState === 'PRELIMINARY_REPORT'
        || (currentScreenState === 'BLOCKED_REQUIRED' && guidedStepState?.step === 2);
    if (!keepSecondary && secondary.style.display === 'inline-flex') {
        secondary.style.display = 'none';
    }

    syncCommandBarWithGuidedStep();
    syncPostAnalysisChrome(currentScreenState);
    if (previousRenderedStep && previousRenderedStep !== state.step) {
        dots.classList.remove('is-pulse');
        void dots.offsetWidth;
        dots.classList.add('is-pulse');
        setTimeout(() => dots.classList.remove('is-pulse'), 420);
    }
}

function handleGuidedPrimaryAction() {
    if (currentScreenState === 'RESULTS_NEED_REVIEW') {
        scrollToPendingFindings();
        return;
    }
    if (currentScreenState === 'RESULTS_READY' || currentScreenState === 'PRELIMINARY_REPORT') {
        if (currentScreenState === 'RESULTS_READY' && runtimeBridge.isAnalysisStale?.(getAuditData())) {
            rerunAuditAnalysis();
            return;
        }
        openReportPanel();
        return;
    }
    if (currentScreenState === 'READY_TO_RUN' || currentScreenState === 'FAILED') {
        runtimeBridge.runAuditAnalysis?.();
        return;
    }
    if (currentScreenState === 'RUNNING') {
        runtimeBridge.loadAuditDetail?.();
        return;
    }
    if (guidedStepState?.step === 1) {
        runtimeBridge.switchTab?.('data');
        runtimeBridge.switchDataSubtab?.('direct');
        return;
    }
    if (guidedStepState?.step === 2) {
        runtimeBridge.openModal?.('documentModal');
        return;
    }
    if (guidedStepState?.step === 3) {
        runtimeBridge.runAuditAnalysis?.();
        return;
    }
    runtimeBridge.loadAuditDetail?.();
}

function handleGuidedSecondaryAction() {
    if (currentScreenState === 'RESULTS_NEED_REVIEW') {
        const pending = getFindingReviewProgress(getAuditData() || {}).pending;
        const improvements = getPostAnalysisDataImprovements(getAuditData() || {});
        if (pending === 0 && improvements.length > 0) {
            runtimeBridge.goToDataImprovements?.();
            return;
        }
        openReportPanel();
        return;
    }
    if (currentScreenState === 'RESULTS_READY' || currentScreenState === 'PRELIMINARY_REPORT') {
        rerunAuditAnalysis();
        return;
    }
    if (guidedStepState?.step === 2) {
        runtimeBridge.openNewMaterial?.('textNoteModal');
    }
}

async function rerunAuditAnalysis() {
    if (!requireWriteAccess('Перезапуск AI-анализа')) return;
    if (!runtimeBridge.getPrivacySettings?.()) await runtimeBridge.loadPrivacySettings?.();
    const payload = await runtimeBridge.buildAnalysisPayload?.();
    if (!payload) return;
    try {
        runtimeBridge.showAnalysisProgress?.({ percent: 0, message: 'Подготовка запуска...', status: 'in_progress' });
        runtimeBridge.connectAnalysisProgress?.(getCurrentAuditId());
        await apiRequest(`/api/audits/${getCurrentAuditId()}/analyze/start`, { method: 'POST', body: JSON.stringify(payload) });
        showAlert('AI-анализ перезапущен. Следите за прогрессом на карточке аудита.', 'info');
    } catch (error) {
        showAlert('Ошибка анализа: ' + error.message, 'danger');
        runtimeBridge.hideAnalysisProgress?.();
    }
}

function runPrimaryAction() {
    const model = buildScreenStateUiModel(currentScreenState);
    if (model.primaryAction === 'guided') return handleGuidedPrimaryAction();
    if (model.primaryAction === 'run') return runtimeBridge.runAuditAnalysis?.();
    if (model.primaryAction === 'refresh') return runtimeBridge.loadAuditDetail?.();
    if (model.primaryAction === 'open_report') return openReportPanel();
    if (model.primaryAction === 'open_review') return scrollToPendingFindings();
    if (guidedStepState?.step && guidedStepState.step !== 'done') {
        handleGuidedPrimaryAction();
        return;
    }
    runtimeBridge.runAuditAnalysis?.();
}

function scrollToPendingFindings() {
    runtimeBridge.switchTab?.('results');
    const target = document.querySelector('.finding-item.finding-needs-review')
        || document.querySelector('.finding-item--enrichment-stub')
        || document.querySelector('[id^="finding-"]')
        || document.querySelector('[id^="finding-pending-"]')
        || document.getElementById('resultsIssuesList')
        || document.getElementById('findingsList');
    if (!target) {
        showAlert('Выводы для проверки не найдены. Обновите страницу.', 'warning');
        return;
    }
    setTimeout(() => {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        target.classList.add('focus-target');
        setTimeout(() => target.classList.remove('focus-target'), 1400);
    }, 80);
}

function openIssuesPanel() {
    if (currentScreenState === 'RESULTS_NEED_REVIEW') {
        scrollToPendingFindings();
        return;
    }
    if (isPostAnalysisScreen(currentScreenState)) {
        runtimeBridge.switchTab?.('results');
        const box = document.getElementById('resultsIssuesList');
        if (!box) return;
        setTimeout(() => {
            box.scrollIntoView({ behavior: 'smooth', block: 'start' });
            box.classList.add('focus-target');
            setTimeout(() => box.classList.remove('focus-target'), 1400);
        }, 80);
        return;
    }
    const data = getAuditData();
    const blocking = getOpenDataIssues(data, { blockingOnly: true });
    runtimeBridge.switchTab?.('data');
    if (blocking[0]) {
        runtimeBridge.openDataItemAction?.(blocking[0].id, blocking[0]);
        return;
    }
    runtimeBridge.switchDataSubtab?.('direct');
    const box = document.getElementById('dataNowSummary') || document.getElementById('dataSubtabs');
    if (!box) return;
    setTimeout(() => {
        box.scrollIntoView({ behavior: 'smooth', block: 'start' });
        box.classList.add('focus-target');
        setTimeout(() => box.classList.remove('focus-target'), 1400);
    }, 80);
}

function openRecommendationsPanel() {
    runtimeBridge.switchTab?.('results');
    runtimeBridge.setFindingsMarketerFilter?.('recs');
    runtimeBridge.loadKbStatusCard?.();
    const summaryPanel = document.getElementById('findingsRecSummaryPanel');
    if (summaryPanel) summaryPanel.open = true;
    setTimeout(() => {
        const campaignBlock = document.getElementById('campaignRecommendationsBlock')
            || document.querySelector('.rec-card-ads');
        const offerBox = document.getElementById('offerContainer');
        const list = document.getElementById('recommendationsList');
        const target = campaignBlock || (offerBox?.innerHTML?.trim() ? offerBox : null) || list;
        if (!target) {
            showAlert('Блок рекомендаций не найден. Обновите страницу (Ctrl+F5).', 'warning');
            return;
        }
        if (!target.innerHTML?.trim() || target.textContent.trim().length < 8) {
            showAlert('Рекомендации по кампаниям появятся после подтверждения выводов с действиями.', 'info');
            return;
        }
        runtimeBridge.focusScrollTarget?.(target);
    }, 120);
}

function openReportPanel() {
    runtimeBridge.switchTab?.('report');
    const target = [
        document.getElementById('reportConfirmedPreviewCard'),
        document.getElementById('reportAiSummaryCard'),
        document.getElementById('reportAuditPlanCard'),
        document.getElementById('chartsContainer'),
        document.getElementById('tab-report'),
    ].find((el) => el && el.style.display !== 'none');
    if (!target) return;
    setTimeout(() => {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        target.classList.add('focus-target');
        setTimeout(() => target.classList.remove('focus-target'), 1400);
    }, 80);
}

function toggleFocusMode() {
    focusModeEnabled = !focusModeEnabled;
    localStorage.setItem('ppc_focus_mode', focusModeEnabled ? 'on' : 'off');
    applyFocusModeLayout(getAuditData());
}

function toggleDataSecondaryArea() {
    focusModeSecondaryExpanded = !focusModeSecondaryExpanded;
    applyFocusModeLayout(getAuditData());
}

function applyFocusModeLayout(data) {
    const workspace = document.getElementById('auditWorkspace');
    const toggleBtn = document.getElementById('btnFocusModeToggle');
    const toggleWrap = document.getElementById('focusSecondaryToggleWrap');
    const toggleSecondaryBtn = document.getElementById('btnToggleDataSecondary');
    const secondary = document.getElementById('dataSecondaryArea');
    const primaryTopBtn = document.getElementById('btnAnalyze');
    if (!workspace || !toggleBtn || !toggleWrap || !toggleSecondaryBtn || !secondary) return;

    const blockingCount = getOpenDataIssues(data, { blockingOnly: true }).length;
    const useFocusMode = focusModeEnabled && blockingCount > 0;
    const keepWorkflowTabs = useFocusMode && hasDirectExcelSlice(data);

    workspace.classList.toggle('focus-mode', useFocusMode);
    workspace.classList.toggle('focus-mode--keep-tabs', keepWorkflowTabs);
    toggleBtn.textContent = `Режим фокуса: ${focusModeEnabled ? 'вкл' : 'выкл'}`;
    toggleBtn.classList.toggle('btn-primary', focusModeEnabled);
    toggleBtn.classList.toggle('btn-outline', !focusModeEnabled);

    if (useFocusMode) {
        runtimeBridge.switchTab?.('data');
        if (!runtimeBridge.isSourcesDataSubtabActive?.()) {
            runtimeBridge.switchDataSubtab?.('direct');
        }
        toggleWrap.style.display = 'block';
        secondary.style.display = focusModeSecondaryExpanded ? 'block' : 'none';
        toggleSecondaryBtn.textContent = focusModeSecondaryExpanded ? 'Скрыть рабочую область' : 'Показать рабочую область';
    } else {
        toggleWrap.style.display = 'none';
        secondary.style.display = 'block';
        focusModeSecondaryExpanded = false;
        toggleSecondaryBtn.textContent = 'Показать рабочую область';
        if (primaryTopBtn) primaryTopBtn.style.display = '';
    }
}

function scrollGuidedFirstRunIntoView() {
    const guided = document.getElementById('guidedFirstRun');
    if (!guided) return;
    guided.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function guidedStepCompletionMessage(prevStep) {
    if (prevStep === 1) return 'Шаг 1 завершён: Excel Директа загружен. Переходим к источникам.';
    if (prevStep === 2) return 'Шаг 2 завершён: источник добавлен. Теперь можно запускать AI-анализ.';
    if (prevStep === 3) return 'Шаг 3 завершён: анализ запущен.';
    return '';
}

async function refreshAuditAndAdvanceGuidedFlow(previousStep = null) {
    await runtimeBridge.loadAuditDetail?.();
    const nextStep = guidedStepState?.step;
    if (!previousStep || previousStep === 'done') return;
    if (nextStep && nextStep !== previousStep) {
        const message = guidedStepCompletionMessage(previousStep);
        if (message) showAlert(message, 'success');
        scrollGuidedFirstRunIntoView();
    }
}

function getPrimaryOpenIssue(data) {
    const issues = getOpenDataIssues(data);
    return issues.find((i) => i.severity === 'blocking') || issues[0] || null;
}

function runFocusAction() {
    const state = focusActionState || {};
    if (state.mode === 'rerun') {
        runtimeBridge.runAuditAnalysis?.();
        return;
    }
    if (state.mode === 'wait') {
        runtimeBridge.loadAuditDetail?.();
        return;
    }
    if (state.mode !== 'issue' || !state.issueId) {
        runtimeBridge.switchTab?.('data');
        return;
    }
    const issue = (getAuditData()?.data_issues || []).find((i) => i.id === state.issueId);
    runtimeBridge.switchTab?.('data');
    if (!issue) return;
    const actions = issue.actions || [];
    if (actions.includes('fix') && issue.ref_type === 'material' && issue.ref_id) {
        runtimeBridge.editMaterial?.(issue.ref_id);
        return;
    }
    if (actions.includes('add_data') || actions.includes('fix')) {
        runtimeBridge.openDataItemAction?.(issue.id, issue);
        return;
    }
    if (actions.includes('accept_limitation')) {
        runtimeBridge.acceptDataLimitation?.(issue.id);
    }
}
function updateMoreMenuDraft(data) {
    const draftBtn = document.getElementById('btnAnalyzeDraft');
    const divider = document.getElementById('moreMenuDivider');
    if (!draftBtn || !data) return;
    const ui = data.workflow_ui || {};
    const primary = ui.primary_button || {};
    const analysisDone = hasGuidedCompletedAnalysis(data);
    const running = currentScreenState === 'RUNNING';
    const show = analysisDone && !running;
    draftBtn.style.display = show ? 'block' : 'none';
    if (divider) divider.style.display = show ? 'block' : 'none';
    const canRerun = primary.id === 'rerun_analysis' ? primary.enabled !== false : analysisDone;
    draftBtn.disabled = !canRerun;
    draftBtn.textContent = 'Перезапустить AI-анализ';
    draftBtn.title = primary.reason_disabled || 'Повторный запуск AI-анализа по текущим материалам';
}
function renderAuditCommandBar(data) {
    if (!data) return;
    const ui = data.workflow_ui || {};
    const ws = data.workflow_state || {};
    const coverage = data.data_coverage || {};
    const openIssues = getOpenDataIssues(data);
    const blockingIssues = openIssues.filter((i) => i.severity === 'blocking');
    const issueCount = openIssues.length;
    const blockingCount = blockingIssues.length;
    const optionalCount = Math.max(0, issueCount - blockingCount);
    const missingLabels = (coverage.missing_items || []).slice(0, 4).map((i) => i.label).filter(Boolean);
    const reviewProgress = getFindingReviewProgress(data);
    const screenState = resolveScreenState(data);
    currentScreenState = screenState;
    if (screenState !== 'RUNNING') {
        dismissAlertsMatching(/AI-анализ запущен|Черновой AI-анализ запущен/i);
    }
    const uiModel = buildScreenStateUiModel(screenState, {
        blockingCount,
        optionalCount,
        missingLabels,
        reviewCount: reviewProgress.pending,
        reviewProgress,
    });
    const readyBar = document.getElementById('readyToRunBar');
    const readyText = document.getElementById('readyToRunText');
    const primaryBtn = document.getElementById('btnAnalyze');
    const running = ws.analysis_running || data.status === 'in_progress';
    const onDirectTab = isDirectDataSubtabActive();
    const directExcelReady = hasDirectExcelSlice(data);
    const analysisDone = hasGuidedCompletedAnalysis(data);
    const hideCommandBar = screenState === 'BLOCKED_REQUIRED' && !(onDirectTab && directExcelReady);
    const showCommandStrip = onDirectTab
        ? (directExcelReady || analysisDone || screenState === 'RUNNING')
        : !hideCommandBar;
    setAuditCommandBarVisible(showCommandStrip);

    const statusEl = document.getElementById('auditStatus');
    const simplifyDirectChrome = onDirectTab && directExcelReady && !hasGuidedCompletedAnalysis(data);
    const showHeaderProgress = !simplifyDirectChrome && !running && screenState !== 'BLOCKED_REQUIRED' && (
        coverage.has_materials
        || (coverage.structure_percent ?? 0) > 0
        || (coverage.audit_percent ?? 0) > 0
        || ['READY_FOR_ANALYSIS', 'DATA_NEEDS_REVIEW', 'ANALYSIS_DONE', 'REPORT_READY'].includes(ws.state)
    );
    if (statusEl) {
        const showStatusBadge = ['RUNNING', 'FAILED', 'RESULTS_NEED_REVIEW', 'PRELIMINARY_REPORT'].includes(screenState)
            || (!showHeaderProgress && screenState !== 'READY_TO_RUN');
        if (!showStatusBadge) {
            statusEl.style.display = 'none';
        } else {
            statusEl.style.display = '';
            let statusText = uiModel.status || ui.status_label || ws.label || runtimeBridge.getStatusLabel?.(data.status);
            if (screenState === 'RESULTS_NEED_REVIEW' && reviewProgress.total > 0) {
                statusText = formatReviewProgressLine(reviewProgress);
            }
            statusEl.textContent = statusText;
            const badgeClass = ws.analysis_failed ? 'failed'
                : ws.analysis_running ? 'in_progress'
                : (blockingCount > 0 ? 'needs_review' : (issueCount > 0 ? 'needs_review' : data.status));
            statusEl.className = `badge badge-${badgeClass}`;
        }
    }

    const hintEl = document.getElementById('auditNextStepHint');
    if (hintEl) {
        let hintText = simplifyDirectChrome ? '' : (uiModel.hint || '');
        if (!hintText && screenState !== 'READY_TO_RUN') {
            hintText = ui.next_action_hint || '';
        }
        hintEl.textContent = hintText;
        hintEl.style.display = hintText ? '' : 'none';
    }
    if (statusEl && simplifyDirectChrome) {
        statusEl.style.display = 'none';
    }
    if (primaryBtn) {
        primaryBtn.style.display = (screenState === 'BLOCKED_REQUIRED' || usesPostAnalysisHero(screenState)) ? 'none' : '';
        primaryBtn.classList.remove('btn-outline', 'btn-success', 'btn-danger', 'btn-primary');
        if (uiModel.primaryLabel) primaryBtn.textContent = uiModel.primaryLabel;
        if (uiModel.primaryClass) primaryBtn.classList.add(uiModel.primaryClass);

        const serverPrimary = ui.primary_button || {};
        const serverBlocksRun = serverPrimary.enabled === false
            && uiModel.primaryAction === 'run'
            && ['READY_TO_RUN', 'FAILED', 'PRELIMINARY_REPORT'].includes(screenState);
        if (serverBlocksRun) {
            primaryBtn.disabled = true;
            primaryBtn.classList.remove('btn-success', 'btn-primary');
            primaryBtn.classList.add('btn-outline');
            primaryBtn.title = serverPrimary.reason_disabled || 'Исправьте данные перед запуском';
        } else {
            primaryBtn.disabled = false;
            primaryBtn.title = serverPrimary.reason_disabled || uiModel.hint || primaryBtn.textContent;
        }
    }
    runtimeBridge.renderAnalysisStaleBar?.(data);

    if (readyBar && readyText) {
        readyBar.style.display = 'none';
        readyText.textContent = '';
    }

    const renderFocus = () => {
        const focusBox = document.getElementById('auditFocusBanner');
        const focusKpi = document.getElementById('auditFocusKpi');
        const focusProblem = document.getElementById('auditFocusProblem');
        const focusWhy = document.getElementById('auditFocusWhy');
        const focusAction = document.getElementById('auditFocusAction');
        const focusBtn = document.getElementById('auditFocusActionBtn');
        if (!focusBox || !focusKpi || !focusProblem || !focusWhy || !focusAction || !focusBtn) return 'is-warning';

        const primary = ui.primary_button || {};
        let actionLabel = (primary.label || 'Запустить AI-анализ').replace(/^[🤖📝🔄⏳]\s*/, '');
        if (hasGuidedCompletedAnalysis(data) && /запустить ai-анализ/i.test(actionLabel)) {
            actionLabel = 'Перезапустить анализ';
        }
        const coveragePct = Number(coverage.audit_percent || 0);
        const topIssue = getPrimaryOpenIssue(data);
        let tone = 'is-warning';
        let problemText = 'Сейчас не так: не хватает данных для стабильного аудита.';
        let whyText = 'Без минимального набора входных данных AI не сможет дать надёжные выводы.';
        let actionText = `Что нажать дальше: ${actionLabel}.`;
        let buttonText = 'Исправить сейчас';
        let kpiText = 'До разблокировки: считаем…';
        focusActionState = { mode: 'issue', issueId: topIssue?.id || null };

        if (ws.analysis_running || data.status === 'in_progress') {
            tone = 'is-warning';
            kpiText = `До разблокировки: ${blockingCount} критичных, ${issueCount} всего.`;
            problemText = 'Сейчас не так: анализ ещё не завершён.';
            whyText = 'Пока расчёт не закончится, выводы и рекомендации могут быть неполными.';
            actionText = 'Что нажать дальше: дождитесь окончания анализа и проверьте результат.';
            buttonText = 'Обновить статус';
            focusActionState = { mode: 'wait' };
        } else if (ws.analysis_failed || data.status === 'failed') {
            tone = 'is-danger';
            kpiText = `До разблокировки: ${blockingCount} критичных, ${issueCount} всего.`;
            problemText = 'Сейчас не так: последний запуск завершился ошибкой.';
            whyText = 'Без успешного запуска отчёт остаётся частичным и не готов к использованию.';
            actionText = `Что нажать дальше: ${actionLabel}.`;
            buttonText = 'Перезапустить анализ';
            focusActionState = { mode: 'rerun' };
        } else if (blockingCount > 0) {
            tone = 'is-danger';
            kpiText = `До разблокировки: ${blockingCount} критичных, ${issueCount} всего.`;
            problemText = `Сейчас не так: ${blockingCount} обязательных пунктов блокируют запуск аудита.`;
            whyText = topIssue?.reason
                ? `Почему мешает: ${topIssue.reason}`
                : 'Почему мешает: без критичных данных итоговые выводы будут недостоверны.';
            actionText = `Что нажать дальше: исправьте первый критичный пункт и затем ${actionLabel.toLowerCase()}.`;
            buttonText = 'Исправить критичный пункт';
        } else if (optionalCount > 0) {
            tone = 'is-ok';
            kpiText = `До разблокировки: 0 критичных, улучшений ${optionalCount}.`;
            problemText = 'К запуску готово: обязательных блокеров нет.';
            whyText = topIssue?.reason
                ? `Что можно улучшить: ${topIssue.reason}`
                : 'Что можно улучшить: закройте желательные пункты, если хотите повысить качество отчёта.';
            actionText = `Что нажать дальше: ${actionLabel}.`;
            buttonText = actionLabel;
            focusActionState = { mode: 'rerun' };
        } else if (coveragePct >= 95 || ws.state === 'REPORT_READY' || ws.state === 'ANALYSIS_DONE') {
            tone = 'is-ok';
            kpiText = 'До разблокировки: 0 критичных, 0 открытых.';
            problemText = 'Сейчас не так: критичных блокеров нет.';
            whyText = 'Почему это важно: данные уже достаточны, можно получить полноценный отчёт.';
            actionText = `Что нажать дальше: ${actionLabel}.`;
            buttonText = actionLabel;
            focusActionState = { mode: 'rerun' };
        }

        const auditKey = String(data?.id || getCurrentAuditId() || 'unknown');
        if (focusKpiTrendState.auditKey !== auditKey) {
            focusKpiTrendState = { auditKey, blocking: null, open: null };
        }
        const prevBlocking = focusKpiTrendState.blocking;
        const prevOpen = focusKpiTrendState.open;
        if (Number.isFinite(prevBlocking) && Number.isFinite(prevOpen) && (prevBlocking !== blockingCount || prevOpen !== issueCount)) {
            const trendPrefix = (blockingCount <= prevBlocking && issueCount <= prevOpen) ? 'Прогресс' : 'Изменение';
            kpiText += ` · ${trendPrefix}: было ${prevBlocking}/${prevOpen}, сейчас ${blockingCount}/${issueCount}`;
        }
        focusKpiTrendState.blocking = blockingCount;
        focusKpiTrendState.open = issueCount;

        focusBox.classList.remove('is-danger', 'is-warning', 'is-ok');
        focusBox.classList.add(tone);
        focusKpi.textContent = kpiText;
        focusProblem.textContent = problemText;
        focusWhy.textContent = whyText;
        focusAction.textContent = actionText;
        focusBtn.textContent = buttonText;
        focusBtn.style.display = canWrite() ? 'inline-flex' : 'none';
        const hideFocusBecauseGuided = screenState === 'BLOCKED_REQUIRED' || usesPostAnalysisHero(screenState);
        focusBox.style.display = blockingCount > 0 && !hideFocusBecauseGuided ? 'grid' : 'none';
        return tone;
    };
    const focusTone = renderFocus();

    const issuesBadge = document.getElementById('issuesStatusBadge');
    const badgeCount = document.getElementById('issuesCountBadge');
    const badgeText = document.getElementById('issuesTextBadge');
    if (issuesBadge && badgeCount) {
        const showReviewBadge = currentScreenState === 'RESULTS_NEED_REVIEW'
            && reviewProgress.pending > 0
            && !usesPostAnalysisHero(currentScreenState);
        const showBlockingBeforeRun = !simplifyDirectChrome
            && !(onDirectTab && !hasGuidedCompletedAnalysis(data))
            && !isPostAnalysisScreen(currentScreenState)
            && currentScreenState !== 'RESULTS_NEED_REVIEW'
            && blockingCount > 0;
        const showPostAnalysisReview = isPostAnalysisScreen(currentScreenState) && reviewProgress.pending > 0;
        issuesBadge.style.display = (showReviewBadge || showBlockingBeforeRun || showPostAnalysisReview)
            ? 'inline-flex'
            : 'none';
        if (showBlockingBeforeRun) {
            badgeCount.textContent = blockingCount;
            if (badgeText) {
                badgeText.textContent = blockingCount === 1 ? 'обязательный пункт' : 'обязательных пунктов';
            }
            issuesBadge.title = `${blockingCount} обязательных пунктов в данных`;
        } else if (showReviewBadge || showPostAnalysisReview) {
            const displayCount = reviewProgress.pending;
            badgeCount.textContent = displayCount;
            if (badgeText) {
                badgeText.textContent = currentScreenState === 'RESULTS_NEED_REVIEW'
                    ? (displayCount === 1 ? 'вывод на проверке' : 'на проверке')
                    : 'требуют проверки';
            }
            issuesBadge.title = pluralizeFindingsReview(displayCount);
        }
    }

    const strip = document.getElementById('auditProgressStrip');
    if (strip) {
        strip.style.display = showHeaderProgress ? 'flex' : 'none';
        if (showHeaderProgress) runtimeBridge.renderCoverageProgress?.(coverage);
    }

    updateMoreMenuDraft(data);

    if (running) {
        const stuck = runtimeBridge.isAnalysisLikelyStuck?.(data);
        runtimeBridge.showAnalysisProgress?.({
            percent: 50,
            status: 'in_progress',
            message: stuck
                ? 'AI-анализ долго не отвечает. Можно сбросить статус и запустить снова.'
                : (ui.next_action_hint || 'AI обрабатывает материалы…'),
        });
        const bar = document.getElementById('analysisProgress');
        if (bar && stuck && canWrite()) {
            let resetBtn = document.getElementById('btnResetStuckAnalysis');
            if (!resetBtn) {
                resetBtn = document.createElement('button');
                resetBtn.id = 'btnResetStuckAnalysis';
                resetBtn.type = 'button';
                resetBtn.className = 'btn btn-outline btn-sm btn-mt-xs';
                resetBtn.textContent = 'Сбросить зависший анализ';
                resetBtn.onclick = () => runtimeBridge.resetStuckAnalysis?.();
                bar.appendChild(resetBtn);
            }
            resetBtn.style.display = 'inline-flex';
        } else {
            const resetBtn = document.getElementById('btnResetStuckAnalysis');
            if (resetBtn) resetBtn.style.display = 'none';
        }
        return;
    }
    const resetBtn = document.getElementById('btnResetStuckAnalysis');
    if (resetBtn) resetBtn.style.display = 'none';

    runtimeBridge.hideAnalysisProgress?.();

    if (ws.analysis_failed || data.status === 'failed') {
        const bar = document.getElementById('analysisProgress');
        if (bar) {
            bar.style.display = 'block';
            bar.classList.add('audit-running-failed');
            const msg = document.getElementById('analysisProgressMessage');
            if (msg) msg.textContent = ui.next_action_hint || 'Анализ завершился ошибкой. Исправьте данные и повторите запуск.';
        }
    } else {
        const bar = document.getElementById('analysisProgress');
        if (bar) bar.classList.remove('audit-running-failed');
    }
}

/** @deprecated alias */
function syncAnalysisProgressBanner(data) {
    renderAuditCommandBar(data);
}

function applyWorkflowReportVisibility(data) {
    const ws = data?.workflow_state || {};
    const failed = ws.analysis_failed || data?.status === 'failed';
    const showAi = ws.show_ai_report_sections && !failed;
    const hasMonthly = (data?.direct_analytics?.monthly || []).length > 0;
    const dynamicsOnly = !showAi && hasMonthly && !failed;

    const failedBanner = document.getElementById('analysisFailedBanner');
    if (failedBanner) {
        failedBanner.style.display = failed ? 'block' : 'none';
        failedBanner.innerHTML = failed ? `
            <div class="analysis-failed-banner">
                <strong>AI-анализ не завершён</strong>
                <p>AI-анализ завершился ошибкой. На вкладке «Динамика» — только KPI; полный отчёт после успешного анализа.</p>
            </div>` : '';
    }

    const setBlock = (id, visible) => {
        const el = document.getElementById(id);
        if (el) el.style.display = visible ? '' : 'none';
    };

    const clientReportIds = [
        'reportSendStatus',
        'reportExecutiveHero',
        'reportAiSummaryCard',
        'reportConfirmedPreviewCard',
        'reportOfferCard',
        'reportAuditPlanCard',
        'reportIllustrationsGuideCard',
        'reportAppendixCard',
    ];
    clientReportIds.forEach((id) => setBlock(id, showAi));

    const prePdfCard = document.querySelector('.report-pre-pdf-card');
    if (prePdfCard) prePdfCard.style.display = showAi ? '' : 'none';

    const internalDetails = document.querySelector('.report-internal-details');
    if (internalDetails) internalDetails.style.display = showAi ? '' : 'none';

    setBlock('chartsContainer', showAi);
    setBlock('auditFlowContainer', showAi);

    const zoneBox = document.getElementById('zoneScoresContainer');
    if (zoneBox && !showAi) {
        zoneBox.innerHTML = '';
        zoneBox.style.display = 'none';
    }

    setBlock('reportDynamicsLead', dynamicsOnly);
    const dynamicsTitle = document.getElementById('reportDynamicsLeadTitle');
    const dynamicsHint = document.getElementById('reportDynamicsLeadHint');
    if (dynamicsTitle && dynamicsOnly) {
        dynamicsTitle.textContent = DIRECT_COPY.dynamicsLeadTitle;
    }
    if (dynamicsHint && dynamicsOnly) {
        dynamicsHint.textContent = DIRECT_COPY.dynamicsLeadHint;
    }

    const showDynamicsBlock = dynamicsOnly || showAi;
    setBlock('comparisonContainer', showDynamicsBlock);
    setBlock('reportMetricsCard', showDynamicsBlock);
    setBlock('healthKpiStrip', showDynamicsBlock && Boolean(data?.direct_analytics?.health));

    if (failed) {
        if (zoneBox) zoneBox.innerHTML = '';
        const chartsBox = document.getElementById('chartsContainer');
        if (chartsBox) chartsBox.innerHTML = '';
        const flowBox = document.getElementById('auditFlowContainer');
        if (flowBox) flowBox.innerHTML = '';
    }
}
async function showAnalysisCompleteModal(data) {
    if (!data || !hasGuidedCompletedAnalysis(data)) return;
    const runAt = data?.analysis_freshness?.last_analysis_at || data?.updated_at || 'latest';
    const runKey = `${getCurrentAuditId()}:${runAt}`;
    if (analysisCompleteModalShownForRun === runKey) return;

    const findings = data?.findings || [];
    const progress = getFindingReviewProgress(data);
    const confirmed = findings.filter((f) => ['human_confirmed', 'human_edited'].includes(f.status)).length;
    const rejected = findings.filter((f) => f.status === 'human_rejected').length;
    const total = findings.length;
    const pending = progress.pending;

    let hintsBlock = '';
    try {
        const auditId = getCurrentAuditId();
        if (auditId) {
            const { hints } = await apiRequest(`/api/audits/${auditId}/post-analysis-hints`);
            if (hints?.length) {
                hintsBlock = '\n\nПодсказки:\n' + hints.map((h) => `• ${h.title}: ${h.text}`).join('\n');
            }
        }
    } catch (_e) { /* optional */ }

    const goReview = await showConfirmDialog({
        title: 'AI-анализ завершён',
        message: `Найдено выводов: ${total}\n— подтверждено: ${confirmed}\n— отклонено: ${rejected}\n— требуют проверки: ${pending}${hintsBlock}`,
        confirmText: pending > 0 ? 'Перейти к выводам' : 'Открыть отчёт',
        cancelText: 'Закрыть',
        confirmType: 'primary',
    });
    analysisCompleteModalShownForRun = runKey;
    if (!goReview) return;
    if (pending > 0) {
        runtimeBridge.switchTab?.('results');
        setTimeout(() => scrollToPendingFindings(), 120);
    } else {
        openReportPanel();
    }
}
export function queuePostAnalysisUiJump(enabled) {
    jumpToPostAnalysisTab = Boolean(enabled);
    pendingAnalysisCompleteModal = Boolean(enabled);
}

export function consumePostAnalysisNavigation() {
    if (jumpToPostAnalysisTab && isPostAnalysisScreen(currentScreenState)) {
        const target = ['RESULTS_READY', 'RESULTS_NEED_REVIEW'].includes(currentScreenState) ? 'results' : 'report';
        runtimeBridge.switchTab?.(target);
        jumpToPostAnalysisTab = false;
        return true;
    }
    return false;
}

export function consumeAnalysisCompleteModal(data) {
    if (pendingAnalysisCompleteModal && hasGuidedCompletedAnalysis(data)) {
        pendingAnalysisCompleteModal = false;
        showAnalysisCompleteModal(data);
    }
}

export function getGuidedStepSnapshot() {
    return guidedStepState?.step ?? null;
}

export function getCurrentScreenState() {
    return currentScreenState;
}

export {
    renderGuidedFirstRun,
    isPostAnalysisScreen,
    usesPostAnalysisHero,
    isPreliminaryAudit,
    getOpenDataIssues,
    getPostAnalysisReviewIssues,
    getPostAnalysisDataImprovements,
    hasGuidedMetricsMaterial,
    handleGuidedPrimaryAction,
    handleGuidedSecondaryAction,
    runPrimaryAction,
    runFocusAction,
    scrollToPendingFindings,
    scrollGuidedFirstRunIntoView,
    openIssuesPanel,
    openRecommendationsPanel,
    openReportPanel,
    rerunAuditAnalysis,
    toggleFocusMode,
    toggleDataSecondaryArea,
    applyFocusModeLayout,
    renderAuditCommandBar,
    showAnalysisCompleteModal,
    resolveScreenState,
    getGuidedStepState,
    hasGuidedCompletedAnalysis,
    hasGuidedRequiredMetrics,
    hasGuidedEvidenceSource,
    refreshAuditAndAdvanceGuidedFlow,
    syncPostAnalysisChrome,
    applyWorkflowReportVisibility,
    updateMoreMenuDraft,
};
