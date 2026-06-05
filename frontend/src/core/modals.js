import { showAlert } from './alerts.js';
import { runtimeBridge } from './runtime-bridge.js';

const modalEscapeCleanups = new Map();

export function bindModalEscape(modal, onEscape) {
    const handler = (event) => {
        if (event.key === 'Escape') onEscape();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
}

export function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) {
        console.warn(`Modal not found: ${modalId}`);
        return null;
    }
    if (modalId === 'documentModal') {
        runtimeBridge.applyDocumentModalGuidance(runtimeBridge.getDocumentIssueContext());
    }
    modalEscapeCleanups.get(modalId)?.();
    modalEscapeCleanups.set(modalId, bindModalEscape(modal, () => closeModal(modalId)));
    modal.classList.add('active');
    modal.setAttribute('aria-modal', 'true');
    const focusTarget = modal.querySelector('input, textarea, select, button:not(.modal-close)');
    if (focusTarget) setTimeout(() => focusTarget.focus(), 0);
    return modal;
}

export function closeModal(modalId) {
    const mediaRecorder = runtimeBridge.getMediaRecorder();
    if (modalId === 'audioModal' && mediaRecorder && mediaRecorder.state === 'recording') {
        showAlert('Сначала остановите или отмените запись.', 'warning');
        return null;
    }
    const modal = document.getElementById(modalId);
    if (!modal) {
        console.warn(`Modal not found: ${modalId}`);
        return null;
    }
    modalEscapeCleanups.get(modalId)?.();
    modalEscapeCleanups.delete(modalId);
    modal.classList.remove('active');
    modal.removeAttribute('aria-modal');
    if (['textNoteModal', 'audioModal', 'screenshotModal', 'metricsModal'].includes(modalId)) {
        runtimeBridge.clearEditingMaterialId();
    }
    if (modalId === 'documentModal') {
        runtimeBridge.setDocumentIssueContext(null);
    }
    return modal;
}

export async function showConfirmDialog({
    title = 'Подтвердите действие',
    message = 'Вы уверены?',
    confirmText = 'Подтвердить',
    cancelText = 'Отмена',
    confirmType = 'danger',
} = {}) {
    const modal = document.getElementById('uxConfirmModal');
    const titleEl = document.getElementById('uxConfirmTitle');
    const messageEl = document.getElementById('uxConfirmMessage');
    const okBtn = document.getElementById('uxConfirmOkBtn');
    const cancelBtn = document.getElementById('uxConfirmCancelBtn');
    const closeBtn = document.getElementById('uxConfirmCloseBtn');
    if (!modal || !titleEl || !messageEl || !okBtn || !cancelBtn || !closeBtn) {
        return false;
    }
    titleEl.textContent = title;
    messageEl.textContent = message;
    okBtn.textContent = confirmText;
    cancelBtn.textContent = cancelText;
    okBtn.classList.remove('btn-primary', 'btn-danger', 'btn-success', 'btn-outline');
    okBtn.classList.add(confirmType === 'primary' ? 'btn-primary' : (confirmType === 'success' ? 'btn-success' : 'btn-danger'));

    return await new Promise((resolve) => {
        const onOk = () => finish(true);
        const onCancel = () => finish(false);
        const onClose = () => finish(false);
        const onOverlay = (event) => {
            if (event.target === modal) finish(false);
        };
        const onEscape = (event) => {
            if (event.key === 'Escape') finish(false);
        };
        const finish = (result) => {
            okBtn.removeEventListener('click', onOk);
            cancelBtn.removeEventListener('click', onCancel);
            closeBtn.removeEventListener('click', onClose);
            modal.removeEventListener('click', onOverlay);
            document.removeEventListener('keydown', onEscape);
            closeModal('uxConfirmModal');
            resolve(result);
        };

        okBtn.addEventListener('click', onOk);
        cancelBtn.addEventListener('click', onCancel);
        closeBtn.addEventListener('click', onClose);
        modal.addEventListener('click', onOverlay);
        document.addEventListener('keydown', onEscape);
        openModal('uxConfirmModal');
        setTimeout(() => okBtn.focus(), 0);
    });
}

export async function showPromptDialog({
    title = 'Введите комментарий',
    message = '',
    placeholder = 'Введите текст...',
    initialValue = '',
    confirmText = 'Сохранить',
    cancelText = 'Отмена',
    required = false,
} = {}) {
    const modal = document.getElementById('uxPromptModal');
    const titleEl = document.getElementById('uxPromptTitle');
    const messageEl = document.getElementById('uxPromptMessage');
    const inputEl = document.getElementById('uxPromptInput');
    const okBtn = document.getElementById('uxPromptOkBtn');
    const cancelBtn = document.getElementById('uxPromptCancelBtn');
    const closeBtn = document.getElementById('uxPromptCloseBtn');
    if (!modal || !titleEl || !messageEl || !inputEl || !okBtn || !cancelBtn || !closeBtn) {
        return false;
    }

    titleEl.textContent = title;
    messageEl.textContent = message;
    messageEl.style.display = message ? 'block' : 'none';
    messageEl.style.whiteSpace = message && String(message).includes('\n') ? 'pre-line' : '';
    inputEl.placeholder = placeholder;
    inputEl.value = initialValue || '';
    okBtn.textContent = confirmText;
    cancelBtn.textContent = cancelText;

    return await new Promise((resolve) => {
        let settled = false;
        const onOk = () => {
            const value = (inputEl.value || '').trim();
            if (required && !value) {
                showAlert('Поле не может быть пустым', 'warning');
                inputEl.focus();
                return;
            }
            finish(value);
        };
        const onCancel = (event) => {
            event?.preventDefault?.();
            event?.stopPropagation?.();
            finish(false);
        };
        const onClose = (event) => {
            event?.preventDefault?.();
            event?.stopPropagation?.();
            finish(false);
        };
        const onOverlay = (event) => {
            if (event.target === modal) finish(false);
        };
        const onEscape = (event) => {
            if (event.key === 'Escape') finish(false);
        };
        const onEnter = (event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                event.preventDefault();
                onOk();
            }
        };
        const finish = (result) => {
            if (settled) return;
            settled = true;
            okBtn.removeEventListener('click', onOk);
            cancelBtn.removeEventListener('click', onCancel);
            closeBtn.removeEventListener('click', onClose);
            modal.removeEventListener('click', onOverlay);
            document.removeEventListener('keydown', onEscape);
            inputEl.removeEventListener('keydown', onEnter);
            closeModal('uxPromptModal');
            resolve(result);
        };

        okBtn.addEventListener('click', onOk);
        cancelBtn.addEventListener('click', onCancel);
        closeBtn.addEventListener('click', onClose);
        modal.addEventListener('click', onOverlay);
        document.addEventListener('keydown', onEscape);
        inputEl.addEventListener('keydown', onEnter);
        openModal('uxPromptModal');
        setTimeout(() => inputEl.focus(), 0);
    });
}

export function initModalOverlayClose() {
    document.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal-overlay') && event.target.id) {
            closeModal(event.target.id);
        }
    });
}
