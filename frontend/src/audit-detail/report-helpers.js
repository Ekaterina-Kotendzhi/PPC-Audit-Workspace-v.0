/** Shared report tab helpers (extracted from card.js). */
export function reportPriorityLabel(value) {
    const key = String(value || 'medium').toLowerCase();
    const labels = {
        high: 'Требует внимания в первую очередь',
        medium: 'Важно проверить до масштабирования',
        low: 'Можно отложить — наблюдение',
    };
    return labels[key] || labels.medium;
}
