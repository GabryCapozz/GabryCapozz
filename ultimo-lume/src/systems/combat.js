// Hitbox registry. Attacks create short-lived hits that are tested against hurtboxes.
import { angleDiff, clamp } from '../core/math.js';

let HIT_ID = 1;

export class Combat {
  constructor(game) {
    this.game = game;
    this.hits = [];
  }

  add(o) {
    const hit = Object.assign({
      id: HIT_ID++, owner: null, team: 'player', shape: 'circle',
      x: 0, y: 0, r: 10, rIn: 0, angle: 0, span: Math.PI, w: 0, h: 0, len: 0,
      damage: 1, knock: 2, life: 1, flags: {}, hitSet: new Set(), onHit: null, follow: null,
    }, o);
    this.hits.push(hit);
    return hit;
  }

  clear() {
    this.hits.length = 0;
  }

  update() {
    const room = this.game.room;
    const targets = room.hurtables;
    for (let i = this.hits.length - 1; i >= 0; i--) {
      const hit = this.hits[i];
      if (hit.follow) hit.follow(hit);
      for (const e of targets) {
        if (e.dead || !e.hurtbox || e === hit.owner || hit.hitSet.has(e)) continue;
        if (!canHit(hit, e)) continue;
        if (!overlaps(hit, e)) continue;
        hit.hitSet.add(e);
        const r = e.takeHit(hit);
        if (r && hit.onHit) hit.onHit(e, r);
      }
      if (--hit.life <= 0) this.hits.splice(i, 1);
    }
  }

  // Debug overlay
  draw(ctx, cx, cy) {
    ctx.strokeStyle = 'rgba(255,0,0,0.8)';
    for (const h of this.hits) {
      ctx.beginPath();
      if (h.shape === 'rect') ctx.rect(h.x - h.w / 2 - cx, h.y - h.h / 2 - cy, h.w, h.h);
      else if (h.shape === 'line') { ctx.moveTo(h.x - cx, h.y - cy); ctx.lineTo(h.x + Math.cos(h.angle) * h.len - cx, h.y + Math.sin(h.angle) * h.len - cy); }
      else ctx.arc(h.x - cx, h.y - cy, h.r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

function canHit(hit, e) {
  const t = e.team;
  if (!t) return false;
  if (t === 'neutral') return hit.team === 'player' || !!hit.flags.bomb || !!hit.flags.breaks;
  if (hit.team === 'hazard') return t === 'player' || t === 'enemy';
  if (hit.team === 'all') return true;
  return hit.team !== t;
}

export function hurtRect(e) {
  const w = e.hurtW ?? e.w, h = e.hurtH ?? e.h;
  return { x: e.x, y: e.y - (e.hurtOY || 0) - (e.z || 0), w, h };
}

function closestDist(hx, hy, r) {
  const px = clamp(hx, r.x - r.w / 2, r.x + r.w / 2);
  const py = clamp(hy, r.y - r.h / 2, r.y + r.h / 2);
  return { d: Math.hypot(px - hx, py - hy), px, py };
}

export function overlaps(hit, e) {
  const r = hurtRect(e);
  switch (hit.shape) {
    case 'rect':
      return Math.abs(hit.x - r.x) < (hit.w + r.w) / 2 && Math.abs(hit.y - r.y) < (hit.h + r.h) / 2;
    case 'circle':
      return closestDist(hit.x, hit.y, r).d <= hit.r;
    case 'arc': {
      const c = closestDist(hit.x, hit.y, r);
      if (c.d > hit.r) return false;
      if (c.d < 2) return true;
      const a = Math.atan2(r.y - hit.y, r.x - hit.x);
      const a2 = Math.atan2(c.py - hit.y, c.px - hit.x);
      return Math.abs(angleDiff(hit.angle, a)) <= hit.span / 2 || Math.abs(angleDiff(hit.angle, a2)) <= hit.span / 2;
    }
    case 'ring': {
      const d = Math.hypot(r.x - hit.x, r.y - hit.y);
      const half = Math.max(r.w, r.h) / 2;
      return d + half >= hit.rIn && d - half <= hit.r;
    }
    case 'line': {
      const ex = hit.x + Math.cos(hit.angle) * hit.len, ey = hit.y + Math.sin(hit.angle) * hit.len;
      const vx = ex - hit.x, vy = ey - hit.y;
      const t = clamp(((r.x - hit.x) * vx + (r.y - hit.y) * vy) / (vx * vx + vy * vy || 1), 0, 1);
      const qx = hit.x + vx * t, qy = hit.y + vy * t;
      return closestDist(qx, qy, r).d <= (hit.w || 4);
    }
    default:
      return false;
  }
}
