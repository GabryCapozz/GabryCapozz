// Mage: keeps away by teleporting, casts clearly charged homing volleys or orb rings.
// The void variant fires rings and summons a bat.
import { Enemy } from './enemy.js';
import { SPR } from '../../gfx/sprites/index.js';
import { P } from '../../gfx/palette.js';
import { FX } from '../../systems/particles.js';
import { Projectile } from '../projectiles.js';
import { Bat } from './bat.js';
import { rand, angleTo, chance } from '../../core/math.js';
import { lineOfSight, boxBlocked } from '../../systems/collision.js';
import { TILE_PROPS } from '../../world/tiletypes.js';

export class Mage extends Enemy {
  constructor(game, x, y, o = {}) {
    super(game, x, y, o);
    this.void = !!o.void;
    this.sprites = this.void ? SPR.voidMage : SPR.mage;
    this.w = 10; this.h = 7;
    this.hurtW = 12; this.hurtH = 18; this.hurtOY = 8;
    this.maxHp = this.hp = this.void ? 10 : 8;
    this.aggro = 170;
    this.lose = 300;
    this.cool = 50;
    this.hover = 0;
    this.alpha = 1;
    this.bloodColors = [P.pink, P.purple];
    this.deathColors = [P.purple, P.pink, P.plum];
    this.alertSound = 'cast';
    this.poise = 0.5;
    this.hurtTime = 10;
  }

  s_IDLE() {
    this.hover = Math.sin(this.t * 0.06) * 2;
    if (this.seesPlayer()) { this.alert(); this.setState('CHASE'); }
  }

  s_CHASE() {
    this.hover = Math.sin(this.t * 0.06) * 2;
    this.facePlayer();
    if (this.distP() > this.lose) return this.setState('IDLE');
    if (this.distP() < 52 && this.cool < 40) return this.setState('VANISH');
    if (this.cool > 0) { this.cool--; return; }
    const los = lineOfSight(this.room, this.x, this.y - 8, this.player.x, this.player.y - 6);
    if (!los || this.distP() > 190) return this.setState('VANISH');
    this.setState('CAST');
  }

  s_CAST() {
    const g = this.game;
    this.facePlayer();
    if (this.st === 0) g.audio.play('cast', { x: this.x, y: this.y });
    if (this.st % 3 === 0 && this.st < 34) {
      const a = rand(0, Math.PI * 2);
      g.particles.spawn({ x: this.x + Math.cos(a) * 14, y: this.y - 20 + Math.sin(a) * 14, vx: -Math.cos(a) * 0.8, vy: -Math.sin(a) * 0.8, life: 16, color: this.void ? P.magenta : P.pink, drag: 1, glow: 3 });
    }
    if (this.st === 36) {
      const a = angleTo(this.x, this.y - 12, this.player.x, this.player.y - 6);
      if (this.void && chance(0.5)) {
        for (let i = 0; i < 8; i++) this.fire((i / 8) * Math.PI * 2, 1.4, 0);
        if (chance(0.3) && this.room.entities.filter((e) => e instanceof Bat && !e.dead).length < 2) {
          const b = new Bat(g, this.x, this.y - 10, { pal: 'crystal' });
          b.isEnemy = true;
          b.setState('CHASE');
          g.addEntity(b);
        }
      } else {
        for (let i = -1; i <= 1; i++) this.fire(a + i * 0.35, 1.5, 0.028);
      }
      g.audio.play('orb', { x: this.x, y: this.y });
    }
    if (this.st >= 50) { this.cool = rand(60, 100) | 0; this.setState('CHASE'); }
  }

  fire(a, speed, homing) {
    const g = this.game;
    g.addEntity(new Projectile(g, this.x + Math.cos(a) * 8, this.y - 4 + Math.sin(a) * 8, a, {
      team: 'enemy', kind: this.void ? 'void' : 'orb', speed, damage: 1, knock: 2, r: 5, z: 10, life: 200, homing, flags: { magic: true },
    }));
  }

  s_VANISH() {
    this.alpha = 1 - this.st / 14;
    if (this.st === 0) { this.game.audio.play('teleport', { x: this.x, y: this.y }); FX.poof(this.game.particles, this.x, this.y - 10, 10, [P.purple, P.pink]); }
    if (this.st >= 14) {
      this.relocate();
      this.setState('APPEAR');
    }
  }

  relocate() {
    const pl = this.player;
    const room = this.room;
    for (let i = 0; i < 30; i++) {
      const a = rand(0, Math.PI * 2), d = rand(80, 130);
      const x = pl.x + Math.cos(a) * d, y = pl.y + Math.sin(a) * d * 0.8;
      if (x < 24 || y < 32 || x > room.tw * 16 - 24 || y > room.th * 16 - 24) continue;
      const tp = TILE_PROPS[room.tileAtPx(x, y)];
      if (tp.pit || tp.lava || tp.water) continue;
      if (boxBlocked(room, x, y, this.w, this.h, 'ground', this)) continue;
      if (!lineOfSight(room, x, y - 8, pl.x, pl.y - 6)) continue;
      this.x = x;
      this.y = y;
      return;
    }
  }

  s_APPEAR() {
    this.alpha = this.st / 14;
    if (this.st === 0) FX.poof(this.game.particles, this.x, this.y - 10, 10, [P.purple, P.pink, P.white]);
    if (this.st >= 14) { this.alpha = 1; this.cool = Math.min(this.cool, 20); this.setState('CHASE'); }
  }

  onHurt() {
    this.game.audio.play('enemyHurt', { x: this.x, y: this.y });
    if (this.state === 'CAST' && this.st > 20) return;
    this.setState(chance(0.5) ? 'VANISH' : 'HURT');
  }

  takeHit(hit) {
    if (this.state === 'VANISH' && this.st > 8) return null;
    if (this.state === 'APPEAR' && this.st < 6) return null;
    return super.takeHit(hit);
  }

  draw(ctx, cx, cy) {
    const S = this.sprites[this.dir] || this.sprites.down;
    const img = this.state === 'CAST' ? S.cast[0] : this.state === 'HURT' ? S.hurt[0] : S.idle[(this.t >> 4) % 2];
    const oy = Math.round(this.hover) - 3;
    ctx.globalAlpha = Math.max(0, Math.min(1, this.alpha));
    this.drawBody(ctx, cx, cy, img, { oy: 2 + oy, ay: 21 });
    // staff with glowing orb
    const sx = Math.round(this.x - cx + (this.dir === 'left' ? -7 : 7)), sy = Math.round(this.y - cy - 20 + oy);
    ctx.fillStyle = P.brownD;
    ctx.fillRect(sx, sy, 1, 16);
    const charging = this.state === 'CAST' && this.st < 36;
    ctx.fillStyle = charging && (this.st >> 1) % 2 ? P.white : this.void ? P.magenta : P.cyan;
    ctx.fillRect(sx - 1, sy - 3, 3, 3);
    ctx.globalAlpha = 1;
    this.drawAlert(ctx, cx, cy, 30);
  }

  drawShadow(ctx, cx, cy) {
    if (this.alpha < 0.3) return;
    super.drawShadow(ctx, cx, cy);
  }

  lights(out, cx, cy) {
    const charging = this.state === 'CAST';
    out.push({ x: this.x - cx, y: this.y - 22 - cy, r: charging ? 40 : 22, i: 0.8 * this.alpha, color: this.void ? P.magenta : P.cyan });
  }
}
