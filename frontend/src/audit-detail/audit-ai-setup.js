/** Ops health page + AI model selectors and cost estimate (extracted from card.js). */
import { escapeHtml } from '../core/utils.js';
import { apiRequest } from '../core/api.js';
import { canWrite } from '../core/auth.js';
import { runtimeBridge } from '../core/runtime-bridge.js';
import { formatTokenCount, formatRubAmount, formatUsdAmount } from '../shared/ai-usage.js';

let opsHealthTimerId = null;
let aiModelCatalog = null;
let aiCostEstimateTimer = null;

const AI_MODEL_STORAGE = {
    analysis: 'ppc_ai_model_analysis',
    chat: 'ppc_ai_model_chat',
};

const AI_CONTEXT_STORAGE = 'ppc_ai_context_options';

const AI_CONTEXT_DEFAULTS = {
    send_direct_summary: true,
    send_notes: false,
    send_screenshots_ocr: false,
    send_setup_screenshots: false,
    send_direct_campaign_detail: false,
    send_direct_conditions: false,
    send_other_documents: false,
};

function loadStoredAiContextOptions() {
    try {
        const raw = localStorage.getItem(AI_CONTEXT_STORAGE);
        if (!raw) return { ...AI_CONTEXT_DEFAULTS };
        const parsed = JSON.parse(raw);
        return { ...AI_CONTEXT_DEFAULTS, ...parsed };
    } catch {
        return { ...AI_CONTEXT_DEFAULTS };
    }
}

function saveStoredAiContextOptions(opts) {
    try {
        localStorage.setItem(AI_CONTEXT_STORAGE, JSON.stringify(opts));
    } catch {
        /* ignore quota */
    }
}

function countAuditMaterials(predicate) {
    const materials = runtimeBridge.getAuditData?.()?.materials || [];
    return materials.filter((m) => m && !m.excluded_from_analysis && predicate(m)).length;
}

/** OCR хранится в скрытом sibling screenshot_ocr — считаем по тексту, не по типу в списке «В AI». */
function screenshotOcrText(materials, screenshot) {
    const label = `OCR/описание: ${screenshot.title || ''}`;
    const ocr = (materials || []).find((o) => o.type === 'screenshot_ocr' && o.title === label);
    return (ocr?.extracted_text || ocr?.raw_content || '').trim();
}

function countScreenshotsWithOcrText() {
    const materials = runtimeBridge.getAuditData?.()?.materials || [];
    return materials.filter(
        (m) => m.type === 'screenshot'
            && !m.excluded_from_analysis
            && screenshotOcrText(materials, m).length >= 8,
    ).length;
}

function hasDirectSummaryAvailable() {
    const da = runtimeBridge.getAuditData?.()?.direct_analytics;
    return Boolean(da?.health?.score != null || (da?.monthly || []).length);
}

export function readAiContextOptionsFromModal() {
    const hasDirect = hasDirectSummaryAvailable();
    return {
        send_direct_summary: hasDirect ? true : Boolean(document.getElementById('aiSendDirectSummary')?.checked),
        send_notes: Boolean(document.getElementById('aiSendNotes')?.checked),
        send_screenshots_ocr: Boolean(document.getElementById('aiSendScreenshotsOcr')?.checked),
        send_setup_screenshots: Boolean(document.getElementById('aiSendSetupScreenshots')?.checked),
        send_direct_campaign_detail: Boolean(document.getElementById('aiSendDirectCampaignDetail')?.checked),
        send_direct_conditions: Boolean(document.getElementById('aiSendDirectConditions')?.checked),
        send_other_documents: Boolean(document.getElementById('aiSendOtherDocuments')?.checked),
    };
}

export function applyAiContextOptionsToModal(stored) {
    const opts = { ...AI_CONTEXT_DEFAULTS, ...stored };
    const hasDirect = hasDirectSummaryAvailable();
    const directCb = document.getElementById('aiSendDirectSummary');
    const directRow = document.getElementById('aiCtxDirectSummaryRow');
    if (directCb) {
        directCb.checked = hasDirect || opts.send_direct_summary;
        directCb.disabled = hasDirect;
    }
    if (directRow) {
        directRow.classList.toggle('privacy-locked', hasDirect);
        directRow.classList.toggle('privacy-muted', !hasDirect);
    }

    const map = [
        ['aiSendNotes', 'send_notes'],
        ['aiSendScreenshotsOcr', 'send_screenshots_ocr'],
        ['aiSendSetupScreenshots', 'send_setup_screenshots'],
        ['aiSendDirectCampaignDetail', 'send_direct_campaign_detail'],
        ['aiSendDirectConditions', 'send_direct_conditions'],
        ['aiSendOtherDocuments', 'send_other_documents'],
    ];
    map.forEach(([id, key]) => {
        const el = document.getElementById(id);
        if (el) el.checked = Boolean(opts[key]);
    });

    const notesN = countAuditMaterials((m) => m.type === 'text_note');
    const ocrN = countScreenshotsWithOcrText();
    const setupN = countAuditMaterials((m) => m.type === 'screenshot');
    const docsN = countAuditMaterials((m) => ['document', 'table', 'pdf', 'docx', 'text'].includes(m.type));

    const setCount = (id, n, label) => {
        const el = document.getElementById(id);
        if (el) el.textContent = n ? `(${n} ${label})` : '(нет)';
    };
    setCount('aiCtxNotesCount', notesN, notesN === 1 ? 'шт.' : 'шт.');
    setCount('aiCtxOcrCount', ocrN, 'шт.');
    setCount('aiCtxSetupCount', setupN, 'шт.');
    setCount('aiCtxDocsCount', docsN, 'шт.');

    const disableRow = (rowId, cbId, n) => {
        const row = document.getElementById(rowId);
        const cb = document.getElementById(cbId);
        if (cb) {
            cb.disabled = n === 0;
            if (n === 0) cb.checked = false;
        }
        if (row) row.classList.toggle('privacy-muted', n === 0);
    };
    disableRow('aiCtxNotesRow', 'aiSendNotes', notesN);
    disableRow('aiCtxOcrRow', 'aiSendScreenshotsOcr', ocrN);
    disableRow('aiCtxSetupRow', 'aiSendSetupScreenshots', setupN);
    disableRow('aiCtxDocsRow', 'aiSendOtherDocuments', docsN);
    disableRow('aiCtxCampaignsRow', 'aiSendDirectCampaignDetail', hasDirect ? 1 : 0);
    disableRow('aiCtxConditionsRow', 'aiSendDirectConditions', hasDirect ? 1 : 0);
}

export function initAiContextOptionsPanel() {
    const stored = loadStoredAiContextOptions();
    const derived = deriveAiContextOptionsFromMaterials();
    const merged = { ...stored };
    if (derived.send_screenshots_ocr) merged.send_screenshots_ocr = true;
    if (derived.send_setup_screenshots) merged.send_setup_screenshots = true;
    if (derived.send_notes) merged.send_notes = true;
    applyAiContextOptionsToModal(merged);
}

export function bindAiContextOptionListeners() {
    if (window._aiContextOptionsBound) return;
    window._aiContextOptionsBound = true;
    const ids = [
        'aiSendDirectSummary',
        'aiSendNotes',
        'aiSendScreenshotsOcr',
        'aiSendSetupScreenshots',
        'aiSendDirectCampaignDetail',
        'aiSendDirectConditions',
        'aiSendOtherDocuments',
    ];
    ids.forEach((id) => {
        document.getElementById(id)?.addEventListener('change', () => {
            saveStoredAiContextOptions(readAiContextOptionsFromModal());
            scheduleAiCostEstimateRefresh();
        });
    });
}

export async function loadOpsHealthPage() {
    const windowHours = Number(document.getElementById('opsHealthWindow')?.value || 24);
    const api5xxEl = document.getElementById('opsApi5xxHour');
    const failedTotalEl = document.getElementById('opsFailedTotal');
    const byActionEl = document.getElementById('opsFailedByAction');
    const alertsEl = document.getElementById('opsHealthAlerts');
    const updatedAtEl = document.getElementById('opsHealthUpdatedAt');
    if (!api5xxEl || !failedTotalEl || !byActionEl || !alertsEl) return;
    try {
        const data = await apiRequest(`/api/telemetry/ops?hours=${windowHours}`);
        const api5xx = Number(data?.in_memory?.api_5xx_last_hour || 0);
        const failedTotal = Number(data?.failed_runs?.total || 0);
        const byAction = data?.failed_runs?.by_action || {};
        const alerts = Array.isArray(data?.alerts) ? data.alerts : [];

        api5xxEl.textContent = String(api5xx);
        failedTotalEl.textContent = String(failedTotal);
        const rows = Object.entries(byAction)
            .sort((a, b) => Number(b[1]) - Number(a[1]))
            .map(([action, count]) => `${action}: ${count}`);
        byActionEl.textContent = rows.length ? rows.join(' · ') : 'Нет ошибок запусков';

        if (!alerts.length) {
            alertsEl.innerHTML = '';
        } else {
            const hasCritical = alerts.some((a) => String(a?.severity || '').toLowerCase() === 'critical');
            alertsEl.innerHTML = `
                <div class="ops-alert-banner ${hasCritical ? 'critical' : ''}">
                    <p class="ops-alert-title">Оповещения (${windowHours}ч)</p>
                    ${alerts.map((a) => `<p class="ops-alert-line">${escapeHtml(a.message || '')}</p>`).join('')}
                </div>
            `;
        }
        if (updatedAtEl) {
            updatedAtEl.textContent = `Последнее обновление: ${new Date().toLocaleTimeString('ru-RU')}`;
        }
    } catch (error) {
        alertsEl.innerHTML = `<div class="ops-alert-banner critical"><p class="ops-alert-title">Не удалось загрузить здоровье системы</p><p class="ops-alert-line">${escapeHtml(error.message || 'Ошибка')}</p></div>`;
        if (updatedAtEl) {
            updatedAtEl.textContent = `Последнее обновление: ошибка в ${new Date().toLocaleTimeString('ru-RU')}`;
        }
    }
}

export function toggleOpsHealthAutoRefresh() {
    const checkbox = document.getElementById('opsHealthAutoRefresh');
    const enabled = Boolean(checkbox?.checked);
    if (opsHealthTimerId) {
        clearInterval(opsHealthTimerId);
        opsHealthTimerId = null;
    }
    if (enabled) {
        opsHealthTimerId = setInterval(() => {
            if (window.location.pathname === '/ops-health') {
                loadOpsHealthPage();
            }
        }, 30000);
    }
}

export async function loadAiModelCatalog() {
    if (aiModelCatalog) return aiModelCatalog;
    try {
        aiModelCatalog = await apiRequest('/api/ai/models');
    } catch (error) {
        console.warn('AI model catalog load error:', error);
        aiModelCatalog = { models: [], local_mode: true, default_model_id: 'gpt-4o' };
    }
    return aiModelCatalog;
}

function populateModelSelect(selectEl, scope) {
    if (!selectEl || !aiModelCatalog) return;
    const models = Array.isArray(aiModelCatalog.models) ? aiModelCatalog.models : [];
    const localMode = Boolean(aiModelCatalog.local_mode);
    selectEl.innerHTML = '';
    if (localMode) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'Локальный режим (без API)';
        selectEl.appendChild(opt);
        selectEl.disabled = true;
        return;
    }
    models.forEach((model) => {
        const opt = document.createElement('option');
        opt.value = model.id;
        opt.textContent = model.label;
        opt.disabled = !model.available;
        if (!model.available && model.disabled_reason) opt.title = model.disabled_reason;
        selectEl.appendChild(opt);
    });
    selectEl.disabled = !canWrite();
    applyStoredModelSelection(scope);
    selectEl.onchange = () => saveModelSelection(scope, selectEl.value);
}

function applyStoredModelSelection(scope) {
    const selectId = scope === 'chat' ? 'chatModelSelect' : 'aiModelSelect';
    const selectEl = document.getElementById(selectId);
    if (!selectEl || !aiModelCatalog) return;
    const storageKey = AI_MODEL_STORAGE[scope];
    const stored = localStorage.getItem(storageKey);
    const fallback = aiModelCatalog.default_model_id;
    const candidate = stored || fallback;
    const exists = Array.from(selectEl.options).some((opt) => opt.value === candidate && !opt.disabled);
    if (exists) selectEl.value = candidate;
}

function saveModelSelection(scope, modelId) {
    const storageKey = AI_MODEL_STORAGE[scope];
    if (!storageKey || !modelId) return;
    localStorage.setItem(storageKey, modelId);
}

export function getSelectedModelId(scope) {
    const selectId = scope === 'chat' ? 'chatModelSelect' : 'aiModelSelect';
    const selectEl = document.getElementById(selectId);
    const value = selectEl?.value;
    if (value) return value;
    return localStorage.getItem(AI_MODEL_STORAGE[scope]) || aiModelCatalog?.default_model_id || null;
}

export function updateAiPrivacyProviderLabel() {
    const providerName = document.getElementById('aiPrivacyProviderName');
    if (!providerName) return;
    const privacySettings = runtimeBridge.getPrivacySettings?.();
    const external = Boolean(privacySettings?.ai?.external_ai_enabled);
    if (!external || aiModelCatalog?.local_mode) {
        providerName.textContent = 'безопасный локальный анализ';
        return;
    }
    const select = document.getElementById('aiModelSelect');
    const label = select?.selectedOptions?.[0]?.textContent || 'ProxyAPI';
    providerName.textContent = `ProxyAPI → ${label}`;
}

export async function initAiModelSelectors() {
    await loadAiModelCatalog();
    populateModelSelect(document.getElementById('aiModelSelect'), 'analysis');
    populateModelSelect(document.getElementById('chatModelSelect'), 'chat');
    updateAiPrivacyProviderLabel();
    bindAiCostEstimateListeners();
    bindAiContextOptionListeners();
}

function formatRubRange(minVal, maxVal) {
    const min = formatRubAmount(minVal);
    const max = formatRubAmount(maxVal);
    if (minVal == null || maxVal == null) return '—';
    if (String(minVal) === String(maxVal)) return min;
    const minBare = min.replace(/\s*₽$/, '');
    return `${minBare} – ${max}`;
}

function formatUsdRange(minVal, maxVal) {
    const min = formatUsdAmount(minVal);
    const max = formatUsdAmount(maxVal);
    if (minVal == null || maxVal == null) return '';
    if (String(minVal) === String(maxVal)) return min;
    return `${min} – ${max}`;
}

function renderAiCostEstimate(estimate) {
    const panel = document.getElementById('aiCostEstimatePanel');
    const body = document.getElementById('aiCostEstimateBody');
    const modelEl = document.getElementById('aiCostEstimateModel');
    const noteEl = document.getElementById('aiCostEstimateNote');
    if (!panel || !body) return;

    panel.classList.remove('is-local', 'is-high', 'is-loading');

    if (!estimate) {
        if (modelEl) modelEl.textContent = '';
        if (noteEl) noteEl.textContent = '';
        body.innerHTML = '<p class="ai-cost-estimate__error">Не удалось оценить стоимость. Попробуйте обновить страницу.</p>';
        return;
    }

    if (estimate.local_mode) {
        panel.classList.add('is-local');
        if (modelEl) modelEl.textContent = '';
        if (noteEl) noteEl.textContent = '';
        body.innerHTML = `<p class="ai-cost-estimate__placeholder">${escapeHtml(estimate.disclaimer || 'Локальный режим — без списания с ProxyAPI.')}</p>`;
        return;
    }

    if (modelEl) modelEl.textContent = estimate.model_label || '';

    const promptTokens = formatTokenCount(estimate.estimated_prompt_tokens);
    const completionMin = formatTokenCount(estimate.estimated_completion_tokens_min);
    const completionMax = formatTokenCount(estimate.estimated_completion_tokens_max);
    const totalRub = formatRubRange(estimate.cost_rub_min, estimate.cost_rub_max);
    const totalUsd = formatUsdRange(estimate.cost_usd_min, estimate.cost_usd_max);

    body.innerHTML = `
        <div class="ai-cost-estimate__total">
            <span class="ai-cost-estimate__total-label">Итого (ориентир)</span>
            <span class="ai-cost-estimate__total-value">
                <strong>${escapeHtml(totalRub)}</strong>
                ${totalUsd ? `<span class="ai-cost-estimate__usd">${escapeHtml(totalUsd)}</span>` : ''}
            </span>
        </div>
        <dl class="ai-cost-estimate__breakdown">
            <div class="ai-cost-estimate__row">
                <dt>Вход · ваш контекст</dt>
                <dd>
                    ~${promptTokens} токенов
                    <span class="ai-cost-estimate__sub">${escapeHtml(formatRubAmount(estimate.cost_input_rub))}${estimate.cost_input_usd ? ` · ${escapeHtml(formatUsdAmount(estimate.cost_input_usd))}` : ''}</span>
                </dd>
            </div>
            <div class="ai-cost-estimate__row">
                <dt>Ответ · JSON-анализ</dt>
                <dd>
                    ~${completionMin}–${completionMax} токенов
                    <span class="ai-cost-estimate__sub">${escapeHtml(formatRubRange(estimate.cost_output_rub_min, estimate.cost_output_rub_max))}${estimate.cost_output_usd_min ? ` · ${escapeHtml(formatUsdRange(estimate.cost_output_usd_min, estimate.cost_output_usd_max))}` : ''}</span>
                </dd>
            </div>
        </dl>
    `;

    if (noteEl) {
        noteEl.textContent = 'Списание — в личном кабинете ProxyAPI. Оценка может отличаться от факта.';
    }

    const rubMax = Number(estimate.cost_rub_max);
    if (!Number.isNaN(rubMax) && rubMax >= 500) panel.classList.add('is-high');
}

function setAiCostEstimateLoading() {
    const panel = document.getElementById('aiCostEstimatePanel');
    const body = document.getElementById('aiCostEstimateBody');
    const modelEl = document.getElementById('aiCostEstimateModel');
    const noteEl = document.getElementById('aiCostEstimateNote');
    if (!panel || !body) return;
    panel.classList.add('is-loading');
    panel.classList.remove('is-local', 'is-high');
    if (modelEl) modelEl.textContent = '';
    if (noteEl) noteEl.textContent = '';
    body.innerHTML = '<p class="ai-cost-estimate__placeholder">Считаем оценку…</p>';
}

export function buildAnalysisEstimatePayload() {
    const sendRevenueSales = document.getElementById('aiSendRevenueSales')?.checked || false;
    const aiTemperature = Number(document.getElementById('aiTemperatureRange')?.value || 0.3);
    const contextOpts = readAiContextOptionsFromModal();
    return {
        model_id: getSelectedModelId('analysis'),
        privacy_options: {
            send_revenue_sales: sendRevenueSales,
            hide_revenue: !sendRevenueSales,
            ai_temperature: aiTemperature,
            ...contextOpts,
        },
    };
}

export function deriveAiContextOptionsFromMaterials() {
    const materials = runtimeBridge.getAuditData?.()?.materials || [];
    const included = (m) => m && !m.excluded_from_analysis;
    const hasType = (t) => materials.some((m) => included(m) && m.type === t);
    const hasDirect = hasDirectSummaryAvailable();
    return {
        send_direct_summary: hasDirect,
        send_notes: hasType('text_note'),
        send_screenshots_ocr: materials.some(
            (m) => included(m) && m.type === 'screenshot' && screenshotOcrText(materials, m).length >= 8,
        ),
        send_setup_screenshots: materials.some((m) => included(m) && m.type === 'screenshot'),
        send_direct_campaign_detail: hasDirect,
        send_direct_conditions: hasDirect,
        send_other_documents: materials.some(
            (m) => included(m) && ['document', 'table', 'pdf', 'docx', 'text'].includes(m.type),
        ),
    };
}

export function buildAnalysisPrivacyPayload({ sendRevenueSales, aiTemperature, aiConsent }) {
    const contextOpts = deriveAiContextOptionsFromMaterials();
    saveStoredAiContextOptions(contextOpts);
    return {
        model_id: getSelectedModelId('analysis'),
        privacy_options: {
            ai_consent: aiConsent,
            send_metrics: true,
            send_business_category: true,
            send_revenue_sales: sendRevenueSales,
            hide_revenue: !sendRevenueSales,
            hide_company_name: true,
            hide_contacts: true,
            hide_file_urls: true,
            ai_temperature: aiTemperature,
            model_id: getSelectedModelId('analysis'),
            ...contextOpts,
        },
    };
}

const AI_ESTIMATE_TIMEOUT_MS = 25_000;

export async function refreshAiCostEstimate() {
    const auditId = runtimeBridge.getCurrentAuditId?.();
    if (!auditId) return;
    setAiCostEstimateLoading();
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller
        ? setTimeout(() => controller.abort(), AI_ESTIMATE_TIMEOUT_MS)
        : null;
    try {
        const estimate = await apiRequest(`/api/audits/${auditId}/analyze/estimate`, {
            method: 'POST',
            body: JSON.stringify(buildAnalysisEstimatePayload()),
            signal: controller?.signal,
        });
        renderAiCostEstimate(estimate);
    } catch (error) {
        console.warn('AI cost estimate error:', error);
        const panel = document.getElementById('aiCostEstimateBody');
        if (panel && error?.name === 'AbortError') {
            panel.innerHTML = '<p class="ai-cost-estimate__error">Оценка заняла слишком долго. Снимите лишние галочки или повторите.</p>';
            return;
        }
        renderAiCostEstimate(null);
    } finally {
        if (timer) clearTimeout(timer);
    }
}

export function scheduleAiCostEstimateRefresh() {
    if (aiCostEstimateTimer) clearTimeout(aiCostEstimateTimer);
    aiCostEstimateTimer = setTimeout(() => refreshAiCostEstimate(), 280);
}

export function bindAiCostEstimateListeners() {
    if (window._aiCostEstimateBound) return;
    window._aiCostEstimateBound = true;
    document.getElementById('aiModelSelect')?.addEventListener('change', () => {
        updateAiPrivacyProviderLabel();
        scheduleAiCostEstimateRefresh();
    });
    document.getElementById('aiSendRevenueSales')?.addEventListener('change', scheduleAiCostEstimateRefresh);
    document.getElementById('aiTemperatureRange')?.addEventListener('input', scheduleAiCostEstimateRefresh);
    document.getElementById('aiTemperatureRange')?.addEventListener('change', scheduleAiCostEstimateRefresh);
}
