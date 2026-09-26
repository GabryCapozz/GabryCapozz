// Axis-separated AABB movement against the tile grid and solid entities.
import { TILE_PROPS, T } from '../world/tiletypes.js';

// mode: 'walk' (player), 'ground' (enemies avoid hazards), 'knock' (can be pushed into pits),
// 'fly' (only walls block), 'ghost' (nothing blocks)
export function tileBlocks(t, mode) {
  const p = TILE_PROPS[t];
  if (!p) return true;
  if (mode === 'ghost') return false;
  if (mode === 'fly') return p.wall || t === T.BARRIER;
  if (p.solid) return true;
  if (mode === 'ground') return p.pit || p.lava;
  return false;
}

export function boxBlocked(room, cx, cy, w, h, mode, self) {
  const x0 = Math.floor((cx - w / 2) / 16), x1 = Math.floor((cx + w / 2 - 0.01) / 16);
  const y0 = Math.floor((cy - h / 2) / 16), y1 = Math.floor((cy + h / 2 - 0.01) / 16);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (tx < 0 || ty < 0 || tx >= room.tw || ty >= room.th) {
        if (mode === 'ghost') continue;
        // outside the room: only passable through exits (handled by transitions)
        if (!room.isExitEdge(tx, ty)) return true;
        continue;
      }
      if (tileBlocks(room.tiles[ty * room.tw + tx], mode)) return true;
    }
  }
  if (mode === 'ghost') return false;
  const l = cx - w / 2, r = cx + w / 2, t = cy - h / 2, b = cy + h / 2;
  for (const e of room.solids) {
    if (e === self || e.dead || !e.solid) continue;
    if (mode === 'fly' && !e.blocksFlyers) continue;
    if (e.solidFilter && !e.solidFilter(self)) continue;
    const bw = e.bw ?? e.w, bh = e.bh ?? e.h;
    if (l < e.x + bw / 2 && r > e.x - bw / 2 && t < e.y + bh / 2 && b > e.y - bh / 2) return e;
  }
  return false;
}

// Move an entity, resolving collisions. Returns {x:bool, y:bool} blocked flags.
export function moveEntity(e, dx, dy, mode = 'walk', corner = 0) {
  const room = e.game.room;
  const res = { x: false, y: false, hitX: null, hitY: null };
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 4));
  const sx = dx / steps, sy = dy / steps;
  for (let i = 0; i < steps; i++) {
    if (sx !== 0) {
      const hit = boxBlocked(room, e.x + sx, e.y, e.w, e.h, mode, e);
      if (!hit) e.x += sx;
      else {
        res.x = true;
        res.hitX = hit;
        // corner correction: slide around small overlaps
        if (corner && sy === 0) {
          for (let n = 1; n <= corner; n++) {
            if (!boxBlocked(room, e.x + sx, e.y - n, e.w, e.h, mode, e)) { e.y -= Math.min(1, n); break; }
            if (!boxBlocked(room, e.x + sx, e.y + n, e.w, e.h, mode, e)) { e.y += Math.min(1, n); break; }
          }
        }
      }
    }
    if (sy !== 0) {
      const hit = boxBlocked(room, e.x, e.y + sy, e.w, e.h, mode, e);
      if (!hit) e.y += sy;
      else {
        res.y = true;
        res.hitY = hit;
        if (corner && sx === 0) {
          for (let n = 1; n <= corner; n++) {
            if (!boxBlocked(room, e.x - n, e.y + sy, e.w, e.h, mode, e)) { e.x -= Math.min(1, n); break; }
            if (!boxBlocked(room, e.x + n, e.y + sy, e.w, e.h, mode, e)) { e.x += Math.min(1, n); break; }
          }
        }
      }
    }
  }
  return res;
}

// Line of sight across tiles that block projectiles.
export function lineOfSight(room, x0, y0, x1, y1) {
  const d = Math.hypot(x1 - x0, y1 - y0);
  const n = Math.ceil(d / 6);
  for (let i = 1; i < n; i++) {
    const x = x0 + ((x1 - x0) * i) / n, y = y0 + ((y1 - y0) * i) / n;
    const t = room.tileAtPx(x, y);
    if (TILE_PROPS[t].blocksProj) return false;
  }
  return true;
}
