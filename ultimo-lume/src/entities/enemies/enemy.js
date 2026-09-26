// Enemy base: finite state machine (IDLE/PATROL/CHASE/ATTACK/HURT/DEAD + custom),
// perception (range + line of sight), steering via a room flow field, contact damage.
import { Actor, drawFrame } from '../entity.js';
import { SPR } from '../../gfx/sprites/index.js';
import { flashOf } from '../../gfx/pixel.js';
import { P } from '../../gfx/palette.js';
import { FX } from '../../systems/particles.js';
import { lineOfSight } from '../../systems/collision.js';
import { dropLoot } from '../pickups.js';
import { angleTo, dirFromVector, rand, angleDiff } from '../../core/math.js';

export class Enemy extends Actor {
  constructor(game, x, y, o = {}) {
    super(game, x, y);
    this.o = o;
    this.team = 'enemy';
    this.state = 'IDLE';
    this.st = 0;
    this.home = { x, y };
    this.dir = 'down';
    this.speed = 0.7;
    this.aggro = 120;
    this.lose = 230;
    this.contact = 0;
    this.drops = 'common';
    this.alertT = 0;
    this.dying = 0;
    this.deathColors = [P.white, P.silver, P.gray];
    this.patrolTarget = null;
    this.flyZ = 0;
    this.separation = true;
  }

  get player() { return this.game.player; }

  setState(s) {
    if (this['exit_' + this.state]) this['exit_' + this.state]();
    this.state = s;
    this.st = 0;
    if (this['enter_' + s]) this['enter_' + s]();
  }

  update() {
    this.tickTimers();
    if (this.dying > 0) {
      this.dying--;
      this.physics();
      if (this.dying === 0) this.finishDeath();
      return;
    }
    const before = this.state;
    const fn = this['s_' + this.state];
    if (fn) fn.call(this);
    if (this.state === before) this.st++;
    if (this.alertT > 0) this.alertT--;
    this.physics();
    this.contactDamage();
    if (this.separation) this.separate();
    if (this.moveMode !== 'fly') {
      const hz = this.hazardUnder();
      if (hz) this.fallInto(hz);
    }
  }

  // --- perception ---
  distP() { const p = this.player; return Math.hypot(p.x - this.x, p.y - this.y); }
  angP() { const p = this.player; return angleTo(this.x, this.y, p.x, p.y); }
  seesPlayer(range = this.aggro) {
    const p = this.player;
    if (p.state === 'dead' || this.game.cutscene) return false;
    if (this.distP() > range) return false;
    return lineOfSight(this.room, this.x, this.y - 6, p.x, p.y - 6);
  }

  faceAngle(a) { this.dir = dirFromVector(Math.cos(a), Math.sin(a), this.dir); }
  facePlayer() { this.faceAngle(this.angP()); }

  alert() {
    this.alertT = 30;
    this.game.hints.show('dodge', 40);
    this.game.audio.play(this.alertSound || 'uiMove', { x: this.x, y: this.y, vol: 0.6 });
  }

  // --- movement helpers ---
  steerTo(tx, ty, speed) {
    let a;
    if (this.moveMode === 'fly' || lineOfSight(this.room, this.x, this.y, tx, ty)) a = angleTo(this.x, this.y, tx, ty);
    else {
      const d = this.room.flowDir(this.x, this.y, this.game.player);
      a = d != null ? d : angleTo(this.x, this.y, tx, ty);
    }
    const r = this.moveBy(Math.cos(a) * speed, Math.sin(a) * speed);
    this.faceAngle(a);
    return r;
  }

  moveAngle(a, speed) {
    return this.moveBy(Math.cos(a) * speed, Math.sin(a) * speed);
  }

  wander(speed = this.speed * 0.6) {
    if (!this.patrolTarget || this.st % 150 === 0) {
      this.patrolTarget = { x: this.home.x + rand(-40, 40), y: this.home.y + rand(-30, 30), wait: rand(20, 70) | 0 };
    }
    const t = this.patrolTarget;
    const d = Math.hypot(t.x - this.x, t.y - this.y);
    if (d < 4) {
      if (t.wait-- <= 0) this.patrolTarget = null;
      return false;
    }
    const r = this.steerTo(t.x, t.y, speed);
    if (r.x || r.y) this.patrolTarget = null;
    return true;
  }

  separate() {
    for (const e of this.room.entities) {
      if (e === this || e.team !== 'enemy' || e.dead || !e.separation || e.isBoss) continue;
      const dx = this.x - e.x, dy = this.y - e.y;
      const d = Math.hypot(dx, dy);
      if (d > 0 && d < 12) {
        this.moveBy((dx / d) * 0.3, (dy / d) * 0.3);
      }
    }
  }

  contactDamage() {
    if (!this.contact || !this.contactActive()) return;
    const p = this.player;
    if (Math.abs(p.x - this.x) < (this.w + p.w) / 2 + 1 && Math.abs(p.y - this.y) < (this.h + p.h) / 2 + 2 && Math.abs((this.z || 0)) < 10) {
      p.takeHit({ x: this.x, y: this.y, damage: this.contact, knock: 2.8, flags: {} });
    }
  }

  contactActive() { return true; }

  // --- damage / death ---
  onHurt(hit) {
    if (this.superArmor) return;
    this.setState('HURT');
    this.game.audio.play('enemyHurt', { x: this.x, y: this.y });
  }

  s_HURT() {
    if (this.st >= (this.hurtTime || 12)) this.setState('CHASE');
  }

  die(hit) {
    this.dying = 8;
    this.hurtbox = false;
    this.flash = 8;
    this.game.hitstop(4);
    this.game.audio.play('enemyDie', { x: this.x, y: this.y });
    this.game.camera.shake(0.18);
    if (hit) this.applyKnockback(hit, 1.4);
  }

  finishDeath() {
    this.dead = true;
    const g = this.game;
    const y = this.y - 6 - (this.z || 0);
    FX.poof(g.particles, this.x, y, 10, [P.silver, P.gray, P.white]);
    FX.shards(g.particles, this.x, y, 12, this.deathColors);
    g.spawnFx('smoke', this.x, y);
    dropLoot(g, this.x, this.y, this.drops);
    g.onEnemyKilled(this);
    if (this.onDeath) this.onDeath();
  }

  fallInto(kind) {
    if (this.dead || this.dying) return;
    this.dead = true;
    const g = this.game;
    g.audio.play(kind === 'lava' ? 'sizzle' : 'fall', { x: this.x, y: this.y });
    FX.poof(g.particles, this.x, this.y, 8, kind === 'lava' ? [P.orange, P.yellow] : [P.slate, P.navy]);
    g.onEnemyKilled(this);
  }

  // --- drawing ---
  drawAlert(ctx, cx, cy, top = 26) {
    if (this.alertT <= 0) return;
    const b = SPR.fx.bubble.alert;
    const bob = this.alertT > 24 ? (30 - this.alertT) : 6;
    ctx.drawImage(b, Math.round(this.x - cx - 5), Math.round(this.y - cy - top - bob - (this.z || 0)));
  }

  drawBody(ctx, cx, cy, img, opts = {}) {
    const flash = this.flash > 0 || (this.dying > 0 && this.dying % 2 === 0);
    const scale = this.dying > 0 ? this.dying / 8 : 1;
    if (scale < 1) {
      const w = img.width * (0.6 + scale * 0.4), h = img.height * (0.6 + scale * 0.4);
      ctx.globalAlpha = 0.4 + scale * 0.6;
      ctx.drawImage(flash ? flashOf(img) : img, Math.round(this.x - cx - w / 2), Math.round(this.y - cy - h + (opts.oy ?? 2) - (this.z || 0)), Math.round(w), Math.round(h));
      ctx.globalAlpha = 1;
      return;
    }
    drawFrame(ctx, img, this.x, this.y + (opts.oy ?? 2) - (this.z || 0), cx, cy, { flash, ay: opts.ay });
  }

  // Is an attack coming from in front of us?
  frontal(hit, dirAngle, halfArc = 1.2) {
    const a = Math.atan2(hit.y - this.y, hit.x - this.x);
    return Math.abs(angleDiff(dirAngle, a)) < halfArc;
  }
}
