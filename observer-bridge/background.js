// background.js — Observer Bridge (Overwolf) พื้นหลัง
// อ่าน Valorant GEP (match_info.scoreboard_N) แล้วยิง telemetry เข้า
// POST /api/v1/matches/[id]/telemetry ของ Zodiac Arena ทุก 1 วินาที
//
// ADR-004 (Vault-V501/07_Decisions_ADR/ADR-004_Observer_Bridge_Telemetry_Data_Source.md):
// ติดตั้งเฉพาะเครื่อง Observer/Spectator เท่านั้น ผู้เล่นทั้ง 10 คนห้ามติดตั้งเด็ดขาด
// ต้องทดสอบกับบัญชี/เครื่องสำรองก่อนใช้จริงทุกครั้ง
//
// อ้างอิงฟิลด์จาก Overwolf GEP Valorant docs (dev.overwolf.com, ตรวจสอบ 2026-09-22):
// match_info.scoreboard_<index> = JSON string {name, character, weapon, shield(0-4), ult_points, ult_max, money, alive, ...}
// GEP ไม่มีฟิลด์ HP ของผู้เล่นอื่นนอกจาก local player (feature "me") — จึงไม่ส่ง hp/hpMax เลย
// BuyPhaseHud.tsx ซ่อนคอลัมน์ HP เองอยู่แล้วเมื่อไม่มีค่า จึงไม่กระทบ UI

const REQUIRED_FEATURES = ["match_info", "me"];
const POST_INTERVAL_MS = 1000;
const MAX_LOG_LINES = 200;

const bridge = {
  logs: [],
  running: false,
  config: null, // { baseUrl, matchId, token }
  scoreboard: new Map(), // index(number) -> raw scoreboard object จาก GEP

  log(line) {
    const entry = `[${new Date().toLocaleTimeString()}] ${line}`;
    this.logs.push(entry);
    if (this.logs.length > MAX_LOG_LINES) this.logs.shift();
    console.log(entry);
  },

  start(config) {
    if (this.running) {
      this.log("อยู่ระหว่างทำงานแล้ว — กด Stop ก่อนเริ่มใหม่");
      return;
    }
    if (!config || !config.baseUrl || !config.matchId || !config.token) {
      this.log("ต้องกรอก Base URL, Match ID และ Observer Token ให้ครบก่อนกด Start");
      return;
    }

    this.config = config;
    this.scoreboard.clear();
    this.running = true;
    this.log(`เริ่มทำงาน — match ${config.matchId} → ${config.baseUrl}`);

    overwolf.games.events.setRequiredFeatures(REQUIRED_FEATURES, (result) => {
      if (!result || !result.success) {
        this.log(`setRequiredFeatures ล้มเหลว: ${result && result.error}`);
        return;
      }
      this.log(`สมัคร GEP features สำเร็จ: ${(result.supportedFeatures || []).join(", ") || "-"}`);
    });

    overwolf.games.events.getInfo((result) => {
      if (result && result.success && result.res) this.ingestFullState(result.res);
    });

    this.postTimer = setInterval(() => this.postFrame(), POST_INTERVAL_MS);
  },

  stop() {
    this.running = false;
    if (this.postTimer) clearInterval(this.postTimer);
    this.postTimer = null;
    this.log("หยุดทำงานแล้ว");
  },

  ingestFullState(res) {
    const matchInfo = res.match_info || res.matchInfo;
    if (matchInfo) this.applyScoreboardEntries(matchInfo);
  },

  onInfoUpdate(event) {
    if (!this.running) return;
    const info = event && event.info && (event.info.match_info || event.info.matchInfo);
    if (info) this.applyScoreboardEntries(info);
  },

  applyScoreboardEntries(infoObject) {
    for (const key of Object.keys(infoObject)) {
      const match = /^scoreboard_(\d+)$/.exec(key);
      if (!match) continue;
      const rawValue = infoObject[key];
      try {
        const entry = typeof rawValue === "string" ? JSON.parse(rawValue) : rawValue;
        if (entry && typeof entry === "object") this.scoreboard.set(Number(match[1]), entry);
      } catch (err) {
        this.log(`parse ${key} ไม่ได้: ${err instanceof Error ? err.message : err}`);
      }
    }
  },

  // shield ของ Overwolf GEP เป็นตัวเลข 0-4 แต่เอกสารไม่ได้ระบุ threshold แน่ชัดว่าตรง LIGHT/HEAVY ที่จุดไหน
  // mapping นี้เป็นค่าคาดเดาที่สมเหตุสมผลที่สุด (0=ไม่มี, 1-2=LIGHT, 3-4=HEAVY) — ต้องเทียบกับเกมจริงตอนทดสอบ
  // กับบัญชี/เครื่องสำรองคืนนี้ตาม ADR-004 ก่อนใช้งานจริง ถ้าไม่ตรงให้แก้เลข threshold ตรงนี้
  shieldToArmor(shield) {
    const n = Number(shield);
    if (!Number.isFinite(n) || n <= 0) return "NONE";
    return n >= 3 ? "HEAVY" : "LIGHT";
  },

  buildPlayers() {
    const players = [];
    for (const entry of this.scoreboard.values()) {
      if (!entry || !entry.name) continue;
      const player = { name: String(entry.name).trim() };
      if (Number.isFinite(Number(entry.money))) player.credits = Math.max(0, Math.round(Number(entry.money)));
      if (entry.weapon) player.weapon = String(entry.weapon);
      if (entry.shield !== undefined) player.armor = this.shieldToArmor(entry.shield);
      if (Number.isFinite(Number(entry.ult_points))) player.ultPoints = Math.round(Number(entry.ult_points));
      if (Number.isFinite(Number(entry.ult_max)) && Number(entry.ult_max) > 0) {
        player.ultMax = Math.round(Number(entry.ult_max));
      }
      players.push(player);
    }
    return players;
  },

  async postFrame() {
    const players = this.buildPlayers();
    if (players.length === 0) return; // ยังไม่มี scoreboard เข้ามา (เช่น ยังไม่เข้าแมตช์) — ไม่ยิง frame ว่าง
    const { baseUrl, matchId, token } = this.config;
    try {
      const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/v1/matches/${matchId}/telemetry`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ players }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        this.log(`ยิง telemetry ล้มเหลว HTTP ${res.status}: ${(json.error && json.error.message) || JSON.stringify(json)}`);
      }
    } catch (err) {
      this.log(`ยิง telemetry ผิดพลาด (เครือข่าย): ${err instanceof Error ? err.message : err}`);
    }
  },
};

overwolf.games.events.onInfoUpdates2.addListener((event) => bridge.onInfoUpdate(event));

window.ObserverBridge = bridge;
