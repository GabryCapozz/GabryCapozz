// Item icons (inventory, HUD, world pickups).
import { paint } from '../pixel.js';
import { P } from '../palette.js';

const O = P.ink;

function heart(state) {
  // 9x8 HUD heart: full / half / empty
  return paint(11, 10, (p) => {
    const rows = ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'];
    rows.forEach((r, y) => {
      for (let x = 0; x < 7; x++) if (r[x] === '#') {
        let c = P.red;
        if (state === 'empty') c = P.plum;
        else if (state === 'half' && x > 3) c = P.plum;
        if (y === 1 && x === 1 && state !== 'empty') c = P.salmon;
        if (y === 0 && x === 1 && state !== 'empty') c = P.white;
        if (y >= 3 && c === P.red) c = P.redD;
        p.px(x + 2, y + 2, c);
      }
    });
  }, O);
}

function coin(frame, tier) {
  const cols = tier === 0 ? [P.yellow, P.gold, P.brown] : tier === 1 ? [P.cyan, P.blue, P.blueD] : [P.salmon, P.red, P.redD];
  return paint(10, 10, (p) => {
    const w = [4, 3, 1, 3][frame];
    p.ellipse(5, 5, w, 4, cols[1]);
    if (w > 1) p.ellipse(5 - 0.5, 4.5, Math.max(1, w - 1.5), 2.5, cols[0]);
    p.vline(5, 2, 6, w > 1 ? cols[2] : cols[0]);
    if (frame === 0) p.px(3, 3, P.white);
  }, O);
}

const icons = {
  potion: (p) => {
    p.rect(6, 1, 4, 2, P.brown);
    p.rect(6, 3, 4, 2, P.silver);
    p.ellipse(8, 10, 5, 5, P.red);
    p.ellipse(7, 9, 2, 2, P.salmon);
    p.px(6, 7, P.white);
    for (let y = 11; y < 16; y++) for (let x = 3; x < 14; x++) if (p.alpha(x, y) && x > 8) p.px(x, y, P.redD);
  },
  ampolla: (p) => {
    p.rect(6, 1, 4, 2, P.brown);
    p.rect(6, 3, 4, 2, P.silver);
    p.ellipse(8, 10, 5, 5, P.silver);
    p.ellipse(8, 11, 3.5, 3, P.navy);
    p.px(6, 7, P.white);
  },
  bomb: (p) => {
    p.circle(7.5, 9.5, 5.5, P.navy);
    p.circle(6, 8, 2, P.slate);
    p.px(5, 7, P.steel);
    p.rect(8, 2, 3, 3, P.steel);
    p.line(10, 2, 12, 0, P.tan);
    p.px(13, 0, P.yellow);
  },
  arrows: (p) => {
    for (let i = 0; i < 3; i++) {
      p.line(3 + i * 3, 14, 11 + i * 2, 2, P.tan);
      p.px(11 + i * 2, 2, P.silver); p.px(12 + i * 2, 1, P.silver);
      p.px(3 + i * 3, 14, P.white); p.px(2 + i * 3, 13, P.white);
    }
  },
  key: (p) => {
    p.circle(5, 5, 3.5, P.gold);
    p.erase(5, 5); p.erase(4, 5); p.erase(5, 4); p.erase(4, 4);
    p.line(7, 7, 13, 13, P.gold);
    p.px(11, 13, P.gold); p.px(12, 12, P.gold); p.px(13, 11, P.gold); p.px(10, 12, P.gold);
    p.px(3, 3, P.yellow);
  },
  bossKey: (p) => {
    p.circle(8, 4.5, 4, P.purple);
    p.circle(8, 4.5, 2, P.gold);
    p.px(8, 4, P.red);
    p.rect(7, 8, 2, 7, P.gold);
    p.rect(9, 11, 3, 1, P.gold); p.rect(9, 13, 2, 1, P.gold);
    p.px(7, 8, P.yellow);
  },
  heartPiece: (p) => {
    const rows = ['.##.', '####', '####', '.###', '..##', '...#'];
    rows.forEach((r, y) => { for (let x = 0; x < 4; x++) if (r[x] === '#') p.px(x + 4, y + 5, y < 2 ? P.red : P.redD); });
    p.px(5, 5, P.white);
    p.line(9, 5, 11, 11, P.gold);
  },
  heartContainer: (p) => {
    const rows = ['.###.###.', '#########', '#########', '#########', '.#######.', '..#####..', '...###...', '....#....'];
    rows.forEach((r, y) => { for (let x = 0; x < 9; x++) if (r[x] === '#') p.px(x + 3, y + 4, y < 3 ? P.red : P.redD); });
    p.px(5, 5, P.white); p.px(4, 6, P.salmon);
    p.hline(3, 3, 3, P.gold); p.hline(8, 3, 3, P.gold);
  },
  stoneHeart: (p) => {
    const rows = ['.###.###.', '#########', '#########', '#########', '.#######.', '..#####..', '...###...', '....#....'];
    rows.forEach((r, y) => { for (let x = 0; x < 9; x++) if (r[x] === '#') p.px(x + 3, y + 4, y < 3 ? P.gray : P.steel); });
    p.px(7, 6, P.orange); p.px(7, 7, P.gold); p.px(8, 7, P.orange); p.px(6, 8, P.orange);
    p.px(5, 5, P.silver);
  },
  abyssEye: (p) => {
    p.circle(8, 8, 6, P.purple);
    p.ellipse(8, 8, 5, 3.5, P.sand);
    p.circle(8, 8, 2.5, P.magenta);
    p.circle(8, 8, 1, P.ink);
    p.px(6, 6, P.white);
  },
  brokenOath: (p) => {
    p.line(3, 13, 9, 7, P.silver);
    p.line(4, 13, 10, 7, P.gray);
    p.line(10, 6, 13, 3, P.silver);
    p.rect(1, 12, 4, 2, P.gold);
    p.px(2, 11, P.gold); p.px(4, 14, P.gold);
    p.px(11, 5, P.purple); p.px(12, 3, P.white);
  },
  ore: (p) => {
    p.ellipse(8, 9, 6, 5, P.steel);
    p.ellipse(7, 8, 4, 3, P.gray);
    p.px(6, 9, P.orange); p.px(9, 7, P.gold); p.px(10, 10, P.orange); p.px(5, 7, P.silver);
  },
  crystalShard: (p) => {
    p.line(8, 1, 12, 8, P.cyan); p.line(8, 1, 4, 8, P.cyan);
    for (let y = 2; y < 14; y++) { const hw = y < 8 ? (y - 1) * 0.6 : (14 - y) * 0.7; for (let x = -hw; x <= hw; x++) p.px(8 + Math.round(x), y, x < 0 ? P.cyan : x < 1 ? P.white : P.blue); }
  },
  steel: (p) => {
    p.rect(2, 7, 12, 5, P.gray);
    p.hline(3, 6, 10, P.silver);
    p.rect(2, 11, 12, 1, P.steel);
    p.px(4, 7, P.white);
  },
  lantern: (p) => {
    p.rect(6, 1, 4, 1, P.steel); p.px(5, 2, P.steel); p.px(10, 2, P.steel);
    p.rect(4, 3, 8, 2, P.slate);
    p.rect(5, 5, 6, 7, P.gold);
    p.rect(6, 6, 4, 5, P.yellow);
    p.px(7, 7, P.white);
    p.rect(4, 12, 8, 2, P.slate);
    p.vline(5, 5, 7, P.slate); p.vline(10, 5, 7, P.slate);
  },
  bow: (p) => {
    for (let y = 1; y < 15; y++) { const x = 4 + Math.round(Math.sin(((y - 1) / 13) * Math.PI) * 5); p.px(x, y, P.brown); p.px(x + 1, y, y % 4 === 0 ? P.tan : P.brownD); }
    p.vline(4, 1, 14, P.silver);
    p.line(3, 8, 13, 8, P.tan); p.px(13, 8, P.silver); p.px(12, 7, P.silver); p.px(12, 9, P.silver);
  },
  shadowStep: (p) => {
    p.circle(8, 8, 6, P.purple);
    p.circle(8, 8, 4, P.plum);
    p.line(4, 12, 12, 4, P.pink);
    p.px(12, 4, P.white); p.px(11, 3, P.pink);
    p.px(4, 5, P.pink); p.px(11, 12, P.pink);
  },
  lightBlade: (p) => {
    for (let a = -1.2; a <= 1.2; a += 0.05) {
      const x = 5 + Math.cos(a) * 7, y = 8 + Math.sin(a) * 6;
      p.px(x, y, P.white); p.px(x - 1, y, P.cyan); p.px(x - 2, y, P.blue);
    }
  },
  chargeSword: (p) => {
    p.line(3, 13, 12, 4, P.silver); p.line(4, 13, 13, 4, P.gray);
    p.rect(2, 12, 3, 3, P.gold);
    p.px(13, 2, P.yellow); p.px(14, 5, P.yellow); p.px(11, 1, P.orange); p.px(8, 3, P.yellow);
  },
  dodge: (p) => {
    p.rect(5, 7, 5, 6, P.brownD); p.rect(5, 12, 8, 3, P.brown); p.hline(5, 12, 8, P.clay);
    p.hline(1, 8, 3, P.silver); p.hline(0, 11, 4, P.silver); p.hline(2, 14, 2, P.silver);
  },
  sword: (p) => {
    p.line(3, 13, 12, 4, P.silver); p.line(4, 13, 13, 4, P.gray); p.px(13, 3, P.white);
    p.line(2, 10, 6, 14, P.gold);
    p.rect(1, 13, 3, 2, P.brownD);
  },
  toyHorse: (p) => {
    p.rect(4, 6, 8, 4, P.clay);
    p.rect(10, 3, 3, 5, P.clay); p.rect(12, 3, 2, 2, P.clay);
    p.px(12, 3, P.ink);
    p.vline(4, 10, 3, P.brown); p.vline(11, 10, 3, P.brown);
    p.hline(2, 13, 12, P.brownD);
    p.vline(9, 2, 3, P.brownD);
    p.px(3, 6, P.brownD); p.px(2, 7, P.brownD);
  },
  page: (p) => {
    p.rect(3, 2, 10, 13, P.sand);
    p.vline(12, 2, 13, P.tan); p.hline(3, 14, 10, P.tan);
    for (let y = 4; y < 13; y += 2) p.hline(5, y, 6 - (y % 4 === 0 ? 2 : 0), P.brown);
    p.erase(3, 2); p.erase(12, 14);
  },
  root: (p) => {
    p.line(8, 2, 8, 9, P.greenL);
    p.ellipse(8, 11, 3, 3, P.tan);
    p.line(7, 13, 4, 15, P.brown); p.line(9, 13, 12, 15, P.brown);
    p.px(6, 3, P.greenL); p.px(10, 4, P.green); p.px(7, 10, P.sand);
  },
  locket: (p) => {
    p.line(4, 1, 8, 5, P.gold); p.line(12, 1, 8, 5, P.gold);
    p.circle(8, 10, 4, P.gold);
    p.circle(8, 10, 2.5, P.pink);
    p.px(7, 9, P.white);
  },
  map: (p) => {
    p.rect(2, 3, 12, 10, P.sand);
    p.vline(6, 3, 10, P.tan); p.vline(10, 3, 10, P.tan);
    p.line(3, 10, 8, 6, P.red); p.line(8, 6, 12, 9, P.red);
    p.px(12, 9, P.redD);
  },
  coinIcon: (p) => {
    p.circle(8, 8, 5, P.gold);
    p.circle(7.5, 7.5, 3.5, P.yellow);
    p.vline(8, 5, 6, P.brown);
    p.px(6, 5, P.white);
  },
  flame: (p) => {
    p.ellipse(8, 10, 4, 5, P.orange);
    p.ellipse(8, 11, 2, 3, P.yellow);
    p.px(8, 4, P.orange); p.px(7, 5, P.orange); p.px(9, 3, P.gold);
    p.px(8, 12, P.white);
  },
  skull: (p) => {
    p.circle(8, 7, 5, P.sand);
    p.rect(5, 10, 6, 3, P.sand);
    p.rect(5, 6, 2, 2, P.ink); p.rect(9, 6, 2, 2, P.ink);
    p.px(8, 9, P.ink); p.px(6, 12, P.gray); p.px(8, 12, P.gray); p.px(10, 12, P.gray);
  },
};

export function buildItems() {
  const out = {
    heart: { full: heart('full'), half: heart('half'), empty: heart('empty') },
    coin: [0, 1, 2].map((tier) => [0, 1, 2, 3].map((f) => coin(f, tier))),
  };
  for (const [name, fn] of Object.entries(icons)) out[name] = paint(16, 16, fn, O);
  return out;
}
