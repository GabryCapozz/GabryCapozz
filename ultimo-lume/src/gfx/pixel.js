// Low-level pixel buffer used to generate every sprite procedurally at boot.
import { P } from './palette.js';

const colorCache = new Map();

export function col(c, a = 255) {
  if (typeof c === 'number') return c;
  const key = c + '|' + a;
  let v = colorCache.get(key);
  if (v !== undefined) return v;
  let hex = c.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map((h) => h + h).join('');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  v = ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
  colorCache.set(key, v);
  return v;
}

export function hexToRgb(c) {
  const hex = c.replace('#', '');
  return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
}

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, w | 0);
  c.height = Math.max(1, h | 0);
  return c;
}

export class PixelArt {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.data = new Uint32Array(w * h);
  }

  px(x, y, c) {
    x |= 0; y |= 0;
    if (c == null || x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.data[y * this.w + x] = col(c);
  }

  erase(x, y) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.data[y * this.w + x] = 0;
  }

  get(x, y) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    return this.data[y * this.w + x];
  }

  alpha(x, y) {
    return this.get(x, y) >>> 24;
  }

  rect(x, y, w, h, c) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, c);
  }

  hline(x, y, w, c) { this.rect(x, y, w, 1, c); }
  vline(x, y, h, c) { this.rect(x, y, 1, h, c); }

  line(x0, y0, x1, y1, c) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
    const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.px(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  ellipse(cx, cy, rx, ry, c) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.px(x, y, c);
      }
    }
  }

  circle(cx, cy, r, c) { this.ellipse(cx, cy, r, r, c); }

  ring(cx, cy, r, c, thick = 1) {
    for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r + 1); y++) {
      for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        if (d <= r && d > r - thick) this.px(x, y, c);
      }
    }
  }

  // Draw a character-grid template. map: char -> colour (or null to skip).
  template(rows, map, ox = 0, oy = 0, flip = false) {
    for (let y = 0; y < rows.length; y++) {
      const row = rows[y];
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        const c = map[ch];
        if (c) this.px(ox + (flip ? row.length - 1 - x : x), oy + y, c);
      }
    }
  }

  // Replace every pixel of colour a with b.
  replace(a, b) {
    const ca = col(a), cb = col(b);
    for (let i = 0; i < this.data.length; i++) if (this.data[i] === ca) this.data[i] = cb;
  }

  // Add a 1px outline around opaque pixels (4-neighbourhood).
  outline(c = P.ink, diagonal = false) {
    const out = col(c);
    const src = this.data.slice();
    const w = this.w, h = this.h;
    const op = (x, y) => x >= 0 && y >= 0 && x < w && y < h && src[y * w + x] >>> 24 > 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (op(x, y)) continue;
        if (op(x - 1, y) || op(x + 1, y) || op(x, y - 1) || op(x, y + 1) ||
          (diagonal && (op(x - 1, y - 1) || op(x + 1, y - 1) || op(x - 1, y + 1) || op(x + 1, y + 1)))) {
          this.data[y * w + x] = out;
        }
      }
    }
    return this;
  }

  // Copy another PixelArt on top (non-transparent pixels only).
  blit(src, ox = 0, oy = 0, flip = false) {
    for (let y = 0; y < src.h; y++) {
      for (let x = 0; x < src.w; x++) {
        const v = src.data[y * src.w + (flip ? src.w - 1 - x : x)];
        if (v >>> 24) {
          const tx = ox + x, ty = oy + y;
          if (tx >= 0 && ty >= 0 && tx < this.w && ty < this.h) this.data[ty * this.w + tx] = v;
        }
      }
    }
    return this;
  }

  clone() {
    const p = new PixelArt(this.w, this.h);
    p.data.set(this.data);
    return p;
  }

  flipped() {
    const p = new PixelArt(this.w, this.h);
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) p.data[y * this.w + x] = this.data[y * this.w + (this.w - 1 - x)];
    return p;
  }

  toCanvas() {
    const c = makeCanvas(this.w, this.h);
    const ctx = c.getContext('2d');
    const id = ctx.createImageData(this.w, this.h);
    new Uint32Array(id.data.buffer).set(this.data);
    ctx.putImageData(id, 0, 0);
    return c;
  }
}

// Build a canvas directly from a drawing callback.
export function paint(w, h, fn, outlineColor = null) {
  const p = new PixelArt(w, h);
  fn(p);
  if (outlineColor) p.outline(outlineColor);
  return p.toCanvas();
}

const flashCache = new WeakMap();
const tintCache = new WeakMap();

// White silhouette of a sprite frame (hit flash).
export function flashOf(canvas) {
  let f = flashCache.get(canvas);
  if (!f) {
    f = tinted(canvas, '#ffffff');
    flashCache.set(canvas, f);
  }
  return f;
}

export function tintOf(canvas, color) {
  let m = tintCache.get(canvas);
  if (!m) { m = new Map(); tintCache.set(canvas, m); }
  let t = m.get(color);
  if (!t) { t = tinted(canvas, color); m.set(color, t); }
  return t;
}

function tinted(canvas, color) {
  const c = makeCanvas(canvas.width, canvas.height);
  const ctx = c.getContext('2d');
  ctx.drawImage(canvas, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, c.width, c.height);
  return c;
}

// Horizontally mirrored copy of a canvas.
export function mirrorCanvas(canvas) {
  const c = makeCanvas(canvas.width, canvas.height);
  const ctx = c.getContext('2d');
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(canvas, 0, 0);
  return c;
}
