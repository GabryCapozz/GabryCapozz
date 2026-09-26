// Synthesized sound effects. Each recipe builds short-lived WebAudio voices.
import { midiToFreq, noteToMidi } from './engine.js';

const N = (n) => midiToFreq(noteToMidi(n));
const jit = (v, amt = 0.06) => v * (1 + (Math.random() * 2 - 1) * amt);

// Minimum spacing (s) between repeats of the same sound.
const MIN_GAP = { step: 0.05, hit: 0.03, blip: 0.02, coin: 0.04, fuse: 0.08, drip: 0.1, uiMove: 0.03, rattle: 0.2, bat: 0.15, splash: 0.1 };

function jingle(a, bus, notes, o = {}) {
  const step = o.step || 0.08;
  notes.forEach((n, i) => {
    if (!n) return;
    a.tone(bus, { wave: o.wave || 'pulse25', f0: N(n), dur: (o.len || step * 1.6), vol: o.vol || 0.12, delay: i * step });
    if (o.echo) a.tone(bus, { wave: 'pulse12', f0: N(n) * 2, dur: step * 1.2, vol: (o.vol || 0.12) * 0.3, delay: i * step + 0.02 });
  });
}

export const RECIPES = {
  step(a, b, o) {
    const surf = o.surface || 'grass';
    const f = surf === 'stone' ? 3200 : surf === 'wood' ? 1200 : surf === 'water' ? 900 : 1800;
    a.noiseBurst(b, { filter: 'bandpass', f0: jit(f, 0.2), dur: 0.035, vol: surf === 'water' ? 0.07 : 0.045, q: 1.2 });
  },
  swing(a, b, o) {
    const big = o.combo === 2;
    a.noiseBurst(b, { filter: 'bandpass', f0: big ? 500 : 900, f1: big ? 2500 : 3800, dur: big ? 0.18 : 0.11, vol: big ? 0.22 : 0.16, q: 1.5 });
    a.tone(b, { type: 'triangle', f0: jit(big ? 300 : 500), f1: big ? 900 : 1300, dur: 0.08, vol: 0.05 });
  },
  spin(a, b) {
    a.noiseBurst(b, { filter: 'bandpass', f0: 400, f1: 3500, dur: 0.3, vol: 0.25, q: 2 });
    a.tone(b, { wave: 'pulse25', f0: 330, f1: 1320, dur: 0.25, vol: 0.08 });
  },
  hit(a, b, o) {
    a.tone(b, { type: 'square', f0: jit(o.heavy ? 220 : 320), f1: 55, dur: o.heavy ? 0.18 : 0.1, vol: 0.14 });
    a.noiseBurst(b, { filter: 'lowpass', f0: 3500, f1: 400, dur: o.heavy ? 0.16 : 0.09, vol: 0.28 });
  },
  clank(a, b) {
    a.tone(b, { type: 'square', f0: jit(1560, 0.03), dur: 0.18, vol: 0.08 });
    a.tone(b, { type: 'square', f0: jit(2340, 0.03), dur: 0.12, vol: 0.05 });
    a.noiseBurst(b, { filter: 'highpass', f0: 4000, dur: 0.06, vol: 0.15 });
  },
  hurt(a, b) {
    a.tone(b, { wave: 'pulse25', f0: 620, f1: 140, dur: 0.28, vol: 0.18, vib: 30, vibRate: 25, vibDelay: 0.01 });
    a.noiseBurst(b, { filter: 'lowpass', f0: 2000, dur: 0.12, vol: 0.15 });
  },
  enemyHurt(a, b) {
    a.tone(b, { wave: 'pulse12', f0: jit(500), f1: 250, dur: 0.1, vol: 0.08 });
  },
  enemyDie(a, b) {
    a.noiseBurst(b, { filter: 'lowpass', f0: 2500, f1: 150, dur: 0.35, vol: 0.28 });
    a.tone(b, { type: 'square', f0: jit(440), f1: 70, dur: 0.3, vol: 0.1 });
  },
  dash(a, b) {
    a.noiseBurst(b, { filter: 'bandpass', f0: 350, f1: 1800, dur: 0.16, vol: 0.14, q: 1.2 });
  },
  coin(a, b) {
    a.tone(b, { wave: 'pulse25', f0: N('B5'), dur: 0.07, vol: 0.09 });
    a.tone(b, { wave: 'pulse25', f0: N('E6'), dur: 0.18, vol: 0.09, delay: 0.06 });
  },
  heart(a, b) { jingle(a, b, ['C5', 'E5', 'G5', 'C6'], { wave: 'pulse12', step: 0.05, vol: 0.1 }); },
  pickup(a, b) { jingle(a, b, ['A5', 'E6'], { step: 0.06, vol: 0.09 }); },
  item(a, b) {
    jingle(a, b, ['G4', 'B4', 'D5', 'G5', null, 'F#5', 'G5'], { step: 0.09, vol: 0.12, echo: true });
    a.tone(b, { type: 'triangle', f0: N('G3'), dur: 0.8, vol: 0.18, delay: 0.36 });
  },
  bigItem(a, b) {
    jingle(a, b, ['D5', 'F#5', 'A5', 'D6', null, 'C6', 'D6', null, 'A5', 'D6'], { step: 0.1, vol: 0.12, echo: true });
    a.tone(b, { type: 'triangle', f0: N('D3'), dur: 1.2, vol: 0.2, delay: 0.4 });
  },
  chest(a, b) {
    a.tone(b, { type: 'sawtooth', f0: 90, f1: 150, dur: 0.35, vol: 0.05, lin: true });
    a.noiseBurst(b, { filter: 'lowpass', f0: 600, dur: 0.2, vol: 0.12 });
  },
  door(a, b) {
    a.noiseBurst(b, { filter: 'lowpass', f0: 500, f1: 80, dur: 0.35, vol: 0.3 });
    a.tone(b, { type: 'square', f0: 90, f1: 55, dur: 0.25, vol: 0.08 });
  },
  unlock(a, b) {
    a.noiseBurst(b, { filter: 'highpass', f0: 3000, dur: 0.04, vol: 0.2 });
    a.tone(b, { wave: 'pulse25', f0: N('E6'), dur: 0.1, vol: 0.08, delay: 0.05 });
    a.tone(b, { wave: 'pulse25', f0: N('A6'), dur: 0.2, vol: 0.08, delay: 0.12 });
  },
  gate(a, b) {
    a.noiseBurst(b, { filter: 'lowpass', f0: 300, f1: 90, dur: 0.7, vol: 0.3 });
    for (let i = 0; i < 5; i++) a.noiseBurst(b, { filter: 'highpass', f0: 2500, dur: 0.03, vol: 0.06, delay: i * 0.1 });
  },
  fuse(a, b) { a.noiseBurst(b, { filter: 'highpass', f0: 5000, dur: 0.05, vol: 0.06 }); },
  bombPlace(a, b) { a.tone(b, { type: 'triangle', f0: 200, f1: 120, dur: 0.1, vol: 0.15 }); },
  explosion(a, b) {
    a.noiseBurst(b, { filter: 'lowpass', f0: 2200, f1: 80, dur: 0.9, vol: 0.55 });
    a.tone(b, { type: 'sine', f0: 140, f1: 30, dur: 0.6, vol: 0.5 });
    a.tone(b, { type: 'square', f0: 80, f1: 30, dur: 0.3, vol: 0.12 });
  },
  arrow(a, b) {
    a.noiseBurst(b, { filter: 'bandpass', f0: 2500, f1: 900, dur: 0.1, vol: 0.12, q: 2 });
    a.tone(b, { type: 'triangle', f0: 900, f1: 400, dur: 0.08, vol: 0.06 });
  },
  arrowHit(a, b) {
    a.noiseBurst(b, { filter: 'lowpass', f0: 1200, dur: 0.05, vol: 0.18 });
    a.tone(b, { type: 'square', f0: 180, f1: 90, dur: 0.05, vol: 0.06 });
  },
  magic(a, b) {
    [0, 1, 2, 3].forEach((i) => a.tone(b, { type: 'sine', f0: N(['E5', 'B5', 'E6', 'G#6'][i]), dur: 0.2, vol: 0.08, delay: i * 0.04 }));
  },
  cast(a, b) {
    a.tone(b, { type: 'triangle', f0: 300, f1: 1200, dur: 0.35, vol: 0.12 });
    a.tone(b, { wave: 'pulse12', f0: 600, f1: 2400, dur: 0.3, vol: 0.04, delay: 0.05 });
  },
  orb(a, b) { a.tone(b, { type: 'sine', f0: 900, f1: 300, dur: 0.2, vol: 0.1, vib: 40, vibRate: 30 }); },
  teleport(a, b) {
    a.tone(b, { type: 'sine', f0: 250, f1: 1500, dur: 0.22, vol: 0.14 });
    a.noiseBurst(b, { filter: 'bandpass', f0: 1000, f1: 5000, dur: 0.2, vol: 0.08 });
  },
  lightBlade(a, b) {
    a.tone(b, { wave: 'pulse25', f0: N('E6'), f1: N('E5'), dur: 0.25, vol: 0.1 });
    a.tone(b, { type: 'sine', f0: N('B6'), dur: 0.3, vol: 0.06 });
  },
  slimeJump(a, b) { a.tone(b, { type: 'sine', f0: jit(170), f1: 430, dur: 0.14, vol: 0.14 }); },
  slimeLand(a, b) {
    a.tone(b, { type: 'sine', f0: 220, f1: 70, dur: 0.12, vol: 0.14 });
    a.noiseBurst(b, { filter: 'lowpass', f0: 500, dur: 0.08, vol: 0.1 });
  },
  bat(a, b) {
    a.noiseBurst(b, { filter: 'bandpass', f0: 1400, dur: 0.04, vol: 0.06 });
    a.noiseBurst(b, { filter: 'bandpass', f0: 1200, dur: 0.04, vol: 0.05, delay: 0.07 });
  },
  screech(a, b) { a.tone(b, { type: 'sawtooth', f0: 1800, f1: 2600, dur: 0.12, vol: 0.04, vib: 200, vibRate: 40, vibDelay: 0.01 }); },
  rattle(a, b) { for (let i = 0; i < 4; i++) a.noiseBurst(b, { filter: 'highpass', f0: 2500 + i * 400, dur: 0.025, vol: 0.08, delay: i * 0.045 }); },
  windup(a, b) { a.tone(b, { type: 'triangle', f0: 200, f1: 600, dur: 0.25, vol: 0.08 }); },
  slam(a, b) {
    a.noiseBurst(b, { filter: 'lowpass', f0: 900, f1: 60, dur: 0.6, vol: 0.5 });
    a.tone(b, { type: 'sine', f0: 90, f1: 28, dur: 0.5, vol: 0.5 });
  },
  stomp(a, b) {
    a.tone(b, { type: 'sine', f0: 70, f1: 35, dur: 0.25, vol: 0.35 });
    a.noiseBurst(b, { filter: 'lowpass', f0: 300, dur: 0.15, vol: 0.2 });
  },
  roar(a, b) {
    a.tone(b, { type: 'sawtooth', f0: 120, f1: 65, dur: 1.4, vol: 0.14, vib: 8, vibRate: 7, vibDelay: 0.05 });
    a.tone(b, { type: 'square', f0: 90, f1: 55, dur: 1.2, vol: 0.06 });
    a.noiseBurst(b, { filter: 'lowpass', f0: 700, f1: 200, dur: 1.2, vol: 0.2, attack: 0.1 });
  },
  laserCharge(a, b) { a.tone(b, { type: 'sawtooth', f0: 100, f1: 900, dur: 0.9, vol: 0.06 }); },
  laser(a, b) {
    a.tone(b, { type: 'sawtooth', f0: 900, f1: 700, dur: 1.2, vol: 0.08, vib: 30, vibRate: 20 });
    a.noiseBurst(b, { filter: 'bandpass', f0: 2000, dur: 1.2, vol: 0.1 });
  },
  uiMove(a, b) { a.tone(b, { wave: 'pulse12', f0: 1320, dur: 0.035, vol: 0.06 }); },
  uiSelect(a, b) {
    a.tone(b, { wave: 'pulse25', f0: N('E6'), dur: 0.05, vol: 0.08 });
    a.tone(b, { wave: 'pulse25', f0: N('B6'), dur: 0.1, vol: 0.08, delay: 0.05 });
  },
  uiBack(a, b) {
    a.tone(b, { wave: 'pulse25', f0: N('B5'), dur: 0.05, vol: 0.07 });
    a.tone(b, { wave: 'pulse25', f0: N('E5'), dur: 0.1, vol: 0.07, delay: 0.05 });
  },
  uiError(a, b) { a.tone(b, { type: 'square', f0: 140, dur: 0.15, vol: 0.08 }); },
  menuOpen(a, b) { a.tone(b, { wave: 'pulse25', f0: 440, f1: 880, dur: 0.1, vol: 0.07 }); },
  blip(a, b, o) { a.tone(b, { wave: 'pulse25', f0: jit(o.pitch || 440, 0.04), dur: 0.03, vol: 0.05 }); },
  checkpoint(a, b) {
    ['G4', 'B4', 'D5', 'G5', 'B5'].forEach((n, i) => a.tone(b, { type: 'triangle', f0: N(n), dur: 1.2 - i * 0.1, vol: 0.12, delay: i * 0.09 }));
    a.noiseBurst(b, { filter: 'lowpass', f0: 1500, dur: 0.6, vol: 0.12, attack: 0.1 });
  },
  secret(a, b) { jingle(a, b, ['D5', 'A5', 'F#5', 'D6', null, 'C#6', 'E6', 'A6'], { step: 0.09, vol: 0.1, echo: true }); },
  potion(a, b) { for (let i = 0; i < 4; i++) a.tone(b, { type: 'sine', f0: jit(500 + i * 180, 0.1), f1: 900 + i * 200, dur: 0.07, vol: 0.1, delay: i * 0.09 }); },
  heal(a, b) { jingle(a, b, ['C5', 'G5', 'E6'], { wave: 'pulse12', step: 0.07, vol: 0.08 }); },
  break(a, b) {
    a.noiseBurst(b, { filter: 'highpass', f0: 1200, dur: 0.18, vol: 0.2 });
    a.tone(b, { type: 'square', f0: jit(900), f1: 400, dur: 0.06, vol: 0.05 });
    a.tone(b, { type: 'square', f0: jit(1300), f1: 700, dur: 0.05, vol: 0.04, delay: 0.04 });
  },
  cut(a, b) { a.noiseBurst(b, { filter: 'bandpass', f0: jit(3000), dur: 0.08, vol: 0.12, q: 1.5 }); },
  rockBreak(a, b) {
    a.noiseBurst(b, { filter: 'lowpass', f0: 1200, f1: 100, dur: 0.4, vol: 0.4 });
    a.tone(b, { type: 'square', f0: 110, f1: 50, dur: 0.2, vol: 0.1 });
  },
  lowHp(a, b) {
    a.tone(b, { wave: 'pulse25', f0: 880, dur: 0.07, vol: 0.05 });
    a.tone(b, { wave: 'pulse25', f0: 880, dur: 0.07, vol: 0.04, delay: 0.14 });
  },
  chargeReady(a, b) {
    a.tone(b, { wave: 'pulse12', f0: N('E6'), dur: 0.08, vol: 0.08 });
    a.tone(b, { wave: 'pulse12', f0: N('B6'), dur: 0.15, vol: 0.08, delay: 0.06 });
  },
  charging(a, b) { a.tone(b, { type: 'triangle', f0: 300, f1: 700, dur: 0.5, vol: 0.05 }); },
  fall(a, b) { a.tone(b, { wave: 'pulse25', f0: 700, f1: 90, dur: 0.6, vol: 0.12 }); },
  splash(a, b) { a.noiseBurst(b, { filter: 'lowpass', f0: 2500, f1: 300, dur: 0.35, vol: 0.2 }); },
  sizzle(a, b) { a.noiseBurst(b, { filter: 'highpass', f0: 3000, dur: 0.4, vol: 0.12 }); },
  push(a, b) { a.noiseBurst(b, { filter: 'lowpass', f0: 250, dur: 0.3, vol: 0.25 }); },
  switch(a, b) {
    a.noiseBurst(b, { filter: 'highpass', f0: 2500, dur: 0.03, vol: 0.2 });
    a.tone(b, { wave: 'pulse25', f0: 660, dur: 0.06, vol: 0.08, delay: 0.03 });
    a.tone(b, { wave: 'pulse25', f0: 990, dur: 0.08, vol: 0.08, delay: 0.09 });
  },
  crystal(a, b) {
    a.tone(b, { type: 'sine', f0: N('A6'), dur: 0.4, vol: 0.1 });
    a.tone(b, { type: 'sine', f0: N('E7'), dur: 0.3, vol: 0.05, delay: 0.03 });
  },
  torch(a, b) {
    a.noiseBurst(b, { filter: 'bandpass', f0: 800, f1: 3000, dur: 0.3, vol: 0.12 });
    a.tone(b, { type: 'triangle', f0: 400, f1: 800, dur: 0.2, vol: 0.05 });
  },
  bossDie(a, b) {
    a.noiseBurst(b, { filter: 'lowpass', f0: 3000, f1: 60, dur: 2.5, vol: 0.5 });
    a.tone(b, { type: 'sawtooth', f0: 300, f1: 40, dur: 2.2, vol: 0.12 });
    a.tone(b, { type: 'sine', f0: 100, f1: 25, dur: 2.0, vol: 0.4 });
  },
  victory(a, b) {
    jingle(a, b, ['G4', 'C5', 'E5', 'G5', null, 'F5', 'A5', null, 'G5', 'B5', null, null, 'C6'], { step: 0.11, vol: 0.12, echo: true });
    a.tone(b, { type: 'triangle', f0: N('C3'), dur: 1.6, vol: 0.18, delay: 0.9 });
  },
  death(a, b) {
    jingle(a, b, ['E5', 'D5', 'C5', 'B4', 'A4', null, 'E4'], { step: 0.16, vol: 0.12, len: 0.3 });
    a.tone(b, { type: 'triangle', f0: N('A2'), dur: 1.8, vol: 0.18, delay: 0.8 });
  },
  drip(a, b) { a.tone(b, { type: 'sine', f0: jit(1900, 0.2), f1: 800, dur: 0.06, vol: 0.05 }); },
  bird(a, b) {
    const f = jit(2600, 0.15);
    a.tone(b, { type: 'sine', f0: f, f1: f * 1.3, dur: 0.06, vol: 0.03 });
    a.tone(b, { type: 'sine', f0: f * 1.1, f1: f * 0.9, dur: 0.07, vol: 0.03, delay: 0.09 });
  },
  thunder(a, b) { a.noiseBurst(b, { filter: 'lowpass', f0: 400, f1: 60, dur: 2.4, vol: 0.35, attack: 0.05 }); },
  bubble(a, b) { a.tone(b, { type: 'sine', f0: jit(110, 0.2), f1: 60, dur: 0.12, vol: 0.08 }); },
  rumble(a, b) { a.noiseBurst(b, { filter: 'lowpass', f0: 200, f1: 60, dur: 1.5, vol: 0.35, attack: 0.2 }); },
  save(a, b) {
    a.tone(b, { type: 'triangle', f0: N('E5'), dur: 0.15, vol: 0.08 });
    a.tone(b, { type: 'triangle', f0: N('A5'), dur: 0.25, vol: 0.08, delay: 0.1 });
  },
  whoosh(a, b) { a.noiseBurst(b, { filter: 'bandpass', f0: 200, f1: 1200, dur: 0.5, vol: 0.12, attack: 0.15 }); },
};

export class Sfx {
  constructor(engine) {
    this.a = engine;
    this.last = new Map();
    this.active = 0;
  }

  play(name, opts = {}) {
    const a = this.a;
    if (!a.ready || !a.ctx || a.sfxVolume <= 0) return;
    const r = RECIPES[name];
    if (!r) return;
    const now = a.ctx.currentTime;
    const gap = MIN_GAP[name] || 0.015;
    const prev = this.last.get(name) || 0;
    if (now - prev < gap) return;
    this.last.set(name, now);
    let bus = a.sfxBus;
    if (opts.vol != null && opts.vol !== 1) {
      bus = a.ctx.createGain();
      bus.gain.value = opts.vol;
      bus.connect(a.sfxBus);
      setTimeout(() => bus.disconnect(), 4000);
    }
    try {
      r(a, bus, opts);
    } catch {
      /* ignore audio scheduling glitches */
    }
  }
}
