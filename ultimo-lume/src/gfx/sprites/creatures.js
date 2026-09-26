// Non-humanoid enemies: slimes, bats, wisps, beetles, living armour, eye turrets.
import { PixelArt } from '../pixel.js';
import { P } from '../palette.js';

function mirrorRows(rows) {
  return rows.map((r) => r + r.split('').reverse().join(''));
}

function rotate90(canvas, times) {
  let c = canvas;
  for (let i = 0; i < times; i++) {
    const n = document.createElement('canvas');
    n.width = c.height; n.height = c.width;
    const ctx = n.getContext('2d');
    ctx.translate(n.width, 0);
    ctx.rotate(Math.PI / 2);
    ctx.drawImage(c, 0, 0);
    c = n;
  }
  return c;
}

// ---------------- Slime ----------------
export const SLIME_COLORS = {
  green: { base: P.greenL, dark: P.green, deep: P.greenD, light: '#a8e070' },
  blue: { base: P.blue, dark: P.blueD, deep: P.navy, light: P.cyan },
  red: { base: P.orange, dark: P.rust, deep: P.redD, light: P.yellow },
  shadow: { base: P.purple, dark: P.plum, deep: P.black, light: P.pink },
};

function slimeFrame(colors, sx, sy, eyes = 'open', small = false) {
  const W = 20, H = 16;
  const p = new PixelArt(W, H);
  const bw = (small ? 8 : 12) * sx, bh = (small ? 7 : 10) * sy;
  const cx = W / 2, bottom = H - 2;
  const cy = bottom - bh / 2;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = (x + 0.5 - cx) / (bw / 2);
      const dy = (y + 0.5 - cy) / (bh / 2);
      // flattened bottom: use squarer falloff below centre
      const d = dy > 0 ? dx * dx + Math.pow(dy, 4) : dx * dx + dy * dy;
      if (d <= 1 && y <= bottom) {
        let c = colors.base;
        if (dy > 0.45) c = colors.dark;
        if (dy > 0.8 && Math.abs(dx) > 0.2) c = colors.deep;
        if (dx < -0.25 && dy < -0.1 && dx * dx + dy * dy > 0.35) c = colors.light;
        p.px(x, y, c);
      }
    }
  }
  // highlight glint
  const top = Math.round(cy - bh / 2);
  p.px(Math.round(cx - bw / 4), top + 2, P.white);
  p.px(Math.round(cx - bw / 4) + 1, top + 2, colors.light);
  // eyes
  const ey = Math.round(cy - bh * 0.05);
  const ex = small ? 2 : 3;
  if (eyes === 'open') {
    p.rect(Math.round(cx) - ex - 1, ey, 1, 2, P.ink);
    p.rect(Math.round(cx) + ex, ey, 1, 2, P.ink);
  } else if (eyes === 'angry') {
    p.rect(Math.round(cx) - ex - 1, ey, 1, 2, P.ink);
    p.rect(Math.round(cx) + ex, ey, 1, 2, P.ink);
    p.px(Math.round(cx) - ex - 2, ey - 1, P.ink);
    p.px(Math.round(cx) + ex + 1, ey - 1, P.ink);
  } else {
    p.px(Math.round(cx) - ex - 2, ey, P.ink); p.px(Math.round(cx) - ex - 1, ey + 1, P.ink);
    p.px(Math.round(cx) + ex + 1, ey, P.ink); p.px(Math.round(cx) + ex, ey + 1, P.ink);
  }
  p.outline(P.ink);
  return p.toCanvas();
}

export function buildSlime(colorName, small = false) {
  const c = SLIME_COLORS[colorName];
  return {
    idle: [[1, 1], [1.06, 0.94], [1, 1], [0.95, 1.05]].map(([a, b]) => slimeFrame(c, a, b, 'open', small)),
    prep: [slimeFrame(c, 1.25, 0.7, 'angry', small)],
    jump: [slimeFrame(c, 0.82, 1.2, 'angry', small)],
    land: [slimeFrame(c, 1.3, 0.62, 'open', small)],
    hurt: [slimeFrame(c, 1.12, 0.88, 'closed', small)],
  };
}

// ---------------- Bat ----------------
const BAT_FRAMES = [
  ['W.......', 'WW......', 'wWW...b.', '.wwW..bb', '..wwWbbb', '...wwbeb', '....Bbbb', '.....BBf', '......BB', '........', '........', '........'],
  ['........', '........', '......b.', '......bb', 'WWW..bbb', 'wwwWWbeb', '.wwwwBbb', '..w.wBBf', '......BB', '........', '........', '........'],
  ['........', '........', '......b.', '......bb', '.....bbb', '....Wbeb', '..WWwBbb', '.WwwwBBf', 'Wwww..BB', 'ww......', 'w.......', '........'],
];

export function buildBat(pal = 'cave') {
  const pals = {
    cave: { b: P.purple, B: P.plum, w: P.pink, W: P.purple, e: P.red, f: P.white },
    crystal: { b: P.blueD, B: P.navy, w: P.blue, W: P.blueD, e: P.cyan, f: P.white },
    ember: { b: P.rust, B: P.brownD, w: P.orange, W: P.rust, e: P.yellow, f: P.white },
  };
  const map = pals[pal];
  const frames = BAT_FRAMES.map((rows) => {
    const p = new PixelArt(18, 14);
    p.template(mirrorRows(rows), map, 1, 1);
    p.outline(P.ink);
    return p.toCanvas();
  });
  return { fly: [frames[0], frames[1], frames[2], frames[1]] };
}

// ---------------- Wisp (spectral flanker) ----------------
export function buildWisp(colors = { core: P.white, mid: P.cyan, edge: P.blue, deep: P.blueD }) {
  const frames = [];
  for (let f = 0; f < 4; f++) {
    const p = new PixelArt(16, 18);
    for (let y = 0; y < 18; y++) {
      for (let x = 0; x < 16; x++) {
        const cx = 8 + Math.sin((y + f * 2) * 0.7) * (y > 9 ? (y - 9) * 0.35 : 0);
        const r = y < 9 ? Math.sqrt(Math.max(0, 25 - (y - 7) * (y - 7) * 1.2)) : Math.max(0, 5 - (y - 9) * 0.62);
        const d = Math.abs(x + 0.5 - cx);
        if (d < r && y > 1) {
          const t = d / r;
          p.px(x, y, t < 0.35 && y < 11 ? colors.core : t < 0.7 ? colors.mid : colors.edge);
        }
      }
    }
    p.rect(6, 7, 1, 2, P.ink);
    p.rect(9, 7, 1, 2, P.ink);
    p.outline(colors.deep);
    frames.push(p.toCanvas());
  }
  return { fly: frames };
}

// ---------------- Beetle (charger) ----------------
function beetleFrame(phase, mode, pal) {
  const p = new PixelArt(16, 16);
  // legs
  const legC = P.ink;
  for (let i = 0; i < 3; i++) {
    const ly = 4 + i * 3 + (((i + phase) % 2) ? 1 : 0) * (mode === 'stun' ? 0 : 1);
    if (mode === 'stun') {
      p.hline(1, 4 + i * 3 + ((phase + i) % 2), 3, legC);
      p.hline(12, 4 + i * 3 + ((phase + i + 1) % 2), 3, legC);
    } else {
      p.hline(2, ly, 2, legC); p.px(1, ly + 1, legC);
      p.hline(12, ly, 2, legC); p.px(14, ly + 1, legC);
    }
  }
  if (mode === 'stun') {
    // belly up
    p.ellipse(8, 8, 5, 6, pal.belly);
    p.hline(5, 6, 6, pal.bellyD); p.hline(5, 9, 6, pal.bellyD); p.hline(6, 12, 4, pal.bellyD);
  } else {
    p.ellipse(8, 7, 5, 6, pal.shell);
    for (let y = 1; y < 13; y++) for (let x = 3; x < 8; x++) if (p.alpha(x, y) && (x - 3) + (y - 1) < 4) p.px(x, y, pal.light);
    p.vline(8, 2, 10, pal.dark);
    p.vline(7, 2, 10, pal.shell);
    for (let y = 8; y < 13; y++) for (let x = 3; x < 14; x++) if (p.alpha(x, y) && x > 8 && y > 9) p.px(x, y, pal.dark);
    // head
    p.ellipse(8, 13, 3, 2, pal.head);
    p.px(6, 13, pal.eye); p.px(9, 13, pal.eye);
    // mandibles
    const open = mode === 'charge' ? 1 : 0;
    p.px(5 - open, 15, P.sand); p.px(10 + open, 15, P.sand);
    p.px(6 - open, 15, P.sand); p.px(9 + open, 15, P.sand);
  }
  p.outline(P.ink);
  return p.toCanvas();
}

export function buildBeetle(palName = 'mine') {
  const pals = {
    mine: { shell: P.rust, light: P.clay, dark: P.brownD, head: P.plum, eye: P.yellow, belly: P.tan, bellyD: P.brown },
    crystal: { shell: P.blueD, light: P.blue, dark: P.navy, head: P.navy, eye: P.cyan, belly: P.gray, bellyD: P.steel },
  };
  const pal = pals[palName];
  const base = {
    walk: [0, 1].map((ph) => beetleFrame(ph, 'walk', pal)),
    charge: [0, 1].map((ph) => beetleFrame(ph, 'charge', pal)),
    stun: [0, 1].map((ph) => beetleFrame(ph, 'stun', pal)),
  };
  // rotations: base faces down
  const rot = { down: 0, left: 1, up: 2, right: 3 };
  const out = {};
  for (const [dir, n] of Object.entries(rot)) {
    out[dir] = {};
    for (const [k, frames] of Object.entries(base)) out[dir][k] = k === 'stun' ? frames : frames.map((f) => rotate90(f, n));
  }
  return out;
}

// ---------------- Living armour (Guardian) ----------------
function armorFrame(dir, pose, pal) {
  const p = new PixelArt(28, 32);
  const bob = pose.bob || 0;
  const oy = bob;
  const side = dir === 'side';
  // legs
  const legY = 24;
  const step = pose.step || 0;
  if (side) {
    p.rect(10 - step, legY, 4, 6, pal.dark);
    p.rect(14 + step, legY, 4, 6, pal.metal);
    p.rect(14 + step, legY + 5, 6, 2, pal.dark);
    p.rect(9 - step, legY + 5, 5, 2, pal.deep);
  } else {
    p.rect(8, legY + (step > 0 ? -1 : 0), 5, 6, pal.metal);
    p.rect(15, legY + (step < 0 ? -1 : 0), 5, 6, pal.metal);
    p.rect(8, legY + 5 + (step > 0 ? -1 : 0), 5, 2, pal.dark);
    p.rect(15, legY + 5 + (step < 0 ? -1 : 0), 5, 2, pal.dark);
    p.vline(10, legY, 5, pal.light);
    p.vline(17, legY, 5, pal.light);
  }
  // torso
  const tx = side ? 8 : 6, tw = side ? 12 : 16;
  p.rect(tx, 12 + oy, tw, 12, pal.metal);
  p.rect(tx, 21 + oy, tw, 3, pal.dark);
  p.hline(tx, 20 + oy, tw, pal.trim);
  if (dir === 'down') {
    p.rect(12, 14 + oy, 4, 5, pal.dark);
    p.px(13, 16 + oy, pal.glow); p.px(14, 16 + oy, pal.glow);
    p.vline(7, 13 + oy, 7, pal.light);
  } else if (side) {
    p.vline(9, 13 + oy, 7, pal.light);
  } else {
    p.vline(13, 13 + oy, 8, pal.dark);
    p.vline(14, 13 + oy, 8, pal.dark);
  }
  // pauldrons
  if (side) {
    p.ellipse(14, 12 + oy, 5, 3, pal.light);
    p.ellipse(14, 13 + oy, 5, 2, pal.metal);
  } else {
    p.ellipse(5, 13 + oy, 4, 3, pal.metal); p.ellipse(22, 13 + oy, 4, 3, pal.metal);
    p.hline(3, 11 + oy, 4, pal.light); p.hline(21, 11 + oy, 4, pal.light);
  }
  // helmet
  const hx = side ? 9 : 8, hw = side ? 11 : 12;
  p.rect(hx, 2 + oy, hw, 10, pal.metal);
  p.rect(hx + 1, 1 + oy, hw - 2, 1, pal.metal);
  p.hline(hx + 1, 2 + oy, hw - 2, pal.light);
  if (dir === 'down') {
    p.rect(hx + 2, 6 + oy, hw - 4, 2, P.ink);
    const g = pose.glow === false ? pal.dark : pal.glow;
    p.px(hx + 3, 6 + oy, g); p.px(hx + hw - 4, 6 + oy, g);
    p.vline(hx + hw / 2 - 1, 8 + oy, 3, pal.dark);
    // horns / crest
    p.rect(hx - 1, 0 + oy, 2, 3, pal.trim); p.rect(hx + hw - 1, 0 + oy, 2, 3, pal.trim);
  } else if (side) {
    p.rect(hx + 6, 6 + oy, 5, 2, P.ink);
    p.px(hx + 9, 6 + oy, pose.glow === false ? pal.dark : pal.glow);
    p.rect(hx + 1, 0 + oy, 3, 2, pal.trim);
  } else {
    p.vline(hx + hw / 2, 1 + oy, 10, pal.dark);
    p.rect(hx - 1, 0 + oy, 2, 3, pal.trim); p.rect(hx + hw - 1, 0 + oy, 2, 3, pal.trim);
  }
  // arms (the weapon itself is drawn at runtime)
  const arm = pose.arm || 'rest';
  if (side) {
    if (arm === 'raise') { p.rect(15, 4 + oy, 3, 9, pal.metal); p.rect(15, 2 + oy, 4, 3, pal.dark); }
    else if (arm === 'slam') { p.rect(16, 14 + oy, 8, 3, pal.metal); p.rect(23, 14 + oy, 3, 4, pal.dark); }
    else { p.rect(14, 14 + oy, 3, 8, pal.metal); p.rect(14, 21 + oy, 4, 3, pal.dark); }
  } else {
    if (arm === 'raise') {
      p.rect(2, 4 + oy, 3, 9, pal.metal); p.rect(23, 4 + oy, 3, 9, pal.metal);
      p.rect(2, 2 + oy, 4, 3, pal.dark); p.rect(22, 2 + oy, 4, 3, pal.dark);
    } else if (arm === 'slam') {
      p.rect(4, 16 + oy, 4, 8, pal.metal); p.rect(20, 16 + oy, 4, 8, pal.metal);
      p.rect(8, 22 + oy, 12, 3, pal.dark);
    } else {
      p.rect(2, 15 + oy, 3, 8, pal.metal); p.rect(23, 15 + oy, 3, 8, pal.metal);
      p.rect(2, 22 + oy, 4, 3, pal.dark); p.rect(22, 22 + oy, 4, 3, pal.dark);
    }
  }
  p.outline(P.ink);
  return p.toCanvas();
}

export function buildArmor(palName = 'iron') {
  const pals = {
    iron: { metal: P.steel, dark: P.slate, deep: P.navy, light: P.gray, trim: P.gold, glow: P.orange },
    corrupt: { metal: P.slate, dark: P.navy, deep: P.black, light: P.steel, trim: P.purple, glow: P.magenta },
  };
  const pal = pals[palName];
  const set = (dir) => ({
    idle: [{ bob: 0 }, { bob: 1 }].map((po) => armorFrame(dir, po, pal)),
    walk: [{ step: 1 }, { step: 0, bob: 1 }, { step: -1 }, { step: 0, bob: 1 }].map((po) => armorFrame(dir, po, pal)),
    raise: [armorFrame(dir, { arm: 'raise' }, pal)],
    slam: [armorFrame(dir, { arm: 'slam', bob: 1 }, pal)],
    stuck: [armorFrame(dir, { arm: 'slam', bob: 2, glow: false }, pal)],
  });
  const side = set('side');
  const left = {};
  for (const [k, v] of Object.entries(side)) left[k] = v.map(mirrorCanvas);
  return { down: set('down'), up: set('up'), right: side, left };
}

function mirrorCanvas(c) {
  const m = document.createElement('canvas');
  m.width = c.width; m.height = c.height;
  const ctx = m.getContext('2d');
  ctx.translate(c.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(c, 0, 0);
  return m;
}

// ---------------- Eye turret (stone statue that fires) ----------------
export function buildTurret() {
  const mk = (state) => {
    const p = new PixelArt(16, 20);
    p.rect(2, 6, 12, 13, P.steel);
    p.rect(2, 16, 12, 3, P.slate);
    p.hline(2, 6, 12, P.gray);
    p.rect(1, 3, 14, 4, P.gray);
    p.hline(1, 3, 14, P.silver);
    p.rect(4, 9, 8, 5, P.slate);
    if (state === 'closed') {
      p.hline(5, 11, 6, P.ink);
    } else {
      p.rect(5, 10, 6, 3, P.sand);
      p.rect(7, 10, 2, 3, state === 'fire' ? P.magenta : P.red);
      if (state === 'fire') { p.px(7, 10, P.white); }
    }
    p.outline(P.ink);
    return p.toCanvas();
  };
  return { closed: [mk('closed')], open: [mk('open')], fire: [mk('fire')] };
}
