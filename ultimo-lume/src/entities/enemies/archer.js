// Archer: keeps its distance, retreats when approached, strafes, and fires
// clearly telegraphed arrows (drawn bow + aim line + glint).
import { Enemy } from './enemy.js';
import { SPR } from '../../gfx/sprites/index.js';
import { P } from '../../gfx/palette.js';
import { Projectile } from '../projectiles.js';
import { rand, chance } from '../../core/math.js';
import { lineOfSight } from '../../systems/collision.js';

export class Archer extends Enemy {
  constructor(game, x, y, o = {}) {
    super(game, x, y, o);
    this.triple = !!o.triple;
    this.w = 10; this.h = 7;
    this.hurtW = 10; this.hurtH = 16; this.hurtOY = 6;
    this.maxHp = this.hp = 5;
    this.speed = 0.8;
    this.aggro = 160;
    this.lose = 260;
    this.cool = 40;
    this.strafeDir = chance(0.5) ? 1 : -1;
    this.bloodColors = [P.sand, P.white];
    this.deathColors = [P.sand, P.gray, P.greenD];
    this.alertSound = 'rattle';
    this.animT = 0;
  }

  s_IDLE() {
    if (this.seesPlayer()) { this.alert(); return this.setState('CHASE'); }
    if (this.st > 80) this.setState('PATROL');
  }

  s_PATROL() {
    if (this.wander(this.speed * 0.5)) this.animT++;
    if (this.seesPlayer()) { this.alert(); this.setState('CHASE'); }
  }

  // position management: keep 80-130px away with line of sight
  s_CHASE() {
    const p = this.player;
    const d = this.distP();
    if (d > this.lose || p.state === 'dead') return this.setState('PATROL');
    const los = lineOfSight(this.room, this.x, this.y - 6, p.x, p.y - 6);
    const a = this.angP();
    if (this.cool > 0) this.cool--;
    let moved = false;
    if (d < 70) {
      const r = this.moveAngle(a + Math.PI + this.strafeDir * 0.4, this.speed * 1.1);
      moved = true;
      if (r.x && r.y) this.strafeDir *= -1;
    } else if (d > 135 || !los) {
      this.steerTo(p.x, p.y, this.speed);
      moved = true;
    } else {
      const r = this.moveAngle(a + (Math.PI / 2) * this.strafeDir, this.speed * 0.6);
      moved = true;
      if (r.x || r.y || this.st % 90 === 89) this.strafeDir *= -1;
    }
    this.facePlayer();
    if (moved) this.animT++;
    if (this.cool <= 0 && los && d < 170) this.setState('DRAW');
  }

  s_DRAW() {
    this.facePlayer();
    if (this.st === 0) this.game.audio.play('windup', { x: this.x, y: this.y, vol: 0.6 });
    this.aim = this.angP();
    if (this.st >= 34) this.setState('SHOOT');
  }

  s_SHOOT() {
    if (this.st === 0) {
      const angles = this.triple ? [-0.22, 0, 0.22] : [0];
      for (const off of angles) {
        this.game.addEntity(new Projectile(this.game, this.x + Math.cos(this.aim) * 8, this.y - 4 + Math.sin(this.aim) * 6, this.aim + off, {
          team: 'enemy', kind: 'enemyArrow', speed: 3.2, damage: 1, knock: 2, r: 4, z: 6, life: 120, flags: { arrow: true },
        }));
      }
      this.game.audio.play('arrow', { x: this.x, y: this.y });
    }
    if (this.st >= 14) {
      this.cool = rand(70, 110) | 0;
      this.strafeDir = chance(0.5) ? 1 : -1;
      this.setState('CHASE');
    }
  }

  frame() {
    const S = SPR.archer[this.dir];
    switch (this.state) {
      case 'DRAW': case 'SHOOT': return S.cast[0];
      case 'HURT': return S.hurt[0];
      case 'CHASE': case 'PATROL': return S.walk[Math.floor(this.animT / 8) % 4];
      default: return S.idle[(this.t >> 5) % 2];
    }
  }

  drawBow(ctx, cx, cy) {
    const a = this.state === 'DRAW' || this.state === 'SHOOT' ? this.aim : this.angP();
    const ox = this.x - cx + Math.cos(a) * 6, oy = this.y - 9 - cy + Math.sin(a) * 4;
    const px = -Math.sin(a), py = Math.cos(a);
    const pull = this.state === 'DRAW' ? Math.min(3, this.st / 8) : 0;
    ctx.fillStyle = P.brown;
    for (let i = -5; i <= 5; i++) {
      const bend = (1 - (i * i) / 25) * 2.5;
      ctx.fillRect(Math.round(ox + px * i + Math.cos(a) * bend), Math.round(oy + py * i + Math.sin(a) * bend), 1, 1);
    }
    ctx.fillStyle = P.silver;
    for (let i = -4; i <= 4; i++) {
      const k = 1 - Math.abs(i) / 5;
      ctx.fillRect(Math.round(ox + px * i - Math.cos(a) * pull * k), Math.round(oy + py * i - Math.sin(a) * pull * k), 1, 1);
    }
    if (this.state === 'DRAW') {
      // arrow nocked
      ctx.fillStyle = P.tan;
      for (let i = -pull; i < 8; i++) ctx.fillRect(Math.round(ox + Math.cos(a) * i), Math.round(oy + Math.sin(a) * i), 1, 1);
      // telegraph: dotted aim line in the last part of the draw
      if (this.st > 14) {
        ctx.fillStyle = (this.st >> 1) % 2 ? P.red : P.salmon;
        for (let i = 12; i < 110; i += 6) ctx.fillRect(Math.round(ox + Math.cos(a) * i), Math.round(oy + Math.sin(a) * i), 1, 1);
      }
      if (this.st > 24 && this.st < 30) {
        ctx.fillStyle = P.white;
        ctx.fillRect(Math.round(ox + Math.cos(a) * 8) - 1, Math.round(oy + Math.sin(a) * 8), 3, 1);
        ctx.fillRect(Math.round(ox + Math.cos(a) * 8), Math.round(oy + Math.sin(a) * 8) - 1, 1, 3);
      }
    }
  }

  draw(ctx, cx, cy) {
    const img = this.frame();
    const behind = this.dir === 'up';
    if (behind && !this.dying) this.drawBow(ctx, cx, cy);
    this.drawBody(ctx, cx, cy, img, { oy: 2, ay: 21 });
    if (!behind && !this.dying) this.drawBow(ctx, cx, cy);
    this.drawAlert(ctx, cx, cy, 28);
  }
}
