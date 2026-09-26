// Beetle: armoured shell deflects frontal hits. Paws the ground when the player is
// lined up, then charges in a straight line; hitting a wall flips it over (vulnerable).
import { Enemy } from './enemy.js';
import { SPR } from '../../gfx/sprites/index.js';
import { P } from '../../gfx/palette.js';
import { FX } from '../../systems/particles.js';
import { dirAngle, DIR_VEC, rand } from '../../core/math.js';
import { lineOfSight } from '../../systems/collision.js';

export class Beetle extends Enemy {
  constructor(game, x, y, o = {}) {
    super(game, x, y, o);
    this.pal = o.pal || (game.room.theme === 'caves' ? 'crystal' : 'mine');
    this.w = 12; this.h = 10;
    this.hurtW = 14; this.hurtH = 12; this.hurtOY = 2;
    this.maxHp = this.hp = 6;
    this.speed = 0.6;
    this.contact = 1;
    this.aggro = 160;
    this.poise = 0.6;
    this.bloodColors = [P.tan, P.brown];
    this.deathColors = this.pal === 'crystal' ? [P.blue, P.cyan, P.navy] : [P.rust, P.clay, P.brownD];
    this.alertSound = 'bat';
    this.walkDir = ['down', 'left', 'up', 'right'][(Math.random() * 4) | 0];
  }

  contactActive() { return this.state === 'CHARGE' || this.state === 'PATROL'; }

  s_IDLE() { this.setState('PATROL'); }

  s_PATROL() {
    const v = DIR_VEC[this.walkDir];
    const r = this.moveBy(v.x * this.speed, v.y * this.speed);
    this.dir = this.walkDir;
    if (r.x || r.y || this.st > 90 + rand(0, 60)) {
      this.walkDir = ['down', 'left', 'up', 'right'][(Math.random() * 4) | 0];
      this.st = 0;
    }
    // lined up with the player?
    const p = this.player;
    const dx = p.x - this.x, dy = p.y - this.y;
    if (this.distP() < this.aggro && (Math.abs(dx) < 10 || Math.abs(dy) < 10) && lineOfSight(this.room, this.x, this.y, p.x, p.y)) {
      this.chargeDir = Math.abs(dx) < 10 ? (dy > 0 ? 'down' : 'up') : (dx > 0 ? 'right' : 'left');
      this.dir = this.chargeDir;
      this.alert();
      this.setState('TELL');
    }
  }

  s_TELL() {
    if (this.st % 6 === 0) FX.dust(this.game.particles, this.x - DIR_VEC[this.dir].x * 6, this.y - DIR_VEC[this.dir].y * 6, 2, this.pal === 'crystal' ? P.steel : P.brown);
    if (this.st >= 26) this.setState('CHARGE');
  }

  s_CHARGE() {
    const v = DIR_VEC[this.chargeDir];
    const r = this.moveBy(v.x * 3.6, v.y * 3.6);
    if (this.st % 3 === 0) FX.dust(this.game.particles, this.x, this.y + 4, 1, P.gray);
    if (r.x || r.y) {
      this.game.audio.play('stomp', { x: this.x, y: this.y });
      this.game.camera.shake(0.18);
      FX.sparks(this.game.particles, this.x + v.x * 8, this.y + v.y * 8, 6, [P.white, P.yellow]);
      this.setState('STUN');
    } else if (this.st > 90) this.setState('PATROL');
  }

  s_STUN() {
    if (this.st >= 90) this.setState('PATROL');
  }

  beforeHit(hit) {
    if (this.state === 'STUN' || hit.flags.bomb || hit.flags.spin) return null;
    if (hit.flags.sword && this.frontal(hit, dirAngle[this.dir], 1.1)) {
      this.game.audio.play('clank');
      FX.sparks(this.game.particles, (this.x + hit.x) / 2, this.y - 4, 4, [P.white, P.yellow]);
      return 'block';
    }
    return null;
  }

  damageMult() { return this.state === 'STUN' ? 2 : 1; }

  onHurt() {
    this.game.audio.play('enemyHurt', { x: this.x, y: this.y });
    if (this.state !== 'STUN') this.setState('PATROL');
  }

  draw(ctx, cx, cy) {
    const set = SPR.beetle[this.pal];
    const S = set[this.dir] || set.down;
    let img;
    if (this.state === 'STUN') img = S.stun[(this.t >> 3) % 2];
    else if (this.state === 'CHARGE') img = S.charge[(this.t >> 1) % 2];
    else if (this.state === 'TELL') img = S.charge[(this.t >> 2) % 2];
    else img = S.walk[(this.t >> 3) % 2];
    const shake = this.state === 'TELL' && this.st % 2 ? 1 : 0;
    this.x += shake;
    this.drawBody(ctx, cx, cy, img, { oy: 8 });
    this.x -= shake;
    this.drawAlert(ctx, cx, cy, 20);
  }

  lights(out, cx, cy) {
    if (this.pal === 'crystal') out.push({ x: this.x - cx, y: this.y - cy, r: 14, i: 0.5, color: P.cyan });
  }
}
