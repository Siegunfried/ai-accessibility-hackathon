"""OCR 文字识别：复用 Qwen-VL 视觉模型识读图中文字。"""
from __future__ import annotations

import base64

from config import OCR_MODEL, QWEN_API_KEY, QWEN_BASE_URL
from schemas import OCRResult

_PROMPT = (
    "请识别并输出这张图片中所有可见的文字内容，按从上到下、从左到右的顺序逐行输出。"
    "只输出文字本身，不要添加任何解释、标点以外的内容。若图片中没有文字，输出空字符串。"
)


def read_text(image_bytes: bytes) -> OCRResult:
    """OCR 入口：真实调 Qwen-VL；无 key 或失败时降级 mock。"""
    if not QWEN_API_KEY:
        return OCRResult(text="", mock=True)
    try:
        return OCRResult(text=_call_ocr(image_bytes), mock=False)
    except Exception:
        return OCRResult(text="", mock=True)


def _call_ocr(image_bytes: bytes) -> str:
    from openai import OpenAI

    client = OpenAI(api_key=QWEN_API_KEY, base_url=QWEN_BASE_URL)
    data_url = "data:image/jpeg;base64," + base64.b64encode(image_bytes).decode()
    resp = client.chat.completions.create(
        model=OCR_MODEL,
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": _PROMPT},
                    {"type": "image_url", "image_url": {"url": data_url}},
                ],
            }
        ],
        temperature=0.1,
    )
    return (resp.choices[0].message.content or "").strip()