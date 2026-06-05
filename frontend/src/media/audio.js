/** In-browser audio recording for materials — epic H4. */
import { showAlert } from '../core/alerts.js';
import { runtimeBridge } from '../core/runtime-bridge.js';

let mediaRecorder = null;
let audioChunks = [];
let recordingTimer = null;
let recordingSeconds = 0;
let recordingStream = null;
const MAX_RECORDING_SECONDS = 15 * 60;

async function startRecording() {
    try {
        recordingStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(recordingStream, { mimeType: 'audio/webm' });
        audioChunks = [];

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) audioChunks.push(e.data);
        };

        mediaRecorder.onstop = () => {
            if (!audioChunks.length) return;
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            const url = URL.createObjectURL(audioBlob);
            const file = new File([audioBlob], 'recording.webm', { type: 'audio/webm' });
            const dt = new DataTransfer();
            dt.items.add(file);
            document.getElementById('audioFileInput').files = dt.files;
            const preview = document.getElementById('audioPreview');
            preview.innerHTML = `<audio controls src="${url}"></audio>`;
            preview.style.display = 'block';
            if (recordingStream) recordingStream.getTracks().forEach(track => track.stop());
            recordingStream = null;
        };

        mediaRecorder.start();
        document.getElementById('btnStartRecord').disabled = true;
        document.getElementById('btnStopSaveRecord').disabled = false;
        document.getElementById('btnCancelRecord').disabled = false;
        document.getElementById('recordingIndicator').style.display = 'flex';
        recordingSeconds = 0;
        updateRecordingTime();
        recordingTimer = setInterval(() => {
            recordingSeconds++;
            updateRecordingTime();
            if (recordingSeconds >= MAX_RECORDING_SECONDS) {
                showAlert('Достигнут лимит записи 15 минут. Запись остановлена.', 'warning');
                stopRecording(true);
            }
        }, 1000);
    } catch (error) {
        showAlert('Ошибка доступа к микрофону: ' + error.message, 'danger');
    }
}

function stopRecording(save = true) {
    if (save && mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
    } else if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        audioChunks = [];
    }
    resetRecordingUi();
}

function cancelRecording() {
    audioChunks = [];
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.onstop = () => {
            if (recordingStream) recordingStream.getTracks().forEach(track => track.stop());
            recordingStream = null;
        };
        mediaRecorder.stop();
    }
    document.getElementById('audioFileInput').value = '';
    const preview = document.getElementById('audioPreview');
    if (preview) { preview.innerHTML = ''; preview.style.display = 'none'; }
    resetRecordingUi();
}

function resetRecordingUi() {
    document.getElementById('btnStartRecord').disabled = false;
    document.getElementById('btnStopSaveRecord').disabled = true;
    document.getElementById('btnCancelRecord').disabled = true;
    document.getElementById('recordingIndicator').style.display = 'none';
    if (recordingTimer) {
        clearInterval(recordingTimer);
        recordingTimer = null;
    }
}

function updateRecordingTime() {
    const mins = Math.floor(recordingSeconds / 60);
    const secs = recordingSeconds % 60;
    document.getElementById('recordingTime').textContent =
        `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function getMediaRecorder() {
    return mediaRecorder;
}

export {
    startRecording,
    stopRecording,
    cancelRecording,
    getMediaRecorder,
};
