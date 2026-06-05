export const DISPLAY_TIMEZONE = window.__DISPLAY_TIMEZONE || 'Europe/Moscow';
export const DISPLAY_TZ_SUFFIX = window.__DISPLAY_TZ_SUFFIX || 'UTC+3';
export const AUDIT_LIST_TZ_OFFSET = window.__AUDIT_LIST_TZ_OFFSET || 'UTC+3';

/** API хранит UTC; строки без суффикса Z нужно читать как UTC, не как локальное время. */
export function parseApiDateTime(dateStr) {
    if (!dateStr) return null;
    const raw = String(dateStr).trim();
    if (!raw) return null;
    if (/[zZ]$/.test(raw) || /[+-]\d{2}:\d{2}$/.test(raw)) {
        const d = new Date(raw);
        return Number.isNaN(d.getTime()) ? null : d;
    }
    const iso = raw.includes('T') ? raw : `${raw}T00:00:00`;
    const d = new Date(`${iso}Z`);
    return Number.isNaN(d.getTime()) ? null : d;
}

export function parseApiDateMs(dateStr) {
    const d = parseApiDateTime(dateStr);
    return d ? d.getTime() : 0;
}

export function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = parseApiDateTime(dateStr);
    if (!d) return '—';
    const parts = new Intl.DateTimeFormat('ru-RU', {
        timeZone: DISPLAY_TIMEZONE,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).formatToParts(d);
    const get = (type) => parts.find((p) => p.type === type)?.value || '';
    return `${get('day')}.${get('month')}.${get('year')} · ${get('hour')}:${get('minute')} ${DISPLAY_TZ_SUFFIX}`;
}

/** Список аудитов: дата и время для ячейки, полный текст в tooltip. */
export function formatAuditListDateTime(dateStr) {
    if (!dateStr) return { date: '—', time: '—', full: '—' };
    const d = parseApiDateTime(dateStr);
    if (!d) return { date: '—', time: '—', full: '—' };
    const parts = new Intl.DateTimeFormat('ru-RU', {
        timeZone: DISPLAY_TIMEZONE,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).formatToParts(d);
    const get = (type) => parts.find((p) => p.type === type)?.value || '';
    const hm = `${get('hour')}:${get('minute')}`;
    const offset = AUDIT_LIST_TZ_OFFSET;
    const date = `${get('day')}.${get('month')}.${get('year')}`;
    return {
        date,
        time: `${hm} ${offset}`,
        full: `${date} ${hm} ${offset}`,
    };
}
