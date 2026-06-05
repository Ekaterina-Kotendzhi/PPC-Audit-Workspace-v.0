/** Report tab: commercial offer, analytics readiness, audit plan (extracted from card.js). */
import { escapeHtml, humanizeDisplayText } from '../core/utils.js';
import { showAlert } from '../core/alerts.js';
import { apiRequest } from '../core/api.js';
import { requireWriteAccess } from '../core/auth.js';
import { runtimeBridge } from '../core/runtime-bridge.js';
import { periodLabelPrepositionS } from '../shared/period-label.js';
import { reportPriorityLabel } from './report-helpers.js';
import { getCurrentScreenState, hasGuidedCompletedAnalysis } from './workflow.js';

function getAuditData() {
    return runtimeBridge.getAuditData?.() || null;
}

function getCurrentAuditId() {
    return runtimeBridge.getCurrentAuditId?.() || null;
}

function hasReportOutputEditable() {
    const data = getAuditData();
    return Boolean(
        data?.audit_summary
        || data?.commercial_offer
        || data?.analysis_freshness?.last_analysis_at
        || hasGuidedCompletedAnalysis(data),
    );
}

function renderOfferPreviewBlock(offer, auditPlan) {
    const forecastHtml = renderForecastScenariosHtml(auditPlan, offer);
    return `
        <div class="offer-block offer-block--preview">
            <h3>${escapeHtml(humanizeDisplayText(offer.proposal_title))}</h3>
            <p class="offer-services-note muted">Предлагаемые работы (коммерческий план), не статус загрузки данных аудита.</p>
            <p class="offer-services-label"><strong>Этапы работ:</strong></p>
            <ul class="services-list">
                ${(offer.recommended_services || []).map((s) => `<li>${escapeHtml(s)}</li>`).join('')}
            </ul>
            <p><strong>Ожидаемый эффект:</strong> ${escapeHtml(offer.sales_argument || '')}</p>
            <p><strong>Расчётный срок:</strong> ${offer.estimated_work_days != null ? `${offer.estimated_work_days} дней` : '—'}</p>
            <p><strong>Следующий шаг:</strong> ${escapeHtml(offer.next_step || '')}</p>
            ${forecastHtml}
        </div>`;
}

function renderOfferEditForm(offer, editable) {
    if (!editable) {
        return '<p class="muted">Редактирование КП доступно после успешного AI-анализа.</p>';
    }
    const services = (offer?.recommended_services || []).join('\n');
    return `
        <div class="report-output-edit-form" id="reportOfferEditForm">
            <div class="form-group">
                <label for="editOfferTitle">Заголовок КП</label>
                <input type="text" id="editOfferTitle" class="form-control" value="${escapeHtml(offer?.proposal_title || '')}">
            </div>
            <div class="form-group">
                <label for="editOfferServices">Этапы работ (по одному на строку)</label>
                <textarea id="editOfferServices" class="form-control" rows="5">${escapeHtml(services)}</textarea>
            </div>
            <div class="form-group">
                <label for="editOfferSalesArgument">Ожидаемый эффект</label>
                <textarea id="editOfferSalesArgument" class="form-control" rows="2">${escapeHtml(offer?.sales_argument || '')}</textarea>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="editOfferDays">Срок (дней)</label>
                    <input type="number" id="editOfferDays" class="form-control" min="1" max="365" value="${offer?.estimated_work_days ?? ''}">
                </div>
            </div>
            <div class="form-group">
                <label for="editOfferNextStep">Следующий шаг</label>
                <input type="text" id="editOfferNextStep" class="form-control" value="${escapeHtml(offer?.next_step || '')}">
            </div>
            <button type="button" class="btn btn-primary btn-sm" onclick="saveReportCommercialOffer()">Сохранить КП</button>
        </div>`;
}

export function renderCommercialOffer(offer, containerId = 'offerContainer', coverage, options = {}) {
    const { hideWhenPendingReview = true } = options;
    const container = document.getElementById(containerId);
    const offerCard = document.getElementById('reportOfferCard');
    const onReportTab = containerId === 'reportOfferContainer';
    if (!container) return;
    if (hideWhenPendingReview && getCurrentScreenState() === 'RESULTS_NEED_REVIEW') {
        container.innerHTML = '';
        container.style.display = 'none';
        return;
    }
    container.style.display = '';
    if (offerCard && onReportTab) {
        offerCard.style.display = coverage?.is_preliminary ? 'none' : 'block';
    }
    if (coverage?.is_preliminary) {
        container.innerHTML = '<p class="ui-empty-muted">План работ появится после добавления данных и AI-анализа.</p>';
        return;
    }
    if (!offer && !hasReportOutputEditable()) {
        container.innerHTML = '<p class="ui-empty-muted">План работ появится после AI-анализа.</p>';
        return;
    }

    const auditData = getAuditData();
    const editable = hasReportOutputEditable();
    const preview = offer ? renderOfferPreviewBlock(offer, auditData?.audit_plan) : '';
    const editBlock = onReportTab
        ? `<details class="report-output-edit-details">
            <summary>Редактировать коммерческое предложение</summary>
            ${renderOfferEditForm(offer || {}, editable)}
           </details>`
        : '';
    container.innerHTML = `${preview || '<p class="muted">КП ещё не сформировано — запустите AI-анализ.</p>'}${editBlock}`;
}

export function toggleReportSummaryEdit(forceOpen) {
    const details = document.getElementById('reportSummaryEditDetails');
    if (!details) {
        showAlert('Сначала запустите AI-анализ — появится форма редактирования.', 'warning');
        return;
    }
    if (forceOpen === true) {
        details.open = true;
    } else if (forceOpen === false) {
        details.open = false;
    } else {
        details.open = !details.open;
    }
    if (details.open) {
        details.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        document.getElementById('editSummaryProblem')?.focus();
    }
}

export function renderReportSummaryEditor(summary, coverage) {
    const host = document.getElementById('reportSummaryEditHost');
    if (!host) return;
    if (coverage?.is_preliminary) {
        host.innerHTML = '<p class="muted report-edit-hint">Редактирование появится после AI-анализа (не предпросмотр).</p>';
        return;
    }
    const editable = hasReportOutputEditable();
    const s = summary || {};
    const priority = String(s.priority || 'medium').toLowerCase();
    host.innerHTML = `
        <details id="reportSummaryEditDetails" class="report-output-edit-details"${editable ? ' open' : ''}>
            <summary>Форма редактирования</summary>
            ${editable ? `
            <div class="report-output-edit-form" id="reportSummaryEditForm">
                <div class="form-group">
                    <label for="editSummaryProblem">Суть</label>
                    <textarea id="editSummaryProblem" class="form-control" rows="2">${escapeHtml(s.client_problem || '')}</textarea>
                </div>
                <div class="form-group">
                    <label for="editSummaryRisk">Если не исправить</label>
                    <textarea id="editSummaryRisk" class="form-control" rows="2">${escapeHtml(s.main_risk || '')}</textarea>
                </div>
                <div class="form-group">
                    <label for="editSummaryPriority">Приоритет</label>
                    <select id="editSummaryPriority" class="form-control">
                        <option value="high" ${priority === 'high' ? 'selected' : ''}>${escapeHtml(reportPriorityLabel('high'))}</option>
                        <option value="medium" ${priority === 'medium' ? 'selected' : ''}>${escapeHtml(reportPriorityLabel('medium'))}</option>
                        <option value="low" ${priority === 'low' ? 'selected' : ''}>${escapeHtml(reportPriorityLabel('low'))}</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="editSummaryConclusion">Следующий шаг</label>
                    <textarea id="editSummaryConclusion" class="form-control" rows="2">${escapeHtml(s.short_conclusion || '')}</textarea>
                </div>
                <button type="button" class="btn btn-primary btn-sm" onclick="saveReportAuditSummary()">Сохранить краткий вывод</button>
            </div>` : '<p class="muted">Сначала запустите AI-анализ.</p>'}
        </details>`;
}

function collectOfferPatchPayload() {
    const servicesRaw = document.getElementById('editOfferServices')?.value || '';
    const daysRaw = document.getElementById('editOfferDays')?.value;
    const days = daysRaw === '' || daysRaw == null ? null : Number(daysRaw);
    return {
        proposal_title: document.getElementById('editOfferTitle')?.value?.trim() || '',
        recommended_services: servicesRaw.split('\n').map((s) => s.trim()).filter(Boolean),
        sales_argument: document.getElementById('editOfferSalesArgument')?.value?.trim() || '',
        estimated_work_days: Number.isFinite(days) ? days : null,
        next_step: document.getElementById('editOfferNextStep')?.value?.trim() || '',
    };
}

export async function saveReportCommercialOffer() {
    if (!requireWriteAccess('сохранение КП')) return;
    const currentAuditId = getCurrentAuditId();
    if (!currentAuditId) return;
    const payload = { commercial_offer: collectOfferPatchPayload() };
    try {
        const updated = await apiRequest(`/api/audits/${currentAuditId}/report-output`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
        });
        const auditData = getAuditData();
        if (auditData && updated?.commercial_offer) {
            auditData.commercial_offer = updated.commercial_offer;
            renderCommercialOffer(
                auditData.commercial_offer,
                'reportOfferContainer',
                auditData.data_coverage,
                { hideWhenPendingReview: false },
            );
            renderCommercialOffer(
                auditData.commercial_offer,
                'offerContainer',
                auditData.data_coverage,
                { hideWhenPendingReview: true },
            );
        }
        showAlert('Коммерческое предложение сохранено', 'success');
    } catch (error) {
        showAlert('Ошибка: ' + error.message, 'danger');
    }
}

function applyAuditSummaryToUi(summary) {
    const auditData = getAuditData();
    if (!auditData || !summary) return;
    auditData.audit_summary = summary;
    if (typeof runtimeBridge.renderAuditSummaryBlock === 'function') {
        runtimeBridge.renderAuditSummaryBlock(
            summary,
            auditData.metrics_summary,
            auditData.data_coverage,
        );
    }
}

export async function refreshReportCommercialOfferFromAudit() {
    if (!requireWriteAccess('обновление коммерческого предложения')) return;
    const currentAuditId = getCurrentAuditId();
    if (!currentAuditId) return;
    const btn = document.querySelector('#reportOfferCard .card-header-actions button');
    if (btn) btn.disabled = true;
    try {
        const updated = await apiRequest(`/api/audits/${currentAuditId}/report-output/refresh-offer`, {
            method: 'POST',
        });
        const auditData = getAuditData();
        if (auditData && updated?.commercial_offer) {
            auditData.commercial_offer = updated.commercial_offer;
            renderCommercialOffer(
                auditData.commercial_offer,
                'reportOfferContainer',
                auditData.data_coverage,
                { hideWhenPendingReview: false },
            );
            renderCommercialOffer(
                auditData.commercial_offer,
                'offerContainer',
                auditData.data_coverage,
                { hideWhenPendingReview: true },
            );
            const details = document.querySelector('#reportOfferContainer .report-output-edit-details');
            if (details) details.open = true;
            if (updated?.audit_plan) {
                auditData.audit_plan = updated.audit_plan;
            }
            renderAuditPlanCard(auditData);
        }
        if (updated?.offer_changed === false) {
            showAlert('КП не изменилось — совпало с текущим вариантом.', 'warning');
        } else {
            showAlert('Коммерческое предложение сформировано из данных аудита.', 'success');
        }
        if (typeof runtimeBridge.loadAuditDetail === 'function') {
            await runtimeBridge.loadAuditDetail();
        }
    } catch (error) {
        showAlert('Ошибка: ' + error.message, 'danger');
    } finally {
        if (btn) btn.disabled = false;
    }
}

export async function refreshReportSummaryFromAudit() {
    if (!requireWriteAccess('обновление краткого вывода')) return;
    const currentAuditId = getCurrentAuditId();
    if (!currentAuditId) return;
    const btn = document.querySelector('#reportAiSummaryCard .card-header-actions button');
    if (btn) btn.disabled = true;
    try {
        const updated = await apiRequest(`/api/audits/${currentAuditId}/report-output/refresh-summary`, {
            method: 'POST',
        });
        if (updated?.audit_summary) {
            applyAuditSummaryToUi(updated.audit_summary);
            const toggle = document.getElementById('reportSummaryEditDetails');
            if (toggle) toggle.open = true;
        }
        if (updated?.summary_changed === false) {
            showAlert('Текст не изменился — данные совпали с текущим вариантом.', 'warning');
        } else {
            showAlert('Краткий вывод обновлён из данных аудита.', 'success');
        }
        if (typeof runtimeBridge.loadAuditDetail === 'function') {
            await runtimeBridge.loadAuditDetail();
        }
    } catch (error) {
        showAlert('Ошибка: ' + (error.message || 'не удалось обновить'), 'danger');
    } finally {
        if (btn) btn.disabled = false;
    }
}

export async function saveReportAuditSummary() {
    if (!requireWriteAccess('сохранение краткого вывода')) return;
    const currentAuditId = getCurrentAuditId();
    if (!currentAuditId) return;
    const payload = {
        audit_summary: {
            client_problem: document.getElementById('editSummaryProblem')?.value?.trim() || '',
            main_risk: document.getElementById('editSummaryRisk')?.value?.trim() || '',
            priority: document.getElementById('editSummaryPriority')?.value || 'medium',
            short_conclusion: document.getElementById('editSummaryConclusion')?.value?.trim() || '',
        },
    };
    try {
        const updated = await apiRequest(`/api/audits/${currentAuditId}/report-output`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
        });
        const auditData = getAuditData();
        if (auditData && updated?.audit_summary) {
            auditData.audit_summary = updated.audit_summary;
            await runtimeBridge.loadAuditDetail?.();
        }
        showAlert('Краткий вывод сохранён', 'success');
    } catch (error) {
        showAlert('Ошибка: ' + error.message, 'danger');
    }
}

function planBaselinePeriod(plan) {
    const p = plan || {};
    return String(
        p.baseline?.reference_period
        || p.baseline?.metrics?.period
        || p.forecast?.reference_period
        || '',
    ).trim();
}

function planForecastStartPeriod(plan) {
    const p = plan || {};
    return String(p.forecast?.forecast_start_period || '').trim();
}

export function renderForecastScenariosHtml(auditPlan, offer) {
    const plan = auditPlan || {};
    const forecast = plan.forecast || {};
    const fromOffer = offer?.forecast_scenarios || {};
    const horizon = forecast.horizon_months || fromOffer.horizon_months || 3;
    const baselinePeriod = planBaselinePeriod(plan);
    const forecastStart = planForecastStartPeriod(plan);
    const refLabel = forecastStart ? ` с ${escapeHtml(periodLabelPrepositionS(forecastStart))}` : '';
    const baselineHint = baselinePeriod && forecastStart
        ? `<span class="muted"> (база: ${escapeHtml(baselinePeriod)})</span>`
        : '';
    const disclaimer = (forecast.analytics_disclaimer || fromOffer.analytics_disclaimer || '').trim();
    const blocks = [];
    for (const [title, key] of [
        ['Консервативный сценарий', 'conservative'],
        ['Целевой сценарий', 'target'],
    ]) {
        const block = { ...(fromOffer[key] || {}), ...(forecast[key] || {}) };
        const headline = (block.headline || '').trim();
        const assumption = (block.assumption || '').trim();
        if (headline || assumption) {
            blocks.push(
                `<div class="offer-forecast-scenario"><h4>${escapeHtml(title)}</h4><p><strong>${escapeHtml(headline)}</strong></p><p class="muted">${escapeHtml(assumption)}</p></div>`
            );
        }
    }
    if (!blocks.length) return '';
    const disc = disclaimer
        ? `<p class="muted offer-forecast-disclaimer">${escapeHtml(disclaimer)}</p>`
        : '';
    return `<div class="offer-forecast-block"><p class="offer-services-label"><strong>Прогноз${escapeHtml(refLabel)} (${horizon} мес.)</strong>${baselineHint}</p>${disc}${blocks.join('')}</div>`;
}

/** Скрыто по продукту: сквозная аналитика не в минимальном аудите. */
export function renderAnalyticsReadiness(_coverage) {
    const panel = document.getElementById('analyticsReadinessPanel');
    if (!panel) return;
    panel.innerHTML = '';
    panel.style.display = 'none';
}

function planForecastEmpty(forecast, targets) {
    const f = forecast || {};
    const hasScenario = ['conservative', 'target'].some((key) => {
        const block = f[key] || {};
        return Boolean((block.headline || '').trim() || (block.assumption || '').trim());
    });
    const tm = targets?.metrics || {};
    return !hasScenario && !tm.revenue && !tm.gross_profit && !tm.drr;
}

function offerHasForecastScenarios(offer) {
    const s = offer?.forecast_scenarios;
    if (!s || typeof s !== 'object') return false;
    return ['conservative', 'target'].some((key) => {
        const block = s[key] || {};
        return Boolean((block.headline || '').trim() || (block.assumption || '').trim());
    });
}

export function applyForecastFromCommercialOffer() {
    const data = getAuditData();
    const scenarios = data?.commercial_offer?.forecast_scenarios;
    if (!offerHasForecastScenarios(data?.commercial_offer)) {
        showAlert('В коммерческом предложении нет сценариев прогноза — перезапустите AI-анализ или заполните вручную.', 'warning');
        return;
    }
    const setVal = (id, v) => {
        const el = document.getElementById(id);
        if (el) el.value = v ?? '';
    };
    setVal('planTargetHorizon', scenarios.horizon_months ?? 3);
    setVal('planForecastDisclaimer', scenarios.analytics_disclaimer || '');
    setVal('planForecastConservativeHeadline', scenarios.conservative?.headline || '');
    setVal('planForecastConservativeAssumption', scenarios.conservative?.assumption || '');
    setVal('planForecastTargetHeadline', scenarios.target?.headline || '');
    setVal('planForecastTargetAssumption', scenarios.target?.assumption || '');
    showAlert('Черновик AI подставлен — проверьте сценарии и нажмите «Сохранить прогноз и цели».', 'success');
}

export function renderAuditPlanCard(data) {
    const card = document.getElementById('reportAuditPlanCard');
    const container = document.getElementById('reportAuditPlanContainer');
    if (!card || !container) return;
    card.style.display = 'block';
    const plan = data?.audit_plan || {};
    const baseline = plan.baseline || {};
    const targets = plan.targets || {};
    const forecast = plan.forecast || {};
    const tm = targets.metrics || {};
    const preliminary = Boolean(data?.data_coverage?.is_preliminary);
    const currentBaseline = planBaselinePeriod(plan);
    const forecastStart = planForecastStartPeriod(plan);
    const snapshotPeriod = String(baseline.reference_period || baseline.metrics?.period || '').trim();
    const baselineLabel = currentBaseline || snapshotPeriod || (baseline.captured_at ? baseline.captured_at : '');
    const baselineStale = snapshotPeriod && currentBaseline
        && snapshotPeriod.toLowerCase() !== currentBaseline.toLowerCase();
    const baselineLine = baselineLabel
        ? ` (${escapeHtml(baselineLabel)})`
        : '';
    const staleNote = baselineStale
        ? `<p class="muted ui-note-bottom">В снимке «${escapeHtml(snapshotPeriod)}», в оценке «${escapeHtml(currentBaseline)}» — перезафиксируйте базовую линию.</p>`
        : '';
    const forecastStartLabel = forecastStart ? periodLabelPrepositionS(forecastStart) : '';
    const periodNote = currentBaseline
        ? `<p class="muted">Базовая линия (факт оценки): <strong>${escapeHtml(currentBaseline)}</strong>${forecastStartLabel ? ` · прогноз вперёд с <strong>${escapeHtml(forecastStartLabel)}</strong>` : ''}</p>`
        : '';
    const aiDraft = forecast.source === 'ai_draft' && !forecast.marketer_saved;
    const aiDraftNote = aiDraft
        ? '<p class="ui-note-bottom"><span class="badge badge-draft">Черновик AI</span> Сценарии подставлены после анализа — проверьте и нажмите «Сохранить».</p>'
        : (planForecastEmpty(forecast, targets) && offerHasForecastScenarios(data?.commercial_offer)
            ? '<p class="muted ui-note-bottom">После AI-анализа нажмите «Подтянуть черновик AI» или заполните вручную.</p>'
            : '');
    const pullForecastBtn = offerHasForecastScenarios(data?.commercial_offer)
        ? `<button type="button" class="btn btn-outline btn-sm report-offer-actions" onclick="applyForecastFromCommercialOffer()">${planForecastEmpty(forecast, targets) ? 'Подтянуть черновик AI' : 'Обновить из AI'}</button>`
        : '';
    container.innerHTML = `
        <p class="muted">Базовая линия — месяц оценки (в PDF). Прогноз — следующие месяцы вперёд; AI предлагает черновик, маркетолог правит и сохраняет.</p>
        ${periodNote}
        ${aiDraftNote}
        ${staleNote}
        <p><strong>Базовая линия${baselineLine}:</strong> ${baseline.metrics && Object.keys(baseline.metrics).length ? 'зафиксирована' : 'не зафиксирована'}</p>
        <button type="button" class="btn btn-outline btn-sm report-offer-actions" onclick="captureAuditBaseline()">Зафиксировать из текущих метрик</button>
        ${pullForecastBtn}
        <div class="form-row form-row--spaced">
            <div class="form-group">
                <label>Цель: выручка (₽)</label>
                <input type="number" id="planTargetRevenue" class="form-control" value="${tm.revenue ?? ''}" min="0" step="0.01">
            </div>
            <div class="form-group">
                <label>Цель: валовая прибыль (₽)</label>
                <input type="number" id="planTargetGrossProfit" class="form-control" value="${tm.gross_profit ?? ''}" min="0" step="0.01">
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Цель: ДРР (%)</label>
                <input type="number" id="planTargetDrr" class="form-control" value="${tm.drr ?? ''}" min="0" step="0.1">
            </div>
            <div class="form-group">
                <label>Горизонт (мес.)</label>
                <input type="number" id="planTargetHorizon" class="form-control" value="${targets.horizon_months ?? 3}" min="1" max="24" step="1">
            </div>
        </div>
        <div class="form-group">
            <label>Консервативный сценарий — заголовок</label>
            <input type="text" id="planForecastConservativeHeadline" class="form-control" value="${escapeHtml(forecast.conservative?.headline || '')}">
        </div>
        <div class="form-group">
            <label>Консервативный — допущение</label>
            <textarea id="planForecastConservativeAssumption" class="form-control" rows="2">${escapeHtml(forecast.conservative?.assumption || '')}</textarea>
        </div>
        <div class="form-group">
            <label>Целевой сценарий — заголовок</label>
            <input type="text" id="planForecastTargetHeadline" class="form-control" value="${escapeHtml(forecast.target?.headline || '')}">
        </div>
        <div class="form-group">
            <label>Целевой — допущение</label>
            <textarea id="planForecastTargetAssumption" class="form-control" rows="2">${escapeHtml(forecast.target?.assumption || '')}</textarea>
        </div>
        <div class="form-group">
            <label>Оговорка про аналитику (в PDF)</label>
            <textarea id="planForecastDisclaimer" class="form-control" rows="2">${escapeHtml(forecast.analytics_disclaimer || '')}</textarea>
        </div>
        <button type="button" class="btn btn-primary btn-sm" onclick="saveAuditPlan()">Сохранить прогноз и цели</button>
    `;
    if (preliminary) {
        container.insertAdjacentHTML(
            'afterbegin',
            '<p class="muted ui-note-bottom">Сейчас доступна фиксация базовой линии. Цели и сценарии можно заполнить позже, после согласования с клиентом.</p>'
        );
    }
}

export async function captureAuditBaseline() {
    const currentAuditId = getCurrentAuditId();
    if (!currentAuditId) return;
    try {
        const updated = await apiRequest(`/api/audits/${currentAuditId}/audit-plan`, {
            method: 'PATCH',
            body: JSON.stringify({ capture_baseline: true }),
        });
        const auditData = getAuditData();
        if (auditData) auditData.audit_plan = updated;
        renderAuditPlanCard(auditData);
        showAlert('Базовая линия зафиксирована', 'success');
    } catch (error) {
        showAlert('Ошибка: ' + error.message, 'danger');
    }
}

export async function saveAuditPlan() {
    const currentAuditId = getCurrentAuditId();
    if (!currentAuditId) return;
    const numOrNull = (id) => {
        const raw = document.getElementById(id)?.value;
        if (raw === '' || raw == null) return null;
        return Number(raw);
    };
    const payload = {
        targets: {
            horizon_months: parseInt(document.getElementById('planTargetHorizon')?.value || '3', 10) || 3,
            metrics: {
                revenue: numOrNull('planTargetRevenue'),
                gross_profit: numOrNull('planTargetGrossProfit'),
                drr: numOrNull('planTargetDrr'),
            },
        },
        forecast: {
            horizon_months: parseInt(document.getElementById('planTargetHorizon')?.value || '3', 10) || 3,
            reference_period: planBaselinePeriod(getAuditData()?.audit_plan) || null,
            forecast_start_period: planForecastStartPeriod(getAuditData()?.audit_plan) || null,
            analytics_disclaimer: document.getElementById('planForecastDisclaimer')?.value?.trim() || '',
            conservative: {
                headline: document.getElementById('planForecastConservativeHeadline')?.value?.trim() || '',
                assumption: document.getElementById('planForecastConservativeAssumption')?.value?.trim() || '',
            },
            target: {
                headline: document.getElementById('planForecastTargetHeadline')?.value?.trim() || '',
                assumption: document.getElementById('planForecastTargetAssumption')?.value?.trim() || '',
            },
        },
    };
    try {
        const updated = await apiRequest(`/api/audits/${currentAuditId}/audit-plan`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
        });
        const auditData = getAuditData();
        if (auditData) {
            auditData.audit_plan = updated;
            renderAuditPlanCard(auditData);
            renderCommercialOffer(
                auditData.commercial_offer,
                'reportOfferContainer',
                auditData.data_coverage,
                { hideWhenPendingReview: false }
            );
        }
        showAlert('Прогноз и цели сохранены', 'success');
    } catch (error) {
        showAlert('Ошибка: ' + error.message, 'danger');
    }
}
