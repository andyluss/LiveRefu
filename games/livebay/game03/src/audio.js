// 生成式环境声：不依赖音频文件，首次用户手势后启动。
export class AmbientAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.nodes = [];
    this.state = { rain: .25, wind: .12, vinyl: .18, hum: .2, muted: false };
    this.started = false;
  }
  async start() {
    if (this.started) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    await this.ctx.resume();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.state.muted ? 0 : 0.18;
    this.master.connect(this.ctx.destination);
    this._buildPad();
    this._buildNoise('rain', 900, 0.08);
    this._buildNoise('wind', 260, 0.05);
    this._buildNoise('vinyl', 3400, 0.02, true);
    this._buildHum();
    this.started = true;
  }
  _buildPad() {
    const notes = [130.81, 164.81, 196.0, 246.94];
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.09;
    filter.connect(gain); gain.connect(this.master);
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      osc.type = i % 2 ? 'triangle' : 'sine';
      osc.frequency.value = freq;
      osc.detune.value = (i - 1.5) * 3;
      const g = this.ctx.createGain();
      g.gain.value = 0.22 / (i + 1);
      osc.connect(g); g.connect(filter);
      osc.start();
      this.nodes.push({ osc, gain: g, base: g.gain.value, kind: 'pad' });
    });
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.045;
    const lg = this.ctx.createGain(); lg.gain.value = 180;
    lfo.connect(lg); lg.connect(filter.frequency); lfo.start();
    this.nodes.push({ osc: lfo, kind: 'lfo' });
  }
  _buildNoise(kind, freq, level, crackle = false) {
    const len = this.ctx.sampleRate * 2;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (crackle && Math.random() > .999 ? 1 : 0.35);
    const src = this.ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const filter = this.ctx.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.value = freq; filter.Q.value = crackle ? 1.2 : .7;
    const gain = this.ctx.createGain(); gain.gain.value = level * (this.state[kind] ?? .2);
    src.connect(filter); filter.connect(gain); gain.connect(this.master); src.start();
    this.nodes.push({ src, gain, kind });
  }
  _buildHum() {
    const osc = this.ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = 55;
    const gain = this.ctx.createGain(); gain.gain.value = .015;
    osc.connect(gain); gain.connect(this.master); osc.start();
    this.nodes.push({ osc, gain, kind: 'hum' });
  }
  set(key, value) {
    this.state[key] = value;
    if (!this.started) return;
    if (key === 'muted') { this.master.gain.setTargetAtTime(value ? 0 : 0.18, this.ctx.currentTime, .1); return; }
    this.nodes.forEach(n => {
      if (n.kind === key && n.gain) n.gain.gain.setTargetAtTime(value, this.ctx.currentTime, .08);
    });
    if (key === 'hum') this.nodes.filter(n => n.kind === 'hum').forEach(n => n.gain.gain.setTargetAtTime(value * .08, this.ctx.currentTime, .08));
  }
  setAll(values) {
    Object.entries(values).forEach(([k, v]) => this.set(k, v));
  }
  chime() {
    if (!this.started) return;
    const t = this.ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((f, i) => {
      const o = this.ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      const g = this.ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.12, t + .02); g.gain.exponentialRampToValueAtTime(.001, t + 1.8 + i * .2);
      o.connect(g); g.connect(this.master); o.start(t + i * .08); o.stop(t + 2.4 + i * .2);
    });
  }
}
