// Pooled pixel particles. Kept deliberately simple for low-end machines.
import { P } from '../gfx/palette.js';
import { rand, TAU } from '../core/math.js';

const MAX = 700;

export class Particles {
  constructor() {
    this.list = [];
    this.pool = [];
  }

  spawn(o) {
    if (this.list.length >= MAX) return null;
    const p = this.pool.pop() || {};
    p.x = o.x; p.y = o.y; p.z = o.z || 0;
    p.vx = o.vx || 0; p.vy = o.vy || 0; p.vz = o.vz || 0;
    p.g = o.g || 0; // gravity on z
    p.drag = o.drag ?? 0.92;
    p.life = p.max = o.life || 30;
    p.color = o.color || P.white;
    p.color2 = o.color2 || null;
    p.size = o.size || 1;
    p.grow = o.grow || 0;
    p.kind = o.kind || 'px';
    p.sway = o.sway || 0;
    p.phase = Math.random() * TAU;
    p.glow = o.glow || 0;
    p.layer = o.layer || 'top';
    this.list.push(p);
    return p;
  }

  burst(x, y, n, o) {
    for (let i = 0; i < n; i++) {
      const a = o.angle != null ? o.angle + rand(-(o.spread ?? Math.PI), o.spread ?? Math.PI) : rand(0, TAU);
      const sp = rand(o.speedMin ?? 0.5, o.speed ?? 2);
      this.spawn({
        ...o,
        x: x + rand(-(o.jitter || 0), o.jitter || 0),
        y: y + rand(-(o.jitter || 0), o.jitter || 0),
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp * (o.flat ?? 1),
        vz: o.vz != null ? rand(o.vz * 0.5, o.vz) : 0,
        life: Math.round(rand((o.life || 30) * 0.6, o.life || 30)),
        color: Array.isArray(o.colors) ? o.colors[(Math.random() * o.colors.length) | 0] : o.color,
      });
    }
  }

  update() {
    const l = this.list;
    for (let i = l.length - 1; i >= 0; i--) {
      const p = l[i];
      p.x += p.vx + (p.sway ? Math.sin(p.phase + p.life * 0.08) * p.sway : 0);
      p.y += p.vy;
      p.vx *= p.drag;
      p.vy *= p.drag;
      if (p.g) {
        p.vz -= p.g;
        p.z += p.vz;
        if (p.z < 0) { p.z = 0; p.vz *= -0.4; p.vx *= 0.6; p.vy *= 0.6; }
      }
      p.size += p.grow;
      if (--p.life <= 0) {
        l[i] = l[l.length - 1];
        l.pop();
        this.pool.push(p);
      }
    }
  }

  draw(ctx, cx, cy, layer = 'top') {
    for (const p of this.list) {
      if (p.layer !== layer) continue;
      const x = Math.round(p.x - cx), y = Math.round(p.y - p.z - cy);
      if (x < -8 || y < -8 || x > 490 || y > 280) continue;
      const t = p.life / p.max;
      ctx.fillStyle = p.color2 && t < 0.5 ? p.color2 : p.color;
      const s = Math.max(1, Math.round(p.size * (p.kind === 'shrink' ? t : 1)));
      if (p.kind === 'fade' && t < 0.35 && (p.life & 1)) continue;
      ctx.fillRect(x - (s >> 1), y - (s >> 1), s, s);
    }
  }

  lights(out, cx, cy) {
    for (const p of this.list) if (p.glow) out.push({ x: p.x - cx, y: p.y - p.z - cy, r: p.glow * (0.5 + (p.life / p.max) * 0.5), i: 0.7 });
  }

  clear() {
    for (const p of this.list) this.pool.push(p);
    this.list.length = 0;
  }
}

// Convenience emitters used across the game.
export const FX = {
  dust(ps, x, y, n = 4, color = P.sand) {
    ps.burst(x, y, n, { speed: 0.8, speedMin: 0.2, life: 18, colors: [color, P.tan], flat: 0.5, drag: 0.88, layer: 'floor' });
  },
  sparks(ps, x, y, n = 6, colors = [P.white, P.yellow, P.orange]) {
    ps.burst(x, y, n, { speed: 3, speedMin: 1, life: 12, colors, drag: 0.85 });
  },
  blood(ps, x, y, n, colors) {
    ps.burst(x, y, n, { speed: 2.5, speedMin: 0.6, life: 26, colors, g: 0.18, vz: 2.4, drag: 0.93 });
  },
  poof(ps, x, y, n = 10, colors = [P.silver, P.gray, P.white]) {
    ps.burst(x, y, n, { speed: 1.4, speedMin: 0.3, life: 28, colors, size: 2, grow: 0.02, drag: 0.9, kind: 'fade' });
  },
  leaves(ps, x, y, n = 6, colors = [P.green, P.greenL, P.greenD]) {
    ps.burst(x, y, n, { speed: 1.8, speedMin: 0.4, life: 40, colors, g: 0.06, vz: 1.5, drag: 0.9, sway: 0.3 });
  },
  shards(ps, x, y, n, colors) {
    ps.burst(x, y, n, { speed: 2.2, speedMin: 0.8, life: 34, colors, g: 0.2, vz: 2.8, drag: 0.94, size: 2 });
  },
  embers(ps, x, y, n = 3) {
    ps.burst(x, y, n, { speed: 0.4, life: 40, colors: [P.yellow, P.orange, P.gold], vz: 0, drag: 0.98, glow: 6 });
  },
};
