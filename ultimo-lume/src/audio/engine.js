// WebAudio setup: master/music/sfx buses, pulse waves, shared noise buffer.
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.ready = false;
    this.musicVolume = 0.7;
    this.sfxVolume = 0.8;
    this.listeners = [];
  }

  // Must be called from a user gesture.
  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC();
    } catch {
      return;
    }
    const ctx = this.ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    this.master.connect(comp);
    comp.connect(ctx.destination);
    this.musicBus = ctx.createGain();
    this.sfxBus = ctx.createGain();
    this.musicBus.connect(this.master);
    this.sfxBus.connect(this.master);
    this.applyVolumes();

    // shared white-noise buffer (2s)
    const len = ctx.sampleRate * 2;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    this.waves = {
      pulse12: this.pulseWave(0.125),
      pulse25: this.pulseWave(0.25),
      pulse50: this.pulseWave(0.5),
    };
    this.ready = true;
    for (const fn of this.listeners) fn();
  }

  onReady(fn) {
    if (this.ready) fn();
    else this.listeners.push(fn);
  }

  pulseWave(duty) {
    const n = 48;
    const real = new Float32Array(n);
    const imag = new Float32Array(n);
    for (let k = 1; k < n; k++) real[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
    return this.ctx.createPeriodicWave(real, imag);
  }

  setVolumes(music, sfx) {
    this.musicVolume = music;
    this.sfxVolume = sfx;
    this.applyVolumes();
  }

  applyVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.musicBus.gain.setTargetAtTime(this.musicVolume * 0.55, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(this.sfxVolume * 0.9, t, 0.05);
  }

  get now() {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  // Oscillator voice with envelope. Returns nothing; nodes clean up themselves.
  tone(dest, o) {
    const ctx = this.ctx;
    const t = (o.at ?? ctx.currentTime) + (o.delay || 0);
    const dur = o.dur || 0.1;
    const osc = ctx.createOscillator();
    if (o.wave && this.waves[o.wave]) osc.setPeriodicWave(this.waves[o.wave]);
    else osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(Math.max(1, o.f0), t);
    if (o.f1) {
      if (o.lin) osc.frequency.linearRampToValueAtTime(Math.max(1, o.f1), t + dur);
      else osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f1), t + dur);
    }
    if (o.vib) {
      const lfo = ctx.createOscillator();
      const lg = ctx.createGain();
      lfo.frequency.value = o.vibRate || 6;
      lg.gain.setValueAtTime(0, t);
      lg.gain.linearRampToValueAtTime(o.vib, t + (o.vibDelay || 0.08));
      lfo.connect(lg);
      lg.connect(osc.frequency);
      lfo.start(t);
      lfo.stop(t + dur + 0.1);
    }
    const g = ctx.createGain();
    const vol = o.vol ?? 0.2;
    const a = o.attack ?? 0.004;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + a);
    if (o.sustain != null) {
      g.gain.setValueAtTime(vol, t + a);
      g.gain.linearRampToValueAtTime(vol * o.sustain, t + a + (o.decay || 0.05));
      g.gain.setValueAtTime(vol * o.sustain, Math.max(t + a + (o.decay || 0.05), t + dur - (o.release || 0.05)));
      g.gain.linearRampToValueAtTime(0.0001, t + dur);
    } else {
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    }
    osc.connect(g);
    g.connect(dest);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  // Filtered noise burst.
  noiseBurst(dest, o) {
    const ctx = this.ctx;
    const t = (o.at ?? ctx.currentTime) + (o.delay || 0);
    const dur = o.dur || 0.1;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = o.filter || 'lowpass';
    f.frequency.setValueAtTime(o.f0 || 2000, t);
    if (o.f1) f.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1), t + dur);
    f.Q.value = o.q || 0.8;
    const g = ctx.createGain();
    const vol = o.vol ?? 0.2;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + (o.attack ?? 0.003));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(dest);
    const off = Math.random() * 1.5;
    src.start(t, off, dur + 0.05);
  }
}

export function midiToFreq(m) {
  return 440 * Math.pow(2, (m - 69) / 12);
}

const NOTE_BASE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export function noteToMidi(n) {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(n);
  if (!m) return null;
  let v = NOTE_BASE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return v + (parseInt(m[3], 10) + 1) * 12;
}
