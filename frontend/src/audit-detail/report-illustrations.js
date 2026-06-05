/** Report tab: send status, appendix, finding illustrations (extracted from card.js). */
import { formatDate } from '../shared/timezone.js';
import { escapeHtml } from '../core/utils.js';
import { showAlert } from '../core/alerts.js';
import { showPromptDialog } from '../core/modals.js';
import { apiRequest } from '../core/api.js';
import { requireWriteAccess, canWrite } from '../core/auth.js';
import { runtimeBridge } from '../core/runtime-bridge.js';
import { previewAuditReport } from './report.js';
import {
    getFindingReviewProgress,
    pluralizeFindingsReview,
    areaDisplayLabel,
    renderFindings,
} from './findings.js';
import { findSimilarConfirmedFindings } from './finding-report-text.js';
import { hasGuidedCompletedAnalysis, isPreliminaryAudit } from './workflow.js';
import { findOcrMaterial } from './materials.js';

function getAuditData() {
    return runtimeBridge.getAuditData?.() || null;
}

function setAuditData(data) {
    runtimeBridge.setAuditData?.(data);
}

function getCurrentAuditId() {
    return runtimeBridge.getCurrentAuditId?.() || null;
}

export function buildReportSendStatusHint(data) {
    const progress = getFindingReviewProgress(data);
    const stale = Boolean(runtimeBridge.isAnalysisStale?.(data));
    if (isPreliminaryAudit()) {
        const missing = (data?.data_coverage?.missing_items || []).slice(0, 5).map((i) => i.label).filter(Boolean);
        const text = missing.length ? missing.join(', ') : 'дополнительных источников';
        return {
            isDraft: true,
            hint: `Сначала добавьте данные для полного аудита (не хватает: ${text}). Ниже — черновик по уже загруженным материалам.`,
            showResultsCta: false,
        };
    }
    if (progress.pending > 0) {
        const n = progress.pending;
        return {
            isDraft: true,
            hint: `Перед отправкой PDF: ${pluralizeFindingsReview(n)} на вкладке «Выводы» (проверено ${progress.reviewed} из ${progress.total}).`,
            showResultsCta: true,
        };
    }
    if (stale) {
        return {
            isDraft: true,
            hint: 'Данные изменились после AI-анализа — перезапустите анализ или предупредите клиента перед отправкой PDF.',
            showResultsCta: false,
        };
    }
    return {
        isDraft: false,
        hint: 'Блоки ниже совпадают с PDF для клиента. Правки клиента и CRM — в конце вкладки.',
        showResultsCta: false,
    };
}

/** Текст баннера в PDF (без дублирования счётчиков на экране). */
export function buildReportDraftReason(data) {
    const status = buildReportSendStatusHint(data);
    if (!status.isDraft) return '';
    if (isPreliminaryAudit()) {
        const missing = (data?.data_coverage?.missing_items || []).slice(0, 5).map((i) => i.label).filter(Boolean);
        const text = missing.length ? missing.join(', ') : 'дополнительных источников';
        return `Предварительный отчёт. Для полноценного аудита не хватает: ${text}.`;
    }
    const progress = getFindingReviewProgress(data);
    if (progress.pending > 0) {
        const word = progress.pending === 1 ? 'вывод' : 'выводов';
        return `Предварительная версия: не проверены ${progress.pending} ${word}.`;
    }
    if (runtimeBridge.isAnalysisStale?.(data)) {
        return 'Предварительная версия: данные обновлены после последнего AI-анализа.';
    }
    return '';
}

export function renderReportSendStatus(data) {
    const box = document.getElementById('reportSendStatus');
    if (!box) return;
    if (!hasGuidedCompletedAnalysis(data) && !isPreliminaryAudit()) {
        box.style.display = 'none';
        box.innerHTML = '';
        return;
    }
    const status = buildReportSendStatusHint(data);
    const badge = status.isDraft
        ? '<span class="report-send-badge report-send-badge--draft">Черновик</span>'
        : '<span class="report-send-badge report-send-badge--ready">Можно отправить клиенту</span>';
    const resultsBtn = status.showResultsCta
        ? '<button type="button" class="btn btn-primary btn-sm" onclick="switchTab(\'results\')">К проверке выводов</button>'
        : '';
    box.style.display = 'block';
    box.innerHTML = `
        <div class="report-send-status-inner">
            ${badge}
            <p class="report-send-hint">${escapeHtml(status.hint)}</p>
            <div class="report-send-actions">${resultsBtn}
                <button type="button" class="btn btn-outline btn-sm" onclick="previewAuditReport()">Предпросмотр PDF</button>
            </div>
        </div>`;
}

function getFindingLinkedMaterialIds(data) {
    return new Set(
        (data?.findings || [])
            .map((finding) => finding.illustration_material_id)
            .filter(Boolean)
    );
}

export function getReportAppendixItems(data) {
    return data?.report_appendix?.items || [];
}

function getAvailableAppendixScreenshots(data) {
    const used = new Set(getReportAppendixItems(data).map((item) => item.material_id));
    const linked = getFindingLinkedMaterialIds(data);
    return (data?.materials || []).filter(
        (m) =>
            m?.type === 'screenshot' &&
            m.file_url &&
            !m.excluded_from_report &&
            !used.has(m.id) &&
            !linked.has(m.id)
    );
}

function getReportIllustrationsSummary(data) {
    return (
        data?.report_illustrations || {
            confirmed_findings: 0,
            findings_with_illustration: 0,
            findings_missing_caption: 0,
            appendix_count: 0,
        }
    );
}

function isDirectHealthFindingRow(f) {
    if (!f) return false;
    if (f.finding_source === 'direct_health') return true;
    if (f.original_ai_output?.source === 'direct_health') return true;
    if ((f.evidence || []).some((e) => e?.source === 'direct_health')) return true;
    return /автопроверка excel|мастер отчёт|direct_analytics|оценка кабинета/i.test(String(f.based_on || ''));
}

function getConfirmedFindingsForReport(data) {
    const order = { high: 0, medium: 1, low: 2 };
    return (data?.findings || [])
        .filter((f) => ['human_confirmed', 'human_edited'].includes(f.status || ''))
        .filter((f) => !isDirectHealthFindingRow(f))
        .sort((a, b) => {
            const sa = order[String(a.severity || 'medium').toLowerCase()] ?? 1;
            const sb = order[String(b.severity || 'medium').toLowerCase()] ?? 1;
            return sa - sb || (a.id || 0) - (b.id || 0);
        });
}

export function renderReportConfirmedPreview(data) {
    const card = document.getElementById('reportConfirmedPreviewCard');
    const body = document.getElementById('reportConfirmedPreviewBody');
    if (!card || !body) return;

    const showAi =
        data?.workflow_state?.show_ai_report_sections &&
        !data?.workflow_state?.analysis_failed &&
        hasGuidedCompletedAnalysis(data);

    if (!showAi) {
        card.style.display = 'none';
        body.innerHTML = '';
        return;
    }

    card.style.display = '';
    const confirmed = getConfirmedFindingsForReport(data);
    const progress = getFindingReviewProgress(data);

    if (!confirmed.length) {
        const pending = progress.pending || 0;
        body.innerHTML = `
            <div class="report-confirmed-empty">
                <p class="muted">${pending > 0
                    ? `В PDF пока пусто: ${pluralizeFindingsReview(pending)} на вкладке «Выводы».`
                    : 'Подтвердите выводы на вкладке «Выводы» — они появятся здесь и в PDF.'}</p>
                <button type="button" class="btn btn-primary btn-sm" onclick="switchTab('results')">${pending > 0 ? 'Проверить выводы' : 'Открыть выводы'}</button>
            </div>`;
        return;
    }

    const dupePairs = [];
    const items = confirmed.map((f) => {
        const area = areaDisplayLabel(f.area) || 'Вывод';
        const rec = String(f.recommendation || '').trim();
        const hasScreen = Boolean(f.illustration_material_id);
        const screenOk = hasScreen && Boolean(f.illustration_caption_ready);
        let screenNote = '';
        if (hasScreen && !screenOk) {
            screenNote = '<span class="report-confirmed-screen report-confirmed-screen--warn">скрин без подписи — не в PDF</span>';
        } else if (screenOk) {
            screenNote = '<span class="report-confirmed-screen report-confirmed-screen--ok">со скрином</span>';
        }
        const similar = findSimilarConfirmedFindings(f, confirmed).filter((o) => o.id > f.id);
        if (similar.length) {
            dupePairs.push({ id: f.id, otherIds: similar.map((o) => o.id) });
        }
        const dupeTag = similar.length
            ? '<span class="report-confirmed-dupe-tag">возможный дубль</span>'
            : '';
        return `<li class="report-confirmed-item">
            <p class="report-confirmed-item-head"><strong>${escapeHtml(area)}</strong>${dupeTag ? ` ${dupeTag}` : ''}${screenNote ? ` ${screenNote}` : ''}</p>
            <p>${escapeHtml(f.problem || '—')}</p>
            ${rec ? `<p class="muted report-confirmed-rec">${escapeHtml(rec)}</p>` : ''}
        </li>`;
    }).join('');

    const pendingNote = progress.pending > 0
        ? `<p class="muted report-confirmed-pending">Ещё ${progress.pending} на проверке — не попадут в PDF, пока не подтвердите.</p>`
        : '';
    const dupeNote = dupePairs.length
        ? `<div class="report-confirmed-dupe-warn">
            <p>⚠ Похожие формулировки в разных зонах — в PDF оставьте один пункт или уточните тексты.</p>
            <ul class="report-confirmed-dupe-actions">
                ${dupePairs.map((p) => `
                    <li>Выводы #${p.id} и #${p.otherIds.join(', #')}:
                        <button type="button" class="btn btn-link btn-sm" onclick="goToFindingsInReport(${p.id})">#${p.id}</button>
                        ${p.otherIds.map((oid) => `<button type="button" class="btn btn-link btn-sm" onclick="goToFindingsInReport(${oid})">#${oid}</button>`).join(' ')}
                    </li>`).join('')}
            </ul>
            <p class="muted">На карточке: <strong>Убрать из отчёта</strong> у лишнего дубля или <strong>Исправить</strong> текст.</p>
           </div>`
        : '';

    body.innerHTML = `${dupeNote}<ol class="report-confirmed-list">${items}</ol>${pendingNote}`;
}

export function renderReportIllustrationsGuide(data) {
    const card = document.getElementById('reportIllustrationsGuideCard');
    const status = document.getElementById('reportIllustrationsStatus');
    const preview = document.getElementById('reportFindingIllustrationsPreview');
    if (!card) return;
    if (!canWrite()) {
        card.style.display = 'none';
        return;
    }
    card.style.display = '';

    const summary = getReportIllustrationsSummary(data);
    const appendixCount = data?.report_appendix?.count ?? summary.appendix_count ?? 0;
    if (status) {
        const parts = [
            `${summary.confirmed_findings || 0} подтвержд.`,
            `${summary.findings_with_illustration || 0} со скрином`,
        ];
        if (summary.findings_missing_caption > 0) {
            parts.push(`${summary.findings_missing_caption} без подписи`);
        }
        if (appendixCount > 0) {
            parts.push(`${appendixCount} в приложении`);
        }
        status.textContent = parts.join(' · ');
    }

    if (!preview) return;
    const illustrated = (data?.findings || []).filter(
        (finding) =>
            finding.illustration_material_id &&
            ['human_confirmed', 'human_edited'].includes(finding.status || '')
    );
    if (!illustrated.length) {
        preview.innerHTML =
            '<p class="muted report-illustrations-empty">Нет скринов у подтверждённых выводов. На «Выводы» — «Скрин для PDF».</p>';
        return;
    }

    preview.innerHTML = `
        <p class="report-illustrations-preview-title"><strong>В PDF под выводами:</strong></p>
        ${illustrated
            .map((finding) => {
                const ready = Boolean(finding.illustration_caption_ready);
                const warn = !ready
                    ? '<p class="report-illustration-warn">⚠ Заполните подпись (мин. 10 символов) — без неё скрин не попадёт в PDF</p>'
                    : '';
                return `<div class="report-finding-illustration-item" data-finding-id="${finding.id}">
                    <div class="report-finding-illustration-head">
                        ${finding.illustration_file_url ? `<img src="${escapeHtml(finding.illustration_file_url)}" alt="">` : ''}
                        <div>
                            <p><strong>${escapeHtml(areaDisplayLabel(finding.area) || 'Вывод')}</strong></p>
                            <p class="muted">${escapeHtml((finding.problem || '').slice(0, 120))}${(finding.problem || '').length > 120 ? '…' : ''}</p>
                        </div>
                    </div>
                    <label class="finding-missing-label">Текст под рисунком в PDF</label>
                    <textarea class="form-control report-finding-caption" rows="2" data-finding-id="${finding.id}" placeholder="Рис. … — что на графике и вывод для клиента">${escapeHtml(finding.illustration_caption || '')}</textarea>
                    ${warn}
                    <button type="button" class="btn btn-outline btn-sm" onclick="switchTab('results'); document.getElementById('finding-${finding.id}')?.scrollIntoView({behavior:'smooth'})">Открыть вывод</button>
                </div>`;
            })
            .join('')}`;

    preview.querySelectorAll('.report-finding-caption').forEach((el) => {
        el.addEventListener('blur', () => {
            saveFindingIllustrationCaption(Number(el.dataset.findingId), el.value, { silent: true });
        });
    });
}

export async function saveFindingIllustrationCaption(findingId, caption, { silent = false } = {}) {
    if (!requireWriteAccess('Подпись к иллюстрации')) return false;
    const auditId = getCurrentAuditId();
    if (!auditId) return false;
    try {
        await apiRequest(`/api/audits/${auditId}/findings/${findingId}/illustration`, {
            method: 'PATCH',
            body: JSON.stringify({ caption: (caption || '').trim() }),
        });
        const auditData = await apiRequest(`/api/audits/${auditId}`);
        setAuditData(auditData);
        renderReportIllustrationsGuide(auditData);
        renderReportConfirmedPreview(auditData);
        renderReportAppendix(auditData);
        renderFindings(auditData.findings || [], auditData.data_coverage);
        if (!silent) showAlert('Подпись сохранена', 'success');
        return true;
    } catch (error) {
        showAlert('Не удалось сохранить подпись: ' + error.message, 'warning');
        return false;
    }
}

export function renderReportAppendix(data) {
    const card = document.getElementById('reportAppendixCard');
    const list = document.getElementById('reportAppendixList');
    const counter = document.getElementById('reportAppendixCounter');
    const addBtn = document.getElementById('btnAddReportAppendix');
    if (!card || !list) return;

    if (!canWrite()) {
        card.style.display = 'none';
        return;
    }
    card.style.display = '';

    const items = getReportAppendixItems(data);
    const maxItems = data?.report_appendix?.max_items || 3;
    if (counter) counter.textContent = `${items.length} / ${maxItems}`;
    if (addBtn) addBtn.disabled = items.length >= maxItems;

    if (!items.length) {
        list.innerHTML = '<p class="muted">Не добавлено — клиент увидит только текст отчёта.</p>';
        return;
    }

    list.innerHTML = items
        .map(
            (item, index) => `
        <div class="report-appendix-item" data-material-id="${item.material_id}">
            <div class="report-appendix-preview">
                ${item.file_url ? `<img src="${escapeHtml(item.file_url)}" alt="">` : ''}
            </div>
            <div class="report-appendix-fields">
                <p class="report-appendix-title"><strong>Рис. ${index + 1}</strong> · ${escapeHtml(item.material_title || 'Скриншот')}</p>
                <textarea class="form-control report-appendix-caption" rows="3" data-material-id="${item.material_id}" placeholder="Рис. ${index + 1}. Что на графике и вывод для клиента">${escapeHtml(item.caption || '')}</textarea>
                ${
                    item.ocr_hint
                        ? `<details class="report-appendix-ocr"><summary>Черновик из OCR</summary><pre>${escapeHtml(String(item.ocr_hint).slice(0, 500))}</pre></details>`
                        : ''
                }
                ${item.needs_review ? '<p class="muted report-appendix-material-note">ℹ Скрин на «Данные» помечен «требует проверки» — на PDF это не влияет, если подпись заполнена.</p>' : ''}
                <div class="report-appendix-item-actions">
                    <button type="button" class="btn btn-outline btn-sm" onclick="moveReportAppendixItem(${item.material_id}, -1)" ${index === 0 ? 'disabled' : ''}>↑</button>
                    <button type="button" class="btn btn-outline btn-sm" onclick="moveReportAppendixItem(${item.material_id}, 1)" ${index === items.length - 1 ? 'disabled' : ''}>↓</button>
                    <button type="button" class="btn btn-outline btn-sm" onclick="removeReportAppendixItem(${item.material_id})">Удалить</button>
                </div>
            </div>
        </div>`
        )
        .join('');

    list.querySelectorAll('.report-appendix-caption').forEach((el) => {
        el.addEventListener('blur', () => {
            saveReportAppendixFromUi({ silent: true });
        });
    });
}

function collectReportAppendixPayloadFromUi() {
    const items = [];
    document.querySelectorAll('.report-appendix-item').forEach((row) => {
        const materialId = Number(row.dataset.materialId);
        const captionEl = row.querySelector('.report-appendix-caption');
        items.push({
            material_id: materialId,
            caption: (captionEl?.value || '').trim(),
        });
    });
    return items;
}

export async function saveReportAppendixFromUi({ silent = false } = {}) {
    if (!requireWriteAccess('Иллюстрации для PDF')) return false;
    const auditId = getCurrentAuditId();
    if (!auditId) return false;
    const items = collectReportAppendixPayloadFromUi();
    try {
        const result = await apiRequest(`/api/audits/${auditId}/report/appendix`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items }),
        });
        const auditData = getAuditData();
        if (auditData) auditData.report_appendix = result;
        renderReportAppendix(auditData);
        if (!silent) showAlert('Иллюстрации сохранены', 'success');
        return true;
    } catch (error) {
        showAlert('Не удалось сохранить иллюстрации: ' + (error.message || 'Ошибка'), 'warning');
        return false;
    }
}

function isUsableOcrHint(text) {
    const value = String(text || '').trim();
    if (value.length < 15) return false;
    if (/\d/.test(value)) return true;
    const lower = value.toLowerCase();
    const keywords = ['клик', 'заяв', 'бюдж', 'расход', 'cpl', 'cpa', 'romi', 'ctr', 'период', 'граф', 'кампан'];
    return keywords.some((word) => lower.includes(word));
}

function buildAppendixCaptionPromptMessage(figureNo, ocrHint) {
    const lines = [
        'Это текст под рисунком в PDF для клиента — не название файла и не сырой OCR.',
        'Опишите своими словами: что на скрине и какой вывод.',
        '',
        `Формат: «Рис. ${figureNo}. …» — период, метрика, тренд.`,
        'Пример: «Рис. 1. Динамика CPL, май 2026 — снижение с 890 до 480 ₽ после оптимизации.»',
    ];
    if (ocrHint && isUsableOcrHint(ocrHint)) {
        lines.push('', 'Подсказка с OCR (проверьте цифры):', ocrHint.slice(0, 220));
    } else if (ocrHint) {
        lines.push('', 'OCR не прочитал скрин — опишите график вручную.');
    }
    return lines.join('\n');
}

export async function openReportAppendixPicker(materialId = null) {
    if (!requireWriteAccess('Иллюстрации для PDF')) return;
    const auditId = getCurrentAuditId();
    const auditData = getAuditData();
    if (!auditId || !auditData) return;

    const items = getReportAppendixItems(auditData);
    const maxItems = auditData?.report_appendix?.max_items || 3;
    if (items.length >= maxItems) {
        showAlert(`Максимум ${maxItems} иллюстрации`, 'warning');
        return;
    }

    let targetId = materialId != null ? Number(materialId) : null;
    if (targetId == null) {
        const available = getAvailableAppendixScreenshots(auditData);
        if (!available.length) {
            showAlert('Нет доступных скриншотов. Загрузите скрин на вкладке «Данные».', 'warning');
            return;
        }
        if (available.length === 1) {
            targetId = available[0].id;
        } else {
            const lines = available.map((m, i) => `${i + 1}. ${m.title || 'Скриншот'}`).join('\n');
            const pick = await showPromptDialog({
                title: 'Выберите скриншот',
                message: `Введите номер (1–${available.length}):\n${lines}`,
                placeholder: '1',
                required: true,
            });
            if (!pick) return;
            const idx = parseInt(String(pick).trim(), 10) - 1;
            if (Number.isNaN(idx) || idx < 0 || idx >= available.length) {
                showAlert('Некорректный номер', 'warning');
                return;
            }
            targetId = available[idx].id;
        }
    }

    const material = (auditData.materials || []).find((m) => m.id === targetId);
    const ocr = material ? findOcrMaterial(material) : null;
    const ocrHint = (ocr?.extracted_text || ocr?.raw_content || '').trim();
    const figureNo = items.length + 1;
    const caption = await showPromptDialog({
        title: 'Текст под рисунком в PDF',
        message: buildAppendixCaptionPromptMessage(figureNo, ocrHint),
        placeholder: `Рис. ${figureNo}. Динамика CPL, май 2026 — снижение после оптимизации минус-слов.`,
        required: true,
    });
    if (caption === false) return;
    if (!caption || caption.length < 10) {
        showAlert('Подпись должна быть не короче 10 символов', 'warning');
        return;
    }

    const newItems = [
        ...items.map((item) => ({ material_id: item.material_id, caption: item.caption })),
        { material_id: targetId, caption },
    ];
    try {
        const result = await apiRequest(`/api/audits/${auditId}/report/appendix`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: newItems }),
        });
        auditData.report_appendix = result;
        setAuditData(auditData);
        renderReportAppendix(auditData);
        showAlert('Иллюстрация добавлена в приложение PDF', 'success');
    } catch (error) {
        showAlert('Не удалось добавить: ' + (error.message || 'Ошибка'), 'warning');
    }
}

export async function removeReportAppendixItem(materialId) {
    if (!requireWriteAccess('Иллюстрации для PDF')) return;
    const auditId = getCurrentAuditId();
    const auditData = getAuditData();
    if (!auditId || !auditData) return;
    const items = getReportAppendixItems(auditData)
        .filter((item) => item.material_id !== materialId)
        .map((item) => ({ material_id: item.material_id, caption: item.caption }));
    try {
        const result = await apiRequest(`/api/audits/${auditId}/report/appendix`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items }),
        });
        auditData.report_appendix = result;
        setAuditData(auditData);
        renderReportAppendix(auditData);
    } catch (error) {
        showAlert('Не удалось удалить: ' + (error.message || 'Ошибка'), 'warning');
    }
}

export async function moveReportAppendixItem(materialId, direction) {
    const auditId = getCurrentAuditId();
    const auditData = getAuditData();
    if (!auditId || !auditData) return;
    const items = getReportAppendixItems(auditData).map((item) => ({
        material_id: item.material_id,
        caption: item.caption,
    }));
    const index = items.findIndex((item) => item.material_id === materialId);
    if (index < 0) return;
    const next = index + direction;
    if (next < 0 || next >= items.length) return;
    [items[index], items[next]] = [items[next], items[index]];
    try {
        const result = await apiRequest(`/api/audits/${auditId}/report/appendix`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items }),
        });
        auditData.report_appendix = result;
        setAuditData(auditData);
        renderReportAppendix(auditData);
    } catch (error) {
        showAlert('Не удалось изменить порядок: ' + (error.message || 'Ошибка'), 'warning');
    }
}

export function renderReportExecutiveHero(summary, data) {
    const box = document.getElementById('reportExecutiveHero');
    if (!box) return;
    const clientLabel = String(
        data?.client_name || document.getElementById('clientName')?.textContent || ''
    ).trim();
    const showHero =
        data?.workflow_ui?.tabs?.report !== false &&
        !data?.workflow_state?.analysis_failed &&
        !isPreliminaryAudit() &&
        Boolean(clientLabel) &&
        (hasGuidedCompletedAnalysis(data) || Boolean(data?.metrics_summary?.period) || Boolean(data?.direct_analytics?.health));
    if (!showHero) {
        box.style.display = 'none';
        box.innerHTML = '';
        return;
    }
    const client = data?.client_name || document.getElementById('clientName')?.textContent || 'Клиент';
    const niche = data?.niche_display || data?.niche || '—';
    const period = data?.metrics_summary?.period || '—';
    const periods = data?.metrics_periods?.periods || [];
    const compareLine = periods.length >= 2
        ? `${periods[0]?.period || '?'} → ${periods[periods.length - 1]?.period || '?'}`
        : '';
    const fresh = data?.analysis_freshness;
    const asOf = fresh?.last_analysis_at ? formatDate(fresh.last_analysis_at) : '';
    const tagline = String(
        summary?.client_problem || summary?.short_conclusion || ''
    ).trim();
    const taglineShort = tagline.length > 160 ? `${tagline.slice(0, 157)}…` : tagline;
    box.style.display = 'block';
    box.innerHTML = `
        <div class="report-hero-inner">
            <p class="report-hero-kicker">Отчёт для клиента</p>
            <h2 class="report-hero-title">${escapeHtml(client)}</h2>
            <p class="report-hero-meta muted">${escapeHtml(niche)} · период KPI: <strong>${escapeHtml(period)}</strong>${compareLine ? ` · в динамике: ${escapeHtml(compareLine)}` : ''}${asOf ? ` · анализ ${escapeHtml(asOf)}` : ''}</p>
            ${taglineShort ? `<p class="report-hero-tagline">${escapeHtml(taglineShort)}</p>` : ''}
        </div>`;
}
