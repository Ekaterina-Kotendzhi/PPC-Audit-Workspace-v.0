/** M2.3 — AI draft for client snapshot (report tab). */
import { escapeHtml } from '../core/utils.js';
import { showAlert } from '../core/alerts.js';
import { showConfirmDialog } from '../core/modals.js';
import { apiRequest } from '../core/api.js';
import { runtimeBridge } from '../core/runtime-bridge.js';
import { requireWriteAccess } from '../core/auth.js';
import { reportPriorityLabel } from './report-helpers.js';

function getCurrentAuditId() {
    return runtimeBridge.getCurrentAuditId?.() || runtimeBridge.getAuditIdFromUrl?.() || null;
}

function formatDraftPreview(preview) {
    const lines = (preview?.preview_lines || []).map((line) => escapeHtml(line));
    const notes = (preview?.review_notes || []).map((n) => escapeHtml(n));
    const cost =
        preview?.cost_rub != null
            ? `<p class="muted">Оценка: ~${escapeHtml(String(preview.cost_rub))} ₽</p>`
            : '';
    const meta = preview?.model_label
        ? `<p class="muted">Модель: ${escapeHtml(preview.model_label)} · ${escapeHtml(preview.method || '')}</p>`
        : '';
    return `${meta}${cost}<ul class="snapshot-draft-preview">${lines.map((l) => `<li>${l}</li>`).join('')}</ul>${
        notes.length ? `<p class="muted">${notes.join(' ')}</p>` : ''
    }`;
}

export async function generateClientSnapshotDraft() {
    if (!requireWriteAccess('AI-черновик client snapshot')) return;
    const auditId = getCurrentAuditId();
    if (!auditId) return;
    if (!runtimeBridge.getPrivacySettings?.()) await runtimeBridge.loadPrivacySettings?.();
    try {
        const preview = await apiRequest(`/api/audits/${auditId}/client-snapshot/ai/preview`);
        if (!preview?.can_generate) {
            showAlert(preview?.apply_blocked_reason || 'Нет данных для черновика client snapshot.', 'warning');
            return;
        }
        if (!preview.can_apply) {
            showAlert(
                (preview.apply_blocked_reason || 'Нельзя применить черновик.') +
                    '\n\n' +
                    (preview.preview_lines || []).join('\n'),
                'warning'
            );
            return;
        }
        const summary = preview.draft?.audit_summary || {};
        const priority = reportPriorityLabel(summary.priority);
        const ok = await showConfirmDialog({
            title: 'Применить AI-черновик в отчёт?',
            message:
                `Текст попадёт в «Краткий вывод» и PDF (после вашей проверки):\n\n` +
                `Суть: ${summary.client_problem || '—'}\n` +
                `Риск: ${summary.main_risk || '—'}\n` +
                `Приоритет: ${priority}\n` +
                `Шаг: ${summary.short_conclusion || '—'}\n` +
                (preview.draft?.zone_priority_phrase
                    ? `\nЗоны: ${preview.draft.zone_priority_phrase}\n`
                    : '') +
                (preview.draft?.limitations_text
                    ? `\nОграничения (для справки, в PDF из покрытия данных): ${preview.draft.limitations_text}\n`
                    : '') +
                `\n${formatDraftPreview(preview)}`,
            confirmText: 'Применить в отчёт',
            confirmType: 'primary',
        });
        if (!ok) return;
        await apiRequest(`/api/audits/${auditId}/client-snapshot/ai/apply`, {
            method: 'POST',
            body: JSON.stringify({ draft: preview.draft }),
        });
        showAlert('Черновик client snapshot применён. Проверьте вкладку «Отчёт» и предпросмотр PDF.', 'success');
        await runtimeBridge.loadAuditDetail?.();
    } catch (error) {
        showAlert('Не удалось сгенерировать черновик: ' + (error.message || 'Ошибка'), 'warning');
    }
}
