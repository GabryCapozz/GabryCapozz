// Chiptune sequencer: chord-driven accompaniment + hand-written melodies,
// with intensity layers (used by boss fights) and cross-fades between tracks.
import { midiToFreq, noteToMidi } from './engine.js';
import { TRACKS } from './tracks.js';

const QUALITIES = {
  '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11],
  sus2: [0, 2, 7], sus4: [0, 5, 7], dim: [0, 3, 6], 5: [0, 7], add9: [0, 4, 7, 14], m9: [0, 3, 7, 14], aug: [0, 4, 8],
};

function parseChord(tok, barLen) {
  const [name, lenStr] = tok.split(':');
  const m = /^([A-G][#b]?)(.*)$/.exec(name);
  const root = noteToMidi(m[1] + '2');
  const q = QUALITIES[m[2]] || QUALITIES[''];
  return { root, tones: q, len: lenStr ? parseInt(lenStr, 10) : barLen };
}

function parseNotes(str) {
  const out = [];
  let t = 0, last = 4;
  for (const tok of str.trim().split(/\s+/)) {
    if (tok === '|' || !tok) continue;
    const [n, l] = tok.split(':');
    const len = l ? parseInt(l, 10) : last;
    last = len;
    if (n !== 'r') out.push({ step: t, midi: noteToMidi(n), len });
    t += len;
  }
  return { events: out, length: t };
}

function bassEvents(chords, style, octave = 0) {
  const ev = [];
  let s = 0;
  for (const c of chords) {
    const r = c.root + octave * 12;
    const fifth = r + 7;
    const push = (step, midi, len) => { if (step < s + c.len) ev.push({ step, midi, len: Math.min(len, s + c.len - step) }); };
    switch (style) {
      case 'long': push(s, r, c.len); break;
      case 'root4': for (let i = 0; i < c.len; i += 4) push(s + i, r, 3); break;
      case 'root8': for (let i = 0; i < c.len; i += 2) push(s + i, r, 2); break;
      case 'octave8': for (let i = 0; i < c.len; i += 2) push(s + i, (i / 2) % 2 ? r + 12 : r, 2); break;
      case 'drive': for (let i = 0; i < c.len; i += 2) push(s + i, i >= c.len - 4 && i % 4 === 2 ? fifth : r, 2); break;
      case 'waltz': for (let i = 0; i < c.len; i += 12) { push(s + i, r, 4); push(s + i + 4, fifth, 3); push(s + i + 8, r + 12, 3); } break;
      case 'rootFifth': push(s, r, c.len / 2); push(s + c.len / 2, fifth, c.len / 2); break;
      case 'walk': {
        const tones = [r, r + c.tones[1], fifth, r + 12];
        for (let i = 0; i < c.len; i += 4) push(s + i, tones[(i / 4) % 4], 3);
        break;
      }
      case 'pulse': for (let i = 0; i < c.len; i += 8) { push(s + i, r, 3); push(s + i + 3, r, 1); push(s + i + 6, r + 12, 2); } break;
      default: push(s, r, c.len);
    }
    s += c.len;
  }
  return ev;
}

function arpEvents(chords, style, octave = 2) {
  const ev = [];
  let s = 0;
  for (const c of chords) {
    const base = c.root + octave * 12;
    const tones = c.tones.map((i) => base + i);
    const ext = [...tones, base + 12];
    switch (style) {
      case 'up16': for (let i = 0; i < c.len; i++) ev.push({ step: s + i, midi: ext[i % ext.length], len: 1 }); break;
      case 'updown8': {
        const seq = [...ext, ...ext.slice(1, -1).reverse()];
        for (let i = 0; i < c.len; i += 2) ev.push({ step: s + i, midi: seq[(i / 2) % seq.length], len: 2 });
        break;
      }
      case 'broken': {
        const seq = [tones[0], tones[2] ?? tones[1], base + 12, tones[1]];
        for (let i = 0; i < c.len; i++) ev.push({ step: s + i, midi: seq[i % 4], len: 1 });
        break;
      }
      case 'pad': for (const m of tones) ev.push({ step: s, midi: m, len: c.len }); break;
      case 'stab': for (let i = 4; i < c.len; i += 8) for (const m of tones) ev.push({ step: s + i, midi: m, len: 2 }); break;
      case 'bells': for (let i = 0; i < c.len; i += 4) ev.push({ step: s + i, midi: ext[(i / 4) % ext.length] + 12, len: 3 }); break;
      default: break;
    }
    s += c.len;
  }
  return ev;
}

function drumEvents(pattern, totalLen, fill) {
  const ev = [];
  const p = pattern.replace(/\s/g, '');
  const f = fill ? fill.replace(/\s/g, '') : null;
  for (let s = 0; s < totalLen; s++) {
    const inLastBar = f && s >= totalLen - f.length;
    const ch = inLastBar ? f[s - (totalLen - f.length)] : p[s % p.length];
    if (ch && ch !== '.') ev.push({ step: s, drum: ch });
  }
  return ev;
}

export function compileTrack(def) {
  const bar = def.bar || 16;
  const chords = def.chords.trim().split(/\s+/).filter((t) => t !== '|').map((t) => parseChord(t, bar));
  const length = chords.reduce((a, c) => a + c.len, 0);
  const channels = def.channels.map((ch) => {
    let events;
    if (ch.notes) {
      const parsed = parseNotes(ch.notes);
      events = parsed.events;
      if (parsed.length !== length && typeof console !== 'undefined') console.warn(`track ${def.name}/${ch.name}: melody ${parsed.length} != ${length}`);
    } else if (ch.bass) events = bassEvents(chords, ch.bass, ch.octave || 0);
    else if (ch.arp) events = arpEvents(chords, ch.arp, ch.octave ?? 2);
    else if (ch.drums) events = drumEvents(ch.drums, length, ch.fill);
    else events = [];
    const byStep = new Map();
    for (const e of events) {
      if (!byStep.has(e.step)) byStep.set(e.step, []);
      byStep.get(e.step).push(e);
    }
    return { ...ch, byStep };
  });
  return { ...def, bar, length, channels, stepDur: 60 / def.bpm / 4 };
}

const compiled = new Map();

export class Music {
  constructor(engine) {
    this.a = engine;
    this.current = null;
    this.intensity = 0;
    this.timer = null;
  }

  get(name) {
    let c = compiled.get(name);
    if (!c && TRACKS[name]) {
      c = compileTrack({ name, ...TRACKS[name] });
      compiled.set(name, c);
    }
    return c;
  }

  play(name, fade = 1.0) {
    this.wanted = name;
    if (!this.a.ready) return;
    if (this.current && this.current.name === name && !this.current.stopping) return;
    this.stop(fade);
    if (!name) return;
    const track = this.get(name);
    if (!track) return;
    const ctx = this.a.ctx;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, ctx.currentTime);
    out.gain.linearRampToValueAtTime(track.gain || 1, ctx.currentTime + Math.max(0.05, fade * 0.6));
    out.connect(this.a.musicBus);
    let dest = out;
    if (track.echo) {
      const input = ctx.createGain();
      const delay = ctx.createDelay(1.0);
      delay.delayTime.value = track.echo.time;
      const fb = ctx.createGain();
      fb.gain.value = track.echo.fb;
      const wet = ctx.createGain();
      wet.gain.value = track.echo.mix;
      input.connect(out);
      input.connect(delay);
      delay.connect(fb);
      fb.connect(delay);
      delay.connect(wet);
      wet.connect(out);
      dest = input;
    }
    this.current = { name, track, out, dest, step: 0, next: ctx.currentTime + 0.08, stopping: false };
    if (!this.timer) this.timer = setInterval(() => this.update(), 25);
  }

  stop(fade = 1.0) {
    const c = this.current;
    if (!c) return;
    c.stopping = true;
    const ctx = this.a.ctx;
    const t = ctx.currentTime;
    c.out.gain.cancelScheduledValues(t);
    c.out.gain.setValueAtTime(c.out.gain.value, t);
    c.out.gain.linearRampToValueAtTime(0.0001, t + Math.max(0.05, fade));
    const out = c.out;
    setTimeout(() => out.disconnect(), (fade + 0.5) * 1000);
    this.current = null;
  }

  setIntensity(n) {
    this.intensity = n;
  }

  // Called on an interval: schedule notes slightly ahead of time.
  update() {
    const c = this.current;
    if (!c || !this.a.ready) return;
    const ctx = this.a.ctx;
    const tr = c.track;
    if (c.next < ctx.currentTime - 0.3) c.next = ctx.currentTime + 0.05; // tab was asleep
    while (c.next < ctx.currentTime + 0.15) {
      this.scheduleStep(c, c.step, c.next);
      const swing = tr.swing && c.step % 2 === 0 ? tr.swing : tr.swing ? -tr.swing : 0;
      c.next += tr.stepDur * (1 + swing);
      c.step = (c.step + 1) % tr.length;
    }
  }

  scheduleStep(c, step, t) {
    const a = this.a;
    for (const ch of c.track.channels) {
      if ((ch.layer || 0) > this.intensity) continue;
      if (ch.maxLayer != null && this.intensity > ch.maxLayer) continue;
      const evs = ch.byStep.get(step);
      if (!evs) continue;
      for (const e of evs) {
        if (e.drum) { this.drum(c.dest, e.drum, t, ch.vol || 1); continue; }
        const dur = e.len * c.track.stepDur * (ch.gate || 0.9);
        const midi = e.midi + (ch.transpose || 0);
        a.tone(c.dest, {
          at: t, wave: ch.wave && ch.wave.startsWith('pulse') ? ch.wave : null, type: ch.wave && !ch.wave.startsWith('pulse') ? ch.wave : 'square',
          f0: midiToFreq(midi), dur, vol: ch.vol || 0.08, attack: ch.attack ?? 0.006,
          sustain: ch.sustain ?? 0.65, decay: ch.decay ?? 0.08, release: 0.04,
          vib: ch.vib || 0, vibRate: 5.5, vibDelay: 0.18,
        });
      }
    }
  }

  drum(dest, d, t, vol) {
    const a = this.a;
    switch (d) {
      case 'k': case 'K':
        a.tone(dest, { at: t, type: 'sine', f0: d === 'K' ? 170 : 140, f1: 38, dur: 0.16, vol: 0.5 * vol });
        break;
      case 's':
        a.noiseBurst(dest, { at: t, filter: 'bandpass', f0: 1900, dur: 0.12, vol: 0.22 * vol, q: 0.7 });
        a.tone(dest, { at: t, type: 'triangle', f0: 190, f1: 120, dur: 0.08, vol: 0.12 * vol });
        break;
      case 'h':
        a.noiseBurst(dest, { at: t, filter: 'highpass', f0: 7500, dur: 0.035, vol: 0.07 * vol });
        break;
      case 'o':
        a.noiseBurst(dest, { at: t, filter: 'highpass', f0: 6500, dur: 0.14, vol: 0.07 * vol });
        break;
      case 't':
        a.tone(dest, { at: t, type: 'triangle', f0: 130, f1: 70, dur: 0.18, vol: 0.28 * vol });
        break;
      case 'T':
        a.tone(dest, { at: t, type: 'triangle', f0: 200, f1: 110, dur: 0.15, vol: 0.24 * vol });
        break;
      case 'c':
        a.noiseBurst(dest, { at: t, filter: 'highpass', f0: 3500, dur: 0.6, vol: 0.12 * vol });
        break;
      case 'm': // metallic clank (mines)
        a.tone(dest, { at: t, type: 'square', f0: 1250, dur: 0.05, vol: 0.05 * vol });
        a.tone(dest, { at: t, type: 'square', f0: 1830, dur: 0.04, vol: 0.03 * vol });
        break;
      default: break;
    }
  }
}
