import { runtimeBridge } from './runtime-bridge.js';
import { showAlert } from './alerts.js';

export function getAuthHeaders({ json = true } = {}) {
    const headers = {};
    if (json) headers['Content-Type'] = 'application/json';
    const role = localStorage.getItem('ppc_user_role');
    const userId = localStorage.getItem('ppc_user_id');
    const userName = localStorage.getItem('ppc_user_name');
    const accessToken = localStorage.getItem('ppc_access_token');
    if (role) headers['X-User-Role'] = role;
    if (userId) headers['X-User-Id'] = userId;
    if (userName) headers['X-User-Name'] = userName;
    if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
    return headers;
}

export function parseApiErrorPayload(errorBody, response, url = '') {
    const detail = errorBody?.detail;
    let message = 'Ошибка запроса';
    if (typeof detail === 'string' && detail) {
        message = detail;
        if (response?.status === 404 && detail === 'Not Found' && String(url).includes('/findings/')) {
            message = 'Действие недоступно (обновите сервер и перезагрузите страницу Ctrl+F5)';
        }
    } else if (Array.isArray(detail) && detail.length) {
        message = detail.map((item) => {
            if (typeof item === 'string') return item;
            return item.msg ? item.msg.replace(/^Value error,\s*/i, '') : JSON.stringify(item);
        }).join('; ');
    } else if (detail && typeof detail === 'object') {
        message = detail.message || detail.detail || JSON.stringify(detail);
    }
    return message;
}

export function enrichApiError(errorBody, response, url = '') {
    const message = parseApiErrorPayload(errorBody, response, url);
    const detail = errorBody?.detail;
    const err = new Error(message);
    if (detail && typeof detail === 'object') {
        if (detail.code) err.code = detail.code;
        if (detail.evidence_check) err.evidenceCheck = detail.evidence_check;
        if (detail.retryable != null) err.retryable = detail.retryable;
    }
    return err;
}

export async function apiFetch(url, options = {}) {
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const headers = {
        ...getAuthHeaders({ json: !isFormData }),
        ...(options.headers || {}),
    };
    if (isFormData) {
        delete headers['Content-Type'];
    }
    const { signal, ...rest } = options;
    const response = await fetch(url, { ...rest, headers, signal });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw enrichApiError(error, response, url);
    }
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
        return response.json();
    }
    return response;
}

export async function apiRequest(url, options = {}) {
    try {
        return await apiFetch(url, options);
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

export function findingFeedbackUrl(findingId, action) {
    const auditId = runtimeBridge.getCurrentAuditId() || runtimeBridge.getAuditIdFromUrl();
    if (auditId) {
        return `/api/audits/${auditId}/findings/${findingId}/${action}`;
    }
    return `/api/findings/${findingId}/${action}`;
}

export async function openProtectedFileUrl(url, { downloadName = 'file' } = {}) {
    if (!url) {
        showAlert('Файл не найден', 'warning');
        return;
    }
    try {
        const response = await apiFetch(url, { method: 'GET' });
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        const popup = window.open(objectUrl, '_blank', 'noopener');
        if (!popup) {
            const link = document.createElement('a');
            link.href = objectUrl;
            link.download = downloadName;
            link.rel = 'noopener';
            link.click();
        }
        setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (error) {
        showAlert('Не удалось открыть файл: ' + error.message, 'danger');
    }
}
