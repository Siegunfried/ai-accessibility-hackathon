"""视觉感知：真实接入 Qwen-VL（OpenAI 兼容）做场景描述；OCR / 深度后续补充。"""
from __future__ import annotations

import base64
import json

from config import QWEN_API_KEY, QWEN_BASE_URL, QWEN_MODEL
from schemas import Hazard, SceneResult

_PROMPT = (
    "你是一位帮助视障人士的视觉助手。请用简短、口语化的中文描述这张图片里的场景，"
    "重点说明：1) 有哪些物体；2) 有没有潜在危险或障碍（如台阶、柱子、车辆、悬空物），"
    "以及它们的大致距离和方位。只输出一个 JSON 对象，格式严格如下，不要输出多余文字：\n"
    '{"objects": ["..."], "hazards": [{"label": "...", "distance": "...", '
    '"direction": "..."}], "danger": "low|normal|high", "description": "..."}'
)


def _mock_scene() -> SceneResult:
    return SceneResult(
        description="（视觉模型占位）当前为模拟结果，未配置 QWEN_API_KEY。",
        objects=["示例物体"],
        hazards=[Hazard(label="示例障碍", distance="2m", direction="正前方")],
        danger="normal",
        mock=True,
    )


def _call_qwen(image_bytes: bytes) -> SceneResult:
    from openai import OpenAI

    client = OpenAI(api_key=QWEN_API_KEY, base_url=QWEN_BASE_URL)
    data_url = "data:image/jpeg;base64," + base64.b64encode(image_bytes).decode()
    resp = client.chat.completions.create(
        model=QWEN_MODEL,
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": _PROMPT},
                    {"type": "image_url", "image_url": {"url": data_url}},
                ],
            }
        ],
        temperature=0.2,
    )
    return _parse_scene(resp.choices[0].message.content or "")


def _parse_scene(content: str) -> SceneResult:
    text = content.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        # 模型没按 JSON 返回，退化为纯文本描述
        return SceneResult(description=content, danger="unknown", mock=False)

    hazards = []
    for h in data.get("hazards", []):
        if isinstance(h, dict):
            hazards.append(
                Hazard(
                    label=h.get("label", ""),
                    distance=h.get("distance"),
                    direction=h.get("direction"),
                )
            )
    return SceneResult(
        description=data.get("description", ""),
        objects=[str(o) for o in data.get("objects", [])],
        hazards=hazards,
        danger=data.get("danger", "low"),
        mock=False,
    )


def analyze_image(image_bytes: bytes) -> SceneResult:
    """视觉分析入口：真实 Qwen-VL；无 key 或调用失败时降级为 mock。"""
    if QWEN_API_KEY:
        try:
            return _call_qwen(image_bytes)
        except Exception:
            return _mock_scene()
    return _mock_scene()