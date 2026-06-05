import { apiRequest } from './api.js';
import { showAlert } from './alerts.js';
import { runtimeBridge } from './runtime-bridge.js';
import { openModal, closeModal } from './modals.js';

export let authEnabled = false;
export let currentUserRole = 'admin';
export let currentActor = 'local_admin';
export let currentUserName = 'local_admin';
export let strictViewerMode = true;

export function canWrite() {
    return !authEnabled || currentUserRole === 'admin' || currentUserRole === 'marketer';
}

export function isAdminUser() {
    if (!authEnabled) return false;
    return currentUserRole === 'admin';
}

export function isViewerReadOnly() {
    return authEnabled && currentUserRole === 'viewer';
}

export function requireWriteAccess(actionLabel = 'Это действие') {
    if (canWrite()) return true;
    showAlert(`${actionLabel} недоступно: у вас режим только просмотра. Обратитесь к администратору.`, 'warning');
    return false;
}

export async function loadAuthContext() {
    try {
        const me = await apiRequest('/api/auth/me');
        authEnabled = Boolean(me?.auth_enabled);
        currentUserRole = String(me?.role || 'admin').toLowerCase();
        currentActor = String(me?.actor || 'local_admin');
        currentUserName = String(me?.user_name || currentActor || 'local_admin');
        strictViewerMode = me?.ui_strict_viewer_mode !== false;
    } catch (_err) {
        authEnabled = false;
        currentUserRole = 'admin';
        currentActor = 'local_admin';
        currentUserName = 'local_admin';
        strictViewerMode = true;
    }
}

export function renderIdentityBadges() {
    if (!authEnabled) {
        ['userIdentityBadge', 'userIdentityIndexBadge'].forEach((id) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.style.display = 'none';
        });
        return;
    }
    const text = `Пользователь: ${currentUserName} · ${currentUserRole}`;
    ['userIdentityBadge', 'userIdentityIndexBadge'].forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.style.display = 'inline-flex';
        el.classList.toggle('viewer', isViewerReadOnly());
        el.textContent = text;
        el.title = 'Роль и идентификатор пользователя из заголовков запроса';
    });
}

export function renderAuthControls() {
    const wrap = document.getElementById('authControls');
    const mini = document.getElementById('authUserMini');
    const loginBtn = document.getElementById('btnAuthLogin');
    const logoutBtn = document.getElementById('btnAuthLogout');
    const devFillBtn = document.getElementById('btnAuthDevFill');
    if (!wrap || !mini || !loginBtn || !logoutBtn) return;
    if (!authEnabled) {
        wrap.style.display = 'none';
        return;
    }
    wrap.style.display = 'inline-flex';
    const token = localStorage.getItem('ppc_access_token');
    const hasToken = Boolean(token && token.trim());
    mini.textContent = hasToken
        ? `${currentUserName} · ${currentUserRole}`
        : 'Локальный режим (без входа)';
    loginBtn.style.display = hasToken ? 'none' : 'inline-flex';
    logoutBtn.style.display = hasToken ? 'inline-flex' : 'none';
    if (devFillBtn) {
        const localHost = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
        devFillBtn.style.display = localHost && !hasToken ? 'inline-flex' : 'none';
    }
}

export function openAuthLoginModal() {
    const u = document.getElementById('authLoginUsername');
    const p = document.getElementById('authLoginPassword');
    if (u) u.value = 'admin';
    if (p) p.value = '';
    openModal('authLoginModal');
    if (p) p.focus();
}

export function fillDevAuthCredentials() {
    const u = document.getElementById('authLoginUsername');
    const p = document.getElementById('authLoginPassword');
    if (u) u.value = 'admin';
    if (p) p.value = 'admin';
    if (p) p.focus();
}

export async function submitAuthLogin() {
    const username = (document.getElementById('authLoginUsername')?.value || '').trim();
    const password = (document.getElementById('authLoginPassword')?.value || '').trim();
    if (!username || !password) {
        showAlert('Введите логин и пароль', 'warning');
        return;
    }
    try {
        const data = await apiRequest('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
        });
        const token = data?.access_token;
        if (token) localStorage.setItem('ppc_access_token', token);
        closeModal('authLoginModal');
        await loadAuthContext();
        renderIdentityBadges();
        renderAuthControls();
        await runtimeBridge.onAuthSessionChanged();
        showAlert('Вход выполнен', 'success');
    } catch (error) {
        showAlert('Ошибка входа: ' + error.message, 'danger');
    }
}

export async function logoutAuth() {
    try {
        await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch (_error) {
        // Ignore network errors on logout cleanup.
    }
    localStorage.removeItem('ppc_access_token');
    await loadAuthContext();
    renderIdentityBadges();
    renderAuthControls();
    showAlert('Вы вышли из аккаунта', 'info');
    await runtimeBridge.onAuthLogoutNavigate();
}
