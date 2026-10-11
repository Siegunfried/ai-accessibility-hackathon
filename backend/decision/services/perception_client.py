"""感知层（后端 1）客户端：调用其后端 REST；未配置或失败时降级为 mock。"""
from __future__ import annotations

from config import PERCEPTION_BASE_URL
from schemas import (
    AudioEventsResult,
    Hazard,
    SceneResult,
    SoundEvent,
    TranscribeResult,
)


def _mock_scene() -> SceneResult:
    return SceneResult(
        description="（决策层 mock）未连接感知层，返回模拟场景。",
        objects=["示例物体"],
        hazards=[Hazard(label="示例障碍", distance="2m", direction="正前方")],
        danger="normal",
        mock=True,
    )


def _mock_events() -> AudioEventsResult:
    return AudioEventsResult(events=[], mock=True)


def _mock_transcribe() -> TranscribeResult:
    return TranscribeResult(text="", intent=None, mock=True)


def _post_file(path: str, field: str, data: bytes, content_type: str) -> dict:
    import httpx

    r = httpx.post(
        PERCEPTION_BASE_URL + path,
        files={field: ("blob", data, content_type)},
        timeout=10.0,
    )
    r.raise_for_status()
    return r.json()


class PerceptionClient:
    """封装对后端 1 的调用，对外只暴露结构化感知结果。"""

    def perceive(self, image_bytes: bytes, audio_bytes: bytes | None):
        scene = self._vision(image_bytes)
        events = self._events(audio_bytes) if audio_bytes else _mock_events()
        intent = self._transcribe(audio_bytes).intent if audio_bytes else None
        return scene, events, intent

    def _vision(self, data: bytes) -> SceneResult:
        if not PERCEPTION_BASE_URL:
            return _mock_scene()
        try:
            return SceneResult(
                **_post_file("/api/vision/analyze", "image", data, "image/jpeg")
            )
        except Exception:
            return _mock_scene()

    def _events(self, data: bytes) -> AudioEventsResult:
        if not PERCEPTION_BASE_URL:
            return _mock_events()
        try:
            return AudioEventsResult(
                **_post_file("/api/audio/events", "audio", data, "audio/wav")
            )
        except Exception:
            return _mock_events()

    def _transcribe(self, data: bytes) -> TranscribeResult:
        if not PERCEPTION_BASE_URL:
            return _mock_transcribe()
        try:
            return TranscribeResult(
                **_post_file("/api/audio/transcribe", "audio", data, "audio/wav")
            )
        except Exception:
            return _mock_transcribe()