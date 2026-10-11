# 接口契约（前后端对齐）

本文件定义「视碍守护」系统对外暴露的所有 HTTP 接口，供前端、后端 1（感知层）与后端 2（决策层）对齐。默认均为 JSON，文件上传使用 `multipart/form-data`。

## 服务与端口

| 服务 | 目录 | 默认端口 | 说明 |
|---|---|---|---|
| 后端 1 感知层 | `backend/perception` | `8000` | 视觉/听觉/语音识别 |
| 后端 2 决策层 | `backend/decision` | `8001` | 融合感知结果，输出提醒指令 |
| 前端 Demo | `frontend` | `8002` | 静态页面，调用决策层 |

## 一、感知层（后端 1，端口 8000）

### 1. 健康检查
- **请求方法**：`GET`
- **路径**：`/health`
- **返回示例**：
```json
{ "status": "ok" }
```

### 2. 视觉场景分析
- **请求方法**：`POST`
- **路径**：`/api/vision/analyze`
- **请求参数**（`multipart/form-data`）：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `image` | file | 是 | 图片文件（jpg/png/webp） |

- **返回示例**：
```json
{
  "description": "前方约三米有共享单车挡住盲道，路面有积水。",
  "objects": ["共享单车", "积水", "盲道"],
  "hazards": [
    { "label": "共享单车", "distance": "约3米", "direction": "右前方" }
  ],
  "danger": "high",
  "mock": false
}
```

字段说明：
- `objects`：识别到的物体列表
- `hazards`：危险/障碍项（`label` 名称、`distance` 距离、`direction` 方位）
- `danger`：危险等级 `low | normal | high | unknown`
- `mock`：为 `true` 表示未配置模型、走了占位/降级结果

### 3. 语音指令转写
- **请求方法**：`POST`
- **路径**：`/api/audio/transcribe`
- **请求参数**：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `audio` | file | 是 | 音频文件（wav/mp3） |

- **返回示例**：
```json
{ "text": "现在前面有什么", "intent": "ask_scene", "mock": false }
```

`intent` 取值：`ask_scene`（询问场景）、`read_text`（朗读文字）等。

### 4. 环境声音事件识别
- **请求方法**：`POST`
- **路径**：`/api/audio/events`
- **请求参数**：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `audio` | file | 是 | 音频文件（wav/mp3） |

- **返回示例**：
```json
{
  "events": [
    { "label": "汽车鸣笛", "conf": 0.95 },
    { "label": "引擎声", "conf": 0.85 }
  ],
  "mock": false
}
```

## 二、决策层（后端 2，端口 8001）

### 1. 健康检查
- **请求方法**：`GET`
- **路径**：`/health`
- **返回示例**：
```json
{ "status": "ok" }
```

### 2. 融合决策（核心接口）
- **请求方法**：`POST`
- **路径**：`/api/decide`
- **请求参数**（`multipart/form-data`）：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `image` | file | 是 | 场景图片 |
| `audio` | file | 否 | 环境/语音音频，可选 |

- **返回示例**：
```json
{
  "speak": "右侧有来车，请立即止步等待。",
  "priority": "high",
  "mode": "both",
  "reason": "视觉车辆 + 听觉鸣笛双重高危",
  "mock": false
}
```

字段说明：
- `speak`：最终给用户播报的文本（这是前端 TTS 的输入）
- `priority`：优先级 `high | normal | low`
- `mode`：提醒方式 `voice`（语音）`vibrate`（震动）`both`（语音+震动）
- `reason`：提醒依据（调试/日志用）
- `mock`：感知层降级时整体标为 `true`

## 三、决策规则（优先级从高到低）

1. 视觉高危或有障碍 → `high`，语音避障提醒
2. 危险声音事件（鸣笛/警报/来车等）→ `high`，语音+震动
3. 用户主动询问场景（`intent == ask_scene`）→ `normal`，语音描述
4. 默认 → `low`，环境描述

## 四、环境变量

| 变量 | 服务 | 说明 |
|---|---|---|
| `QWEN_API_KEY` | 感知层 | 通义千问 VL 密钥，不填则视觉降级 mock |
| `QWEN_BASE_URL` | 感知层 | 默认 `https://dashscope.aliyuncs.com/compatible-mode/v1` |
| `QWEN_MODEL` | 感知层 | 默认 `qwen-vl-max` |
| `PERCEPTION_BASE_URL` | 决策层 | 感知层地址，如 `http://localhost:8000`，留空则决策层本地 mock |