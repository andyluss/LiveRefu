// Tiny synthesized SFX. No samples, no network.
export class AudioEngine {
  constructor() { this.ctx = null; this.master = null; this.enabled = false; this.timer = null; }
  async enable() {
    if (!this.ctx) this.build();
    await this.ctx.resume();
    this.enabled = true;
    this.master.gain.setTargetAtTime(0.34, this.ctx.currentTime, 0.08);
  }
  disable() {
    this.enabled = false;
    if (this.master) this.master.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.05);
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }
  build() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.0001;
    this.master.connect(this.ctx.destination);
    this.startDrone();
  }
  startDrone() {
    const ctx = this.ctx;
    for (const [freq, gain] of [[46, 0.018], [69, 0.009]]) {
      const osc = ctx.createOscillator(); osc.type = "sine"; osc.frequency.value = freq;
      const g = ctx.createGain(); g.gain.value = gain; osc.connect(g).connect(this.master); osc.start();
    }
    this.timer = setInterval(() => this.foghorn(), 19000);
  }
  tone(freq, duration = 0.08, type = "square", gain = 0.08, slide = 0) {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator(); osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), now + duration);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(gain, now + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(g).connect(this.master); osc.start(now); osc.stop(now + duration + 0.02);
  }
  move() { this.tone(210, 0.035, "square", 0.035); }
  rotate() { this.tone(520, 0.06, "triangle", 0.055, 120); }
  drop() { this.tone(120, 0.13, "sawtooth", 0.055, -45); }
  lock() { this.tone(95, 0.07, "square", 0.05); }
  clear(count) {
    const notes = [392, 494, 587, 784];
    notes.slice(0, Math.max(1, count)).forEach((n, i) => setTimeout(() => this.tone(n, 0.12, "triangle", 0.06, 80), i * 55));
  }
  tetris() { [392, 523, 659, 784, 1046].forEach((n, i) => setTimeout(() => this.tone(n, 0.16, "sawtooth", 0.05, 60), i * 65)); }
  tspin() { [740, 988, 1318].forEach((n, i) => setTimeout(() => this.tone(n, 0.14, "triangle", 0.06, 40), i * 70)); }
  level() { [523, 659, 784, 1046].forEach((n, i) => setTimeout(() => this.tone(n, 0.1, "square", 0.05), i * 55)); }
  gameover() { [330, 262, 196, 147].forEach((n, i) => setTimeout(() => this.tone(n, 0.16, "sawtooth", 0.05, -30), i * 100)); }
  foghorn() { if (this.enabled) this.tone(82, 1.5, "sine", 0.025, -12); }
}
