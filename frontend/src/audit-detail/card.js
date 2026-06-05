// Audit card (remaining UI) — epic H5. Sources: frontend/src/ → .\scripts\build-frontend.ps1

import {
    parseApiDateTime,
    parseApiDateMs,
    formatDate,
    formatAuditListDateTime,
} from '../shared/timezone.js';
import {
    normalizeOpsAlertSummary,
    humanizeDisplayText,
    getActiveWorkflowTab,
    formatMoney,
    formatNumber,
    showLoader,
    hideLoader,
    escapeHtml,
    jsAttr,
} from '../core/utils.js';
import { showAlert, dismissAlertsMatching } from '../core/alerts.js';
import {
    openModal,
    closeModal,
    showConfirmDialog,
    showPromptDialog,
} from '../core/modals.js';
import {
    apiRequest,
    apiFetch,
    findingFeedbackUrl,
    openProtectedFileUrl,
} from '../core/api.js';
import {
    authEnabled,
    strictViewerMode,
    canWrite,
    isAdminUser,
    isViewerReadOnly,
    requireWriteAccess,
    loadAuthContext,
    renderIdentityBadges,
    renderAuthControls,
    openAuthLoginModal,
    fillDevAuthCredentials,
    submitAuthLogin,
    logoutAuth,
} from '../core/auth.js';
import { configureRuntimeBridge } from '../core/runtime-bridge.js';
import { registerWindowHandlers } from '../register-window-handlers.js';
import {
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
} from '../audits-list/index.js';
import {
    getFindingReviewProgress,
    buildFindingReviewBannerModel,
    setFindingsMarketerFilter,
    goToFindingsInReport,
    scrollToDirectRisks,
    openAiFindingFromDirectRisk,
    openDirectExcelSource,
    renderDirectRisksOnDirectPage,
    renderFindings,
    openFindingEvidenceMaterial,
    openFindingIllustrationPicker,
    clearFindingIllustration,
    unconfirmFinding,
    confirmFinding,
    confirmFindingRiskPattern,
    rejectFinding,
    restoreFindingToReview,
    openFindingEdit,
    saveFindingEdit,
    loadKbStatusCard,
    areaDisplayLabel,
    syncFindingsAuxPanelsVisibility,
} from '../audit-detail/findings.js';
import { sanitizeClientReportText, hasInternalReportLeak } from './finding-report-text.js';
import {
    hasGuidedCompletedAnalysis,
    hasGuidedRequiredMetrics,
    hasGuidedEvidenceSource,
    hasGuidedMetricsMaterial,
    getOpenDataIssues,
    getPostAnalysisDataImprovements,
    isPostAnalysisScreen,
    usesPostAnalysisHero,
    isPreliminaryAudit,
    renderGuidedFirstRun,
    handleGuidedPrimaryAction,
    handleGuidedSecondaryAction,
    runPrimaryAction,
    runFocusAction,
    scrollToPendingFindings,
    openIssuesPanel,
    openRecommendationsPanel,
    openReportPanel,
    rerunAuditAnalysis,
    toggleFocusMode,
    toggleDataSecondaryArea,
    applyFocusModeLayout,
    renderAuditCommandBar,
    showAnalysisCompleteModal,
    applyWorkflowReportVisibility,
    refreshAuditAndAdvanceGuidedFlow,
    getGuidedStepSnapshot,
    getCurrentScreenState,
    queuePostAnalysisUiJump,
    consumePostAnalysisNavigation,
    consumeAnalysisCompleteModal,
} from '../audit-detail/workflow.js';
import {
    renderChatHistory,
    renderChatSuggestions,
    toggleChatWhy,
    sendAuditQuestion,
    applyChatSuggestion,
    applyChatAnswerToFindingFromBtn,
    askFromFinding,
    askInChat,
} from '../audit-detail/chat.js';
import {
    showAnalysisProgress,
    hideAnalysisProgress,
    connectAnalysisProgress,
    closeAnalysisSocket,
} from '../audit-detail/analysis-ws.js';
import { switchTab } from '../core/tabs.js';
import { setupDropZones } from '../core/dnd.js';
import {
    renderDirectStepsCard,
    openFindingsStubEnrichment,
    goToDirectResultsRisks,
    buildDirectRiskCatalogFromHealth,
} from '../audit-detail/direct-enrichment-ux.js';
import {
    mountDirectDynamicsBlock,
    buildKpiGrowthSublines,
} from '../audit-detail/direct-dynamics-chart.js';
import { renderDirectHealthZoneRows } from '../audit-detail/direct-health-zones.js';
import { DIRECT_COPY, hasDirectExcelSlice } from '../audit-detail/direct-copy.js';
import { renderDirectHealthInfoPanel } from '../audit-detail/direct-health-rules-reference.js';
import {
    loadComparison,
    renderDirectHealthReport,
    previewAuditReport,
    exportAuditReport,
    runPrePdfCheck,
    renderReportSendChecklist,
    saveSendChecklistItem,
    initReportClientViewToggle,
    setReportClientView,
    goFixDirectAiConsistency,
    openAiSummaryForConsistency,
    exportSlidesPptx,
    exportGoogleSlides,
    syncDirectHealthFindings,
} from '../audit-detail/report.js';
import {
    renderCommercialOffer,
    renderAnalyticsReadiness,
    renderAuditPlanCard,
    captureAuditBaseline,
    saveAuditPlan,
    saveReportCommercialOffer,
    saveReportAuditSummary,
    refreshReportSummaryFromAudit,
    refreshReportCommercialOfferFromAudit,
    renderReportSummaryEditor,
    toggleReportSummaryEdit,
    applyForecastFromCommercialOffer,
} from '../audit-detail/report-offer-plan.js';
import { reportPriorityLabel } from '../audit-detail/report-helpers.js';
import { generateClientSnapshotDraft } from '../audit-detail/client-snapshot-draft.js';
import {
    switchDataSubtab,
    restoreDataSubtab,
    updateDataSubtabBadges,
    renderDataNowSummary,
    wrapDirectCollapsible,
    renderMaterialsGrouped,
    filterMaterialsList,
    clearMaterialsSearch,
    openMaterialDrawer,
    closeMaterialDrawer,
    openDirectConditionsModalHost,
    scrollToDirectSliceAnchor,
    isDirectDataSubtabActive,
    isSourcesDataSubtabActive,
    handleDataFlowRunAi,
    setSourcesAiFilter,
} from '../audit-detail/data-tab-ux.js';
import {
    renderReportSendStatus,
    renderReportExecutiveHero,
    renderReportConfirmedPreview,
    renderReportIllustrationsGuide,
    renderReportAppendix,
    saveFindingIllustrationCaption,
    openReportAppendixPicker,
    removeReportAppendixItem,
    moveReportAppendixItem,
    saveReportAppendixFromUi,
} from '../audit-detail/report-illustrations.js';
import {
    loadOpsHealthPage,
    toggleOpsHealthAutoRefresh,
    initAiModelSelectors,
    getSelectedModelId,
    updateAiPrivacyProviderLabel,
    refreshAiCostEstimate,
    bindAiCostEstimateListeners,
    initAiContextOptionsPanel,
    buildAnalysisPrivacyPayload,
} from '../audit-detail/audit-ai-setup.js';
import {
    toggleBrowserSpeechRecognition,
} from '../media/stt.js';
import {
    startRecording,
    stopRecording,
    cancelRecording,
    getMediaRecorder,
} from '../media/audio.js';
import {
    openNewMaterial,
    applyDocumentModalGuidance,
    getMaterialById,
    openDocumentMaterialById,
    openDocumentMaterial,
    editDocumentText,
    editMaterial,
    materialReviewAction,
    setMaterialAiInclusion,
    saveMaterialAiHint,
    rerunScreenshotOcr,
    reocrAllScreenshots,
    submitTextNote,
    submitAudioMaterial,
    submitScreenshot,
    submitMetrics,
    initMetricPeriodPickers,
    setMetricPeriodPreset,
    extractMetricsFromNotesWithConfirm,
    extractMetricsFromNoteWithConfirm,
    extractMetricsWithAiConfirm,
    cleanupStaleMaterials,
    addDocument,
    importDirectPeriodsFromPreview,
    deleteMaterial,
    fillMetricsForm,
    setModalSubmitLabel,
    applyMetricPeriodFromStored,
    getDocumentIssueContext,
    setDocumentIssueContext,
    setEditingMaterialId,
    clearEditingMaterialId,
    initMaterialFileTitleAutofill,
} from '../audit-detail/materials.js';

// === УТИЛИТЫ (legacy) ===

function applyRoleUiRestrictions() {
    if (!isViewerReadOnly()) return;

    // Disable top-level mutating actions.
    [
        'btnAnalyze',
        'btnAnalyzeDraft',
        'chatSendBtn',
    ].forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (strictViewerMode) {
            el.style.display = 'none';
        } else {
            el.disabled = true;
            el.title = 'Только просмотр (viewer)';
        }
    });

    // Hide/disable inline action buttons that mutate server state.
    document.querySelectorAll('button').forEach((btn) => {
        const onclick = btn.getAttribute('onclick') || '';
        if (
            onclick.includes('openNewMaterial(')
            || onclick.includes('runAuditAnalysis(')
            || onclick.includes('editMaterial(')
            || onclick.includes('deleteMaterial(')
            || onclick.includes('confirmFinding(')
            || onclick.includes('rejectFinding(')
            || onclick.includes('materialReviewAction(')
            || onclick.includes('acceptDataLimitation(')
            || onclick.includes('saveFindingEdit(')
            ||             onclick.includes('createAudit(')
            || onclick.includes('openEditClientModal(')
            || onclick.includes('saveEditClient(')
            || onclick.includes('openContactModal(')
            || onclick.includes('openContactModalFromList(')
            || onclick.includes('duplicateAudit(')
            || onclick.includes('toggleArchiveAudit(')
            || onclick.includes('saveContact(')
            || onclick.includes('deleteContact(')
            || onclick.includes('runAnalysis(')
            || onclick.includes('deleteAudit(')
        ) {
            if (strictViewerMode) {
                btn.style.display = 'none';
            } else {
                btn.disabled = true;
                btn.title = 'Только просмотр (viewer)';
            }
        }
    });
}

function applyAdminUiSegmentation() {
    const isAdmin = isAdminUser();
    const adminDivider = document.getElementById('sourcesAddAdminDivider');
    const cleanupBtn = document.getElementById('sourcesAddCleanupBtn');
    if (adminDivider) adminDivider.style.display = isAdmin ? '' : 'none';
    if (cleanupBtn) cleanupBtn.style.display = isAdmin ? '' : 'none';
    updateExtractMetricsButtonVisibility(auditData);
    const chatBtn = document.getElementById('tabChatBtn');
    const chatPanel = document.getElementById('tab-chat');
    const chatTab = auditData?.workflow_ui?.tabs?.chat || {};
    const showChat = chatTab.visible !== false && (isAdmin || canWrite());
    if (chatBtn) chatBtn.style.display = showChat ? '' : 'none';
    if (chatPanel && !showChat && chatPanel.classList.contains('active')) {
        switchTab('results');
    }
    document.querySelectorAll('button').forEach((btn) => {
        const onclick = btn.getAttribute('onclick') || '';
        if (onclick.includes('deleteMaterial(')) {
            btn.style.display = canWrite() ? '' : 'none';
        }
        if (onclick.includes('deleteAudit(')) {
            btn.style.display = isAdmin ? '' : 'none';
        }
    });
}


function getLatestMetricsMaterial(data, { includeExcluded = false } = {}) {
    const materials = data?.materials || [];
    return materials
        .filter((m) => m?.type === 'manual_metrics' && (includeExcluded || !m.excluded_from_analysis))
        .sort((a, b) => parseApiDateMs(b.updated_at || b.created_at) - parseApiDateMs(a.updated_at || a.created_at))[0] || null;
}

function hasSavedMetricsSummary(data) {
    const summary = data?.metrics_summary || {};
    return Boolean(
        String(summary.period || '').trim()
        || summary.budget != null
        || summary.clicks != null
        || summary.leads != null
    );
}

function fillMetricsFromSummary(summary) {
    if (!summary) return;
    const set = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.value = value == null ? '' : String(value);
    };
    set('metricBudgetInput', summary.budget);
    set('metricClicksInput', summary.clicks);
    set('metricLeadsInput', summary.leads);
    set('metricSalesInput', summary.sales);
    set('metricRevenueInput', summary.revenue);
    set('metricGrossProfitInput', summary.gross_profit);
    set('metricMarginInput', summary.margin_percent);
    applyMetricPeriodFromStored(summary.period || '');
    const err = document.getElementById('metricsFormError');
    if (err) { err.style.display = 'none'; err.textContent = ''; }
}

function scrollToMetricsPeriodsPanel() {
    switchTab('data');
    switchDataSubtab('direct');
    setTimeout(() => {
        const panel = document.getElementById('directAnalyticsPanel');
        if (!panel) {
            showAlert('Блок Директ не найден. Обновите страницу (Ctrl+F5).', 'warning');
            return;
        }
        _focusScrollTarget(panel);
    }, 120);
}
window.scrollToMetricsPeriodsPanel = scrollToMetricsPeriodsPanel;

async function openMetricsEditorForNewPeriod(focusIssue = null) {
    if (focusIssue) setMetricsModalFocus(focusIssue);
    if (!auditData?.materials?.length && currentAuditId) {
        await loadAuditDetail();
    }
    const setActiveRow = document.getElementById('metricSetActiveRow');
    const modeHint = document.getElementById('metricsModalModeHint');
    const setActiveInput = document.getElementById('metricSetActiveInput');

    clearEditingMaterialId();
    if (!focusIssue) setMetricsModalFocus('period');
    openNewMaterial('metricsModal');
    if (setActiveRow) setActiveRow.style.display = 'none';
    if (modeHint) {
        modeHint.textContent = 'Новый месяц сохранится отдельной строкой. В отчёт и AI автоматически попадёт последний месяц по дате.';
    }
    setModalSubmitLabel('metricsModal', false);
    clearMetricPeriodPickers();
    focusMetricsModalField();
}

async function openMetricsEditor(focusIssue = null, materialId = null) {
    if (focusIssue) setMetricsModalFocus(focusIssue);
    if (!auditData?.materials?.length && currentAuditId) {
        await loadAuditDetail();
    }
    const periods = auditData?.metrics_periods?.periods || [];
    if (!materialId && periods.length > 0 && focusIssue) {
        const active = periods.find((p) => p.is_active) || periods[periods.length - 1];
        if (active?.material_id) {
            materialId = Number(active.material_id);
        }
    }

    const setActiveRow = document.getElementById('metricSetActiveRow');
    const modeHint = document.getElementById('metricsModalModeHint');
    const setActiveInput = document.getElementById('metricSetActiveInput');

    if (materialId) {
        const mat = getMaterialById(materialId);
        if (!mat) {
            showAlert('Период метрик не найден', 'warning');
            return;
        }
        setEditingMaterialId(mat.id);
        fillMetricsForm(mat);
        if (setActiveRow) setActiveRow.style.display = 'none';
        if (modeHint) {
            let importHint = '';
            try {
                const raw = JSON.parse(mat.raw_content || '{}');
                if (raw.import_source === 'yandex_direct_xlsx') {
                    importHint = ' Импорт из выгрузки Директа — если цифры верны, нажмите «Сохранить».';
                }
            } catch (_e) { /* ignore */ }
            modeHint.textContent = mat.needs_review
                ? `Проверка периода.${importHint} Цифры не смешиваются с другими месяцами.`
                : `Редактирование выбранного периода.${importHint} Цифры не смешиваются с другими периодами.`;
        }
        setModalSubmitLabel('metricsModal', true);
        openModal('metricsModal');
        focusMetricsModalField();
        return;
    }

    return openMetricsEditorForNewPeriod(focusIssue);
}
window.openMetricsEditor = openMetricsEditor;

function openMetricsEditorAddPeriod() {
    openMetricsEditorForNewPeriod(null);
}
window.openMetricsEditorAddPeriod = openMetricsEditorAddPeriod;

function openMetricsEditorEdit(materialId) {
    openMetricsEditor(null, materialId);
}
window.openMetricsEditorEdit = openMetricsEditorEdit;

async function activateMetricsPeriod(materialId) {
    if (!requireWriteAccess('Смена базового периода KPI')) return;
    const mid = Number(materialId);
    if (!currentAuditId || !mid) return;
    try {
        const updated = await apiRequest(`/api/audits/${currentAuditId}/metrics-periods/active`, {
            method: 'POST',
            body: JSON.stringify({ material_id: mid }),
        });
        if (auditData) {
            auditData.metrics_periods = updated;
        }
        showAlert('Базовый период для отчёта обновлён', 'success');
        await refreshAuditAndAdvanceGuidedFlow(null);
    } catch (error) {
        showAlert('Не удалось переключить базовый период: ' + error.message, 'warning');
    }
}
window.activateMetricsPeriod = activateMetricsPeriod;

async function goToAddAuditData() {
    switchTab('data');
    switchDataSubtab('direct');
}
window.goToAddAuditData = goToAddAuditData;



function isAnalysisStale(data) {
    return Boolean(data?.analysis_freshness?.analysis_stale);
}

function needsMetricsReportExplain(_data) {
    return false;
}

function _focusScrollTarget(el) {
    if (!el) return;
    if (el.tagName === 'DETAILS') el.open = true;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    el.classList.add('focus-target');
    setTimeout(() => el.classList.remove('focus-target'), 1400);
}

async function goToDataImprovements() {
    switchTab('data');
    const blocking = (auditData?.data_issues || []).filter(
        (i) => !i.resolved && !i.visible_after_analysis && i.severity === 'blocking',
    );
    if (blocking[0]) {
        openDataItemAction(blocking[0].id, blocking[0]);
        return;
    }
    switchDataSubtab('direct');
    setTimeout(() => {
        const actions = document.getElementById('materialActionsBar');
        if (actions) {
            _focusScrollTarget(actions);
            showAlert('Добавьте скриншоты или посадочные кнопками «Скриншот» / «Заметка» выше.', 'info');
            return;
        }
        switchDataSubtab('sources');
        showAlert('Добавьте скриншоты или документы во вкладке «Источники».', 'info');
    }, 120);
}
window.goToDataImprovements = goToDataImprovements;

function openMaterialDrawerFromUi(materialId) {
    openMaterialDrawer(materialId, {
        getMaterialById,
        getAuditData: () => auditData,
        manualMetricsTitle: manualMetricsMaterialTitle,
        renderMetricsCompact,
        formatTimestamps: formatMaterialTimestamps,
        canWrite,
    });
}
window.openMaterialDrawer = openMaterialDrawerFromUi;

function renderCoverageProgress(coverage) {
    if (!coverage) return;
    const setBar = (barId, labelId, value) => {
        const bar = document.getElementById(barId);
        const label = document.getElementById(labelId);
        const pct = Math.max(0, Math.min(100, Number(value || 0)));
        if (bar) bar.style.width = `${pct}%`;
        if (label) label.textContent = `${pct}%`;
    };
    setBar('structureProgressBar', 'structureProgressLabel', coverage.structure_percent);
    setBar('auditProgressBar', 'auditProgressLabel', coverage.audit_percent);
    setBar('reportProgressBar', 'reportProgressLabel', coverage.report_percent);
    const reportLabel = document.getElementById('reportProgressLabel');
    const reportPct = Number(coverage.report_percent || 0);
    if (reportLabel && reportPct < 100) {
        reportLabel.textContent = `${Math.max(0, Math.min(100, reportPct))}% (черновик)`;
        const missing = (coverage.missing_items || []).slice(0, 3).map((i) => i.label).filter(Boolean);
        reportLabel.title = missing.length
            ? `Базовые выводы готовы. Для полного отчёта не хватает: ${missing.join(', ')}.`
            : 'Базовые выводы готовы. Для полного отчёта нужны дополнительные источники.';
    }
}

function buildAnalysisStaleHtml(data, { compact = false } = {}) {
    const fresh = data?.analysis_freshness;
    if (!fresh?.analysis_stale) return '';
    const items = (fresh.stale_materials || []).slice(0, 5);
    const typeLabels = {
        text_note: 'Заметка',
        audio: 'Аудио',
        audio_transcript: 'Расшифровка',
        screenshot: 'Скриншот',
        screenshot_ocr: 'OCR',
        manual_metrics: 'Метрики',
        document: 'Документ',
    };
    const listHtml = items.length
        ? `<ul class="stale-materials-list">${items.map((m) => {
            if (m.type === 'manual_metrics') {
                return `<li>${escapeHtml(manualMetricsMaterialTitle(m))}</li>`;
            }
            const label = typeLabels[m.type] || m.type || 'Материал';
            return `<li>${escapeHtml(label)}${m.title ? `: ${escapeHtml(m.title)}` : ''}</li>`;
        }).join('')}</ul>`
        : '';
    const desync = buildKpiDesyncPreviewHtml(data);
    const title = compact
        ? '<strong>Данные обновлены — перезапустите AI-анализ</strong>'
        : '<strong>Изменено после анализа — обновите выводы AI</strong>';
    const hint = compact
        ? '<p class="muted ui-note-tight">Таблица KPI уже актуальна. Перезапуск обновит краткий вывод, findings и графики.</p>'
        : '<p class="muted ui-note-tight">Таблица KPI уже показывает новые цифры. Перезапуск AI-анализа обновит краткий вывод, findings и графики.</p>';
    return `
        <div class="analysis-stale-bar-inner${compact ? ' analysis-stale-bar-inner--compact' : ''}">
            <div class="analysis-stale-bar__content">
                ${title}
                ${hint}
                ${listHtml ? `<p class="muted ui-note-gap">Изменённые материалы:</p>${listHtml}` : ''}
                ${desync}
            </div>
            <button type="button" class="btn btn-warning btn-sm" onclick="rerunAuditAnalysis()">Перезапустить AI-анализ</button>
        </div>`;
}

function buildKpiDesyncPreviewHtml(data) {
    const fresh = data?.analysis_freshness;
    if (!fresh?.analysis_stale || !fresh.last_analysis_metrics) return '';
    const live = data?.metrics_summary || {};
    const old = fresh.last_analysis_metrics || {};
    const diffs = [];
    const keys = [
        ['cpl', 'CPL'],
        ['budget', 'Бюджет'],
        ['leads', 'Заявки'],
    ];
    keys.forEach(([key, label]) => {
        const liveVal = live[key];
        const oldVal = old[key];
        if (liveVal == null || oldVal == null) return;
        if (Math.abs(Number(liveVal) - Number(oldVal)) < 0.01) return;
        const fmt = key === 'budget' || key === 'cpl' ? formatMoney : formatNumber;
        diffs.push(`${label}: в таблице ${fmt(liveVal)}, в выводах AI ${fmt(oldVal)}`);
    });
    if (!diffs.length) return '';
    return `<div class="kpi-desync-preview"><strong>Расхождение KPI</strong><ul class="stale-materials-list">${diffs.map((d) => `<li>${escapeHtml(d)}</li>`).join('')}</ul></div>`;
}

function renderAnalysisStaleBar(data) {
    const bar = document.getElementById('analysisStaleBar');
    if (!bar) return;
    const html = buildAnalysisStaleHtml(data, { compact: false });
    if (!html) {
        bar.style.display = 'none';
        bar.innerHTML = '';
        return;
    }
    bar.style.display = 'flex';
    bar.innerHTML = html;
}

function updateExtractMetricsButtonVisibility(_data) {
    /* KPI из формы «Метрики» отключены — цифры только из Excel на «Директ». */
}

function renderReportAnalysisMeta(data) {
    const el = document.getElementById('reportAnalysisMeta');
    if (!el) return;
    const fresh = data?.analysis_freshness;
    if (!fresh?.last_analysis_at || !hasGuidedCompletedAnalysis(data)) {
        el.style.display = 'none';
        el.textContent = '';
        return;
    }
    const types = fresh.last_analysis_material_types || [];
    const typeLabels = {
        text_note: 'заметки',
        manual_metrics: 'метрики',
        document: 'документы',
        audio_transcript: 'расшифровки',
        screenshot_ocr: 'OCR',
    };
    const typeLine = types.length
        ? types.map((t) => typeLabels[t] || t).join(', ')
        : 'материалы аудита';
    el.style.display = 'block';
    el.textContent = `Последний AI-анализ: ${formatDate(fresh.last_analysis_at)}. В анализе: ${typeLine}.`;
}

function renderMetricsKpiSource(data) {
    const el = document.getElementById('metricsKpiSource');
    if (!el) return;
    const da = data?.direct_analytics;
    const monthly = da?.monthly || [];
    if (!monthly.length && !da?.totals?.cost) {
        el.style.display = 'none';
        el.innerHTML = '';
        return;
    }
    const period = da?.period || (monthly.length >= 2
        ? `${monthly[0]?.month} — ${monthly[monthly.length - 1]?.month}`
        : (monthly[0]?.month || ''));
    el.style.display = 'block';
    el.innerHTML = `<div class="muted">Оценка кабинета и графики «Расход по месяцам» — из Excel Директа${period ? ` (${escapeHtml(period)})` : ''}. Таблица KPI ниже — из формы «Период KPI».</div>`;
}

function renderReportActivePeriodNote(data, metrics) {
    const el = document.getElementById('reportActivePeriodNote');
    if (!el) return;
    const periods = data?.metrics_periods?.periods || [];
    const active = periods.find((p) => p.is_active);
    const label = String(metrics?.period || active?.period || '').trim();
    if (!label && !periods.length) {
        el.style.display = 'none';
        el.innerHTML = '';
        return;
    }
    const compareHint = periods.length >= 2
        ? ` Сравнение «было/стало»: <strong>${escapeHtml(periods[0]?.period || '—')} → ${escapeHtml(periods[periods.length - 1]?.period || '—')}</strong>.`
        : '';
    const activeHint = label
        ? `В таблице — <strong>последний месяц по дате</strong>: <strong>${escapeHtml(label)}</strong> (отчёт и AI).`
        : '';
    el.style.display = 'block';
    el.innerHTML = `${activeHint}${compareHint} Добавить месяц — «+ Добавить период» или «Данные → Директ».`;
}

function renderReportStaleDetails(data) {
    const box = document.getElementById('reportStaleDetails');
    if (!box) return;
    const topBar = document.getElementById('analysisStaleBar');
    const topStaleVisible = topBar
        && topBar.style.display !== 'none'
        && Boolean(topBar.innerHTML?.trim());
    if (topStaleVisible) {
        box.style.display = 'none';
        box.innerHTML = '';
        return;
    }
    const desyncOnly = buildKpiDesyncPreviewHtml(data);
    if (!data?.analysis_freshness?.analysis_stale) {
        box.style.display = 'none';
        box.innerHTML = '';
        return;
    }
    if (desyncOnly) {
        box.style.display = 'block';
        box.innerHTML = desyncOnly;
        return;
    }
    const html = buildAnalysisStaleHtml(data, { compact: true });
    if (!html) {
        box.style.display = 'none';
        box.innerHTML = '';
        return;
    }
    box.style.display = 'block';
    box.innerHTML = `<div class="analysis-stale-bar analysis-stale-bar--report">${html}</div>`;
}


function formatMaterialTimestamps(createdAt, updatedAt) {
    if (!createdAt) return '';
    const createdLabel = formatDate(createdAt);
    const updatedMs = updatedAt ? parseApiDateMs(updatedAt) : parseApiDateMs(createdAt);
    const createdMs = parseApiDateMs(createdAt);
    const wasEdited = Number.isFinite(updatedMs) && Number.isFinite(createdMs) && updatedMs - createdMs > 1000;
    if (wasEdited) {
        return `
            <div class="material-meta">
                <span>Создан: ${createdLabel}</span>
                <span>Изменён: ${formatDate(updatedAt)}</span>
            </div>
        `;
    }
    return `<div class="material-meta"><span>Создан: ${createdLabel}</span></div>`;
}


// === МОДАЛЬНЫЕ ОКНА (legacy) ===


// === API-ЗАПРОСЫ (legacy) ===

function isAnalysisLikelyStuck(data) {
    if (!data || data.status !== 'in_progress') return false;
    const updatedAt = data.updated_at ? parseApiDateMs(data.updated_at) : 0;
    const ageMs = updatedAt ? Date.now() - updatedAt : 0;
    return ageMs > 8 * 60 * 1000;
}

async function resetStuckAnalysis() {
    if (!requireWriteAccess('Сброс анализа')) return;
    if (!currentAuditId) return;
    const accepted = await showConfirmDialog({
        title: 'Сбросить зависший анализ',
        message: 'Статус «в обработке» будет снят. После этого можно снова запустить AI-анализ.',
        confirmText: 'Сбросить',
        cancelText: 'Отмена',
        confirmType: 'danger',
    });
    if (!accepted) return;
    try {
        showLoader();
        const result = await apiRequest(`/api/audits/${currentAuditId}/analyze/reset`, { method: 'POST' });
        hideLoader();
        showAlert(result?.message || 'Статус анализа сброшен', 'success');
        closeAnalysisSocket();
        hideAnalysisProgress();
        await loadAuditDetail();
    } catch (error) {
        hideLoader();
        showAlert('Не удалось сбросить анализ: ' + error.message, 'danger');
    }
}
window.resetStuckAnalysis = resetStuckAnalysis;


// === КАРТОЧКА АУДИТА (audit_card.html) ===

let currentAuditId = null;
let auditData = null;

const METRIC_FIELD_LABELS = {
    period: 'Период',
    budget: 'Бюджет (₽)',
    clicks: 'Клики',
    leads: 'Заявки',
    sales: 'Продажи',
    revenue: 'Выручка (₽)'
};
let privacySettings = null;

async function loadPrivacySettings() {
    try {
        privacySettings = await apiRequest('/api/privacy/settings');
    } catch (error) {
        console.warn('Privacy settings load error:', error);
        privacySettings = null;
    }
}

function setAiPrivacyModalDefaults() {
    const ai = privacySettings?.ai || {};
    const defaults = privacySettings?.defaults || {};
    const external = Boolean(ai.external_ai_enabled);

    const providerName = document.getElementById('aiPrivacyProviderName');
    const providerUrl = document.getElementById('aiPrivacyProviderUrl');
    const consentBlock = document.getElementById('aiExternalConsentBlock');
    const consent = document.getElementById('aiExternalConsent');
    const revenue = document.getElementById('aiSendRevenueSales');
    const tempRange = document.getElementById('aiTemperatureRange');
    const tempValue = document.getElementById('aiTemperatureValue');
    const modeLabel = (val) => {
        const n = Number(val);
        if (n <= 0.3) return 'Точный расчёт';
        if (n <= 0.5) return 'Основной аудит';
        if (n <= 0.7) return 'Коммерческое предложение';
        return 'Гипотезы и идеи';
    };

    if (tempRange && tempValue) {
        const defaultTemp = privacySettings?.temperature?.analysis ?? 0.3;
        tempRange.value = String(defaultTemp);
        tempValue.textContent = modeLabel(defaultTemp);
        tempRange.oninput = () => { tempValue.textContent = modeLabel(tempRange.value); };
    }

    if (providerName) {
        updateAiPrivacyProviderLabel();
        if (!external) providerName.textContent = 'безопасный локальный анализ';
    }
    if (providerUrl) {
        if (external && ai.privacy_url) {
            providerUrl.innerHTML = `<a href="${escapeHtml(ai.privacy_url)}" target="_blank" rel="noopener">Политика конфиденциальности провайдера</a>`;
        } else if (external) {
            providerUrl.innerHTML = 'Запрос через <a href="https://proxyapi.ru/docs" target="_blank" rel="noopener">ProxyAPI</a>. Баланс и счёт — в личном кабинете proxyapi.ru.';
        } else {
            providerUrl.textContent = 'Материалы не отправляются внешнему AI-провайдеру.';
        }
    }
    if (consentBlock) consentBlock.style.display = external ? 'block' : 'none';
    if (consent) consent.checked = !external;
    if (revenue) revenue.checked = Boolean(defaults.send_revenue_sales);
}

function showAiPrivacyDialog() {
    return new Promise((resolve) => {
        const modal = document.getElementById('aiPrivacyModal');
        if (!modal) {
            showAlert('Окно настройки приватности AI не найдено. Обновите страницу или откройте карточку аудита.', 'danger');
            resolve(null);
            return;
        }

        setAiPrivacyModalDefaults();
        openModal('aiPrivacyModal');
        initAiContextOptionsPanel();
        refreshAiCostEstimate();
        initAiModelSelectors().then(() => {
            setAiPrivacyModalDefaults();
            initAiContextOptionsPanel();
            refreshAiCostEstimate();
        });

        const btnStart = document.getElementById('aiPrivacyStart');
        const btnCancel = document.getElementById('aiPrivacyCancel');
        const btnClose = modal.querySelector('.modal-close');

        if (!btnStart || !btnCancel) {
            showAlert('Окно настройки приватности AI повреждено: не найдены кнопки запуска или отмены.', 'danger');
            closeModal('aiPrivacyModal');
            resolve(null);
            return;
        }

        let settled = false;
        const finish = (value) => {
            if (settled) return;
            settled = true;
            cleanup();
            closeModal('aiPrivacyModal');
            resolve(value);
        };
        const onCancel = () => finish(null);
        const onOverlayClick = (event) => {
            if (event.target === modal) onCancel();
        };
        const cleanup = () => {
            btnStart.removeEventListener('click', onStart);
            btnCancel.removeEventListener('click', onCancel);
            btnClose?.removeEventListener('click', onCancel);
            modal.removeEventListener('click', onOverlayClick);
        };
        const onStart = () => {
            const ai = privacySettings?.ai || {};
            const external = Boolean(ai.external_ai_enabled);
            const consent = document.getElementById('aiExternalConsent')?.checked || false;
            const sendRevenueSales = document.getElementById('aiSendRevenueSales')?.checked || false;
            const aiTemperature = Number(document.getElementById('aiTemperatureRange')?.value || 0.3);

            if (external && !consent) {
                showAlert('Нужно подтвердить отправку обезличенного контекста во внешний AI-сервис.', 'warning');
                return;
            }

            finish(buildAnalysisPrivacyPayload({
                sendRevenueSales,
                aiTemperature,
                aiConsent: !external || consent,
            }));
        };

        btnStart.addEventListener('click', onStart);
        btnCancel.addEventListener('click', onCancel);
        btnClose?.addEventListener('click', onCancel);
        modal.addEventListener('click', onOverlayClick);
    });
}

async function buildAnalysisPayload() {
    if (!privacySettings) await loadPrivacySettings();
    return await showAiPrivacyDialog();
}

async function loadAuditDetail() {
    const auditId = getAuditIdFromUrl();
    if (!auditId) return;
    currentAuditId = auditId;
    
    try {
        auditData = await apiRequest(`/api/audits/${auditId}`);
        renderAuditDetail(auditData);
        return auditData;
    } catch (error) {
        showAlert('Ошибка загрузки аудита: ' + error.message, 'danger');
        return null;
    }
}

function getAuditIdFromUrl() {
    const match = window.location.pathname.match(/\/audits\/(\d+)/);
    return match ? parseInt(match[1]) : null;
}

function renderAuditDetail(data) {
    // Клиент
    document.getElementById('clientName').textContent = data.client_name;
    const clientName2 = document.getElementById('clientName2');
    if (clientName2) clientName2.textContent = data.client_name;
    const clientRegion = document.getElementById('clientRegion');
    if (clientRegion) clientRegion.textContent = data.region || '—';
    document.getElementById('clientNiche').textContent = data.niche_display || data.niche || 'Не указана';
    document.getElementById('clientWebsite').textContent = data.website || 'Не указан';
    document.getElementById('auditGoal').textContent = data.goal || 'Не указана';
    document.getElementById('clientComment').textContent = data.comment || 'Нет';
    renderClientContacts(data.contacts || []);

    renderDataNowSummary(data);
    updateDataSubtabBadges(data);
    restoreDataSubtab(data);

    renderMaterials(data.materials || [], data.data_coverage);
    
    renderReportCharts(data);
    
    // Схема процесса (без mermaid-кода)
    renderAuditFlow(data.data_coverage);
    
    // Сводка
    renderSummary(data.audit_summary, data.metrics_summary, data.data_coverage);
    renderReportSummaryEditor(data.audit_summary, data.data_coverage);
    renderReportSendStatus(data);
    initReportClientViewToggle();
    renderReportSendChecklist(data.id);
    renderReportExecutiveHero(data.audit_summary, data);
    renderReportConfirmedPreview(data);
    renderReportPreliminarySections(data.data_coverage);
    applyWorkflowReportVisibility(data);

    renderAuditCommandBar(data);
    renderDataIssues(data.data_issues || []);
    renderAnalyticsReadiness(data.data_coverage);
    renderDirectAnalyticsPanel(data);
    renderAuditPlanCard(data);
    renderResultsIssues(data.data_issues || []);
    renderFindings(data.findings || [], data.data_coverage);
    renderCommercialOffer(data.commercial_offer, 'offerContainer', data.data_coverage, { hideWhenPendingReview: true });
    renderCommercialOffer(data.commercial_offer, 'reportOfferContainer', data.data_coverage, { hideWhenPendingReview: false });
    renderRecommendations(data.findings || [], data.commercial_offer, data.data_coverage);
    syncFindingsAuxPanelsVisibility();
    loadKbStatusCard();
    applyWorkflowTabs(data.workflow_ui?.tabs, data);
    renderGuidedFirstRun(data);
    applyFocusModeLayout(data);
    renderChatHistory();
    applyRoleUiRestrictions();
    applyAdminUiSegmentation();

    if (window.location.hash === '#client-contacts') {
        switchTab('report');
        requestAnimationFrame(() => {
            document.getElementById('clientContactsCard')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }

    consumePostAnalysisNavigation();

    consumeAnalysisCompleteModal(data);
    
    renderDirectHealthReport(data);

    if (document.getElementById('tab-report')?.classList.contains('active')) {
        loadComparison();
    }
}

function manualMetricsMaterialTitle(material) {
    const title = (material?.title || '').trim();
    if (title) return title;
    try {
        const raw = JSON.parse(material?.raw_content || '{}');
        if (raw.period) return `Метрики: ${raw.period}`;
    } catch (_e) { /* ignore */ }
    return 'Метрики';
}

function getStatusLabel(status) {
    const labels = {
        'draft': 'Черновик',
        'in_progress': 'В обработке',
        'completed': 'Завершён',
        'needs_review': 'Требует проверки',
        'failed': 'Ошибка'
    };
    return labels[status] || status;
}

function renderMaterials(materials, coverage) {
    renderMaterialsGrouped(materials, coverage, {
        getAuditData: () => auditData,
        manualMetricsTitle: manualMetricsMaterialTitle,
        renderMetricsCompact,
        formatTimestamps: formatMaterialTimestamps,
        canWrite,
    });
}

function formatMetricsPreview(raw) {
    try {
        const data = JSON.parse(raw);
        const visibleKeys = ['period', 'budget', 'clicks', 'leads', 'sales', 'revenue'];
        return visibleKeys
            .filter((k) => data[k] !== undefined && data[k] !== null && data[k] !== '')
            .map((k) => `${METRIC_FIELD_LABELS[k] || k}: ${data[k]}`)
            .join('\n');
    } catch (e) {
        return raw;
    }
}

function renderMetricsCompact(raw) {
    try {
        const data = JSON.parse(raw || '{}');
        const rows = [
            ['Период', data.period],
            ['Бюджет', data.budget != null ? formatMoney(data.budget) : null],
            ['Клики', data.clicks != null ? formatNumber(data.clicks) : null],
            ['Заявки', data.leads != null ? formatNumber(data.leads) : null],
            ['Продажи', data.sales != null ? formatNumber(data.sales) : null],
            ['Выручка', data.revenue != null ? formatMoney(data.revenue) : null],
        ].filter(([, v]) => v !== null && v !== undefined && v !== '');
        if (!rows.length) return '';
        return `<div class="metrics-compact">${rows.map(([k, v]) => `<div class="metrics-compact-item"><span class="k">${escapeHtml(String(k))}</span><span class="v">${escapeHtml(String(v))}</span></div>`).join('')}</div>`;
    } catch (_error) {
        return `<pre class="metrics-preview">${escapeHtml(formatMetricsPreview(raw))}</pre>`;
    }
}

function severityLabel(value) {
    return { high: 'высокий', medium: 'средний', low: 'низкий' }[String(value || '').toLowerCase()] || value || '—';
}

function chartBarEntries(chart) {
    const data = chart?.data;
    if (!data) return [];
    const labels = data.labels;
    const values = data.datasets?.[0]?.data;
    if (Array.isArray(labels) && labels.length && Array.isArray(values)) {
        return labels.map((label, idx) => [String(label ?? '—'), values[idx]]);
    }
    if (Array.isArray(values) && values.length) {
        return values.map((value, idx) => [`Кампания ${idx + 1}`, value]);
    }
    return Object.entries(data).filter(([key]) => !['labels', 'datasets'].includes(key));
}

function chartNumericTotal(chart) {
    return chartBarEntries(chart).reduce((s, [, value]) => s + (Number(value) || 0), 0);
}

function buildReportCampaignChart(data) {
    const campaigns = data?.direct_analytics?.campaigns || [];
    if (campaigns.length < 2) return null;
    const top = [...campaigns].sort((a, b) => (Number(b.leads) || 0) - (Number(a.leads) || 0)).slice(0, 8);
    const total = top.reduce((s, c) => s + (Number(c.leads) || 0), 0);
    if (total <= 0) return null;
    return {
        type: 'bar',
        title: 'Заявки по кампаниям',
        description: 'Агрегат за весь период отчёта (Excel Директа)',
        source: 'direct_slice',
        data: {
            labels: top.map((c) => String(c.campaign_name || c.campaign_id || '—').slice(0, 40)),
            datasets: [{ label: 'Заявки', data: top.map((c) => Number(c.leads) || 0) }],
        },
    };
}

function dedupeChartsPreferDirect(pool) {
    const byTitle = new Map();
    for (const chart of pool || []) {
        const key = (chart.title || '').trim().toLowerCase();
        const existing = byTitle.get(key);
        if (!existing) {
            byTitle.set(key, chart);
            continue;
        }
        const score = (c) => chartNumericTotal(c) + (c.source === 'direct_slice' ? 1e9 : 0);
        if (score(chart) > score(existing)) byTitle.set(key, chart);
    }
    return [...byTitle.values()];
}

function countMetricPeriods(data) {
    return (data?.materials || []).filter((m) => m.type === 'metrics').length;
}

/** Отчёт: без дубля «Динамика по периодам»; Excel важнее пустого AI. */
function pickReportCharts(data) {
    const hasKpiDynamics = countMetricPeriods(data) >= 2;
    const campaignChart = buildReportCampaignChart(data);
    let pool = dedupeChartsPreferDirect([
        ...(data?.charts || []),
        ...(data?.direct_analytics?.charts || []),
    ]);
    pool = pool.filter((c) => !/(заявки|лиды) по кампаниям/i.test(String(c.title || '')));
    if (campaignChart) pool.push(campaignChart);
    let candidates = pool.filter((c) => chartBarEntries(c).length > 0 && chartNumericTotal(c) > 0);
    if (hasKpiDynamics) {
        candidates = candidates.filter((c) => !/по месяцам/i.test(String(c.title || '')));
    }
    const order = [/(заявки|лиды) по кампаниям/i, /расход по месяцам/i, /(заявки|лиды) по месяцам/i, /cpl по месяцам/i];
    const picked = [];
    for (const re of order) {
        const found = candidates.find((c) => re.test(String(c.title || '')));
        if (found) picked.push(found);
    }
    if (picked.length < 2) {
        const zone = candidates.find((c) => c.type === 'score' || String(c.title || '').includes('зон'));
        if (zone && !picked.includes(zone)) picked.push(zone);
    }
    for (const c of candidates) {
        if (picked.length >= 2) break;
        if (!picked.includes(c)) picked.push(c);
    }
    return picked.slice(0, 2);
}

function reportChartDescription(chart) {
    const desc = String(chart?.description || '').trim();
    if (!desc || /ошибка/i.test(desc)) return '';
    if (chart?.source === 'direct_slice') return desc;
    return chartNumericTotal(chart) > 0 ? desc : '';
}

function renderReportCharts(data) {
    const container = document.getElementById('chartsContainer');
    const items = pickReportCharts(data);
    if (!container) return;
    if (!items.length) {
        container.innerHTML = '';
        container.style.display = 'none';
        return;
    }
    container.style.display = '';
    renderCharts(items, data.data_coverage, 'chartsContainer', { reportMode: true });
}

function renderCharts(charts, coverage, containerId = 'chartsContainer', options = {}) {
    const { reportMode = false } = options;
    const container = document.getElementById(containerId);
    if (!container) return;
    const onDirectPanel = containerId === 'directChartsPanel';
    const directCharts = (charts || []).filter((c) => c.source === 'direct_slice')
        .filter((c) => !/(по месяцам|CPL по месяцам|(заявки|лиды) по месяцам)/i.test(String(c.title || '')));
    const chartPool = onDirectPanel ? directCharts : (charts || []);
    if (!chartPool.length) {
        if (onDirectPanel) {
            container.innerHTML = '';
            container.style.display = 'none';
            return;
        }
        container.innerHTML = `
            <div class="card chart-placeholder">
                <div class="card-header"><h3>Графики</h3></div>
                <div class="card-body">
                    <p class="muted">${coverage?.is_preliminary
        ? 'Добавьте выгрузку Яндекс Директа или минимум 2 периода KPI, чтобы построить baseline-динамику.'
        : 'Добавьте минимум 2 корректных периода метрик, чтобы увидеть динамику и сравнение до/после.'}</p>
                </div>
            </div>`;
        return;
    }
    container.style.display = '';

    const zoneChart = chartPool.find(c => c.type === 'score' || (c.title && c.title.includes('зон')));
    const chartItems = onDirectPanel
        ? chartPool.filter((c) => c !== zoneChart).slice(0, 3)
        : (reportMode ? chartPool : (zoneChart ? [zoneChart] : chartPool.slice(0, 1)));

    const chartIdPrefix = reportMode ? 'horizontalChart_report_' : (onDirectPanel ? 'horizontalChart_direct_' : 'horizontalChart_');
    container.innerHTML = chartItems.map((c, i) => {
        const desc = reportMode ? reportChartDescription(c) : (c.description || '');
        return `
        <div class="card chart-wrapper">
            <div class="card-header"><h3>${escapeHtml(humanizeDisplayText(c.title || 'Графики'))}</h3></div>
            <div class="card-body">
                ${desc ? `<p class="muted chart-desc">${escapeHtml(desc)}</p>` : ''}
                <div class="horizontal-bar-chart" id="${chartIdPrefix}${i}"></div>
                ${c.insight ? `<div class="chart-insight">${escapeHtml(c.insight)}</div>` : ''}
                ${c.needs_review ? `<div class="needs-review-block"><span class="review-label">⚠️</span> ${escapeHtml(c.review_reason)}</div>` : ''}
            </div>
        </div>`;
    }).join('');

    setTimeout(() => {
        chartItems.forEach((c, i) => {
            const host = document.getElementById(`${chartIdPrefix}${i}`);
            if (!host || !c.data) return;
            const entries = chartBarEntries(c);
            const nums = entries.map(([, value]) => Number(value) || 0);
            const total = nums.reduce((s, n) => s + n, 0);
            if (!entries.length || total === 0) {
                const isCampaigns = /кампани/i.test(String(c.title || ''));
                host.innerHTML = `<p class="muted chart-empty-data">${isCampaigns
                    ? 'Нет данных по кампаниям в Excel. Загрузите отчёт с листом кампаний (вкладка «Данные → Директ»).'
                    : 'Нет ненулевых значений. Проверьте Excel Директа или периоды KPI.'}</p>`;
                return;
            }
            const maxVal = Math.max(...nums, 1);
            host.innerHTML = entries.map(([label, value]) => {
                const num = Number(value) || 0;
                const pct = Math.min(100, (num / maxVal) * 100);
                return `
                <div class="hbar-row">
                    <div class="hbar-label" title="${escapeHtml(label)}">${escapeHtml(label)}</div>
                    <div class="hbar-track"><div class="hbar-fill" style="--bar-fill:${pct}%"></div></div>
                    <div class="hbar-value">${escapeHtml(String(value))}</div>
                </div>`;
            }).join('');
        });
    }, 50);
}

function renderAuditFlow(coverage) {
    const container = document.getElementById('auditFlowContainer');
    if (!container) return;
    if (!isAdminUser()) {
        container.innerHTML = '';
        container.style.display = 'none';
        return;
    }
    container.style.display = 'block';
    const steps = [
        'Материалы',
        'Проверка данных',
        'Подтверждённые выводы',
        'Гипотезы',
        'Рекомендации',
        'План работ',
        'Отчёт',
    ];
    container.innerHTML = `
        <details class="card">
            <summary class="card-header card-summary-clickable"><h3>Логика аудита и решения (технический блок)</h3></summary>
            <div class="card-body">
                <p class="muted">Как система отделяет подтверждённые выводы от гипотез.</p>
                <div class="audit-flow-diagram">
                    ${steps.map((step, idx) => `
                        <div class="audit-flow-step">
                            <div class="audit-flow-node">${escapeHtml(step)}</div>
                            ${idx < steps.length - 1 ? '<div class="audit-flow-arrow">→</div>' : ''}
                        </div>
                    `).join('')}
                </div>
                ${coverage?.is_preliminary ? '<p class="muted ui-note-section">Сейчас доступна только структура отчёта — добавьте материалы для полного цикла.</p>' : ''}
            </div>
        </details>`;
}

let directConditionsViewCtx = null;

function getDirectConditionsView(campaignKey = '') {
    const cond = directConditionsViewCtx?.conditions;
    if (!cond) return null;
    if (!campaignKey) return cond;
    const blocks = cond.by_campaign || [];
    const idx = Number(campaignKey);
    const block = !Number.isNaN(idx) && blocks[idx] != null
        ? blocks[idx]
        : blocks.find((c) => String(c.campaign_id ?? '') === campaignKey
            || String(c.campaign_name || '') === campaignKey);
    if (!block) return { top_by_spend: [], high_spend_zero_leads: [], top_best_cpl: [], top_worst_cpl: [] };
    return {
        ...cond,
        top_by_spend: block.top_by_spend || [],
        high_spend_zero_leads: block.high_spend_zero_leads || [],
        top_best_cpl: block.top_best_cpl || [],
        top_worst_cpl: block.top_worst_cpl || [],
    };
}

function populateDirectConditionsCampaignSelect(selectId) {
    const sel = document.getElementById(selectId);
    if (!sel || sel.options.length > 1) return;
    const cond = directConditionsViewCtx?.conditions;
    (cond?.by_campaign || []).forEach((c, idx) => {
        const label = (c.campaign_name || 'Кампания').slice(0, 50);
        const opt = document.createElement('option');
        opt.value = String(idx);
        opt.textContent = label;
        sel.appendChild(opt);
    });
}

function renderDirectConditionsTables(campaignKey = '', wrapId = 'directConditionsTables') {
    const wrap = document.getElementById(wrapId);
    if (!wrap) return;
    const view = getDirectConditionsView(campaignKey);
    if (!view?.top_by_spend?.length) {
        wrap.innerHTML = '<p class="muted ui-empty-muted">Нет условий для выбранной кампании.</p>';
        return;
    }
    const condRow = (r) => `
        <tr>
            <td title="${escapeHtml(r.condition || '')}">${escapeHtml((r.condition || '—').slice(0, 48))}</td>
            <td title="${escapeHtml(r.campaign_name || '')}">${escapeHtml((r.campaign_name || '—').slice(0, 28))}</td>
            <td>${formatMoney(r.cost)}</td>
            <td>${formatNumber(r.leads)}</td>
            <td>${r.cpl != null ? formatMoney(r.cpl) : '—'}</td>
        </tr>`;
    const topSpendRows = (view.top_by_spend || []).slice(0, 10).map(condRow).join('');
    const wasteRows = (view.high_spend_zero_leads || []).slice(0, 8).map(condRow).join('');
    const monthly = directConditionsViewCtx?.monthly_tops || [];
    const monthlyHtml = monthly.length ? `
        <details class="direct-conditions-monthly">
            <summary>Топ условий по месяцам</summary>
            ${monthly.map((m) => `
                <div class="direct-month-block">
                    <div class="muted direct-month-label">${escapeHtml(m.month || '')}</div>
                    <table class="table table-compact table-compact-direct--sm">
                        <thead><tr><th>Условие</th><th>Кампания</th><th>Расход</th><th>Лиды</th><th>CPL</th></tr></thead>
                        <tbody>${(m.top_by_spend || []).map(condRow).join('')}</tbody>
                    </table>
                </div>`).join('')}
        </details>` : '';
    wrap.innerHTML = `
        <table class="table table-compact table-compact-direct">
            <thead><tr><th>Условие</th><th>Кампания</th><th>Расход</th><th>Лиды</th><th>CPL</th></tr></thead>
            <tbody>${topSpendRows}</tbody>
        </table>
        ${wasteRows ? `<p class="muted direct-waste-caption">Расход без лидов (≥500 ₽):</p>
        <table class="table table-compact table-compact-direct">
            <thead><tr><th>Условие</th><th>Кампания</th><th>Расход</th><th>Лиды</th><th>CPL</th></tr></thead>
            <tbody>${wasteRows}</tbody>
        </table>` : ''}
        ${monthlyHtml}`;
}

function updateDirectConditionsView() {
    const sel = document.getElementById('directConditionsCampaignFilter');
    renderDirectConditionsTables(sel?.value || '', 'directConditionsTables');
}

function updateDirectConditionsViewModal() {
    const sel = document.getElementById('directConditionsCampaignFilterModal');
    renderDirectConditionsTables(sel?.value || '', 'directConditionsTablesModal');
}

function openDirectConditionsModal() {
    openDirectConditionsModalHost(() => {
        populateDirectConditionsCampaignSelect('directConditionsCampaignFilterModal');
        renderDirectConditionsTables('', 'directConditionsTablesModal');
    });
}

window.updateDirectConditionsView = updateDirectConditionsView;
window.updateDirectConditionsViewModal = updateDirectConditionsViewModal;
window.openDirectConditionsModal = openDirectConditionsModal;

function renderDirectUploadHero() {
    return `
        <div class="card direct-analytics-card direct-upload-hero">
            <h3 class="direct-upload-hero__title">${DIRECT_COPY.uploadHeroTitle}</h3>
            <p class="muted direct-upload-hero__hint">${DIRECT_COPY.uploadHeroHint}</p>
            <div class="direct-upload-hero__actions">
                <button type="button" class="btn btn-primary" onclick="openModal('documentModal')">${DIRECT_COPY.uploadHeroBtn}</button>
            </div>
            <p class="muted direct-upload-hero__secondary">${DIRECT_COPY.uploadHeroSecondary}</p>
        </div>`;
}

function renderDirectAnalyticsPanel(data) {
    const panel = document.getElementById('directAnalyticsPanel');
    if (!panel) return;
    const da = data?.direct_analytics;
    const monthly = da?.monthly || [];
    if (!hasDirectExcelSlice(data)) {
        panel.innerHTML = renderDirectUploadHero();
        panel.style.display = 'block';
        const chartsHost = document.getElementById('directChartsPanel');
        if (chartsHost) {
            chartsHost.innerHTML = '';
            chartsHost.style.display = 'none';
        }
        renderAuditCommandBar(data);
        return;
    }
    panel.style.display = 'block';
    const campRows = (da.campaigns || []).slice(0, 8).map((c) => `
        <tr>
            <td>${escapeHtml((c.campaign_name || '').slice(0, 42))}</td>
            <td>${formatMoney(c.cost)}</td>
            <td>${formatNumber(c.leads)}</td>
            <td>${c.cpl != null ? formatMoney(c.cpl) : '—'}</td>
        </tr>`).join('');
    const insights = (da.insights || []).map((i) => (
        `<li><strong>${escapeHtml(i.title)}:</strong> ${escapeHtml(i.detail)}</li>`
    )).join('');
    const health = da.health || null;
    const links = health?.data_links || {};
    const semLink = links.semantics_conditions || {};
    const setupLink = links.direct_setup || {};
    const missingHints = [];
    if (semLink.status !== 'present' && semLink.hint) missingHints.push(semLink.hint);
    if (setupLink.status !== 'present' && setupLink.hint) missingHints.push(setupLink.hint);
    const dataLinksHtml = missingHints.length
        ? `<p class="muted direct-health-missing-hints">${missingHints.map((h) => escapeHtml(h)).join(' · ')}</p>`
        : '';
    const healthExplain = health?.summary_explain
        ? `<details class="direct-health-explain-collapsible">
                <summary>Почему такая оценка</summary>
                <p>${escapeHtml(health.summary_explain)}</p>
           </details>`
        : '';
    const zoneRows = renderDirectHealthZoneRows(health?.score_breakdown?.zone_breakdown || []);
    const checksTriggered = health?.checks_triggered_count
        ?? (health?.rules_triggered_ids || []).length;
    const risksForReport = health?.risks_for_report_count
        ?? buildDirectRiskCatalogFromHealth(health).length;
    const healthBlock = health ? `
        <div id="direct-slice-health" class="direct-health-block">
            <div class="direct-health-head">
                <div>
                    <h4>${DIRECT_COPY.healthScoreTitle}</h4>
                    <p class="muted">${DIRECT_COPY.healthCabinetHint()}</p>
                </div>
                <div class="direct-health-score-box">
                    <div class="direct-health-score-value">${formatNumber(health.health_score || 0)}</div>
                    <div class="muted">Оценка ${escapeHtml(health.grade || '—')}</div>
                </div>
            </div>
            <div class="direct-health-kpis">
                <span class="badge badge-draft">Месяцев в срезе: ${formatNumber(monthly.length)}</span>
                <span class="badge badge-draft" title="Все сработавшие правила Excel, включая покрытие данных">Автопроверок: ${formatNumber(checksTriggered)}</span>
                <span class="badge badge-draft" title="Критичные риски в списке «Риски Директа» и для AI">Важных рисков: ${formatNumber(risksForReport)}</span>
            </div>
            <p class="muted direct-health-counts-hint">Автопроверки влияют на балл; в списке ниже — только важные риски для отчёта и AI.</p>
            ${dataLinksHtml}
            ${healthExplain}
            ${zoneRows ? `<div class="direct-health-zones-wrap">${zoneRows}</div>` : ''}
        </div>` : '';
    const cond = da.conditions || {};
    directConditionsViewCtx = {
        conditions: cond,
        monthly_tops: cond.monthly_tops || [],
    };
    const condPreviewRows = (cond.top_by_spend || []).slice(0, 5).map((r) => `
        <tr>
            <td title="${escapeHtml(r.condition || '')}">${escapeHtml((r.condition || '—').slice(0, 40))}</td>
            <td>${formatMoney(r.cost)}</td>
            <td>${formatNumber(r.leads)}</td>
            <td>${r.cpl != null ? formatMoney(r.cpl) : '—'}</td>
        </tr>`).join('');
    const conditionsBlock = (cond.top_by_spend || []).length ? `
            <p class="muted direct-conditions-meta">
                Уникальных условий: ${formatNumber(cond.unique_conditions || 0)} · CPL от ${cond.limits?.min_leads_for_cpl_rank || 3} лидов
            </p>
            <table class="table table-compact table-compact-direct--sm">
                <thead><tr><th>Условие</th><th>Расход</th><th>Лиды</th><th>CPL</th></tr></thead>
                <tbody>${condPreviewRows}</tbody>
            </table>
            <button type="button" class="btn btn-outline btn-sm btn-mt-xs" onclick="openDirectConditionsModal()">Все условия (${formatNumber(cond.unique_conditions || 0)})</button>
            <div id="directConditionsTables" class="visually-hidden" aria-hidden="true"></div>` : '';
    const docId = da.material_id;
    const importBtn = docId
        ? `<button type="button" class="btn btn-outline btn-sm" onclick="openDocumentMaterialById(${docId})" title="${escapeHtml(DIRECT_COPY.openExcelBtnTitle)}">${escapeHtml(DIRECT_COPY.openExcelBtn)}</button>`
        : '';
    const totals = da.totals || {};
    const totalsLine = (!monthly.length && totals.cost)
        ? `<p class="direct-totals-line muted">За период: расход ${formatMoney(totals.cost)}, клики ${formatNumber(totals.clicks)}, лиды ${formatNumber(totals.leads || totals.conversions)}</p>`
        : '';
    const campaignsBlock = campRows
        ? wrapDirectCollapsible(
            'Кампании (топ-8)',
            `<table class="table table-compact table-compact-direct">
                <thead><tr><th>Кампания</th><th>Расход</th><th>Лиды</th><th>CPL</th></tr></thead>
                <tbody>${campRows}</tbody>
            </table>`,
            { id: 'direct-slice-campaigns' },
        )
        : '';
    const conditionsCollapsible = conditionsBlock
        ? wrapDirectCollapsible('Условия показа (превью)', conditionsBlock, { id: 'direct-slice-conditions' })
        : '';
    const insightsBlock = insights
        ? wrapDirectCollapsible('Инсайты Excel', `<ul class="muted direct-insights-list">${insights}</ul>`)
        : '';

    const periodLine = (() => {
        if (da.period) return escapeHtml(da.period);
        if (monthly.length >= 2) {
            const a = monthly[0]?.month;
            const b = monthly[monthly.length - 1]?.month;
            if (a && b) return escapeHtml(`${a} — ${b}`);
        }
        if (monthly.length === 1 && monthly[0]?.month) {
            return escapeHtml(monthly[0].month);
        }
        return '—';
    })();
    const score = health?.health_score ?? health?.score;
    const grade = health?.grade || '—';
    const totalCost = da.totals?.cost ?? monthly.reduce((s, m) => s + (m.cost || 0), 0);
    const totalLeads = da.totals?.leads ?? da.totals?.conversions
        ?? monthly.reduce((s, m) => s + (m.leads || 0), 0);
    const totalCpl = totalLeads > 0 && totalCost ? totalCost / totalLeads : null;
    const growth = buildKpiGrowthSublines(monthly);
    const healthDetails = health
        ? `<details class="direct-section-details">
            <summary>Оценка кабинета · ${formatNumber(score || 0)}/100 (${escapeHtml(grade)})</summary>
            ${healthBlock}
            <details class="direct-health-rules-ref">
                <summary>Справочник автопроверок</summary>
                ${renderDirectHealthInfoPanel(health)}
            </details>
        </details>`
        : '';
    panel.innerHTML = `
        <div class="card direct-analytics-card direct-analytics-card--loaded">
            <div class="direct-kpi-strip">
                <div class="direct-kpi-strip__period">
                    <span class="direct-kpi-label">Период</span>
                    <strong>${periodLine}</strong>
                    ${growth.periodNote || ''}
                </div>
                <div class="direct-kpi-strip__metric">
                    <span class="direct-kpi-label">Расход</span>
                    <strong>${formatMoney(totalCost)}</strong>
                    ${growth.cost}
                </div>
                <div class="direct-kpi-strip__metric">
                    <span class="direct-kpi-label">Заявки</span>
                    <strong>${formatNumber(totalLeads)}</strong>
                    ${growth.leads}
                </div>
                <div class="direct-kpi-strip__metric">
                    <span class="direct-kpi-label">CPL</span>
                    <strong>${totalCpl != null ? formatMoney(totalCpl) : '—'}</strong>
                    ${growth.cpl}
                </div>
            </div>
            <div id="directDynamicsHost" class="direct-dynamics-host"></div>
            <div id="directChartsPanel" class="direct-charts-panel"></div>
            ${importBtn ? `<div class="direct-primary-actions">${importBtn}</div>` : ''}
            ${renderDirectStepsCard(data)}
            <p class="muted direct-supplements-hint">Скриншоты и заметки — вкладка «Источники». Перед анализом отметьте, что отправить в AI.</p>
            ${healthDetails}
            ${renderDirectRisksOnDirectPage(data)}
            ${campaignsBlock}
            ${conditionsCollapsible}
            ${insightsBlock}
        </div>`;
    mountDirectDynamicsBlock(document.getElementById('directDynamicsHost'), monthly);
    renderCharts(da.charts || [], data.data_coverage, 'directChartsPanel');
    if (conditionsBlock) {
        renderDirectConditionsTables('');
    }
}

function metricStatusFromCoverage(coverage, fieldId, fallback) {
    const item = (coverage?.checklist || []).find(c => c.id === fieldId);
    if (!item || item.status === 'present') return fallback;
    const labels = {
        period: 'Не указан период',
        budget: 'Не указан бюджет',
        clicks: 'Не указаны клики',
        leads: 'Не указаны заявки',
        sales: 'Нет продаж',
        revenue: 'Нет выручки',
    };
    return labels[fieldId] || item.status_label || 'Не указано';
}

function hideEmptyReportMetricRows() {
    const table = document.getElementById('reportMetricsTable');
    if (!table) return;
    const emptyTokens = new Set(['', '—', 'не рассчитано', 'нет продаж', 'нет выручки', 'не указано']);
    table.querySelectorAll('tr').forEach((row) => {
        const valueCell = row.querySelector('td:last-child');
        if (!valueCell) return;
        const value = String(valueCell.textContent || '').trim().toLowerCase();
        row.style.display = emptyTokens.has(value) ? 'none' : '';
    });
}

function humanizeMetricsReviewReason(reason) {
    const text = String(reason || '').trim();
    if (!text) return 'Требуется проверка';
    if (/romi/i.test(text) && /(слишком высокий|аномал)/i.test(text)) {
        const match = text.match(/(\d+[.,]?\d*)%/);
        const romiValue = match ? match[1].replace('.', ',') : null;
        return `ROMI выглядит аномально высоким${romiValue ? `: ${romiValue}%` : ''}. Проверьте, корректно ли указаны бюджет и выручка. Возможно, выручка введена за больший период, чем рекламный бюджет, или в бюджет попали не все расходы. Не блокирует запуск, но будет отмечено в отчёте.`;
    }
    return text;
}

function renderSummary(summary, metrics, coverage) {
    const preliminary = coverage?.is_preliminary;
    const problemEl = document.getElementById('summaryProblem');
    const riskEl = document.getElementById('summaryRisk');
    const conclusionEl = document.getElementById('summaryConclusion');
    const priorityTextEl = document.getElementById('summaryPriorityText');
    if (summary) {
        problemEl.textContent = summary.client_problem || 'Существенных рисков по текущим данным не выделено.';
        riskEl.textContent = summary.main_risk || 'Существенные последствия не выделены.';
        const priorityEl = document.getElementById('summaryPriority');
        if (preliminary) {
            if (priorityTextEl) priorityTextEl.textContent = 'Появится после AI-анализа';
            if (priorityEl) {
                priorityEl.textContent = '—';
                priorityEl.className = 'badge badge-draft';
                priorityEl.style.display = 'none';
            }
        } else {
            const label = reportPriorityLabel(summary.priority || 'medium');
            if (priorityTextEl) priorityTextEl.textContent = label;
            if (priorityEl) {
                priorityEl.style.display = 'none';
                priorityEl.textContent = severityLabel(summary.priority || 'low');
                priorityEl.className = `badge badge-${summary.priority || 'low'}`;
            }
        }
        conclusionEl.textContent = summary.short_conclusion || 'Откройте отчёт и выполните рекомендации по приоритету.';
        renderReportExecutiveHero(summary, auditData);
    } else if (hasGuidedCompletedAnalysis(auditData)) {
        const staleHint = isAnalysisStale(auditData)
            ? ' Обновите страницу (Ctrl+F5) или перезапустите AI-анализ — материалы изменились после последнего run.'
            : ' Обновите страницу (Ctrl+F5) или перезапустите AI-анализ.';
        problemEl.textContent = `Краткий вывод AI не загружен.${staleHint}`;
        riskEl.textContent = '—';
        conclusionEl.textContent = '—';
        if (priorityTextEl) priorityTextEl.textContent = '—';
        const priorityEl = document.getElementById('summaryPriority');
        if (priorityEl) {
            priorityEl.textContent = '—';
            priorityEl.className = 'badge badge-draft';
            priorityEl.style.display = 'none';
        }
        renderReportExecutiveHero(null, auditData);
    }

    const btnMetrics = document.getElementById('btnAddMetricsFromReport');
    if (btnMetrics) btnMetrics.style.display = 'inline-block';

    if (metrics || coverage) {
        document.getElementById('metricPeriod').textContent = metrics?.period || metricStatusFromCoverage(coverage, 'period', '—');
        document.getElementById('metricBudgetDisplay').textContent = metrics?.budget != null ? formatMoney(metrics.budget) : metricStatusFromCoverage(coverage, 'budget', 'Не указан бюджет');
        document.getElementById('metricClicks').textContent = metrics?.clicks != null ? formatNumber(metrics.clicks) : metricStatusFromCoverage(coverage, 'clicks', 'Не указаны клики');
        document.getElementById('metricLeads').textContent = metrics?.leads != null ? formatNumber(metrics.leads) : metricStatusFromCoverage(coverage, 'leads', 'Не указаны заявки');
        document.getElementById('metricSales').textContent = metrics?.sales != null ? formatNumber(metrics.sales) : metricStatusFromCoverage(coverage, 'sales', 'Нет продаж');
        document.getElementById('metricRevenue').textContent = metrics?.revenue != null ? formatMoney(metrics.revenue) : metricStatusFromCoverage(coverage, 'revenue', 'Нет выручки');

        const canCpl = metrics?.budget != null && metrics?.leads != null;
        const canCpa = metrics?.budget != null && metrics?.sales != null;
        const canRomi = metrics?.budget != null && metrics?.revenue != null;
        document.getElementById('metricCPL').textContent = canCpl ? formatDerivedMetric(metrics, 'cpl') : 'Не рассчитано';
        document.getElementById('metricCPA').textContent = canCpa ? formatDerivedMetric(metrics, 'cpa') : 'Не рассчитано';
        document.getElementById('metricROMI').textContent = canRomi ? formatDerivedMetric(metrics, 'romi') : 'Не рассчитано';
        const gpEl = document.getElementById('metricGrossProfit');
        if (gpEl) {
            gpEl.textContent = metrics?.gross_profit != null ? formatMoney(metrics.gross_profit) : '—';
        }
        const marginEl = document.getElementById('metricMargin');
        if (marginEl) {
            marginEl.textContent = metrics?.margin_percent != null ? `${metrics.margin_percent}%` : '—';
        }
        const drrEl = document.getElementById('metricDRR');
        if (drrEl) {
            drrEl.textContent = metrics?.drr != null ? `${metrics.drr}%` : (canRomi ? 'Не рассчитано' : '—');
        }
        hideEmptyReportMetricRows();

        const reviewBlock = document.getElementById('metricsReviewBlock');
        if (metrics?.needs_review && !preliminary) {
            reviewBlock.style.display = 'block';
            document.getElementById('metricsReviewReason').textContent = humanizeMetricsReviewReason(metrics.review_reason);
        } else if (preliminary && coverage?.missing_items?.length) {
            reviewBlock.style.display = 'block';
            document.getElementById('metricsReviewReason').textContent = coverage.missing_items.slice(0, 5).map(i => i.reason || i.label).join('; ');
        } else {
            reviewBlock.style.display = 'none';
        }
    }

    renderReportActivePeriodNote(auditData, metrics);
    renderReportAnalysisMeta(auditData);
    renderReportStaleDetails(auditData);
    renderMetricsKpiSource(auditData);
    renderMetricsReportExplain(auditData);
    renderReportIllustrationsGuide(auditData);
    renderReportConfirmedPreview(auditData);
    renderReportAppendix(auditData);
    updateExtractMetricsButtonVisibility(auditData);
}

function renderMetricsReportExplain(data) {
    const box = document.getElementById('metricsReportExplain');
    const asOf = document.getElementById('metricsReportAsOf');
    if (!box) return;
    const fresh = data?.analysis_freshness;
    if (asOf) {
        if (fresh?.last_analysis_at && hasGuidedCompletedAnalysis(data)) {
            asOf.style.display = 'block';
            let line = `Отчёт по данным на ${formatDate(fresh.last_analysis_at)}.`;
            if (fresh.analysis_stale) {
                line += ' Материалы изменились — перезапустите AI-анализ, чтобы обновить выводы AI (таблица KPI уже актуальна).';
            }
            asOf.textContent = line;
        } else {
            asOf.style.display = 'none';
            asOf.textContent = '';
        }
    }
    if (!needsMetricsReportExplain(data)) {
        box.style.display = 'none';
        box.innerHTML = '';
        return;
    }
    const summary = data?.metrics_summary || {};
    const hasTableKpi = summary.budget != null || summary.clicks != null || summary.leads != null;
    const provLine = data?.metrics_kpi_provenance?.summary_line;
    box.style.display = 'block';
    box.innerHTML = hasTableKpi
        ? `<p><strong>В таблице уже есть KPI${provLine ? ` (${escapeHtml(provLine.replace(/^KPI:\\s*/, ''))})` : ''}.</strong></p>
        <p class="muted">Для чеклиста и стабильного анализа укажите период KPI (форма «Метрики») или перенесите цифры из заметки.</p>
        <div class="metrics-report-explain-actions">
            <button type="button" class="btn btn-primary btn-sm" onclick="openMetricsEditorAddPeriod()">Добавить период</button>
            <button type="button" class="btn btn-outline btn-sm" onclick="extractMetricsFromNotesWithConfirm()">Перенести KPI из заметок</button>
        </div>`
        : `<p><strong>Метрики для отчёта не заполнены.</strong></p>
        <p class="muted">Добавьте период, бюджет, клики и заявки в форму или в заметку с KPI.</p>
        <div class="metrics-report-explain-actions">
            <button type="button" class="btn btn-primary btn-sm" onclick="openMetricsEditorAddPeriod()">Добавить период</button>
            <button type="button" class="btn btn-outline btn-sm" onclick="extractMetricsFromNotesWithConfirm()">Перенести KPI из заметок</button>
        </div>`;
}

function renderReportPreliminarySections(coverage) {
    const banner = document.getElementById('reportPreliminaryBanner');
    const cannot = document.getElementById('reportCannotEvaluate');
    const zones = document.getElementById('zoneScoresContainer');
    if (!coverage) return;

    if (isPreliminaryAudit()) {
        const hasMinimumData = hasGuidedRequiredMetrics(auditData) && hasGuidedEvidenceSource(auditData);
        const hasCoreMetrics = Boolean(auditData?.metrics_summary?.budget != null && auditData?.metrics_summary?.clicks != null && auditData?.metrics_summary?.leads != null);
        const missingLabels = (coverage?.missing_items || []).slice(0, 6).map((i) => i.label).filter(Boolean);
        if (banner) {
            banner.style.display = 'block';
            banner.innerHTML = `
                <div class="preliminary-banner">
                    <strong>${hasCoreMetrics ? 'Предварительный отчёт по базовым данным' : 'Предпросмотр отчёта до AI-анализа'}</strong>
                    <p>${hasCoreMetrics
                        ? `Метрики загружены. Для полноценного аудита не хватает: ${missingLabels.join(', ') || 'дополнительных источников'}.`
                        : (hasMinimumData ? 'Базовые данные загружены, но финальный отчёт появится после запуска AI-анализа.' : 'Добавьте период, бюджет, клики и заявки, чтобы сформировать базовый отчёт.')}</p>
                </div>`;
        }
        if (cannot) {
            const cannotList = coverage.cannot_evaluate || [];
            const coreMetrics = ['CPL', 'CPA', 'ROMI'];
            const hasDerived = {
                CPL: auditData?.metrics_summary?.cpl != null,
                CPA: auditData?.metrics_summary?.cpa != null,
                ROMI: auditData?.metrics_summary?.romi != null,
            };
            const canCalculated = coreMetrics.filter((m) => hasDerived[m]);
            const cannotQualityCheck = cannotList.filter((x) => !coreMetrics.includes(String(x || '').trim().toUpperCase()));
            cannot.style.display = 'block';
            cannot.innerHTML = `
                <div class="card">
                    <div class="card-header"><h3>Ограничения по качеству оценки</h3></div>
                    <div class="card-body">
                        ${canCalculated.length ? `<p><strong>Можно посчитать по метрикам:</strong> ${canCalculated.join(', ')}</p>` : ''}
                        <p><strong>Нельзя подтвердить корректность показателей без:</strong></p>
                        <ul class="cannot-evaluate-list">${cannotQualityCheck.map(x => `<li>${escapeHtml(x)}</li>`).join('') || '<li>дополнительных источников качества данных</li>'}</ul>
                    </div>
                </div>`;
        }
    } else {
        if (banner) { banner.style.display = 'none'; banner.innerHTML = ''; }
        if (cannot) { cannot.style.display = 'none'; cannot.innerHTML = ''; }
        const limitations = coverage.accepted_limitations || [];
        if (banner && limitations.length) {
            banner.style.display = 'block';
            banner.innerHTML = `
                <div class="preliminary-banner limitation-banner">
                    <strong>Ограничения отчёта</strong>
                    <p class="muted">Следующие данные не предоставлены и учтены как ограничение анализа:</p>
                    <ul class="empty-checklist">${limitations.map(i => `<li>${escapeHtml(i.label)}${i.reason ? ` — ${escapeHtml(i.reason)}` : ''}</li>`).join('')}</ul>
                </div>`;
        }
    }

    if (zones) {
        if (!isAdminUser()) {
            zones.innerHTML = '';
            zones.style.display = 'none';
            return;
        }
        zones.style.display = 'block';
        const rows = coverage.zone_scores || [];
        if (coverage.is_preliminary) {
            zones.innerHTML = `
                <div class="card">
                    <div class="card-header"><h3>Оценка по зонам</h3></div>
                    <div class="card-body">
                        <p class="muted">Оценка зон аудита по шкале 0–100 на основании загруженных материалов.</p>
                        <table class="zone-coverage-table">
                            <thead><tr><th>Зона</th><th>Статус</th><th>Причина</th></tr></thead>
                            <tbody>${rows.map(r => `<tr><td>${escapeHtml(r.zone)}</td><td>${escapeHtml(r.status)}</td><td>${escapeHtml(r.reason)}</td></tr>`).join('')}</tbody>
                        </table>
                    </div>
                </div>`;
        } else {
            zones.innerHTML = '';
        }
    }
}

function formatDerivedMetric(metrics, key) {
    const display = metrics[`${key}_display`];
    if (display && display !== 'Не рассчитано') {
        if (key === 'romi') return typeof display === 'string' ? display : `${display}%`;
        return formatMoney(metrics[key]);
    }
    if (metrics[key] != null && metrics[key] !== undefined) {
        return key === 'romi' ? `${metrics[key]}%` : formatMoney(metrics[key]);
    }
    return 'Не рассчитано';
}

/** Список «чего не хватает» на вкладке «Данные» не показываем — только шаги 1–2–3 и command bar. */
function renderDataIssues(_issues) {
    const tabBtn = document.getElementById('tabDataBtn');
    if (tabBtn) {
        tabBtn.textContent = 'Данные';
        tabBtn.classList.remove('tab-has-issues');
        tabBtn.title = '';
    }
}

function renderResultsIssues(issues) {
    const container = document.getElementById('resultsIssuesList');
    if (!container) return;
    if (usesPostAnalysisHero(getCurrentScreenState())) {
        container.innerHTML = '';
        container.style.display = 'none';
        return;
    }
    const visible = (issues || []).filter(i => !i.resolved && i.visible_after_analysis);
    if (!visible.length) {
        container.innerHTML = '';
        container.style.display = 'none';
        return;
    }
    const progress = getFindingReviewProgress(auditData || { findings: [] });
    const findingIssues = visible.filter((i) => i.issue_type === 'finding_review');
    const pending = progress.pending;
    if (pending <= 0 && findingIssues.length === 0) {
        container.innerHTML = '';
        container.style.display = 'none';
        return;
    }
    const progressLine = progress.total > 0
        ? `${formatReviewProgressLine(progress)}. ${formatReviewRemainingLine(progress)}. `
        : '';
    container.style.display = 'block';
    container.innerHTML = `
        <div class="card results-review-banner">
            <div class="card-body">
                <h3 class="panel-title-flush">Проверка после анализа</h3>
                <p class="data-checklist-summary muted">${escapeHtml(progressLine)}${pending > 0 ? escapeHtml(pluralizeFindingsReview(pending)) + '. ' : ''}Подтверждение влияет на финальный отчёт.</p>
                <button type="button" class="btn btn-primary btn-sm" onclick="scrollToPendingFindings()">К списку выводов</button>
            </div>
        </div>
    `;
}

function phaseLabel(phase) {
    return {
        collect: 'Сбор данных',
        verify: 'Проверка',
        analyze: 'AI-анализ',
        failed: 'Ошибка',
        report: 'Отчёт',
    }[phase] || phase;
}

function applyWorkflowTabs(tabs, data) {
    const map = {
        data: 'tabDataBtn',
        results: 'tabResultsBtn',
        report: 'tabReportBtn',
        chat: 'tabChatBtn',
    };
    const config = tabs || {};
    let defaultTab = null;

    Object.entries(map).forEach(([key, btnId]) => {
        const tab = config[key] || {};
        const btn = document.getElementById(btnId);
        const panel = document.getElementById(`tab-${key}`);
        if (btn) {
            const hidden = tab.visible === false;
            btn.style.display = hidden ? 'none' : '';
            btn.disabled = tab.enabled === false;
            btn.classList.toggle('tab-disabled', tab.enabled === false);
        }
        if (panel) {
            if (tab.visible === false) {
                panel.classList.remove('active');
                panel.setAttribute('hidden', '');
            } else {
                panel.removeAttribute('hidden');
            }
        }
        if (tab.default) defaultTab = key;
    });

    const active = getActiveWorkflowTab();
    const activeConfig = config[active] || {};
    if (activeConfig.visible === false || activeConfig.enabled === false) {
        switchTab(defaultTab || 'data');
    }

    const resultsBtn = document.getElementById('tabResultsBtn');
    const reportBtn = document.getElementById('tabReportBtn');
    const showResults = data?.workflow_state?.show_ai_report_sections;
    const hasMonthly = (data?.direct_analytics?.monthly || []).length > 0;
    if (resultsBtn) {
        resultsBtn.textContent = 'Выводы';
        resultsBtn.title = showResults
            ? 'Проверка AI-выводов перед PDF'
            : 'Появится после запуска AI-анализа';
    }
    if (reportBtn) {
        if (showResults) {
            reportBtn.textContent = 'Отчёт';
            reportBtn.title = 'Итоговый отчёт, графики и экспорт PDF';
        } else if (hasMonthly) {
            reportBtn.textContent = 'Динамика';
            reportBtn.title = DIRECT_COPY.chartsNote;
        } else {
            reportBtn.textContent = 'Отчёт';
            reportBtn.title = 'Появится после загрузки среза Директа или AI-анализа';
        }
    }
}

function resolveDataIssue(itemId, issue = null) {
    if (issue) return issue;
    return (auditData?.data_issues || []).find((row) => String(row.id) === String(itemId)) || null;
}

function resolveMetricsFocusField(issueOrItemId) {
    const text = typeof issueOrItemId === 'string'
        ? issueOrItemId
        : `${issueOrItemId?.id || ''} ${issueOrItemId?.label || ''} ${issueOrItemId?.reason || ''}`;
    const normalized = String(text || '').toLowerCase();
    if (/(^|\W)period(\W|$)|период/.test(normalized)) return 'metricPeriodStartDisplay';
    if (/(^|\W)budget(\W|$)|бюджет|расход/.test(normalized)) return 'metricBudgetInput';
    if (/(^|\W)clicks(\W|$)|клик/.test(normalized)) return 'metricClicksInput';
    if (/(^|\W)leads(\W|$)|заявк/.test(normalized)) return 'metricLeadsInput';
    if (/(^|\W)sales(\W|$)|продаж|cpa/.test(normalized)) return 'metricSalesInput';
    if (/(^|\W)revenue(\W|$)|выруч|romi/.test(normalized)) return 'metricRevenueInput';
    return null;
}

function setMetricsModalFocus(issueOrItemId = null) {
    pendingMetricsFocusFieldId = resolveMetricsFocusField(issueOrItemId) || 'metricPeriodStartDisplay';
}

function focusMetricsModalField() {
    const fieldId = pendingMetricsFocusFieldId;
    pendingMetricsFocusFieldId = null;
    if (!fieldId) return;
    const el = document.getElementById(fieldId);
    if (!el) return;
    setTimeout(() => {
        el.focus();
        if (typeof el.select === 'function') el.select();
        el.classList.remove('field-focus-hint');
        void el.offsetWidth;
        el.classList.add('field-focus-hint');
        setTimeout(() => el.classList.remove('field-focus-hint'), 1100);
    }, 0);
}

function prefillScreenshotByIssue(itemId) {
    if (itemId !== 'campaign_screenshots') return;
    const titleEl = document.getElementById('screenshotTitle');
    if (titleEl && !titleEl.value) {
        titleEl.value = 'Скриншоты кампаний';
    }
}

function prefillTextNoteByIssue(itemId) {
    const noteTemplates = {
        offer: {
            title: 'Комментарий по офферу',
            content: 'Текущий оффер:\n\nЧто мешает конверсии:\n\nПредлагаемая формулировка:\n',
        },
        weak_points: {
            title: 'Комментарий по слабым местам',
            content: 'Слабое место:\n\nКак влияет на лиды/продажи:\n\nЧто исправить в первую очередь:\n',
        },
        lead_quality: {
            title: 'Комментарий по качеству лидов',
            content: 'Примеры целевых лидов:\n\nПримеры нецелевых лидов:\n\nПричины брака:\n',
        },
    };
    const template = noteTemplates[itemId] || null;
    if (!template) return;
    const titleEl = document.getElementById('textNoteTitle');
    const contentEl = document.getElementById('textNoteContent');
    if (titleEl && !titleEl.value) titleEl.value = template.title;
    if (contentEl && !contentEl.value) contentEl.value = template.content;
}

function openDataItemAction(itemId, issue = null) {
    if (!requireWriteAccess('Добавление данных')) return;
    const resolvedIssue = resolveDataIssue(itemId, issue);

    if (resolvedIssue?.ref_type === 'material' && Number.isFinite(Number(resolvedIssue.ref_id))) {
        const metricIssue = `${resolvedIssue?.id || ''} ${resolvedIssue?.label || ''} ${resolvedIssue?.reason || ''}`;
        if (/(метрик|бюджет|клик|заявк|продаж|выруч|cpa|cpl|romi)/i.test(metricIssue)) {
            setMetricsModalFocus(resolvedIssue);
        }
        editMaterial(Number(resolvedIssue.ref_id));
        return;
    }
    if (resolvedIssue?.ref_type === 'finding' && Number.isFinite(Number(resolvedIssue.ref_id))) {
        switchTab('results');
        openFindingEditModal(Number(resolvedIssue.ref_id));
        return;
    }

    const metricIds = ['period', 'budget', 'clicks', 'leads', 'sales', 'revenue', 'metrics_minimum', 'monthly_dynamics'];
    if (metricIds.includes(String(itemId))) {
        switchTab('data');
        switchDataSubtab('direct');
        return;
    }
    if (itemId === 'campaign_screenshots') {
        openNewMaterial('screenshotModal');
        prefillScreenshotByIssue(itemId);
        return;
    }
    if (itemId === 'landing') {
        setDocumentIssueContext(itemId);
        openModal('documentModal');
        return;
    }
    if (['search_queries', 'metrika', 'crm', 'crm_statuses', 'lead_quality', 'metrika_crm'].includes(itemId)) {
        setDocumentIssueContext(itemId === 'crm_statuses' ? 'crm' : itemId);
        openModal('documentModal');
        return;
    }
    if (resolvedIssue?.issue_type === 'missing_data' && resolvedIssue?.source === 'coverage') {
        setDocumentIssueContext(itemId);
        openModal('documentModal');
        return;
    }
    setDocumentIssueContext(null);
    openNewMaterial('textNoteModal');
    prefillTextNoteByIssue(itemId);
}

async function acceptDataLimitation(itemId) {
    if (!requireWriteAccess('Изменение ограничений')) return;
    if (!currentAuditId) return;
    const issue = (auditData?.data_issues || []).find(i => i.id === itemId);
    const label = issue?.label || itemId;
    const accepted = await showConfirmDialog({
        title: 'Запустить без этих данных',
        message: `Не добавлять «${label}» и продолжить запуск?\n\nАнализ и отчёт будут сформированы без этого источника.`,
        confirmText: 'Запустить без данных',
        confirmType: 'primary',
    });
    if (!accepted) {
        return;
    }
    try {
        await apiRequest(`/api/audits/${currentAuditId}/accept-limitation`, {
            method: 'POST',
            body: JSON.stringify({ item_id: itemId }),
        });
        loadAuditDetail();
        showAlert('Ограничение сохранено. Пункт убран из активного чеклиста.', 'success');
    } catch (error) {
        showAlert('Ошибка: ' + error.message, 'danger');
    }
}

function buildDedupedCampaignRecs(findings) {
    const seen = new Set();
    const items = [];
    for (const f of findings || []) {
        if (f.finding_kind === 'needs_data' || !f.recommendation) continue;
        if (f.status === 'human_rejected') continue;
        if (!['human_confirmed', 'human_edited'].includes(f.status || '')) continue;
        const text = sanitizeClientReportText(f.recommendation);
        if (!text || hasInternalReportLeak(text)) continue;
        const key = text.toLowerCase().replace(/\s+/g, ' ').slice(0, 140);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        items.push({
            id: f.id,
            text,
            area: areaDisplayLabel(f.area) || '',
        });
    }
    return items;
}

function renderRecommendations(findings, offer, coverage) {
    const container = document.getElementById('recommendationsList');
    if (!container) return;

    if (auditData?.workflow_state?.analysis_failed) {
        container.innerHTML = `
            <div class="empty-state-card">
                <h3>AI-анализ не завершён</h3>
                <p class="muted">Рекомендации по оптимизации появятся после успешного AI-анализа.</p>
            </div>`;
        const offerBox = document.getElementById('offerContainer');
        if (offerBox) offerBox.innerHTML = '';
        return;
    }

    if (isPreliminaryAudit()) {
        container.innerHTML = `
            <div class="card rec-card rec-card-data">
                <h4>1. Что добавить для точности аудита</h4>
                <p class="muted"><strong>Сначала собрать данные.</strong> Нужно для подтверждения выводов.</p>
                <p>${escapeHtml(coverage?.data_collection_recommendation || workflowUi().next_action_hint || 'Добавьте исходные данные для аудита.')}</p>
                <ul class="empty-checklist">${(coverage.missing_items || []).slice(0, 8).map(i => `<li>${escapeHtml(i.label)}</li>`).join('')}</ul>
            </div>
            <p class="muted ui-note-section">Рекомендации по рекламным кампаниям появятся после добавления и проверки данных.</p>`;
        return;
    }

    const progress = getFindingReviewProgress(auditData || { findings });
    const pendingReview = progress.pending > 0;
    if (pendingReview > 0 && hasGuidedCompletedAnalysis(auditData)) {
        const imp = getPostAnalysisDataImprovements(auditData);
        container.innerHTML = imp.length
            ? '<p class="muted recommendations-deferred">Сначала проверьте выводы в карточках выше. Улучшения данных — на вкладке «Данные».</p>'
            : '<p class="muted recommendations-deferred">Действия по каждому выводу — в карточках выше. Сводка по кампаниям появится после проверки.</p>';
        return;
    }

    const dataRecs = findings.filter(f => f.finding_kind === 'needs_data' && f.recommendation).map(f => f.recommendation);
    if (getCurrentScreenState() === 'RESULTS_NEED_REVIEW' && pendingReview && dataRecs.length && !findings.some((f) => f.finding_kind !== 'needs_data' && f.recommendation)) {
        container.innerHTML = '';
        return;
    }
    const optItems = buildDedupedCampaignRecs(findings);

    if (!dataRecs.length && !optItems.length && !offer) {
        if (hasGuidedCompletedAnalysis(auditData)) {
            const improvements = getPostAnalysisDataImprovements(auditData);
            const progress = getFindingReviewProgress(auditData);
            if (improvements.length && progress.pending === 0) {
                container.innerHTML = '<p class="muted">Улучшения данных перечислены выше. Чеклист — на вкладке «Данные».</p>';
                return;
            }
            if (improvements.length) {
                const labels = improvements.slice(0, 5).map((i) => escapeHtml(i.label || i.id)).filter(Boolean);
                container.innerHTML = `
                    <div class="empty-state-card">
                        <h3>Рекомендации по кампаниям</h3>
                        <p class="muted">Сначала завершите проверку выводов. Затем можно улучшить данные:</p>
                        <ul class="empty-checklist">${labels.map((l) => `<li>${l}</li>`).join('')}</ul>
                        <button type="button" class="btn btn-outline btn-sm" onclick="goToDataImprovements()">Перейти к данным</button>
                    </div>`;
                return;
            }
            container.innerHTML = '<p class="ui-empty-muted">Рекомендации по кампаниям появятся после подтверждения выводов с действиями.</p>';
            return;
        }
        container.innerHTML = '<p class="ui-empty-muted">Рекомендации появятся после AI-анализа.</p>';
        return;
    }

    let html = '';
    if (dataRecs.length) {
        html += `<div class="card rec-card rec-card-data"><h4>1. Что добавить для точности аудита</h4><p class="muted"><strong>Сначала собрать данные.</strong> Нужно для подтверждения выводов.</p>${dataRecs.map(t => `<p>${escapeHtml(t)}</p>`).join('')}</div>`;
    }
    if (optItems.length) {
        html += `<div id="campaignRecommendationsBlock" class="rec-card rec-card-ads">
            <h4 class="rec-card-title">Действия по кампаниям</h4>
            <p class="muted rec-card-lead">Уникальные шаги из подтверждённых выводов.</p>
            <ol class="rec-summary-list">${optItems.map((it, idx) => `
                <li class="rec-summary-item">
                    <div class="rec-summary-item-head">
                        <span class="rec-summary-idx">${idx + 1}</span>
                        ${it.area ? `<span class="rec-summary-area">${escapeHtml(it.area)}</span>` : ''}
                        <button type="button" class="btn btn-link btn-sm" onclick="goToFindingsInReport(${it.id})">№${it.id}</button>
                    </div>
                    <p class="rec-summary-text">${escapeHtml(it.text)}</p>
                </li>`).join('')}</ol>
        </div>`;
    }
    container.innerHTML = html;
    syncFindingsAuxPanelsVisibility();
}

function toggleMoreMenu(event) {
    event?.stopPropagation?.();
    const menu = document.getElementById('moreActionsMenu');
    if (menu) menu.classList.toggle('show');
    closeSourcesAddMenu();
}

function toggleSourcesAddMenu(event) {
    event?.stopPropagation?.();
    const menu = document.getElementById('sourcesAddMenu');
    if (menu) menu.classList.toggle('show');
    const more = document.getElementById('moreActionsMenu');
    if (more) more.classList.remove('show');
}

function closeSourcesAddMenu() {
    const menu = document.getElementById('sourcesAddMenu');
    if (menu) menu.classList.remove('show');
}

function toggleExportMenu(event) {
    toggleMoreMenu(event);
}

document.addEventListener('click', () => {
    const menu = document.getElementById('moreActionsMenu');
    if (menu) menu.classList.remove('show');
    closeSourcesAddMenu();
});

function openFindingFromReview(id) {
    switchTab('results');
    openFindingEdit(id);
}




async function runAuditAnalysis(forceDraft = false) {
    if (!requireWriteAccess('Запуск AI-анализа')) return;
    if (!privacySettings) await loadPrivacySettings();
    const ui = auditData?.workflow_ui || {};
    const primary = ui.primary_button || {};
    const secondary = ui.secondary_button || {};

    if (forceDraft) {
        if (!secondary.enabled) {
            showAlert(secondary.reason_disabled || 'Черновик недоступен', 'warning');
            return;
        }
    } else if (primary.enabled === false) {
        const openData = await showConfirmDialog({
            title: 'Запуск анализа недоступен',
            message: `${primary.reason_disabled || 'Запуск анализа недоступен.'}\n\nОткрыть вкладку «Данные»?`,
            confirmText: 'Открыть данные',
            confirmType: 'primary',
        });
        if (openData) switchTab('data');
        return;
    }

    const payload = await buildAnalysisPayload();
    if (!payload) return;
    if (forceDraft) payload.force_draft = true;

    try {
        showAnalysisProgress({ percent: 0, message: 'Подготовка запуска...', status: 'in_progress' });
        connectAnalysisProgress(currentAuditId);
        await apiRequest(`/api/audits/${currentAuditId}/analyze/start`, { method: 'POST', body: JSON.stringify(payload) });
        showAlert(forceDraft ? 'Черновой AI-анализ запущен' : 'AI-анализ запущен. Следите за прогрессом на карточке аудита.', 'info');
    } catch (error) {
        showAlert('Ошибка анализа: ' + error.message, 'danger');
        hideAnalysisProgress();
    }
}







// === ИНИЦИАЛИЗАЦИЯ ===

async function verifyUiBuildSync() {
    const htmlBuild = (document.body?.dataset?.uiBuild || '').trim();
    if (!htmlBuild) {
        showUiBuildMismatch(
            'Сервер отдаёт устаревший HTML (нет метки UI в подвале). Закройте старый uvicorn и запустите .\\start_dev_windows.bat'
        );
        return;
    }
    try {
        const res = await fetch('/api/dev/ui-build', { cache: 'no-store' });
        if (!res.ok) {
            showUiBuildMismatch(
                'Сервер без актуального API (запущен вручную или старая копия). Используйте .\\start_dev_windows.bat и Ctrl+Shift+R'
            );
            return;
        }
        const api = await res.json();
        if (api.static_build && api.static_build !== htmlBuild) {
            showUiBuildMismatch(
                `Версия UI не совпадает: страница ${htmlBuild}, сервер ${api.static_build}. Ctrl+Shift+R или перезапуск start_dev_windows.bat`
            );
            return;
        }
        if (api.has_open_metrics_editor !== true) {
            showUiBuildMismatch('Загружен устаревший app.js. Ctrl+Shift+R или перезапуск сервера.');
        }
        if (api.max_upload_mb) {
            window.__MAX_UPLOAD_MB = Number(api.max_upload_mb) || 50;
            const lim = document.getElementById('documentFileLimits');
            if (lim) {
                lim.textContent = `txt, md, csv, xlsx, pdf, docx — до ${window.__MAX_UPLOAD_MB} МБ`;
            }
        }
        if (api.display_timezone) {
            window.__DISPLAY_TIMEZONE = api.display_timezone;
        }
        if (api.display_tz_suffix) {
            window.__DISPLAY_TZ_SUFFIX = api.display_tz_suffix;
        }
    } catch (_e) {
        /* offline / dev tools */
    }
}

function showUiBuildMismatch(message) {
    if (document.getElementById('uiBuildMismatchBanner')) return;
    const el = document.createElement('div');
    el.id = 'uiBuildMismatchBanner';
    el.className = 'ui-build-mismatch-banner';
    el.setAttribute('role', 'alert');
    el.innerHTML = `<strong>Устаревший интерфейс.</strong> ${escapeHtml(message)}`;
    document.body.prepend(el);
}

configureRuntimeBridge({
    getCurrentAuditId: () => currentAuditId,
    getAuditIdFromUrl,
    getAuditData: () => auditData,
    setAuditData: (data) => { auditData = data; },
    getDocumentIssueContext,
    setDocumentIssueContext,
    applyDocumentModalGuidance,
    getMediaRecorder,
    clearEditingMaterialId,
    fillMetricsFromSummary,
    focusMetricsModalField,
    renderChatHistory,
    askInChat,
    loadComparison,
    renderDirectHealthReport,
    getSelectedModelId,
    getPrivacySettings: () => privacySettings,
    loadPrivacySettings,
    buildAnalysisPayload,
    applyRoleUiRestrictions,
    applyAdminUiSegmentation,
    renderAuditDetail,
    renderDataIssues,
    renderFindings,
    switchTab,
    openModal,
    closeModal,
    openMetricsEditor,
    openMetricsEditorEdit,
    openMetricsEditorForNewPeriod,
    scrollToMetricsPeriodsPanel,
    switchDataSubtab,
    isSourcesDataSubtabActive,
    handleDataFlowRunAi,
    setSourcesAiFilter,
    scrollToDirectSliceAnchor,
    openNewMaterial,
    openDataItemAction,
    editMaterial,
    getMaterialById,
    goToAddAuditData,
    loadAuditDetail,
    renderAuditSummaryBlock: (summary, metrics, coverage) => {
        renderSummary(summary, metrics, coverage);
        renderReportSummaryEditor(summary, coverage);
    },
    runAuditAnalysis,
    rerunAuditAnalysis,
    openReportPanel,
    acceptDataLimitation,
    updateExtractMetricsButtonVisibility,
    getStatusLabel,
    renderAnalysisStaleBar,
    renderCoverageProgress,
    isAnalysisLikelyStuck,
    resetStuckAnalysis,
    showAnalysisProgress,
    hideAnalysisProgress,
    connectAnalysisProgress,
    goToDataImprovements,
    isAnalysisStale,
    focusScrollTarget: _focusScrollTarget,
    loadKbStatusCard,
    getCurrentScreenState,
    renderGuidedFirstRun,
    onClientSaved: (auditId, updated) => {
        if (auditData && String(currentAuditId) === String(auditId)) {
            Object.assign(auditData, {
                client_name: updated.client_name,
                region: updated.region,
                niche_category: updated.niche_category,
                niche_subcategory: updated.niche_subcategory,
                niche: updated.niche_display,
                niche_display: updated.niche_display,
                website: updated.website,
                comment: updated.comment,
                goal: updated.goal,
            });
            renderAuditDetail(auditData);
        }
    },
    onAuthSessionChanged: async () => {
        applyRoleUiRestrictions();
        applyAdminUiSegmentation();
    },
    onAuthLogoutNavigate: async () => {
        if (window.location.pathname.match(/\/audits\/\d+/)) {
            await loadAuditDetail();
        } else if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
            loadAuditsList();
        }
    },
});

registerWindowHandlers({
    closeModal,
    openModal,
    openAuthLoginModal,
    submitAuthLogin,
    logoutAuth,
    fillDevAuthCredentials,
    switchTab,
    openNewMaterial,
    createAudit,
    runPrimaryAction,
    runFocusAction,
    handleGuidedPrimaryAction,
    handleGuidedSecondaryAction,
    toggleFocusMode,
    toggleMoreMenu,
    toggleSourcesAddMenu,
    closeSourcesAddMenu,
    toggleDataSecondaryArea,
    switchDataSubtab,
    handleDataFlowRunAi,
    filterMaterialsList,
    clearMaterialsSearch,
    setSourcesAiFilter,
    closeMaterialDrawer,
    openDirectConditionsModal,
    previewAuditReport,
    exportAuditReport,
    runPrePdfCheck,
    renderReportSendChecklist,
    saveSendChecklistItem,
    initReportClientViewToggle,
    setReportClientView,
    goFixDirectAiConsistency,
    openAiSummaryForConsistency,
    exportSlidesPptx,
    exportGoogleSlides,
    syncDirectHealthFindings,
    openIssuesPanel,
    cleanupStaleMaterials,
    sendAuditQuestion,
    applyChatSuggestion,
    applyChatAnswerToFindingFromBtn,
    askFromFinding,
    saveFindingEdit,
    submitTextNote,
    submitAudioMaterial,
    submitScreenshot,
    submitMetrics,
    addDocument,
    importDirectPeriodsFromPreview,
    startRecording,
    stopRecording,
    cancelRecording,
    toggleBrowserSpeechRecognition,
    loadOpsHealthPage,
    toggleOpsHealthAutoRefresh,
    applyAuditTemplate,
    applyRunsFilter,
    clearRunsFilter,
    toggleRunDetails,
    openMetricsEditor,
    openMetricsEditorAddPeriod,
    openMetricsEditorEdit,
    openMetricsEditorForNewPeriod,
    scrollToMetricsPeriodsPanel,
    goToAddAuditData,
    goToDataImprovements,
    rerunAuditAnalysis,
    scrollToPendingFindings,
    openRecommendationsPanel,
    openReportPanel,
    openDocumentMaterialById,
    openDocumentMaterial,
    editDocumentText,
    resetStuckAnalysis,
    setAuditsListFilter,
    resetAuditsListFilters,
    goToAuditsPage,
    setAuditsListPageSize,
    toggleAuditsListSort,
    toggleAuditActionsMenu,
    closeAllAuditActionsMenus,
    runAnalysis,
    openAudit,
    loadAuditsList,
    updateNicheSubnicheUi,
    updateNichePreview,
    openEditClientModal,
    saveEditClient,
    openContactModalFromList,
    openContactModal,
    saveContact,
    deleteContact,
    duplicateAudit,
    toggleArchiveAudit,
    deleteAudit,
    previewAudit,
    exportAudit,
    editMaterial,
    deleteMaterial,
    saveFindingIllustrationCaption,
    openReportAppendixPicker,
    addScreenshotToReportAppendix: openReportAppendixPicker,
    removeReportAppendixItem,
    moveReportAppendixItem,
    saveReportAppendixFromUi,
    setFindingsMarketerFilter,
    goToFindingsInReport,
    scrollToDirectRisks,
    goToDirectResultsRisks,
    openAiFindingFromDirectRisk,
    openFindingsStubEnrichment,
    openDirectExcelSource,
    openFindingEvidenceMaterial,
    openFindingIllustrationPicker,
    clearFindingIllustration,
    unconfirmFinding,
    confirmFinding,
    confirmFindingRiskPattern,
    rejectFinding,
    restoreFindingToReview,
    openFindingEdit,
    openFindingFromReview,
    captureAuditBaseline,
    saveAuditPlan,
    saveReportCommercialOffer,
    saveReportAuditSummary,
    refreshReportSummaryFromAudit,
    refreshReportCommercialOfferFromAudit,
    toggleReportSummaryEdit,
    applyForecastFromCommercialOffer,
    generateClientSnapshotDraft,
    setMetricPeriodPreset,
    activateMetricsPeriod,
    extractMetricsFromNotesWithConfirm,
    extractMetricsFromNoteWithConfirm,
    extractMetricsWithAiConfirm,
    openDataItemAction,
    acceptDataLimitation,
    materialReviewAction,
    setMaterialAiInclusion,
    saveMaterialAiHint,
    rerunScreenshotOcr,
    reocrAllScreenshots,
    toggleChatWhy,
});

document.addEventListener('DOMContentLoaded', function() {
    const uiBuild = document.body?.dataset?.uiBuild || 'unknown';
    console.info('[PPC Audit] UI build:', uiBuild, '| openMetricsEditor:', typeof window.openMetricsEditor);
    verifyUiBuildSync();
    const path = window.location.pathname;

    loadAuthContext().finally(() => {
        renderIdentityBadges();
        renderAuthControls();
        if (path === '/' || path === '/index.html') {
            initAuditsListToolbar();
            loadAuditsList();
            loadOpsAlerts();
            loadAuditTemplates();
            initNicheFormUi();
        } else if (path.match(/\/audits\/\d+/)) {
            initNicheFormUi();
            loadAuditDetail().then(() => {
                if (auditData && auditData.status === 'in_progress') {
                    connectAnalysisProgress(currentAuditId);
                }
            }).catch((err) => {
                console.error('[PPC Audit] loadAuditDetail failed:', err);
            });
        } else if (path === '/audit-runs') {
            loadRunsList();
        } else if (path === '/ops-health') {
            loadOpsHealthPage();
            toggleOpsHealthAutoRefresh();
        }
    });

    try {
        setupDropZones();
        initMaterialFileTitleAutofill();
        initMetricPeriodPickers();
        loadPrivacySettings();
        initAiModelSelectors();
    } catch (err) {
        console.error('[PPC Audit] UI widgets init:', err);
    }
});

// === СТРАНИЦА ИСТОРИИ ЗАПУСКОВ ===

async function loadRunsList() {
    const tbody = document.getElementById('runsTableBody');
    const hint = document.getElementById('runsFilterHint');
    const resetBtn = document.getElementById('runsFilterResetBtn');
    const statusSelect = document.getElementById('runsStatusFilter');
    const actionInput = document.getElementById('runsActionFilter');
    const auditIdInput = document.getElementById('runsAuditIdFilter');
    if (!tbody) return;
    
    try {
        const params = new URLSearchParams(window.location.search);
        const savedRaw = localStorage.getItem('runsFilters');
        let saved = {};
        try { saved = savedRaw ? JSON.parse(savedRaw) : {}; } catch (_e) { saved = {}; }
        const statusFilter = (params.get('status') || saved.status || '').trim().toLowerCase();
        const actionFilter = (params.get('action') || saved.action || '').trim().toLowerCase();
        const auditIdFilter = (params.get('audit_id') || saved.audit_id || '').trim();

        let restoredFromStorage = false;
        if (!window.location.search && (statusFilter || actionFilter || auditIdFilter)) {
            const restoreParams = new URLSearchParams();
            if (statusFilter) restoreParams.set('status', statusFilter);
            if (actionFilter) restoreParams.set('action', actionFilter);
            if (auditIdFilter) restoreParams.set('audit_id', auditIdFilter);
            const restoredQuery = restoreParams.toString();
            if (restoredQuery) {
                window.history.replaceState({}, '', `/audit-runs?${restoredQuery}`);
                restoredFromStorage = true;
            }
        }

        if (statusSelect) statusSelect.value = statusFilter;
        if (actionInput) actionInput.value = actionFilter;
        if (auditIdInput) auditIdInput.value = auditIdFilter;

        const runs = await apiRequest('/api/audit-runs/');
        const filteredRuns = runs.filter((r) => {
            if (statusFilter && String(r.status || '').toLowerCase() !== statusFilter) return false;
            if (actionFilter && !String(r.action || '').toLowerCase().includes(actionFilter)) return false;
            if (auditIdFilter && String(r.audit_project_id || '') !== auditIdFilter) return false;
            return true;
        });

        if (hint) {
            const active = [];
            if (statusFilter) active.push(`status=${statusFilter}`);
            if (actionFilter) active.push(`action~${actionFilter}`);
            if (auditIdFilter) active.push(`audit_id=${auditIdFilter}`);
            if (active.length) {
                hint.style.display = 'block';
                hint.textContent = `Фильтр: ${active.join(', ')}`;
            } else {
                hint.style.display = 'none';
                hint.textContent = '';
            }
        }
        if (resetBtn) {
            const hasFilter = Boolean(statusFilter || actionFilter || auditIdFilter);
            resetBtn.style.display = hasFilter ? 'inline-flex' : 'none';
        }
        if (restoredFromStorage) {
            showAlert('Фильтр истории запусков восстановлен', 'info');
        }

        if (filteredRuns.length === 0) {
            const emptyText = statusFilter
                ? 'По текущему фильтру записей нет.'
                : 'Нет записей о запусках';
            tbody.innerHTML = `<tr><td colspan="7" class="table-empty-state">${emptyText}</td></tr>`;
            return;
        }

        tbody.innerHTML = filteredRuns.map(r => {
            const detailsId = `run_details_${r.id}`;
            const input = r.input_json ? escapeHtml(prettyJson(r.input_json)) : '—';
            const output = r.output_json ? escapeHtml(prettyJson(r.output_json)) : (r.error ? escapeHtml(r.error) : '—');
            return `
            <tr>
                <td>${r.id}</td>
                <td><a href="/audits/${r.audit_project_id}">Аудит #${r.audit_project_id}</a></td>
                <td>${escapeHtml(r.action)}</td>
                <td><span class="badge badge-${r.status === 'success' ? 'completed' : r.status === 'failed' ? 'failed' : 'draft'}">${escapeHtml(r.status || '—')}</span></td>
                <td>${r.duration_ms ? (r.duration_ms / 1000).toFixed(1) + ' сек' : '—'}</td>
                <td>${formatDate(r.created_at)}</td>
                <td><button class="btn btn-outline btn-sm" onclick="toggleRunDetails('${detailsId}')">Показать</button></td>
            </tr>
            <tr id="${detailsId}" class="run-details-row is-hidden">
                <td colspan="7">
                    <div class="raw-json-grid">
                        <div><strong>Input</strong><pre class="raw-json">${input}</pre></div>
                        <div><strong>Output / Error</strong><pre class="raw-json">${output}</pre></div>
                    </div>
                </td>
            </tr>`;
        }).join('');
        
    } catch (error) {
        showAlert('Ошибка загрузки истории: ' + error.message, 'danger');
    }
}

function clearRunsFilter() {
    localStorage.removeItem('runsFilters');
    window.location.href = '/audit-runs';
}

function applyRunsFilter() {
    const status = (document.getElementById('runsStatusFilter')?.value || '').trim();
    const action = (document.getElementById('runsActionFilter')?.value || '').trim();
    const auditId = (document.getElementById('runsAuditIdFilter')?.value || '').trim();
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (action) params.set('action', action);
    if (auditId) params.set('audit_id', auditId);
    localStorage.setItem('runsFilters', JSON.stringify({
        status: status || '',
        action: action || '',
        audit_id: auditId || '',
    }));
    const query = params.toString();
    window.location.href = query ? `/audit-runs?${query}` : '/audit-runs';
}

function prettyJson(value) {
    try {
        return JSON.stringify(JSON.parse(value), null, 2);
    } catch (e) {
        return value || '';
    }
}

function toggleRunDetails(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle('is-hidden');
}
