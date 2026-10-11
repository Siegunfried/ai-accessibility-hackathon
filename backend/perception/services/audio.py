"""听觉感知：语音指令转写（ASR）+ 环境声音事件识别，均走 DashScope 云 API。

统一复用 OpenAI 兼容接口调 Qwen 系列模型；未配置 Key 或调用失败时降级为 mock。
"""
from __future__ import annotations

import base64
import json

from config import ASR_MODEL, AUDIO_MODEL, QWEN_API_KEY, QWEN_BASE_URL
from schemas import AudioEventsResult, SoundEvent, TranscribeResult

# 意图关键词（简单规则映射，后续可改为模型分类）
_ASK_KEYWORDS = ["哪里", "在哪", "前面", "附近", "怎么走", "路线", "问路", "这是什么", "有什么"]
_READ_KEYWORDS = ["读", "念", "文字", "说明书", "标签", "上面写", "什么字", "药品", "内容"]

_EVENT_PROMPT = (
    "请识别这段音频里的环境声音事件（如：汽车鸣笛、警报、雨声、人声、广播、风声、碰撞等）。"
    "只输出一个 JSON 数组，每个元素为 {\"label\": \"事件名称\", \"conf\": 0到1的置信度}。"
    "如果听不到明显声音，输出空数组 []。不要输出任何多余文字。"
)


def _client():
    from openai import OpenAI

    return OpenAI(api_key=QWEN_API_KEY, base_url=QWEN_BASE_URL)


# ===== 语音指令转写 =====
def transcribe(audio_bytes: bytes) -> TranscribeResult:
    """语音转写 + 意图识别。"""
    if not QWEN_API_KEY:
        return TranscribeResult(text="", intent=None, mock=True)
    try:
        text = _call_asr(audio_bytes)
        return TranscribeResult(text=text, intent=_detect_intent(text), mock=False)
    except Exception:
        return TranscribeResult(text="", intent=None, mock=True)


def _call_asr(audio_bytes: bytes) -> str:
    resp = _client().audio.transcriptions.create(
        model=ASR_MODEL,
        file=("speech.wav", audio_bytes),
        language="zh",
    )
    return (resp.text or "").strip()


def _detect_intent(text: str) -> str | None:
    if any(k in text for k in _ASK_KEYWORDS):
        return "ask_scene"
    if any(k in text for k in _READ_KEYWORDS):
        return "read_text"
    return None


# ===== 环境声音事件识别 =====
def classify_events(audio_bytes: bytes) -> AudioEventsResult:
    """环境声音事件识别。"""
    if not QWEN_API_KEY:
        return AudioEventsResult(events=[], mock=True)
    try:
        return AudioEventsResult(events=_call_audio_events(audio_bytes), mock=False)
    except Exception:
        return AudioEventsResult(
            events=[SoundEvent(label="声音事件识别降级", conf=0.0)], mock=True
        )


def _call_audio_events(audio_bytes: bytes) -> list[SoundEvent]:
    data_url = "data:audio/wav;base64," + base64.b64encode(audio_bytes).decode()
    resp = _client().chat.completions.create(
        model=AUDIO_MODEL,
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": _EVENT_PROMPT},
                    {"type": "input_audio", "input_audio": {"data": data_url, "format": "wav"}},
                ],
            }
        ],
        temperature=0.1,
    )
    return _parse_events(resp.choices[0].message.content or "")


def _parse_events(content: str) -> list[SoundEvent]:
    text = content.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        return []
    events = []
    for item in data if isinstance(data, list) else []:
        if isinstance(item, dict) and item.get("label"):
            conf = item.get("conf", 0.0)
            events.append(SoundEvent(label=str(item["label"]), conf=float(conf)))
    return events