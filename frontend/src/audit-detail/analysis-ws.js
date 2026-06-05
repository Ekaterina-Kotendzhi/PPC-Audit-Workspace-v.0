/** WebSocket / polling progress for AI analysis — epic H4. */
import { showAlert } from '../core/alerts.js';
import { apiRequest } from '../core/api.js';
import { formatTokenCount, formatRubAmount, formatUsdAmount } from '../shared/ai-usage.js';
import { runtimeBridge } from '../core/runtime-bridge.js';
import { queuePostAnalysisUiJump } from './workflow.js';

let analysisSocket = null;

function showAnalysisProgress(payload) {
    const card = document.getElementById('analysisProgress');
    const progressStrip = document.getElementById('auditProgressStrip');
    if (!card) return;
    const isFailed = payload.status === 'failed';
    const percent = isFailed ? 0 : Math.max(0, Math.min(100, Number(payload.percent || 0)));
    card.style.display = 'block';
    card.classList.remove('audit-running-failed');
    if (progressStrip) progressStrip.style.display = 'none';
    const bar = document.getElementById('analysisProgressBar');
    const msg = document.getElementById('analysisProgressMessage');
    const pctEl = document.getElementById('analysisProgressPercent');
    if (bar) bar.style.width = `${percent}%`;
    if (msg) {
        let text = payload.message || 'Выполняется…';
        const usage = payload.result?.ai_usage;
        if (usage && usage.model_label && payload.percent >= 100 && payload.status !== 'failed') {
            text += ` · ${usage.model_label} · ${formatTokenCount(usage.total_tokens)} токенов · ${formatRubAmount(usage.cost_rub)} · ${formatUsdAmount(usage.cost_usd)}`;
        }
        msg.textContent = text;
    }
    if (pctEl) pctEl.textContent = `${percent}%`;
}

function hideAnalysisProgress() {
    const card = document.getElementById('analysisProgress');
    if (card) {
        card.style.display = 'none';
        card.classList.remove('audit-running-failed');
    }
}

function connectAnalysisProgress(auditId) {
    if (!auditId) return;
    if (analysisSocket) {
        analysisSocket.close();
        analysisSocket = null;
    }
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    analysisSocket = new WebSocket(`${protocol}//${window.location.host}/ws/audits/${auditId}/status`);
    analysisSocket.onmessage = (event) => {
        try {
            const payload = JSON.parse(event.data);
            showAnalysisProgress(payload);
            if (payload.percent >= 100 && payload.status !== 'in_progress' && payload.status !== 'idle') {
                const analysisOk = payload.status !== 'failed' && !payload.draft;
                queuePostAnalysisUiJump(analysisOk);
                setTimeout(() => runtimeBridge.loadAuditDetail?.(), 500);
                const auditData = runtimeBridge.getAuditData?.();
                if (payload.status === 'failed') {
                    showAlert(payload.message || 'Анализ завершился ошибкой', 'danger');
                } else if (payload.draft || auditData?.data_coverage?.is_preliminary) {
                    showAlert('Структура аудита создана — добавьте материалы для полноценного анализа', 'warning');
                }
                setTimeout(() => { if (analysisSocket) analysisSocket.close(); }, 1200);
            }
        } catch (e) {
            console.warn('WS parse error', e);
        }
    };
    analysisSocket.onerror = () => {
        console.warn('WebSocket недоступен, используем polling');
        pollAnalysisProgress(auditId);
    };
}

async function pollAnalysisProgress(auditId) {
    try {
        const payload = await apiRequest(`/api/audits/${auditId}/progress`);
        showAnalysisProgress(payload);
        if (payload.percent < 100 || payload.status === 'in_progress') {
            setTimeout(() => pollAnalysisProgress(auditId), 1200);
        } else {
            if (payload.status !== 'failed') {
                queuePostAnalysisUiJump(true);
            }
            runtimeBridge.loadAuditDetail?.();
        }
    } catch (e) {
        console.warn('Progress polling error', e);
    }
}

function closeAnalysisSocket() {
    if (analysisSocket) {
        analysisSocket.close();
        analysisSocket = null;
    }
}

export {
    showAnalysisProgress,
    hideAnalysisProgress,
    connectAnalysisProgress,
    closeAnalysisSocket,
};
