// Procedural humanoid sprite builder: heads/torsos from small templates,
// legs & arms drawn per pose, auto outline. Used by player, NPCs and many enemies.
import { PixelArt } from '../pixel.js';
import { P } from '../palette.js';

export const HFW = 16; // frame width
export const HFH = 22; // frame height
export const H_ANCHOR_Y = 19; // feet row

// ---- Head templates: rows 2..10. Down/up are left halves (cols 3..7) mirrored.
// Side templates are full width (cols 3..12), facing right.
const HEADS = {
  messy: {
    down: ['..hhh', '.hhjh', 'hhjhh', 'hhhhh', 'hhhhh', 'hhhss', 'hsess', 'Hssss', '.SSss'],
    up: ['..hhh', '.hhhh', 'hhhjh', 'hhjhh', 'hhhhh', 'hhhhh', 'Hhhhh', 'HHhhh', '..SSS'],
    side: ['..hhhhh...', '.hhhjjhh..', 'hhhhhhhhh.', 'hhhhhhhhhh', 'hhhhhhhssh', 'hhhhhsssss', 'HhhhSssess', '.HHhSsssss', '..HH.SSss.'],
  },
  bun: {
    down: ['...hh', '..hjh', '.hhhh', 'hhhhh', 'hhhhs', 'hssss', 'hsess', 'hSsss', '.SSss'],
    up: ['...hh', '..hjh', '.hhhh', 'hhhjh', 'hhhhh', 'hhhhh', 'hhhhh', 'Hhhhh', '.HSSS'],
    side: ['.hh.......', 'hjhhhhh...', 'hhhhhhhhh.', 'hhhhhhhhh.', 'hhhhhhsss.', 'hhhhssssss', 'HhhhSssess', '.HhhSsssss', '..H..SSss.'],
  },
  long: {
    down: ['..hhh', '.hhjh', 'hhjhh', 'hhhhh', 'hhhhs', 'hhsss', 'hsess', 'hssss', 'hhSss'],
    up: ['..hhh', '.hhhh', 'hhhjh', 'hhjhh', 'hhhhh', 'hhhhh', 'hhhhh', 'hhhhh', 'Hhhhh'],
    side: ['..hhhhh...', '.hhhjjhh..', 'hhhhhhhhh.', 'hhhhhhhhhh', 'hhhhhhhssh', 'hhhhhsssss', 'hhhhSssess', 'hhhhSsssss', 'Hhhh.SSss.'],
  },
  short: {
    down: ['.....', '..hhh', '.hhjh', 'hhhhh', 'hhhss', 'hssss', 'Ssess', 'Sssss', '.SSss'],
    up: ['.....', '..hhh', '.hhhh', 'hhhjh', 'hhhhh', 'hhhhh', 'Hhhhh', 'HHhhh', '.SSSS'],
    side: ['..........', '..hhhhh...', '.hhhjhhh..', 'hhhhhhhhs.', 'hhhhhhssss', 'hhhhssssss', 'HhhhSssess', '.HhhSsssss', '..H..SSss.'],
  },
  bald: {
    down: ['.....', '..sss', '.ssss', 'sssss', 'hssss', 'hssss', 'hsess', 'hSsss', '.hhhh'],
    up: ['.....', '..sss', '.ssss', 'sssss', 'Sssss', 'hssss', 'hhhhh', 'Hhhhh', '.SSSS'],
    side: ['..........', '..sssss...', '.sssssss..', 'ssssssssss', 'hhsSssssss', 'hhhSssssss', 'HhhhSssess', '.HhhShhhhh', '..H..hhhh.'],
  },
  hood: {
    down: ['..rrr', '.rrqr', 'rrqrr', 'rrrrr', 'rRRRR', 'rRsss', 'rRess', 'rRsss', 'rrRSs'],
    up: ['..rrr', '.rrrr', 'rrrqr', 'rrqrr', 'rrrrr', 'rrrrr', 'rrrrr', 'Rrrrr', 'RRrrr'],
    side: ['..rrrr....', '.rrrqqr...', 'rrrrrrrr..', 'rrrrrrrRR.', 'rrrrrRRsss', 'rrrrRsssss', 'rrrrRssess', 'Rrrrrsssss', '.RRrr.SSs.'],
  },
  hoodDark: {
    down: ['..rrr', '.rrqr', 'rrqrr', 'rrrrr', 'rRRRR', 'rRkkk', 'rRkgk', 'rRkkk', 'rrRkk'],
    up: ['..rrr', '.rrrr', 'rrrqr', 'rrqrr', 'rrrrr', 'rrrrr', 'rrrrr', 'Rrrrr', 'RRrrr'],
    side: ['..rrrr....', '.rrrqqr...', 'rrrrrrrr..', 'rrrrrrrRR.', 'rrrrrRRkkk', 'rrrrRkkkkk', 'rrrrRkkgkk', 'Rrrrrkkkkk', '.RRrr.kkk.'],
  },
  skull: {
    down: ['..www', '.wwww', 'wwwww', 'wwwww', 'wwwww', 'wkkww', 'wkgww', 'Wwwwk', '.wWkW'],
    up: ['..www', '.wwww', 'wwwww', 'wwwww', 'wwwww', 'wwwww', 'Wwwww', 'WWwww', '..WWW'],
    side: ['..wwwww...', '.wwwwwwww.', 'wwwwwwwwww', 'wwwwwwwwww', 'wwwwwwwkkw', 'Wwwwwwwkgw', 'WWwwwwwwwk', '.WWwwWwkwk', '..WW.wWwW.'],
  },
  helmet: {
    down: ['..nnn', '.nmmm', 'nmmmm', 'mmmmm', 'mmmmm', 'Mkkkk', 'Mkgkk', 'MMmmm', '.MMmm'],
    up: ['..nnn', '.nmmm', 'nmmnm', 'mmnmm', 'mmmmm', 'mmmmm', 'Mmmmm', 'MMmmm', '.MMMM'],
    side: ['..nnnnn...', '.nmmmmmm..', 'nmmmmmmmm.', 'mmmmmmmmmm', 'mmmmmmkkkk', 'Mmmmmkkgkk', 'MMmmmmmmmm', '.MMmmmmmm.', '..MM.MMM..'],
  },
  cap: {
    down: ['..yyy', '.yyyy', 'yyyyg', 'MMMMM', 'hssss', 'hssss', 'hsess', 'hhsss', '.hhhh'],
    up: ['..yyy', '.yyyy', 'yyyyy', 'MMMMM', 'hhhhh', 'hhhhh', 'Hhhhh', 'HHhhh', '.SSSS'],
    side: ['..yyyyy...', '.yyyyyyyg.', 'yyyyyyyyyy', 'MMMMMMMMMM', 'hhhSssssss', 'hhhSssssss', 'HhhhSssess', '.HhhShhhhh', '..H..hhhh.'],
  },
};

// ---- Torso templates: rows 11..15. Down/up: left halves cols 4..7. Side: cols 5..10.
const TORSOS = {
  tunic: {
    down: ['.ccc', 'tucc', 'ttut', 'bbby', 'tTtt'],
    up: ['.ccc', 'tttt', 'tttt', 'bbbb', 'tTtt'],
    side: ['.cccc.', 'ttcct.', 'tttut.', 'bbbbb.', 'tTttt.'],
  },
  robe: {
    down: ['.qqq', 'rrqr', 'rrqr', 'bbbb', 'rRrr'],
    up: ['.rrr', 'rrrr', 'rrrr', 'bbbb', 'rRrr'],
    side: ['.qqq..', 'rrrqr.', 'rrrqr.', 'bbbbb.', 'rRrrr.'],
  },
  bones: {
    down: ['.WWw', 'wkwk', 'wwkw', 'kWWw', '.ww.'],
    up: ['.WWw', '.wwk', '.www', '.wWW', '.ww.'],
    side: ['.www..', '.wkww.', '.wwkw.', '..Ww..', '.wwW..'],
  },
  armor: {
    down: ['nmmm', 'nmMm', 'mnmM', 'bbby', 'MmMm'],
    up: ['nmmm', 'mmmm', 'mmmM', 'bbbb', 'MmMm'],
    side: ['nmmmm.', 'mnmmM.', 'mmnmM.', 'bbbbb.', 'MmMmm.'],
  },
  apron: {
    down: ['.ccc', 'tuaa', 'taaa', 'baaa', 'tTaa'],
    up: ['.ccc', 'tttt', 'tttt', 'bbbb', 'tTtt'],
    side: ['.cccc.', 'ttaaa.', 'ttaaa.', 'bbaaa.', 'tTaa..'],
  },
};

function mirrorHalf(rows) {
  return rows.map((r) => r + r.split('').reverse().join(''));
}

// Build a colour map from a look.
function colorMap(look) {
  return {
    h: look.hair, H: look.hairD, j: look.hairL,
    s: look.skin, S: look.skinD, e: look.eye || P.ink,
    t: look.tunic, T: look.tunicD, u: look.tunicL,
    c: look.accent, C: look.accentD,
    b: look.belt, y: look.buckle,
    r: look.robe, R: look.robeD, q: look.robeL,
    w: P.sand, W: P.gray, k: P.ink, g: look.glow || P.red,
    m: look.metal || P.steel, M: look.metalD || P.slate, n: look.metalL || P.silver,
    a: look.apron || P.brownD,
  };
}

// Pose descriptors per animation frame.
function poses() {
  return {
    idle: [{ bob: 0 }, { bob: 1, breath: true }],
    walk: [
      { bob: 0, leg: 'L', arm: 'b' },
      { bob: -1, leg: 'P', arm: 'n' },
      { bob: 0, leg: 'R', arm: 'f' },
      { bob: -1, leg: 'P', arm: 'n' },
    ],
    attack: [{ bob: 0, leg: 'W', arm: 'wind', lean: -1 }, { bob: 0, leg: 'W', arm: 'fwd', lean: 1 }],
    dash: [{ bob: 1, leg: 'D', arm: 'b', lean: 1 }],
    hurt: [{ bob: 0, leg: 'S', arm: 'out', eyes: 'closed', lean: -1 }],
    hold: [{ bob: 0, leg: 'S', arm: 'up' }],
    cast: [{ bob: 0, leg: 'W', arm: 'fwd' }],
    drink: [{ bob: 0, leg: 'S', arm: 'mouth' }],
    kneel: [{ bob: 3, leg: 'K', arm: 'n', eyes: 'closed' }],
    guard: [{ bob: 0, leg: 'W', arm: 'guard' }],
  };
}

function drawLegs(p, look, dir, pose, cm) {
  const pants = look.pants, boots = look.boots, bootsD = look.bootsD || P.plum;
  const leg = pose.leg || 'S';
  if (look.body === 'robe' || look.skirt) {
    // robe hem instead of legs
    const sway = leg === 'L' ? -1 : leg === 'R' ? 1 : 0;
    const r = cm.r || look.tunic, R = cm.R || look.tunicD;
    const base = look.body === 'robe' ? r : look.tunic;
    const dark = look.body === 'robe' ? R : look.tunicD;
    for (let y = 16; y <= 19; y++) {
      const spread = y - 16;
      const x0 = 4 - (spread >> 1) + (y === 19 ? sway : 0);
      const x1 = 11 + (spread >> 1) + (y === 19 ? sway : 0);
      for (let x = x0; x <= x1; x++) p.px(x, y, x === x0 || x === x1 || y === 19 ? dark : base);
    }
    if (leg !== 'K') {
      p.px(6 + sway, 20 - 1, bootsD);
      p.px(9 + sway, 20 - 1, bootsD);
    }
    return;
  }
  const bone = look.body === 'bones';
  const pc = bone ? P.sand : pants, pd = bone ? P.gray : P.navy;
  const bc = bone ? P.gray : boots;
  if (leg === 'K') {
    // kneeling: short stubs
    p.rect(4, 16, 3, 2, pc); p.rect(9, 16, 3, 2, pc);
    p.rect(3, 17, 3, 1, bc); p.rect(10, 17, 3, 1, bc);
    return;
  }
  if (dir === 'side') {
    let back = 6, front = 8, backLift = 0, frontLift = 0;
    if (leg === 'L') { back = 5; front = 9; }
    else if (leg === 'R') { back = 9; front = 5; }
    else if (leg === 'P') { back = 7; front = 7; backLift = 1; }
    else if (leg === 'D') { back = 4; front = 10; backLift = 1; }
    else if (leg === 'W') { back = 5; front = 9; }
    const legW = bone ? 1 : 2;
    // back leg (darker)
    p.rect(back, 16, legW, 2 - backLift, pd);
    p.rect(back, 18 - backLift, 2, 2, bootsD);
    // front leg
    p.rect(front, 16, legW, 2 - frontLift, pc);
    p.rect(front, 18 - frontLift, 3, 2, bc);
    p.erase(front + 2, 18 - frontLift);
    if (!bone) p.px(front + 2, 19 - frontLift, bc);
    return;
  }
  // down / up
  let lLift = 0, rLift = 0;
  if (leg === 'L') rLift = 1;
  else if (leg === 'R') lLift = 1;
  else if (leg === 'D') { lLift = 1; rLift = 1; }
  const lw = bone ? 1 : 2;
  const lx = bone ? 6 : 5, rx = bone ? 9 : 9;
  const stance = leg === 'W' ? 1 : 0;
  p.rect(lx - stance, 16, lw, 2 - lLift, pc);
  p.rect(lx - stance, 18 - lLift, 2, 2, lLift ? bootsD : bc);
  p.rect(rx + stance, 16, lw, 2 - rLift, pc);
  p.rect(rx + stance, 18 - rLift, 2, 2, rLift ? bootsD : bc);
  if (!bone) {
    p.px(lx - stance, 16, pd);
    p.px(rx + stance + 1, 16, pd);
  }
}

function drawArms(p, look, dir, pose, oy) {
  const sleeve = look.body === 'robe' ? look.robe : look.body === 'bones' ? P.sand : look.body === 'armor' ? (look.metal || P.steel) : look.tunic;
  const sleeveD = look.body === 'robe' ? look.robeD : look.body === 'bones' ? P.gray : look.body === 'armor' ? (look.metalD || P.slate) : look.tunicD;
  const hand = look.body === 'bones' ? P.sand : look.body === 'armor' ? (look.metalD || P.slate) : look.skin;
  const arm = pose.arm || 'n';
  const y = 12 + oy;
  if (dir === 'side') {
    let ax = 7, ay = y, hx = 7, hy = y + 2;
    if (arm === 'f') { hx = 9; hy = y + 2; }
    else if (arm === 'b') { hx = 5; hy = y + 2; }
    else if (arm === 'fwd') { p.rect(8, y, 4, 1, sleeve); p.px(12, y, hand); p.px(13, y, hand); return; }
    else if (arm === 'wind') { p.rect(5, y - 1, 2, 2, sleeve); p.px(4, y - 2, hand); return; }
    else if (arm === 'up') { p.rect(7, y - 4, 1, 4, sleeve); p.px(7, y - 5, hand); return; }
    else if (arm === 'mouth') { p.rect(8, y, 2, 1, sleeve); p.px(10, y - 1, hand); p.px(10, y - 2, P.cyan); p.px(11, y - 2, P.blue); return; }
    else if (arm === 'out') { p.rect(8, y - 1, 3, 1, sleeve); p.px(11, y - 2, hand); return; }
    else if (arm === 'guard') { p.rect(8, y, 2, 2, sleeve); p.px(10, y + 1, hand); return; }
    p.rect(ax, ay, 2, 2, sleeveD);
    p.px(ax, ay, sleeve);
    p.px(hx, hy, hand);
    if (hx !== ax) p.px((hx + ax) >> 1, hy - 1, sleeveD);
    return;
  }
  // down / up: two arms at cols 3 and 12
  const L = 3, R = 12;
  if (arm === 'up') {
    p.rect(L, y - 5, 1, 5, sleeve); p.rect(R, y - 5, 1, 5, sleeve);
    p.px(L, y - 6, hand); p.px(R, y - 6, hand);
    return;
  }
  if (arm === 'out') {
    p.rect(1, y, 3, 1, sleeve); p.rect(12, y, 3, 1, sleeve);
    p.px(0, y - 1, hand); p.px(15, y - 1, hand);
    return;
  }
  if (arm === 'fwd' || arm === 'guard') {
    if (dir === 'down') {
      p.rect(L, y, 1, 2, sleeve); p.rect(R, y, 1, 2, sleeve);
      p.px(L + 1, y + 2, hand); p.px(R - 1, y + 2, hand);
    } else {
      p.rect(L, y - 2, 1, 3, sleeve); p.rect(R, y - 2, 1, 3, sleeve);
      p.px(L, y - 3, hand); p.px(R, y - 3, hand);
    }
    return;
  }
  if (arm === 'wind') {
    p.rect(L - 1, y - 1, 2, 2, sleeve); p.px(L - 1, y - 2, hand);
    p.rect(R, y, 1, 2, sleeve); p.px(R, y + 2, hand);
    return;
  }
  if (arm === 'mouth') {
    p.rect(L, y, 1, 2, sleeve); p.px(L, y + 2, hand);
    p.rect(R - 1, y - 1, 2, 1, sleeve); p.px(R - 2, y - 2, hand);
    p.px(R - 3, y - 3, P.cyan);
    return;
  }
  const sw = arm === 'f' ? 1 : arm === 'b' ? -1 : 0;
  p.rect(L, y, 1, 2, sleeve); p.px(L, y + 2 + (sw > 0 ? 0 : sw < 0 ? -1 : 0), hand);
  p.rect(R, y, 1, 2, sleeve); p.px(R, y + 2 + (sw < 0 ? 0 : sw > 0 ? -1 : 0), hand);
  p.px(L, y, sleeveD); p.px(R, y, sleeveD);
}

function drawHead(p, look, dir, oy, eyesClosed, cm) {
  const style = HEADS[look.head] || HEADS.messy;
  let rows = dir === 'side' ? style.side : mirrorHalf(style[dir]);
  if (eyesClosed) rows = rows.map((r) => r.replace(/e/g, 'S'));
  if (look.beard && dir !== 'up') {
    rows = rows.slice();
    const last = rows.length - 1;
    if (dir === 'down') {
      rows[last - 1] = rows[last - 1].replace(/^(.)ssss/, '$1jjjj').replace(/ssss(.)$/, 'jjjj$1');
      rows[last] = rows[last].replace(/[sS]/g, 'j');
    } else {
      rows[last] = rows[last].replace(/[sS]/g, 'j');
    }
  }
  p.template(rows, cm, 3, 2 + oy);
}

function drawTorso(p, look, dir, oy, cm) {
  const t = TORSOS[look.body] || TORSOS.tunic;
  if (dir === 'side') p.template(t.side, cm, 5, 11 + oy);
  else p.template(mirrorHalf(t[dir]), cm, 4, 11 + oy);
}

function drawSheath(p, dir, oy) {
  // sword carried on the back
  if (dir === 'up') {
    p.line(4, 17 + oy, 11, 10 + oy, P.gray);
    p.px(11, 10 + oy, P.gold);
    p.px(12, 9 + oy, P.brownD);
  } else if (dir === 'side') {
    p.line(3, 16 + oy, 5, 12 + oy, P.gray);
    p.px(5, 11 + oy, P.gold);
  } else {
    p.px(12, 10 + oy, P.brownD);
    p.px(13, 9 + oy, P.gold);
  }
}

function buildFrame(look, dir, pose) {
  const p = new PixelArt(HFW, HFH);
  const cm = colorMap(look);
  const oy = pose.bob || 0;
  const side = dir === 'side';
  if (look.sheath && dir === 'down') drawSheath(p, dir, oy);
  drawLegs(p, look, side ? 'side' : dir, pose, cm);
  // side view: back arm behind torso when swinging
  drawTorso(p, look, side ? 'side' : dir, oy, cm);
  if (look.sheath && dir !== 'down') drawSheath(p, dir, oy);
  if (!(side && pose.arm === 'up')) drawArms(p, look, side ? 'side' : dir, pose, oy);
  drawHead(p, look, side ? 'side' : dir, oy, pose.eyes === 'closed', cm);
  if (side && pose.arm === 'up') drawArms(p, look, 'side', pose, oy);
  if (look.extra) look.extra(p, dir, pose, oy);
  if (pose.lean && side) {
    // shift upper body by lean (simple shear)
    const src = p.clone();
    p.data.fill(0);
    for (let y = 0; y < HFH; y++) {
      const sh = y < 11 ? pose.lean : y < 16 ? (pose.lean > 0 ? 1 : 0) * Math.sign(pose.lean) : 0;
      for (let x = 0; x < HFW; x++) {
        const v = src.get(x - sh, y);
        if (v >>> 24) p.data[y * HFW + x] = v;
      }
    }
  }
  p.outline(look.outline || P.ink);
  return p.toCanvas();
}

// Returns { down:{anim:[canvas]}, up:{...}, right:{...}, left:{...} }.
export function buildHumanoid(look, animNames = null) {
  const out = { down: {}, up: {}, right: {}, left: {} };
  const ps = poses();
  const names = animNames || Object.keys(ps);
  for (const name of names) {
    const frames = ps[name];
    for (const dir of ['down', 'up', 'side']) {
      const list = frames.map((pose) => buildFrame(look, dir, pose));
      if (dir === 'side') {
        out.right[name] = list;
        out.left[name] = list.map(mirror);
      } else out[dir][name] = list;
    }
  }
  return out;
}

function mirror(c) {
  const m = document.createElement('canvas');
  m.width = c.width; m.height = c.height;
  const ctx = m.getContext('2d');
  ctx.translate(c.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(c, 0, 0);
  return m;
}

// Lying body (rotated idle frame) for death / sleeping.
export function lyingFrame(canvas) {
  const c = document.createElement('canvas');
  c.width = canvas.height; c.height = canvas.width;
  const ctx = c.getContext('2d');
  ctx.translate(c.width, 0);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(canvas, 0, 0);
  return c;
}

// ---- Looks ----
export const LOOKS = {
  player: {
    head: 'messy', body: 'tunic', sheath: true,
    hair: P.brownD, hairD: P.plum, hairL: P.brown,
    skin: P.skin, skinD: P.skinD,
    tunic: P.blueD, tunicD: P.navy, tunicL: P.blue,
    accent: P.red, accentD: P.redD,
    belt: P.brownD, buckle: P.gold,
    pants: P.slate, boots: P.brownD, bootsD: P.plum,
  },
  echo: {
    head: 'messy', body: 'tunic', sheath: true,
    hair: P.navy, hairD: P.ink, hairL: P.slate,
    skin: P.slate, skinD: P.navy, eye: P.cyan,
    tunic: P.black, tunicD: P.ink, tunicL: P.purple,
    accent: P.purple, accentD: P.plum,
    belt: P.ink, buckle: P.cyan,
    pants: P.navy, boots: P.ink, bootsD: P.ink, outline: P.void,
  },
  maren: {
    head: 'bun', body: 'robe',
    hair: P.silver, hairD: P.gray, hairL: P.white,
    skin: P.skin, skinD: P.skinD,
    robe: P.purple, robeD: P.plum, robeL: P.pink,
    belt: P.gold, buckle: P.gold, boots: P.brownD,
  },
  brann: {
    head: 'hood', body: 'robe', beard: true,
    hair: P.tan, hairD: P.brown, hairL: P.sand,
    skin: P.skin, skinD: P.skinD,
    robe: P.greenD, robeD: P.teal, robeL: P.green,
    belt: P.brownD, buckle: P.gold, boots: P.brownD,
  },
  oda: {
    head: 'long', body: 'apron',
    hair: P.rust, hairD: P.brownD, hairL: P.clay,
    skin: P.skinD, skinD: P.brown,
    tunic: P.sand, tunicD: P.tan, tunicL: P.white,
    accent: P.sand, accentD: P.tan, apron: P.brownD,
    belt: P.plum, buckle: P.gray,
    pants: P.plum, boots: P.plum, bootsD: P.ink,
  },
  tobi: {
    head: 'messy', body: 'tunic',
    hair: P.sand, hairD: P.tan, hairL: P.white,
    skin: P.silver, skinD: P.gray, eye: P.blueD,
    tunic: P.gray, tunicD: P.steel, tunicL: P.silver,
    accent: P.silver, accentD: P.gray,
    belt: P.steel, buckle: P.silver,
    pants: P.steel, boots: P.slate, bootsD: P.navy, outline: P.slate,
  },
  gert: {
    head: 'cap', body: 'tunic', beard: true,
    hair: P.gray, hairD: P.steel, hairL: P.silver,
    skin: P.skin, skinD: P.skinD,
    tunic: P.brown, tunicD: P.brownD, tunicL: P.tan,
    accent: P.rust, accentD: P.brownD,
    belt: P.plum, buckle: P.gray,
    pants: P.slate, boots: P.plum, bootsD: P.ink,
    metal: P.steel, metalD: P.slate, glow: P.yellow,
  },
  vela: {
    head: 'hood', body: 'robe',
    hair: P.silver, hairD: P.gray, hairL: P.white,
    skin: P.skin, skinD: P.skinD,
    robe: P.silver, robeD: P.gray, robeL: P.white,
    belt: P.blueD, buckle: P.gold, boots: P.slate,
  },
  aldricGhost: {
    head: 'helmet', body: 'armor',
    metal: P.gray, metalD: P.steel, metalL: P.silver, glow: P.cyan,
    tunic: P.steel, tunicD: P.slate,
    belt: P.slate, buckle: P.cyan,
    pants: P.steel, boots: P.slate, bootsD: P.navy, outline: P.navy,
  },
  skeleton: {
    head: 'skull', body: 'bones',
    glow: P.red, belt: P.brownD, buckle: P.gray,
    pants: P.sand, boots: P.gray, bootsD: P.steel,
  },
  skeletonArcher: {
    head: 'skull', body: 'bones',
    glow: P.yellow, belt: P.greenD, buckle: P.gray,
    pants: P.sand, boots: P.gray, bootsD: P.steel,
    extra(p, dir, pose, oy) {
      // tattered hood strip
      if (dir === 'down') { p.px(4, 4 + oy, P.greenD); p.px(11, 4 + oy, P.greenD); }
    },
  },
  skeletonKnight: {
    head: 'helmet', body: 'bones',
    metal: P.steel, metalD: P.slate, metalL: P.gray, glow: P.red,
    belt: P.redD, buckle: P.gold,
    pants: P.sand, boots: P.slate, bootsD: P.navy,
  },
  mage: {
    head: 'hoodDark', body: 'robe',
    robe: P.purple, robeD: P.plum, robeL: P.pink,
    skin: P.ink, glow: P.cyan,
    belt: P.gold, buckle: P.gold, boots: P.plum,
  },
  voidMage: {
    head: 'hoodDark', body: 'robe',
    robe: P.navy, robeD: P.black, robeL: P.slate,
    skin: P.ink, glow: P.magenta,
    belt: P.purple, buckle: P.purple, boots: P.ink,
  },
  villagerGhost: {
    head: 'short', body: 'tunic',
    hair: P.gray, hairD: P.steel, hairL: P.silver,
    skin: P.silver, skinD: P.gray,
    tunic: P.steel, tunicD: P.slate, tunicL: P.gray,
    accent: P.gray, accentD: P.steel,
    belt: P.slate, buckle: P.gray,
    pants: P.slate, boots: P.navy, bootsD: P.navy, outline: P.slate,
  },
};
