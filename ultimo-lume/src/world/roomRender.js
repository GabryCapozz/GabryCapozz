// Pre-renders a room's static tile layer (with autotiling, shadows, shorelines)
// and records animated tiles (water, lava) to be redrawn every frame.
import { makeCanvas } from '../gfx/pixel.js';
import { P } from '../gfx/palette.js';
import { T, isWallType } from './tiletypes.js';
import { hash2 } from '../core/math.js';
import {
  THEMES, FLOORS, WALLS, FOLIAGE, floorTile, wallFaceTile, wallTopTile, crackedFaceTile,
  waterFrame, lavaFrame, chasmTile, chasmEdgeTile, bridgeTile, fenceTile, railTile,
} from '../gfx/tiles.js';

const isWater = (t) => t === T.WATER || t === T.SHALLOW;
const solidWall = (t) => t === T.WALL || t === T.CRACKED;

function floorKindFor(theme, t) {
  if (t === T.FLOOR2) return theme.floor2;
  if (t === T.FLOOR3) return theme.floor3;
  return theme.floor;
}

function dither(ctx, x, y, w, h, color, phase = 0) {
  ctx.fillStyle = color;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (((x + i + y + j + phase) & 1) === 0) ctx.fillRect(x + i, y + j, 1, 1);
}

export function renderRoom(room) {
  const W = room.tw * 16, H = room.th * 16;
  room.canvas = makeCanvas(W, H);
  room.overlay = makeCanvas(W, H);
  room.animTiles = [];
  const ctx = room.canvas.getContext('2d');
  const octx = room.overlay.getContext('2d');
  for (let ty = 0; ty < room.th; ty++) for (let tx = 0; tx < room.tw; tx++) paintTile(room, ctx, octx, tx, ty);
  paintFoliage(room, ctx);
}

// Repaint a tile and its neighbours after a tile change (e.g. bombed wall).
export function repaintArea(room, tx, ty) {
  const ctx = room.canvas.getContext('2d');
  const octx = room.overlay.getContext('2d');
  room.animTiles = room.animTiles.filter((a) => Math.abs(a.tx - tx) > 1 || Math.abs(a.ty - ty) > 1);
  for (let y = ty - 1; y <= ty + 1; y++) for (let x = tx - 1; x <= tx + 1; x++) {
    if (x < 0 || y < 0 || x >= room.tw || y >= room.th) continue;
    ctx.clearRect(x * 16, y * 16, 16, 16);
    octx.clearRect(x * 16, y * 16, 16, 16);
    paintTile(room, ctx, octx, x, y);
  }
}

function paintTile(room, ctx, octx, tx, ty) {
  const theme = THEMES[room.theme] || THEMES.village;
  const t = room.tileAt(tx, ty);
  const x = tx * 16, y = ty * 16;
  const v = (hash2(tx, ty, room.seed) * 64) | 0;
  const up = room.tileAt(tx, ty - 1), down = room.tileAt(tx, ty + 1);
  const left = room.tileAt(tx - 1, ty), right = room.tileAt(tx + 1, ty);

  switch (t) {
    case T.WALL:
    case T.CRACKED: {
      const wk = room.wallKind || theme.wall;
      const wall = WALLS[wk] || WALLS.bricks;
      if (isWallType(down) && down !== T.FOLIAGE) {
        ctx.drawImage(wallTopTile(wk, v), x, y);
        ctx.fillStyle = wall.rim;
        if (!isWallType(left)) ctx.fillRect(x, y, 1, 16);
        if (!isWallType(right)) ctx.fillRect(x + 15, y, 1, 16);
        if (!isWallType(up)) ctx.fillRect(x, y, 16, 1);
      } else {
        ctx.drawImage(t === T.CRACKED ? crackedFaceTile(wk, v) : wallFaceTile(wk, v), x, y);
        ctx.fillStyle = P.ink;
        ctx.fillRect(x, y + 15, 16, 1);
        if (!isWallType(left)) ctx.fillRect(x, y, 1, 16);
        if (!isWallType(right)) ctx.fillRect(x + 15, y, 1, 16);
        if (!isWallType(up)) { ctx.fillStyle = wall.rim; ctx.fillRect(x, y, 16, 1); }
      }
      return;
    }
    case T.FOLIAGE: {
      const fk = FOLIAGE[theme.foliage] || FOLIAGE.trees;
      ctx.fillStyle = fk.leaf[2];
      ctx.fillRect(x, y, 16, 16);
      return;
    }
    case T.WATER:
    case T.SHALLOW:
    case T.LAVA: {
      const frame0 = t === T.LAVA ? lavaFrame(0, v % 4) : waterFrame(0, v % 4, t === T.SHALLOW);
      ctx.drawImage(frame0, x, y);
      room.animTiles.push({ tx, ty, t, v: v % 4 });
      paintLiquidEdges(octx, t, x, y, up, down, left, right, room, theme);
      return;
    }
    case T.CHASM: {
      ctx.drawImage(chasmTile(theme.chasm, v), x, y);
      if (up !== T.CHASM && up !== T.BRIDGE && !isWater(up)) ctx.drawImage(chasmEdgeTile(room.wallKind || theme.wall, theme.chasm === 'void'), x, y);
      return;
    }
    case T.BRIDGE: {
      // what's under the bridge
      const under = [left, right, up, down].find((n) => n === T.WATER || n === T.CHASM || n === T.LAVA) ?? T.CHASM;
      if (under === T.WATER) ctx.drawImage(waterFrame(0, v % 4), x, y);
      else if (under === T.LAVA) ctx.drawImage(lavaFrame(0, v % 4), x, y);
      else ctx.drawImage(chasmTile(theme.chasm, v), x, y);
      ctx.drawImage(bridgeTile(bridgeHorizontal(room, tx, ty)), x, y);
      return;
    }
    default:
      break;
  }

  // ground-like tiles
  const kind = t === T.FENCE || t === T.BARRIER ? theme.floor : t === T.RAIL ? theme.floor : floorKindFor(theme, t);
  ctx.drawImage(floorTile(kind, v), x, y);
  const floorDef = FLOORS[kind] || FLOORS.grass;

  // grass fringe over paths
  if (t === T.FLOOR2 && (theme.floor === 'grass' || theme.floor === 'forestgrass')) {
    const g = theme.floor === 'grass' ? [P.green, P.greenL] : [P.greenD, P.green];
    const fr = (dir, sx, sy, horizontal) => {
      for (let i = 0; i < 16; i++) {
        const len = 1 + ((hash2(tx * 16 + i, ty * 3 + dir, 5) * 3) | 0);
        for (let k = 0; k < len; k++) {
          ctx.fillStyle = k === len - 1 ? g[1] : g[0];
          if (horizontal) ctx.fillRect(sx + i, sy === y ? sy + k : sy - k, 1, 1);
          else ctx.fillRect(sx === x ? sx + k : sx - k, sy + i, 1, 1);
        }
      }
    };
    if (up === T.FLOOR) fr(0, x, y, true);
    if (down === T.FLOOR) fr(1, x, y + 15, true);
    if (left === T.FLOOR) fr(2, x, y, false);
    if (right === T.FLOOR) fr(3, x + 15, y, false);
  }

  if (t === T.RAIL) {
    const h = room.tileAt(tx - 1, ty) === T.RAIL || room.tileAt(tx + 1, ty) === T.RAIL;
    ctx.drawImage(railTile(h), x, y);
  }

  // ambient-occlusion style shadows cast by walls (light from top-left)
  if (isWallType(up)) {
    ctx.fillStyle = floorDef.shadow;
    ctx.fillRect(x, y, 16, 2);
    dither(ctx, x, y + 2, 16, 2, floorDef.shadow);
  }
  if (isWallType(left)) {
    ctx.fillStyle = floorDef.shadow;
    ctx.fillRect(x, y, 2, 16);
    dither(ctx, x + 2, y, 1, 16, floorDef.shadow);
  }
  if (isWallType(room.tileAt(tx - 1, ty - 1)) && !isWallType(up) && !isWallType(left)) {
    ctx.fillStyle = floorDef.shadow;
    ctx.fillRect(x, y, 2, 2);
  }

  if (t === T.FENCE) {
    const isF = (n) => n === T.FENCE || solidWall(n);
    ctx.drawImage(fenceTile(isF(left) || isF(right), isF(up) || isF(down)), x, y);
  }
}

// A bridge runs horizontally if walking along its row reaches solid ground.
function bridgeHorizontal(room, tx, ty) {
  const gap = (t) => t === T.WATER || t === T.CHASM || t === T.LAVA || t === T.SHALLOW;
  const end = (dx, dy) => {
    let x = tx, y = ty;
    for (let i = 0; i < 64; i++) {
      x += dx; y += dy;
      const t = room.tileAt(x, y);
      if (t !== T.BRIDGE) return !gap(t) && !isWallType(t);
      if (x <= 0 || y <= 0 || x >= room.tw - 1 || y >= room.th - 1) return true;
    }
    return false;
  };
  const h = end(-1, 0) || end(1, 0);
  const v = end(0, -1) || end(0, 1);
  return h && !v ? true : !h && v ? false : h;
}

function paintLiquidEdges(octx, t, x, y, up, down, left, right, room, theme) {
  const lava = t === T.LAVA;
  const same = (n) => (lava ? n === T.LAVA : isWater(n)) || n === T.BRIDGE;
  const bank = lava ? P.black : room.theme === 'caves' ? P.black : P.navy;
  const foam = lava ? P.yellow : P.cyan;
  if (!same(up)) {
    octx.fillStyle = isWallType(up) ? P.ink : bank;
    octx.fillRect(x, y, 16, 3);
    dither(octx, x, y + 3, 16, 1, foam);
    if (lava) { octx.fillStyle = P.rust; octx.fillRect(x, y + 2, 16, 1); }
  }
  if (!same(down)) { dither(octx, x, y + 15, 16, 1, lava ? P.rust : P.silver); }
  if (!same(left)) { octx.fillStyle = bank; octx.fillRect(x, y, 1, 16); dither(octx, x + 1, y, 1, 16, foam); }
  if (!same(right)) { octx.fillStyle = bank; octx.fillRect(x + 15, y, 1, 16); dither(octx, x + 14, y, 1, 16, foam, 1); }
}

function paintFoliage(room, ctx) {
  const theme = THEMES[room.theme] || THEMES.village;
  const fk = FOLIAGE[theme.foliage] || FOLIAGE.trees;
  const [mid, light, dark, deep] = fk.leaf;
  const isF = (tx, ty) => room.tileAt(tx, ty) === T.FOLIAGE;
  const isFace = (tx, ty) => isF(tx, ty) && !isF(tx, ty + 1);
  const allowed = (px, py) => {
    const tx = px >> 4, ty = py >> 4;
    if (px < 0 || py < 0 || tx >= room.tw || ty >= room.th) return false;
    if (isF(tx, ty)) return !(isFace(tx, ty) && (py & 15) > 10);
    // small organic overflow onto neighbouring ground (sides / top only)
    const lx = (px - 3) >> 4, rx = (px + 3) >> 4, dy = (py + 3) >> 4;
    return (isF(lx, ty) && !isFace(lx, ty)) || (isF(rx, ty) && !isFace(rx, ty)) || (isF(tx, dy) && !isFace(tx, dy) && (py & 15) > 12);
  };
  const blob = (cx, cy, r) => {
    for (let yy = -r - 1; yy <= r + 1; yy++) for (let xx = -r - 1; xx <= r + 1; xx++) {
      const d = Math.hypot(xx, yy);
      if (d > r + 0.3) continue;
      const px = cx + xx, py = cy + yy;
      if (!allowed(px, py)) continue;
      let c = mid;
      if (d > r - 1.2) c = xx + yy < -1 ? light : dark;
      else if (xx + yy < -r * 0.6) c = light;
      else if (xx + yy > r * 0.7) c = dark;
      ctx.fillStyle = c;
      ctx.fillRect(px, py, 1, 1);
    }
  };
  // trunks + shadows under canopy edge
  for (let ty = 0; ty < room.th; ty++) for (let tx = 0; tx < room.tw; tx++) {
    if (!isFace(tx, ty)) continue;
    const x = tx * 16, y = ty * 16;
    ctx.fillStyle = deep;
    ctx.fillRect(x, y + 8, 16, 8);
    const n = 1 + ((hash2(tx, ty, 3) * 2) | 0);
    for (let i = 0; i < n; i++) {
      const bx = x + 2 + ((hash2(tx, ty, 10 + i) * 10) | 0);
      ctx.fillStyle = fk.trunk[0];
      ctx.fillRect(bx, y + 9, 4, 7);
      ctx.fillStyle = fk.trunk[1];
      ctx.fillRect(bx, y + 9, 1, 7);
      ctx.fillStyle = fk.trunk[2];
      ctx.fillRect(bx + 3, y + 9, 1, 7);
      ctx.fillRect(bx - 1, y + 15, 6, 1);
    }
  }
  // canopy clusters, row-major so lower clusters overlap upper ones
  for (let ty = 0; ty < room.th; ty++) for (let tx = 0; tx < room.tw; tx++) {
    if (!isF(tx, ty)) continue;
    for (let i = 0; i < 3; i++) {
      const cx = tx * 16 + 2 + ((hash2(tx, ty, 20 + i) * 12) | 0);
      const cy = ty * 16 + 2 + ((hash2(tx, ty, 30 + i) * (isFace(tx, ty) ? 6 : 12)) | 0);
      blob(cx, cy, 4 + ((hash2(tx, ty, 40 + i) * 3) | 0));
    }
    if (hash2(tx, ty, 50) < 0.15) {
      ctx.fillStyle = hash2(tx, ty, 51) < 0.5 ? P.red : P.yellow;
      ctx.fillRect(tx * 16 + 5 + ((hash2(tx, ty, 52) * 6) | 0), ty * 16 + 4 + ((hash2(tx, ty, 53) * 6) | 0), 1, 1);
    }
  }
}

// Draw animated tiles visible in the camera window.
export function drawAnimatedTiles(ctx, room, camX, camY, vw, vh, time) {
  const frame = Math.floor(time / 12) % 4;
  const lavaF = Math.floor(time / 16) % 4;
  for (const a of room.animTiles) {
    const x = a.tx * 16 - camX, y = a.ty * 16 - camY;
    if (x < -16 || y < -16 || x > vw || y > vh) continue;
    const img = a.t === T.LAVA ? lavaFrame(lavaF, a.v) : waterFrame((frame + a.v) % 4, a.v, a.t === T.SHALLOW);
    ctx.drawImage(img, x, y);
  }
}
