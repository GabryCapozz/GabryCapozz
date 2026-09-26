// Eye statue turret: indestructible. Opens its eye when the player is lined up and fires.
import { Entity, drawFrame } from '../entity.js';
import { SPR } from '../../gfx/sprites/index.js';
import { P } from '../../gfx/palette.js';
import { Projectile } from '../projectiles.js';
import { angleTo } from '../../core/math.js';
import { lineOfSight } from '../../systems/collision.js';

export class Turret extends Entity {
  constructor(game, x, y, o = {}) {
    super(game, x, y);
    this.o = o;
    this.solid = true;
    this.w = 14; this.h = 10;
    this.cool = 60 + ((x + y) % 40);
    this.state = 'closed';
    this.period = o.period || 110;
    this.blocksFlyers = true;
  }

  update() {
    this.t++;
    const p = this.game.player;
    const lined = Math.abs(p.x - this.x) < 14 || Math.abs(p.y - this.y) < 14 || this.o.aim;
    const sees = Math.hypot(p.x - this.x, p.y - this.y) < 220 && lineOfSight(this.room, this.x, this.y - 10, p.x, p.y - 6);
    if (this.cool > 0) this.cool--;
    if (lined && sees && p.state !== 'dead') {
      if (this.state === 'closed') this.state = 'open';
      if (this.cool === 20) this.game.audio.play('windup', { x: this.x, y: this.y, vol: 0.5 });
      if (this.cool <= 0) {
        this.state = 'fire';
        this.cool = this.period;
        const a = this.o.aim ? angleTo(this.x, this.y - 10, p.x, p.y - 6) : Math.abs(p.x - this.x) < 14 ? (p.y > this.y ? Math.PI / 2 : -Math.PI / 2) : (p.x > this.x ? 0 : Math.PI);
        this.game.addEntity(new Projectile(this.game, this.x + Math.cos(a) * 8, this.y - 4 + Math.sin(a) * 8, a, { team: 'enemy', kind: 'fire', speed: 2.4, damage: 1, r: 4, z: 8, life: 160 }));
        this.game.audio.play('orb', { x: this.x, y: this.y, vol: 0.7 });
      }
    } else if (this.cool < this.period - 20) this.state = 'closed';
    if (this.state === 'fire' && this.cool < this.period - 12) this.state = 'open';
  }

  draw(ctx, cx, cy) {
    drawFrame(ctx, SPR.turret[this.state][0], this.x, this.y + 8, cx, cy);
  }

  lights(out, cx, cy) {
    if (this.state !== 'closed') out.push({ x: this.x - cx, y: this.y - 10 - cy, r: 22, i: 0.7, color: P.red });
  }
}
