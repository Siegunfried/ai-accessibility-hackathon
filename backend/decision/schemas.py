"""后端 2（决策/编排层）数据结构 —— 含与感知层（后端 1）对齐的契约。"""
from __future__ import annotations

from pydantic import BaseModel, Field


class Hazard(BaseModel):
    label: str = Field(..., description="障碍/危险名称")
    distance: str | None = Field(None, description="距离，如 1.5m")
    direction: str | None = Field(None, description="方位，如 左前方")


class SceneResult(BaseModel):
    """感知层输出的视觉结果（契约）。"""
    description: str = ""
    objects: list[str] = Field(default_factory=list)
    hazards: list[Hazard] = Field(default_factory=list)
    danger: str = "low"
    mock: bool = False


class SoundEvent(BaseModel):
    label: str
    conf: float = 0.0


class AudioEventsResult(BaseModel):
    """感知层输出的听觉事件结果（契约）。"""
    events: list[SoundEvent] = Field(default_factory=list)
    mock: bool = False


class TranscribeResult(BaseModel):
    """感知层输出的语音指令转写结果（契约）。"""
    text: str = ""
    intent: str | None = None
    mock: bool = False


class Reminder(BaseModel):
    """决策层最终输出 —— 给前端播报的提醒指令。"""
    speak: str = Field(..., description="最终播报文本")
    priority: str = Field("normal", description="high/normal/low")
    mode: str = Field("voice", description="voice/vibrate/both")
    reason: str = Field("", description="提醒原因（供调试/日志）")
    mock: bool = Field(False, description="是否含占位数据")