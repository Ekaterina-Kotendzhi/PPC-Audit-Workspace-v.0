/**
 * C1–C3: structured AI chat answer (sections, PDF collapsed, client-safe display).
 */
import { escapeHtml } from '../core/utils.js';
import {
    sanitizeClientReportText,
    extractPdfBlockFromChat,
} from './finding-report-text.js';

const SECTION_HEADERS = [
    { key: 'pdf', test: (l) => /^текст\s+для\s+pdf/i.test(l), label: 'Черновик для PDF' },
    { key: 'grounds', test: (l) => /^основания(\s+для\s+вывода)?/i.test(l), label: 'Основания' },
    { key: 'recs', test: (l) => /^рекомендац/i.test(l), label: 'Рекомендации' },
    { key: 'recs_client', test: (l) => /^рекомендац/i.test(l) && /клиент/i.test(l), label: 'Рекомендации клиенту' },
    { key: 'effect', test: (l) => /^ожидаемый\s+эффект/i.test(l), label: 'Ожидаемый эффект' },
    { key: 'brief', test: (l) => /^краткий\s+вывод/i.test(l), label: 'Краткий вывод' },
];

function stripHeaderLine(line) {
    const m = String(line || '').trim();
    const idx = m.indexOf(':');
    if (idx > 0 && idx < 48) {
        const tail = m.slice(idx + 1).trim();
        return tail || '';
    }
    return '';
}

export function parseChatAssistantSections(raw) {
    const text = String(raw || '').replace(/\r\n/g, '\n').trim();
    if (!text) return [];

    const lines = text.split('\n');
    const sections = [];
    let current = { key: 'lead', label: 'Ответ', lines: [] };

    for (const line of lines) {
        const trimmed = line.trim();
        const header = SECTION_HEADERS.find((h) => h.test(trimmed));
        if (header) {
            if (current.lines.some((l) => String(l).trim())) {
                sections.push(current);
            }
            const tail = stripHeaderLine(trimmed);
            current = { key: header.key, label: header.label, lines: tail ? [tail] : [] };
            continue;
        }
        current.lines.push(line);
    }
    if (current.lines.some((l) => String(l).trim())) {
        sections.push(current);
    }

    return sections
        .map((s) => ({ ...s, body: s.lines.join('\n').trim() }))
        .filter((s) => s.body.length > 0);
}

function formatChatBodyHtml(text, { audienceMode = 'internal', linkifyMaterials = true } = {}) {
    const isClient = audienceMode === 'client';
    let body = isClient ? sanitizeClientReportText(text) : String(text || '').trim();
    if (!body) return '';

    let html = escapeHtml(body);
    if (!isClient && linkifyMaterials) {
        html = html.replace(
            /\[mat_(\d+)\]/gi,
            (_, id) => `<button type="button" class="btn btn-link btn-sm chat-mat-link" `
                + `onclick="openFindingEvidenceMaterial(${Number(id)})">материал №${id}</button>`,
        );
        html = html.replace(
            /\[finding_(\d+)\]/gi,
            (_, id) => `<button type="button" class="btn btn-link btn-sm" `
                + `onclick="goToFindingsInReport(${Number(id)})">вывод №${id}</button>`,
        );
    }
    return html.replace(/\n/g, '<br>');
}

function pickPrimarySection(sections) {
    const order = ['recs_client', 'recs', 'brief', 'lead', 'effect'];
    for (const key of order) {
        const hit = sections.find((s) => s.key === key);
        if (hit) return hit;
    }
    return sections.find((s) => !['pdf', 'grounds'].includes(s.key)) || sections[0];
}

export function renderChatAssistantBody(content, options = {}) {
    const { audienceMode = 'internal' } = options;
    const isClient = audienceMode === 'client';
    const sections = parseChatAssistantSections(content);

    if (!sections.length) {
        const fallback = isClient ? sanitizeClientReportText(content) : content;
        return `<div class="chat-answer-primary">${formatChatBodyHtml(fallback, options)}</div>`;
    }

    const primary = pickPrimarySection(sections);
    const parts = [];

    if (primary) {
        parts.push(`<div class="chat-answer-primary">${formatChatBodyHtml(primary.body, options)}</div>`);
    }

    const effectSec = sections.find((s) => s.key === 'effect' && s !== primary);
    if (effectSec) {
        parts.push(`<p class="chat-answer-effect muted"><strong>Эффект:</strong> `
            + `${formatChatBodyHtml(effectSec.body, options)}</p>`);
    }

    if (!isClient) {
        const grounds = sections.find((s) => s.key === 'grounds');
        if (grounds) {
            parts.push(`<details class="chat-answer-extra"><summary>${escapeHtml(grounds.label)}</summary>`
                + `<div class="chat-answer-extra-body">${formatChatBodyHtml(grounds.body, options)}</div></details>`);
        }
    }

    const pdfBody = sections.find((s) => s.key === 'pdf')?.body || extractPdfBlockFromChat(content);
    if (pdfBody && !isClient) {
        parts.push(`<details class="chat-answer-extra chat-answer-pdf"><summary>${escapeHtml('Черновик для PDF')}</summary>`
            + `<div class="chat-answer-extra-body">${formatChatBodyHtml(pdfBody, { ...options, linkifyMaterials: false })}</div></details>`);
    }

    const usedKeys = new Set([primary?.key, effectSec?.key, 'grounds', 'pdf'].filter(Boolean));
    sections
        .filter((s) => !usedKeys.has(s.key))
        .forEach((s) => {
            parts.push(`<details class="chat-answer-extra"><summary>${escapeHtml(s.label)}</summary>`
                + `<div class="chat-answer-extra-body">${formatChatBodyHtml(s.body, options)}</div></details>`);
        });

    return parts.join('');
}
