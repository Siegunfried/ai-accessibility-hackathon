"""环境配置。"""
import os

# 感知层（后端 1）地址；留空表示不连接后端 1，直接走本地 mock。
PERCEPTION_BASE_URL = os.getenv("PERCEPTION_BASE_URL", "")