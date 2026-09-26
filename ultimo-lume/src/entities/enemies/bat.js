// Flying creature: orbits the player, flanks to their back, then swoops.
import { Enemy } from './enemy.js';
import { SPR } from '../../gfx/sprites/index.js';
import { P } from '../../gfx/palette.js';
import { angleTo, rand, dirAngle, TAU } from '../../core/math.js';

export class Bat extends Enemy {
  constructor(game, x, y, o = {}) {
    super(game, x, y, o);
    this.pal = o.pal || (game.room.theme === 'caves' ? 'crystal' : game.room.theme === 'mines' ? 'ember' : 'cave');
    this.moveMode = 'fly';
    this.w = 10; this.h = 6;
    this.hurtW = 14; this.hurtH = 10; this.hurtOY = 0;
    this.maxHp = this.hp = 3;
    this.contact = 1;
    this.shadow = 's';
    this.z = 12;
    this.aggro = 100;
    this.lose = 260;
    this.orbitA = rand(0, TAU);
    this.orbitR = rand(42, 60);
    this.sleeping = !!o.sleep;
    this.bloodColors = [P.pink, P.purple];
    this.deathColors = [P.purple, P.plum, P.pink];
    this.alertSound = 'screech';
    this.separation = true;
  }

  contactActive() { return this.state === 'SWOOP'; }

  s_IDLE() {
    this.z = this.sleeping ? 14 : 12 + Math.sin(this.t * 0.1) * 2;
    if (!this.sleeping && this.st % 60 === 0) this.home.x += rand(-10, 10);
    if (this.seesPlayer(this.sleeping ? 70 : this.aggro)) {
      this.sleeping = false;
      this.alert();
      this.setState('CHASE');
    } else if (!this.sleeping) {
      this.moveAngle(Math.sin(this.t * 0.03) * Math.PI, 0.3);
    }
  }

  // orbit to the player's back (flank), erratic bobbing
  s_CHASE() {
    const p = this.player;
    const back = dirAngle[p.dir] + Math.PI;
    let diff = back - this.orbitA;
    while (diff > Math.PI) diff -= TAU;
    while (diff < -Math.PI) diff += TAU;
    this.orbitA += Math.sign(diff) * 0.025 + Math.sin(this.t * 0.07) * 0.02;
    const tx = p.x + Math.cos(this.orbitA) * this.orbitR;
    const ty = p.y + Math.sin(this.orbitA) * this.orbitR * 0.75;
    const a = angleTo(this.x, this.y, tx, ty);
    const d = Math.hypot(tx - this.x, ty - this.y);
    this.moveAngle(a, Math.min(1.6, d * 0.08 + 0.4));
    this.z = 12 + Math.sin(this.t * 0.15) * 3;
    if (this.t % 24 === 0) this.game.audio.play('bat', { x: this.x, y: this.y, vol: 0.5 });
    if (this.distP() > this.lose) return this.setState('IDLE');
    if (this.st > 80 + (this.o.slow ? 60 : 0) && Math.abs(diff) < 0.9) this.setState('TELL');
  }

  s_TELL() {
    // hover still, eyes flash -> readable warning
    this.z = 12 + Math.sin(this.st * 0.8) * 1;
    if (this.st === 0) this.game.audio.play('screech', { x: this.x, y: this.y });
    if (this.st >= 22) {
      const p = this.player;
      this.swoopA = angleTo(this.x, this.y, p.x, p.y);
      this.setState('SWOOP');
    }
  }

  s_SWOOP() {
    this.z = Math.max(4, 12 - this.st);
    const r = this.moveAngle(this.swoopA, 3.1);
    if (this.st >= 26 || r.x || r.y) this.setState('RETREAT');
  }

  s_RETREAT() {
    this.moveAngle(this.swoopA + Math.PI * 0.7, 1.2);
    this.z = Math.min(12, this.z + 0.4);
    if (this.st >= 36) this.setState('CHASE');
  }

  onHurt(hit) {
    this.setState('HURT');
    this.game.audio.play('enemyHurt', { x: this.x, y: this.y });
  }

  s_HURT() { if (this.st >= 14) this.setState('RETREAT'); }

  draw(ctx, cx, cy) {
    const f = SPR.bat[this.pal].fly;
    let idx = (this.t >> (this.state === 'SWOOP' ? 1 : 2)) % 4;
    if (this.sleeping) idx = 2;
    const img = f[idx];
    const blink = this.state === 'TELL' && (this.st >> 2) % 2 === 0;
    this.drawBody(ctx, cx, cy, img, { oy: 4 });
    if (blink) {
      ctx.fillStyle = P.white;
      ctx.fillRect(Math.round(this.x - cx - 3), Math.round(this.y - cy - this.z - 5), 1, 1);
      ctx.fillRect(Math.round(this.x - cx + 2), Math.round(this.y - cy - this.z - 5), 1, 1);
    }
    this.drawAlert(ctx, cx, cy, 16);
  }

  lights(out, cx, cy) {
    if (this.pal !== 'cave') out.push({ x: this.x - cx, y: this.y - this.z - cy, r: 18, i: 0.5, color: this.pal === 'crystal' ? P.cyan : P.orange });
  }
}
