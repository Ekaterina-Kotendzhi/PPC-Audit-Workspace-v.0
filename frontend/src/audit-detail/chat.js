/** Audit AI chat tab — epic H4, M2.13–M2.19; UX C1–C9 (см. AI-АНАЛИЗ-ПЛАН §10.11). */
import { escapeHtml } from '../core/utils.js';
import { showAlert } from '../core/alerts.js';
import { apiRequest } from '../core/api.js';
import { buildAiUsageCaption, formatRubAmount, formatTokenCount } from '../shared/ai-usage.js';
import { runtimeBridge } from '../core/runtime-bridge.js';
import { canWrite } from '../core/auth.js';
import {
    getFindingReviewProgress,
    openFindingEditWithChatDraft,
    areaDisplayLabel,
} from './findings.js';
import { DIRECT_COPY } from './direct-copy.js';
import { renderChatAssistantBody } from './chat-message-render.js';

let pendingChatAnchor = null;
const CHAT_ASK_TIMEOUT_MS = 120_000;
let chatSuggestionCache = [];

const CHAT_PREFS_KEY = 'ppc_chat_gen_prefs';
const CHAT_STYLE_TEMPERATURE = {
    brief: 0.25,
    balanced: 0.42,
    deep: 0.58,
};

function loadChatGenPrefs() {
    try {
        const raw = localStorage.getItem(CHAT_PREFS_KEY);
        if (!raw) return { style: 'balanced', temperature: CHAT_STYLE_TEMPERATURE.balanced, customTemp: false };
        const p = JSON.parse(raw);
        const style = ['brief', 'balanced', 'deep'].includes(p?.style) ? p.style : 'balanced';
        const temp = Number(p?.temperature);
        return {
            style,
            temperature: Number.isFinite(temp) ? temp : CHAT_STYLE_TEMPERATURE[style],
            customTemp: Boolean(p?.customTemp),
        };
    } catch (_e) {
        return { style: 'balanced', temperature: CHAT_STYLE_TEMPERATURE.balanced, customTemp: false };
    }
}

function saveChatGenPrefs(prefs) {
    try {
        localStorage.setItem(CHAT_PREFS_KEY, JSON.stringify(prefs));
    } catch (_e) { /* ignore */ }
}

function getChatResponseStyle() {
    const el = document.querySelector('input[name="chatResponseStyle"]:checked');
    const v = (el?.value || 'balanced').trim();
    return ['brief', 'balanced', 'deep'].includes(v) ? v : 'balanced';
}

function getChatTemperature() {
    const range = document.getElementById('chatTemperatureRange');
    const v = Number(range?.value);
    if (!Number.isFinite(v)) return CHAT_STYLE_TEMPERATURE[getChatResponseStyle()];
    return Math.max(0, Math.min(1, v));
}

function chatStyleLabel(style) {
    const map = { brief: 'Кратко', balanced: 'Стандарт', deep: 'Развёрнуто' };
    return map[style] || style;
}

function syncChatTemperatureUi({ fromStyle = false } = {}) {
    const style = getChatResponseStyle();
    const range = document.getElementById('chatTemperatureRange');
    const valueEl = document.getElementById('chatTemperatureValue');
    if (!range) return;
    const prefs = loadChatGenPrefs();
    if (fromStyle && !prefs.customTemp) {
        range.value = String(CHAT_STYLE_TEMPERATURE[style]);
    }
    if (valueEl) valueEl.textContent = Number(range.value).toFixed(2);
}

function bindChatGenControls() {
    const root = document.getElementById('tab-chat');
    if (!root || root.dataset.chatGenBound === '1') return;
    root.dataset.chatGenBound = '1';

    const prefs = loadChatGenPrefs();
    const styleInput = document.querySelector(`input[name="chatResponseStyle"][value="${prefs.style}"]`);
    if (styleInput) styleInput.checked = true;
    const range = document.getElementById('chatTemperatureRange');
    if (range) range.value = String(prefs.temperature);
    syncChatTemperatureUi();

    root.querySelectorAll('input[name="chatResponseStyle"]').forEach((el) => {
        el.addEventListener('change', () => {
            syncChatTemperatureUi({ fromStyle: true });
            saveChatGenPrefs({
                style: getChatResponseStyle(),
                temperature: getChatTemperature(),
                customTemp: false,
            });
        });
    });
    range?.addEventListener('input', () => {
        syncChatTemperatureUi();
        saveChatGenPrefs({
            style: getChatResponseStyle(),
            temperature: getChatTemperature(),
            customTemp: true,
        });
    });
}

function getCurrentAuditId() {
    return runtimeBridge.getCurrentAuditId?.() || runtimeBridge.getAuditIdFromUrl?.() || null;
}

function getAuditData() {
    return runtimeBridge.getAuditData?.() || null;
}

function getChatAudienceMode() {
    const el = document.querySelector('input[name="chatAudienceMode"]:checked');
    return el?.value === 'client' ? 'client' : 'internal';
}

function resolveWorkflowStateCode(data) {
    const ws = data?.workflow_state;
    if (ws && typeof ws === 'object') {
        return String(ws.state || data?.workflow_ui?.screen_state || 'UNKNOWN').toUpperCase();
    }
    if (typeof ws === 'string') {
        return ws.toUpperCase();
    }
    return String(data?.workflow_ui?.screen_state || 'UNKNOWN').toUpperCase();
}

export function getSuggestedChatQuestions(auditData) {
    const data = auditData || getAuditData();
    if (!data) {
        return [{ label: 'Что в материалах?', question: 'Кратко: какие ключевые факты есть в загруженных материалах?' }];
    }
    const state = resolveWorkflowStateCode(data);
    const chips = [];

    if (state === 'BLOCKED_REQUIRED' || !data.data_coverage?.minimum_met) {
        chips.push({
            label: 'Чего не хватает для анализа?',
            question: 'Что обязательно добавить перед запуском AI-анализа?',
        });
    }
    if (state === 'READY_TO_RUN' || state === 'FAILED') {
        chips.push({
            label: 'Что проверить перед анализом?',
            question: 'Какие материалы ещё стоит проверить перед AI-анализом?',
        });
    }
    const progress = getFindingReviewProgress(data);
    if (state === 'RESULTS_NEED_REVIEW' || progress.pending > 0) {
        chips.push({
            label: 'С чего начать проверку?',
            question: 'Какие выводы проверить в первую очередь и почему?',
        });
    }
    if (['RESULTS_READY', 'PRELIMINARY_REPORT'].includes(state)) {
        chips.push({
            label: 'Главный риск одной фразой',
            question: 'Сформулируй главный риск для клиента одним предложением по текущим данным.',
        });
    }
    const monthly = data.direct_analytics?.monthly || [];
    if (monthly.length >= 2) {
        chips.push({
            label: 'Что изменилось между месяцами?',
            question: 'Что изменилось между первым и последним месяцем в Excel Директа (заявки, CPL, расход)?',
            anchor: { type: 'comparison' },
        });
    }
    const health = data.direct_analytics?.health;
    if (health && (health.health_score != null || health.grade)) {
        chips.push({
            label: DIRECT_COPY.chatChipLabel,
            question: DIRECT_COPY.healthExplainQuestion,
            anchor: { type: 'health' },
        });
    }
    if (runtimeBridge.isAnalysisStale?.(data)) {
        chips.push({
            label: 'Данные устарели?',
            question: 'Что изменилось после последнего AI-анализа и что перезапустить?',
        });
    }
    if (!chips.length) {
        chips.push({
            label: 'Что в материалах?',
            question: 'Кратко: какие ключевые факты есть в загруженных материалах?',
        });
    }
    return chips.slice(0, 5);
}

function renderChatSuggestions() {
    const container = document.getElementById('chatSuggestedQuestions');
    if (!container) return;
    chatSuggestionCache = getSuggestedChatQuestions();
    container.innerHTML = chatSuggestionCache.map((c, i) => `
        <button type="button" class="chat-chip" onclick="applyChatSuggestion(${i})">${escapeHtml(c.label)}</button>
    `).join('');
}

function applyChatSuggestion(index) {
    const chip = chatSuggestionCache[Number(index)];
    const question = chip?.question || '';
    pendingChatAnchor = chip?.anchor || null;
    const input = document.getElementById('chatQuestionInput');
    if (input) {
        input.value = question;
        input.focus();
    }
}

function renderTrustLayers(m) {
    const tl = m.trust_layers;
    if (!tl || m.role !== 'assistant') return '';
    const badges = [];
    if (tl.from_audit_sources > 0) {
        badges.push('<span class="badge badge-success chat-trust-badge">Из материалов аудита</span>');
    }
    badges.push('<span class="badge badge-draft chat-trust-badge">Интерпретация AI</span>');
    if (tl.has_kb_examples) {
        badges.push('<span class="badge badge-draft chat-trust-badge">Паттерны из базы знаний</span>');
    }
    const warn = tl.has_unsourced_numbers
        ? '<p class="chat-trust-warn">⚠️ В ответе есть цифры без ссылок на материалы — проверьте перед клиентом.</p>'
        : '';
    return `<div class="chat-trust-row">${badges.join('')}</div>${warn}`;
}

function renderKbExamplesBlock(kbExamples, msgId) {
    if (!kbExamples?.length) return '';
    const items = kbExamples.map((ex) => `
        <li><strong>${escapeHtml(ex.area || 'зона')}</strong>${ex.niche ? ` · ${escapeHtml(ex.niche)}` : ''}
            <span class="muted">${ex.distance != null ? ` · d=${ex.distance.toFixed(3)}` : ''}</span>
            <div class="muted">${escapeHtml(ex.snippet || '')}</div></li>
    `).join('');
    return `
        <details class="chat-kb-block" id="chat_kb_${msgId}">
            <summary class="muted">Похожие выводы из базы знаний (${kbExamples.length})</summary>
            <ul class="chat-kb-list">${items}</ul>
        </details>`;
}

function renderNichePatternsBlock(patterns, msgId) {
    if (!patterns?.length) return '';
    const items = patterns.map((p) => `
        <li><strong>${escapeHtml(p.label || p.area || '')}</strong>
            <span class="muted"> · ${p.audit_count || 0} аудит(ов)</span>
            <ul>${(p.sample_formulations || []).map((s) => `<li class="muted">${escapeHtml(s)}</li>`).join('')}</ul>
        </li>
    `).join('');
    return `
        <details class="chat-kb-block" id="chat_patterns_${msgId}">
            <summary class="muted">Паттерны агентства по нише (${patterns.length})</summary>
            <ul class="chat-kb-list">${items}</ul>
        </details>`;
}

function renderChatCostDetails(m) {
    if (m.role !== 'assistant') return '';
    if (m.transport === 'local' || m.provider === 'local' || !m.total_tokens) {
        return buildAiUsageCaption({ ...m, message_id: m.id });
    }
    const rub = formatRubAmount(m.cost_rub);
    const tokens = formatTokenCount(m.total_tokens);
    const label = escapeHtml(m.model_label || m.model || 'AI');
    return `
        <p>~${rub} · ${tokens} токенов · ${label}</p>
        ${buildAiUsageCaption({ ...m, message_id: m.id })}
    `;
}

function findingIdFromAnchor(anchor) {
    if (!anchor || String(anchor.type || '').toLowerCase() !== 'finding') return null;
    const id = Number(anchor.finding_id);
    return Number.isFinite(id) && id > 0 ? id : null;
}

function renderChatFindingContext(findingId, anchorLabel) {
    const f = (getAuditData()?.findings || []).find((x) => x.id === findingId);
    const label = anchorLabel || (f ? areaDisplayLabel(f.area) : '');
    const problem = String(f?.problem || '').trim();
    const short = problem.length > 140 ? `${problem.slice(0, 137)}…` : problem;
    return `
        <div class="chat-finding-ctx">
            <span class="chat-finding-ctx-label">Вопрос по выводу №${findingId}${label ? ` · ${escapeHtml(label)}` : ''}</span>
            ${short ? `<p class="chat-finding-ctx-problem muted">${escapeHtml(short)}</p>` : ''}
            <button type="button" class="btn btn-link btn-sm" onclick="goToFindingsInReport(${findingId})">Открыть карточку</button>
        </div>`;
}

function renderChatInsertIntoFindingAction(m, findingId) {
    if (!canWrite() || !findingId || m.role !== 'assistant') return '';
    return `
        <div class="chat-insert-actions">
            <button type="button" class="btn btn-primary btn-sm"
                data-msg-id="${m.id}"
                data-finding-id="${findingId}"
                onclick="applyChatAnswerToFindingFromBtn(this)">
                Вставить в правку вывода
            </button>
            <button type="button" class="btn btn-outline btn-sm"
                onclick="goToFindingsInReport(${findingId})">К выводу №${findingId}</button>
        </div>`;
}

export function applyChatAnswerToFindingFromBtn(btn) {
    if (!canWrite()) return;
    const findingId = Number(btn?.dataset?.findingId);
    const msgId = Number(btn?.dataset?.msgId);
    const row = document.querySelector(`.chat-bubble[data-msg-id="${msgId}"] .chat-answer-primary`);
    const text = row?.innerText?.trim() || chatInsertDraftByMsgId.get(msgId) || '';
    if (!findingId) {
        showAlert('Вывод не найден', 'warning');
        return;
    }
    if (!text) {
        showAlert('Нет текста ответа для вставки', 'warning');
        return;
    }
    runtimeBridge.switchTab?.('results');
    openFindingEditWithChatDraft(findingId, text);
    showAlert('Откройте три поля в модалке и сохраните — служебные пометки уже убраны.', 'success');
}

const chatInsertDraftByMsgId = new Map();

function renderAssistantDisclaimer(m) {
    const kbN = (m.kb_examples || []).length;
    const mode = m.audience_mode === 'client' ? 'Режим «как для клиента»' : 'Учтены материалы этого аудита';
    const kb = kbN > 0 && m.audience_mode !== 'client' ? ` и ${kbN} пример(ов) из базы знаний` : '';
    return `<p class="chat-disclaimer muted">${mode}${kb}.</p>`;
}

function renderChatWhyDetails(m) {
    const style = m.chat_response_style ? chatStyleLabel(m.chat_response_style) : '—';
    const temp = m.chat_temperature != null ? Number(m.chat_temperature).toFixed(2) : '—';
    return `
        provider=${escapeHtml(m.provider || 'local')} · model=${escapeHtml(m.model || 'heuristic')}
        · duration=${m.duration_ms ?? '—'}ms · fallback=${m.fallback_used ? 'yes' : 'no'}
        · context=${escapeHtml(m.context_version || 'n/a')} · mode=${escapeHtml(m.audience_mode || 'internal')}
        · стиль=${escapeHtml(style)} · temperature=${temp}
        ${renderChatCostDetails(m)}
    `;
}

function bindChatInputClearsPendingAnchor() {
    const input = document.getElementById('chatQuestionInput');
    if (!input || input.dataset.chatAnchorBound === '1') return;
    input.dataset.chatAnchorBound = '1';
    input.addEventListener('input', () => {
        pendingChatAnchor = null;
    });
}

function removeChatPending() {
    document.getElementById('chatPendingBlock')?.remove();
}

function showChatPending(question) {
    const container = document.getElementById('chatMessages');
    if (!container) return;
    const hint = container.querySelector('.chat-empty-hint');
    if (hint) hint.remove();
    removeChatPending();
    const block = document.createElement('div');
    block.id = 'chatPendingBlock';
    block.innerHTML = `
        <div class="chat-bubble chat-user">
            <div class="chat-role">Вы</div>
            <div class="chat-text">${escapeHtml(question).replace(/\n/g, '<br>')}</div>
        </div>
        <div class="chat-bubble chat-assistant chat-bubble--pending">
            <div class="chat-role">AI</div>
            <div class="chat-text muted">Формируем ответ…</div>
        </div>`;
    container.appendChild(block);
    container.scrollTop = container.scrollHeight;
}

async function renderChatHistory() {
    const container = document.getElementById('chatMessages');
    const auditId = getCurrentAuditId();
    if (!container || !auditId) return;
    bindChatInputClearsPendingAnchor();
    bindChatGenControls();
    renderChatSuggestions();
    try {
        const messages = await apiRequest(`/api/audits/${auditId}/chat`);
        if (!messages.length) {
            container.innerHTML = '<p class="muted chat-empty-hint">Задайте вопрос про метрики, материалы или вывод. Ответ будет структурирован: главное — сверху, черновик PDF — в «Подробнее».</p>';
            return;
        }
        chatInsertDraftByMsgId.clear();
        container.innerHTML = messages.map((m) => {
            const replyAnchor = m.role === 'assistant' ? m.reply_context_anchor : null;
            const findingId = findingIdFromAnchor(replyAnchor);
            if (m.role === 'assistant' && m.content) {
                chatInsertDraftByMsgId.set(m.id, String(m.content));
            }
            const audience = m.audience_mode === 'client' ? 'client' : 'internal';
            let bodyHtml = m.role === 'assistant'
                ? renderChatAssistantBody(m.content, { audienceMode: audience })
                : escapeHtml(m.content).replace(/\n/g, '<br>');
            if (m.role === 'assistant' && !String(bodyHtml || '').replace(/<[^>]+>/g, '').trim()) {
                bodyHtml = '<p class="muted">Ответ не отобразился. Обновите страницу (Ctrl+F5) и задайте вопрос снова.</p>';
            }
            const findingCtx = findingId && m.role === 'assistant'
                ? renderChatFindingContext(findingId, m.context_anchor_label)
                : '';
            const clientCls = audience === 'client' ? ' chat-bubble--client-mode' : '';
            return `
            <div class="chat-bubble chat-${m.role}${clientCls}" data-msg-id="${m.id}">
                <div class="chat-role">${m.role === 'user' ? 'Вы' : 'AI'}</div>
                ${m.role === 'user' && m.context_anchor_label
                    ? `<div class="chat-anchor-badge muted">Вопрос по: ${escapeHtml(m.context_anchor_label)}</div>`
                    : ''}
                ${findingCtx}
                <div class="chat-text">${bodyHtml}</div>
                ${m.sources && m.sources.length ? `<div class="chat-sources muted">${m.sources.map((s) => escapeHtml(s.title || s.ref)).join(' · ')}</div>` : ''}
                ${renderChatInsertIntoFindingAction(m, findingId)}
                ${m.role === 'assistant' ? renderAssistantDisclaimer(m) : ''}
                ${m.role === 'assistant' && audience === 'internal' ? renderTrustLayers(m) : ''}
                ${m.role === 'assistant' && audience === 'internal' ? renderKbExamplesBlock(m.kb_examples, m.id) : ''}
                ${m.role === 'assistant' && audience === 'internal' ? renderNichePatternsBlock(m.niche_patterns, m.id) : ''}
                ${m.role === 'assistant' && m.confidence_level ? `
                    <div class="chat-meta-row">
                        <span class="badge badge-draft">Уверенность: ${escapeHtml(m.confidence_level)}</span>
                        <button type="button" class="btn btn-outline btn-sm" onclick="toggleChatWhy('chat_why_${m.id}')">Подробнее о ответе</button>
                    </div>
                    <div id="chat_why_${m.id}" class="chat-why muted is-hidden">${renderChatWhyDetails(m)}</div>
                ` : ''}
            </div>
        `;
        }).join('');
        container.scrollTop = container.scrollHeight;
    } catch (_e) {
        container.innerHTML = '<p class="muted">Не удалось загрузить историю вопросов.</p>';
    }
}

function toggleChatWhy(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle('is-hidden');
}

async function sendAuditQuestion() {
    const input = document.getElementById('chatQuestionInput');
    const btn = document.getElementById('chatSendBtn');
    const verifiedOnly = document.getElementById('chatVerifiedOnlyCheckbox')?.checked === true;
    const question = (input?.value || '').trim();
    const auditId = getCurrentAuditId();
    if (!question) {
        showAlert('Введите вопрос', 'warning');
        return;
    }
    if (btn) {
        btn.disabled = true;
        btn.dataset.chatBusy = '1';
        if (!btn.dataset.chatLabel) btn.dataset.chatLabel = btn.textContent || '';
        btn.textContent = 'Отправка…';
    }
    showChatPending(question);
    const audienceMode = getChatAudienceMode();
    const responseStyle = getChatResponseStyle();
    const body = {
        question,
        include_unverified: audienceMode === 'client' ? false : !verifiedOnly,
        model_id: runtimeBridge.getSelectedModelId?.('chat'),
        audience_mode: audienceMode,
        response_style: responseStyle,
        temperature: getChatTemperature(),
    };
    saveChatGenPrefs({
        style: responseStyle,
        temperature: getChatTemperature(),
        customTemp: loadChatGenPrefs().customTemp,
    });
    if (pendingChatAnchor) {
        body.context_anchor = pendingChatAnchor;
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CHAT_ASK_TIMEOUT_MS);
    try {
        const resp = await apiRequest(`/api/audits/${auditId}/chat/ask`, {
            method: 'POST',
            body: JSON.stringify(body),
            signal: controller.signal,
        });
        pendingChatAnchor = null;
        if (input) input.value = '';
        if (resp.needs_review_note) showAlert(resp.needs_review_note, 'warning');
        if (resp.confidence_level === 'low') {
            showAlert('Низкая уверенность: проверьте цифры по материалам.', 'warning');
        }
        removeChatPending();
        await renderChatHistory();
    } catch (error) {
        removeChatPending();
        const msg = error?.name === 'AbortError'
            ? 'Ответ слишком долгий (таймаут 2 мин). Попробуйте «Стандарт» вместо «Развёрнуто» или повторите позже.'
            : error.message;
        showAlert('Ошибка: ' + msg, 'danger');
        await renderChatHistory().catch(() => {});
    } finally {
        clearTimeout(timeoutId);
        if (btn) {
            btn.disabled = false;
            delete btn.dataset.chatBusy;
            if (btn.dataset.chatLabel) {
                btn.textContent = btn.dataset.chatLabel;
                delete btn.dataset.chatLabel;
            }
        }
    }
}

export async function askInChat({ question, context_anchor, autoSend = true }) {
    runtimeBridge.switchTab?.('chat');
    const input = document.getElementById('chatQuestionInput');
    if (input) input.value = question || '';
    pendingChatAnchor = context_anchor || null;
    renderChatSuggestions();
    if (autoSend && question) {
        await sendAuditQuestion();
    } else if (input) {
        input.focus();
    }
}

export function askFromFinding(findingId) {
    if (!canWrite()) return;
    const data = getAuditData();
    const f = (data?.findings || []).find((x) => x.id === findingId);
    if (!f) {
        showAlert('Вывод не найден', 'warning');
        return;
    }
    const kind = f.finding_kind || 'hypothesis';
    const question = kind === 'hypothesis'
        ? 'Почему этот вывод помечен как гипотеза и что нужно проверить?'
        : 'Поясни этот вывод: на что он опирается и какие рекомендации дать клиенту?';
    askInChat({
        question,
        context_anchor: { type: 'finding', finding_id: findingId },
        autoSend: true,
    });
}

export function askAboutComparison() {
    askInChat({
        question: 'Что изменилось между первым и последним периодом по KPI?',
        context_anchor: { type: 'comparison' },
        autoSend: true,
    });
}

export function askAboutHealthScore() {
    askInChat({
        question: DIRECT_COPY.healthExplainQuestion,
        context_anchor: { type: 'health' },
        autoSend: true,
    });
}

export {
    renderChatHistory,
    renderChatSuggestions,
    toggleChatWhy,
    sendAuditQuestion,
    applyChatSuggestion,
};
