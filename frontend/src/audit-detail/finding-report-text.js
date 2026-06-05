/**
 * R11/R13/R14: client-safe text for PDF observations (problem + recommendation).
 */
import { escapeHtml } from '../core/utils.js';

const PDF_BLOCK_MARKERS = [
    /текст\s+для\s+pdf\s*:?\s*/i,
    /готовый\s+текст\s+для\s+pdf\s*:?\s*/i,
    /для\s+отчёта\s+клиенту\s*:?\s*/i,
    /для\s+pdf\s*:?\s*/i,
];

const SECTION_STOP = /\n\s*(?:что\s+проверить|источники|уверенность|почему\s+такой|provider=)/i;

const INTERNAL_LINE_RE = [
    /^вывод\s*#\s*\d+/i,
    /^основания\s+для\s+вывода/i,
    /^высокая\s+уверенность/i,
    /^средняя\s+уверенность/i,
    /^низкая\s+уверенность/i,
    /^\[finding_\d+\]/i,
    /^\[mat_\d+\]/i,
];

export function hasInternalReportLeak(text) {
    const t = String(text || '');
    return /вывод\s*#\s*\d+|\[mat_\d+\]|\[finding_\d+\]/i.test(t);
}

export function extractPdfBlockFromChat(text) {
    const raw = String(text || '').trim();
    if (!raw) return '';
    for (const re of PDF_BLOCK_MARKERS) {
        const idx = raw.search(re);
        if (idx < 0) continue;
        const head = raw.match(re);
        if (!head) continue;
        let chunk = raw.slice(idx + head[0].length).trim();
        const stop = chunk.search(SECTION_STOP);
        if (stop > 0) chunk = chunk.slice(0, stop).trim();
        if (chunk.length > 10) return chunk;
    }
    return '';
}

export function sanitizeClientReportText(text) {
    let t = String(text || '').replace(/\r\n/g, '\n').trim();
    if (!t) return '';

    const lines = t.split('\n').filter((line) => {
        const l = line.trim();
        if (!l) return false;
        return !INTERNAL_LINE_RE.some((re) => re.test(l));
    });
    t = lines.join('\n');

    t = t
        .replace(/\[mat_\d+\]/gi, '')
        .replace(/\[finding_\d+\]/gi, '')
        .replace(/вывод\s*#\s*\d+\s*подтверждён[^\n]*/gi, '')
        .replace(/вывод\s*#\s*\d+[^\n]*/gi, '')
        .replace(/основания\s+для\s+вывода\s*:?\s*/gi, '')
        .replace(/\s{2,}/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

    return t;
}

function sliceSection(body, startRe, stopRes) {
    const m = body.match(startRe);
    if (!m || m.index == null) return '';
    const from = m.index + m[0].length;
    let rest = body.slice(from);
    for (const stop of stopRes) {
        const si = rest.search(stop);
        if (si >= 0) rest = rest.slice(0, si);
    }
    return sanitizeClientReportText(rest.trim());
}

/**
 * @returns {{ problem: string|null, recommendation: string|null, expected_impact: string|null, stripped: boolean }}
 */
export function parseChatDraftForFinding(raw) {
    const original = String(raw || '').trim();
    const pdfBlock = extractPdfBlockFromChat(original);
    const source = pdfBlock || original;
    const sanitized = sanitizeClientReportText(source);
    const stripped = sanitized.length < source.length * 0.85 || hasInternalReportLeak(original);

    const result = {
        problem: null,
        recommendation: null,
        expected_impact: null,
        stripped,
    };
    if (!sanitized) return result;

    const stopRes = [
        /(?:^|\n)\s*(?:что\s+сделать|рекомендац|ожидаемый\s+эффект|эффект)\s*:?\s*/i,
        /(?:^|\n)\s*\d+[\.\)]\s+/,
    ];

    const problem = sliceSection(
        sanitized,
        /(?:^|\n)\s*(?:что\s+не\s+так|проблема|факт)\s*:?\s*/i,
        stopRes,
    );
    const recommendation = sliceSection(
        sanitized,
        /(?:^|\n)\s*(?:что\s+сделать|рекомендац|действия)\s*:?\s*/i,
        [/^(?:ожидаемый\s+эффект|эффект)\s*:?\s*/im],
    );
    const effect = sliceSection(
        sanitized,
        /(?:^|\n)\s*(?:ожидаемый\s+эффект|эффект)\s*:?\s*/i,
        [],
    );

    if (problem) result.problem = problem.slice(0, 2000);
    if (recommendation) result.recommendation = recommendation.slice(0, 6000);
    if (effect) result.expected_impact = effect.slice(0, 1500);

    if (!result.recommendation) {
        const numbered = sanitized.match(/(?:^|\n)\s*\d+[\.\)]\s+[^\n]+/g);
        if (numbered?.length) {
            result.recommendation = numbered.map((l) => l.trim()).join('\n').slice(0, 6000);
            const firstIdx = sanitized.indexOf(numbered[0]);
            const before = sanitized.slice(0, firstIdx).trim();
            if (!result.problem && before.length >= 15 && before.length <= 600) {
                result.problem = before.slice(0, 2000);
            }
        } else if (!result.problem) {
            result.recommendation = sanitized.length > 6000 ? `${sanitized.slice(0, 5997)}…` : sanitized;
        } else {
            result.recommendation = sanitized.slice(0, 6000);
        }
    }

    return result;
}

function isDirectHealthRow(f) {
    if (!f) return false;
    if (f.finding_source === 'direct_health') return true;
    if (f.original_ai_output?.source === 'direct_health') return true;
    return (f.evidence || []).some((e) => e?.source === 'direct_health');
}

function normalizeProblemKey(text) {
    return String(text || '')
        .toLowerCase()
        .replace(/\d+([.,]\d+)?/g, ' ')
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 140);
}

function wordOverlapScore(a, b) {
    const wordsA = new Set(a.split(' ').filter((w) => w.length > 3));
    const wordsB = new Set(b.split(' ').filter((w) => w.length > 3));
    if (!wordsA.size || !wordsB.size) return 0;
    let inter = 0;
    for (const w of wordsA) {
        if (wordsB.has(w)) inter += 1;
    }
    const union = wordsA.size + wordsB.size - inter;
    return union > 0 ? inter / union : 0;
}

export function findSimilarConfirmedFindings(finding, allFindings = []) {
    const key = normalizeProblemKey(finding?.problem);
    if (key.length < 18) return [];
    return (allFindings || []).filter((f) => {
        if (!f || f.id === finding.id) return false;
        if (isDirectHealthRow(f)) return false;
        const st = f.status || '';
        if (!['human_confirmed', 'human_edited'].includes(st)) return false;
        const other = normalizeProblemKey(f.problem);
        if (other.length < 18) return false;
        if (key.includes(other.slice(0, 50)) || other.includes(key.slice(0, 50))) return true;
        return wordOverlapScore(key, other) >= 0.55;
    });
}

export function buildPdfObservationPreviewHtml({ areaLabel, problem, recommendation, expectedImpact }) {
    const area = escapeHtml(areaLabel || 'Вывод');
    const p = escapeHtml(String(problem || '').trim() || '—');
    const rec = String(recommendation || '').trim();
    const effect = String(expectedImpact || '').trim();
    let html = `<p class="finding-pdf-preview-head"><strong>${area}</strong></p><p>${p}</p>`;
    if (rec) html += `<p class="muted finding-pdf-preview-rec">${escapeHtml(rec)}</p>`;
    if (effect) html += `<p class="muted finding-pdf-preview-effect">${escapeHtml(effect)}</p>`;
    const leak = hasInternalReportLeak(`${problem || ''}\n${rec}`);
    if (leak) {
        html += '<p class="finding-pdf-preview-warn">⚠ Уберите служебные пометки (#N, [mat_]) — в PDF их быть не должно.</p>';
    }
    return html;
}
