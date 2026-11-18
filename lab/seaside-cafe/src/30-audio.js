/* ============================================================
   WebAudio：海浪 / 风 / 雨 / 风铃 / 咖啡 / 音乐，全部程序化
   ============================================================ */
class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.bus = {};
    this.started = false;
    this.muted = false;
    this.musicTimer = 0;
    this.musicStep = 0;
    this.weather = 'clear';
    this.night = false;
    this.rainGain = null;
    this.oceanGain = null;
    this.windGain = null;
    this._musicGain = null;
  }
  ensure() {
    if (this.ctx) return this.ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : .65;
    this.master.connect(this.ctx.destination);
    const mk = (v) => { const g = this.ctx.createGain(); g.gain.value = v; g.connect(this.master); return g; };
    this.bus.ocean = mk(.0); this.bus.wind = mk(.0); this.bus.rain = mk(.0);
    this.bus.fx = mk(.7); this.bus.music = mk(.0);
    this.oceanGain = this.bus.ocean; this.windGain = this.bus.wind; this.rainGain = this.bus.rain;
    this._musicGain = this.bus.music;
    this.noise = this.makeNoise(4);
    this.startAmbience();
    this.started = true;
    return this.ctx;
  }
  makeNoise(seconds) {
    const len = Math.floor(this.ctx.sampleRate * seconds);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + .02 * white) / 1.02;
      d[i] = last * 3.2 + white * .12;
    }
    return buf;
  }
  loopNoise(buffer, type, freq, q, gainValue) {
    const src = this.ctx.createBufferSource();
    src.buffer = buffer; src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = this.ctx.createGain(); g.gain.value = gainValue;
    src.connect(f); f.connect(g);
    src.start();
    return { src, filter: f, gain: g };
  }
  startAmbience() {
    const ocean = this.loopNoise(this.noise, 'lowpass', 420, .7, .13);
    this.ocean = ocean;
    // 缓慢的潮汐呼吸
    const lfo = this.ctx.createOscillator(); lfo.frequency.value = .07;
    const lg = this.ctx.createGain(); lg.gain.value = .06;
    lfo.connect(lg); lg.connect(ocean.gain.gain); lfo.start();
    ocean.gain.connect(this.bus.ocean);

    const wind = this.loopNoise(this.noise, 'bandpass', 760, .6, .035);
    this.wind = wind;
    wind.gain.connect(this.bus.wind);
    const lfo2 = this.ctx.createOscillator(); lfo2.frequency.value = .12;
    const lg2 = this.ctx.createGain(); lg2.gain.value = .02;
    lfo2.connect(lg2); lg2.connect(wind.gain.gain); lfo2.start();

    const rain = this.loopNoise(this.noise, 'highpass', 1800, .4, .0);
    this.rain = rain;
    rain.gain.connect(this.bus.rain);
    this.setWeather('clear', true);
    this.setTime(0.78, true);
  }
  start() {
    const ctx = this.ensure();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    this.bus.ocean.gain.setTargetAtTime(.65, ctx.currentTime, 1.2);
    this.bus.wind.gain.setTargetAtTime(.3, ctx.currentTime, 1.2);
  }
  setMuted(m) {
    this.muted = m;
    if (!this.ctx) return;
    this.master.gain.setTargetAtTime(m ? 0 : .65, this.ctx.currentTime, .1);
  }
  setWeather(w, immediate = false) {
    this.weather = w;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.bus.rain.gain.setTargetAtTime(w === 'rain' ? .42 : 0, t, immediate ? .01 : 1.4);
    this.bus.ocean.gain.setTargetAtTime(w === 'rain' ? .8 : .65, t, 1.2);
    this.bus.wind.gain.setTargetAtTime(w === 'rain' ? .55 : .3, t, 1.2);
    if (w === 'rain') this.rain.gain.gain.setTargetAtTime(.12, t, 1.2);
  }
  setTime(t, immediate = false) {
    this.night = t > .84 || t < .16;
    if (!this.ctx) return;
    // 夜晚虫鸣 / 更轻的浪
    this.bus.ocean.gain.setTargetAtTime(this.night ? .42 : .65, this.ctx.currentTime, 2);
    this.bus.wind.gain.setTargetAtTime(this.night ? .18 : .3, this.ctx.currentTime, 2);
  }
  blip(freq, dur, type = 'sine', vol = .15, when = 0) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .01);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(this.bus.fx); o.start(t); o.stop(t + dur + .05);
    return o;
  }
  chime() {
    if (!this.ctx) return;
    [1280, 1720, 2350].forEach((f, i) => this.blip(f, .9 + i * .2, 'sine', .08, i * .04));
    this.blip(640, .5, 'triangle', .04, .02);
  }
  bell() {
    [1180, 1560, 2100].forEach((f, i) => this.blip(f, .45, 'sine', .06, i * .02));
  }
  door(open) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain(), f = this.ctx.createBiquadFilter();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(open ? 92 : 72, t); o.frequency.linearRampToValueAtTime(open ? 64 : 58, t + .44);
    f.type = 'lowpass'; f.frequency.value = 360;
    g.gain.setValueAtTime(.001, t); g.gain.linearRampToValueAtTime(.035, t + .06); g.gain.exponentialRampToValueAtTime(.0001, t + .5);
    o.connect(f); f.connect(g); g.connect(this.bus.fx); o.start(t); o.stop(t + .55);
  }
  grind() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource(); src.buffer = this.noise; src.loop = true;
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(420, t); f.frequency.linearRampToValueAtTime(900, t + 2.1);
    const g = this.ctx.createGain(); g.gain.setValueAtTime(.0, t); g.gain.linearRampToValueAtTime(.12, t + .1); g.gain.setValueAtTime(.1, t + 1.8); g.gain.exponentialRampToValueAtTime(.001, t + 2.4);
    src.connect(f); f.connect(g); g.connect(this.bus.fx); src.start(t); src.stop(t + 2.5);
    this.blip(180, .12, 'square', .03, .1);
  }
  pour() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource(); src.buffer = this.noise; src.loop = true;
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(820, t); f.frequency.linearRampToValueAtTime(1250, t + 1.6);
    const g = this.ctx.createGain(); g.gain.setValueAtTime(.001, t); g.gain.linearRampToValueAtTime(.055, t + .3); g.gain.exponentialRampToValueAtTime(.001, t + 2.6);
    src.connect(f); f.connect(g); g.connect(this.bus.fx); src.start(t); src.stop(t + 2.7);
  }
  steam() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource(); src.buffer = this.noise; src.loop = true;
    const f = this.ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 2200;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(.001, t); g.gain.linearRampToValueAtTime(.08, t + .08); g.gain.exponentialRampToValueAtTime(.001, t + .55);
    src.connect(f); f.connect(g); g.connect(this.bus.fx); src.start(t); src.stop(t + .6);
  }
  purr() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = 42;
    const am = this.ctx.createOscillator(); am.frequency.value = 25;
    const amg = this.ctx.createGain(); amg.gain.value = .025;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(.001, t); g.gain.linearRampToValueAtTime(.05, t + .2); g.gain.exponentialRampToValueAtTime(.001, t + 1.8);
    am.connect(amg); amg.connect(g.gain);
    o.connect(g); g.connect(this.bus.fx); o.start(t); am.start(t); o.stop(t + 1.9); am.stop(t + 1.9);
  }
  meow() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(480, t); o.frequency.linearRampToValueAtTime(720, t + .12); o.frequency.linearRampToValueAtTime(520, t + .4);
    const g = this.ctx.createGain(); g.gain.setValueAtTime(.001, t); g.gain.linearRampToValueAtTime(.05, t + .04); g.gain.exponentialRampToValueAtTime(.001, t + .5);
    o.connect(g); g.connect(this.bus.fx); o.start(t); o.stop(t + .55);
  }
  vending() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); o.type = 'square'; o.frequency.value = 110;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(.02, t); g.gain.exponentialRampToValueAtTime(.001, t + .4);
    o.connect(g); g.connect(this.bus.fx); o.start(t); o.stop(t + .45);
    this.blip(880, .08, 'sine', .04, .42);
    // can drop
    this.blip(220, .12, 'triangle', .06, .5);
  }
  wishBell() {
    [660, 990, 1320, 1760].forEach((f, i) => this.blip(f, 1.4, 'sine', .045, i * .09));
  }
  shell() {
    this.blip(1560, .14, 'sine', .04);
    this.blip(2100, .25, 'sine', .025, .04);
  }
  camera() {
    this.blip(920, .06, 'square', .02);
  }
  setMusic(on) {
    if (!this.ctx) return;
    this.bus.music.gain.setTargetAtTime(on ? .55 : 0, this.ctx.currentTime, .4);
    if (on) this.startMusic(); else this.stopMusic();
  }
  startMusic() {
    if (!this.ctx) return;
    if (this.musicTimer) return;
    const scale = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25];
    const chords = [[0, 3, 5], [0, 2, 4], [1, 3, 5], [0, 3, 4]];
    const tick = () => {
      if (!this.ctx || !this.bus.music.gain.value) { this.musicTimer = 0; return; }
      const t = this.ctx.currentTime + .02;
      const chord = chords[this.musicStep % chords.length];
      // 柔和的和弦垫
      chord.forEach((idx, j) => {
        const o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.type = 'sine'; o.frequency.value = scale[idx] / (j === 2 ? 2 : 1);
        g.gain.setValueAtTime(.001, t); g.gain.linearRampToValueAtTime(.012, t + .4); g.gain.exponentialRampToValueAtTime(.001, t + 3.8);
        o.connect(g); g.connect(this.bus.music); o.start(t); o.stop(t + 4);
      });
      // 偶尔的旋律
      if (this.musicStep % 2 === 0) {
        const o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.type = 'triangle'; o.frequency.value = scale[(this.musicStep * 2 + 4) % scale.length] * 2;
        g.gain.setValueAtTime(.001, t + .3); g.gain.linearRampToValueAtTime(.02, t + .5); g.gain.exponentialRampToValueAtTime(.001, t + 2.2);
        o.connect(g); g.connect(this.bus.music); o.start(t + .3); o.stop(t + 2.3);
      }
      this.musicStep++;
      this.musicTimer = setTimeout(tick, 2100);
    };
    tick();
  }
  stopMusic() {
    if (this.musicTimer) { clearTimeout(this.musicTimer); this.musicTimer = 0; }
  }
}
const AUDIO = new AudioEngine();
