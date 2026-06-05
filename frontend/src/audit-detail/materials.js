/** Materials CRUD + metrics period pickers — epic H4. */
import { escapeHtml } from '../core/utils.js';
import { showAlert } from '../core/alerts.js';
import { showLoader, hideLoader } from '../core/utils.js';
import { openModal, closeModal, showConfirmDialog } from '../core/modals.js';
import { apiRequest, apiFetch, openProtectedFileUrl } from '../core/api.js';
import { requireWriteAccess } from '../core/auth.js';
import { runtimeBridge } from '../core/runtime-bridge.js';
import { getGuidedStepSnapshot, refreshAuditAndAdvanceGuidedFlow } from './workflow.js';
import { cancelRecording } from '../media/audio.js';
import { formatRubAmount, formatUsdAmount } from '../shared/ai-usage.js';
import { DIRECT_COPY } from './direct-copy.js';
import { findScreenshotOcrSibling } from './data-tab-ux.js';
import { maybeAutoSyncDirectHealthAfterExcelUpload } from './report.js';

const METRIC_FIELD_LABELS = {
    period: 'Период',
    budget: 'Бюджет (₽)',
    clicks: 'Клики',
    leads: 'Лиды (всего)',
    leads_forms: 'Заявки (форма)',
    leads_messenger: 'Мессенджеры',
    sales: 'Продажи',
    revenue: 'Выручка (₽)',
};

let editingMaterialId = null;
let documentIssueContext = null;

function getCurrentAuditId() {
    return runtimeBridge.getCurrentAuditId?.() || runtimeBridge.getAuditIdFromUrl?.() || null;
}

function getAuditData() {
    return runtimeBridge.getAuditData?.() || null;
}

function setDocumentUploadStatus(text) {
    const el = document.getElementById('documentUploadStatus');
    if (!el) return;
    if (!text) {
        el.style.display = 'none';
        el.textContent = '';
        return;
    }
    el.style.display = 'block';
    el.textContent = text;
}
function titleFromUploadFileName(file) {
    if (!file?.name) return '';
    const raw = String(file.name).replace(/\\/g, '/').split('/').pop() || '';
    try {
        return decodeURIComponent(raw).trim();
    } catch {
        return raw.trim();
    }
}

function autofillMaterialTitleFromFile(fileInput, titleInput) {
    if (!fileInput || !titleInput || editingMaterialId) return;
    const file = fileInput.files?.[0];
    const name = titleFromUploadFileName(file);
    if (name) titleInput.value = name;
}

/** При выборе файла подставляет имя в поле «Название» (документ / скриншот). */
export function initMaterialFileTitleAutofill() {
    if (window._materialFileTitleAutofillBound) return;
    window._materialFileTitleAutofillBound = true;

    const docFile = document.getElementById('documentFileInput');
    const docTitle = document.getElementById('documentTitle');
    docFile?.addEventListener('change', () => autofillMaterialTitleFromFile(docFile, docTitle));

    const shotFile = document.getElementById('screenshotFileInput');
    const shotTitle = document.getElementById('screenshotTitle');
    shotFile?.addEventListener('change', () => autofillMaterialTitleFromFile(shotFile, shotTitle));
}

function openNewMaterial(modalId) {
    editingMaterialId = null;
    if (modalId !== 'documentModal') {
        documentIssueContext = null;
    }
    resetMaterialForm(modalId);
    openModal(modalId);
}

function applyDocumentModalGuidance(itemId) {
    const hintEl = document.getElementById('documentModalHint');
    const titleEl = document.getElementById('documentTitle');
    if (!hintEl || !titleEl) return;
    const guidance = {
        search_queries: {
            hint: 'Загрузите выгрузку поисковых запросов из рекламного кабинета (xlsx/csv/pdf).',
            title: 'Поисковые запросы',
        },
        metrika: {
            hint: 'Загрузите данные по целям Метрики: конверсии, цели, UTM-отчёты или скриншоты отчёта.',
            title: 'Цели Метрики',
        },
        crm: {
            hint: 'Загрузите CRM-отчёт по статусам лидов/сделок или выгрузку воронки.',
            title: 'CRM-статусы лидов',
        },
        metrika_crm: {
            hint: 'Загрузите материалы по Метрике и CRM: цели, UTM и статусы лидов.',
            title: 'Метрика и CRM',
        },
        landing: {
            hint: 'Загрузите ссылки/скриншоты/описание посадочных страниц, которые ведут из рекламы.',
            title: 'Посадочные страницы',
        },
        lead_quality: {
            hint: 'Загрузите комментарии по качеству лидов: целевые/нецелевые, причины брака, примеры.',
            title: 'Качество лидов',
        },
    };
    const selected = guidance[itemId] || {
        hint: 'Загрузите документ или выгрузку, которая закроет текущий пункт чеклиста.',
        title: 'Документ',
    };
    hintEl.textContent = selected.hint;
    if (!titleEl.value || titleEl.value === 'Документ') {
        titleEl.value = selected.title;
    }
}

function setModalSubmitLabel(modalId, isEdit) {
    const map = {
        textNoteModal: 'textNoteSubmitBtn',
        audioModal: 'audioSubmitBtn',
        screenshotModal: 'screenshotSubmitBtn',
        metricsModal: 'metricsSubmitBtn'
    };
    const btn = document.getElementById(map[modalId]);
    if (btn) btn.textContent = isEdit ? 'Сохранить' : 'Добавить';
    const titleMap = {
        audioModal: 'audioModalTitle',
        metricsModal: null
    };
    const titleEl = titleMap[modalId] ? document.getElementById(titleMap[modalId]) : null;
    if (titleEl) titleEl.textContent = isEdit ? 'Редактировать аудио' : 'Аудиозаметка';
}

function resetMaterialForm(modalId) {
    setModalSubmitLabel(modalId, false);
    if (modalId === 'textNoteModal') {
        document.getElementById('textNoteTitle').value = '';
        document.getElementById('textNoteContent').value = '';
    } else if (modalId === 'metricsModal') {
        clearMetricPeriodPickers();
        ['metricBudgetInput', 'metricClicksInput', 'metricLeadsInput', 'metricLeadsFormsInput', 'metricLeadsMessengerInput', 'metricSalesInput', 'metricRevenueInput', 'metricGrossProfitInput', 'metricMarginInput']
            .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
        const err = document.getElementById('metricsFormError');
        if (err) { err.style.display = 'none'; err.textContent = ''; }
    } else if (modalId === 'audioModal') {
        document.getElementById('audioTitle').value = '';
        document.getElementById('audioTranscript').value = '';
        document.getElementById('audioFileInput').value = '';
        const confirmed = document.getElementById('audioTranscriptConfirmed');
        if (confirmed) confirmed.checked = false;
        const src = document.getElementById('audioTranscriptSource');
        if (src) src.value = 'manual';
        const preview = document.getElementById('audioPreview');
        if (preview) { preview.innerHTML = ''; preview.style.display = 'none'; }
        const existing = document.getElementById('audioExistingBlock');
        if (existing) existing.style.display = 'none';
        const capture = document.getElementById('audioCaptureBlock');
        if (capture) capture.style.display = 'block';
        cancelRecording();
    } else if (modalId === 'screenshotModal') {
        document.getElementById('screenshotTitle').value = '';
        document.getElementById('screenshotOcrText').value = '';
        document.getElementById('screenshotFileInput').value = '';
        const fileGroup = document.getElementById('screenshotFileGroup');
        if (fileGroup) fileGroup.style.display = 'block';
    }
}

function getMaterialById(id) {
    return (getAuditData()?.materials || []).find(m => String(m.id) === String(id));
}

function findTranscriptMaterial(material) {
    if (material.type === 'audio_transcript') return material;
    const title = material.title || '';
    return (getAuditData()?.materials || []).find(m =>
        m.type === 'audio_transcript' && m.title === `Расшифровка: ${title}`
    );
}

function findOcrMaterial(material) {
    if (material.type === 'screenshot_ocr') return material;
    const title = material.title || '';
    return (getAuditData()?.materials || []).find(m =>
        m.type === 'screenshot_ocr' && m.title === `OCR/описание: ${title}`
    );
}

function parseTranscriptMeta(material) {
    let text = material.extracted_text || '';
    let source = 'manual';
    let confirmed = false;
    try {
        const raw = JSON.parse(material.raw_content || '{}');
        text = raw.text || text;
        source = raw.source || source;
        confirmed = Boolean(raw.confirmed);
    } catch (e) { /* keep defaults */ }
    return { text, source, confirmed };
}

function fillMetricsForm(materialOrRaw) {
    let raw = '';
    if (materialOrRaw && typeof materialOrRaw === 'object') {
        raw = materialOrRaw.raw_content || materialOrRaw.extracted_text || '';
    } else {
        raw = materialOrRaw || '';
    }
    let data = {};
    try { data = JSON.parse(raw || '{}'); } catch (e) { data = {}; }
    if (!Object.keys(data).length && getAuditData()?.metrics_summary) {
        runtimeBridge.fillMetricsFromSummary?.(getAuditData().metrics_summary);
        return;
    }
    const set = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.value = value == null ? '' : String(value);
    };
    set('metricBudgetInput', data.budget);
    set('metricClicksInput', data.clicks);
    set('metricLeadsInput', data.leads);
    set('metricLeadsFormsInput', data.leads_forms);
    set('metricLeadsMessengerInput', data.leads_messenger);
    set('metricSalesInput', data.sales);
    set('metricRevenueInput', data.revenue);
    set('metricGrossProfitInput', data.gross_profit);
    set('metricMarginInput', data.margin_percent);
    applyMetricPeriodFromStored(data.period || '');
    const err = document.getElementById('metricsFormError');
    if (err) { err.style.display = 'none'; err.textContent = ''; }
}

function openDocumentMaterialById(id) {
    openDocumentMaterial(getMaterialById(id));
}

function parseDocumentSlice(material) {
    if (material?.document_slice && typeof material.document_slice === 'object') {
        return material.document_slice;
    }
    const raw = material?.raw_content;
    if (!raw) return null;
    try {
        const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
        return data?.document_slice && typeof data.document_slice === 'object' ? data.document_slice : null;
    } catch {
        return null;
    }
}

let documentPreviewMaterialId = null;

function renderDocumentSliceSummary(slice, materialId) {
    const el = document.getElementById('documentSliceSummary');
    const importBtn = document.getElementById('documentImportPeriodsBtn');
    documentPreviewMaterialId = materialId || null;
    if (!el) return;
    if (!slice || slice.format !== 'yandex_direct_xlsx') {
        el.style.display = 'none';
        el.innerHTML = '';
        if (importBtn) importBtn.style.display = 'none';
        return;
    }
    const totals = slice.totals || {};
    const monthly = Array.isArray(slice.monthly) ? slice.monthly : [];
    const campaigns = Array.isArray(slice.campaigns) ? slice.campaigns : [];
    const period = slice.period ? `<div><strong>Период:</strong> ${escapeHtml(slice.period)}</div>` : '';
    const client = slice.client_label ? `<div><strong>Клиент:</strong> ${escapeHtml(slice.client_label)}</div>` : '';
    const monthlyRows = monthly.slice(0, 6).map((row) => (
        `<tr><td>${escapeHtml(row.month || '—')}</td><td>${escapeHtml(String(row.leads ?? '—'))}</td><td>${escapeHtml(row.cpl != null ? String(row.cpl) : '—')}</td></tr>`
    )).join('');
    const monthlyTable = monthly.length
        ? `<table class="table table-compact direct-slice-monthly-table"><thead><tr><th>Месяц</th><th>Лиды</th><th>CPL</th></tr></thead><tbody>${monthlyRows}</tbody></table>`
        : '';
    const topCamps = [...campaigns]
        .sort((a, b) => (b.leads || 0) - (a.leads || 0))
        .slice(0, 5)
        .map((c) => `<li>${escapeHtml((c.campaign_name || '').slice(0, 40))} — ${escapeHtml(String(c.leads ?? 0))} лидов, CPL ${escapeHtml(c.cpl != null ? String(c.cpl) : '—')}</li>`)
        .join('');
    el.innerHTML = `
        <div class="alert alert-info direct-slice-preview">
            <strong>${DIRECT_COPY.sliceTitle}</strong> (${escapeHtml(slice.report_type || 'отчёт')}).
            ${client}${period}
            <div class="direct-slice-preview-totals">
                <strong>Итого:</strong> расход ${escapeHtml(String(totals.cost ?? '—'))} ₽,
                лиды ${escapeHtml(String(totals.leads ?? totals.conversions ?? '—'))}
                (форма ${escapeHtml(String(totals.forms ?? '—'))}, мессенджер ${escapeHtml(String(totals.messengers ?? '—'))}),
                CPL ${escapeHtml(totals.cpl != null ? String(totals.cpl) : '—')}
            </div>
            ${monthlyTable}
            ${topCamps ? `<ul class="direct-slice-campaign-list">${topCamps}</ul>` : ''}
        </div>`;
    el.style.display = 'block';
    if (importBtn) {
        importBtn.style.display = monthly.length >= 1 && materialId ? 'inline-block' : 'none';
    }
}

async function importDirectPeriodsFromPreview() {
    if (!documentPreviewMaterialId || !getCurrentAuditId()) return;
    if (!requireWriteAccess('Импорт периодов KPI')) return;
    try {
        showLoader();
        const result = await apiRequest(
            `/api/audits/${getCurrentAuditId()}/materials/${documentPreviewMaterialId}/import-direct-periods`,
            { method: 'POST' },
        );
        hideLoader();
        showAlert(
            `Добавлено периодов KPI: ${result?.created_count ?? 0}. Проверьте динамику в блоке «${DIRECT_COPY.sliceTitle}».`,
            'success',
        );
        closeModal('documentPreviewModal');
        await refreshAuditAndAdvanceGuidedFlow(null);
    } catch (error) {
        hideLoader();
        showAlert('Не удалось импортировать периоды: ' + (error.message || 'ошибка'), 'warning');
    }
}

function openDocumentMaterial(m) {
    if (!m) return;
    const preview = (m.extracted_text || '').trim();
    if (m.file_url) {
        const name = m.title || 'document';
        openProtectedFileUrl(m.file_url, { downloadName: name });
    }
    if (preview) {
        renderDocumentSliceSummary(parseDocumentSlice(m), m.id);
        const box = document.getElementById('documentPreviewText');
        if (box) {
            box.textContent = preview.length > 12000 ? `${preview.slice(0, 12000)}…` : preview;
        }
        openModal('documentPreviewModal');
    } else if (!m.file_url) {
        showAlert('Файл документа не найден. Загрузите документ заново.', 'warning');
    } else if (m.status === 'processing_error') {
        showAlert('Документ не распознан. Откройте «Текст» и введите содержимое вручную.', 'warning');
    }
}

async function editDocumentText(materialId) {
    const m = getMaterialById(materialId);
    if (!m) return;
    const content = await showPromptDialog({
        title: 'Исправить текст документа',
        message: 'Изменения будут сохранены в материал аудита.',
        initialValue: m.extracted_text || '',
        placeholder: 'Введите исправленный текст...',
        confirmText: 'Сохранить',
    });
    if (content === false) return;
    try {
        await saveMaterialPatch(m.id, { title: m.title, content });
        await runtimeBridge.loadAuditDetail?.();
        showAlert('Текст документа обновлён', 'success');
    } catch (err) {
        showAlert('Ошибка: ' + err.message, 'danger');
    }
}

async function editMaterial(id) {
    const m = getMaterialById(id);
    if (!m) {
        showAlert('Материал не найден', 'warning');
        return;
    }
    editingMaterialId = m.id;

    if (m.type === 'text_note') {
        document.getElementById('textNoteTitle').value = m.title || '';
        document.getElementById('textNoteContent').value = m.extracted_text || m.raw_content || '';
        setModalSubmitLabel('textNoteModal', true);
        openModal('textNoteModal');
        return;
    }

    if (m.type === 'manual_metrics') {
        fillMetricsForm(m);
        const setActiveRow = document.getElementById('metricSetActiveRow');
        if (setActiveRow) setActiveRow.style.display = 'none';
        setModalSubmitLabel('metricsModal', true);
        openModal('metricsModal');
        runtimeBridge.focusMetricsModalField?.();
        return;
    }

    if (m.type === 'audio' || m.type === 'audio_transcript') {
        const transcriptMat = m.type === 'audio_transcript' ? m : findTranscriptMaterial(m);
        const audioMat = m.type === 'audio' ? m : (getAuditData().materials.find(x => x.type === 'audio' && findTranscriptMaterial(x)?.id === m.id) || null);
        editingMaterialId = m.type === 'audio_transcript' ? m.id : m.id;
        document.getElementById('audioTitle').value = audioMat ? audioMat.title : (m.title || '').replace(/^Расшифровка:\s*/, '');
        const meta = transcriptMat ? parseTranscriptMeta(transcriptMat) : { text: '', source: 'manual', confirmed: false };
        document.getElementById('audioTranscript').value = meta.text;
        document.getElementById('audioTranscriptSource').value = meta.source;
        document.getElementById('audioTranscriptConfirmed').checked = meta.confirmed;
        const capture = document.getElementById('audioCaptureBlock');
        const existing = document.getElementById('audioExistingBlock');
        const player = document.getElementById('audioExistingPlayer');
        if (audioMat && audioMat.file_url) {
            if (capture) capture.style.display = 'none';
            if (existing) existing.style.display = 'block';
            if (player) player.innerHTML = `<audio class="audio-player-inline" controls src="${audioMat.file_url}"></audio>`;
        } else {
            if (capture) capture.style.display = 'block';
            if (existing) existing.style.display = 'none';
        }
        setModalSubmitLabel('audioModal', true);
        openModal('audioModal');
        return;
    }

    if (m.type === 'screenshot' || m.type === 'screenshot_ocr') {
        const shot = m.type === 'screenshot' ? m : (getAuditData().materials.find(x => x.type === 'screenshot' && findOcrMaterial(x)?.id === m.id) || m);
        const ocr = findOcrMaterial(shot) || (m.type === 'screenshot_ocr' ? m : null);
        document.getElementById('screenshotTitle').value = (shot.title || '').replace(/^OCR\/описание:\s*/, '');
        document.getElementById('screenshotOcrText').value = ocr ? (ocr.extracted_text || ocr.raw_content || '') : '';
        const kindSel = document.getElementById('screenshotSetupKind');
        if (kindSel) {
            let kind = 'other';
            try {
                const meta = JSON.parse(shot.raw_content || '{}');
                if (meta.direct_setup_kind) kind = meta.direct_setup_kind;
            } catch (_e) { /* ignore */ }
            kindSel.value = kind;
        }
        const fileGroup = document.getElementById('screenshotFileGroup');
        if (fileGroup) fileGroup.style.display = editingMaterialId && shot.file_url ? 'none' : 'block';
        setModalSubmitLabel('screenshotModal', true);
        openModal('screenshotModal');
        return;
    }

    if (m.type === 'document') {
        openDocumentMaterial(m);
        editingMaterialId = null;
        return;
    }

    showAlert('Этот тип материала пока нельзя редактировать', 'warning');
    editingMaterialId = null;
}

async function saveMaterialPatch(materialId, payload) {
    return apiRequest(`/api/audits/${getCurrentAuditId()}/materials/${materialId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
    });
}

async function materialReviewAction(materialId, action, options = {}) {
    if (!requireWriteAccess('Проверка материала')) return;
    const { silent = false } = options;
    try {
        if (action === 'verify' && !silent) {
            showAlert('AI учтёт показатель как подтверждённый, но сохранит отметку об аномалии, если она есть.', 'warning');
        }
        await apiRequest(`/api/audits/${getCurrentAuditId()}/materials/${materialId}/review`, {
            method: 'PATCH',
            body: JSON.stringify({ action, reason: action === 'exclude_analysis' ? 'Исключено маркетологом' : '' })
        });
        await runtimeBridge.loadAuditDetail?.();
        if (!silent) showAlert('Статус материала обновлён', 'success');
    } catch (error) {
        showAlert('Ошибка: ' + error.message, 'danger');
    }
}

async function setMaterialAiInclusion(materialId, include) {
    if (!requireWriteAccess('Выбор материалов для AI')) return;
    const materials = runtimeBridge.getAuditData?.()?.materials || [];
    const mat = materials.find((m) => Number(m.id) === Number(materialId));
    const action = include ? 'include' : 'exclude_analysis';
    await materialReviewAction(materialId, action, { silent: true });
    if (mat?.type === 'screenshot') {
        const ocr = findScreenshotOcrSibling(materials, mat);
        if (ocr) await materialReviewAction(ocr.id, action, { silent: true });
    }
    await runtimeBridge.loadAuditDetail?.();
}

async function saveMaterialAiHint(materialId, hint) {
    if (!requireWriteAccess('Подсказка для AI')) return;
    try {
        await saveMaterialPatch(materialId, { marketer_ai_hint: (hint || '').trim() });
        await runtimeBridge.loadAuditDetail?.();
        showAlert(DIRECT_COPY.materialAiHintSaved, 'success');
    } catch (error) {
        showAlert('Ошибка: ' + error.message, 'danger');
    }
}

async function rerunScreenshotOcr(materialId) {
    if (!requireWriteAccess('OCR скриншота')) return;
    try {
        showLoader();
        await apiRequest(`/api/audits/${getCurrentAuditId()}/materials/${materialId}/ocr`, { method: 'POST' });
        hideLoader();
        await runtimeBridge.loadAuditDetail?.();
        showAlert(DIRECT_COPY.screenshotRerunOcrOk, 'success');
        const drawer = document.getElementById('materialDrawer');
        if (drawer?.classList.contains('is-open') && typeof window.openMaterialDrawer === 'function') {
            window.openMaterialDrawer(materialId);
        }
    } catch (error) {
        hideLoader();
        showAlert(error.message || DIRECT_COPY.screenshotRerunOcrFail, 'danger');
    }
}

async function reocrAllScreenshots() {
    if (!requireWriteAccess('OCR всех скриншотов')) return;
    try {
        showLoader();
        const result = await apiRequest(
            `/api/audits/${getCurrentAuditId()}/materials/reocr-screenshots`,
            { method: 'POST' },
        );
        hideLoader();
        await runtimeBridge.loadAuditDetail?.();
        const ok = Number(result?.success || 0);
        const total = Number(result?.processed || 0);
        const failed = Number(result?.failed_count || 0);
        const msg = failed
            ? DIRECT_COPY.screenshotReocrAllPartial(ok, failed)
            : DIRECT_COPY.screenshotReocrAllOk(ok, total);
        showAlert(msg, failed ? 'warning' : 'success');
    } catch (error) {
        hideLoader();
        showAlert(error.message || DIRECT_COPY.screenshotRerunOcrFail, 'danger');
    }
}

// === ДОБАВЛЕНИЕ / РЕДАКТИРОВАНИЕ МАТЕРИАЛОВ ===

async function submitTextNote() {
    const previousStep = getGuidedStepSnapshot();
    const content = document.getElementById('textNoteContent').value;
    const title = document.getElementById('textNoteTitle').value;
    if (!content.trim()) {
        showAlert('Введите текст заметки', 'warning');
        return;
    }
    try {
        if (editingMaterialId) {
            await saveMaterialPatch(editingMaterialId, { title, content });
            showAlert('Заметка сохранена', 'success');
        } else {
            await apiRequest(`/api/audits/${getCurrentAuditId()}/materials/text`, {
                method: 'POST',
                body: JSON.stringify({ title, content })
            });
            showAlert('Заметка добавлена', 'success');
        }
        closeModal('textNoteModal');
        resetMaterialForm('textNoteModal');
        await refreshAuditAndAdvanceGuidedFlow(previousStep);
    } catch (error) {
        showAlert('Ошибка: ' + error.message, 'danger');
    }
}

async function submitAudioMaterial() {
    const previousStep = getGuidedStepSnapshot();
    const fileInput = document.getElementById('audioFileInput');
    const title = document.getElementById('audioTitle').value || 'Аудиозаметка';
    const transcript = document.getElementById('audioTranscript').value.trim();
    const source = document.getElementById('audioTranscriptSource')?.value || 'manual';
    const confirmed = document.getElementById('audioTranscriptConfirmed')?.checked || false;
    const file = fileInput.files[0];

    if (editingMaterialId) {
        if (!transcript) {
            showAlert('Добавьте или исправьте расшифровку', 'warning');
            return;
        }
        const m = getMaterialById(editingMaterialId);
        const payload = {
            manual_transcript: transcript,
            transcript_source: source,
            transcript_confirmed: confirmed
        };
        if (m && m.type === 'audio') payload.title = title;
        try {
            await saveMaterialPatch(editingMaterialId, payload);
            closeModal('audioModal');
            resetMaterialForm('audioModal');
            await refreshAuditAndAdvanceGuidedFlow(previousStep);
            showAlert('Аудио сохранено', 'success');
        } catch (error) {
            showAlert('Ошибка: ' + error.message, 'danger');
        }
        return;
    }

    if (!file && !transcript) {
        showAlert('Запишите/загрузите аудио или введите расшифровку', 'warning');
        return;
    }

    const formData = new FormData();
    if (file) formData.append('file', file);
    formData.append('title', title);
    formData.append('manual_transcript', transcript);
    formData.append('transcript_source', source);
    formData.append('transcript_confirmed', confirmed ? 'true' : 'false');

    try {
        showLoader();
        await apiFetch(`/api/audits/${getCurrentAuditId()}/materials/audio`, { method: 'POST', body: formData });
        hideLoader();
        closeModal('audioModal');
        resetMaterialForm('audioModal');
        await refreshAuditAndAdvanceGuidedFlow(previousStep);
        showAlert('Аудио добавлено', 'success');
    } catch (error) {
        showAlert('Ошибка: ' + error.message, 'danger');
    }
}

async function submitScreenshot() {
    const previousStep = getGuidedStepSnapshot();
    const fileInput = document.getElementById('screenshotFileInput');
    const title = document.getElementById('screenshotTitle').value || 'Скриншот';
    const ocrText = document.getElementById('screenshotOcrText').value.trim();
    const file = fileInput.files[0];

    if (editingMaterialId) {
        try {
            const setupKind = document.getElementById('screenshotSetupKind')?.value || 'other';
            await saveMaterialPatch(editingMaterialId, { title, content: ocrText, direct_setup_kind: setupKind });
            closeModal('screenshotModal');
            resetMaterialForm('screenshotModal');
            await refreshAuditAndAdvanceGuidedFlow(previousStep);
            showAlert('Скриншот сохранён', 'success');
        } catch (error) {
            showAlert('Ошибка: ' + error.message, 'danger');
        }
        return;
    }

    if (!file) {
        showAlert('Выберите файл скриншота', 'warning');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('manual_ocr_text', ocrText);
    const setupKind = document.getElementById('screenshotSetupKind')?.value || 'other';
    formData.append('direct_setup_kind', setupKind);

    try {
        showLoader();
        await apiFetch(`/api/audits/${getCurrentAuditId()}/materials/screenshot`, { method: 'POST', body: formData });
        hideLoader();
        closeModal('screenshotModal');
        resetMaterialForm('screenshotModal');
        await refreshAuditAndAdvanceGuidedFlow(previousStep);
        showAlert('Скриншот добавлен', 'success');
    } catch (error) {
        showAlert('Ошибка: ' + error.message, 'danger');
    }
}

async function addTextNote() { return submitTextNote(); }
async function addAudio() { return submitAudioMaterial(); }
async function addScreenshot() { return submitScreenshot(); }

const METRIC_MONTH_PREFIXES = [
    ['январ', 1], ['феврал', 2], ['март', 3], ['апрел', 4],
    ['май', 5], ['мая', 5], ['июн', 6], ['июл', 7], ['август', 8],
    ['сентябр', 9], ['октябр', 10], ['ноябр', 11], ['декабр', 12],
];

function parseMetricIsoDate(value) {
    const text = String(value || '').trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
    const match = text.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (!match) return null;
    return `${match[3]}-${String(match[2]).padStart(2, '0')}-${String(match[1]).padStart(2, '0')}`;
}

function metricMonthBounds(year, month) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    return { start: metricToIsoDate(start), end: metricToIsoDate(end) };
}

function metricToIsoDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function metricIsoToDisplay(iso) {
    const [y, m, d] = String(iso || '').split('-');
    if (!y || !m || !d) return '';
    return `${d}.${m}.${y}`;
}

function formatMetricPeriodCanonical(startIso, endIso) {
    if (!startIso || !endIso) return '';
    return `${metricIsoToDisplay(startIso)} — ${metricIsoToDisplay(endIso)}`;
}

function parseStoredPeriodToRange(raw) {
    const text = String(raw || '').trim();
    if (!text) return null;

    const rangeMatch = text.match(
        /^(\d{1,2}\.\d{1,2}\.\d{4}|\d{4}-\d{2}-\d{2})\s*[-–—]\s*(\d{1,2}\.\d{1,2}\.\d{4}|\d{4}-\d{2}-\d{2})$/
    );
    if (rangeMatch) {
        const start = parseMetricIsoDate(rangeMatch[1]);
        const end = parseMetricIsoDate(rangeMatch[2]);
        if (start && end) return { start, end };
    }

    if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(text) || /^\d{4}-\d{2}-\d{2}$/.test(text)) {
        const day = parseMetricIsoDate(text);
        if (day) return { start: day, end: day };
    }

    const numericMonth = text.match(/^(\d{1,2})[./](\d{4})$/);
    if (numericMonth) {
        const month = Number(numericMonth[1]);
        const year = Number(numericMonth[2]);
        if (month >= 1 && month <= 12) return metricMonthBounds(year, month);
    }

    const isoMonth = text.match(/^(\d{4})-(\d{2})$/);
    if (isoMonth) {
        const year = Number(isoMonth[1]);
        const month = Number(isoMonth[2]);
        if (month >= 1 && month <= 12) return metricMonthBounds(year, month);
    }

    const lowered = text.toLowerCase().replace(/ё/g, 'е');
    for (const [prefix, month] of METRIC_MONTH_PREFIXES) {
        if (!lowered.startsWith(prefix)) continue;
        let rest = lowered.slice(prefix.length).replace(/^[ья]\.?\s*/, '').trim();
        const yearMatch = rest.match(/^(\d{4})$/);
        if (yearMatch) return metricMonthBounds(Number(yearMatch[1]), month);
    }
    return null;
}

let metricPeriodLastChanged = null;

function getMetricPeriodRangeState(startIso, endIso, lastChanged = metricPeriodLastChanged) {
    if (!startIso || !endIso || endIso >= startIso) {
        return {
            valid: true,
            startIso,
            endIso,
            message: null,
            level: null,
            corrected: false,
        };
    }
    if (lastChanged === 'end') {
        return {
            valid: false,
            startIso,
            endIso,
            message: 'Дата окончания раньше даты начала',
            level: 'error',
            corrected: false,
        };
    }
    const correctedEnd = startIso;
    return {
        valid: true,
        startIso,
        endIso: correctedEnd,
        message: `Дата «По» скорректирована: ${metricIsoToDisplay(correctedEnd)}`,
        level: 'warning',
        corrected: true,
    };
}

function setMetricPeriodPreviewMessage(text, level = null) {
    const preview = document.getElementById('metricPeriodPreview');
    if (!preview) return;
    preview.textContent = text || '';
    preview.classList.remove('is-error', 'is-warning');
    if (level === 'error') preview.classList.add('is-error');
    if (level === 'warning') preview.classList.add('is-warning');
}

function setMetricPeriodDateInputs(startIso, endIso) {
    const pairs = [
        ['metricPeriodStartInput', 'metricPeriodStartDisplay', startIso],
        ['metricPeriodEndInput', 'metricPeriodEndDisplay', endIso],
    ];
    pairs.forEach(([nativeId, displayId, iso]) => {
        const native = document.getElementById(nativeId);
        const display = document.getElementById(displayId);
        const value = iso || '';
        if (native) native.value = value;
        if (display) display.value = value ? metricIsoToDisplay(value) : '';
    });
}

function getMetricPeriodIsoValues() {
    return {
        start: document.getElementById('metricPeriodStartInput')?.value || '',
        end: document.getElementById('metricPeriodEndInput')?.value || '',
    };
}

function highlightMetricPeriodPreset(preset) {
    document.querySelectorAll('.metric-period-preset-btn[data-preset]').forEach((btn) => {
        btn.classList.toggle('active', preset && btn.dataset.preset === preset);
    });
}

function detectMetricPeriodPreset(startIso, endIso) {
    if (!startIso || !endIso) return null;
    const now = new Date();
    for (const preset of ['current_month', 'prev_month']) {
        let year = now.getFullYear();
        let month = now.getMonth() + 1;
        if (preset === 'prev_month') {
            if (month === 1) {
                month = 12;
                year -= 1;
            } else {
                month -= 1;
            }
        }
        const bounds = metricMonthBounds(year, month);
        if (bounds.start === startIso && bounds.end === endIso) return preset;
    }
    return null;
}

function clearMetricPeriodPickers() {
    setMetricPeriodDateInputs('', '');
    metricPeriodLastChanged = null;
    highlightMetricPeriodPreset(null);
    const hidden = document.getElementById('metricPeriodInput');
    setMetricPeriodPreviewMessage('');
    if (hidden) hidden.value = '';
}

function syncMetricPeriodFromPickers() {
    const hidden = document.getElementById('metricPeriodInput');
    const { start, end } = getMetricPeriodIsoValues();
    let startIso = start;
    let endIso = end;

    if (startIso) {
        const displayStart = document.getElementById('metricPeriodStartDisplay');
        if (displayStart) displayStart.value = metricIsoToDisplay(startIso);
    }
    if (endIso) {
        const displayEnd = document.getElementById('metricPeriodEndDisplay');
        if (displayEnd) displayEnd.value = metricIsoToDisplay(endIso);
    }

    const state = getMetricPeriodRangeState(startIso, endIso);
    if (state.corrected) {
        endIso = state.endIso;
        const endNative = document.getElementById('metricPeriodEndInput');
        const endDisplay = document.getElementById('metricPeriodEndDisplay');
        if (endNative) endNative.value = endIso;
        if (endDisplay) endDisplay.value = metricIsoToDisplay(endIso);
    }

    if (!state.valid) {
        if (hidden) hidden.value = '';
        setMetricPeriodPreviewMessage(state.message, 'error');
        highlightMetricPeriodPreset(null);
        return '';
    }

    if (startIso && endIso) {
        const canonical = formatMetricPeriodCanonical(startIso, endIso);
        if (hidden) hidden.value = canonical;
        if (state.message) {
            setMetricPeriodPreviewMessage(state.message, state.level);
        } else {
            setMetricPeriodPreviewMessage(`Будет сохранено: ${canonical}`, null);
        }
        highlightMetricPeriodPreset(detectMetricPeriodPreset(startIso, endIso));
        return canonical;
    }

    if (hidden) hidden.value = '';
    setMetricPeriodPreviewMessage(
        (startIso || endIso) ? 'Выберите обе даты периода в календаре' : '',
        (startIso || endIso) ? 'error' : null,
    );
    highlightMetricPeriodPreset(null);
    return '';
}

function applyMetricPeriodFromStored(periodStr) {
    if (!periodStr) {
        clearMetricPeriodPickers();
        return;
    }
    const range = parseStoredPeriodToRange(periodStr);
    if (range) {
        setMetricPeriodDateInputs(range.start, range.end);
    } else {
        clearMetricPeriodPickers();
    }
    syncMetricPeriodFromPickers();
}

function setMetricPeriodPreset(preset) {
    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth() + 1;
    if (preset === 'prev_month') {
        if (month === 1) {
            month = 12;
            year -= 1;
        } else {
            month -= 1;
        }
    }
    const bounds = metricMonthBounds(year, month);
    metricPeriodLastChanged = null;
    setMetricPeriodDateInputs(bounds.start, bounds.end);
    highlightMetricPeriodPreset(preset);
    syncMetricPeriodFromPickers();
}

function openMetricPeriodPicker(inputEl) {
    if (!inputEl) return;
    if (typeof inputEl.showPicker === 'function') {
        try { inputEl.showPicker(); } catch (_) { /* ignore */ }
    }
}

function initMetricPeriodPickers() {
    const pairs = [
        ['metricPeriodStartInput', 'metricPeriodStartDisplay'],
        ['metricPeriodEndInput', 'metricPeriodEndDisplay'],
    ];
    pairs.forEach(([nativeId, displayId]) => {
        const native = document.getElementById(nativeId);
        const display = document.getElementById(displayId);
        if (!native || !display) return;

        const field = nativeId === 'metricPeriodStartInput' ? 'start' : 'end';
        const blockTyping = (event) => {
            if (event.key === 'Tab') return;
            event.preventDefault();
        };
        const openPicker = () => openMetricPeriodPicker(native);
        const onDateChanged = () => {
            metricPeriodLastChanged = field;
            syncMetricPeriodFromPickers();
        };

        native.addEventListener('keydown', blockTyping);
        native.addEventListener('paste', (event) => event.preventDefault());
        native.addEventListener('change', onDateChanged);
        native.addEventListener('click', openPicker);
        native.addEventListener('input', onDateChanged);

        display.addEventListener('keydown', (event) => {
            if (event.key === 'Tab') return;
            event.preventDefault();
            if (event.key === 'Enter' || event.key === ' ') openPicker();
        });
        display.addEventListener('paste', (event) => event.preventDefault());
        display.addEventListener('click', openPicker);
        display.addEventListener('focus', openPicker);
    });
}

function parsePeriodEndDate(raw) {
    const range = parseStoredPeriodToRange(raw);
    if (!range?.end) return null;
    return new Date(`${range.end}T00:00:00`);
}

function isPeriodTooOld(raw, days = 120) {
    const end = parsePeriodEndDate(raw);
    if (!end || Number.isNaN(end.getTime())) return false;
    const diffMs = Date.now() - end.getTime();
    return diffMs > days * 24 * 60 * 60 * 1000;
}

function validateMetricsForm() {
    const errorBox = document.getElementById('metricsFormError');
    const messages = [];
    const budgetRaw = document.getElementById('metricBudgetInput').value;
    const revenueRaw = document.getElementById('metricRevenueInput').value;
    const intFields = [
        ['metricClicksInput', 'Клики'],
        ['metricLeadsInput', 'Заявки'],
        ['metricSalesInput', 'Продажи']
    ];

    if (budgetRaw !== '' && Number(budgetRaw) < 0) messages.push('Бюджет не может быть отрицательным');
    if (revenueRaw !== '' && Number(revenueRaw) < 0) messages.push('Выручка не может быть отрицательной');

    for (const [id, label] of intFields) {
        const raw = document.getElementById(id).value;
        if (raw === '') continue;
        const num = Number(raw);
        if (!Number.isInteger(num) || num < 0) messages.push(`${label} должны быть целым числом ≥ 0`);
    }

    const clicks = document.getElementById('metricClicksInput').value !== '' ? Number(document.getElementById('metricClicksInput').value) : null;
    const leads = document.getElementById('metricLeadsInput').value !== '' ? Number(document.getElementById('metricLeadsInput').value) : null;
    const sales = document.getElementById('metricSalesInput').value !== '' ? Number(document.getElementById('metricSalesInput').value) : null;
    if (clicks != null && leads != null && leads > clicks) messages.push('Заявок не может быть больше кликов');
    if (leads != null && sales != null && sales > leads) messages.push('Продаж не может быть больше заявок');

    const { start: periodStart, end: periodEnd } = getMetricPeriodIsoValues();
    const periodRange = getMetricPeriodRangeState(periodStart, periodEnd, metricPeriodLastChanged);

    if ((periodStart && !periodEnd) || (!periodStart && periodEnd)) {
        messages.push('Выберите дату начала и окончания периода в календаре');
    }
    if (periodStart && periodEnd && !periodRange.valid) {
        messages.push(periodRange.message || 'Дата окончания раньше даты начала');
    }

    const hasAny = [budgetRaw, revenueRaw, ...intFields.map(([id]) => document.getElementById(id).value), periodStart, periodEnd]
        .some(v => String(v || '').trim() !== '');
    if (!hasAny) messages.push('Заполните хотя бы одно поле');

    if (errorBox) {
        if (messages.length) {
            errorBox.style.display = 'block';
            errorBox.textContent = messages.join('. ');
        } else {
            errorBox.style.display = 'none';
            errorBox.textContent = '';
        }
    }
    return messages.length === 0;
}

async function submitMetrics() {
    const previousStep = getGuidedStepSnapshot();
    if (!validateMetricsForm()) return;

    syncMetricPeriodFromPickers();
    const period = document.getElementById('metricPeriodInput')?.value.trim() || '';
    if (!period) {
        showAlert('Укажите корректный период: дата окончания раньше даты начала', 'warning');
        return;
    }
    const budgetVal = document.getElementById('metricBudgetInput').value;
    const clicksVal = document.getElementById('metricClicksInput').value;
    const leadsVal = document.getElementById('metricLeadsInput').value;
    const leadsFormsVal = document.getElementById('metricLeadsFormsInput')?.value ?? '';
    const leadsMessengerVal = document.getElementById('metricLeadsMessengerInput')?.value ?? '';
    const salesVal = document.getElementById('metricSalesInput').value;
    const revenueVal = document.getElementById('metricRevenueInput').value;
    const grossProfitVal = document.getElementById('metricGrossProfitInput')?.value ?? '';
    const marginVal = document.getElementById('metricMarginInput')?.value ?? '';

    const data = {};
    if (period) data.period = period;
    if (budgetVal !== '') data.budget = Number(budgetVal);
    if (clicksVal !== '') data.clicks = parseInt(clicksVal, 10);
    if (leadsFormsVal !== '') data.leads_forms = parseInt(leadsFormsVal, 10);
    if (leadsMessengerVal !== '') data.leads_messenger = parseInt(leadsMessengerVal, 10);
    if (leadsVal !== '') data.leads = parseInt(leadsVal, 10);
    else if (data.leads_forms != null || data.leads_messenger != null) {
        data.leads = (data.leads_forms || 0) + (data.leads_messenger || 0);
    }
    if (salesVal !== '') data.sales = parseInt(salesVal, 10);
    if (revenueVal !== '') data.revenue = Number(revenueVal);
    if (grossProfitVal !== '') data.gross_profit = Number(grossProfitVal);
    if (marginVal !== '') data.margin_percent = Number(marginVal);

    if (period && isPeriodTooOld(period, 120)) {
        showAlert('Период выглядит устаревшим (старше 4 месяцев). Проверьте актуальность данных перед запуском анализа.', 'warning');
    }

    try {
        if (editingMaterialId) {
            const mat = getMaterialById(editingMaterialId);
            const oldRaw = mat?.raw_content ? JSON.parse(mat.raw_content) : {};
            const oldPeriod = String(oldRaw.period || '').trim();
            const newPeriod = String(data.period || '').trim();
            if (oldPeriod && newPeriod && oldPeriod !== newPeriod) {
                const ok = await showConfirmDialog({
                    title: 'Сменился период',
                    message: 'Период изменён. Незаполненные поля не будут перенесены из старого периода. Продолжить?',
                    confirmText: 'Сохранить',
                });
                if (!ok) return;
            }
            await saveMaterialPatch(editingMaterialId, data);
            showAlert('Метрики сохранены', 'success');
        } else {
            const setActive = document.getElementById('metricSetActiveInput')?.checked !== false;
            await apiRequest(`/api/audits/${getCurrentAuditId()}/materials/metrics`, {
                method: 'POST',
                body: JSON.stringify({ ...data, set_active: setActive })
            });
            showAlert('Период метрик добавлен', 'success');
        }
        closeModal('metricsModal');
        resetMaterialForm('metricsModal');
        await refreshAuditAndAdvanceGuidedFlow(previousStep);
    } catch (error) {
        showAlert('Ошибка: ' + error.message, 'danger');
    }
}

async function addMetrics() { return submitMetrics(); }

function formatMetricsExtractPreview(preview) {
    const lines = preview?.preview_lines;
    if (Array.isArray(lines) && lines.length) return lines.join('\n');
    const payload = preview?.payload || {};
    const keys = ['period', 'budget', 'clicks', 'leads', 'sales', 'revenue'];
    return keys
        .filter((k) => payload[k] !== undefined && payload[k] !== null && payload[k] !== '')
        .map((k) => `${METRIC_FIELD_LABELS[k] || k}: ${payload[k]}`)
        .join('\n');
}

async function extractMetricsFromNotesWithConfirm(noteId = null) {
    if (!requireWriteAccess('Перенос метрик из заметок')) return;
    if (!getCurrentAuditId()) return;
    try {
        const qs = noteId != null ? `?note_id=${encodeURIComponent(noteId)}` : '';
        const preview = await apiRequest(
            `/api/audits/${getCurrentAuditId()}/materials/extract-metrics/preview${qs}`
        );
        if (!preview?.can_extract) {
            showAlert(
                'Не удалось найти KPI в заметках или документах. Добавьте период, бюджет, клики и заявки в текст или заполните форму вручную.',
                'warning'
            );
            return;
        }
        const body = formatMetricsExtractPreview(preview);
        const ok = await showConfirmDialog({
            title: noteId != null ? 'Перенести KPI из этой заметки?' : 'Перенести KPI из заметок?',
            message: `Будут записаны в период KPI:\n\n${body}\n\nПроверьте цифры перед сохранением.`,
            confirmText: 'Перенести',
            confirmType: 'primary',
        });
        if (!ok) return;
        const postQs = noteId != null ? `?note_id=${encodeURIComponent(noteId)}` : '';
        await apiRequest(`/api/audits/${getCurrentAuditId()}/materials/extract-metrics${postQs}`, {
            method: 'POST',
        });
        showAlert('Метрики перенесены в период KPI', 'success');
        await refreshAuditAndAdvanceGuidedFlow(null);
    } catch (error) {
        showAlert('Не удалось перенести метрики: ' + (error.message || 'Ошибка'), 'warning');
    }
}

async function extractMetricsFromNoteWithConfirm(noteId) {
    return extractMetricsFromNotesWithConfirm(noteId);
}

async function extractMetricsFromDocuments() {
    return extractMetricsFromNotesWithConfirm();
}

function formatAiExtractPreviewExtras(preview) {
    const lines = [];
    if (preview?.method && preview.method !== 'ai') {
        lines.push(`Режим: ${preview.method === 'heuristic_fallback' ? 'эвристика (AI недоступен)' : preview.method}`);
    }
    if (preview?.model_label) {
        lines.push(`Модель: ${preview.model_label}`);
    }
    if (preview?.cost_rub != null || preview?.cost_usd != null) {
        lines.push(`Оценка стоимости: ${formatRubAmount(preview.cost_rub)} · ${formatUsdAmount(preview.cost_usd)}`);
    }
    if (preview?.ai_notes) {
        lines.push(`Комментарий AI: ${preview.ai_notes}`);
    }
    if (preview?.sources?.length) {
        const src = preview.sources.map((s) => s.title || s.type).join(', ');
        lines.push(`Источники: ${src}`);
    }
    if (preview?.review_reasons?.length) {
        lines.push(`Проверить: ${preview.review_reasons.join('; ')}`);
    }
    return lines.length ? `\n\n${lines.join('\n')}` : '';
}

async function extractMetricsWithAiConfirm(noteId = null, materialId = null) {
    if (!requireWriteAccess('Извлечение KPI через AI')) return;
    if (!getCurrentAuditId()) return;
    if (!runtimeBridge.getPrivacySettings?.()) await runtimeBridge.loadPrivacySettings?.();
    if (!runtimeBridge.getPrivacySettings?.()?.ai?.external_ai_enabled) {
        showAlert('Внешний AI не настроен. Используйте «Перенести KPI из заметок» или заполните метрики вручную.', 'warning');
        return;
    }
    try {
        const params = new URLSearchParams();
        if (noteId != null && noteId !== 'null') params.set('note_id', String(noteId));
        if (materialId != null && materialId !== 'null') params.set('material_id', String(materialId));
        const qs = params.toString() ? `?${params.toString()}` : '';
        const preview = await apiRequest(
            `/api/audits/${getCurrentAuditId()}/materials/extract-metrics/ai/preview${qs}`
        );
        if (!preview?.can_extract) {
            showAlert(
                'AI не нашёл KPI в материалах. Добавьте период, бюджет, клики и заявки в текст или заполните форму вручную.',
                'warning'
            );
            return;
        }
        const body = formatMetricsExtractPreview(preview) + formatAiExtractPreviewExtras(preview);
        const title =
            materialId != null && materialId !== 'null'
                ? 'Извлечь KPI через AI из материала?'
                : noteId != null && noteId !== 'null'
                  ? 'Извлечь KPI через AI из этой заметки?'
                  : 'Извлечь KPI через AI?';
        const ok = await showConfirmDialog({
            title,
            message:
                `Будут записаны в период KPI (с пометкой «требует проверки»):\n\n${body}\n\nПроверьте цифры перед сохранением.`,
            confirmText: 'Извлечь и сохранить',
            confirmType: 'primary',
        });
        if (!ok) return;
        await apiRequest(`/api/audits/${getCurrentAuditId()}/materials/extract-metrics/ai${qs}`, {
            method: 'POST',
        });
        showAlert('KPI извлечены через AI и сохранены в период KPI. Проверьте цифры.', 'success');
        await refreshAuditAndAdvanceGuidedFlow(null);
    } catch (error) {
        showAlert('Не удалось извлечь KPI через AI: ' + (error.message || 'Ошибка'), 'warning');
    }
}

async function cleanupStaleMaterials() {
    if (!requireWriteAccess('Очистка старых материалов')) return;
    if (!getCurrentAuditId()) return;
    const ok = await showConfirmDialog({
        title: 'Очистить старые дубли',
        message: 'Удалить старые дубли документов и метрик? Останутся только последние актуальные.',
        confirmText: 'Очистить',
    });
    if (!ok) return;
    try {
        const result = await apiRequest(`/api/audits/${getCurrentAuditId()}/materials/cleanup-stale`, {
            method: 'POST'
        });
        const deleted = Number(result?.deleted_count || 0);
        if (deleted > 0) {
            showAlert(`Удалено устаревших материалов: ${deleted}`, 'success');
        } else {
            showAlert('Старых дублей не найдено', 'info');
        }
        runtimeBridge.loadAuditDetail?.();
    } catch (error) {
        showAlert('Не удалось очистить дубли: ' + (error.message || 'Ошибка'), 'warning');
    }
}

async function addDocument() {
    if (!requireWriteAccess('Загрузка документа')) return;
    const auditId = getCurrentAuditId();
    if (!auditId) {
        showAlert('Карточка аудита ещё загружается — подождите 2–3 секунды и нажмите «Загрузить» снова.', 'warning');
        return;
    }
    const previousStep = getGuidedStepSnapshot();
    const fileInput = document.getElementById('documentFileInput');
    const title = document.getElementById('documentTitle').value || 'Документ';
    const file = fileInput?.files?.[0];
    if (!file) {
        showAlert('Выберите файл документа', 'warning');
        return;
    }
    const maxMb = Number(window.__MAX_UPLOAD_MB) || 50;
    const maxBytes = maxMb * 1024 * 1024;
    if (file.size > maxBytes) {
        showAlert(
            `Файл слишком большой (${(file.size / (1024 * 1024)).toFixed(1)} МБ). Максимум ${maxMb} МБ. `
            + 'Сожмите PDF, разбейте на части или вставьте нужный фрагмент в заметку.',
            'warning',
        );
        return;
    }
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    const uploadBtn = document.querySelector('#documentModal .btn-primary');
    if (uploadBtn) uploadBtn.disabled = true;
    try {
        showLoader();
        const bigFile = file.size > 5 * 1024 * 1024;
        setDocumentUploadStatus(
            bigFile
                ? 'Загрузка и разбор файла… Большие PDF/xlsx могут занять 1–2 минуты, не закрывайте вкладку.'
                : 'Загрузка и разбор файла…',
        );
        const controller = new AbortController();
        const timeoutMs = Math.max(120000, Math.min(600000, 60000 + file.size / 1024));
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        const result = await apiFetch(`/api/audits/${auditId}/materials/document`, {
            method: 'POST',
            body: formData,
            signal: controller.signal,
        });
        clearTimeout(timer);
        closeModal('documentModal');
        fileInput.value = '';
        document.getElementById('documentTitle').value = '';
        documentIssueContext = null;
        await refreshAuditAndAdvanceGuidedFlow(previousStep);
        const slice = parseDocumentSlice(result);
        const months = slice?.monthly?.length || 0;
        const sliceNote = slice?.format === 'yandex_direct_xlsx'
            ? (months >= 2
                ? ` Распознан отчёт Директа: ${months} месяцев импортированы в KPI (проверьте цифры).`
                : ' Распознан отчёт Директа — проверьте срез и KPI.')
            : '';
        const reviewNote = result?.needs_review && result?.review_reason
            ? ` Требует проверки: ${result.review_reason}`
            : '';
        showAlert(`Документ загружен.${sliceNote}${reviewNote}`, result?.needs_review ? 'warning' : 'success');
        if (slice?.format === 'yandex_direct_xlsx') {
            await maybeAutoSyncDirectHealthAfterExcelUpload();
        }
    } catch (error) {
        if (error?.name === 'AbortError') {
            showAlert(
                'Превышено время ожидания. Файл слишком тяжёлый для разбора — используйте меньший файл или вставьте текст в заметку.',
                'danger',
            );
        } else {
            const msg = String(error?.message || 'Ошибка');
            const hint = msg.includes('большой') || msg.includes('413')
                ? ' Попробуйте файл меньше или заметку с выдержкой.'
                : (msg.includes('таймаут') || msg.includes('время')
                    ? ' Попробуйте csv/xlsx вместо pdf или сократите файл.'
                    : '');
            showAlert('Не удалось загрузить документ: ' + msg + hint, 'danger');
        }
        console.error('[document_upload]', error);
    } finally {
        if (uploadBtn) uploadBtn.disabled = false;
        setDocumentUploadStatus('');
        hideLoader();
    }
}

async function deleteMaterial(materialId) {
    if (!requireWriteAccess('Удаление материала')) return;
    const ok = await showConfirmDialog({
        title: 'Удалить материал',
        message: 'Материал будет удалён из этого аудита.',
        confirmText: 'Удалить',
    });
    if (!ok) return;
    
    try {
        await apiRequest(`/api/audits/${getCurrentAuditId()}/materials/${materialId}`, { method: 'DELETE' });
        runtimeBridge.loadAuditDetail?.();
        showAlert('Материал удалён', 'success');
    } catch (error) {
        showAlert('Ошибка: ' + error.message, 'danger');
    }
}
function getEditingMaterialId() { return editingMaterialId; }
function setEditingMaterialId(id) { editingMaterialId = id; }
function clearEditingMaterialId() { editingMaterialId = null; }
function getDocumentIssueContext() { return documentIssueContext; }
function setDocumentIssueContext(v) { documentIssueContext = v; }

export {
    openNewMaterial,
    applyDocumentModalGuidance,
    resetMaterialForm,
    getMaterialById,
    openDocumentMaterialById,
    openDocumentMaterial,
    editDocumentText,
    editMaterial,
    saveMaterialPatch,
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
    deleteMaterial,
    fillMetricsForm,
    setModalSubmitLabel,
    applyMetricPeriodFromStored,
    getEditingMaterialId,
    setEditingMaterialId,
    clearEditingMaterialId,
    getDocumentIssueContext,
    setDocumentIssueContext,
    findOcrMaterial,
    importDirectPeriodsFromPreview,
};
