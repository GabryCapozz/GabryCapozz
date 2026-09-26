// Wisp: a restless spirit. Circles to the player's back, darts in, and spits embers.
import { Enemy } from './enemy.js';
import { SPR } from '../../gfx/sprites/index.js';
import { P } from '../../gfx/palette.js';
import { Projectile } from '../projectiles.js';
import { angleTo, rand, dirAngle, TAU } from '../../core/math.js';

export class Wisp extends Enemy {
  constructor(game, x, y, o = {}) {
    super(game, x, y, o);
    this.moveMode = 'fly';
    this.w = 10; this.h = 8;
    this.hurtW = 12; this.hurtH = 14; this.hurtOY = 4;
    this.maxHp = this.hp = 4;
    this.contact = 1;
    this.z = 10;
    this.shadow = 's';
    this.aggro = 140;
    this.lose = 300;
    this.orbitA = rand(0, TAU);
    this.bloodColors = [P.cyan, P.white];
    this.deathColors = [P.cyan, P.blue, P.white];
    this.alertSound = 'magic';
    this.shotCool = 90;
  }

  contactActive() { return this.state === 'DART'; }

  s_IDLE() {
    this.z = 10 + Math.sin(this.t * 0.08) * 3;
    this.moveAngle(Math.sin(this.t * 0.02) * Math.PI, 0.3);
    if (this.seesPlayer()) { this.alert(); this.setState('CHASE'); }
  }

  s_CHASE() {
    const p = this.player;
    const back = dirAngle[p.dir] + Math.PI;
    let diff = back - this.orbitA;
    while (diff > Math.PI) diff -= TAU;
    while (diff < -Math.PI) diff += TAU;
    this.orbitA += Math.sign(diff) * 0.04;
    const tx = p.x + Math.cos(this.orbitA) * 50, ty = p.y + Math.sin(this.orbitA) * 36;
    const a = angleTo(this.x, this.y, tx, ty);
    this.moveAngle(a, Math.min(2.2, Math.hypot(tx - this.x, ty - this.y) * 0.08 + 0.5));
    this.z = 10 + Math.sin(this.t * 0.12) * 3;
    if (--this.shotCool <= 0) {
      this.shotCool = rand(90, 140) | 0;
      const g = this.game;
      g.addEntity(new Projectile(g, this.x, this.y, angleTo(this.x, this.y, p.x, p.y), { team: 'enemy', kind: 'cyan', speed: 1.8, damage: 1, r: 4, z: this.z, life: 150 }));
      g.audio.play('orb', { x: this.x, y: this.y, vol: 0.6 });
    }
    if (this.distP() > this.lose) return this.setState('IDLE');
    if (this.st > 100 && Math.abs(diff) < 0.8) this.setState('TELL');
  }

  s_TELL() {
    if (this.st >= 18) { this.dartA = angleTo(this.x, this.y, this.player.x, this.player.y); this.setState('DART'); }
  }

  s_DART() {
    const r = this.moveAngle(this.dartA, 3.4);
    this.z = Math.max(4, this.z - 0.6);
    if (this.st > 22 || r.x || r.y) this.setState('CHASE');
  }

  s_HURT() { if (this.st >= 12) this.setState('CHASE'); }

  draw(ctx, cx, cy) {
    const img = SPR.wisp.fly[(this.t >> 3) % 4];
    const tell = this.state === 'TELL' && (this.st >> 1) % 2;
    this.drawBody(ctx, cx, cy, img, { oy: 6 });
    if (tell) { ctx.fillStyle = P.white; ctx.fillRect(Math.round(this.x - cx) - 1, Math.round(this.y - cy - this.z - 10), 3, 3); }
    this.drawAlert(ctx, cx, cy, 24);
  }

  lights(out, cx, cy) { out.push({ x: this.x - cx, y: this.y - this.z - 6 - cy, r: 34, i: 0.8, color: P.cyan }); }
}
