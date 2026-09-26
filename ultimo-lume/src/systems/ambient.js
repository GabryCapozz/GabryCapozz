// Region atmosphere: drifting particles, weather overlays and ambient sounds.
import { W, H } from '../core/constants.js';
import { P } from '../gfx/palette.js';
import { rand, chance } from '../core/math.js';
import { REGIONS } from '../data/regions.js';

export class Ambient {
  constructor(game) {
    this.game = game;
    this.rain = [];
    this.lightning = 0;
    for (let i = 0; i < 70; i++) this.rain.push({ x: rand(0, W), y: rand(0, H), s: rand(4, 6) });
  }

  get kind() {
    const room = this.game.room;
    return room.def.ambient ?? REGIONS[room.region]?.ambient;
  }

  update() {
    const g = this.game;
    const cam = g.camera;
    const ps = g.particles;
    const k = this.kind;
    const x = () => cam.x + rand(-10, W + 10);
    const y = () => cam.y + rand(-10, H + 10);
    switch (k) {
      case 'ash':
        if (chance(0.12)) ps.spawn({ x: x(), y: cam.y - 4, vx: rand(0.1, 0.4), vy: rand(0.2, 0.45), life: 400, color: chance(0.5) ? P.gray : P.silver, drag: 1, sway: 0.25, layer: 'top' });
        if (chance(0.004)) g.audio.play('bird', { vol: 0.8 });
        break;
      case 'leaves':
        if (chance(0.08)) ps.spawn({ x: x(), y: cam.y - 4, vx: rand(-0.2, 0.3), vy: rand(0.3, 0.6), life: 380, color: [P.green, P.greenL, P.gold, P.clay][(Math.random() * 4) | 0], drag: 1, sway: 0.5, size: 2, layer: 'top' });
        if (chance(0.03)) ps.spawn({ x: x(), y: y(), vx: rand(-0.2, 0.2), vy: rand(-0.2, 0.2), life: 160, color: P.yellow, drag: 1, sway: 0.3, glow: 7, kind: 'fade', layer: 'top' });
        if (chance(0.006)) g.audio.play('bird', { vol: 0.9 });
        break;
      case 'dust':
        if (chance(0.06)) ps.spawn({ x: x(), y: y(), vx: rand(-0.1, 0.1), vy: rand(-0.12, 0.05), life: 240, color: P.silver, drag: 1, sway: 0.15, kind: 'fade', layer: 'top' });
        if (chance(0.003)) g.audio.play('drip', { vol: 0.6 });
        break;
      case 'embers':
        if (chance(0.1)) ps.spawn({ x: x(), y: cam.y + H + 4, vx: rand(-0.2, 0.2), vy: rand(-0.6, -0.3), life: 300, color: chance(0.5) ? P.orange : P.gold, drag: 1, sway: 0.3, glow: 4, layer: 'top' });
        if (chance(0.005)) g.audio.play('bubble', { vol: 0.8 });
        if (chance(0.004)) g.audio.play('drip');
        break;
      case 'spores':
        if (chance(0.07)) ps.spawn({ x: x(), y: y(), vx: rand(-0.15, 0.15), vy: rand(-0.25, -0.05), life: 260, color: chance(0.7) ? P.cyan : P.pink, drag: 1, sway: 0.25, glow: 6, kind: 'fade', layer: 'top' });
        if (chance(0.01)) g.audio.play('drip');
        break;
      case 'motes':
        if (chance(0.09)) ps.spawn({ x: x(), y: cam.y + H + 4, vx: rand(-0.1, 0.1), vy: rand(-0.5, -0.2), life: 360, color: chance(0.6) ? P.white : P.gold, drag: 1, sway: 0.2, glow: 5, layer: 'top' });
        break;
      case 'rain':
        if (this.lightning > 0) this.lightning--;
        if (chance(0.0025)) {
          this.lightning = 14;
          setTimeout(() => g.audio.play('thunder'), 400 + Math.random() * 900);
        }
        break;
      default: break;
    }
  }

  // drawn after lighting
  drawOverlay(ctx) {
    const k = this.kind;
    if (k === 'rain' && !this.game.room.def.indoor) {
      ctx.fillStyle = 'rgba(192,203,220,0.35)';
      const t = this.game.time;
      for (const r of this.rain) {
        const x = (r.x + t * 1.5) % (W + 20) - 10;
        const y = (r.y + t * r.s) % (H + 20) - 10;
        ctx.fillRect(Math.round(x), Math.round(y), 1, 5);
      }
      if (this.lightning > 0 && this.lightning % 5 !== 0) {
        ctx.fillStyle = `rgba(220,230,255,${this.lightning / 30})`;
        ctx.fillRect(0, 0, W, H);
      }
    }
  }

  lightningBoost() {
    return this.lightning > 0 ? 0.35 : 0;
  }
}
