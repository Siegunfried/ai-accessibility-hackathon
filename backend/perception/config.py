"""环境配置。优先读取环境变量，未配置则走 mock 降级。

所有能力统一复用阿里云 DashScope 的 API Key（即 QWEN_API_KEY），
通过 OpenAI 兼容接口调用 Qwen 系列模型（视觉 / OCR / 语音 / 音频）。
"""
import os


def _load_env_file(path: str = None) -> None:
    """加载同级 .env 文件到环境变量（不覆盖已存在的变量）。"""
    if path is None:
        path = os.path.join(os.path.dirname(__file__), ".env")
    if not os.path.isfile(path):
        return
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key:
                os.environ.setdefault(key, value)


_load_env_file()

# DashScope / 通义千问 通用 Key（视觉、OCR、语音、音频共用）
QWEN_API_KEY = os.getenv("QWEN_API_KEY", "")

# OpenAI 兼容地址
QWEN_BASE_URL = os.getenv(
    "QWEN_BASE_URL", "https://dashscope.aliyuncs.com/compatible-mode/v1"
)

# 视觉（场景理解）
QWEN_MODEL = os.getenv("QWEN_MODEL", "qwen3-vl-plus")

# OCR（复用视觉模型识读文字，输出更稳定）
OCR_MODEL = os.getenv("OCR_MODEL", "qwen3-vl-plus")

# 语音转写（ASR，复用全模态模型走 chat 通道）
ASR_MODEL = os.getenv("ASR_MODEL", "qwen3.5-omni-flash")

# 环境声音事件识别（音频理解，全模态模型）
AUDIO_MODEL = os.getenv("AUDIO_MODEL", "qwen3.5-omni-flash")