"""环境配置。优先读取环境变量，未配置则走 mock 降级。

所有能力统一复用阿里云 DashScope 的 API Key（即 QWEN_API_KEY），
通过 OpenAI 兼容接口调用 Qwen 系列模型（视觉 / OCR / 语音 / 音频）。
"""
import os

# DashScope / 通义千问 通用 Key（视觉、OCR、语音、音频共用）
QWEN_API_KEY = os.getenv("QWEN_API_KEY", "")

# OpenAI 兼容地址
QWEN_BASE_URL = os.getenv(
    "QWEN_BASE_URL", "https://dashscope.aliyuncs.com/compatible-mode/v1"
)

# 视觉（场景理解）
QWEN_MODEL = os.getenv("QWEN_MODEL", "qwen-vl-max")

# OCR（复用视觉模型识读文字）
OCR_MODEL = os.getenv("OCR_MODEL", QWEN_MODEL)

# 语音转写（ASR）
ASR_MODEL = os.getenv("ASR_MODEL", "qwen-audio-asr-latest")

# 环境声音事件识别（音频理解）
AUDIO_MODEL = os.getenv("AUDIO_MODEL", "qwen2-audio-instruct")