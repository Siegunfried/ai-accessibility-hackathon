/* 视碍守护 —— 前端演示逻辑
 * 数据流：场景(图片/视频 + 音频) → 感知层(视觉/听觉) → 决策层(融合) → 提醒(TTS播报)
 * 脚本演示模式：内置 6 个典型场景的预置感知结果，保证离线也可完整演示。
 * 实时模式：真实调用后端 2 决策层 /api/decide（可选后端 1 感知层）。
 */

const DECISION_URL = "http://localhost:8001";   // 后端 2 决策层
const PERCEPTION_URL = "http://localhost:8000"; // 后端 1 感知层

// ===== 六个演示场景（与 demo/videos 一一对应）=====
const SCENES = [
  {
    id: "01",
    name: "出行避障",
    short: "暴雨天独行，前方积水与障碍",
    thumb: "assets/scenes/01.jpg",
    video: "../demo/videos/01_出行避障/01_盲人暴雨走路.mp4",
    scene: {
      description: "你正撑着长柄伞在雨中独行，前方人行道上有大片积水，右侧盲道旁停着一辆共享单车。",
      objects: ["长柄伞", "积水", "共享单车", "盲道"],
      hazards: [{ label: "共享单车", distance: "约3米", direction: "右前方" }],
      danger: "high",
    },
    events: [{ label: "雨声", conf: 0.91 }, { label: "汽车驶过", conf: 0.62 }],
    reminder: {
      speak: "右前方约三米有共享单车挡住盲道，路面有积水，请靠左放慢绕行。",
      priority: "high",
      mode: "voice",
      reason: "视觉检测到障碍物与湿滑路面",
    },
  },
  {
    id: "02",
    name: "公共交通出行",
    short: "独自乘坐高铁进站",
    thumb: "assets/scenes/02.jpg",
    video: "../demo/videos/02_公共交通出行/02_盲人独自坐高铁.mp4",
    scene: {
      description: "你已进入高铁站候车大厅，正前方是安检与检票通道，周围有较多旅客与行李箱。",
      objects: ["安检机", "检票闸机", "行李箱", "旅客"],
      hazards: [{ label: "行李箱", distance: "约2米", direction: "正前方" }],
      danger: "normal",
    },
    events: [{ label: "广播提示音", conf: 0.88 }, { label: "人流嘈杂", conf: 0.7 }],
    reminder: {
      speak: "已到达进站口，检票通道在正前方约五米，请注意前方行李箱，请出示证件。",
      priority: "normal",
      mode: "voice",
      reason: "场景识别为公共交通进站引导",
    },
  },
  {
    id: "03",
    name: "盲道障碍",
    short: "盲道被共享单车占用",
    thumb: "assets/scenes/03.jpg",
    video: "../demo/videos/03_盲道障碍/03_盲道被堵.mp4",
    scene: {
      description: "你正沿盲道行走，正前方盲道上横着一辆共享单车，旁边还有一个锥形路障。",
      objects: ["共享单车", "锥形路障", "盲道"],
      hazards: [
        { label: "共享单车", distance: "约2米", direction: "正前方" },
        { label: "锥形路障", distance: "约3米", direction: "左前方" },
      ],
      danger: "high",
    },
    events: [{ label: "风吹声", conf: 0.55 }],
    reminder: {
      speak: "正前方盲道被共享单车占用，左前方还有路障，请绕行至右侧人行道。",
      priority: "high",
      mode: "both",
      reason: "盲道障碍物占用，需绕行",
    },
  },
  {
    id: "04",
    name: "读药品文字",
    short: "识别并朗读药品说明",
    thumb: "assets/scenes/04.jpg",
    video: "../demo/videos/04_读药品文字/04_读药品.mp4",
    scene: {
      description: "手中是一瓶关节保健药品，瓶身标签文字清晰可见。",
      objects: ["药瓶", "标签", "文字"],
      hazards: [],
      danger: "low",
    },
    events: [],
    intent: "read_text",
    reminder: {
      speak: "已读取药品文字：Move Free，关节健康，每日三片，36 片装。",
      priority: "normal",
      mode: "voice",
      reason: "OCR 读取药品文字",
    },
  },
  {
    id: "05",
    name: "过马路来车",
    short: "过马路时右侧有来车",
    thumb: "assets/scenes/05.jpg",
    video: "../demo/videos/05_过马路来车/05_过马路.mp4",
    scene: {
      description: "你正站在斑马线前准备过马路，右侧有车辆驶来，信号灯显示红灯。",
      objects: ["斑马线", "车辆", "红绿灯"],
      hazards: [{ label: "来车", distance: "约8米", direction: "右侧" }],
      danger: "high",
    },
    events: [{ label: "汽车鸣笛", conf: 0.95 }, { label: "引擎声", conf: 0.85 }],
    reminder: {
      speak: "右侧有来车，请立即止步等待，车辆通过、绿灯后再过马路。",
      priority: "high",
      mode: "both",
      reason: "视觉车辆 + 听觉鸣笛双重高危",
    },
  },
  {
    id: "06",
    name: "语音问路",
    short: "语音询问当前位置与路线",
    thumb: "assets/scenes/06.jpg",
    video: "../demo/videos/06_语音问路/06_语音问路.mp4",
    scene: {
      description: "你正站在一条商业街路口，正前方约五十米是地铁站入口。",
      objects: ["商业街", "路口", "地铁站入口"],
      hazards: [],
      danger: "low",
    },
    events: [{ label: "环境人声", conf: 0.6 }],
    intent: "ask_scene",
    reminder: {
      speak: "您正位于商业街路口，前方约五十米是地铁三号线入口，请沿盲道直行。",
      priority: "normal",
      mode: "voice",
      reason: "用户主动询问场景",
    },
  },
];

const PRIORITY_TEXT = { high: "高危", normal: "提示", low: "普通" };
const MODE_TEXT = { voice: "语音", vibrate: "震动", both: "语音+震动" };

// ===== DOM 引用 =====
const $ = (sel) => document.querySelector(sel);
const sceneGrid = $("#sceneGrid");
const previewImg = $("#previewImg");
const previewVideo = $("#previewVideo");
const previewCaption = $("#previewCaption");
const sceneDesc = $("#sceneDesc");
const hazardList = $("#hazardList");
const soundList = $("#soundList");
const reminderBox = $("#reminderBox");
const priorityBadge = $("#priorityBadge");
const reminderText = $("#reminderText");
const reasonText = $("#reasonText");
const modeText = $("#modeText");
const mockBadge = $("#mockBadge");

let ttsEnabled = true;

// ===== TTS 语音播报 =====
function speak(text) {
  if (!ttsEnabled || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "zh-CN";
  u.rate = 1.0;
  window.speechSynthesis.speak(u);
}

// ===== 标签渲染 =====
function renderTags(container, items, cls) {
  container.innerHTML = "";
  for (const item of items || []) {
    const li = document.createElement("li");
    li.className = "tag " + cls;
    const conf = item.conf ? `（${Math.round(item.conf * 100)}%）` : "";
    const dist = item.distance || item.direction ? ` ${item.direction || ""}${item.distance || ""}` : "";
    li.textContent = `${item.label}${dist}${conf}`;
    container.appendChild(li);
  }
}

// ===== 展示完整结果 =====
function showResult(scene, events, reminder, opts = {}) {
  sceneDesc.textContent = scene.description || "未识别到有效场景";
  renderTags(hazardList, scene.hazards || [], "hazard");
  renderTags(soundList, events || [], "sound");

  reminderBox.className = "reminder " + (reminder.priority || "low");
  priorityBadge.textContent = PRIORITY_TEXT[reminder.priority] || "提示";
  reminderText.textContent = reminder.speak || "系统提醒将在这里播报。";
  reasonText.textContent = "判断依据：" + (reminder.reason || "—");
  modeText.textContent = "提醒方式：" + (MODE_TEXT[reminder.mode] || "语音");

  if (opts.mock) {
    mockBadge.textContent = opts.scripted ? "脚本演示" : "离线降级(mock)";
    mockBadge.hidden = false;
  } else {
    mockBadge.hidden = true;
  }

  speak(reminder.speak);
}

// ===== 预览（视频 + 缩略图兜底）=====
function showPreview(scene) {
  previewCaption.textContent = scene.name + " · " + scene.short;
  previewVideo.hidden = false;
  previewImg.style.display = "none";
  previewVideo.poster = scene.thumb;
  previewVideo.onerror = () => {
    previewVideo.hidden = true;
    previewImg.style.display = "block";
    previewImg.src = scene.thumb;
  };
  previewVideo.src = scene.video;
  previewVideo.play().catch(() => {});
}

// ===== 读药品：真实 OCR 链路（从视频抽帧 → 感知层识别药品文字）=====
function ensureVideoReady(video) {
  return new Promise((resolve) => {
    if (video.readyState >= 2 && video.videoWidth) return resolve();
    const onReady = () => {
      video.removeEventListener("loadeddata", onReady);
      resolve();
    };
    video.addEventListener("loadeddata", onReady);
  });
}

function extractFrameJpeg(video, timeSec) {
  return new Promise(async (resolve, reject) => {
    try {
      await ensureVideoReady(video);
    } catch (_) {}
    const onSeeked = () => {
      video.removeEventListener("seeked", onSeeked);
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("抽帧失败"))), "image/jpeg", 0.9);
      } catch (e) {
        reject(e);
      }
    };
    video.addEventListener("seeked", onSeeked);
    video.currentTime = timeSec;
  });
}

async function ocrReadFrame(video, timeSec) {
  const blob = await extractFrameJpeg(video, timeSec);
  const fd = new FormData();
  fd.append("image", blob, "frame.jpg");
  const resp = await fetch(`${PERCEPTION_URL}/api/ocr/read`, { method: "POST", body: fd });
  if (!resp.ok) throw new Error(`感知层返回 ${resp.status}`);
  return resp.json(); // { text, mock }
}

async function showMedicineOCR(scene) {
  // 先展示脚本兜底，便于离线也能看
  showResult(scene.scene, scene.events, scene.reminder, { mock: true, scripted: true });

  try {
    reminderText.textContent = "正在识别药品文字…";
    const result = await ocrReadFrame(previewVideo, 14); // 14s 处为最清晰的药名标签帧
    const text = (result && result.text) ? String(result.text).trim() : "";
    if (text) {
      sceneDesc.textContent = "药品标签上识别到的文字（实时 OCR）：";
      renderTags(hazardList, [], "hazard");
      renderTags(soundList, [], "sound");
      reminderBox.className = "reminder normal";
      priorityBadge.textContent = "提示";
      reminderText.textContent = text.replace(/\s+/g, " ").trim();
      reasonText.textContent = "判断依据：OCR 实时读取药品包装文字";
      modeText.textContent = "提醒方式：语音";
      mockBadge.textContent = "离线降级(mock)";
      mockBadge.hidden = !(result && result.mock);
      speak("药品文字：" + text.replace(/\s+/g, "，"));
    }
  } catch (e) {
    // OCR 失败则保持脚本演示兜底
    reminderText.textContent = scene.reminder.speak;
    mockBadge.textContent = "脚本演示";
    mockBadge.hidden = false;
  }
}

// ===== 场景卡片 =====
function renderScenes() {
  SCENES.forEach((scene) => {
    const card = document.createElement("button");
    card.className = "scene-card";
    card.setAttribute("role", "listitem");
    card.setAttribute("aria-label", `${scene.name}：${scene.short}`);
    card.innerHTML = `<img src="${scene.thumb}" alt="" /><span class="scene-name">${scene.name}</span><span class="scene-short">${scene.short}</span>`;

    card.addEventListener("click", () => {
      document.querySelectorAll(".scene-card").forEach((c) => c.setAttribute("aria-selected", "false"));
      card.setAttribute("aria-selected", "true");
      showPreview(scene);
      if (scene.id === "04") {
        showMedicineOCR(scene);
      } else {
        showResult(scene.scene, scene.events, scene.reminder, { mock: true, scripted: true });
      }
    });

    sceneGrid.appendChild(card);
  });
}

// ===== 实时模式：调用后端 =====
async function liveAnalyze(imageFile, audioFile) {
  const status = $("#liveStatus");
  status.className = "live-status";
  status.textContent = "正在分析…";

  // 1) 调用后端 2 决策层得到最终提醒
  const fd = new FormData();
  fd.append("image", imageFile);
  if (audioFile) fd.append("audio", audioFile);

  let reminder;
  try {
    const resp = await fetch(`${DECISION_URL}/api/decide`, { method: "POST", body: fd });
    if (!resp.ok) throw new Error(`决策层返回 ${resp.status}`);
    reminder = await resp.json();
  } catch (e) {
    status.className = "live-status err";
    status.textContent = "后端未启动：请先运行决策层服务（见 README），端口 " + DECISION_URL + "。错误：" + e.message;
    return;
  }

  // 2) 尽力调用后端 1 感知层，展示视觉细节
  let scene = null;
  try {
    const sfd = new FormData();
    sfd.append("image", imageFile);
    const sresp = await fetch(`${PERCEPTION_URL}/api/vision/analyze`, { method: "POST", body: sfd });
    if (sresp.ok) scene = await sresp.json();
  } catch (_) { /* 感知层未启动则忽略 */ }

  const events = [];
  const opts = { mock: !!reminder.mock };

  previewImg.style.display = "block";
  previewVideo.hidden = true;
  previewImg.src = URL.createObjectURL(imageFile);
  previewCaption.textContent = "实时上传图片";

  showResult(
    scene || { description: reminder.reason || "—", objects: [], hazards: [], danger: reminder.priority || "low" },
    events,
    reminder,
    opts
  );

  status.className = "live-status ok";
  status.textContent = reminder.mock
    ? "已返回提醒（当前为离线降级 mock 结果，配置 API Key 后接入真实模型）。"
    : "已返回实时提醒。";
}

// ===== 事件绑定 =====
function bindEvents() {
  $("#ttsToggle").addEventListener("click", (e) => {
    ttsEnabled = !ttsEnabled;
    e.target.textContent = "语音播报：" + (ttsEnabled ? "开" : "关");
    e.target.setAttribute("aria-pressed", String(ttsEnabled));
    if (!ttsEnabled && "speechSynthesis" in window) window.speechSynthesis.cancel();
  });

  $("#fontToggle").addEventListener("click", (e) => {
    const on = document.body.classList.toggle("large-text");
    e.target.setAttribute("aria-pressed", String(on));
  });

  $("#liveForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const img = $("#imageInput").files[0];
    const aud = $("#audioInput").files[0] || null;
    if (!img) return;
    liveAnalyze(img, aud);
  });
}

renderScenes();
bindEvents();