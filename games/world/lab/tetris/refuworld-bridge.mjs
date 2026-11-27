// RefuWorld-backed variant of NEON DRIFT.
// Dependency layers: L0 fixed tick/time, L3 quests/flags, L5 world systems.
// The falling-block board itself stays in the pure game logic; this bridge is
// the session authority for time, public objectives and grid power.

import init, { PreviewWorld } from "../../web/pkg/world_wasm.js";

export class RefuWorldBridge {
  constructor() {
    this.world = null;
    this.state = null;
    this.packId = "lab.tetris";
    this.lastQuest = "";
    this.events = [];
    this.resetCount = 0;
  }

  async init() {
    await init();
    const response = await fetch("./refuworld.pack.data");
    if (!response.ok) throw new Error(`refuworld.pack.data HTTP ${response.status}`);
    this.world = new PreviewWorld(await response.text());
    this.state = JSON.parse(this.world.state());
    this.packId = this.state.pack_id;
    return this;
  }

  reset() {
    this.world.reset();
    this.state = JSON.parse(this.world.state());
    this.lastQuest = "";
    this.resetCount++;
  }

  onStart() {
    this.reset();
    this.world.pause(false);
  }

  tick(dtMs) {
    if (!this.world) return;
    this.world.tick(dtMs * 1000);
    this.state = JSON.parse(this.world.state());
    try {
      const fresh = JSON.parse(this.world.poll_events());
      this.events.push(...fresh);
      if (this.events.length > 80) this.events = this.events.slice(-80);
    } catch {}
  }

  pause(paused) {
    if (this.world) this.world.pause(paused);
  }

  gravityMultiplier() {
    const s = this.systems();
    if (!s) return 1;
    if (s.battery_kwh < 24) return 1.24;
    if (s.battery_kwh < 48) return 1.12;
    if (s.policy === "commons") return 1.04;
    return 1;
  }

  systems() {
    return this.state?.state?.systems ?? null;
  }

  quests() {
    return this.state?.state?.quests ?? {};
  }

  firstQuest() {
    const entries = Object.entries(this.quests());
    return entries[0]?.[1] ?? null;
  }

  onClear(clear) {
    if (!this.world || !clear?.count) return;
    this.sendFlag("flag.tetris.first_clear", true);
    if (clear.count === 4) this.sendFlag("flag.tetris.tetris", true);
    const battery = this.systems()?.battery_kwh ?? 100;
    if (battery < 48) this.sendFlag("flag.tetris.power_saved", true);
  }

  sendFlag(flag, value) {
    try {
      this.world.command(JSON.stringify({ op: "set_flag", flag, value }));
    } catch (error) {
      console.warn("RefuWorld SetFlag failed", error);
    }
  }

  render(ui) {
    if (!this.state) return;
    const s = this.systems();
    const quest = this.firstQuest();
    const titles = this.state.quest_titles ?? {};
    const loc = this.state.loc ?? {};
    const t = (text) => typeof text === "string" && text.startsWith("loc:") ? (loc[text.slice(4)] ?? text.slice(4)) : text;
    if (s) {
      ui.power.textContent = `${this.gravityMultiplier().toFixed(2)}×`;
      ui.battery.textContent = `${s.battery_kwh.toFixed(0)} kWh`;
      ui.load.textContent = `${s.load_kw.toFixed(0)} kW`;
      ui.weather.textContent = ({ clear: "晴", breezy: "微风", cloudy: "多云", rain: "雨" })[s.weather] ?? s.weather;
      ui.solar.textContent = `${s.solar_kw.toFixed(0)} kW`;
      ui.wind.textContent = `${s.wind_kw.toFixed(0)} kW`;
      ui.batteryBar.style.width = `${Math.min(100, s.battery_kwh / 120 * 100)}%`;
      ui.solarBar.style.width = `${Math.min(100, s.solar_kw / 64 * 100)}%`;
    }
    const activeQuest = Object.entries(this.quests()).find(([, q]) => q.active && !q.completed);
    const doneQuest = Object.entries(this.quests()).find(([, q]) => q.completed);
    ui.quest.textContent = activeQuest ? t(titles[activeQuest[0]] ?? activeQuest[0]) : doneQuest ? "任务完成" : "稳定信号";
    const progress = activeQuest?.[1]?.progress ?? doneQuest?.[1]?.progress ?? {};
    const labels = [
      ["flag:flag.tetris.first_clear", "清 1 行"],
      ["flag:flag.tetris.tetris", "出 1 次 TETRIS"],
      ["flag:flag.tetris.power_saved", "低电量下锁块"],
    ];
    ui.objectives.innerHTML = labels.map(([k, label]) => `<li class="${progress[k] ? "done" : ""}">${progress[k] ? "✓" : "●"} ${label}</li>`).join("");
    ui.tick.textContent = String(this.state.state?.tick ?? 0);
    ui.core.textContent = doneQuest ? "OBJECTIVE COMPLETE" : s && s.battery_kwh < 30 ? "GRID LOW / GRAVITY +" : "CORE LINKED";
  }
}
