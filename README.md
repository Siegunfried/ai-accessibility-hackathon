# 视碍守护 · 视障人士智能提醒系统

基于 **视觉 + 听觉** 的视障人士智能提醒系统，用摄像头与环境麦克风实时感知周围世界，通过**语音**播报障碍、危险、文字与场景信息，让视障人士「看见」世界、听见安全。

## 痛点

- **出行避障难**：盲道被占、台阶、来车等危险缺乏及时提醒。
- **信息获取难**：无法阅读药品说明书、门牌、票据等文字。
- **环境感知难**：难以判断鸣笛、警报、门铃等关键声音的方向与含义。
- **独立出行难**：问路、乘车、过马路高度依赖他人协助。

## 无障碍亮点

- **分级提醒**：高危（语音+震动）> 提示（语音）> 普通（语音）。
- **多模态融合**：视觉 + 听觉 + 语音意图三者融合决策。
- **离线降级**：未配置模型时自动降级 mock，演示不中断。
- **可访问前端**：高对比度、大字号、屏幕阅读器（`aria-live`）、键盘可操作、减少动态适配。

## 系统架构

```
前端 Demo（展示 + TTS 播报）
      │  POST /api/decide
      ▼
后端 2 决策层（融合 + 规则引擎）
      │  HTTP 调用
      ├──────────────┐
      ▼              ▼
后端 1 感知层 · 视觉(Qwen-VL)   后端 1 感知层 · 听觉/语音(YAMNet/FunASR)
```

## 快速开始

### 一键启动

```bash
# 1. 安装依赖（仅首次）
pip install -r backend/perception/requirements.txt
pip install -r backend/decision/requirements.txt

# 2. 一键启动三个服务
python start_demo.py
```

启动后访问：

- 前端 Demo：<http://localhost:8002/frontend/>
- 决策层 API 文档：<http://localhost:8001/docs>
- 感知层 API 文档：<http://localhost:8000/docs>

### 手动分步启动（可选）

```bash
# 后端 1 感知层（端口 8000）
cd backend/perception && uvicorn app:app --port 8000

# 后端 2 决策层（端口 8001，连接感知层）
cd backend/decision
$env:PERCEPTION_BASE_URL = "http://localhost:8000"
uvicorn app:app --port 8001

# 前端静态服务（项目根目录，端口 8002）
python -m http.server 8002
```

> 配置真实视觉模型：在 `backend/perception` 目录创建 `.env` 并设置 `QWEN_API_KEY`（参考 `.env.example`），即可接入通义千问 VL，实现真实场景理解。未配置时自动使用离线 mock。

## 目录结构

```
├── frontend/            # 前端 Demo（无障碍）
│   ├── index.html
│   ├── style.css
│   ├── app.js
│   └── assets/scenes/   # 场景缩略图
├── backend/
│   ├── perception/      # 后端 1 感知层（视觉/听觉/语音）
│   └── decision/        # 后端 2 决策层（融合 + 规则引擎）
├── docs/                # 产品方案、功能清单、接口契约、团队分工
├── demo/
│   └── videos/          # 6 个演示场景视频（5-10s）
├── start_demo.py        # 一键启动脚本
└── README.md
```

## 演示场景

| 编号 | 场景 | 关键能力 |
|---|---|---|
| 01 | 暴雨天出行避障 | 视觉障碍检测 |
| 02 | 独自乘坐高铁 | 公共场景引导 |
| 03 | 盲道被占用 | 盲道障碍检测 |
| 04 | 读药品文字 | OCR 朗读 |
| 05 | 过马路来车 | 视觉 + 听觉双重告警 |
| 06 | 语音问路 | 语音意图 + 场景描述 |

## 团队

| 成员 | 职责 |
|---|---|
| 成员 A | 前端开发 |
| 成员 B1 | 后端开发（感知层） |
| 成员 B2 | 后端开发（决策层） |
| 成员 C | 产品需求 |
| 成员 D | 路演主讲 |

详细分工见 [docs/团队分工.md](docs/团队分工.md)。