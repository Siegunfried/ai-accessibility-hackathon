"""融合决策：视觉 + 听觉 + 意图 → 提醒指令。规则引擎，MVP 先用阈值/关键词。"""
from __future__ import annotations

from schemas import AudioEventsResult, Reminder, SceneResult

_DANGER_SOUNDS = {"鸣笛", "警报", "警笛", "喇叭", "来车", "火警", "门铃", "碰撞"}


def _hazard_warning(scene: SceneResult) -> str:
    parts = []
    for h in scene.hazards:
        seg = (h.direction or "") + (h.distance or "") + f"有{h.label}"
        parts.append(seg)
    return "，".join(parts)


def decide(
    scene: SceneResult, events: AudioEventsResult, intent: str | None
) -> Reminder:
    mock = scene.mock or events.mock

    # 1) 视觉高危或有障碍 → 最高优先级语音避障提醒
    if scene.danger == "high" or scene.hazards:
        speak = _hazard_warning(scene) or scene.description or "前方有障碍，请注意"
        return Reminder(speak=speak, priority="high", mode="voice", reason="视觉障碍/危险", mock=mock)

    # 2) 危险声音事件 → 高优先级，语音+震动
    danger_events = [e for e in events.events if any(k in e.label for k in _DANGER_SOUNDS)]
    if danger_events:
        speak = "，".join(f"注意{e.label}" for e in danger_events)
        return Reminder(speak=speak, priority="high", mode="both", reason="危险声音事件", mock=mock)

    # 3) 用户主动询问场景 → 普通优先级语音描述
    if intent == "ask_scene":
        return Reminder(
            speak=scene.description or "未识别到有效场景",
            priority="normal",
            mode="voice",
            reason="用户询问场景",
            mock=mock,
        )

    # 4) 默认 → 低优先级环境描述
    return Reminder(
        speak=scene.description or "环境安全",
        priority="low",
        mode="voice",
        reason="普通环境描述",
        mock=mock,
    )