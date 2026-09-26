// Effect sprites: sword arcs, impacts, smoke, explosions, projectiles, shadows.
import { PixelArt, paint, col } from '../pixel.js';
import { P } from '../palette.js';
import { angleDiff, mulberry32, TAU } from '../../core/math.js';

const arcCache = new Map();
export const ARC_ANGLES = 16;

export const ARC_PALETTES = {
  player: [P.white, P.cyan, P.blue],
  heavy: [P.white, P.yellow, P.orange],
  enemy: [P.white, P.salmon, P.red],
  dark: [P.pink, P.purple, P.plum],
  light: [P.white, P.yellow, P.gold],
};

// Crescent sword smear. frame 0..2, cw = swing direction.
export function slashArc(angle, frame, opts = {}) {
  const { span = 2.5, rIn = 6, rOut = 19, cw = true, pal = 'player' } = opts;
  const idx = ((Math.round((angle / TAU) * ARC_ANGLES) % ARC_ANGLES) + ARC_ANGLES) % ARC_ANGLES;
  const key = `${idx}:${frame}:${span}:${rIn}:${rOut}:${cw}:${pal}`;
  let c = arcCache.get(key);
  if (c) return c;
  const a0 = (idx / ARC_ANGLES) * TAU;
  const size = (rOut + 2) * 2;
  const p = new PixelArt(size, size);
  const colors = ARC_PALETTES[pal];
  const ranges = [[0, 0.6], [0.05, 1], [0.5, 1]];
  const [t0, t1] = ranges[frame];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - size / 2, dy = y + 0.5 - size / 2;
      const r = Math.hypot(dx, dy);
      if (r > rOut || r < rIn - 1) continue;
      const rel = angleDiff(a0, Math.atan2(dy, dx));
      if (Math.abs(rel) > span / 2) continue;
      let t = (rel + span / 2) / span;
      if (!cw) t = 1 - t;
      if (t < t0 || t > t1) continue;
      const local = (t - t0) / (t1 - t0);
      const thick = (rOut - rIn) * Math.pow(Math.sin(Math.PI * Math.min(1, local * 1.1)), 0.6) * (frame === 2 ? 0.45 : 1);
      const inner = rOut - thick;
      if (r < inner) continue;
      const k = (r - inner) / Math.max(1, thick);
      let cc = k > 0.72 ? colors[0] : k > 0.35 ? colors[1] : colors[2];
      if (frame === 2) cc = k > 0.6 ? colors[1] : colors[2];
      p.px(x, y, cc);
    }
  }
  c = p.toCanvas();
  arcCache.set(key, c);
  return c;
}

function star(size) {
  return paint(size, size, (p) => {
    const c = size >> 1;
    for (let i = 0; i <= c; i++) {
      const col2 = i < 2 ? P.white : P.yellow;
      p.px(c + i, c, col2); p.px(c - i, c, col2); p.px(c, c + i, col2); p.px(c, c - i, col2);
    }
    p.px(c + 1, c + 1, P.white); p.px(c - 1, c - 1, P.white); p.px(c + 1, c - 1, P.white); p.px(c - 1, c + 1, P.white);
  });
}

function smoke(frame, dark) {
  return paint(16, 16, (p) => {
    const r = 3 + frame * 1.5;
    const base = dark ? P.slate : P.silver, edge = dark ? P.navy : P.gray;
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const d = Math.hypot(x + 0.5 - 8, y + 0.5 - 8);
      if (d > r) continue;
      if (frame >= 2 && (x + y) % 2 === 0) continue;
      if (frame === 3 && (x % 2 === 0)) continue;
      p.px(x, y, d > r - 1.5 ? edge : base);
    }
  });
}

function explosion(frame) {
  const size = 48;
  const rng = mulberry32(frame * 13 + 1);
  return paint(size, size, (p) => {
    const c = size / 2;
    if (frame === 0) { p.circle(c, c, 10, P.white); p.circle(c, c, 6, P.yellow); return; }
    const r = [0, 16, 20, 22, 22, 20][frame];
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const d = Math.hypot(x + 0.5 - c, y + 0.5 - c) + (rng() - 0.5) * 4;
      if (d > r) continue;
      const k = d / r;
      let cc;
      if (frame <= 2) cc = k < 0.35 ? P.white : k < 0.6 ? P.yellow : k < 0.85 ? P.orange : P.rust;
      else if (frame === 3) cc = k < 0.4 ? P.orange : k < 0.7 ? P.rust : k > 0.85 ? P.steel : P.slate;
      else { if ((x + y + frame) % 2 === 0 || k < 0.5) continue; cc = k < 0.8 ? P.steel : P.slate; }
      p.px(x, y, cc);
    }
  });
}

function shadow(w, h) {
  const p = new PixelArt(w, h);
  const c = col(P.ink, 110);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (x + 0.5 - w / 2) / (w / 2), dy = (y + 0.5 - h / 2) / (h / 2);
    if (dx * dx + dy * dy <= 1) p.data[y * w + x] = c;
  }
  return p.toCanvas();
}

const arrowCache = new Map();
export function arrowSprite(angle, kind = 'arrow') {
  const idx = ((Math.round((angle / TAU) * 16) % 16) + 16) % 16;
  const key = kind + idx;
  let c = arrowCache.get(key);
  if (c) return c;
  const a = (idx / 16) * TAU;
  const ca = Math.cos(a), sa = Math.sin(a);
  c = paint(16, 16, (p) => {
    const cols = kind === 'arrow' ? [P.silver, P.tan, P.white] : kind === 'bolt' ? [P.white, P.cyan, P.blue] : [P.salmon, P.red, P.redD];
    for (let i = -6; i <= 6; i++) {
      const x = 8 + ca * i, y = 8 + sa * i;
      p.px(x, y, i > 3 ? cols[0] : i < -4 ? cols[2] : cols[1]);
    }
    if (kind === 'arrow') {
      p.px(8 + ca * 6 - sa, 8 + sa * 6 + ca, P.gray);
      p.px(8 + ca * 6 + sa, 8 + sa * 6 - ca, P.gray);
      p.px(8 - ca * 6 - sa, 8 - sa * 6 + ca, P.white);
      p.px(8 - ca * 6 + sa, 8 - sa * 6 - ca, P.white);
    }
  }, kind === 'arrow' ? null : null);
  arrowCache.set(key, c);
  return c;
}

function orb(frame, cols) {
  return paint(12, 12, (p) => {
    const r = 3.5 + (frame % 2) * 0.8;
    p.circle(6, 6, r + 1, cols[2]);
    p.circle(6, 6, r, cols[1]);
    p.circle(6, 6, r - 1.8, cols[0]);
    p.px(5, 4, P.white);
  });
}

function bubble(ch) {
  return paint(10, 12, (p) => {
    p.rect(1, 0, 8, 9, P.white);
    p.rect(0, 1, 10, 7, P.white);
    p.px(4, 9, P.white); p.px(3, 10, P.white);
    if (ch === '!') { p.vline(4, 1, 4, P.red); p.vline(5, 1, 4, P.red); p.rect(4, 6, 2, 1, P.red); }
    else if (ch === '?') { p.hline(3, 1, 4, P.blueD); p.px(6, 2, P.blueD); p.px(5, 3, P.blueD); p.px(4, 4, P.blueD); p.px(4, 6, P.blueD); }
    else if (ch === '...') { p.px(2, 4, P.slate); p.px(5, 4, P.slate); p.px(8, 4, P.slate); }
  }, P.ink);
}

function sparkle(frame) {
  return paint(7, 7, (p) => {
    if (frame === 0) { p.px(3, 3, P.white); }
    else if (frame === 1) { p.px(3, 2, P.yellow); p.px(3, 4, P.yellow); p.px(2, 3, P.yellow); p.px(4, 3, P.yellow); p.px(3, 3, P.white); }
    else { p.vline(3, 0, 7, P.yellow); p.hline(0, 3, 7, P.yellow); p.px(3, 3, P.white); }
  });
}

function shockRingFrame(r) {
  const size = r * 2 + 4;
  return paint(size, size, (p) => {
    p.ring(size / 2, size / 2, r, P.silver, 2);
    p.ring(size / 2, size / 2, r - 2, P.steel, 1);
  });
}

function rockProjectile() {
  return paint(14, 14, (p) => {
    p.circle(7, 7, 5.5, P.steel);
    p.circle(6, 6, 3, P.gray);
    p.px(5, 4, P.silver);
    for (let y = 8; y < 14; y++) for (let x = 7; x < 14; x++) if (p.alpha(x, y)) p.px(x, y, P.slate);
  }, P.ink);
}

function acidOrb(frame) {
  return paint(12, 12, (p) => {
    const r = 4 + (frame % 2) * 0.6;
    p.circle(6, 6, r, P.greenL);
    p.circle(6, 7, r - 1.5, P.green);
    p.px(4, 4, P.white); p.px(5, 4, '#a8e070');
  }, P.greenD);
}

function puddle(frame) {
  return paint(20, 10, (p) => {
    p.ellipse(10, 5, 9 - frame, 4 - frame * 0.4, P.green);
    p.ellipse(9, 4, 5 - frame, 2, P.greenL);
    p.px(7, 3, P.white);
  });
}

function zzz() {
  return paint(8, 8, (p) => { p.hline(1, 1, 4, P.silver); p.px(4, 2, P.silver); p.px(3, 3, P.silver); p.px(2, 4, P.silver); p.hline(1, 5, 4, P.silver); });
}

export function buildFx() {
  return {
    star: [star(11), star(7)],
    smoke: [0, 1, 2, 3].map((f) => smoke(f, false)),
    darkSmoke: [0, 1, 2, 3].map((f) => smoke(f, true)),
    explosion: [0, 1, 2, 3, 4, 5].map(explosion),
    shadow: { s: shadow(8, 3), m: shadow(12, 4), l: shadow(18, 6), xl: shadow(30, 8), boss: shadow(46, 12) },
    orb: [0, 1, 2, 3].map((f) => orb(f, [P.white, P.pink, P.purple])),
    orbCyan: [0, 1, 2, 3].map((f) => orb(f, [P.white, P.cyan, P.blueD])),
    orbFire: [0, 1, 2, 3].map((f) => orb(f, [P.yellow, P.orange, P.rust])),
    orbVoid: [0, 1, 2, 3].map((f) => orb(f, [P.pink, P.purple, P.black])),
    bubble: { alert: bubble('!'), question: bubble('?'), dots: bubble('...') },
    sparkle: [0, 1, 2].map(sparkle),
    rings: [8, 14, 20, 26, 32, 40, 48].map(shockRingFrame),
    rock: rockProjectile(),
    acid: [0, 1].map(acidOrb),
    puddle: [0, 1, 2].map(puddle),
    zzz: zzz(),
  };
}
