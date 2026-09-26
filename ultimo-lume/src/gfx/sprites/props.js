// World props: containers, puzzle elements, doors, decor structures.
import { paint } from '../pixel.js';
import { P } from '../palette.js';
import { mulberry32 } from '../../core/math.js';

const O = P.ink;

function chest(open, big) {
  const w = big ? 24 : 16, h = big ? 20 : 16;
  return paint(w, h, (p) => {
    const bx = 1, bw = w - 2, lidH = big ? 7 : 5, bodyY = big ? 9 : 7, bodyH = h - bodyY - 1;
    const wood = big ? P.purple : P.brown, woodD = big ? P.plum : P.brownD, woodL = big ? P.pink : P.clay;
    const metal = big ? P.gold : P.gray, metalD = big ? P.brown : P.steel;
    // body
    p.rect(bx, bodyY, bw, bodyH, wood);
    p.hline(bx, bodyY, bw, woodL);
    p.hline(bx, bodyY + bodyH - 1, bw, woodD);
    p.vline(bx + 3, bodyY, bodyH, metal); p.vline(bx + bw - 4, bodyY, bodyH, metal);
    if (open) {
      // open lid seen from front, dark interior
      p.rect(bx, bodyY - 3, bw, 3, P.black);
      p.rect(bx, bodyY - lidH - 2, bw, lidH - 1, woodD);
      p.hline(bx, bodyY - lidH - 2, bw, wood);
      p.rect(bx + 2, bodyY - 2, bw - 4, 1, P.gold);
    } else {
      p.rect(bx, bodyY - lidH, bw, lidH, wood);
      p.hline(bx, bodyY - lidH, bw, woodL);
      p.hline(bx, bodyY - 1, bw, woodD);
      p.vline(bx + 3, bodyY - lidH, lidH, metal); p.vline(bx + bw - 4, bodyY - lidH, lidH, metal);
      // lock
      const lx = (w >> 1) - 1;
      p.rect(lx, bodyY - 2, 2, 4, metal);
      p.px(lx, bodyY, metalD);
      if (big) { p.rect(lx - 1, bodyY - 3, 4, 5, metal); p.px(lx, bodyY - 1, P.ink); p.px(lx + 1, bodyY - 1, P.ink); }
    }
  }, O);
}

function pot(broken) {
  return paint(14, 16, (p) => {
    if (broken) {
      p.rect(3, 12, 8, 3, P.brownD); p.hline(3, 12, 8, P.brown);
      p.px(2, 14, P.clay); p.px(11, 13, P.clay);
      return;
    }
    p.ellipse(7, 10, 5.5, 5, P.clay);
    p.rect(4, 2, 6, 3, P.clay);
    p.hline(3, 2, 8, P.tan);
    p.rect(5, 3, 4, 1, P.brownD);
    for (let y = 6; y < 15; y++) for (let x = 2; x < 13; x++) if (p.alpha(x, y) && x > 8) p.px(x, y, P.rust);
    p.hline(3, 9, 9, P.brownD);
    p.px(4, 7, P.tan); p.px(4, 8, P.tan); p.px(5, 7, P.sand);
  }, O);
}

function bush(cut, pal = 0) {
  const c = [[P.green, P.greenL, P.greenD], [P.greenD, P.green, P.teal], [P.teal, P.blueD, P.navy]][pal];
  return paint(16, 16, (p) => {
    if (cut) {
      p.rect(4, 11, 8, 3, c[2]); p.px(5, 10, c[0]); p.px(9, 10, c[0]); p.px(7, 12, P.brownD);
      return;
    }
    p.ellipse(8, 9, 7, 6, c[0]);
    p.ellipse(5, 7, 3, 3, c[1]); p.ellipse(10, 6, 3, 3, c[0]);
    for (let y = 9; y < 16; y++) for (let x = 0; x < 16; x++) if (p.alpha(x, y) && (x + y) % 3 === 0) p.px(x, y, c[2]);
    p.px(4, 5, P.white); p.px(10, 4, c[1]);
    if (pal === 0) { p.px(11, 9, P.red); p.px(5, 11, P.red); }
  }, O);
}

function tallGrass(frame, pal = 0) {
  const c = pal ? [P.green, P.greenD, P.teal] : [P.greenL, P.green, P.greenD];
  return paint(16, 16, (p) => {
    const sway = frame ? 1 : 0;
    const blades = [[2, 7], [4, 4], [6, 6], [8, 3], [10, 5], [12, 4], [13, 7]];
    for (const [x, top] of blades) {
      for (let y = top; y < 15; y++) {
        const off = y < 9 ? sway : 0;
        p.px(x + off, y, y < top + 2 ? c[0] : y > 11 ? c[2] : c[1]);
      }
    }
  }, null);
}

function sign() {
  return paint(16, 18, (p) => {
    p.rect(7, 9, 2, 8, P.brownD);
    p.rect(1, 2, 14, 8, P.brown);
    p.hline(1, 2, 14, P.tan);
    p.hline(1, 9, 14, P.brownD);
    p.hline(3, 4, 9, P.brownD); p.hline(3, 6, 7, P.brownD);
    p.px(2, 3, P.plum); p.px(13, 8, P.plum);
  }, O);
}

function lever(on) {
  return paint(16, 16, (p) => {
    p.rect(3, 10, 10, 5, P.steel);
    p.hline(3, 10, 10, P.gray);
    p.hline(3, 14, 10, P.slate);
    const tip = on ? [12, 2] : [4, 2];
    p.line(8, 11, tip[0], tip[1] + 2, P.brownD);
    p.line(8, 10, tip[0], tip[1] + 1, P.brown);
    p.circle(tip[0] + 0.5, tip[1] + 1.5, 2, on ? P.greenL : P.red);
    p.px(tip[0], tip[1], P.white);
  }, O);
}

function standingTorch() {
  return paint(12, 20, (p) => {
    p.rect(4, 8, 4, 11, P.steel);
    p.vline(4, 8, 11, P.gray);
    p.rect(2, 5, 8, 4, P.slate);
    p.hline(2, 5, 8, P.gray);
    p.rect(3, 17, 6, 2, P.slate);
  }, O);
}

function brazier(lit) {
  return paint(22, 22, (p) => {
    p.rect(8, 11, 6, 8, P.steel);
    p.vline(8, 11, 8, P.gray);
    p.rect(5, 18, 12, 3, P.slate); p.hline(5, 18, 12, P.steel);
    p.ellipse(11, 9, 9, 3.5, P.slate);
    p.ellipse(11, 8, 8, 2.5, lit ? P.rust : P.black);
    p.hline(3, 10, 16, P.steel);
    // runes
    p.px(10, 14, lit ? P.gold : P.navy); p.px(11, 15, lit ? P.gold : P.navy); p.px(12, 14, lit ? P.gold : P.navy);
    if (!lit) { p.px(8, 7, P.gray); p.px(13, 8, P.steel); }
  }, O);
}

// Animated flame frames (small torch / big brazier / blue).
export function flameFrames(big = false, hue = 'fire') {
  const cols = hue === 'blue' ? [P.white, P.cyan, P.blue, P.blueD] : hue === 'void' ? [P.white, P.pink, P.purple, P.plum] : [P.white, P.yellow, P.orange, P.rust];
  const out = [];
  for (let f = 0; f < 4; f++) {
    const w = big ? 14 : 8, h = big ? 18 : 12;
    const rng = mulberry32(f * 31 + (big ? 7 : 3));
    out.push(paint(w, h, (p) => {
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const cx = w / 2 + Math.sin((y + f * 3) * 0.7) * (1 - y / h) * (big ? 1.6 : 1);
        const t = y / h;
        const r = (w / 2) * Math.pow(t, 0.7) * (0.85 + rng() * 0.25);
        const d = Math.abs(x + 0.5 - cx);
        if (d < r) {
          const k = d / r;
          const c = k < 0.3 && t > 0.45 ? cols[0] : k < 0.6 && t > 0.25 ? cols[1] : t > 0.15 ? cols[2] : cols[3];
          p.px(x, y, c);
        }
      }
    }));
  }
  return out;
}

function plate(down) {
  return paint(16, 16, (p) => {
    p.rect(2, 2, 12, 12, P.slate);
    p.rect(3, 3, 10, 10, down ? P.steel : P.gray);
    if (!down) { p.hline(3, 3, 10, P.silver); p.hline(3, 12, 10, P.steel); p.vline(12, 3, 10, P.steel); }
    p.rect(6, 6, 4, 4, down ? P.gold : P.steel);
    p.px(7, 7, down ? P.yellow : P.gray);
  }, O);
}

function pushBlock() {
  return paint(16, 18, (p) => {
    p.rect(0, 0, 16, 13, P.gray);
    p.hline(0, 0, 16, P.silver); p.vline(0, 0, 13, P.silver);
    p.rect(0, 13, 16, 5, P.steel);
    p.hline(0, 17, 16, P.slate);
    p.rect(4, 3, 8, 7, P.steel);
    p.rect(5, 4, 6, 5, P.gray);
    p.px(7, 6, P.slate); p.px(8, 6, P.slate);
    p.vline(15, 1, 12, P.steel);
  }, O);
}

function crystalSwitch(color) {
  const c = color === 'red' ? [P.salmon, P.red, P.redD] : [P.cyan, P.blue, P.blueD];
  return paint(14, 20, (p) => {
    p.rect(3, 13, 8, 6, P.steel); p.hline(3, 13, 8, P.gray); p.rect(2, 17, 10, 2, P.slate);
    p.ellipse(7, 8, 5, 6, c[1]);
    p.ellipse(6, 6, 2, 3, c[0]);
    p.px(5, 4, P.white);
    for (let y = 8; y < 15; y++) for (let x = 7; x < 13; x++) if (p.alpha(x, y) && y > 9) p.px(x, y, c[2]);
  }, O);
}

function barrier(color, up) {
  const c = color === 'red' ? [P.salmon, P.red, P.redD] : [P.cyan, P.blue, P.blueD];
  return paint(16, 16, (p) => {
    if (up) {
      p.rect(0, 0, 16, 12, c[1]);
      p.hline(0, 0, 16, c[0]); p.vline(0, 0, 12, c[0]);
      p.rect(0, 12, 16, 4, c[2]);
      p.rect(5, 4, 6, 4, c[0]);
    } else {
      p.rect(1, 1, 14, 14, P.navy);
      p.rect(3, 3, 10, 10, c[2]);
      p.rect(6, 6, 4, 4, c[1]);
    }
  }, O);
}

function eyeSwitch(state) {
  return paint(16, 16, (p) => {
    p.rect(1, 1, 14, 14, P.slate);
    p.rect(2, 2, 12, 12, P.steel);
    p.hline(2, 2, 12, P.gray);
    if (state === 'closed') {
      p.ellipse(8, 8, 5, 3, P.gold); p.hline(3, 8, 10, P.brownD);
    } else {
      p.ellipse(8, 8, 5, 3.2, P.sand);
      p.circle(8, 8, 2, state === 'hit' ? P.greenL : P.red);
      p.px(8, 8, P.ink); p.px(7, 7, P.white);
      p.hline(3, 5, 10, P.gold); p.hline(3, 11, 10, P.gold);
    }
  }, O);
}

function statueOwl(dir) {
  return paint(16, 26, (p) => {
    p.rect(2, 18, 12, 7, P.steel); p.hline(2, 18, 12, P.gray); p.hline(2, 24, 12, P.slate);
    p.ellipse(8, 11, 6, 7, P.gray);
    p.ellipse(8, 5, 5, 4.5, P.gray);
    p.px(4, 1, P.gray); p.px(12, 1, P.gray);
    for (let y = 9; y < 18; y++) for (let x = 9; x < 15; x++) if (p.alpha(x, y) && y > 11) p.px(x, y, P.steel);
    // face direction marker
    const eye = P.cyan;
    if (dir === 'down') { p.px(6, 5, eye); p.px(10, 5, eye); p.px(8, 7, P.gold); }
    else if (dir === 'up') { p.hline(5, 6, 7, P.steel); p.px(8, 2, P.slate); }
    else if (dir === 'left') { p.px(4, 5, eye); p.px(3, 6, P.gold); p.vline(11, 3, 5, P.steel); }
    else { p.px(12, 5, eye); p.px(13, 6, P.gold); p.vline(5, 3, 5, P.steel); }
  }, O);
}

function door(kind, vertical) {
  // kind: key | boss | gate(closed) | sealed
  const w = vertical ? 16 : 32, h = vertical ? 32 : 16;
  return paint(w, h, (p) => {
    if (kind === 'gate') {
      const n = vertical ? 4 : 6;
      for (let i = 0; i < n; i++) {
        if (vertical) { p.rect(1, 2 + i * 8, 14, 2, P.steel); p.hline(1, 2 + i * 8, 14, P.gray); }
        else { p.rect(2 + i * 5, 0, 2, 16, P.steel); p.vline(2 + i * 5, 0, 16, P.gray); p.px(2 + i * 5, 0, P.silver); }
      }
      if (vertical) { p.vline(3, 0, 32, P.slate); p.vline(12, 0, 32, P.slate); }
      else { p.hline(0, 4, 32, P.slate); p.hline(0, 11, 32, P.slate); }
      return;
    }
    const wood = kind === 'boss' ? P.purple : P.brown;
    const woodD = kind === 'boss' ? P.plum : P.brownD;
    p.rect(0, 0, w, h, wood);
    if (vertical) {
      for (let y = 0; y < h; y += 4) p.hline(0, y, w, woodD);
      p.rect(0, 5, w, 2, P.steel); p.rect(0, 25, w, 2, P.steel);
    } else {
      for (let x = 0; x < w; x += 4) p.vline(x, 0, h, woodD);
      p.rect(3, 0, 2, h, P.steel); p.rect(w - 5, 0, 2, h, P.steel);
    }
    const cx = w >> 1, cy = h >> 1;
    if (kind === 'boss') {
      p.circle(cx, cy, 5, P.gold);
      p.circle(cx, cy, 3.5, P.redD);
      p.px(cx - 1, cy - 1, P.yellow); p.px(cx, cy - 1, P.yellow);
      p.rect(cx - 1, cy + 1, 2, 2, P.ink);
    } else if (kind === 'sealed') {
      p.circle(cx, cy, 5, P.silver);
      p.circle(cx, cy, 3, P.navy);
    } else {
      p.rect(cx - 2, cy - 3, 5, 6, P.gold);
      p.px(cx, cy - 1, P.ink); p.px(cx, cy, P.ink); p.px(cx, cy + 1, P.ink);
      p.hline(cx - 2, cy - 3, 5, P.yellow);
    }
  }, O);
}

function spikes(up) {
  return paint(16, 16, (p) => {
    p.rect(1, 1, 14, 14, P.navy);
    for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) {
      const x = 2 + i * 5, y = 2 + j * 5;
      if (up) { p.px(x + 1, y, P.silver); p.rect(x, y + 1, 3, 2, P.gray); p.hline(x, y + 3, 3, P.steel); }
      else { p.rect(x, y + 1, 3, 2, P.black); p.px(x + 1, y + 2, P.slate); }
    }
  }, O);
}

function stairs(dir) {
  return paint(32, 16, (p) => {
    p.rect(0, 0, 32, 16, P.black);
    for (let i = 0; i < 4; i++) {
      const y = dir === 'down' ? i * 4 : 12 - i * 4;
      const inset = i * 2;
      p.rect(inset, y, 32 - inset * 2, 3, i === 0 ? P.gray : i === 1 ? P.steel : i === 2 ? P.slate : P.navy);
      p.hline(inset, y, 32 - inset * 2, i < 2 ? P.silver : P.steel);
    }
  }, O);
}

function caveMouth(style) {
  return paint(40, 32, (p) => {
    const rock = style === 'mine' ? [P.brownD, P.brown, P.plum] : [P.slate, P.steel, P.navy];
    p.rect(0, 0, 40, 32, rock[0]);
    for (let y = 0; y < 32; y++) for (let x = 0; x < 40; x++) if ((x * 7 + y * 13) % 11 === 0) p.px(x, y, rock[1]);
    p.ellipse(20, 24, 12, 16, P.void);
    p.rect(8, 24, 25, 8, P.void);
    if (style === 'mine') {
      p.rect(6, 6, 3, 26, P.brown); p.rect(31, 6, 3, 26, P.brown);
      p.rect(4, 5, 32, 3, P.brown); p.hline(4, 5, 32, P.tan);
      p.vline(6, 6, 26, P.tan);
    }
  }, O);
}

function boulder(big = true) {
  const s = big ? 16 : 12;
  return paint(s + 2, s + 2, (p) => {
    const c = s / 2 + 1;
    p.ellipse(c, c + 1, s / 2, s / 2 - 1, P.steel);
    p.ellipse(c - 2, c - 1, s / 3, s / 3.5, P.gray);
    p.px(c - 3, c - 3, P.silver);
    for (let y = 0; y < s + 2; y++) for (let x = 0; x < s + 2; x++) if (p.alpha(x, y) && x + y > s + 3) p.px(x, y, P.slate);
    if (big) { p.line(c + 1, 3, c - 1, c, P.navy); p.line(c - 1, c, c + 3, c + 4, P.navy); p.line(c - 1, c, c - 4, c + 3, P.navy); }
  }, O);
}

function rock() {
  return paint(16, 14, (p) => {
    p.ellipse(8, 8, 7, 5.5, P.steel);
    p.ellipse(6, 6, 4, 3, P.gray);
    p.px(5, 4, P.silver);
    for (let y = 0; y < 14; y++) for (let x = 0; x < 16; x++) if (p.alpha(x, y) && y > 9) p.px(x, y, P.slate);
    p.px(3, 12, P.greenD); p.px(12, 11, P.greenD);
  }, O);
}

function grave(v) {
  return paint(14, 18, (p) => {
    if (v === 0) {
      p.rect(2, 4, 10, 12, P.gray);
      p.ellipse(7, 5, 5, 3, P.gray);
      p.vline(2, 4, 12, P.silver);
      p.hline(4, 7, 6, P.steel); p.hline(4, 10, 5, P.steel);
    } else {
      p.rect(6, 1, 3, 15, P.steel); p.rect(2, 5, 11, 3, P.steel);
      p.vline(6, 1, 15, P.gray); p.hline(2, 5, 11, P.gray);
    }
    p.rect(1, 15, 12, 2, P.greenD);
    p.px(3, 14, P.green); p.px(10, 14, P.green);
  }, O);
}

function crate() {
  return paint(16, 16, (p) => {
    p.rect(1, 1, 14, 14, P.brown);
    p.rect(1, 1, 14, 2, P.tan); p.rect(1, 13, 14, 2, P.brownD);
    p.rect(1, 1, 2, 14, P.clay); p.rect(13, 1, 2, 14, P.brownD);
    p.line(3, 3, 12, 12, P.brownD); p.line(3, 4, 11, 12, P.clay);
  }, O);
}

function barrel() {
  return paint(14, 16, (p) => {
    p.rect(2, 1, 10, 14, P.brown);
    p.vline(1, 3, 10, P.brown); p.vline(12, 3, 10, P.brownD);
    p.hline(2, 3, 10, P.steel); p.hline(2, 11, 10, P.steel);
    p.ellipse(7, 2, 5, 1.5, P.clay);
    p.vline(4, 2, 12, P.clay);
    p.vline(10, 2, 12, P.brownD);
  }, O);
}

function well() {
  return paint(32, 34, (p) => {
    p.rect(3, 4, 2, 16, P.brownD); p.rect(27, 4, 2, 16, P.brownD);
    p.rect(1, 1, 30, 4, P.rust); p.hline(1, 1, 30, P.clay); p.hline(1, 4, 30, P.redD);
    p.hline(5, 9, 22, P.brown);
    p.vline(16, 9, 8, P.tan);
    p.rect(14, 16, 4, 3, P.brown);
    p.ellipse(16, 24, 14, 7, P.gray);
    p.ellipse(16, 23, 11, 4.5, P.black);
    p.ellipse(16, 24, 9, 3, P.navy);
    p.rect(2, 24, 28, 8, P.steel);
    for (let x = 2; x < 30; x += 6) p.vline(x, 24, 8, P.slate);
    p.hline(2, 24, 28, P.silver);
    p.hline(2, 28, 28, P.slate);
  }, O);
}

function house(v) {
  const roofs = [[P.rust, P.redD, P.clay], [P.slate, P.navy, P.steel], [P.brownD, P.plum, P.brown]];
  const [r, rD, rL] = roofs[v % 3];
  return paint(80, 70, (p) => {
    const rng = mulberry32(v * 97 + 1);
    // walls
    p.rect(4, 36, 72, 32, P.sand);
    for (let y = 38; y < 68; y += 5) p.hline(4, y, 72, P.tan);
    p.rect(4, 36, 3, 32, P.brown); p.rect(73, 36, 3, 32, P.brown); p.rect(38, 36, 3, 32, P.brown);
    p.hline(4, 66, 72, P.brownD);
    // roof
    for (let y = 0; y < 38; y++) {
      const inset = Math.max(0, 12 - y);
      p.hline(inset, y + 2, 80 - inset * 2, y % 4 === 0 ? rD : r);
    }
    for (let x = 4; x < 76; x += 6) for (let y = 6; y < 38; y += 8) p.px(x + ((y / 8) % 2) * 3, y, rL);
    p.hline(0, 39, 80, rD);
    p.hline(12, 2, 56, rL);
    // holes in the roof (abandoned)
    if (v !== 1) { p.rect(18 + v * 8, 14, 7, 5, P.black); p.hline(18 + v * 8, 14, 7, P.brownD); }
    // door (boarded)
    p.rect(44, 48, 14, 20, P.brownD);
    p.rect(45, 49, 12, 19, P.plum);
    p.line(44, 52, 58, 60, P.brown); p.line(44, 61, 58, 55, P.brown);
    // windows
    p.rect(14, 46, 14, 10, P.brownD);
    p.rect(15, 47, 12, 8, P.black);
    p.vline(21, 47, 8, P.brownD); p.hline(15, 51, 12, P.brownD);
    if (rng() < 0.5) { p.px(17, 48, P.steel); p.px(24, 52, P.steel); }
    // vines
    for (let i = 0; i < 3; i++) {
      const x = 6 + ((rng() * 66) | 0);
      for (let y = 40; y < 40 + 6 + ((rng() * 12) | 0); y++) p.px(x + (y % 3 === 0 ? 1 : 0), y, P.green);
    }
    // chimney
    p.rect(58, 0, 7, 12, P.steel); p.hline(58, 0, 7, P.gray);
  }, O);
}

function pillar(broken) {
  const h = broken ? 22 : 36;
  return paint(16, h, (p) => {
    const top = broken ? 6 : 4;
    p.rect(3, top, 10, h - top - 3, P.gray);
    p.vline(3, top, h - top - 3, P.silver);
    p.vline(8, top, h - top - 3, P.steel);
    p.vline(12, top, h - top - 3, P.steel);
    p.rect(1, h - 4, 14, 4, P.steel); p.hline(1, h - 4, 14, P.gray);
    if (broken) {
      for (let x = 3; x < 13; x++) {
        const t = top + ((x * 5) % 4);
        for (let y = top - 1; y < t; y++) p.erase(x, y);
      }
      p.px(5, top + 3, P.greenD); p.px(6, top + 4, P.green);
    } else {
      p.rect(1, 0, 14, 5, P.steel); p.hline(1, 0, 14, P.silver);
      p.px(4, 14, P.greenD); p.px(5, 15, P.green); p.px(4, 16, P.greenD);
    }
  }, O);
}

function tree(v) {
  const leaf = v === 2 ? [P.greenD, P.green, P.teal, P.black] : [P.green, P.greenL, P.greenD, P.teal];
  return paint(34, 44, (p) => {
    p.rect(14, 26, 6, 16, P.brownD);
    p.vline(14, 26, 16, P.brown);
    p.vline(19, 26, 16, P.plum);
    p.rect(11, 40, 12, 3, P.brownD);
    const rng = mulberry32(v * 13 + 5);
    const blobs = [[17, 14, 12], [9, 19, 7], [25, 19, 7], [17, 8, 9], [12, 23, 6], [22, 23, 6]];
    for (const [cx, cy, r] of blobs) {
      for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
        const d = Math.hypot(x, y);
        if (d > r) continue;
        let c = leaf[0];
        if (d > r - 1.3) c = x + y < 0 ? leaf[1] : leaf[2];
        else if (x + y < -r * 0.7) c = leaf[1];
        else if (x + y > r * 0.6) c = leaf[2];
        p.px(cx + x, cy + y, c);
      }
    }
    for (let i = 0; i < 8; i++) p.px(6 + ((rng() * 22) | 0), 4 + ((rng() * 22) | 0), leaf[3]);
    if (v === 1) for (let i = 0; i < 4; i++) p.px(8 + ((rng() * 18) | 0), 8 + ((rng() * 16) | 0), P.red);
  }, O);
}

function deadTree() {
  return paint(30, 40, (p) => {
    p.rect(13, 16, 5, 22, P.brownD);
    p.vline(13, 16, 22, P.brown);
    p.line(15, 20, 5, 8, P.brownD); p.line(15, 19, 6, 8, P.brown);
    p.line(16, 17, 25, 5, P.brownD); p.line(16, 18, 26, 7, P.brown);
    p.line(15, 16, 14, 2, P.brownD);
    p.line(8, 11, 4, 11, P.brownD);
    p.line(22, 9, 27, 11, P.brownD);
    p.rect(10, 37, 11, 2, P.brownD);
  }, O);
}

function lampStatue() {
  // statue of a hooded figure holding a flame bowl (lore decor)
  return paint(20, 36, (p) => {
    p.rect(3, 28, 14, 7, P.steel); p.hline(3, 28, 14, P.gray); p.hline(3, 34, 14, P.slate);
    p.ellipse(10, 18, 6, 10, P.gray);
    p.ellipse(10, 9, 4, 4.5, P.gray);
    p.rect(8, 7, 4, 4, P.slate);
    p.rect(4, 13, 12, 3, P.gray);
    p.ellipse(10, 12, 5, 1.8, P.steel);
    for (let y = 14; y < 28; y++) for (let x = 11; x < 17; x++) if (p.alpha(x, y) && y > 16) p.px(x, y, P.steel);
    p.vline(5, 17, 10, P.silver);
  }, O);
}

function socketGate(filled) {
  // Sanctuary seal: big stone doorway with three sockets
  return paint(64, 48, (p) => {
    p.rect(0, 0, 64, 48, P.gray);
    p.hline(0, 0, 64, P.silver);
    p.rect(4, 4, 56, 44, P.steel);
    p.rect(12, 12, 40, 36, P.navy);
    p.ellipse(32, 12, 20, 8, P.navy);
    for (let x = 12; x < 52; x += 4) p.vline(x, 14, 34, P.slate);
    const cols = [P.gray, P.purple, P.gold];
    for (let i = 0; i < 3; i++) {
      const cx = 20 + i * 12;
      p.circle(cx, 28, 4, P.black);
      if (filled[i]) { p.circle(cx, 28, 3, cols[i]); p.px(cx - 1, 27, P.white); }
    }
    p.hline(10, 40, 44, P.slate);
  }, O);
}

function banner(color) {
  return paint(14, 30, (p) => {
    p.hline(0, 1, 14, P.gold); p.px(0, 0, P.gold); p.px(13, 0, P.gold);
    p.rect(1, 2, 12, 24, color);
    p.vline(1, 2, 24, P.salmon);
    for (let x = 1; x < 13; x += 2) p.px(x, 26, color);
    p.px(2, 27, color); p.px(6, 27, color); p.px(10, 28, color);
    p.circle(7, 11, 3, P.gold); p.px(7, 11, P.yellow);
    p.rect(3, 18, 8, 1, P.gold);
  }, O);
}

function bookshelf() {
  return paint(32, 36, (p) => {
    p.rect(0, 0, 32, 36, P.brownD);
    p.rect(2, 2, 28, 32, P.plum);
    const books = [P.red, P.blueD, P.greenD, P.gold, P.purple, P.rust, P.steel];
    for (let row = 0; row < 3; row++) {
      const y = 3 + row * 11;
      p.hline(2, y + 9, 28, P.brown);
      let x = 3;
      let k = row * 3;
      while (x < 28) {
        const w = 2 + (k % 2);
        const hh = 6 + (k % 3);
        if (k % 7 !== 5) p.rect(x, y + 9 - hh, w, hh, books[k % books.length]);
        x += w + (k % 4 === 0 ? 1 : 0);
        k++;
      }
    }
    p.hline(0, 0, 32, P.brown);
  }, O);
}

function throne() {
  return paint(32, 40, (p) => {
    p.rect(6, 0, 20, 30, P.redD);
    p.rect(4, 0, 4, 32, P.gold); p.rect(24, 0, 4, 32, P.gold);
    p.rect(9, 3, 14, 24, P.red);
    p.circle(16, 6, 3, P.gold);
    p.rect(2, 24, 28, 8, P.brown);
    p.hline(2, 24, 28, P.gold);
    p.rect(4, 32, 24, 7, P.brownD);
    p.hline(4, 32, 24, P.brown);
    p.vline(8, 4, 20, P.salmon);
  }, O);
}

function crystal(color, big) {
  const c = color === 'pink' ? [P.white, P.pink, P.purple, P.plum] : [P.white, P.cyan, P.blue, P.blueD];
  const w = big ? 20 : 12, h = big ? 30 : 16;
  return paint(w, h, (p) => {
    const spikes = big ? [[10, 2, 4], [5, 10, 3], [15, 9, 3]] : [[6, 2, 3], [3, 7, 2]];
    for (const [x, top, r] of spikes) {
      for (let y = top; y < h - 1; y++) {
        const t = (y - top) / 4;
        const half = Math.min(r, t * r);
        for (let xx = -Math.ceil(half); xx <= Math.ceil(half); xx++) {
          if (Math.abs(xx) > half) continue;
          p.px(x + xx, y, xx < 0 ? c[1] : xx === 0 ? c[0] : c[2]);
        }
      }
    }
    p.hline(1, h - 2, w - 2, c[3]);
  }, O);
}

function minecart() {
  return paint(22, 18, (p) => {
    p.rect(1, 3, 20, 10, P.steel);
    p.hline(1, 3, 20, P.gray);
    p.rect(2, 1, 18, 3, P.brownD);
    for (let x = 3; x < 20; x += 4) p.rect(x, 0, 3, 2, P.steel);
    p.vline(6, 4, 8, P.slate); p.vline(15, 4, 8, P.slate);
    p.circle(5.5, 14.5, 3, P.slate); p.circle(16.5, 14.5, 3, P.slate);
    p.px(5, 14, P.gray); p.px(16, 14, P.gray);
  }, O);
}

function bones() {
  return paint(16, 10, (p) => {
    p.line(2, 7, 10, 4, P.sand); p.px(1, 7, P.silver); p.px(11, 3, P.silver);
    p.circle(12, 6, 2.5, P.sand);
    p.px(11, 6, P.ink); p.px(13, 6, P.ink);
    p.line(4, 3, 7, 8, P.gray);
  }, O);
}

function mushrooms(glow) {
  const cap = glow ? [P.cyan, P.blue] : [P.red, P.redD];
  return paint(16, 12, (p) => {
    for (const [x, y, r] of [[4, 5, 3], [10, 3, 4], [13, 8, 2]]) {
      p.vline(x, y + 1, 12 - y - 2, P.sand);
      p.ellipse(x, y, r, r * 0.6, cap[0]);
      p.hline(x - r + 1, y + 1, r * 2 - 1, cap[1]);
      p.px(x - 1, y - 1, P.white);
    }
  }, O);
}

function candles() {
  return paint(12, 12, (p) => {
    p.rect(2, 5, 2, 6, P.sand); p.rect(6, 3, 2, 8, P.sand); p.rect(9, 6, 2, 5, P.sand);
    p.px(2, 4, P.orange); p.px(6, 2, P.yellow); p.px(9, 5, P.orange);
    p.hline(1, 11, 10, P.tan);
  }, O);
}

function altar() {
  return paint(40, 26, (p) => {
    p.rect(2, 10, 36, 14, P.gray);
    p.hline(2, 10, 36, P.silver);
    p.rect(0, 6, 40, 5, P.silver);
    p.hline(0, 6, 40, P.white);
    p.rect(4, 22, 32, 3, P.steel);
    for (let x = 8; x < 34; x += 8) { p.rect(x, 13, 4, 7, P.steel); p.px(x + 1, 14, P.gold); }
  }, O);
}

function ladder() {
  return paint(16, 34, (p) => {
    p.vline(3, 0, 34, P.brown); p.vline(12, 0, 34, P.brown);
    p.vline(2, 0, 34, P.tan); p.vline(13, 0, 34, P.brownD);
    for (let y = 3; y < 34; y += 5) { p.hline(3, y, 10, P.clay); p.hline(3, y + 1, 10, P.brownD); }
  }, O);
}

function rubbleLadderUp() {
  return paint(16, 16, (p) => {
    p.rect(2, 2, 12, 12, P.black);
    p.hline(2, 2, 12, P.steel);
  }, O);
}

function hole() {
  return paint(16, 16, (p) => {
    p.ellipse(8, 8, 7, 6, P.black);
    p.ellipse(8, 9, 5, 4, P.void);
    p.hline(3, 3, 10, P.steel);
  }, null);
}

function webs() {
  return paint(16, 16, (p) => {
    p.line(0, 0, 15, 15, P.silver); p.line(0, 8, 8, 0, P.silver); p.line(0, 15, 15, 0, P.gray);
    p.line(4, 0, 4, 8, P.gray); p.line(0, 4, 8, 4, P.gray);
  }, null);
}

function rug() {
  return paint(48, 32, (p) => {
    p.rect(0, 0, 48, 32, P.redD);
    p.rect(2, 2, 44, 28, P.red);
    p.rect(4, 4, 40, 24, P.redD);
    p.rect(20, 12, 8, 8, P.gold);
    for (let x = 0; x < 48; x += 3) { p.px(x, 0, P.gold); p.px(x + 1, 31, P.gold); }
  }, null);
}

function windowLight() {
  return paint(24, 40, (p) => {
    for (let y = 0; y < 40; y++) for (let x = 0; x < 24; x++) {
      const skew = x - y * 0.25;
      if (skew > 2 && skew < 14 && ((x + y) % 2 === 0 || y < 10)) p.px(x, y, '#c0cbdc');
    }
  }, null);
}


function campfire() {
  return paint(22, 12, (p) => {
    for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; p.ellipse(11 + Math.cos(a) * 8, 7 + Math.sin(a) * 3.5, 2, 1.5, i % 2 ? P.gray : P.steel); }
    p.line(5, 9, 17, 5, P.brownD); p.line(5, 8, 17, 4, P.brown);
    p.line(5, 5, 17, 9, P.brownD); p.line(5, 4, 17, 8, P.brown);
    p.rect(9, 5, 5, 3, P.black);
  }, O);
}

function oldTree() {
  return paint(58, 70, (p) => {
    const rng = mulberry32(404);
    // gnarled trunk with roots
    p.rect(22, 36, 14, 30, P.brownD);
    p.vline(22, 36, 30, P.brown); p.vline(23, 40, 20, P.brown);
    p.vline(35, 36, 30, P.plum);
    p.line(22, 64, 12, 68, P.brownD); p.line(35, 64, 46, 68, P.brownD); p.line(28, 66, 28, 69, P.brownD);
    p.line(21, 62, 13, 67, P.brown); p.line(36, 62, 45, 67, P.plum);
    p.ellipse(29, 50, 3, 5, P.black); p.ellipse(29, 51, 2, 3, P.ink);
    const leaf = [P.greenD, P.green, P.teal, P.black];
    const blobs = [[29, 22, 18], [14, 30, 11], [44, 30, 11], [29, 10, 12], [18, 16, 9], [41, 16, 9]];
    for (const [cx, cy, r] of blobs) {
      for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
        const d = Math.hypot(x, y);
        if (d > r) continue;
        let c = leaf[0];
        if (d > r - 1.4) c = x + y < 0 ? leaf[1] : leaf[2];
        else if (x + y < -r * 0.7) c = leaf[1];
        else if (x + y > r * 0.6) c = leaf[2];
        p.px(cx + x, cy + y, c);
      }
    }
    for (let i = 0; i < 16; i++) p.px(8 + ((rng() * 42) | 0), 4 + ((rng() * 34) | 0), rng() < 0.5 ? leaf[3] : P.greenL);
    for (let i = 0; i < 5; i++) p.px(10 + ((rng() * 38) | 0), 8 + ((rng() * 28) | 0), P.gold);
  }, O);
}

export function buildProps() {
  return {
    chest: { closed: chest(false, false), open: chest(true, false) },
    bigChest: { closed: chest(false, true), open: chest(true, true) },
    pot: { whole: pot(false), broken: pot(true) },
    bush: [0, 1, 2].map((pal) => ({ whole: bush(false, pal), cut: bush(true, pal) })),
    tallGrass: [0, 1].map((pal) => [tallGrass(0, pal), tallGrass(1, pal)]),
    sign: sign(),
    lever: { off: lever(false), on: lever(true) },
    torch: standingTorch(),
    brazier: { unlit: brazier(false), lit: brazier(true) },
    flameSmall: flameFrames(false),
    flameBig: flameFrames(true),
    flameBlue: flameFrames(true, 'blue'),
    flameVoid: flameFrames(true, 'void'),
    plate: { up: plate(false), down: plate(true) },
    block: pushBlock(),
    crystalSwitch: { red: crystalSwitch('red'), blue: crystalSwitch('blue') },
    barrier: { redUp: barrier('red', true), redDown: barrier('red', false), blueUp: barrier('blue', true), blueDown: barrier('blue', false) },
    eyeSwitch: { closed: eyeSwitch('closed'), open: eyeSwitch('open'), hit: eyeSwitch('hit') },
    owl: { down: statueOwl('down'), up: statueOwl('up'), left: statueOwl('left'), right: statueOwl('right') },
    doorH: { key: door('key', false), boss: door('boss', false), gate: door('gate', false), sealed: door('sealed', false) },
    doorV: { key: door('key', true), boss: door('boss', true), gate: door('gate', true), sealed: door('sealed', true) },
    spikes: { up: spikes(true), down: spikes(false) },
    stairsDown: stairs('down'),
    stairsUp: stairs('up'),
    caveMouth: caveMouth('cave'),
    mineMouth: caveMouth('mine'),
    boulder: boulder(true),
    rock: rock(),
    grave: [grave(0), grave(1)],
    crate: crate(),
    barrel: barrel(),
    well: well(),
    house: [0, 1, 2].map(house),
    pillar: pillar(false),
    pillarBroken: pillar(true),
    tree: [0, 1, 2].map(tree),
    deadTree: deadTree(),
    statue: lampStatue(),
    socketGate: [0, 1, 2, 3].map((n) => socketGate([n > 0, n > 1, n > 2])),
    banner: { red: banner(P.redD), purple: banner(P.purple) },
    bookshelf: bookshelf(),
    throne: throne(),
    crystal: { blue: crystal('blue', true), pink: crystal('pink', true), small: crystal('blue', false), smallPink: crystal('pink', false) },
    minecart: minecart(),
    bones: bones(),
    mushrooms: mushrooms(false),
    glowshrooms: mushrooms(true),
    candles: candles(),
    altar: altar(),
    ladder: ladder(),
    hatch: rubbleLadderUp(),
    hole: hole(),
    webs: webs(),
    rug: rug(),
    campfire: campfire(),
    oldTree: oldTree(),
    windowLight: windowLight(),
  };
}
