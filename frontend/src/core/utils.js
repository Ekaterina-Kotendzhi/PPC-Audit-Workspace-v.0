export function normalizeOpsAlertSummary(message) {
    const text = String(message || '').trim();
    const failedMatch = text.match(/(\d+)\s+неуспешн/i);
    if (failedMatch) {
        const n = failedMatch[1];
        const word = n === '1' ? 'запуск' : (n.endsWith('1') && !n.endsWith('11') ? 'запуск' : 'запуска');
        return `${n} неуспешных ${word} за 24 часа`;
    }
    return text
        .replace(/^За последние 24\s*ч\.?\s*(есть\s*)?/i, '')
        .replace(/^Есть предупреждения:\s*/i, '')
        .trim();
}

export function humanizeDisplayText(text) {
    if (text === null || text === undefined || text === '') return text;
    return String(text)
        .replace(/\[name hidden\]/gi, 'аудита')
        .replace(/Audit Score/gi, 'Оценка')
        .replace(/\[название скрыто\]/gi, 'клиента');
}

export function getActiveWorkflowTab() {
    const active = document.querySelector('.tab-content.active');
    return active?.id?.replace('tab-', '') || 'data';
}

export function formatMoney(value) {
    if (value === null || value === undefined || value === '') return '—';
    const n = Number(value);
    if (Number.isNaN(n)) return '—';
    return n.toLocaleString('ru-RU') + ' ₽';
}

export function formatNumber(value) {
    if (value === null || value === undefined || value === '') return '—';
    const n = Number(value);
    if (Number.isNaN(n)) return '—';
    return n.toLocaleString('ru-RU');
}

export function showLoader() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.add('active');
}

export function hideLoader() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.remove('active');
}

export function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

export function jsAttr(value) {
    return String(value == null ? '' : value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}
