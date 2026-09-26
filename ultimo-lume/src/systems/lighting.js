// Dithered pixel-art lighting: a darkness layer with light "holes" cut out,
// plus a subtle additive colour glow. Light sprites are cached per radius.
import { W, H } from '../core/constants.js';
import { makeCanvas } from '../gfx/pixel.js';
import { bayer } from '../core/math.js';

const holeCache = new Map();
const glowCache = new Map();

function holeSprite(r) {
  r = Math.max(4, Math.round(r / 4) * 4);
  let c = holeCache.get(r);
  if (c) return c;
  const s = r * 2;
  c = makeCanvas(s, s);
  const ctx = c.getContext('2d');
  const id = ctx.createImageData(s, s);
  const d = id.data;
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const dist = Math.hypot(x + 0.5 - r, y + 0.5 - r) / r;
    if (dist >= 1) continue;
    const inten = 1 - dist * dist;
    // quantise into 4 bands with ordered dithering at band edges
    const lvl = Math.min(4, Math.floor(inten * 4 + bayer(x, y)));
    const i = (y * s + x) * 4;
    d[i + 3] = Math.round((lvl / 4) * 255);
  }
  ctx.putImageData(id, 0, 0);
  holeCache.set(r, c);
  return c;
}

function glowSprite(r, color) {
  r = Math.max(4, Math.round(r / 4) * 4);
  const key = r + color;
  let c = glowCache.get(key);
  if (c) return c;
  const s = r * 2;
  c = makeCanvas(s, s);
  const ctx = c.getContext('2d');
  const hole = holeSprite(r);
  ctx.drawImage(hole, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, s, s);
  glowCache.set(key, c);
  return c;
}

export class Lighting {
  constructor() {
    this.canvas = makeCanvas(W, H);
    this.ctx = this.canvas.getContext('2d');
    this.lights = [];
  }

  // lights: [{x, y, r, i (0..1), color}]
  render(target, darkness, tint, lights) {
    if (darkness <= 0.01) return;
    const ctx = this.ctx;
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, W, H);
    ctx.globalAlpha = 1;
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'destination-out';
    for (const l of lights) {
      if (l.x < -l.r || l.y < -l.r || l.x > W + l.r || l.y > H + l.r) continue;
      const sp = holeSprite(l.r);
      ctx.globalAlpha = Math.min(1, l.i ?? 1);
      ctx.drawImage(sp, Math.round(l.x - sp.width / 2), Math.round(l.y - sp.height / 2));
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    target.globalAlpha = darkness;
    target.drawImage(this.canvas, 0, 0);
    target.globalAlpha = 1;
    // colour glow
    target.globalCompositeOperation = 'lighter';
    for (const l of lights) {
      if (!l.color) continue;
      if (l.x < -l.r || l.y < -l.r || l.x > W + l.r || l.y > H + l.r) continue;
      const g = glowSprite(l.r * 0.8, l.color);
      target.globalAlpha = 0.12 * (l.i ?? 1) * Math.min(1, darkness + 0.3);
      target.drawImage(g, Math.round(l.x - g.width / 2), Math.round(l.y - g.height / 2));
    }
    target.globalAlpha = 1;
    target.globalCompositeOperation = 'source-over';
  }
}
