// 生成式环境声与四张“唱片”：不依赖音频文件，首次用户手势后启动。
export const TRACKS = {
  night: {
    label: '夜航', sub: 'warm pad / slow arp', filter: 900,
    pad: [[130.81, 164.81, 196.00, 246.94], [110.00, 130.81, 164.81, 220.00]],
    arp: [261.63, 329.63, 392.00, 329.63, 293.66, 246.94, 220.00, 196.00],
    step: 0.62,
  },
  rain: {
    label: '雨室', sub: 'minor 9 / soft keys', filter: 640,
    pad: [[146.83, 174.61, 220.00, 261.63], [130.81, 146.83, 196.00, 246.94]],
    arp: [293.66, 349.23, 440.00, 349.23, 261.63, 293.66, 220.00, 196.00],
    step: 0.76,
  },
  drift: {
    label: '深空', sub: 'sparse / low drift', filter: 480,
    pad: [[98.00, 146.83, 196.00, 293.66], [87.31, 130.81, 174.61, 261.63]],
    arp: [392.00, 293.66, 196.00, 146.83, 174.61, 220.00, 261.63, 196.00],
    step: 0.92,
  },
  dawn: {
    label: '晨光', sub: 'major 7 / first light', filter: 1150,
    pad: [[164.81, 196.00, 246.94, 329.63], [146.83, 196.00, 246.94, 293.66]],
    arp: [329.63, 392.00, 493.88, 392.00, 329.63, 293.66, 246.94, 293.66],
    step: 0.54,
  },
};
export const TRACK_IDS = Object.keys(TRACKS);

export class AmbientAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicBus = null;
    this.padGain = null;
    this.arpGain = null;
    this.padNodes = [];
    this.timer = null;
    this.arpIndex = 0;
    this.chordIndex = 0;
    this.state = { rain: .25, wind: .12, vinyl: .18, hum: .2, melody: .22, track: 'night', muted: false };
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
    this.musicBus = this.ctx.createGain();
    this.musicBus.gain.value = .9;
    this.musicBus.connect(this.master);
    this.padGain = this.ctx.createGain();
    this.padGain.gain.value = .075;
    this.padGain.connect(this.musicBus);
    this.arpGain = this.ctx.createGain();
    this.arpGain.gain.value = this.state.melody;
    this.arpGain.connect(this.musicBus);
    this._buildNoise('rain', 900, 0.08);
    this._buildNoise('wind', 260, 0.05);
    this._buildNoise('vinyl', 3400, 0.02, true);
    this._buildHum();
    this.started = true;
    this.setTrack(this.state.track || 'night');
  }

  // 换唱片：停掉旧 pad / arp，再按新和声与琶音重建。
  setTrack(id) {
    const key = TRACKS[id] ? id : 'night';
    this.state.track = key;
    if (!this.started) return;
    this._stopPad();
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    this.arpIndex = 0;
    this.chordIndex = 0;
    this._buildPad(TRACKS[key]);
    const stepMs = TRACKS[key].step * 1000;
    this.timer = setInterval(() => this._tickArp(), stepMs);
  }

  _buildPad(track) {
    const chord = track.pad[0];
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = track.filter;
    filter.Q.value = .8;
    filter.connect(this.padGain);
    this.padNodes = [];
    chord.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      osc.type = i % 2 ? 'triangle' : 'sine';
      osc.frequency.value = freq;
      osc.detune.value = (i - 1.5) * 3;
      const g = this.ctx.createGain();
      g.gain.value = 0;
      const now = this.ctx.currentTime;
      g.gain.linearRampToValueAtTime(0.22 / (i + 1), now + 1.6);
      osc.connect(g); g.connect(filter); osc.start();
      this.padNodes.push({ osc, gain: g, chord, filter });
    });
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = .045;
    const lg = this.ctx.createGain(); lg.gain.value = 180;
    lfo.connect(lg); lg.connect(filter.frequency); lfo.start();
    this.padNodes.push({ osc: lfo, kind: 'lfo' });
    this.padFilter = filter;
  }

  _stopPad() {
    this.padNodes.forEach(n => {
      try { n.osc.stop(); n.osc.disconnect(); n.gain?.disconnect(); } catch {}
    });
    this.padNodes = [];
  }

  _tickArp() {
    if (!this.started) return;
    const track = TRACKS[this.state.track] || TRACKS.night;
    const freq = track.arp[this.arpIndex % track.arp.length];
    this.arpIndex++;
    // 每两小节换一次和声，让循环不是死板的单和弦。
    if (this.arpIndex % (track.arp.length * 2) === 0) {
      this.chordIndex = (this.chordIndex + 1) % track.pad.length;
      const chord = track.pad[this.chordIndex];
      this.padNodes.forEach((n, i) => {
        if (n.osc && chord[i] && !n.kind) n.osc.frequency.setTargetAtTime(chord[i], this.ctx.currentTime, 1.2);
      });
    }
    this._pluck(freq);
  }

  _pluck(freq) {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine'; osc.frequency.value = freq;
    const filter = this.ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 2100;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(.12, t + .012);
    g.gain.exponentialRampToValueAtTime(.001, t + .85);
    osc.connect(filter); filter.connect(g); g.connect(this.arpGain);
    osc.start(t); osc.stop(t + .95);
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
    this.nodes = this.nodes || [];
    this.nodes.push({ src, gain, kind });
  }

  _buildHum() {
    // 低鸣不是一条 55Hz 正弦：那在笔记本扬声器上几乎听不见。
    // 用 55/82.5/110Hz 的基频与泛音，经低通与缓慢呼吸，做成可感的低频底噪。
    const now = this.ctx.currentTime;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass'; filter.frequency.value = 240; filter.Q.value = .7;
    const gain = this.ctx.createGain();
    gain.gain.value = (this.state.hum ?? .2) * .30;
    filter.connect(gain); gain.connect(this.master);
    const partials = [
      { freq: 55.0, type: 'sine', level: .45 },
      { freq: 82.5, type: 'triangle', level: .18 },
      { freq: 110.0, type: 'sine', level: .10 },
    ];
    this.humNodes = [];
    for (const p of partials) {
      const osc = this.ctx.createOscillator();
      osc.type = p.type; osc.frequency.value = p.freq;
      const g = this.ctx.createGain(); g.gain.value = p.level;
      osc.connect(g); g.connect(filter); osc.start();
      this.humNodes.push(osc);
    }
    // 非常慢的呼吸，避免低频变成死板的嗡嗡声。
    const lfo = this.ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = .075;
    const lfoGain = this.ctx.createGain(); lfoGain.gain.value = (this.state.hum ?? .2) * .08;
    lfo.connect(lfoGain); lfoGain.connect(gain.gain); lfo.start(now);
    this.humNodes.push(lfo);
    this.humGain = gain;
    this.humLfoGain = lfoGain;
    this.nodes = this.nodes || [];
    this.nodes.push({ gain, kind: 'hum' });
  }

  set(key, value) {
    this.state[key] = value;
    if (!this.started) return;
    if (key === 'muted') { this.master.gain.setTargetAtTime(value ? 0 : 0.18, this.ctx.currentTime, .1); return; }
    if (key === 'melody') { this.arpGain.gain.setTargetAtTime(value, this.ctx.currentTime, .08); return; }
    if (key === 'hum') {
      if (this.humGain) this.humGain.gain.setTargetAtTime(value * .30, this.ctx.currentTime, .12);
      if (this.humLfoGain) this.humLfoGain.gain.setTargetAtTime(value * .08, this.ctx.currentTime, .12);
      return;
    }
    if (this.nodes) {
      this.nodes.forEach(n => {
        if (n.kind === key && n.gain) n.gain.gain.setTargetAtTime(value, this.ctx.currentTime, .08);
      });
    }
  }

  setAll(values) {
    const track = values.track;
    Object.entries(values).forEach(([k, v]) => { if (k !== 'track') this.set(k, v); });
    if (track) this.setTrack(track);
  }

  chime() {
    if (!this.started) return;
    const t = this.ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((f, i) => {
      const o = this.ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      const g = this.ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.1, t + .02); g.gain.exponentialRampToValueAtTime(.001, t + 1.8 + i * .2);
      o.connect(g); g.connect(this.master); o.start(t + i * .08); o.stop(t + 2.4 + i * .2);
    });
  }
}
