// Procedural tile painters. Every theme combines floor/wall/foliage "kinds".
import { PixelArt } from './pixel.js';
import { P } from './palette.js';
import { mulberry32, hashStr } from '../core/math.js';

export const THEMES = {
  village: { floor: 'grass', floor2: 'dirt', floor3: 'cobble', wall: 'bricks', foliage: 'trees', chasm: 'chasm' },
  forest: { floor: 'forestgrass', floor2: 'forestdirt', floor3: 'mossslab', wall: 'mossbricks', foliage: 'deeptrees', chasm: 'chasm' },
  ruins: { floor: 'slabs', floor2: 'ornate', floor3: 'mossslab', wall: 'blocks', foliage: 'deeptrees', chasm: 'chasm' },
  mines: { floor: 'darkdirt', floor2: 'planks', floor3: 'rubble', wall: 'rock', foliage: 'deeptrees', chasm: 'chasm' },
  caves: { floor: 'cavestone', floor2: 'crystalfloor', floor3: 'wetstone', wall: 'caverock', foliage: 'deeptrees', chasm: 'chasm' },
  castle: { floor: 'flagstone', floor2: 'carpet', floor3: 'rubble', wall: 'castlebricks', foliage: 'deeptrees', chasm: 'chasm' },
  sanctuary: { floor: 'marble', floor2: 'goldmarble', floor3: 'crackedmarble', wall: 'marblewall', foliage: 'trees', chasm: 'void' },
};

// ---- helpers ----
function speck(p, rng, color, n) {
  for (let i = 0; i < n; i++) p.px((rng() * 16) | 0, (rng() * 16) | 0, color);
}

function tuft(p, x, y, light, dark) {
  p.px(x - 1, y - 1, light);
  p.px(x + 1, y - 1, light);
  p.px(x, y, light);
  p.px(x, y + 1, dark);
}

function crack(p, rng, color, len = 6) {
  let x = (rng() * 12 + 2) | 0, y = (rng() * 12 + 2) | 0;
  for (let i = 0; i < len; i++) {
    p.px(x, y, color);
    x += rng() < 0.5 ? 1 : 0;
    y += rng() < 0.6 ? 1 : -1 + ((rng() * 2) | 0);
    if (x > 15 || y > 15 || y < 0) break;
  }
}

function slab(p, x, y, w, h, base, light, dark, seam) {
  p.rect(x, y, w, h, base);
  p.hline(x, y, w, light);
  p.vline(x, y, h, light);
  p.hline(x, y + h - 1, w, seam);
  p.vline(x + w - 1, y, h, seam);
  p.px(x + w - 2, y + h - 2, dark);
}

// ---- floor kinds: paint(p, rng, variant) & shadow colour ----
export const FLOORS = {
  grass: {
    shadow: P.greenD,
    paint(p, rng, v) {
      p.rect(0, 0, 16, 16, P.green);
      speck(p, rng, P.greenD, 10);
      for (let i = 0; i < 4 + (rng() * 3 | 0); i++) tuft(p, 1 + (rng() * 14 | 0), 1 + (rng() * 13 | 0), P.greenL, P.greenD);
      if (v % 9 === 1) {
        for (let i = 0; i < 1 + (v % 2); i++) {
          const x = 2 + (rng() * 12 | 0), y = 2 + (rng() * 12 | 0);
          const c = [P.yellow, P.white, P.salmon][(rng() * 3) | 0];
          p.px(x - 1, y, c); p.px(x + 1, y, c); p.px(x, y - 1, c); p.px(x, y + 1, c); p.px(x, y, P.gold);
        }
      }
    },
  },
  forestgrass: {
    shadow: P.teal,
    paint(p, rng, v) {
      p.rect(0, 0, 16, 16, P.greenD);
      speck(p, rng, P.teal, 12);
      for (let i = 0; i < 4 + (rng() * 3 | 0); i++) tuft(p, 1 + (rng() * 14 | 0), 1 + (rng() * 13 | 0), P.green, P.teal);
      if (v % 6 === 2) {
        const x = 3 + (rng() * 10 | 0), y = 3 + (rng() * 10 | 0);
        p.px(x, y, P.salmon); p.px(x + 1, y, P.red); p.px(x, y + 1, P.sand);
      }
      if (v % 7 === 3) { const x = 3 + (rng() * 10 | 0), y = 3 + (rng() * 10 | 0); p.rect(x, y, 2, 1, P.brownD); p.px(x + 2, y, P.brown); }
    },
  },
  dirt: {
    shadow: P.brown,
    paint(p, rng) {
      p.rect(0, 0, 16, 16, P.tan);
      for (let i = 0; i < 5; i++) p.rect((rng() * 15) | 0, (rng() * 15) | 0, 2, 1, P.sand);
      speck(p, rng, P.clay, 8);
      speck(p, rng, P.brown, 4);
      if (rng() < 0.5) { const x = 2 + (rng() * 11 | 0), y = 2 + (rng() * 11 | 0); p.rect(x, y, 2, 1, P.gray); p.rect(x, y + 1, 2, 1, P.brown); }
    },
  },
  forestdirt: {
    shadow: P.brownD,
    paint(p, rng) {
      p.rect(0, 0, 16, 16, P.brown);
      for (let i = 0; i < 5; i++) p.rect((rng() * 15) | 0, (rng() * 15) | 0, 2, 1, P.clay);
      speck(p, rng, P.brownD, 10);
      if (rng() < 0.4) { const x = 2 + (rng() * 11 | 0), y = 2 + (rng() * 11 | 0); p.rect(x, y, 2, 1, P.steel); p.rect(x, y + 1, 2, 1, P.brownD); }
    },
  },
  darkdirt: {
    shadow: P.black,
    paint(p, rng) {
      p.rect(0, 0, 16, 16, P.plum);
      for (let i = 0; i < 6; i++) p.rect((rng() * 15) | 0, (rng() * 15) | 0, 2, 1, P.brownD);
      speck(p, rng, P.black, 8);
      speck(p, rng, P.rust, 2);
      if (rng() < 0.3) { const x = 2 + (rng() * 11 | 0), y = 2 + (rng() * 11 | 0); p.px(x, y, P.steel); p.px(x + 1, y, P.slate); }
    },
  },
  cobble: {
    shadow: P.slate,
    paint(p, rng) {
      p.rect(0, 0, 16, 16, '#6b7890');
      speck(p, rng, P.steel, 20);
      // rounded stones, jittered so the pattern doesn't read as bricks
      const stones = [[4, 4, 3.4, 2.6], [11, 3, 3, 2.4], [3, 11, 2.8, 2.6], [9, 9, 3.2, 2.8], [14, 12, 2.4, 2.2], [7, 15, 2.6, 1.6]];
      for (const [x, y, rx, ry] of stones) {
        const cx = x + (rng() - 0.5) * 1.5, cy = y + (rng() - 0.5) * 1.2;
        const base = rng() < 0.5 ? P.gray : '#9aa7bd';
        p.ellipse(cx, cy, rx, ry, base);
        p.px(cx - rx * 0.4, cy - ry * 0.5, P.silver);
        p.px(cx - rx * 0.4 + 1, cy - ry * 0.5, P.silver);
        p.hline(Math.round(cx - rx * 0.5), Math.round(cy + ry * 0.7), Math.max(1, Math.round(rx)), P.steel);
      }
      if (rng() < 0.3) p.px((rng() * 16) | 0, (rng() * 16) | 0, P.greenD);
    },
  },
  slabs: {
    shadow: P.slate,
    paint(p, rng, v) {
      // large, low-contrast flagstones so floors never read as walls
      const base = v % 3 === 0 ? '#56647f' : '#5d6b88';
      p.rect(0, 0, 16, 16, base);
      speck(p, rng, '#65738f', 14);
      speck(p, rng, '#4d5a75', 10);
      const seam = '#47536d';
      if (v % 4 === 1) { p.hline(0, 8, 16, seam); p.vline(v % 2 ? 5 : 11, 0, 8, seam); }
      else if (v % 4 === 2) { p.vline(8, 0, 16, seam); }
      p.hline(0, 15, 16, seam);
      p.vline(15, 0, 16, seam);
      if (rng() < 0.25) crack(p, rng, '#434e67', 4);
    },
  },
  ornate: {
    shadow: P.plum,
    paint(p, rng, v) {
      p.rect(0, 0, 16, 16, '#5b3a3f');
      p.rect(1, 1, 14, 14, '#6b4448');
      p.hline(0, 0, 16, '#7a5055');
      p.vline(0, 0, 16, '#7a5055');
      p.px(7, 7, P.brown); p.px(8, 8, P.brown); p.px(7, 8, '#8a5a4a'); p.px(8, 7, '#8a5a4a');
      if (v % 2) { p.px(3, 3, P.brownD); p.px(12, 12, P.brownD); }
      speck(p, rng, '#5b3a3f', 6);
    },
  },
  mossslab: {
    shadow: P.slate,
    paint(p, rng, v) {
      FLOORS.slabs.paint(p, rng, v);
      for (let i = 0; i < 3; i++) {
        const x = (rng() * 14) | 0, y = (rng() * 14) | 0;
        p.rect(x, y, 3, 2, P.greenD); p.px(x + 1, y, P.green);
      }
    },
  },
  rubble: {
    shadow: P.navy,
    paint(p, rng) {
      p.rect(0, 0, 16, 16, P.slate);
      speck(p, rng, P.navy, 14);
      for (let i = 0; i < 5; i++) {
        const x = (rng() * 14) | 0, y = (rng() * 14) | 0;
        p.rect(x, y, 3, 2, P.steel); p.px(x, y, P.gray); p.hline(x, y + 2, 3, P.navy);
      }
    },
  },
  planks: {
    shadow: P.plum,
    paint(p, rng) {
      p.rect(0, 0, 16, 16, P.brown);
      for (let y = 0; y < 16; y += 4) {
        p.hline(0, y + 3, 16, P.brownD);
        p.hline(0, y, 16, '#c98463');
        const off = (rng() * 16) | 0;
        p.px(off, y + 1, P.brownD);
        p.px((off + 8) % 16, y + 2, P.plum);
      }
      speck(p, rng, P.brownD, 3);
    },
  },
  cavestone: {
    shadow: P.black,
    paint(p, rng) {
      p.rect(0, 0, 16, 16, P.navy);
      for (let i = 0; i < 6; i++) p.rect((rng() * 15) | 0, (rng() * 15) | 0, 2, 1, P.slate);
      speck(p, rng, P.black, 10);
      if (rng() < 0.3) p.px((rng() * 16) | 0, (rng() * 16) | 0, P.blue);
    },
  },
  crystalfloor: {
    shadow: P.black,
    paint(p, rng) {
      p.rect(0, 0, 16, 16, P.navy);
      speck(p, rng, P.black, 8);
      for (let i = 0; i < 3; i++) {
        const x = 1 + (rng() * 13) | 0, y = 1 + (rng() * 13) | 0;
        const c = rng() < 0.7 ? P.cyan : P.pink;
        p.px(x, y, c); p.px(x, y + 1, rng() < 0.5 ? P.blue : P.purple);
      }
      p.rect((rng() * 12) | 0, (rng() * 12) | 0, 3, 1, P.blueD);
    },
  },
  wetstone: {
    shadow: P.black,
    paint(p, rng) {
      p.rect(0, 0, 16, 16, P.slate);
      speck(p, rng, P.navy, 18);
      for (let i = 0; i < 2; i++) { const x = (rng() * 12) | 0, y = (rng() * 14) | 0; p.hline(x, y, 3, P.blueD); p.px(x + 1, y, P.blue); }
    },
  },
  flagstone: {
    shadow: P.navy,
    paint(p, rng) {
      p.rect(0, 0, 16, 16, P.navy);
      const b = () => (rng() < 0.5 ? P.slate : '#434e70');
      slab(p, 0, 0, 10, 8, b(), P.steel, P.navy, P.black);
      slab(p, 10, 0, 6, 8, b(), P.steel, P.navy, P.black);
      slab(p, 0, 8, 5, 8, b(), P.steel, P.navy, P.black);
      slab(p, 5, 8, 11, 8, b(), P.steel, P.navy, P.black);
      if (rng() < 0.25) crack(p, rng, P.black, 5);
    },
  },
  carpet: {
    shadow: P.plum,
    paint(p, rng) {
      p.rect(0, 0, 16, 16, P.redD);
      for (let y = 0; y < 16; y += 4) for (let x = (y / 4) % 2 * 2; x < 16; x += 4) p.px(x, y + 1, P.red);
      speck(p, rng, P.plum, 5);
    },
  },
  marble: {
    shadow: P.slate,
    paint(p, rng) {
      p.rect(0, 0, 16, 16, '#9aa6be');
      p.hline(0, 15, 16, P.steel); p.vline(15, 0, 16, P.steel);
      p.hline(0, 0, 15, '#b3bdd0'); p.vline(0, 0, 15, '#b3bdd0');
      let x = (rng() * 16) | 0, y = 1;
      while (y < 15) { p.px(x, y, rng() < 0.7 ? P.gray : P.silver); x += rng() < 0.5 ? 1 : -1; y++; if (x < 1 || x > 14) break; }
    },
  },
  goldmarble: {
    shadow: P.brownD,
    paint(p) {
      p.rect(0, 0, 16, 16, '#b7a282');
      p.rect(2, 2, 12, 12, '#9aa6be');
      p.rect(4, 4, 8, 8, '#b7a282');
      p.rect(7, 7, 2, 2, P.gold);
      p.hline(0, 0, 16, P.sand); p.vline(0, 0, 16, P.sand);
      p.hline(0, 15, 16, P.clay); p.vline(15, 0, 16, P.clay);
    },
  },
  crackedmarble: {
    shadow: P.gray,
    paint(p, rng, v) {
      FLOORS.marble.paint(p, rng, v);
      crack(p, rng, P.steel, 8);
      crack(p, rng, P.gray, 5);
    },
  },
};

// ---- wall kinds: face(p,rng,v), top(p,rng,v), rim colour ----
export const WALLS = {
  bricks: {
    rim: P.gray, top: [P.navy, P.slate, P.black],
    face(p, rng) {
      p.rect(0, 0, 16, 16, P.slate);
      for (let row = 0; row < 4; row++) {
        const off = row % 2 ? 4 : 0;
        for (let bx = -off; bx < 16; bx += 8) {
          const base = rng() < 0.2 ? P.gray : P.steel;
          p.rect(bx + 1, row * 4, 7, 3, base);
          p.hline(bx + 1, row * 4, 7, rng() < 0.5 ? P.gray : P.silver);
        }
      }
      if (rng() < 0.4) { const x = (rng() * 14) | 0; p.rect(x, 12, 2, 4, P.greenD); p.px(x, 11, P.green); }
    },
  },
  mossbricks: {
    rim: P.steel, top: [P.teal, P.greenD, P.black],
    face(p, rng) {
      WALLS.bricks.face(p, rng);
      for (let i = 0; i < 4; i++) { const x = (rng() * 15) | 0; const len = 2 + (rng() * 6) | 0; p.vline(x, 0, len, P.greenD); p.px(x, len, P.green); }
    },
  },
  blocks: {
    rim: P.steel, top: [P.black, P.navy, P.ink],
    face(p, rng, v) {
      p.rect(0, 0, 16, 16, P.navy);
      const off = v % 2 ? 8 : 0;
      for (let row = 0; row < 2; row++) {
        const o = row % 2 ? (off + 8) % 16 : off;
        for (let bx = -o; bx < 16; bx += 16) {
          const base = rng() < 0.3 ? '#51607d' : P.steel;
          slab(p, bx, row * 8, 16, 8, base, P.gray, P.slate, P.navy);
        }
      }
      if (rng() < 0.35) crack(p, rng, P.navy, 5);
      if (v % 5 === 0) { p.rect(6, 3, 4, 3, P.slate); p.px(7, 4, P.cyan); p.px(8, 4, P.blue); }
    },
  },
  rock: {
    rim: P.brown, top: [P.black, P.plum, P.ink],
    face(p, rng) {
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        const n = Math.sin(x * 0.9 + y * 0.35 + rng() * 0.8) + rng() * 0.6;
        p.px(x, y, n > 1.0 ? P.brown : n > 0.1 ? P.brownD : P.plum);
      }
      for (let i = 0; i < 2; i++) crack(p, rng, P.black, 6);
      p.hline(0, 0, 16, P.clay);
    },
  },
  caverock: {
    rim: P.steel, top: [P.black, P.navy, P.ink],
    face(p, rng, v) {
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        const n = Math.sin(x * 0.7 - y * 0.4 + rng() * 0.9) + rng() * 0.5;
        p.px(x, y, n > 1.0 ? P.steel : n > 0.1 ? P.slate : P.navy);
      }
      crack(p, rng, P.black, 6);
      p.hline(0, 0, 16, P.gray);
      if (v % 3 === 0) {
        const x = 3 + (rng() * 9) | 0;
        p.vline(x, 8, 6, P.cyan); p.vline(x + 1, 9, 5, P.blue); p.px(x, 7, P.white); p.vline(x - 1, 11, 3, P.blueD);
      }
    },
  },
  castlebricks: {
    rim: P.steel, top: [P.black, P.navy, P.ink],
    face(p, rng, v) {
      p.rect(0, 0, 16, 16, P.navy);
      for (let row = 0; row < 3; row++) {
        const off = row % 2 ? 5 : 0;
        for (let bx = -off; bx < 16; bx += 10) {
          const base = rng() < 0.3 ? P.steel : P.slate;
          p.rect(bx + 1, row * 5 + 1, 9, 4, base);
          p.hline(bx + 1, row * 5 + 1, 9, P.steel);
        }
      }
      if (v % 6 === 0) { p.rect(6, 3, 4, 9, P.black); p.rect(7, 2, 2, 1, P.black); p.px(7, 5, P.blueD); }
    },
  },
  marblewall: {
    rim: P.white, top: [P.steel, P.gray, P.slate],
    face(p, rng) {
      p.rect(0, 0, 16, 16, P.silver);
      p.hline(0, 0, 16, P.white);
      p.hline(0, 3, 16, P.gold);
      p.hline(0, 4, 16, P.tan);
      p.vline(0, 5, 11, P.white);
      p.vline(15, 5, 11, P.gray);
      p.hline(0, 15, 16, P.gray);
      if (rng() < 0.3) crack(p, rng, P.gray, 5);
    },
  },
};

export const FOLIAGE = {
  trees: { leaf: [P.green, P.greenL, P.greenD, P.teal], trunk: [P.brownD, P.brown, P.plum] },
  deeptrees: { leaf: [P.greenD, P.green, P.teal, P.black], trunk: [P.plum, P.brownD, P.black] },
};

// ---- caches ----
const cache = new Map();
const VARIANTS = 8;

function cached(key, fn) {
  let c = cache.get(key);
  if (!c) { c = fn(); cache.set(key, c); }
  return c;
}

function gen(key, variant, painter) {
  return cached(key + ':' + variant, () => {
    const p = new PixelArt(16, 16);
    painter(p, mulberry32(hashStr(key) + variant * 7919), variant);
    return p.toCanvas();
  });
}

export function floorTile(kind, variant) {
  const f = FLOORS[kind] || FLOORS.grass;
  return gen('floor:' + kind, variant % VARIANTS, f.paint);
}

export function wallFaceTile(kind, variant) {
  const w = WALLS[kind] || WALLS.bricks;
  return gen('face:' + kind, variant % VARIANTS, w.face);
}

export function wallTopTile(kind, variant) {
  const w = WALLS[kind] || WALLS.bricks;
  return gen('top:' + kind, variant % 4, (p, rng) => {
    p.rect(0, 0, 16, 16, w.top[0]);
    speck(p, rng, w.top[1], 10);
    speck(p, rng, w.top[2], 6);
  });
}

export function crackedFaceTile(kind, variant) {
  return gen('cracked:' + kind, variant % 2, (p, rng, v) => {
    (WALLS[kind] || WALLS.bricks).face(p, rng, v);
    // obvious fissures so the player learns to spot them
    const cx = 5 + (v % 2) * 4;
    p.line(cx, 1, cx + 2, 6, P.black);
    p.line(cx + 2, 6, cx, 10, P.black);
    p.line(cx, 10, cx + 3, 15, P.black);
    p.line(cx + 2, 6, cx + 6, 8, P.black);
    p.px(cx + 1, 1, P.ink);
    p.rect(cx - 2, 14, 2, 2, P.gray); p.rect(cx + 4, 15, 3, 1, P.steel);
  });
}

export function waterFrame(frame, variant, shallow = false) {
  return cached(`water:${frame}:${variant}:${shallow}`, () => {
    const p = new PixelArt(16, 16);
    const base = shallow ? '#2a7fb0' : P.blueD;
    p.rect(0, 0, 16, 16, base);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const s = Math.sin((x + frame * 2 + variant * 5) * 0.39 + Math.sin(y * 0.8 + variant) * 1.6 + y * 1.1);
      if (s > 0.93) p.px(x, y, shallow ? P.cyan : P.blue);
      else if (s < -0.9 && !shallow) p.px(x, y, P.navy);
    }
    const sx = (variant * 5 + frame * 3) % 16, sy = (variant * 7) % 16;
    if ((frame + variant) % 3 === 0) p.px(sx, sy, P.white);
    if (shallow) for (let i = 0; i < 6; i++) p.px((variant * 3 + i * 5) % 16, (i * 7 + variant) % 16, P.tan);
    return p.toCanvas();
  });
}

export function lavaFrame(frame, variant) {
  return cached(`lava:${frame}:${variant}`, () => {
    const p = new PixelArt(16, 16);
    p.rect(0, 0, 16, 16, P.orange);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const s = Math.sin(x * 0.55 + frame * 0.8 + variant) + Math.sin(y * 0.7 - frame * 0.5 + variant * 2);
      if (s > 1.3) p.px(x, y, P.yellow);
      else if (s < -1.2) p.px(x, y, P.rust);
      else if (s < -1.6) p.px(x, y, P.redD);
    }
    return p.toCanvas();
  });
}

export function chasmTile(kind, variant) {
  return gen('chasm:' + kind, variant % 4, (p, rng) => {
    p.rect(0, 0, 16, 16, kind === 'void' ? P.void : P.ink);
    if (kind === 'void') {
      for (let i = 0; i < 3; i++) p.px((rng() * 16) | 0, (rng() * 16) | 0, rng() < 0.3 ? P.cyan : rng() < 0.5 ? P.purple : P.slate);
      if (rng() < 0.2) p.px((rng() * 16) | 0, (rng() * 16) | 0, P.white);
    } else {
      speck(p, rng, P.black, 6);
    }
  });
}

// Cliff face that shows inside a chasm tile under a ground tile.
export function chasmEdgeTile(wallKind, isVoid) {
  return cached('chasmEdge:' + wallKind + isVoid, () => {
    const p = new PixelArt(16, 16);
    const face = new PixelArt(16, 16);
    (WALLS[wallKind] || WALLS.bricks).face(face, mulberry32(77), 1);
    for (let y = 0; y < 10; y++) for (let x = 0; x < 16; x++) {
      const t = y / 10;
      const dither = ((x + y) % 2 === 0 ? 0.12 : -0.12);
      if (t + dither < 0.75) p.data[y * 16 + x] = face.get(x, y);
    }
    p.hline(0, 0, 16, P.ink);
    return p.toCanvas();
  });
}

export function bridgeTile(horizontal) {
  return cached('bridge:' + horizontal, () => {
    const p = new PixelArt(16, 16);
    if (horizontal) {
      for (let x = 0; x < 16; x += 4) {
        p.rect(x, 2, 3, 12, P.brown);
        p.vline(x, 2, 12, '#c98463');
        p.px(x + 1, 4, P.brownD); p.px(x + 1, 11, P.brownD);
      }
      p.hline(0, 1, 16, P.tan); p.hline(0, 14, 16, P.tan);
      p.hline(0, 2, 16, P.brownD); p.hline(0, 15, 16, P.plum);
    } else {
      for (let y = 0; y < 16; y += 4) {
        p.rect(2, y, 12, 3, P.brown);
        p.hline(2, y, 12, '#c98463');
        p.px(4, y + 1, P.brownD); p.px(11, y + 1, P.brownD);
      }
      p.vline(1, 0, 16, P.tan); p.vline(14, 0, 16, P.tan);
      p.vline(2, 0, 16, P.brownD); p.vline(15, 0, 16, P.plum);
    }
    return p.toCanvas();
  });
}

export function fenceTile(h, v) {
  return cached(`fence:${h}:${v}`, () => {
    const p = new PixelArt(16, 16);
    const wood = P.brown, dark = P.brownD, light = P.tan;
    if (h) {
      p.hline(0, 5, 16, light); p.hline(0, 6, 16, wood); p.hline(0, 7, 16, dark);
      p.hline(0, 10, 16, light); p.hline(0, 11, 16, wood); p.hline(0, 12, 16, dark);
    }
    if (v) {
      p.rect(6, 0, 1, 16, light); p.rect(7, 0, 2, 16, wood); p.rect(9, 0, 1, 16, dark);
    }
    // post
    p.rect(6, 2, 4, 12, wood); p.vline(6, 2, 12, light); p.vline(9, 2, 12, dark);
    p.hline(6, 2, 4, light); p.rect(6, 14, 4, 1, P.plum);
    p.outline(P.ink);
    return p.toCanvas();
  });
}

export function railTile(horizontal) {
  return cached('rail:' + horizontal, () => {
    const p = new PixelArt(16, 16);
    if (horizontal) {
      for (let x = 1; x < 16; x += 5) { p.rect(x, 3, 3, 10, P.brownD); p.vline(x, 3, 10, P.brown); }
      p.hline(0, 5, 16, P.gray); p.hline(0, 6, 16, P.slate);
      p.hline(0, 10, 16, P.gray); p.hline(0, 11, 16, P.slate);
    } else {
      for (let y = 1; y < 16; y += 5) { p.rect(3, y, 10, 3, P.brownD); p.hline(3, y, 10, P.brown); }
      p.vline(5, 0, 16, P.gray); p.vline(6, 0, 16, P.slate);
      p.vline(10, 0, 16, P.gray); p.vline(11, 0, 16, P.slate);
    }
    return p.toCanvas();
  });
}
