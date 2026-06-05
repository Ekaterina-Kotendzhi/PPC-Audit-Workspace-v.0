/** Browser Web Speech API STT — epic H4. */
import { showAlert } from '../core/alerts.js';
import { showConfirmDialog } from '../core/modals.js';

let speechRecognition = null;
let isSpeechListening = false;

async function toggleBrowserSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const consentBox = document.getElementById('webSpeechConsent');
    if (consentBox && !consentBox.checked) {
        const allowed = await showConfirmDialog({
            title: 'Включить облачное распознавание',
            message: 'Web Speech API работает в Chrome/Edge и может отправлять аудио на серверы Google. Используйте только при согласии клиента.',
            confirmText: 'Включить',
            confirmType: 'primary',
        });
        if (!allowed) return;
        consentBox.checked = true;
    }
    if (!SpeechRecognition) {
        showAlert('Ваш браузер не поддерживает Web Speech API. Используйте запись аудио и ручную расшифровку.', 'warning');
        return;
    }

    if (speechRecognition && isSpeechListening) {
        speechRecognition.stop();
        return;
    }

    speechRecognition = new SpeechRecognition();
    speechRecognition.lang = 'ru-RU';
    speechRecognition.interimResults = true;
    speechRecognition.continuous = true;

    const btn = document.getElementById('btnSpeechToText');
    const textarea = document.getElementById('audioTranscript');
    let finalTranscript = textarea.value ? textarea.value.trim() + '\n' : '';

    speechRecognition.onstart = () => {
        isSpeechListening = true;
        if (btn) btn.textContent = '⏹️ Остановить распознавание';
        const sourceSelect = document.getElementById('audioTranscriptSource');
        if (sourceSelect) sourceSelect.value = 'web_speech';
        showAlert('Распознавание началось. Говорите в микрофон.', 'info');
    };

    speechRecognition.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript.trim() + ' ';
            } else {
                interim += transcript;
            }
        }
        textarea.value = (finalTranscript + interim).trim();
    };

    speechRecognition.onerror = (event) => {
        showAlert('Ошибка распознавания речи: ' + event.error, 'warning');
    };

    speechRecognition.onend = () => {
        isSpeechListening = false;
        if (btn) btn.textContent = '🗣️ Распознать речь в текст';
    };

    speechRecognition.start();
}

export { toggleBrowserSpeechRecognition };
