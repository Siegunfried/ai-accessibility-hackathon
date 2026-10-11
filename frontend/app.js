/* 视碍守护 —— 前端演示逻辑（纯静态演示，不依赖后端，保证显示稳定） */

// ===== 五个演示场景（与 demo/videos 一一对应）=====
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
    thumb: "assets/scenes/06.jpg",
    video: "../demo/videos/06_语音问路/06_语音问路.mp4",
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
      description: "手中是几盒药品，系统将逐一读取药名。",
      objects: ["药盒", "标签", "文字"],
      hazards: [],
      danger: "low",
    },
    events: [],
    reminder: {
      speak: "已识别 6 种药品。",
      priority: "normal",
      mode: "voice",
      reason: "药品文字识别",
    },
  },
  {
    id: "06",
    name: "语音问路",
    short: "语音询问当前位置与路线",
    thumb: "assets/scenes/03.jpg",
    video: "../demo/videos/03_盲道障碍/03_盲道被堵.mp4",
    scene: {
      description: "你正站在一条商业街路口，正前方约五十米是地铁站入口。",
      objects: ["商业街", "路口", "地铁站入口"],
      hazards: [],
      danger: "low",
    },
    events: [{ label: "环境人声", conf: 0.6 }],
    reminder: {
      speak: "您正位于商业街路口，前方约五十米是地铁三号线入口，请沿盲道直行。",
      priority: "normal",
      mode: "voice",
      reason: "用户主动询问场景",
    },
  },
];

// 读药品场景：6 个药品名称（写死，不依赖后端 OCR）
const MEDICINES = [
  "迪康 通窍鼻炎颗粒",
  "999 感冒清热颗粒",
  "Move Free 关节健康",
  "万宁 OMEGA-3 深海鱼油",
  "昆中药 参苓健脾胃颗粒",
  "诺特兰德 肌酸粉",
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
const medicineList = $("#medicineList");

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
function showResult(scene, events, reminder) {
  sceneDesc.textContent = scene.description || "未识别到有效场景";
  renderTags(hazardList, scene.hazards || [], "hazard");
  renderTags(soundList, events || [], "sound");

  reminderBox.className = "reminder " + (reminder.priority || "low");
  priorityBadge.textContent = PRIORITY_TEXT[reminder.priority] || "提示";
  reminderText.textContent = reminder.speak || "系统提醒将在这里播报。";
  reasonText.textContent = "判断依据：" + (reminder.reason || "—");
  modeText.textContent = "提醒方式：" + (MODE_TEXT[reminder.mode] || "语音");

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

function addMedicineTag(name) {
  const li = document.createElement("li");
  li.className = "tag medicine";
  li.textContent = name;
  medicineList.appendChild(li);
}

// ===== 读药品：写死的 6 个药品名称 =====
function showMedicine(scene) {
  showResult(scene.scene, scene.events, scene.reminder);
  medicineList.replaceChildren();
  renderTags(hazardList, [], "hazard");
  renderTags(soundList, [], "sound");
  sceneDesc.textContent = "识别到以下 6 种药品：";
  MEDICINES.forEach((name) => addMedicineTag(name));
  reminderText.textContent = "已识别 6 种药品。";
  reasonText.textContent = "判断依据：药品文字识别（内置结果）";
  modeText.textContent = "提醒方式：语音";
  speak("已识别以下药品：" + MEDICINES.join("，"));
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
        showMedicine(scene);
      } else {
        medicineList.replaceChildren();
        showResult(scene.scene, scene.events, scene.reminder);
      }
    });

    sceneGrid.appendChild(card);
  });
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
}

renderScenes();
bindEvents();