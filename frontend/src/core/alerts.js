import { escapeHtml } from './utils.js';

const ALERT_MAX_VISIBLE = 3;
const ALERT_DURATION_MS = { danger: 10000, warning: 8000, success: 5000, info: 5000 };

export function showAlert(message, type = 'info') {
    const container = document.getElementById('alertContainer');
    if (!container) return;

    while (container.children.length >= ALERT_MAX_VISIBLE) {
        container.firstElementChild?.remove();
    }

    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.setAttribute('role', type === 'danger' ? 'alert' : 'status');
    const icon = type === 'warning' ? '⚠️' : type === 'danger' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    alert.innerHTML = `
        <span class="alert-icon">${icon}</span>
        <span class="alert-text">${escapeHtml(String(message ?? ''))}</span>
        <button type="button" class="alert-dismiss" aria-label="Закрыть уведомление">×</button>
    `;
    alert.querySelector('.alert-dismiss')?.addEventListener('click', () => alert.remove());
    container.appendChild(alert);

    const duration = ALERT_DURATION_MS[type] || ALERT_DURATION_MS.info;
    setTimeout(() => alert.remove(), duration);
}

export function dismissAlertsMatching(pattern) {
    const container = document.getElementById('alertContainer');
    if (!container) return;
    container.querySelectorAll('.alert').forEach((el) => {
        const text = el.textContent || '';
        if (pattern.test(text)) el.remove();
    });
}
