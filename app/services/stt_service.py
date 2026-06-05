"""Optional server-side speech-to-text.

Default MVP mode is manual transcript. Local Whisper is optional and does not add a
hard dependency: install faster-whisper or openai-whisper only when STT_PROVIDER=local_whisper.
"""
from __future__ import annotations

from pathlib import Path
from typing import Dict

from app.config import settings


class STTUnavailable(RuntimeError):
    pass


def transcribe_audio_file(path: Path) -> Dict[str, object]:
    provider = (settings.STT_PROVIDER or "manual").lower()
    if provider != "local_whisper":
        raise STTUnavailable("Серверное распознавание выключено. Используйте ручную расшифровку или включите STT_PROVIDER=local_whisper.")
    if not path.exists():
        raise STTUnavailable("Аудиофайл не найден для распознавания.")

    model_name = getattr(settings, "LOCAL_WHISPER_MODEL", "small")

    try:
        from faster_whisper import WhisperModel  # type: ignore

        model = WhisperModel(model_name, device=getattr(settings, "LOCAL_WHISPER_DEVICE", "cpu"), compute_type="int8")
        segments, info = model.transcribe(str(path), language="ru", vad_filter=True)
        text = " ".join(segment.text.strip() for segment in segments if segment.text).strip()
        confidence = 0.78 if text else 0.0
        return {"text": text, "confidence": confidence, "source": "server_stt", "engine": "faster-whisper"}
    except ImportError:
        pass

    try:
        import whisper  # type: ignore

        model = whisper.load_model(model_name)
        result = model.transcribe(str(path), language="ru")
        text = str(result.get("text") or "").strip()
        confidence = 0.75 if text else 0.0
        return {"text": text, "confidence": confidence, "source": "server_stt", "engine": "openai-whisper"}
    except ImportError as exc:
        raise STTUnavailable("Локальный Whisper не установлен. Установите faster-whisper или openai-whisper.") from exc
