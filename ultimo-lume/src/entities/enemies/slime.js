// Slime: slow, telegraphs with a squash, then leaps at the player.
// Variants: green (basic), blue (splits in two), red (leaves burning puddles), shadow (double hop).
import { Enemy } from './enemy.js';
import { SPR } from '../../gfx/sprites/index.js';
import { P } from '../../gfx/palette.js';
import { FX } from '../../systems/particles.js';
import { Entity } from '../entity.js';
import { rand, clamp } from '../../core/math.js';

const COLORS = {
  green: [P.greenL, P.green, P.greenD],
  blue: [P.cyan, P.blue, P.blueD],
  red: [P.yellow, P.orange, P.rust],
  shadow: [P.pink, P.purple, P.plum],
};

export class Slime extends Enemy {
  constructor(game, x, y, o = {}) {
    super(game, x, y, o);
    this.variant = o.variant || 'green';
    this.small = !!o.small;
    this.sprites = this.small ? SPR.slime.blueSmall : SPR.slime[this.variant];
    this.w = this.small ? 8 : 12;
    this.h = this.small ? 6 : 8;
    this.hurtW = this.small ? 10 : 14;
    this.hurtH = this.small ? 8 : 12;
    this.hurtOY = 3;
    this.maxHp = this.hp = this.small ? 2 : this.variant === 'green' ? 4 : 6;
    this.contact = 1;
    this.shadow = this.small ? 's' : 'm';
    this.aggro = 110;
    this.bloodColors = COLORS[this.variant];
    this.deathColors = COLORS[this.variant];
    this.hopsLeft = 0;
    this.z = 0;
    this.vz = 0;
    this.alertSound = 'slimeJump';
    this.state = 'IDLE';
    this.st = (Math.random() * 60) | 0;
  }

  contactActive() { return this.state === 'JUMP' || this.state === 'LAND'; }

  s_IDLE() {
    if (this.st > 40 && this.seesPlayer()) { this.alert(); return this.setState('PREP'); }
    if (this.st > 90 + (this.o.lazy ? 60 : 0)) this.setState('PATROL');
  }

  s_PATROL() {
    // small idle hops around home
    if (this.st === 0) this.patrolTarget = { x: this.home.x + rand(-30, 30), y: this.home.y + rand(-20, 20) };
    if (this.st === 20) this.leap(this.patrolTarget.x, this.patrolTarget.y, 0.8);
    if (this.seesPlayer()) { this.alert(); this.setState('PREP'); }
  }

  s_CHASE() {
    if (this.st >= (this.small ? 6 : 14)) this.setState('PREP');
  }

  s_PREP() {
    // squash telegraph
    if (this.st >= (this.small ? 12 : 22)) {
      const p = this.player;
      if (this.distP() > this.lose) return this.setState('IDLE');
      this.leap(p.x, p.y, this.small ? 1.5 : 1.25);
    }
  }

  leap(tx, ty, speed) {
    const dx = tx - this.x, dy = ty - this.y;
    const d = Math.hypot(dx, dy) || 1;
    const dist = clamp(d, 10, this.small ? 50 : 60);
    const frames = 28;
    this.vx = (dx / d) * (dist / frames) * speed;
    this.vy = (dy / d) * (dist / frames) * speed;
    this.vz = 3.3;
    this.z = 0.1;
    this.game.audio.play('slimeJump', { x: this.x, y: this.y });
    this.setState('JUMP');
  }

  s_JUMP() {
    this.vz -= 0.24;
    this.z += this.vz;
    this.moveBy(this.vx, this.vy, 'ground');
    if (this.z <= 0) {
      this.z = 0;
      this.setState('LAND');
      this.game.audio.play('slimeLand', { x: this.x, y: this.y, vol: 0.7 });
      FX.dust(this.game.particles, this.x, this.y + 2, 4, this.bloodColors[1]);
      if (this.variant === 'red') this.game.addEntity(new FirePuddle(this.game, this.x, this.y));
    }
  }

  s_LAND() {
    if (this.st >= 8) {
      if (this.variant === 'shadow' && this.hopsLeft-- > 0) return this.leap(this.player.x, this.player.y, 1.4);
      this.hopsLeft = 1;
      this.setState(this.seesPlayer(this.lose) ? 'CHASE' : 'IDLE');
    }
  }

  onHurt(hit) {
    this.z = 0;
    this.setState('HURT');
    this.game.audio.play('enemyHurt', { x: this.x, y: this.y });
  }

  s_HURT() { if (this.st >= 16) this.setState('CHASE'); }

  onDeath() {
    if (this.variant === 'blue' && !this.small) {
      for (const s of [-1, 1]) {
        const c = new Slime(this.game, this.x + s * 6, this.y, { variant: 'blue', small: true });
        c.kbx = s * 2.5;
        c.setState('HURT');
        this.game.addEntity(c);
      }
    }
  }

  frame() {
    const S = this.sprites;
    switch (this.state) {
      case 'PREP': return this.st > 6 ? S.prep[0] : S.idle[0];
      case 'JUMP': return this.vz > 0 ? S.jump[0] : S.idle[3];
      case 'LAND': return S.land[0];
      case 'HURT': return S.hurt[0];
      default: return S.idle[(this.t >> 3) % 4];
    }
  }

  draw(ctx, cx, cy) {
    let img = this.frame();
    // shiver during prep so the attack reads clearly
    const shake = this.state === 'PREP' && this.st > 10 && this.st % 2 === 0 ? 1 : 0;
    this.x += shake;
    this.drawBody(ctx, cx, cy, img, { oy: 2 });
    this.x -= shake;
    this.drawAlert(ctx, cx, cy, 18);
  }

  lights(out, cx, cy) {
    if (this.variant === 'red') out.push({ x: this.x - cx, y: this.y - 6 - this.z - cy, r: 26, i: 0.7, color: P.orange });
    if (this.variant === 'blue') out.push({ x: this.x - cx, y: this.y - 6 - this.z - cy, r: 16, i: 0.4, color: P.cyan });
  }
}

// Burning puddle left by red slimes.
export class FirePuddle extends Entity {
  constructor(game, x, y) {
    super(game, x, y);
    this.layer = 'floor';
    this.life = 120;
  }

  update() {
    this.t++;
    if (--this.life <= 0) this.dead = true;
    if (this.t % 8 === 0) FX.embers(this.game.particles, this.x + rand(-6, 6), this.y - 2, 1);
    const p = this.game.player;
    if (this.life > 10 && Math.abs(p.x - this.x) < 10 && Math.abs(p.y - this.y) < 6) {
      p.takeHit({ x: this.x, y: this.y, damage: 1, knock: 1.5, flags: { fire: true } });
    }
  }

  draw(ctx, cx, cy) {
    const k = Math.min(1, this.life / 30);
    const w = Math.round(18 * k), h = Math.round(7 * k);
    const x = Math.round(this.x - cx - w / 2), y = Math.round(this.y - cy - h / 2);
    ctx.fillStyle = P.rust;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = (this.t >> 2) % 2 ? P.orange : P.yellow;
    ctx.fillRect(x + 2, y + 1, Math.max(0, w - 4), Math.max(0, h - 2));
  }

  lights(out, cx, cy) { out.push({ x: this.x - cx, y: this.y - cy, r: 20, i: 0.6, color: P.orange }); }
}
