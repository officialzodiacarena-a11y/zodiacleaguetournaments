// index.js — Observer Bridge controller window
// เก็บ Base URL / Match ID ไว้ใน localStorage เพื่อความสะดวก (ไม่เก็บ token — ต้องกรอกใหม่ทุกครั้งที่เปิดแอป)
// ตัวทำงานจริง (GEP + ยิง telemetry) อยู่ใน background.js — หน้าต่างนี้แค่สั่ง start/stop และแสดง log

let bg = null;
let renderedLogCount = 0;

function els() {
  return {
    baseUrl: document.getElementById("baseUrl"),
    matchId: document.getElementById("matchId"),
    token: document.getElementById("token"),
    startBtn: document.getElementById("startBtn"),
    stopBtn: document.getElementById("stopBtn"),
    status: document.getElementById("status"),
    log: document.getElementById("log"),
  };
}

function loadSavedConfig() {
  try {
    const saved = JSON.parse(localStorage.getItem("observer-bridge:config") || "{}");
    const { baseUrl, matchId } = els();
    if (saved.baseUrl) baseUrl.value = saved.baseUrl;
    if (saved.matchId) matchId.value = saved.matchId;
  } catch {
    // ไม่มี config เดิม หรือ parse ไม่ได้ — ปล่อยให้กรอกเอง
  }
}

function saveConfig(baseUrl, matchId) {
  try {
    localStorage.setItem("observer-bridge:config", JSON.stringify({ baseUrl, matchId }));
  } catch {
    // localStorage ใช้ไม่ได้ — ไม่กระทบการทำงานหลัก แค่ไม่ช่วยจำค่าไว้
  }
}

function withBackground(callback) {
  overwolf.windows.getMainWindow((win) => callback(win || window));
}

function render() {
  if (!bg || !bg.ObserverBridge) return;
  const { log, status } = els();
  const lines = bg.ObserverBridge.logs;
  for (let i = renderedLogCount; i < lines.length; i++) {
    const div = document.createElement("div");
    div.textContent = lines[i];
    log.appendChild(div);
  }
  renderedLogCount = lines.length;
  log.scrollTop = log.scrollHeight;

  const running = bg.ObserverBridge.running;
  status.textContent = running ? "กำลังทำงาน ●" : "หยุดอยู่ ○";
  status.className = `status ${running ? "running" : "stopped"}`;
}

function start() {
  const { baseUrl, matchId, token } = els();
  const config = { baseUrl: baseUrl.value.trim(), matchId: matchId.value.trim(), token: token.value.trim() };
  saveConfig(config.baseUrl, config.matchId);
  withBackground((win) => {
    bg = win;
    bg.ObserverBridge.start(config);
  });
}

function stop() {
  withBackground((win) => {
    bg = win;
    bg.ObserverBridge.stop();
  });
}

window.addEventListener("DOMContentLoaded", () => {
  loadSavedConfig();
  const { startBtn, stopBtn } = els();
  startBtn.addEventListener("click", start);
  stopBtn.addEventListener("click", stop);
  withBackground((win) => {
    bg = win;
  });
  setInterval(render, 500);
});
