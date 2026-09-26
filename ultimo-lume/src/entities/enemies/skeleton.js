// Skeleton swordsman: telegraphed sword swings, raises its guard to parry frontal hits.
// Veteran variant chains two swings and lunges.
import { Enemy } from './enemy.js';
import { SPR } from '../../gfx/sprites/index.js';
import { P } from '../../gfx/palette.js';
import { dirAngle, chance } from '../../core/math.js';

export class Skeleton extends Enemy {
  constructor(game, x, y, o = {}) {
    super(game, x, y, o);
    this.veteran = !!o.veteran;
    this.sprites = this.veteran ? SPR.skeletonKnight : SPR.skeleton;
    this.w = 10; this.h = 7;
    this.hurtW = 10; this.hurtH = 16; this.hurtOY = 6;
    this.maxHp = this.hp = this.veteran ? 10 : 8;
    this.speed = this.veteran ? 0.85 : 0.72;
    this.poise = 0.35;
    this.aggro = 130;
    this.hitCount = 0;
    this.guardCool = 0;
    this.bloodColors = [P.sand, P.white];
    this.deathColors = [P.sand, P.gray, P.white];
    this.alertSound = 'rattle';
    this.swings = 0;
    this.animT = 0;
  }

  s_IDLE() {
    if (this.seesPlayer()) { this.alert(); return this.setState('CHASE'); }
    if (this.st > 60) this.setState('PATROL');
  }

  s_PATROL() {
    this.animT += this.wander(this.speed * 0.5) ? 1 : 0;
    if (this.seesPlayer()) { this.alert(); this.setState('CHASE'); }
  }

  s_CHASE() {
    const p = this.player;
    const d = this.distP();
    if (this.guardCool > 0) this.guardCool--;
    if (d > this.lose || p.state === 'dead') return this.setState('PATROL');
    // react to the player's swing by raising the guard
    if (d < 40 && p.state === 'attack' && this.guardCool <= 0 && chance(0.35)) return this.setState('GUARD');
    if (d < 26) { this.swings = this.veteran ? 2 : 1; return this.setState('WINDUP'); }
    this.steerTo(p.x, p.y, this.speed);
    this.animT++;
  }

  s_WINDUP() {
    if (this.st === 0) {
      this.facePlayer();
      this.atkAngle = this.angP();
      this.game.audio.play('windup', { x: this.x, y: this.y });
    }
    // slowly track while winding up
    if (this.st < 10) { this.atkAngle = this.angP(); this.facePlayer(); }
    if (this.st >= (this.veteran && this.swings === 1 ? 12 : 22)) this.setState('STRIKE');
  }

  s_STRIKE() {
    const a = this.atkAngle;
    if (this.st === 0) {
      this.game.combat.add({
        owner: this, team: 'enemy', shape: 'arc', x: this.x, y: this.y - 6, r: 24, angle: a, span: 2.2,
        damage: 2, knock: 3.2, life: 5, flags: { sword: true },
        follow: (h) => { h.x = this.x; h.y = this.y - 6; },
      });
      this.game.addSlash(this, a, { pal: 'enemy', rOut: 20, cw: this.swings % 2 === 1 });
      this.game.audio.play('swing', { x: this.x, y: this.y });
    }
    if (this.st < 6) this.moveAngle(a, this.veteran ? 2.2 : 1.6);
    if (this.st >= 8) {
      this.swings--;
      if (this.swings > 0) this.setState('WINDUP');
      else this.setState('RECOVER');
    }
  }

  s_RECOVER() {
    // vulnerable window
    if (this.st >= (this.veteran ? 24 : 30)) this.setState('CHASE');
  }

  s_GUARD() {
    this.facePlayer();
    const p = this.player;
    if (this.distP() > 30) this.steerTo(p.x, p.y, this.speed * 0.4);
    if (this.st >= 50) { this.guardCool = 60; this.setState(this.distP() < 30 ? 'WINDUP' : 'CHASE'); if (this.state === 'WINDUP') this.swings = 1; }
  }

  s_STAGGER() {
    if (this.st >= 40) this.setState('CHASE');
  }

  beforeHit(hit) {
    if (this.state === 'GUARD' && !hit.flags.bomb) {
      if (hit.flags.breaksGuard) {
        this.setState('STAGGER');
        this.game.audio.play('clank');
        return null; // hit lands
      }
      if (this.frontal(hit, dirAngle[this.dir], 1.25)) {
        this.flash = 3;
        return 'block';
      }
    }
    return null;
  }

  onHurt(hit) {
    this.hitCount++;
    if (this.state === 'STAGGER') return;
    if (this.hitCount >= 2 && this.guardCool <= 0 && !hit.flags.heavy) {
      this.hitCount = 0;
      this.setState('GUARD');
      return;
    }
    if (this.state === 'WINDUP' || this.state === 'STRIKE') {
      // super armour on heavy swings only for veterans
      if (this.veteran) return;
    }
    this.setState('HURT');
    this.game.audio.play('enemyHurt', { x: this.x, y: this.y });
  }

  frame() {
    const S = this.sprites[this.dir];
    switch (this.state) {
      case 'WINDUP': return S.attack[0];
      case 'STRIKE': return S.attack[1];
      case 'RECOVER': return S.attack[1];
      case 'GUARD': return S.guard[0];
      case 'HURT': case 'STAGGER': return S.hurt[0];
      case 'CHASE': case 'PATROL': return S.walk[Math.floor(this.animT / 8) % 4];
      default: return S.idle[(this.t >> 5) % 2];
    }
  }

  drawWeapon(ctx, cx, cy) {
    // sword + shield
    const baseA = this.state === 'WINDUP' || this.state === 'STRIKE' || this.state === 'RECOVER' ? this.atkAngle : dirAngle[this.dir];
    let a = baseA + 0.9, len = 10;
    if (this.state === 'WINDUP') a = baseA - 1.8 + Math.sin(this.st * 0.5) * 0.05;
    else if (this.state === 'STRIKE') a = baseA - 1.2 + Math.min(1, this.st / 4) * 2.4;
    else if (this.state === 'RECOVER') a = baseA + 1.2;
    const ox = this.x - cx, oy = this.y - 8 - cy;
    const glint = this.state === 'WINDUP' && this.st > 12 && (this.st >> 1) % 2 === 0;
    for (let i = 3; i <= len; i++) {
      ctx.fillStyle = glint ? P.white : i === len ? P.silver : P.gray;
      ctx.fillRect(Math.round(ox + Math.cos(a) * i), Math.round(oy + Math.sin(a) * i), 1, 1);
    }
    if (this.state === 'GUARD' || this.dir !== 'up') {
      const sa = dirAngle[this.dir] + (this.state === 'GUARD' ? 0 : -1.1);
      const sx = Math.round(ox + Math.cos(sa) * 6), sy = Math.round(oy + 2 + Math.sin(sa) * 4);
      ctx.fillStyle = P.ink;
      ctx.fillRect(sx - 3, sy - 4, 7, 8);
      ctx.fillStyle = this.veteran ? P.redD : P.brown;
      ctx.fillRect(sx - 2, sy - 3, 5, 6);
      ctx.fillStyle = P.gray;
      ctx.fillRect(sx, sy - 1, 1, 2);
    }
  }

  draw(ctx, cx, cy) {
    const img = this.frame();
    const shake = this.state === 'WINDUP' && this.st > 14 && this.st % 2 ? 1 : 0;
    this.x += shake;
    const behind = this.dir === 'up';
    if (behind) this.drawWeapon(ctx, cx, cy);
    this.drawBody(ctx, cx, cy, img, { oy: 2, ay: 21 });
    if (!behind && !this.dying) this.drawWeapon(ctx, cx, cy);
    this.x -= shake;
    this.drawAlert(ctx, cx, cy, 28);
  }
}
