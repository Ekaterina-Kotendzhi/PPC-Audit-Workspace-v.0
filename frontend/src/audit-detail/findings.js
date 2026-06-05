/** Findings review (G7) — epic H3. */
import { parseApiDateMs, formatDate } from '../shared/timezone.js';
import { escapeHtml, humanizeDisplayText, formatMoney, formatNumber, jsAttr } from '../core/utils.js';
import { showAlert } from '../core/alerts.js';
import { closeModal, openModal, showConfirmDialog, showPromptDialog } from '../core/modals.js';
import { apiRequest, findingFeedbackUrl } from '../core/api.js';
import { requireWriteAccess, canWrite, isAdminUser } from '../core/auth.js';
import { runtimeBridge } from '../core/runtime-bridge.js';
import { isPreliminaryAudit } from './workflow.js';
import { DIRECT_COPY } from './direct-copy.js';
import { DIRECT_HEALTH_INFO } from './direct-health-rules-reference.js';
import {
    getCatalogRefsWithoutAi,
    isStubEnrichmentFinding,
    openFindingsStubEnrichment,
} from './direct-enrichment-ux.js';
import {
    parseChatDraftForFinding,
    hasInternalReportLeak,
    findSimilarConfirmedFindings,
    buildPdfObservationPreviewHtml,
} from './finding-report-text.js';

function getAuditData() {
    return runtimeBridge.getAuditData?.() || null;
}

function getCurrentAuditId() {
    return runtimeBridge.getCurrentAuditId?.() || runtimeBridge.getAuditIdFromUrl?.() || null;
}

function hasGuidedCompletedAnalysis(data) {
    const ws = data?.workflow_state || {};
    if (ws.analysis_running) return false;
    return ws.state === 'ANALYSIS_DONE'
        || ws.state === 'REPORT_READY'
        || data?.status === 'completed';
}

function isDirectHealthFinding(f) {
    if (!f) return false;
    if (f.finding_source === 'direct_health') return true;
    if (f.original_ai_output?.source === 'direct_health') return true;
    if ((f.evidence || []).some((e) => e?.source === 'direct_health')) return true;
    const based = String(f.based_on || '').toLowerCase();
    if (/автопроверка excel|мастер отчёт|direct_analytics|оценка кабинета/.test(based)) return true;
    return false;
}

function getDirectHealthRuleTitle(f) {
    const title = String(f?.title || '').trim();
    if (title && title !== 'Риск Директа') return title;
    const rule = f?.original_ai_output?.rule;
    if (rule?.title) return String(rule.title).trim();
    const template = f?.original_ai_output?.template;
    if (template?.title) return String(template.title).trim();
    return DIRECT_HEALTH_INFO.checksTitle;
}

function hasDirectAnalyticsSlice(data) {
    return Boolean((data?.direct_analytics?.monthly || []).length);
}

function hasDirectHealthScore(data) {
    return Boolean(data?.direct_analytics?.health);
}

function countAiFindings(findings) {
    return (findings || [])
        .filter((f) => f.status !== 'human_rejected')
        .filter((f) => !isDirectHealthFinding(f))
        .length;
}

function buildAiFindingByDirectRef(findings) {
    const map = new Map();
    for (const f of findings || []) {
        if (!isAiInterpretationFinding(f)) continue;
        const key = directRiskRefKey(getDirectRiskRef(f));
        if (key && !map.has(key)) map.set(key, f);
    }
    return map;
}

function openAiFindingFromDirectRisk(refKey) {
    if (!refKey) return;
    const data = getAuditData();
    const aiFinding = buildAiFindingByDirectRef(data?.findings).get(refKey);
    runtimeBridge.switchTab?.('results');
    window.requestAnimationFrame(() => {
        window.setTimeout(() => {
            if (aiFinding?.id) {
                const el = document.getElementById(`finding-${aiFinding.id}`);
                el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                el?.classList.add('direct-slice-highlight');
                window.setTimeout(() => el?.classList.remove('direct-slice-highlight'), 2200);
                return;
            }
            openFindingsStubEnrichment();
        }, 120);
    });
}

function renderDirectRisksOnDirectPage(data, options = {}) {
    const findings = data?.findings || [];
    const simplified = options.simplified !== false && !hasGuidedCompletedAnalysis(data);
    const aiByRef = simplified ? new Map() : buildAiFindingByDirectRef(findings);
    const directs = findings.filter(isDirectHealthFinding).filter((f) => f.status !== 'human_rejected');
    const syncBtn = `<button type="button" class="btn btn-sm btn-outline-primary" onclick="syncDirectHealthFindings()">${DIRECT_COPY.syncRisksOnDirectPage}</button>`;
    if (!directs.length) {
        return `
        <div id="direct-slice-risks" class="direct-risks-panel direct-risks-panel--empty">
            <h5 class="direct-risks-panel-title">${DIRECT_COPY.risksLabel}</h5>
            <p class="muted direct-risks-panel-empty">Нажмите «${DIRECT_COPY.syncRisksOnDirectPage}», чтобы загрузить автопроверки из Excel.</p>
            ${syncBtn}
        </div>`;
    }
    const rows = directs.map((d) => {
        const title = getDirectHealthRuleTitle(d);
        const problem = String(d.problem || '').trim();
        const refKey = directRiskRefKey(getDirectRiskRef(d));
        const refAttr = refKey ? ` data-direct-risk="${escapeHtml(refKey)}"` : '';
        const aiFinding = refKey ? aiByRef.get(refKey) : null;
        const aiLink = simplified || !refKey
            ? ''
            : (aiFinding
                ? `<button type="button" class="btn btn-link btn-sm direct-risk-ai-link" onclick="openAiFindingFromDirectRisk('${jsAttr(refKey)}')">${escapeHtml(DIRECT_COPY.aiFindingLinkBtn)}</button>`
                : `<button type="button" class="btn btn-link btn-sm direct-risk-ai-link muted" onclick="setFindingsMarketerFilter('no_ai'); switchTab('results')">${escapeHtml(DIRECT_COPY.filterNoAiEnrichment)}</button>`);
        return `<li class="direct-risk-row"${refAttr}>
            <div class="direct-risk-row-head">
                <strong class="direct-risk-row-title">${escapeHtml(title)}</strong>
                ${aiLink}
            </div>
            ${problem ? `<p class="muted direct-risk-row-problem">${escapeHtml(problem.slice(0, 120))}</p>` : ''}
        </li>`;
    }).join('');
    const body = `
            <ul class="direct-risks-list">${rows}</ul>
            <div class="direct-risks-panel-actions">${syncBtn}</div>`;
    if (simplified) {
        return `
        <details id="direct-slice-risks" class="direct-risks-panel direct-risks-panel--collapsed">
            <summary class="direct-risks-panel-summary">Автопроверки из Excel (${directs.length}) — до AI-анализа</summary>
            ${body}
        </details>`;
    }
    return `
        <div id="direct-slice-risks" class="direct-risks-panel">
            <div class="direct-risks-panel-head">
                <h5 class="direct-risks-panel-title">${DIRECT_COPY.risksLabel}</h5>
                <span class="muted direct-risks-panel-count">${directs.length}</span>
            </div>
            ${body}
        </div>`;
}

function scrollToDirectRisks() {
    runtimeBridge.switchTab?.('data');
    runtimeBridge.switchDataSubtab?.('direct');
    document.getElementById('direct-slice-risks')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function openDirectExcelSource(findingId) {
    const finding = getFindingById(findingId);
    if (!finding) return;
    const ref = getDirectRiskRef(finding);
    runtimeBridge.switchTab?.('data');
    runtimeBridge.switchDataSubtab?.('direct');
    const scroll = () => {
        if (ref) {
            const key = directRiskRefKey(ref);
            const row = document.querySelector(`[data-direct-risk="${key}"]`);
            if (row) {
                document.getElementById('direct-slice-risks')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                row.classList.add('direct-slice-highlight');
                window.setTimeout(() => row.classList.remove('direct-slice-highlight'), 2200);
                return;
            }
        }
        scrollToDirectRisks();
    };
    window.requestAnimationFrame(() => window.setTimeout(scroll, 120));
}

function getDirectRiskRef(f) {
    if (!f) return null;
    const fromField = f.direct_risk_ref;
    if (fromField?.kind && fromField.id != null) {
        return { kind: String(fromField.kind), id: String(fromField.id) };
    }
    const fromOrig = f.original_ai_output?.direct_risk_ref;
    if (fromOrig?.kind && fromOrig.id != null) {
        return { kind: String(fromOrig.kind), id: String(fromOrig.id) };
    }
    const ev = (f.evidence || []).find((e) => e?.source === 'direct_health');
    if (ev?.kind === 'template' && ev.template_id) {
        return { kind: 'template', id: String(ev.template_id) };
    }
    if (ev?.kind === 'rule' && ev.rule_id != null) {
        return { kind: 'rule', id: String(ev.rule_id) };
    }
    return null;
}

function directRiskRefKey(ref) {
    if (!ref?.kind || ref.id == null) return '';
    return `${ref.kind}:${ref.id}`;
}

function isAiInterpretationFinding(f) {
    return Boolean(f) && !isDirectHealthFinding(f) && Boolean(getDirectRiskRef(f));
}

function getLinkedDirectRiskTitle(f, findings) {
    const ref = getDirectRiskRef(f);
    if (!ref) return '';
    const direct = (findings || []).find((d) => {
        if (!isDirectHealthFinding(d)) return false;
        return directRiskRefKey(getDirectRiskRef(d)) === directRiskRefKey(ref);
    });
    if (direct) return getDirectHealthRuleTitle(direct);
    return String(f?.title || '').trim() || '—';
}

function findingInReviewQueue(f, data) {
    if (!f) return false;
    if (isDirectHealthFinding(f)) return false;
    const status = f.status || 'ai_generated';
    if (status === 'human_rejected') return false;
    if (['human_confirmed', 'human_edited'].includes(status)) return true;
    if (hasGuidedCompletedAnalysis(data)) return true;
    return Boolean(f.needs_review);
}

function isFindingPendingReview(f, data = getAuditData()) {
    if (!f || f.status === 'human_rejected') return false;
    if (['human_confirmed', 'human_edited'].includes(f.status)) return false;
    return findingInReviewQueue(f, data);
}

/** Прогресс проверки выводов: reviewed = подтверждено/отклонено, total = всего в очереди. */
function getFindingReviewProgress(data) {
    const findings = data?.findings || [];
    const inQueue = findings.filter((f) => findingInReviewQueue(f, data));
    const reviewed = inQueue.filter((f) =>
        ['human_confirmed', 'human_edited', 'human_rejected'].includes(f.status)
    ).length;
    return {
        reviewed,
        total: inQueue.length,
        pending: Math.max(0, inQueue.length - reviewed),
    };
}

function formatReviewProgressLine(progress) {
    if (!progress || progress.total <= 0) return '';
    return `Проверка выводов: ${progress.reviewed} из ${progress.total}`;
}

function formatReviewRemainingLine(progress) {
    if (!progress || progress.pending <= 0) return '';
    return `Осталось проверить: ${progress.pending}`;
}

function getPostAnalysisDataImprovements(data) {
    return (data?.data_issues || []).filter(
        (i) => !i.resolved && i.visible_after_analysis && i.issue_type === 'missing_data'
    );
}

function isAnalysisStale(data) {
    return Boolean(data?.analysis_freshness?.analysis_stale);
}

function buildFindingReviewBannerModel(data) {
    const progress = getFindingReviewProgress(data);
    const improvements = getPostAnalysisDataImprovements(data);
    const pending = progress.pending;
    let title;
    let hint;
    let badge;
    if (pending > 0) {
        title = pending === 1
            ? 'Остался 1 AI-вывод без решения'
            : `Осталось AI-выводов: ${pending}`;
        hint = `${formatReviewProgressLine(progress)}. Подтверждение → отчёт и база знаний.`;
        badge = `Проверка · ${progress.reviewed}/${progress.total}`;
    } else if (improvements.length > 0) {
        title = 'Решения по выводам приняты';
        hint = progress.total > 0
            ? `${formatReviewProgressLine(progress)}. Данные можно улучшить (не блокирует отчёт) или открыть черновик.`
            : 'Данные можно улучшить (не блокирует отчёт) или открыть черновик.';
        badge = progress.total > 0 ? `Проверка · ${progress.total}/${progress.total}` : 'Готово';
    } else {
        title = 'Решения по выводам приняты';
        hint = 'Можно открыть отчёт для клиента.';
        badge = progress.total > 0 ? `Проверка · ${progress.total}/${progress.total}` : 'Готово';
    }
    return { progress, improvements, pending, title, hint, badge };
}
function pluralizeFindingsCount(n) {
    const abs = Math.abs(Number(n) || 0);
    const mod10 = abs % 10;
    const mod100 = abs % 100;
    if (mod100 >= 11 && mod100 <= 14) return `${abs} выводов`;
    if (mod10 === 1) return `${abs} вывод`;
    if (mod10 >= 2 && mod10 <= 4) return `${abs} вывода`;
    return `${abs} выводов`;
}

function pluralizeFindingsReview(n) {
    const abs = Math.abs(Number(n) || 0);
    const mod10 = abs % 10;
    const mod100 = abs % 100;
    if (mod100 >= 11 && mod100 <= 14) return `${abs} выводов требуют проверки`;
    if (mod10 === 1) return `${abs} вывод требует проверки`;
    if (mod10 >= 2 && mod10 <= 4) return `${abs} вывода требуют проверки`;
    return `${abs} выводов требуют проверки`;
}
const FINDING_AREA_LABELS = {
    crm: 'CRM и продажи',
    semantics: 'Семантика (ключевые слова)',
    landing: 'Посадочные страницы',
    analytics: 'Аналитика',
    budget: 'Бюджет и ставки',
    structure: 'Структура кампаний',
    creatives: 'Креативы',
};

function areaDisplayLabel(area) {
    const key = String(area || '').toLowerCase();
    return FINDING_AREA_LABELS[key] || (area ? String(area) : '');
}

function isFindingLowEvidence(f) {
    const ev = String(f?.evidence_level || 'weak').toLowerCase();
    return ev === 'weak' || ev === 'none';
}

/** Статус действия для маркетолога (не путать с workflow status). */
function classifyMarketerActionStatus(f) {
    const status = f?.status || 'ai_generated';
    if (status === 'human_rejected') {
        return { code: 'rejected', label: 'Отклонён', css: 'finding-queue-rejected' };
    }
    if (['human_confirmed', 'human_edited'].includes(status)) {
        return { code: 'report', label: 'В отчёте', css: 'finding-queue-report' };
    }
    if (isFindingDataGapCard(f)) {
        return { code: 'needs_data', label: 'Нужны данные', css: 'finding-queue-needs-data' };
    }
    const sev = String(f?.severity || 'medium').toLowerCase();
    const lowEv = isFindingLowEvidence(f);
    if (sev === 'high' && lowEv) {
        return { code: 'urgent', label: 'Сначала этот', css: 'finding-queue-urgent' };
    }
    if ((sev === 'high' || sev === 'medium') && !lowEv) {
        return { code: 'act_now', label: 'На проверку', css: 'finding-queue-act' };
    }
    return { code: 'check_later', label: 'Не срочно', css: 'finding-queue-later' };
}

function isLowSignalFindingHeadline(problem, f) {
    const p = String(problem || '').trim().toLowerCase();
    if (!p || p === '—') return true;
    if (/^исходный\s+риск/.test(p)) return true;
    if (/риск\s+на\s+директ/.test(p) && p.length < 90) return true;
    if (isAiInterpretationFinding(f) && p.length < 48) return true;
    return false;
}

function buildFindingCardHeadline(f, findings) {
    const problem = String(f?.problem || '').trim();
    if (!isLowSignalFindingHeadline(problem, f)) return problem || '—';
    const rec = String(f.recommendation || '').trim();
    if (rec.length > 24) {
        return rec.length > 220 ? `${rec.slice(0, 217)}…` : rec;
    }
    const risk = getLinkedDirectRiskTitle(f, findings);
    return (risk && risk !== '—') ? risk : (problem || '—');
}

function findingHeadlineMatchesRec(headline, rec) {
    const h = String(headline || '').trim().toLowerCase();
    const r = String(rec || '').trim().toLowerCase();
    if (!h || !r || h === '—' || r === '—') return false;
    if (h === r) return true;
    const slice = Math.min(72, h.length, r.length);
    return h.slice(0, slice) === r.slice(0, slice);
}

function buildFindingVerdictLines(f) {
    const headline = buildFindingCardHeadline(f, getAuditData()?.findings);
    const lowEv = isFindingLowEvidence(f);
    const ev = String(f?.evidence_level || 'weak').toLowerCase();
    let sub = evidenceLevelLabel(ev);
    if (lowEv) sub = 'Гипотеза — мало данных в материалах';
    else if (ev === 'strong') sub = 'Есть опора на материалы аудита';
    return { headline, sub };
}

function severityLabel(value) {
    return { high: 'высокий', medium: 'средний', low: 'низкий' }[String(value || '').toLowerCase()] || value || '—';
}

function isTrivialFindingNote(text) {
    const t = String(text || '').trim().toLowerCase();
    return !t || t === 'нет' || t === '—' || t === 'n/a' || t.length < 3;
}

function renderMarketerMissingBlock(f) {
    if (f.status === 'human_rejected') return '';
    const text = getFindingReviewReasonText(f);
    if (!text || isTrivialFindingNote(text)) return '';
    return `<p class="finding-inline-gap"><strong>Нужны данные:</strong> ${escapeHtml(text)}</p>`;
}

function renderFindingRejectReasonLine(f) {
    if ((f.status || '') !== 'human_rejected') return '';
    const reason = String(f.review_reason || '').trim();
    if (!reason || isTrivialFindingNote(reason)) return '';
    return `<p class="finding-reject-reason muted"><strong>Причина отклонения:</strong> ${escapeHtml(reason)}</p>`;
}

const FINDING_DRAFT_COMMENT = 'Черновик из AI-чата — проверьте поля перед сохранением.';

function shouldShowFindingHumanComment(f) {
    const c = String(f.human_comment || '').trim();
    if (!c || isTrivialFindingNote(c)) return false;
    if (c === FINDING_DRAFT_COMMENT) return false;
    return true;
}

function isCompactFindingCard(f) {
    if (findingsMarketerFilter !== 'pending') return true;
    if ((f.status || '') === 'human_rejected') return true;
    if (['human_confirmed', 'human_edited'].includes(f.status || '')) return true;
    if (isStubEnrichmentFinding(f)) return true;
    const problem = String(f.problem || '').trim();
    const rec = String(f.recommendation || '').trim();
    return problem.length < 220 && rec.length < 320;
}

function shouldShowFindingQueueBadge(f, actionStatus) {
    if (findingsMarketerFilter === 'report' && actionStatus.code === 'report') return false;
    if (findingsMarketerFilter === 'rejected' && actionStatus.code === 'rejected') return false;
    return true;
}

function shouldShowInterpRiskLink(f, headline) {
    if (!isAiInterpretationFinding(f)) return false;
    const riskTitle = String(getLinkedDirectRiskTitle(f, getAuditData()?.findings) || '').trim();
    if (!riskTitle || riskTitle === '—') return false;
    const head = String(headline || '').toLowerCase();
    const risk = riskTitle.toLowerCase().replace(/\s+/g, ' ');
    if (risk.length < 12) return false;
    return !head.includes(risk.slice(0, Math.min(36, risk.length)));
}

function renderMarketerExpertDetails(f) {
    const pending = isFindingPendingReview(f);
    const action = classifyMarketerActionStatus(f);
    const rows = [
        ['Источник данных', DIRECT_COPY.findingSource],
        ['Приоритет', severityLabel(f.severity)],
        ['Доказательства', evidenceLevelLabel(f.evidence_level)],
        ['Тип', findingTypeDisplayLabel(f)],
        ['Категория', areaDisplayLabel(f.area) || f.area || '—'],
        ['База знаний', renderFindingKbPreviewLine(f)],
    ];
    if (!pending) {
        rows.unshift(['Статус', findingStatusLabel(f)]);
    }
    const body = rows.map(([dt, dd]) => `
        <div class="finding-meta-row-item"><dt>${escapeHtml(dt)}</dt><dd>${escapeHtml(dd)}</dd></div>`).join('');
    return `
        <details class="finding-expert-details">
            <summary>Детали вывода</summary>
            <dl class="finding-meta-panel finding-meta-panel--expert">${body}</dl>
            <p class="muted finding-expert-queue-note">Очередь: ${escapeHtml(action.label)}</p>
        </details>`;
}

function findingKindLabel(kind) {
    return {
        confirmed: 'Факт (AI)',
        hypothesis: 'Гипотеза',
        needs_data: 'Нужны данные',
        risk_pattern: 'Паттерн риска',
    }[kind] || kind || 'Гипотеза';
}

let findingEditPreviewBound = false;

function setFindingEditMode(mode) {
    const overlay = document.getElementById('findingEditModal');
    const expandBtn = document.getElementById('findingEditExpertExpand');
    const collapseBtn = document.getElementById('findingEditExpertToggle');
    if (!overlay) return;
    const isQuick = mode === 'quick';
    overlay.classList.toggle('finding-edit-mode-quick', isQuick);
    overlay.classList.toggle('finding-edit-mode-expert', !isQuick);
    if (expandBtn) expandBtn.hidden = !isQuick;
    if (collapseBtn) collapseBtn.hidden = isQuick;
}

function bindFindingEditPreviewListeners() {
    if (findingEditPreviewBound) return;
    findingEditPreviewBound = true;
    const ids = ['findingEditProblem', 'findingEditRecommendation', 'findingEditImpact', 'findingEditAreaSelect'];
    ids.forEach((id) => {
        document.getElementById(id)?.addEventListener('input', updateFindingEditPdfPreview);
        document.getElementById(id)?.addEventListener('change', updateFindingEditPdfPreview);
    });
    document.getElementById('findingEditExpertExpand')?.addEventListener('click', () => setFindingEditMode('expert'));
    document.getElementById('findingEditExpertToggle')?.addEventListener('click', () => setFindingEditMode('quick'));
}

function updateFindingEditPdfPreview() {
    const box = document.getElementById('findingEditPdfPreview');
    const body = document.getElementById('findingEditPdfPreviewBody');
    if (!box || !body) return;
    const areaKey = document.getElementById('findingEditAreaSelect')?.value
        || document.getElementById('findingEditArea')?.value
        || 'other';
    body.innerHTML = buildPdfObservationPreviewHtml({
        areaLabel: areaDisplayLabel(areaKey),
        problem: document.getElementById('findingEditProblem')?.value,
        recommendation: document.getElementById('findingEditRecommendation')?.value,
        expectedImpact: document.getElementById('findingEditImpact')?.value,
    });
    box.hidden = false;
}

function configureFindingEditModal(f, options = {}) {
    const mode = options.mode === 'expert' ? 'expert' : 'quick';
    const fromChat = Boolean(options.fromChat);
    bindFindingEditPreviewListeners();
    setFindingEditMode(mode);

    const titleEl = document.getElementById('findingEditModalTitle');
    const introEl = document.getElementById('findingEditModalIntro');
    if (titleEl) {
        titleEl.textContent = mode === 'expert' ? 'Правка вывода' : 'Перед отправкой в отчёт';
    }
    if (introEl) {
        introEl.textContent = fromChat
            ? 'Текст из чата подготовлен для PDF: убраны № выводов и [mat_N]. Проверьте три поля и сохраните.'
            : mode === 'quick'
                ? 'Кратко: факт, действия и эффект — так увидит клиент в блоке «Согласованные наблюдения».'
                : 'Проверьте вывод: что не так, что предлагаем сделать и какой эффект ожидаем.';
    }

    const areaReadonly = document.getElementById('findingEditAreaReadonly');
    const areaSelect = document.getElementById('findingEditAreaSelect');
    const areaHidden = document.getElementById('findingEditArea');
    const areaKey = String(f?.area || 'other').toLowerCase();
    if (areaHidden) areaHidden.value = areaKey;
    if (areaSelect) areaSelect.value = FINDING_AREA_LABELS[areaKey] ? areaKey : 'other';
    if (areaReadonly) {
        areaReadonly.hidden = true;
        areaReadonly.textContent = '';
    }

    const problemLabel = document.getElementById('findingEditProblemLabel');
    const recLabel = document.getElementById('findingEditRecommendationLabel');
    const impactLabel = document.getElementById('findingEditImpactLabel');
    const kbLabel = document.getElementById('findingEditKbLabel');
    if (problemLabel) problemLabel.textContent = 'Что не так';
    if (recLabel) recLabel.textContent = 'Что сделать';
    if (impactLabel) impactLabel.textContent = 'Ожидаемый эффект';
    if (kbLabel) kbLabel.textContent = 'Использовать этот вывод в будущих аудитах';
}

function findingTypeDisplayLabel(f) {
    if (!f) return 'Гипотеза';
    if (f.finding_kind === 'risk_pattern') return 'Паттерн риска';
    if (isFindingDataGapCard(f)) return 'Паттерн риска';
    return findingKindLabel(f.finding_kind);
}

const FINDING_DATA_GAP_AREAS = new Set(['crm', 'semantics', 'landing', 'analytics', 'budget', 'structure', 'creatives']);

/** Можно ли подтвердить через «В отчёт (шаблон)» — зеркало prepare_risk_pattern_confirm на бэкенде. */
function canConfirmFindingRiskPattern(f) {
    if (!f || isDirectHealthFinding(f)) return false;
    const kind = String(f.finding_kind || '').toLowerCase();
    if (kind === 'risk_pattern' || kind === 'needs_data') return true;
    if (!['needs_data', 'risk_pattern', 'hypothesis', 'confirmed'].includes(kind)) return false;
    if (['human_confirmed', 'human_edited', 'human_rejected'].includes(f.status || '')) return false;
    if (isDataLimitationFinding(f)) return true;
    if (String(f.missing_data || '').trim()) return true;
    if (String(f.review_reason || '').trim()) return true;
    const area = String(f.area || '').toLowerCase();
    if (FINDING_DATA_GAP_AREAS.has(area) && (f.needs_review || isFindingPendingReview(f))) return true;
    const hay = `${f.problem || ''} ${f.recommendation || ''} ${f.missing_data || ''}`.toLowerCase();
    return /нужн|не хватает|отсутств|нет выгрузк|для подтверждения|недостаточно данных/i.test(hay);
}

function isFindingDataGapCard(f) {
    if (!f || isDirectHealthFinding(f) || f.finding_kind === 'risk_pattern') return false;
    if (['human_confirmed', 'human_edited', 'human_rejected'].includes(f.status || '')) return false;
    if (isDataLimitationFinding(f)) return true;
    if (String(f.missing_data || '').trim()) return true;
    const area = String(f.area || '').toLowerCase();
    const ctx = resolveFindingDataAction(f);
    if (!ctx) return false;
    if (FINDING_DATA_GAP_AREAS.has(area) && isFindingPendingReview(f)) return true;
    if (String(f.review_reason || '').trim()) return true;
    const hay = `${f.problem || ''} ${f.recommendation || ''} ${f.missing_data || ''}`.toLowerCase();
    if (/нужн|не хватает|отсутств|нет выгрузк|для подтверждения|недостаточно данных/i.test(hay)) return true;
    return false;
}

function getFindingReviewReasonText(f) {
    if (isDirectHealthFinding(f)) return '';
    const explicit = String(f.review_reason || '').trim();
    if (explicit) return explicit;
    const missing = String(f.missing_data || '').trim();
    if (missing) return missing;
    const area = String(f.area || '').toLowerCase();
    const defaults = {
        crm: 'Нет выгрузки CRM со статусами и продажами для подтверждения вывода.',
        semantics: 'Для подтверждения нужна выгрузка поисковых запросов из рекламного кабинета.',
        landing: 'Нужны данные по посадочным страницам и их соответствию рекламному интенту.',
        analytics: 'Нужны дополнительные аналитические данные для подтверждения вывода.',
        budget: 'Нужны уточнённые метрики и период для подтверждения вывода.',
        structure: 'Нужны данные по структуре кампаний для подтверждения вывода.',
        creatives: 'Нужны материалы по креативам или скриншоты кампаний.',
    };
    if (defaults[area] && isFindingDataGapCard(f)) return defaults[area];
    return '';
}

function renderFindingReviewReasonBlock(f) {
    const explicit = String(f.review_reason || '').trim();
    const missing = String(f.missing_data || '').trim();
    if (!explicit && !missing && !isFindingDataGapCard(f)) return '';
    const text = getFindingReviewReasonText(f);
    if (!text) return '';
    return `<div class="needs-review-block"><span class="review-label">Причина проверки:</span> ${escapeHtml(text)}</div>`;
}

function renderFindingKbPreviewLine(f) {
    const status = f?.status || 'ai_generated';
    if (['human_confirmed', 'human_edited'].includes(status)) {
        if (f.finding_kind === 'risk_pattern' && f.kb_eligible) {
            return 'Паттерн риска сохранён в базе знаний для других аудитов.';
        }
        if (countsAsGlobalKbFinding(f)) {
            return 'Универсальный вывод в базе знаний; учтён в отчёте этого аудита.';
        }
        if (isDataLimitationFinding(f)) {
            return 'Подтверждено только в этом аудите (шаблон ограничения).';
        }
        return 'Учтён в отчёте этого аудита.';
    }
    if (isFindingDataGapCard(f)) {
        return 'После «Подтвердить и обучить» — в отчёте и в базе знаний.';
    }
    if (f?.kb_eligible) {
        return 'Будет отправлено в базу знаний после подтверждения.';
    }
    return 'После подтверждения попадёт в отчёт; в базу знаний — если отмечено при подтверждении.';
}

function describeFindingOutcomeMessage(saved, action = 'confirm') {
    const inReport = ['human_confirmed', 'human_edited'].includes(saved?.status);
    const inKb = Boolean(saved?.kb_eligible) && (saved?.finding_kind === 'risk_pattern' || countsAsGlobalKbFinding(saved));
    if (action === 'reject') {
        return 'Вывод отклонён: не попадёт в отчёт и базу знаний; не используется при следующем AI-анализе.';
    }
    if (action === 'risk_pattern') {
        return inKb
            ? 'Ограничение подтверждено: паттерн риска в базе знаний и в отчёте этого аудита.'
            : 'Ограничение подтверждено в отчёте (база знаний недоступна или вывод не прошёл проверку).';
    }
    if (action === 'edit') {
        return inKb
            ? 'Исправленная версия сохранена в отчёте и отправлена в базу знаний.'
            : 'Исправленная версия сохранена в отчёте этого аудита.';
    }
    if (inReport && inKb) {
        return 'Вывод подтверждён: добавлен в отчёт и в базу знаний для других аудитов.';
    }
    if (inReport) {
        return 'Вывод подтверждён в отчёте этого аудита.';
    }
    return 'Действие сохранено.';
}

const EVIDENCE_LEVEL_LABELS = {
    strong: 'Сильные доказательства',
    medium: 'Средние доказательства',
    weak: 'Слабые доказательства',
    none: 'Нет доказательств',
};

function evidenceLevelLabel(level) {
    const key = String(level || 'weak').toLowerCase();
    return EVIDENCE_LEVEL_LABELS[key] || key;
}

function renderEvidenceLevelBadge(f) {
    const level = String(f?.evidence_level || 'weak').toLowerCase();
    return `<span class="badge badge-evidence-${level}" title="Уровень доказательности по материалам">${escapeHtml(evidenceLevelLabel(level))}</span>`;
}

let findingsMarketerFilter = 'pending';
let findingsMarketerFilterAuditId = null;

function defaultFindingsMarketerFilter(findings, data) {
    const pending = getFindingReviewProgress(data).pending;
    if (pending > 0) return 'pending';
    return countMarketerFindingsFilter(findings, 'report', data) > 0 ? 'report' : 'pending';
}

function resetFindingsMarketerFilterForAudit(findings, auditId, data) {
    if (!auditId || findingsMarketerFilterAuditId === auditId) return;
    findingsMarketerFilterAuditId = auditId;
    findingsMarketerFilter = defaultFindingsMarketerFilter(findings, data);
}

/** Подстроить фильтр после confirm/reject, чтобы не оставаться на пустой «На проверку». */
function syncFindingsMarketerFilter(findings, data) {
    const progress = getFindingReviewProgress(data);
    const pending = progress.pending;
    const inReport = countMarketerFindingsFilter(findings, 'report', data);

    if (findingsMarketerFilter === 'all') {
        findingsMarketerFilter = defaultFindingsMarketerFilter(findings, data);
    }
    if (pending > 0 && findingsMarketerFilter === 'pending' && countMarketerFindingsFilter(findings, 'pending', data) === 0) {
        findingsMarketerFilter = inReport > 0 ? 'report' : 'pending';
    }
    if (pending === 0 && findingsMarketerFilter === 'pending') {
        findingsMarketerFilter = inReport > 0 ? 'report' : 'pending';
    }
    if (findingsMarketerFilter === 'report' && inReport === 0 && pending > 0) {
        findingsMarketerFilter = 'pending';
    }
    if (findingsMarketerFilter === 'recs' && pending > 0) {
        findingsMarketerFilter = 'pending';
    }
}

function getFindingsFilterEmptyHint(mode, progress, inReport) {
    if (mode === 'pending') {
        return progress.pending > 0
            ? 'В очереди «На проверку» сейчас пусто — откройте другой фильтр.'
            : (inReport > 0
                ? `Все выводы проверены. В отчёте — ${inReport}. Откройте вкладку «В отчёте» ниже.`
                : 'Все выводы проверены.');
    }
    if (mode === 'report') {
        return inReport > 0
            ? 'Подтверждённые не попали в список — обновите страницу (Ctrl+F5).'
            : 'Подтверждённых выводов пока нет — откройте «На проверку».';
    }
    if (mode === 'no_ai') {
        return 'Все риски Excel обогащены AI — фильтр пуст.';
    }
    if (mode === 'rejected') {
        return 'Отклонённых выводов нет.';
    }
    if (mode === 'recs') {
        return '';
    }
    return 'В этой очереди пусто — выберите другой фильтр.';
}

function buildFindingsFilterCtas(findings, data, progress) {
    const inReport = countMarketerFindingsFilter(findings, 'report', data);
    const parts = [];
    if (inReport > 0 && findingsMarketerFilter !== 'report') {
        parts.push(
            `<button type="button" class="btn btn-primary btn-sm" onclick="setFindingsMarketerFilter('report')">В отчёте (${inReport})</button>`,
        );
    }
    if (progress.pending > 0 && findingsMarketerFilter !== 'pending') {
        parts.push(
            `<button type="button" class="btn btn-outline btn-sm" onclick="setFindingsMarketerFilter('pending')">На проверку (${progress.pending})</button>`,
        );
    }
    const rejectedN = countMarketerFindingsFilter(findings, 'rejected', data);
    if (rejectedN > 0 && findingsMarketerFilter !== 'rejected') {
        parts.push(
            `<button type="button" class="btn btn-outline btn-sm" onclick="setFindingsMarketerFilter('rejected')">Отклонённые (${rejectedN})</button>`,
        );
    }
    return parts.join(' ');
}

function matchesMarketerFindingsFilter(f, mode) {
    if (mode === 'recs') return false;
    if (isDirectHealthFinding(f)) return false;
    if (mode === 'no_ai') {
        return isStubEnrichmentFinding(f) || isAiInterpretationFinding(f) && !getDirectRiskRef(f);
    }
    const status = f?.status || 'ai_generated';
    if (mode === 'rejected') {
        return status === 'human_rejected';
    }
    if (mode === 'all') {
        return status !== 'human_rejected';
    }
    if (mode === 'report') {
        return ['human_confirmed', 'human_edited'].includes(status);
    }
    if (mode === 'pending') {
        return !['human_confirmed', 'human_edited', 'human_rejected'].includes(status);
    }
    if (mode === 'urgent') {
        if (['human_confirmed', 'human_edited', 'human_rejected'].includes(status)) return false;
        return classifyMarketerActionStatus(f).code === 'urgent';
    }
    return true;
}

function countMarketerFindingsFilter(findings, mode, data) {
    if (mode === 'no_ai') {
        const audit = data || getAuditData();
        const stubCount = (findings || [])
            .filter((f) => f.status !== 'human_rejected' && matchesMarketerFindingsFilter(f, mode))
            .length;
        return stubCount + getCatalogRefsWithoutAi(audit).length;
    }
    if (mode === 'rejected') {
        return (findings || []).filter((f) => matchesMarketerFindingsFilter(f, 'rejected')).length;
    }
    return (findings || [])
        .filter((f) => matchesMarketerFindingsFilter(f, mode))
        .filter((f) => f.status !== 'human_rejected')
        .length;
}

function syncFindingsAuxPanelsVisibility() {
    const showRecs = findingsMarketerFilter === 'recs';
    const panel = document.getElementById('findingsRecSummaryPanel');
    const offer = document.getElementById('offerContainer');
    if (panel) {
        panel.style.display = showRecs ? '' : 'none';
        if (showRecs) panel.open = true;
    }
    if (offer) offer.style.display = showRecs ? '' : 'none';
}

function setFindingsMarketerFilter(mode) {
    findingsMarketerFilter = mode;
    renderFindings(getAuditData()?.findings || [], getAuditData()?.data_coverage);
    syncFindingsAuxPanelsVisibility();
}

/** Фильтр «Выводы», в котором видна карточка (не всегда «В отчёте»). */
function marketerFilterModeForFinding(f) {
    if (!f) return 'report';
    const status = f?.status || 'ai_generated';
    if (status === 'human_rejected') return 'rejected';
    if (['human_confirmed', 'human_edited'].includes(status)) return 'report';
    return 'pending';
}

function scrollToAndHighlightFinding(findingId, attempt = 0) {
    const id = Number(findingId);
    if (!Number.isFinite(id) || id <= 0) return;
    const el = document.getElementById(`finding-${id}`);
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('direct-slice-highlight');
        window.setTimeout(() => el.classList.remove('direct-slice-highlight'), 2800);
        return;
    }
    if (attempt < 10) {
        window.setTimeout(() => scrollToAndHighlightFinding(id, attempt + 1), 60 + attempt * 50);
    }
}

/** С чата / отчёта → вкладка «Выводы» на нужный фильтр и карточка с подсветкой. */
function goToFindingsInReport(findingId = null) {
    const id = Number(findingId);
    const f = Number.isFinite(id) && id > 0 ? getFindingById(id) : null;
    setFindingsMarketerFilter(f ? marketerFilterModeForFinding(f) : 'report');
    runtimeBridge.switchTab?.('results');
    if (f?.id) {
        window.requestAnimationFrame(() => {
            scrollToAndHighlightFinding(f.id);
        });
    }
}

function shouldShowRecommendationsJump(data, findings) {
    if (!hasGuidedCompletedAnalysis(data)) return false;
    const progress = getFindingReviewProgress(data || { findings });
    if (progress.pending > 0) return false;
    const optRecs = (findings || []).filter((f) =>
        !isDirectHealthFinding(f)
        && f.finding_kind !== 'needs_data'
        && f.recommendation
        && f.status !== 'human_rejected'
    );
    return optRecs.length > 0 || Boolean(data?.commercial_offer);
}

function renderRecommendationsJumpBtn(findings, data) {
    if (!shouldShowRecommendationsJump(data, findings)) return '';
    return renderFindingsMarketerFilterBtn('recs', DIRECT_COPY.recommendationsJumpBtn, 0, { muted: true, hideCount: true });
}

function renderMissingEnrichmentCards(data) {
    const missing = getCatalogRefsWithoutAi(data);
    if (!missing.length) return '';
    return missing.map((entry) => {
        const title = (entry.title || '').trim() || 'Риск Excel';
        const refKey = directRiskRefKey(entry.direct_risk_ref);
        return `<div class="finding-item finding-item--missing-enrichment finding-needs-review"${refKey ? ` data-direct-risk="${escapeHtml(refKey)}"` : ''}>
            <p class="finding-verdict-headline">${escapeHtml(title)}</p>
            <p class="muted">Нет AI-карточки по этому риску — запустите AI-анализ или откройте заглушку после анализа.</p>
            <div class="finding-actions finding-actions-footer">
                <button type="button" class="btn btn-outline btn-sm" onclick="switchTab('data'); switchDataSubtab('direct'); scrollToDirectRisks()">К риску Excel</button>
                <button type="button" class="btn btn-primary btn-sm" onclick="runAnalysis()">Запустить AI-анализ</button>
            </div>
        </div>`;
    }).join('');
}

function renderFindingsMarketerFilterBtn(mode, label, count, { muted = false, hideCount = false } = {}) {
    const activeCls = findingsMarketerFilter === mode ? ' is-active' : '';
    const mutedCls = muted ? ' findings-marketer-filter-btn--muted' : '';
    const countHtml = hideCount ? '' : ` <span class="findings-filter-count">${count}</span>`;
    return `<button type="button" class="findings-marketer-filter-btn${mutedCls}${activeCls}" role="tab" aria-selected="${findingsMarketerFilter === mode ? 'true' : 'false'}" onclick="setFindingsMarketerFilter('${mode}')">${escapeHtml(label)}${countHtml}</button>`;
}

function renderFindingsMarketerFilterBar(findings, data) {
    const audit = data || getAuditData();
    const active = (findings || []).filter((f) => f.status !== 'human_rejected' && !isDirectHealthFinding(f));
    if (!active.length && !hasGuidedCompletedAnalysis(audit)) return '';
    const rejectedN = countMarketerFindingsFilter(findings, 'rejected', audit);
    const noAiN = countMarketerFindingsFilter(findings, 'no_ai', audit);
    const parts = [
        renderFindingsMarketerFilterBtn('pending', 'На проверку', countMarketerFindingsFilter(findings, 'pending', audit)),
        renderFindingsMarketerFilterBtn('report', 'В отчёте', countMarketerFindingsFilter(findings, 'report', audit)),
    ];
    if (rejectedN > 0) {
        parts.push(renderFindingsMarketerFilterBtn('rejected', 'Отклонённые', rejectedN, { muted: true }));
    }
    if (noAiN > 0) {
        parts.push(renderFindingsMarketerFilterBtn('no_ai', DIRECT_COPY.filterNoAiEnrichment, noAiN, { muted: true }));
    }
    const recJump = renderRecommendationsJumpBtn(findings, audit);
    return `<div class="findings-marketer-filter" role="tablist">${parts.join('')}${recJump}</div>`;
}

function parseEvidenceMaterialRef(raw) {
    const text = String(raw || '').trim();
    if (!text) return null;
    if (/^\d+$/.test(text)) return Number(text);
    const m = text.match(/^mat_(\d+)$/i);
    return m ? Number(m[1]) : null;
}

function resolveEvidenceMaterialId(e) {
    let mid = parseEvidenceMaterialRef(e?.material_id);
    if (mid && runtimeBridge.getMaterialById?.(mid)) return mid;
    const type = String(e?.material_type || '').trim();
    if (type && type !== 'document') {
        const mat = (getAuditData()?.materials || []).find(
            (m) => m.type === type && !m.excluded_from_analysis
        );
        if (mat?.id) return mat.id;
    }
    if (type === 'document' || !type) {
        const doc = (getAuditData()?.materials || []).find(
            (m) => ['document', 'docx', 'pdf', 'text'].includes(m.type) && !m.excluded_from_analysis
        );
        if (doc?.id) return doc.id;
    }
    return null;
}

function looksLikeDocumentDump(quote) {
    const low = String(quote || '').toLowerCase();
    if (!low) return false;
    if (low.includes('тестовые данные') && (low.includes('период анализа') || low.includes('информация о клиенте'))) {
        return true;
    }
    if (low.length < 120) return false;
    const markers = ['тестовые данные', 'информация о клиенте', 'клиент:', 'ниша:', 'период анализа:', 'цель аудита:'];
    let hits = 0;
    markers.forEach((m) => { if (low.includes(m)) hits += 1; });
    return hits >= 2 || low.length > 280;
}

function formatEvidenceQuotePreview(quote, problem) {
    const text = String(quote || '').replace(/\s+/g, ' ').trim();
    const max = 220;
    if (!text) return '';
    if (text.length <= max) return text;
    const keys = String(problem || '').toLowerCase().match(/[a-zа-яё0-9]{4,}/gi) || [];
    for (const key of keys.slice(0, 10)) {
        const pos = text.toLowerCase().indexOf(key.toLowerCase());
        if (pos === -1) continue;
        const start = Math.max(0, pos - 60);
        let snippet = text.slice(start, start + max).trim();
        if (start > 0) snippet = `…${snippet}`;
        if (start + max < text.length) snippet = `${snippet}…`;
        return snippet;
    }
    const cut = text.slice(0, max);
    return `${cut.replace(/\s+\S*$/, '').trim()}…`;
}

function isEvidenceQuoteDisplayable(e, finding) {
    const type = String(e?.material_type || '');
    if (['quality_guard', 'system'].includes(type)) return false;
    const quote = String(e?.quote_or_description || '').trim();
    if (!quote || looksLikeDocumentDump(quote)) return false;
    return quote.length <= 280;
}

function openFindingEvidenceMaterial(materialId) {
    const mid = Number(materialId);
    if (!Number.isFinite(mid) || mid <= 0) {
        showAlert('Ссылка на материал не указана.', 'warning');
        return;
    }
    runtimeBridge.switchTab?.('data');
    setTimeout(() => {
        if (runtimeBridge.getMaterialById?.(mid)) {
            runtimeBridge.editMaterial?.(mid);
            return;
        }
        showAlert('Материал не найден (возможно, удалён). Откройте список на вкладке «Данные».', 'warning');
    }, 100);
}

function getMaterialDisplayLabel(m) {
    if (!m) return 'материал';
    if (m.type === 'manual_metrics') {
        const title = (m.title || '').trim();
        return title || 'Метрики';
    }
    const typeLabels = {
        text_note: 'Заметка',
        document: 'Документ',
        screenshot: 'Скриншот',
        manual_metrics: 'Метрики',
        audio_transcript: 'Расшифровка',
    };
    const typeLabel = typeLabels[m.type] || m.type_label || m.type || 'материал';
    return m.title ? `${typeLabel} — ${m.title}` : typeLabel;
}

function findMaterialsForFindingSource(finding) {
    const area = String(finding?.area || '').toLowerCase();
    const mats = (getAuditData()?.materials || []).filter((m) => m && !m.excluded_from_analysis);
    const areaPatterns = {
        crm: /crm|лид|заявк|продаж|utm|статус|amo|битрикс|качеств/i,
        semantics: /запрос|семантик|wordstat|минус/i,
        landing: /посадоч|лендинг|страниц/i,
        analytics: /метрик|цел|utm|конверс/i,
        budget: /бюджет|расход|клик|cpa|cpl|romi/i,
        structure: /кампани|групп|структур/i,
        creatives: /креатив|объявлен|баннер/i,
    };
    const pattern = areaPatterns[area];

    const scored = mats.map((m) => {
        let score = 0;
        const blob = `${m.title || ''} ${m.extracted_text || ''} ${m.raw_content || ''}`.toLowerCase();
        if (area === 'crm' && m.type === 'manual_metrics') score += 4;
        if (['crm', 'analytics', 'budget'].includes(area) && m.type === 'manual_metrics') score += 2;
        if (pattern && pattern.test(blob)) score += 3;
        if (['document', 'text_note', 'screenshot'].includes(m.type)) score += 1;
        if (m.type === area) score += 5;
        return { m, score };
    }).filter((row) => row.score > 0)
        .sort((a, b) => b.score - a.score);

    return scored.map((row) => row.m);
}

function collectFindingSourceMaterials(finding, userEvidence) {
    const byId = new Map();
    (userEvidence || []).forEach((e) => {
        const mid = resolveEvidenceMaterialId(e);
        if (mid) {
            const mat = runtimeBridge.getMaterialById?.(mid);
            if (mat) byId.set(mid, mat);
        }
    });
    findMaterialsForFindingSource(finding).forEach((m) => {
        if (m?.id) byId.set(m.id, m);
    });
    return [...byId.values()];
}

function renderFindingSourceButtons(materials) {
    return materials.slice(0, 4).map((m) => `
        <button type="button" class="btn btn-outline btn-sm finding-evidence-open" onclick="openFindingEvidenceMaterial(${m.id})">
            Открыть: ${escapeHtml(getMaterialDisplayLabel(m))}
        </button>`).join('');
}

function renderFindingEvidenceBlock(userEvidence, finding) {
    const items = (userEvidence || []).filter(
        (e) => !['quality_guard', 'system'].includes(String(e?.material_type || ''))
    );
    const sourceMaterials = collectFindingSourceMaterials(finding, items);

    const parts = items.map((e) => {
        const mid = resolveEvidenceMaterialId(e);
        const mat = mid ? runtimeBridge.getMaterialById?.(mid) : null;
        const label = mat?.title || e.material_type || 'материал';
        const quote = String(e.quote_or_description || '').trim();
        const openBtn = mid
            ? `<button type="button" class="btn btn-outline btn-sm finding-evidence-open" onclick="openFindingEvidenceMaterial(${mid})">Открыть: ${escapeHtml(label)}</button>`
            : '';

        if (looksLikeDocumentDump(quote)) {
            return `
                <div class="evidence-item evidence-item--file-only">
                    <p class="muted finding-evidence-file-only">
                        AI сохранил начало файла, а не фрагмент по этому выводу. Откройте документ и сверьте вручную.
                    </p>
                    ${openBtn}
                </div>`;
        }

        if (!isEvidenceQuoteDisplayable(e, finding)) {
            return openBtn
                ? `<div class="evidence-item">${openBtn}</div>`
                : '';
        }

        const preview = formatEvidenceQuotePreview(quote, finding?.problem);
        return `
            <div class="evidence-item">
                <p>"${escapeHtml(preview)}"</p>
                ${openBtn}
            </div>`;
    }).filter(Boolean);

    const hasQuote = items.some((e) => isEvidenceQuoteDisplayable(e, finding));
    const materialButtons = sourceMaterials.length
        ? renderFindingSourceButtons(sourceMaterials)
        : '';

    if (!parts.length && !materialButtons) {
        return `
            <p class="muted finding-evidence-weak">
                Нет привязанных материалов — добавьте данные на вкладке «Данные» или отклоните вывод.
            </p>`;
    }

    if (!parts.length && materialButtons) {
        return `
            <details class="finding-evidence-details">
                <summary>Источник</summary>
                <div class="evidence">
                    <p class="muted finding-evidence-file-only">Материалы аудита, на которых основан вывод:</p>
                    ${materialButtons}
                </div>
            </details>`;
    }

    const body = [
        ...parts,
        materialButtons
            ? `<div class="evidence-item evidence-item--materials">${materialButtons}</div>`
            : '',
    ].filter(Boolean).join('');

    return `
        <details class="finding-evidence-details">
            <summary title="${hasQuote ? 'Цитата и файлы' : 'Файлы на вкладке «Данные»'}">Источник</summary>
            <div class="evidence">${body}</div>
        </details>`;
}

function resolveFindingDataAction(f) {
    if (!f) return null;
    const area = String(f.area || '').toLowerCase();
    const hay = [
        f.review_reason,
        f.missing_data,
        f.problem,
        f.recommendation,
        area,
    ].filter(Boolean).join(' ').toLowerCase();

    if (area === 'crm' || /crm|статус|продаж|воронк/i.test(hay)) {
        return { id: 'crm', label: 'Загрузить CRM' };
    }
    if (area === 'semantics' || /поисков|запрос|семантик|wordstat|минус-слов/i.test(hay)) {
        return { id: 'search_queries', label: 'Загрузить запросы' };
    }
    if (/скриншот|кампани/i.test(hay)) {
        return { id: 'campaign_screenshots', label: 'Загрузить скрины' };
    }
    if (area === 'landing' || /посадоч|лендинг/i.test(hay)) {
        return { id: 'landing', label: 'Загрузить посадочные' };
    }
    if (
        area === 'budget'
        || area === 'analytics'
        || /метрик|бюджет|период|клик|заявк|выруч|romi|cpa|cpl/i.test(hay)
    ) {
        return { id: 'metrics', label: 'Открыть KPI', action: 'metrics' };
    }
    return null;
}

function renderFindingContextAction(f, primary = false) {
    const ctx = resolveFindingDataAction(f);
    if (!ctx) return '';
    const btnClass = primary ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm';
    if (ctx.action === 'metrics') {
        return `<button type="button" class="${btnClass}" onclick="switchTab('data'); switchDataSubtab('direct')">${escapeHtml(ctx.label || 'Открыть «Директ»')}</button>`;
    }
    return `<button type="button" class="${btnClass}" onclick="openDataItemAction('${jsAttr(ctx.id)}')">${escapeHtml(ctx.label)}</button>`;
}

function findingStatusLabel(findingOrStatus) {
    const finding = findingOrStatus && typeof findingOrStatus === 'object' ? findingOrStatus : null;
    const status = finding ? finding.status : findingOrStatus;
    const labels = {
        ai_generated: 'AI-вывод',
        human_confirmed: 'Подтверждено',
        human_rejected: 'Отклонено',
        human_edited: 'Исправлено'
    };
    return labels[status] || status || 'AI-вывод';
}

function getFindingById(id) {
    return (getAuditData()?.findings || []).find(f => String(f.id) === String(id));
}

const KB_SKIP_REASON_LABELS = {
    kb_disabled: 'база знаний отключена',
    status_not_confirmed: 'вывод ещё не подтверждён',
    not_approved_for_kb: 'не отмечен для базы знаний',
    needs_data_limitation: 'ограничение по данным — только для этого аудита',
    needs_review: 'требует проверки',
    low_confidence: 'низкая уверенность AI (до подтверждения маркетологом)',
    missing_problem: 'нет формулировки проблемы',
    missing_recommendation: 'нет рекомендации',
    missing_impact: 'нет ожидаемого эффекта',
};

function auditHasDataLimitations(data) {
    const findings = data?.findings || [];
    if (findings.some((f) => isDataLimitationFinding(f))) return true;
    return Boolean((data?.data_coverage?.missing_items || []).length);
}

function isDataLimitationFinding(f) {
    if (!f) return false;
    if (f.finding_kind === 'risk_pattern') return false;
    if (f.finding_kind === 'needs_data') return true;
    if (f.kb_eligibility_reason === 'needs_data_limitation') return true;
    return /недостаточно.*данн/i.test(String(f.problem || ''));
}

function countsAsGlobalKbFinding(f) {
    if (isDirectHealthFinding(f)) return false;
    if (!f?.kb_eligible) return false;
    if (f.finding_kind === 'risk_pattern') return true;
    return !isDataLimitationFinding(f);
}

function renderFindingUsageBadge(f) {
    const status = f.status || 'ai_generated';
    const isHumanConfirmed = ['human_confirmed', 'human_edited'].includes(status);
    if (!isHumanConfirmed) return '';
    if (isDirectHealthFinding(f)) return '';
    if (f.finding_kind === 'risk_pattern') {
        return '<span class="badge badge-kb" title="Паттерн риска в базе знаний">Паттерн риска в БЗ</span>';
    }
    if (isDataLimitationFinding(f)) {
        return '<span class="badge badge-limitation" title="Подтверждено в этом аудите как шаблон ограничения">Шаблон ограничения</span>';
    }
    if (countsAsGlobalKbFinding(f)) {
        return '<span class="badge badge-kb" title="Универсальная рекомендация для других аудитов">В базе знаний</span>';
    }
    return '<span class="badge badge-kb-pending" title="Подтверждено в этом аудите">В этом аудите</span>';
}

function kbSkipReasonLabel(code) {
    return KB_SKIP_REASON_LABELS[code] || code || 'не прошёл проверку для базы знаний';
}

async function loadKbStatusCard() {
    const card = document.getElementById('kbStatusCard');
    if (!card) return;
    if (runtimeBridge.getCurrentScreenState?.() === 'RESULTS_NEED_REVIEW') {
        card.style.display = 'none';
        card.innerHTML = '';
        return;
    }
    const findings = (getAuditData()?.findings || []).filter((f) => !isDirectHealthFinding(f));
    const pendingReview = getFindingReviewProgress({ findings }).pending;
    const confirmedInAudit = findings.filter((f) => ['human_confirmed', 'human_edited'].includes(f.status)).length;
    const rejectedInAudit = findings.filter((f) => f.status === 'human_rejected').length;
    const kbInAudit = findings.filter((f) => countsAsGlobalKbFinding(f)).length;
    // Счётчики уже в полосе фильтров — не дублируем блок «Проверенные выводы».
    if (hasGuidedCompletedAnalysis(getAuditData())) {
        card.style.display = 'none';
        card.innerHTML = '';
        return;
    }
    if (pendingReview > 0 && confirmedInAudit === 0) {
        card.style.display = 'block';
        card.innerHTML = `
            <strong>Проверенные выводы</strong>
            <p class="muted kb-status-hint">Подтвердите выводы ниже — после этого они появятся здесь.</p>`;
        return;
    }
    if (confirmedInAudit === 0 && pendingReview === 0 && rejectedInAudit === 0) {
        card.style.display = 'none';
        card.innerHTML = '';
        return;
    }
    let kbGlobalNote = '';
    try {
        const status = await apiRequest('/api/knowledge-base/status');
        if (status.available) {
            kbGlobalNote = `<li class="muted">Всего в базе знаний (все аудиты): <strong>${status.confirmed_finding_count || 0}</strong></li>`;
        }
    } catch (_err) { /* локальные счётчики достаточно */ }
    card.style.display = 'block';
    card.innerHTML = `
        <strong>Проверенные выводы</strong>
        <p class="muted kb-status-hint">Статус проверки выводов в этом аудите.</p>
        <ul class="kb-stats-list muted">
            <li>В отчёте этого аудита: <strong>${confirmedInAudit}</strong></li>
            <li>Ожидает проверки: <strong>${pendingReview}</strong></li>
            <li>Отклонено: <strong>${rejectedInAudit}</strong></li>
            ${kbInAudit ? `<li>AI-выводов в базе знаний: <strong>${kbInAudit}</strong></li>` : ''}
            ${kbGlobalNote && kbInAudit ? kbGlobalNote : ''}
        </ul>`;
}

function renderFindingFooterLink(label, onclick, { extraClass = '' } = {}) {
    return `<button type="button" class="finding-action-link btn-sm ${extraClass}" onclick="${onclick}">${escapeHtml(label)}</button>`;
}

function renderFindingFooterBar({ main = '', links = [] } = {}) {
    const linkItems = (links || []).filter(Boolean);
    const linksHtml = linkItems.length
        ? `<div class="finding-actions-links">${linkItems.join('<span class="finding-actions-dot" aria-hidden="true">·</span>')}</div>`
        : '';
    const sep = main && linksHtml ? '<span class="finding-actions-sep" aria-hidden="true"></span>' : '';
    if (!main && !linksHtml) return '';
    return `<div class="finding-actions finding-actions--compact">
        <div class="finding-actions-bar">${main}${sep}${linksHtml}</div>
    </div>`;
}

function renderFindingFooterActions(f) {
    if (isDirectHealthFinding(f)) return '';

    const status = f.status || 'ai_generated';
    const isHumanConfirmed = ['human_confirmed', 'human_edited'].includes(status);
    const showConfirm = !(f.evidence || []).every((e) => (e.material_type || '').includes('system'));
    const dataGap = isFindingDataGapCard(f);
    const contextBtn = renderFindingContextAction(f, true);
    const id = f.id;

    const linkEdit = renderFindingFooterLink('Исправить', `openFindingEdit(${id})`);
    const linkReject = renderFindingFooterLink('Отклонить', `rejectFinding(${id})`, { extraClass: 'finding-action-link--muted' });
    const linkChat = canWrite() && status !== 'human_rejected'
        ? renderFindingFooterLink('Спросить в чате', `askFromFinding(${id})`)
        : '';
    if (status === 'human_rejected') {
        return renderFindingFooterBar({
            main: `<button type="button" class="btn btn-outline btn-sm" onclick="restoreFindingToReview(${id})">Вернуть в проверку</button>`,
        });
    }

    if (isHumanConfirmed) {
        return renderFindingFooterBar({
            main: `<button type="button" class="btn btn-outline btn-sm" onclick="unconfirmFinding(${id})">Убрать из отчёта</button>`,
            links: [linkEdit, linkReject, linkChat],
        });
    }

    const canPattern = canConfirmFindingRiskPattern(f);
    const btnReport = showConfirm
        ? `<button type="button" class="btn btn-success btn-sm" onclick="confirmFinding(${id})" title="Попадёт в отчёт и в базу знаний">В отчёт</button>`
        : '';
    const btnReportPattern = canPattern
        ? `<button type="button" class="btn btn-outline btn-sm" onclick="confirmFindingRiskPattern(${id})" title="Только если не хватает данных (CRM, запросы…) — паттерн для других аудитов">В отчёт (шаблон)</button>`
        : '';

    if (dataGap) {
        const dataBtn = contextBtn || `<button type="button" class="btn btn-primary btn-sm" onclick="goToAddAuditData()">К данным</button>`;
        const mainParts = [dataBtn];
        if (showConfirm) mainParts.push(btnReport);
        if (btnReportPattern) mainParts.push(btnReportPattern);
        if (!showConfirm && !btnReportPattern) {
            mainParts.push(
                `<span class="finding-footer-hint muted">Сначала «Исправить» или добавьте данные</span>`
            );
        }
        return renderFindingFooterBar({
            main: mainParts.join(''),
            links: [linkEdit, linkReject, linkChat],
        });
    }

    const main = [btnReport, contextBtn].filter(Boolean).join('');
    return renderFindingFooterBar({
        main,
        links: [linkEdit, linkReject, linkChat],
    });
}

function getAvailableFindingIllustrationScreenshots(data) {
    const appendixUsed = new Set(getReportAppendixItems(data).map((item) => item.material_id));
    return (data?.materials || []).filter(
        (m) =>
            m?.type === 'screenshot' &&
            m.file_url &&
            !m.excluded_from_report &&
            !appendixUsed.has(m.id)
    );
}

function buildFindingCaptionPromptMessage(ocrHint) {
    const lines = [
        'Текст появится под скрином сразу после этого вывода в PDF.',
        'Опишите: что на графике и какой вывод для клиента.',
        '',
        'Пример: «Рис. 1. Динамика CPL, май 2026 — снижение после оптимизации минус-слов.»',
    ];
    if (ocrHint && isUsableOcrHint(ocrHint)) {
        lines.push('', 'Подсказка с OCR (проверьте цифры):', ocrHint.slice(0, 220));
    }
    return lines.join('\n');
}

function renderFindingIllustrationBlock(f) {
    if (isDirectHealthFinding(f)) return '';
    if (!canWrite() || (f.status || '') === 'human_rejected') return '';
    const status = f.status || 'ai_generated';
    const isConfirmed = ['human_confirmed', 'human_edited'].includes(status);
    const hasImage = Boolean(f.illustration_file_url);
    const captionReady = Boolean(f.illustration_caption_ready);
    const preview = hasImage
        ? `<div class="finding-illustration-preview">
                <img src="${escapeHtml(f.illustration_file_url)}" alt="${escapeHtml(f.illustration_title || 'Скриншот к выводу')}">
           </div>`
        : '';
    const captionField = hasImage
        ? `<label class="finding-missing-label">Текст под рисунком в PDF</label>
           <textarea class="form-control finding-illustration-caption-input" rows="2" data-finding-id="${f.id}" placeholder="Рис. … — период, метрика, вывод для клиента">${escapeHtml(f.illustration_caption || '')}</textarea>
           ${!captionReady ? '<p class="finding-illustration-warn">⚠ Мин. 10 символов — без подписи скрин не попадёт в PDF</p>' : ''}`
        : '';
    const attachLabel = hasImage ? 'Заменить' : 'Прикрепить скрин';
    const removeBtn = hasImage
        ? `<button type="button" class="btn btn-link btn-sm" onclick="clearFindingIllustration(${f.id})">Убрать</button>`
        : '';
    const hint = isConfirmed ? '' : '<p class="muted finding-illustration-hint">В PDF — после подтверждения вывода.</p>';
    const inner = `${hint}${preview}${captionField}
            <div class="finding-illustration-actions">
                <button type="button" class="btn btn-outline btn-sm" onclick="openFindingIllustrationPicker(${f.id})">${attachLabel}</button>
                ${removeBtn}
            </div>`;
    if (!hasImage && !captionField) {
        return `<details class="finding-extra finding-illustration-collapsed">
            <summary>Скрин для PDF (необязательно)</summary>
            <div class="finding-illustration-block">${inner}</div>
        </details>`;
    }
    return `<details class="finding-extra finding-illustration-collapsed"${hasImage ? ' open' : ''}>
        <summary>${hasImage ? 'Скрин для PDF' : 'Скрин для PDF (необязательно)'}</summary>
        <div class="finding-illustration-block">${inner}</div>
    </details>`;
}

function bindFindingIllustrationCaptionInputs(root) {
    (root || document).querySelectorAll('.finding-illustration-caption-input').forEach((el) => {
        if (el.dataset.bound === '1') return;
        el.dataset.bound = '1';
        el.addEventListener('blur', () => {
            saveFindingIllustrationCaption(Number(el.dataset.findingId), el.value, { silent: true });
        });
    });
}

async function openFindingIllustrationPicker(findingId, materialId = null) {
    if (!requireWriteAccess('Иллюстрация к выводу')) return;
    if (!getCurrentAuditId() || !getAuditData()) return;

    let targetId = materialId != null ? Number(materialId) : null;
    if (targetId == null) {
        const available = getAvailableFindingIllustrationScreenshots(getAuditData());
        if (!available.length) {
            showAlert('Нет доступных скриншотов. Загрузите на «Данные» или освободите скрин из приложения PDF.', 'warning');
            return;
        }
        if (available.length === 1) {
            targetId = available[0].id;
        } else {
            const lines = available.map((m, i) => `${i + 1}. ${m.title || 'Скриншот'}`).join('\n');
            const pick = await showPromptDialog({
                title: 'Скриншот к выводу',
                message: `Выберите номер (1–${available.length}):\n${lines}`,
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

    const material = (getAuditData().materials || []).find((m) => m.id === targetId);
    const ocr = material ? findOcrMaterial(material) : null;
    const ocrHint = (ocr?.extracted_text || ocr?.raw_content || '').trim();
    const caption = await showPromptDialog({
        title: 'Текст под рисунком в PDF',
        message: buildFindingCaptionPromptMessage(ocrHint),
        placeholder: 'Рис. 1. Динамика CPL, май 2026 — снижение после оптимизации.',
        required: false,
    });
    if (caption === false) return;

    try {
        const body = { material_id: targetId };
        if (caption && caption.trim()) body.caption = caption.trim();
        await apiRequest(`/api/audits/${getCurrentAuditId()}/findings/${findingId}/illustration`, {
            method: 'PATCH',
            body: JSON.stringify(body),
        });
        await refreshAuditAfterFindingAction(
            caption && caption.trim().length >= 10
                ? 'Скрин и подпись прикреплены к выводу.'
                : 'Скрин прикреплён. Допишите подпись (мин. 10 символов) — иначе в PDF не попадёт.'
        );
    } catch (error) {
        showAlert('Ошибка: ' + error.message, 'danger');
    }
}

async function clearFindingIllustration(findingId) {
    if (!requireWriteAccess('Иллюстрация к выводу')) return;
    try {
        await apiRequest(`/api/audits/${getCurrentAuditId()}/findings/${findingId}/illustration`, {
            method: 'PATCH',
            body: JSON.stringify({ material_id: null }),
        });
        await refreshAuditAfterFindingAction('Иллюстрация убрана.');
    } catch (error) {
        showAlert('Ошибка: ' + error.message, 'danger');
    }
}


function renderFindingCard(f) {
    if (isDirectHealthFinding(f)) return '';

    const status = f.status || 'ai_generated';
    const isRejected = status === 'human_rejected';
    const isHumanConfirmed = ['human_confirmed', 'human_edited'].includes(status);
    const pending = isFindingPendingReview(f);
    const compact = isCompactFindingCard(f);
    const userEvidence = (f.evidence || []).filter((e) => !(e.material_type || '').includes('system') && !(e.material_type || '').includes('quality_guard'));
    const actionStatus = classifyMarketerActionStatus(f);
    const verdict = buildFindingVerdictLines(f);
    const areaChip = areaDisplayLabel(f.area)
        ? `<span class="finding-area-chip">${escapeHtml(areaDisplayLabel(f.area))}</span>`
        : '';
    const subLine = (!compact && verdict.sub)
        ? `<p class="finding-verdict-sub muted">${escapeHtml(verdict.sub)}</p>`
        : '';

    const leakWarn = (isHumanConfirmed || pending) && hasInternalReportLeak(`${f.problem || ''}\n${f.recommendation || ''}`)
        ? '<p class="finding-pdf-leak-warn">⚠ В тексте есть служебные пометки (#N, [mat_]) — не попадут в нормальный PDF. Нажмите «Исправить».</p>'
        : '';
    const similar = isHumanConfirmed
        ? findSimilarConfirmedFindings(f, getAuditData()?.findings || [])
        : [];
    const similarIds = similar.map((x) => x.id).filter((id) => Number.isFinite(Number(id)));
    const dupeWarn = similarIds.length
        ? `<p class="finding-dupe-warn muted">Похожий вывод уже в отчёте (№${similarIds.join(', ')}) — проверьте, не дубль ли это.</p>`
        : '';

    const isInterp = isAiInterpretationFinding(f);
    const isStub = isStubEnrichmentFinding(f) || (isInterp && (
        f.original_ai_output?.enrichment_status === 'stub'
        || f.enrichment_status === 'stub'
        || /AI не детализировал/i.test(String(f.review_reason || ''))
    ));
    const stubNote = isStub && compact
        ? '<p class="finding-stub-note muted">Нет полного AI-обогащения — «Исправить» или перезапуск анализа.</p>'
        : '';

    const headline = verdict.headline;
    const recText = String(f.recommendation || '').trim() || '—';
    const showRecLine = recText !== '—' && !findingHeadlineMatchesRec(headline, recText);
    const recommendationBlock = compact
        ? (showRecLine
            ? `<p class="finding-rec-line"><span class="finding-rec-label">Действие</span> ${escapeHtml(recText)}</p>${stubNote}`
            : `${stubNote}`)
        : `<div class="finding-recommendation-block finding-recommendation-block--primary">
            <p class="finding-rec-action"><strong>Что сделать</strong> ${escapeHtml(recText)}</p>
            ${f.expected_impact ? `<p class="finding-rec-effect muted">${escapeHtml(f.expected_impact)}</p>` : ''}
            ${leakWarn}
            ${dupeWarn}
        </div>`;

    const queueBadge = shouldShowFindingQueueBadge(f, actionStatus)
        ? `<span class="finding-queue-badge ${actionStatus.css}">${escapeHtml(actionStatus.label)}</span>`
        : '';

    const interpHeader = shouldShowInterpRiskLink(f, verdict.headline)
        ? `<p class="finding-ai-interp-label muted">
            <button type="button" class="btn btn-link btn-sm finding-direct-risk-link" onclick="openDirectExcelSource(${f.id})">${escapeHtml(DIRECT_COPY.directRiskLinkBtn)}</button>
           </p>`
        : '';

    const compactExtras = compact
        ? [leakWarn, dupeWarn, f.expected_impact ? `<p class="finding-rec-effect muted">${escapeHtml(f.expected_impact)}</p>` : ''].filter(Boolean).join('')
        : '';

    let secondaryBlocks = '';
    if (compact) {
        const moreInner = [
            compactExtras,
            isRejected ? '' : renderFindingEvidenceBlock(userEvidence, f),
            isRejected ? '' : renderFindingIllustrationBlock(f),
            renderMarketerExpertDetails(f),
        ].filter(Boolean).join('');
        if (moreInner) {
            secondaryBlocks = `<details class="finding-extra finding-more-details"><summary>Подробнее</summary>${moreInner}</details>`;
        }
    } else {
        secondaryBlocks = [
            isRejected ? '' : renderFindingEvidenceBlock(userEvidence, f),
            isRejected ? '' : renderFindingIllustrationBlock(f),
            renderMarketerExpertDetails(f),
        ].join('');
    }

    const itemCls = [
        'finding-item', 'finding-item--marketer', f.severity, actionStatus.css,
        compact ? 'finding-item--compact finding-item--row' : '',
        isRejected ? 'finding-rejected' : '',
        pending ? 'finding-needs-review' : '',
        isHumanConfirmed ? 'finding-confirmed' : '',
        isInterp ? 'finding-item--ai-interp' : '',
        isStub ? 'finding-item--enrichment-stub' : '',
    ].filter(Boolean).join(' ');
    const footer = renderFindingFooterActions(f);

    if (compact) {
        const excelLink = shouldShowInterpRiskLink(f, headline)
            ? `<button type="button" class="btn btn-link btn-sm finding-row-excel-link" onclick="openDirectExcelSource(${f.id})">Excel</button>`
            : '';
        return `
        <article class="${itemCls}" id="finding-${f.id}" ${pending ? `data-pending-id="finding-pending-${f.id}"` : ''}>
            <div class="finding-row-grid">
                <div class="finding-row-main">
                    <div class="finding-row-meta">
                        ${queueBadge}
                        ${areaChip}
                        <span class="finding-row-id">№${f.id}</span>
                        ${excelLink}
                    </div>
                    <p class="finding-row-title">${escapeHtml(headline)}</p>
                    ${renderFindingRejectReasonLine(f)}
                    ${renderMarketerMissingBlock(f)}
                    ${recommendationBlock}
                </div>
                <div class="finding-row-aside">${footer}</div>
            </div>
            ${secondaryBlocks ? `<div class="finding-row-more">${secondaryBlocks}</div>` : ''}
            ${shouldShowFindingHumanComment(f) ? `<div class="finding-marketer-comment"><span class="finding-missing-label">Комментарий</span><p>${escapeHtml(f.human_comment)}</p></div>` : ''}
        </article>`;
    }

    return `
        <div class="${itemCls}" id="finding-${f.id}" ${pending ? `data-pending-id="finding-pending-${f.id}"` : ''}>
            <div class="finding-marketer-head">
                ${queueBadge}
                ${areaChip}
            </div>
            ${interpHeader}
            <p class="finding-verdict-headline">${escapeHtml(headline)}</p>
            ${subLine}
            ${renderFindingRejectReasonLine(f)}
            ${renderMarketerMissingBlock(f)}
            ${recommendationBlock}
            ${secondaryBlocks}
            ${shouldShowFindingHumanComment(f) ? `<div class="finding-marketer-comment"><span class="finding-missing-label">Комментарий маркетолога</span><p>${escapeHtml(f.human_comment)}</p></div>` : ''}
            ${!compact && f.edited_at ? `<div class="finding-meta-row"><span>Изменил: ${escapeHtml(f.edited_by || 'marketer')}</span><span>${formatDate(f.edited_at)}</span></div>` : ''}
            ${footer}
        </div>`;
}

function renderFindings(findings, coverage) {
    const container = document.getElementById('findingsList');
    if (!container) return;
    if (getAuditData()?.workflow_state?.analysis_failed) {
        container.innerHTML = `
            <div class="empty-state-card">
                <h3>AI-анализ не завершён</h3>
                <p class="muted">Выводы появятся после успешного AI-анализа.</p>
            </div>`;
        return;
    }
    const auditData = getAuditData();
    if (isPreliminaryAudit()) {
        const canSyncDirect = hasDirectHealthScore(auditData) && hasDirectAnalyticsSlice(auditData);
        const aiCount = countAiFindings(findings);
        if (aiCount === 0 && !canSyncDirect) {
            container.innerHTML = `
                <div class="empty-state-card">
                    <h3>Выводы появятся после добавления и проверки данных</h3>
                    <p class="muted">${escapeHtml(auditData?.workflow_ui?.next_action_hint || 'Без материалов система не формирует AI-выводы с приоритетом и уверенностью.')}</p>
                    <div class="preliminary-limits">
                        <p><strong>Ограничение анализа:</strong> ${escapeHtml(coverage?.data_collection_recommendation || 'Добавьте исходные данные для аудита.')}</p>
                    </div>
                </div>`;
            return;
        }
        if (aiCount === 0) {
            container.innerHTML = `
                <div class="empty-state-card">
                    <h3>Нет AI-выводов</h3>
                    <p class="muted">Риски Excel — вкладка «${DIRECT_COPY.productTab}».</p>
                </div>`;
            return;
        }
    }
    if (findings.length === 0) {
        if (hasGuidedCompletedAnalysis(getAuditData())) {
            const summary = getAuditData()?.audit_summary || {};
            const stale = isAnalysisStale(getAuditData());
            container.innerHTML = `
                <div class="empty-state-card">
                    <h3>AI-анализ завершён</h3>
                    <p class="muted">Отдельные карточки выводов не сохранены. Краткий итог из последнего запуска:</p>
                    <p><strong>Проблема:</strong> ${escapeHtml(summary.client_problem || '—')}</p>
                    <p><strong>Риск:</strong> ${escapeHtml(summary.main_risk || '—')}</p>
                    <p><strong>Вывод:</strong> ${escapeHtml(summary.short_conclusion || 'Откройте вкладку «Отчёт» для деталей.')}</p>
                    ${stale ? '<p class="muted">Данные обновлены — перезапустите AI-анализ (кнопка в шапке или «Ещё»).</p>' : ''}
                    <div class="findings-empty-actions">
                        <button type="button" class="btn btn-primary btn-sm" onclick="openReportPanel()">Открыть отчёт</button>
                    </div>
                </div>`;
            return;
        }
        if (hasDirectHealthScore(auditData) && hasDirectAnalyticsSlice(auditData)) {
            container.innerHTML = `
                <div class="empty-state-card">
                    <h3>Нет AI-выводов</h3>
                    <p class="muted">Риски Excel — вкладка «${DIRECT_COPY.productTab}».</p>
                </div>`;
            return;
        }
        container.innerHTML = '<p class="muted findings-empty-muted">Нет выводов.</p>';
        return;
    }

    resetFindingsMarketerFilterForAudit(findings, getCurrentAuditId(), getAuditData());
    syncFindingsMarketerFilter(findings, getAuditData());

    const progress = getFindingReviewProgress(getAuditData());
    const filterBar = renderFindingsMarketerFilterBar(findings, getAuditData());

    if (findingsMarketerFilter === 'recs') {
        container.innerHTML = `${filterBar}<p class="muted findings-recs-lead">Сводка уникальных действий и коммерческий план — ниже (без дублей карточек).</p>`;
        syncFindingsAuxPanelsVisibility();
        return;
    }

    const active = findings.filter((f) => matchesMarketerFindingsFilter(f, findingsMarketerFilter));

    const missingEnrichmentHtml = findingsMarketerFilter === 'no_ai'
        ? renderMissingEnrichmentCards(getAuditData())
        : '';

    if (active.length === 0 && !missingEnrichmentHtml && countAiFindings(findings) === 0) {
        container.innerHTML = `${filterBar}<div class="empty-state-card findings-filter-empty-card">
            <h3>Нет AI-выводов</h3>
            <p class="muted">Риски Excel — вкладка «${DIRECT_COPY.productTab}».</p>
        </div>`;
        syncFindingsAuxPanelsVisibility();
        return;
    }

    if (active.length === 0 && !missingEnrichmentHtml) {
        const auditData = getAuditData();
        const inReport = countMarketerFindingsFilter(findings, 'report', auditData);
        const hint = getFindingsFilterEmptyHint(findingsMarketerFilter, progress, inReport);
        const ctas = buildFindingsFilterCtas(findings, auditData, progress);
        let body = `<div class="findings-filter-empty-card">
            <p class="muted findings-filter-empty">${escapeHtml(hint)}</p>
            <div class="findings-filter-empty-actions">${ctas}</div>
        </div>`;

        if (progress.pending === 0 && hasGuidedCompletedAnalysis(auditData)) {
            const improvements = getPostAnalysisDataImprovements(auditData);
            const labels = improvements.slice(0, 5).map((i) => escapeHtml(i.label || i.id)).filter(Boolean);
            const improveBlock = improvements.length
                ? `<div class="empty-state-card findings-all-done-card">
                    <h3>Все AI-выводы проверены</h3>
                    <p class="muted">Для повышения точности добавьте:</p>
                    <ul class="empty-checklist">${labels.map((l) => `<li>${l}</li>`).join('')}</ul>
                    <button type="button" class="btn btn-outline btn-sm" onclick="goToDataImprovements()">Перейти к данным</button>
                   </div>`
                : `<div class="empty-state-card findings-all-done-card">
                    <h3>Все AI-выводы проверены</h3>
                    <p class="muted">${inReport > 0 ? `${inReport} в отчёте — откройте фильтр «В отчёте» ниже.` : 'Активных карточек нет.'}</p>
                   </div>`;
            body = improveBlock + body;
        }

        container.innerHTML = `${filterBar}<div class="findings-view findings-view--${findingsMarketerFilter}">${missingEnrichmentHtml}${body}</div>`;
        syncFindingsAuxPanelsVisibility();
        return;
    }

    const activeHtml = active.map((f) => renderFindingCard(f)).join('');
    const viewCls = `findings-view findings-view--${findingsMarketerFilter}`;
    container.innerHTML = `${filterBar}<div class="${viewCls}">${missingEnrichmentHtml}${activeHtml}</div>`;
    bindFindingIllustrationCaptionInputs(container);
    syncFindingsAuxPanelsVisibility();
}

async function refreshAuditAfterFindingAction(message) {
    const refreshed = await apiRequest(`/api/audits/${getCurrentAuditId()}`);
    runtimeBridge.setAuditData?.(refreshed);
    syncFindingsMarketerFilter(refreshed.findings || [], refreshed);
    runtimeBridge.renderAuditDetail?.(refreshed);
    showAlert(message, 'success');
}

async function unconfirmFinding(id) {
    if (!requireWriteAccess('Отмена подтверждения вывода')) return;
    const accepted = await showConfirmDialog({
        title: 'Отменить подтверждение',
        message: 'Вывод снова попадёт в статус «на проверке». Запись будет удалена из базы знаний для других аудитов.',
        confirmText: 'Отменить подтверждение',
        cancelText: 'Оставить как есть',
        confirmType: 'primary',
    });
    if (!accepted) return;
    try {
        await apiRequest(findingFeedbackUrl(id, 'unconfirm'), {
            method: 'POST',
            body: JSON.stringify({}),
        });
        findingsMarketerFilter = 'pending';
        const msg = 'Подтверждение отменено. Вывод снова в очереди «На проверку».';
        await refreshAuditAfterFindingAction(msg);
    } catch (error) {
        showAlert('Ошибка: ' + error.message, 'danger');
    }
}

function findingEvidenceCheckUrl(findingId) {
    const auditId = getCurrentAuditId();
    if (auditId) {
        return `/api/audits/${auditId}/findings/${findingId}/evidence-check`;
    }
    return `/api/findings/${findingId}/evidence-check`;
}

async function postFindingConfirm(id, body) {
    return apiRequest(findingFeedbackUrl(id, 'confirm'), {
        method: 'POST',
        body: JSON.stringify(body),
    });
}

async function confirmFinding(id) {
    if (!requireWriteAccess('Подтверждение вывода')) return;
    const finding = getFindingById(id);
    if (isDirectHealthFinding(finding)) {
        showAlert('На «Выводах» проверяются только AI-выводы.', 'info');
        return;
    }
    let evidenceHint = '';
    try {
        const check = await apiRequest(findingEvidenceCheckUrl(id));
        if (!check.ok && (check.warnings || []).length) {
            evidenceHint = '\n\n⚠️ ' + check.warnings.join(' ');
        }
    } catch (_e) { /* preview optional */ }
    const comment = await showPromptDialog({
        title: 'Подтвердить и обучить',
        message: `Вывод попадёт в отчёт и в базу знаний. Комментарий необязателен.${evidenceHint}`,
        placeholder: 'Комментарий к подтверждению (необязательно)',
        confirmText: 'Подтвердить',
    });
    if (comment === false) return;
    const payload = { comment: comment || '' };
    try {
        const saved = await postFindingConfirm(id, payload);
        await refreshAuditAfterFindingAction(describeFindingOutcomeMessage(saved, 'confirm'));
    } catch (error) {
        if (error.code === 'WEAK_EVIDENCE') {
            const proceed = await showConfirmDialog({
                title: 'Слабые доказательства',
                message: `${error.message}\n\nПодтвердить вывод и отправить в базу знаний всё равно?`,
                confirmText: 'Подтвердить всё равно',
                cancelText: 'Вернуться к проверке',
                confirmType: 'primary',
            });
            if (!proceed) return;
            try {
                const saved = await postFindingConfirm(id, {
                    ...payload,
                    acknowledge_weak_evidence: true,
                });
                await refreshAuditAfterFindingAction(describeFindingOutcomeMessage(saved, 'confirm'));
                return;
            } catch (retryErr) {
                showAlert('Ошибка подтверждения: ' + retryErr.message, 'danger');
                return;
            }
        }
        showAlert('Ошибка подтверждения: ' + error.message, 'danger');
    }
}

async function confirmFindingRiskPattern(id) {
    if (!requireWriteAccess('Подтверждение ограничения')) return;
    const finding = getFindingById(id);
    if (!canConfirmFindingRiskPattern(finding)) {
        showAlert(
            '«В отчёт (шаблон)» — только для ограничений по данным (нет выгрузки CRM, запросов и т.п.). '
            + 'Для этого вывода нажмите зелёную кнопку «В отчёт» на карточке.',
            'warning',
        );
        return;
    }
    const comment = await showPromptDialog({
        title: 'В отчёт (шаблон ограничения)',
        message: 'Зафиксировать, что данных не хватает. Попадёт в отчёт и в базу знаний как паттерн риска — не как полноценный вывод с цифрами.',
        placeholder: 'Комментарий (необязательно)',
        confirmText: 'В отчёт (шаблон)',
    });
    if (comment === false) return;
    try {
        const saved = await apiRequest(findingFeedbackUrl(id, 'confirm-risk-pattern'), {
            method: 'POST',
            body: JSON.stringify({ comment: comment || '' }),
        });
        await refreshAuditAfterFindingAction(describeFindingOutcomeMessage(saved, 'risk_pattern'));
    } catch (error) {
        const msg = error.code === 'NOT_RISK_PATTERN' || /шаблон/i.test(error.message || '')
            ? (error.message || 'Используйте зелёную «В отчёт» для обычного вывода.')
            : `Ошибка: ${error.message}`;
        showAlert(msg, 'warning');
    }
}

async function restoreFindingToReview(id) {
    if (!requireWriteAccess('Возврат вывода в проверку')) return;
    const f = getFindingById(id);
    if (!f || isDirectHealthFinding(f)) return;
    if (f.status === 'human_rejected') {
        try {
            await apiRequest(findingFeedbackUrl(id, 'unconfirm'), {
                method: 'POST',
                body: JSON.stringify({ comment: '' }),
            });
            findingsMarketerFilter = 'pending';
            await refreshAuditAfterFindingAction('Вывод снова в очереди «На проверку».');
        } catch (error) {
            showAlert('Ошибка: ' + error.message, 'danger');
        }
        return;
    }
    if (['human_confirmed', 'human_edited'].includes(f.status || '')) {
        await unconfirmFinding(id);
    }
}

async function rejectFinding(id) {
    if (!requireWriteAccess('Отклонение вывода')) return;
    const finding = getFindingById(id);
    if (isDirectHealthFinding(finding)) {
        showAlert('Риски Excel не проверяются на «Выводах».', 'info');
        return;
    }
    const reason = await showPromptDialog({
        title: 'Отклонить и не обучать',
        message: 'Вывод не попадёт в отчёт и базу знаний и не будет использоваться при следующем AI-анализе.',
        placeholder: 'Укажите причину отклонения',
        confirmText: 'Отклонить',
        required: true,
    });
    if (reason === false || !reason) return;
    try {
        await apiRequest(findingFeedbackUrl(id, 'reject'), {
            method: 'POST',
            body: JSON.stringify({ reason, comment: reason })
        });
        findingsMarketerFilter = 'rejected';
        await refreshAuditAfterFindingAction(describeFindingOutcomeMessage(finding, 'reject'));
    } catch (error) {
        showAlert('Ошибка отклонения: ' + error.message, 'danger');
    }
}

function openFindingEdit(id, draft = null, options = null) {
    if (!requireWriteAccess('Редактирование вывода')) return;
    const f = getFindingById(id);
    if (!f) return;
    const modalOpts = {
        mode: options?.mode === 'quick' ? 'quick' : 'expert',
        fromChat: Boolean(options?.fromChat),
    };
    configureFindingEditModal(f, modalOpts);
    document.getElementById('findingEditId').value = f.id;
    document.getElementById('findingEditSeverity').value = f.severity || 'medium';
    document.getElementById('findingEditConfidence').value = f.confidence ?? 0.5;
    document.getElementById('findingEditProblem').value = f.problem || '';
    document.getElementById('findingEditRecommendation').value = f.recommendation || '';
    document.getElementById('findingEditImpact').value = f.expected_impact || '';
    document.getElementById('findingEditNeedsReview').checked = Boolean(f.needs_review);
    document.getElementById('findingEditApprovedForKb').checked = Boolean(f.approved_for_kb);
    document.getElementById('findingEditComment').value = f.human_comment || f.review_reason || '';
    if (draft && typeof draft === 'object') {
        if (draft.problem != null) {
            document.getElementById('findingEditProblem').value = String(draft.problem);
        }
        if (draft.recommendation != null) {
            document.getElementById('findingEditRecommendation').value = String(draft.recommendation);
        }
        if (draft.expected_impact != null) {
            document.getElementById('findingEditImpact').value = String(draft.expected_impact);
        }
        if (draft.human_comment != null) {
            document.getElementById('findingEditComment').value = String(draft.human_comment);
        }
    }
    updateFindingEditPdfPreview();
    runtimeBridge.openModal?.('findingEditModal');
    const focusId = draft?.focus === 'problem'
        ? 'findingEditProblem'
        : draft?.focus === 'recommendation'
            ? 'findingEditRecommendation'
            : null;
    if (focusId) {
        setTimeout(() => document.getElementById(focusId)?.focus(), 80);
    }
}

/** Открыть правку вывода с черновиком из AI-чата (R3-lite + R11). */
function openFindingEditWithChatDraft(findingId, chatAnswer) {
    const text = String(chatAnswer || '').trim();
    if (!text) {
        showAlert('Нет текста ответа для вставки', 'warning');
        return;
    }
    const parsed = parseChatDraftForFinding(text);
    const draft = {
        human_comment: 'Черновик из AI-чата — проверьте поля перед сохранением.',
        focus: parsed.recommendation ? 'recommendation' : 'problem',
    };
    if (parsed.problem) draft.problem = parsed.problem;
    if (parsed.recommendation) draft.recommendation = parsed.recommendation;
    if (parsed.expected_impact) draft.expected_impact = parsed.expected_impact;
    if (!parsed.recommendation && !parsed.problem) {
        showAlert('Не удалось выделить текст для PDF из ответа — допишите вручную.', 'warning');
    }
    openFindingEdit(findingId, draft, { mode: 'quick', fromChat: true });
}

async function saveFindingEdit() {
    if (!requireWriteAccess('Сохранение правок')) return;
    const id = document.getElementById('findingEditId').value;
    const areaSelect = document.getElementById('findingEditAreaSelect');
    const area = areaSelect?.value || document.getElementById('findingEditArea')?.value || 'other';
    const problem = document.getElementById('findingEditProblem').value;
    const recommendation = document.getElementById('findingEditRecommendation').value;
    if (hasInternalReportLeak(`${problem}\n${recommendation}`)) {
        const proceed = await showConfirmDialog({
            title: 'Служебные пометки в тексте',
            message: 'В полях остались № выводов или [mat_N]. В PDF клиент их не должен видеть. Сохранить всё равно?',
            confirmText: 'Сохранить',
            cancelText: 'Вернуться к правке',
            confirmType: 'warning',
        });
        if (!proceed) return;
    }
    const payload = {
        area,
        severity: document.getElementById('findingEditSeverity').value,
        confidence: Number(document.getElementById('findingEditConfidence').value || 0.5),
        problem,
        recommendation,
        expected_impact: document.getElementById('findingEditImpact').value,
        needs_review: document.getElementById('findingEditNeedsReview').checked,
        approved_for_kb: document.getElementById('findingEditApprovedForKb').checked,
        review_reason: document.getElementById('findingEditNeedsReview').checked ? document.getElementById('findingEditComment').value : null,
        human_comment: document.getElementById('findingEditComment').value
    };
    try {
        const auditId = getCurrentAuditId();
        const editUrl = auditId ? `/api/audits/${auditId}/findings/${id}` : `/api/findings/${id}`;
        const saved = await apiRequest(editUrl, {
            method: 'PATCH',
            body: JSON.stringify(payload)
        });
        runtimeBridge.closeModal?.('findingEditModal');
        await refreshAuditAfterFindingAction(describeFindingOutcomeMessage(saved, 'edit'));
    } catch (error) {
        showAlert('Ошибка сохранения правки: ' + error.message, 'danger');
    }
}
export {
    getFindingReviewProgress,
    formatReviewProgressLine,
    formatReviewRemainingLine,
    buildFindingReviewBannerModel,
    auditHasDataLimitations,
    findingInReviewQueue,
    isFindingPendingReview,
    pluralizeFindingsCount,
    pluralizeFindingsReview,
    areaDisplayLabel,
    setFindingsMarketerFilter,
    syncFindingsAuxPanelsVisibility,
    goToFindingsInReport,
    scrollToDirectRisks,
    openAiFindingFromDirectRisk,
    openDirectExcelSource,
    renderDirectRisksOnDirectPage,
    renderFindings,
    renderFindingsMarketerFilterBar,
    openFindingEvidenceMaterial,
    openFindingIllustrationPicker,
    clearFindingIllustration,
    unconfirmFinding,
    confirmFinding,
    confirmFindingRiskPattern,
    rejectFinding,
    restoreFindingToReview,
    openFindingEdit,
    openFindingEditWithChatDraft,
    saveFindingEdit,
    loadKbStatusCard,
    findingKindLabel,
};
