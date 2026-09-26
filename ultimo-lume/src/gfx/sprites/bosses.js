// Boss sprite parts. Bosses are assembled from parts at runtime for smooth animation.
import { PixelArt, paint } from '../pixel.js';
import { P } from '../palette.js';
import { mulberry32 } from '../../core/math.js';

const O = P.ink;

// Stone texture fill for a rectangle-ish region already masked into p.
function stoneFill(p, rng, pal, glowCracks = false) {
  const { base, light, dark, moss } = pal;
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
    if (!p.alpha(x, y)) continue;
    const n = rng();
    let c = base;
    if (n < 0.07) c = dark;
    else if (n > 0.95) c = light;
    p.px(x, y, c);
  }
  // top-left light edge / bottom-right dark edge
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
    if (!p.alpha(x, y)) continue;
    if (!p.alpha(x, y - 1) || !p.alpha(x - 1, y)) p.px(x, y, light);
    else if (!p.alpha(x, y + 1) || !p.alpha(x + 1, y)) p.px(x, y, dark);
  }
  // cracks
  for (let i = 0; i < 3; i++) {
    let x = (rng() * p.w) | 0, y = (rng() * p.h) | 0;
    for (let k = 0; k < 7; k++) {
      if (p.alpha(x, y)) p.px(x, y, glowCracks ? (k % 2 ? P.orange : P.yellow) : P.navy);
      x += rng() < 0.5 ? 1 : -1;
      y += 1;
    }
  }
  // moss on top surfaces
  if (moss) for (let x = 0; x < p.w; x++) {
    for (let y = 0; y < p.h; y++) {
      if (p.alpha(x, y)) {
        if (rng() < 0.45) { p.px(x, y, moss); if (rng() < 0.4) p.px(x, y + 1, P.greenD); }
        break;
      }
    }
  }
}

function block(w, h, rng, pal, shape = null, glow = false) {
  const p = new PixelArt(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!shape || shape(x, y, w, h)) p.px(x, y, pal.base);
  stoneFill(p, rng, pal, glow);
  return p;
}

const STONE = { base: P.steel, light: P.gray, dark: P.slate, moss: P.green };

export function buildStoneGuardian() {
  const make = (glow) => {
    const rng = mulberry32(glow ? 99 : 42);
    // torso: trapezoid
    const torso = block(46, 36, rng, STONE, (x, y, w, h) => {
      const inset = Math.floor((y / h) * 6);
      return x >= inset && x < w - inset && !(y < 4 && (x < 6 || x > w - 7));
    }, glow);
    // rune lines + core socket
    torso.rect(18, 12, 10, 10, P.navy);
    torso.rect(19, 13, 8, 8, P.black);
    for (let i = 0; i < 4; i++) { torso.px(8 + i * 2, 26, P.navy); torso.px(36 - i * 2, 26, P.navy); }
    torso.hline(10, 28, 26, P.slate);
    torso.outline(O);
    const head = block(24, 20, rng, STONE, (x, y, w, h) => !((y < 3 && (x < 3 || x > w - 4)) || (y > h - 4 && (x < 2 || x > w - 3))), glow);
    head.rect(4, 8, 16, 4, P.black); // eye slit
    head.hline(3, 7, 18, P.slate);
    head.rect(9, 14, 6, 2, P.navy);
    head.outline(O);
    const fist = block(18, 16, rng, STONE, (x, y, w, h) => !((x < 2 || x > w - 3) && (y < 2 || y > h - 3)), glow);
    for (let i = 0; i < 3; i++) fist.vline(4 + i * 4, 1, 5, P.slate);
    fist.outline(O);
    const arm = block(12, 12, rng, STONE, (x, y, w, h) => !((x < 1 || x > w - 2) && (y < 1 || y > h - 2)), glow);
    arm.outline(O);
    const leg = block(14, 12, rng, STONE, null, glow);
    leg.hline(0, 11, 14, P.navy);
    leg.outline(O);
    return { torso: torso.toCanvas(), head: head.toCanvas(), fist: fist.toCanvas(), fistL: fist.flipped().toCanvas(), arm: arm.toCanvas(), leg: leg.toCanvas() };
  };
  const core = [0, 1, 2, 3].map((f) => paint(10, 10, (p) => {
    const r = 3.5 + (f % 2) * 0.7;
    p.circle(5, 5, r + 0.8, P.rust);
    p.circle(5, 5, r, P.orange);
    p.circle(5, 5, r - 1.5, P.yellow);
    p.px(4, 3, P.white);
  }));
  const coreHurt = [0, 1].map((f) => paint(10, 10, (p) => {
    p.circle(5, 5, 4.5, P.redD);
    p.circle(5, 5, 3.5 - f * 0.5, P.red);
    p.circle(5, 5, 1.5, P.salmon);
  }));
  const debris = [0, 1, 2].map((v) => paint(8, 8, (p) => {
    const rng = mulberry32(v + 5);
    p.ellipse(4, 4, 3 + rng(), 2.5 + rng(), P.steel);
    p.px(3, 3, P.gray);
  }, O));
  return { normal: make(false), cracked: make(true), core, coreHurt, debris };
}

// ---------------------------------------------------------------- Deep Horror
export function buildDeepHorror() {
  const rng = mulberry32(1234);
  const body = new PixelArt(96, 52);
  for (let y = 0; y < 52; y++) for (let x = 0; x < 96; x++) {
    const dx = (x + 0.5 - 48) / 46, dy = (y + 0.5 - 46) / 44;
    if (dx * dx + dy * dy > 1 || y > 50) continue;
    const n = rng();
    let c = P.purple;
    if (dy > -0.25) c = P.plum;
    if (n < 0.06) c = P.pink;
    else if (n > 0.95) c = P.black;
    body.px(x, y, c);
  }
  // ridges
  for (let i = 0; i < 7; i++) {
    const x0 = 12 + i * 12;
    for (let y = 8; y < 44; y++) if (body.alpha(x0 + ((y >> 2) % 2), y)) body.px(x0 + ((y >> 2) % 2), y, P.black);
  }
  // suckers
  for (let i = 0; i < 14; i++) {
    const x = 8 + (rng() * 80) | 0, y = 20 + (rng() * 26) | 0;
    if (body.alpha(x, y)) { body.px(x, y, P.salmon); body.px(x + 1, y, P.pink); }
  }
  body.outline(P.ink);
  const segs = [];
  for (let r = 2; r <= 9; r++) {
    segs.push(paint(r * 2 + 3, r * 2 + 3, (p) => {
      const c = r + 1.5;
      p.circle(c, c, r, P.purple);
      p.circle(c - r * 0.3, c - r * 0.3, r * 0.5, P.pink);
      for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) if (p.alpha(x, y) && x + y > c * 2 + r * 0.4) p.px(x, y, P.plum);
      if (r > 4) p.px(c + 1, c + r - 2, P.salmon);
    }, O));
  }
  const tip = paint(9, 11, (p) => {
    p.ellipse(4.5, 6, 3.5, 4.5, P.purple);
    p.px(4, 1, P.pink); p.px(4, 2, P.purple);
    p.px(3, 5, P.pink); p.px(5, 8, P.salmon);
  }, O);
  return { body: body.toCanvas(), segs, tip };
}

// ---------------------------------------------------------------- Corrupted Knight (Ser Aldric)
function knightFrame(dir, pose, pal) {
  const p = new PixelArt(34, 42);
  const bob = pose.bob || 0;
  const side = dir === 'side';
  const cx = 17;
  const feet = 39;
  // cape (behind body unless facing up)
  const cape = (front) => {
    if ((dir === 'up') !== front) return;
    const top = 13 + bob, bottom = feet - 2 + (pose.kneel ? -6 : 0);
    for (let y = top; y <= bottom; y++) {
      const k = (y - top) / (bottom - top);
      const half = (side ? 6 : 9) + k * (side ? 4 : 5);
      const sway = side ? -4 - k * 3 * (pose.walk ? 1 : 0.5) : Math.sin(y * 0.4 + (pose.phase || 0)) * k;
      for (let x = Math.round(cx - half + sway); x <= Math.round(cx + half + sway); x++) {
        const tatter = y > bottom - 3 && (x * 7 + y * 3) % 5 === 0;
        if (tatter) continue;
        p.px(x, y, x < cx + sway - half * 0.4 ? pal.capeL : x > cx + sway + half * 0.5 ? pal.capeD : pal.cape);
      }
    }
  };
  cape(false);
  // legs
  if (pose.kneel) {
    p.rect(cx - 7, feet - 8, 6, 5, pal.metalD); p.rect(cx + 2, feet - 4, 6, 4, pal.metal);
    p.rect(cx - 8, feet - 3, 8, 3, pal.dark);
  } else {
    const st = pose.step || 0;
    const lx = side ? cx - 4 - st * 2 : cx - 6, rx = side ? cx + 1 + st * 2 : cx + 1;
    p.rect(lx, 28 + bob, 5, feet - 28 - bob - (st < 0 ? 1 : 0), side ? pal.metalD : pal.metal);
    p.rect(rx, 28 + bob, 5, feet - 28 - bob - (st > 0 ? 1 : 0), pal.metal);
    p.hline(lx, 33, 5, pal.dark); p.hline(rx, 33, 5, pal.dark);
    p.rect(lx - (side ? 0 : 1), feet - 2, 6 + (side ? 2 : 0), 3, pal.dark);
    p.rect(rx, feet - 2, 6 + (side ? 2 : 0), 3, pal.dark);
    p.vline(lx + 1, 29 + bob, 8, pal.light); p.vline(rx + 1, 29 + bob, 8, pal.light);
  }
  const k = pose.kneel ? 6 : 0;
  // torso
  const tw = side ? 10 : 14;
  p.rect(cx - tw / 2, 15 + bob + k, tw, 13, pal.metal);
  p.rect(cx - tw / 2, 25 + bob + k, tw, 3, pal.dark);
  p.hline(cx - tw / 2, 24 + bob + k, tw, pal.trim);
  p.vline(cx - tw / 2 + 1, 16 + bob + k, 8, pal.light);
  if (dir === 'down') {
    // cracked sun emblem
    p.circle(cx, 19 + bob + k, 2.5, pal.trim);
    p.px(cx, 19 + bob + k, pal.glow);
    p.line(cx + 1, 17 + bob + k, cx + 3, 22 + bob + k, pal.dark);
  }
  // pauldrons
  if (side) { p.ellipse(cx, 15 + bob + k, 6, 3.5, pal.light); p.ellipse(cx, 16 + bob + k, 6, 2.5, pal.metal); }
  else {
    p.ellipse(cx - 9, 16 + bob + k, 5, 3.5, pal.metal); p.ellipse(cx + 9, 16 + bob + k, 5, 3.5, pal.metal);
    p.hline(cx - 12, 13 + bob + k, 5, pal.light); p.hline(cx + 7, 13 + bob + k, 5, pal.light);
    p.px(cx - 13, 14 + bob + k, pal.trim); p.px(cx + 12, 14 + bob + k, pal.trim);
  }
  // arms
  const arm = pose.arm || 'rest';
  const ay = 18 + bob + k;
  if (side) {
    if (arm === 'up') { p.rect(cx - 1, ay - 12, 4, 12, pal.metal); p.rect(cx - 2, ay - 15, 6, 4, pal.dark); }
    else if (arm === 'fwd') { p.rect(cx + 2, ay, 10, 4, pal.metal); p.rect(cx + 11, ay - 1, 4, 5, pal.dark); }
    else if (arm === 'back') { p.rect(cx - 9, ay - 2, 8, 4, pal.metal); p.rect(cx - 12, ay - 3, 4, 5, pal.dark); }
    else { p.rect(cx - 1, ay, 4, 9, pal.metal); p.rect(cx - 1, ay + 8, 5, 4, pal.dark); }
  } else if (arm === 'up') {
    p.rect(cx - 13, ay - 12, 4, 12, pal.metal); p.rect(cx + 9, ay - 12, 4, 12, pal.metal);
    p.rect(cx - 14, ay - 15, 6, 4, pal.dark); p.rect(cx + 8, ay - 15, 6, 4, pal.dark);
  } else if (arm === 'fwd') {
    p.rect(cx - 12, ay, 4, 8, pal.metal); p.rect(cx - 6, ay + 6, 12, 4, pal.metal);
    p.rect(cx - 3, ay + 9, 6, 4, pal.dark);
  } else {
    p.rect(cx - 13, ay, 4, 10, pal.metal); p.rect(cx + 9, ay, 4, 10, pal.metal);
    p.rect(cx - 14, ay + 9, 5, 4, pal.dark); p.rect(cx + 9, ay + 9, 5, 4, pal.dark);
  }
  // helmet
  const hy = 2 + bob + k;
  const hw = side ? 11 : 12;
  p.rect(cx - hw / 2, hy + 1, hw, 11, pal.metal);
  p.rect(cx - hw / 2 + 1, hy, hw - 2, 1, pal.metal);
  p.hline(cx - hw / 2 + 1, hy + 1, hw - 2, pal.light);
  if (dir === 'down') {
    p.rect(cx - 4, hy + 5, 8, 2, P.ink); p.rect(cx - 1, hy + 5, 2, 5, P.ink);
    p.px(cx - 3, hy + 5, pal.glow); p.px(cx + 2, hy + 5, pal.glow);
  } else if (side) {
    p.rect(cx + 1, hy + 5, 5, 2, P.ink); p.px(cx + 4, hy + 5, pal.glow);
  } else {
    p.vline(cx, hy + 1, 10, pal.dark);
  }
  // plume
  for (let i = 0; i < 7; i++) p.px(cx + (side ? -2 - i : Math.round(Math.sin(i) * 1)), hy - 1 - (side ? Math.max(0, 3 - i) : i % 3), i < 3 ? pal.plume : pal.plumeD);
  cape(true);
  p.outline(P.ink);
  return p.toCanvas();
}

export function buildKnight() {
  const pal = {
    metal: P.slate, metalD: P.navy, light: P.steel, dark: P.black, trim: P.purple, glow: P.magenta,
    cape: P.plum, capeL: P.purple, capeD: P.black, plume: P.redD, plumeD: P.plum,
  };
  const set = (dir) => ({
    idle: [{ bob: 0 }, { bob: 1 }].map((po) => knightFrame(dir, po, pal)),
    walk: [{ step: 1, walk: true }, { step: 0, bob: 1, walk: true }, { step: -1, walk: true }, { step: 0, bob: 1, walk: true }].map((po) => knightFrame(dir, po, pal)),
    windup: [knightFrame(dir, { arm: 'up' }, pal)],
    back: [knightFrame(dir, { arm: 'back' }, pal)],
    strike: [knightFrame(dir, { arm: 'fwd', bob: 1 }, pal)],
    kneel: [knightFrame(dir, { kneel: true, arm: 'rest' }, pal)],
  });
  const side = set('side');
  const left = {};
  for (const [k2, v] of Object.entries(side)) left[k2] = v.map((c) => {
    const m = document.createElement('canvas');
    m.width = c.width; m.height = c.height;
    const ctx = m.getContext('2d');
    ctx.translate(c.width, 0); ctx.scale(-1, 1); ctx.drawImage(c, 0, 0);
    return m;
  });
  return { down: set('down'), up: set('up'), right: side, left };
}

// ---------------------------------------------------------------- The dying Lume (final boss, flame form)
export function buildLumeFlame() {
  const frames = [];
  for (let f = 0; f < 6; f++) {
    const rng = mulberry32(900 + f);
    const w = 48, h = 64;
    const p = new PixelArt(w, h);
    for (let y = 0; y < h; y++) {
      const t = y / h;
      const cx = w / 2 + Math.sin(y * 0.18 + f * 1.1) * (1 - t) * 5;
      const r = (w / 2 - 3) * Math.pow(t, 0.62) * (0.9 + rng() * 0.12);
      for (let x = 0; x < w; x++) {
        const d = Math.abs(x + 0.5 - cx);
        if (d >= r) continue;
        const k = d / r;
        let c = P.rust;
        if (t > 0.2) c = P.orange;
        if (k < 0.72 && t > 0.3) c = P.gold;
        if (k < 0.45 && t > 0.42) c = P.yellow;
        if (k < 0.22 && t > 0.55) c = P.white;
        p.px(x, y, c);
      }
    }
    // tongues of flame
    for (let i = 0; i < 4; i++) {
      const x = 10 + ((rng() * 28) | 0), y0 = 6 + ((rng() * 14) | 0);
      for (let y = y0; y < y0 + 8; y++) p.px(x + Math.round(Math.sin(y + f)), y, P.orange);
    }
    p.outline(P.rust);
    frames.push(p.toCanvas());
  }
  return frames;
}
