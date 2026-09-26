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
