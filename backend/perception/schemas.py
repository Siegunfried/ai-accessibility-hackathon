"""后端 1（感知层）统一数据结构 —— 这是与后端 2、前端的接口契约。"""
from __future__ import annotations

from pydantic import BaseModel, Field


class Hazard(BaseModel):
    """一个危险/障碍项。"""
    label: str = Field(..., description="障碍/危险名称，如 柱子、台阶")
    distance: str | None = Field(None, description="距离，如 1.5m")
    direction: str | None = Field(None, description="方位，如 左前方")


class SceneResult(BaseModel):
    """视觉感知统一输出。"""
    description: str = Field("", description="给用户听的场景描述")
    objects: list[str] = Field(default_factory=list, description="识别到的物体列表")
    hazards: list[Hazard] = Field(default_factory=list, description="危险/障碍项")
    danger: str = Field("low", description="危险等级 low/normal/high/unknown")
    mock: bool = Field(False, description="是否为占位假数据")


class SoundEvent(BaseModel):
    """一个声音事件。"""
    label: str = Field(..., description="声音事件名称")
    conf: float = Field(0.0, description="置信度 0~1")


class AudioEventsResult(BaseModel):
    """听觉事件统一输出。"""
    events: list[SoundEvent] = Field(default_factory=list)
    mock: bool = Field(False)


class TranscribeResult(BaseModel):
    """语音指令转写结果。"""
    text: str = Field("", description="转写文本")
    intent: str | None = Field(None, description="意图，如 ask_scene / read_text")
    mock: bool = Field(False)


class OCRResult(BaseModel):
    """OCR 文字识别结果。"""
    text: str = Field("", description="识别到的文字内容")
    mock: bool = Field(False)