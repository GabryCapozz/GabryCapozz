// Shared pixel-art UI primitives: panels, key caps, bars, cursors.
import { P } from '../gfx/palette.js';
import { font } from '../gfx/font.js';

export function panel(ctx, x, y, w, h, style = 'dark') {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  const fill = style === 'light' ? P.slate : style === 'paper' ? P.sand : P.black;
  const inner = style === 'paper' ? P.tan : P.slate;
  const hi = style === 'paper' ? P.white : P.steel;
  ctx.fillStyle = P.ink;
  ctx.fillRect(x + 1, y, w - 2, h);
  ctx.fillRect(x, y + 1, w, h - 2);
  ctx.fillStyle = fill;
  ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
  ctx.fillStyle = inner;
  ctx.fillRect(x + 2, y + 2, w - 4, 1);
  ctx.fillRect(x + 2, y + h - 3, w - 4, 1);
  ctx.fillRect(x + 2, y + 2, 1, h - 4);
  ctx.fillRect(x + w - 3, y + 2, 1, h - 4);
  ctx.fillStyle = hi;
  ctx.fillRect(x + 3, y + 2, 4, 1);
  ctx.fillRect(x + 2, y + 3, 1, 3);
  // corner studs
  ctx.fillStyle = style === 'paper' ? P.brown : P.gold;
  ctx.fillRect(x + 2, y + 2, 1, 1);
  ctx.fillRect(x + w - 3, y + 2, 1, 1);
  ctx.fillRect(x + 2, y + h - 3, 1, 1);
  ctx.fillRect(x + w - 3, y + h - 3, 1, 1);
}

// Key cap with a label, e.g. [J]. Returns width.
export function keyCap(ctx, label, x, y, active = true) {
  const w = Math.max(9, font.measure(label) + 6);
  x = Math.round(x); y = Math.round(y);
  ctx.fillStyle = P.ink;
  ctx.fillRect(x, y, w, 11);
  ctx.fillStyle = active ? P.sand : P.gray;
  ctx.fillRect(x + 1, y + 1, w - 2, 8);
  ctx.fillStyle = active ? P.tan : P.steel;
  ctx.fillRect(x + 1, y + 9, w - 2, 1);
  font.draw(ctx, label, x + Math.round(w / 2), y + 1, P.ink, { align: 'center', shadow: null });
  return w;
}

export function bar(ctx, x, y, w, h, frac, color, back = P.navy, edge = P.ink) {
  x = Math.round(x); y = Math.round(y);
  ctx.fillStyle = edge;
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = back;
  ctx.fillRect(x, y, w, h);
  const fw = Math.max(0, Math.round(w * Math.min(1, frac)));
  ctx.fillStyle = color;
  ctx.fillRect(x, y, fw, h);
  if (h > 2 && fw > 1) {
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(x, y, fw, 1);
  }
}

export function cursor(ctx, x, y, t) {
  const o = Math.round(Math.sin(t * 0.2) * 1.5);
  x = Math.round(x + o); y = Math.round(y);
  ctx.fillStyle = P.ink;
  ctx.fillRect(x - 1, y - 1, 5, 9);
  ctx.fillStyle = P.gold;
  ctx.fillRect(x, y, 1, 7);
  ctx.fillRect(x + 1, y + 1, 1, 5);
  ctx.fillRect(x + 2, y + 2, 1, 3);
  ctx.fillStyle = P.yellow;
  ctx.fillRect(x, y + 1, 1, 2);
}

export function dim(ctx, alpha = 0.6) {
  ctx.fillStyle = `rgba(7,6,12,${alpha})`;
  ctx.fillRect(0, 0, 480, 270);
}

// Draw a list of wrapped lines.
export function paragraph(ctx, text, x, y, w, color = P.sand, lineH = 11) {
  const lines = font.wrap(text, w);
  lines.forEach((l, i) => font.draw(ctx, l, x, y + i * lineH, color));
  return lines.length * lineH;
}
