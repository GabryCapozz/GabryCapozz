// Guardian (living armour): very sturdy and slow. Frontal armour deflects light hits.
// Huge telegraphed overhead slam with a shockwave, after which it is stuck and vulnerable.
// The corrupted variant adds a spinning sweep.
import { Enemy } from './enemy.js';
import { SPR } from '../../gfx/sprites/index.js';
import { P } from '../../gfx/palette.js';
import { FX } from '../../systems/particles.js';
import { Shockwave } from '../bosses/common.js';
import { dirAngle, chance } from '../../core/math.js';

export class Guardian extends Enemy {
  constructor(game, x, y, o = {}) {
    super(game, x, y, o);
    this.corrupt = !!o.corrupt;
    this.sprites = this.corrupt ? SPR.armor.corrupt : SPR.armor.iron;
    this.w = 16; this.h = 10;
    this.hurtW = 20; this.hurtH = 26; this.hurtOY = 10;
    this.maxHp = this.hp = o.hp || (this.corrupt ? 26 : 20);
    this.poise = 1;
    this.speed = this.corrupt ? 0.55 : 0.45;
    this.aggro = 150;
    this.lose = 300;
    this.shadow = 'l';
    this.superArmor = true;
    this.bloodColors = [P.silver, P.gray];
    this.deathColors = [P.steel, P.gray, P.slate];
    this.alertSound = 'clank';
    this.drops = 'rich';
    this.animT = 0;
    this.separation = false;
  }

  s_IDLE() {
    if (this.seesPlayer()) { this.alert(); this.setState('CHASE'); }
  }

  s_CHASE() {
    const p = this.player;
    if (this.distP() > this.lose || p.state === 'dead') return this.setState('IDLE');
    if (this.distP() < 34) return this.setState(this.corrupt && chance(0.35) ? 'SPINUP' : 'RAISE');
    this.steerTo(p.x, p.y, this.speed);
    this.animT++;
    if (this.animT % 24 === 0) this.game.audio.play('stomp', { x: this.x, y: this.y, vol: 0.4 });
  }

  s_RAISE() {
    if (this.st === 0) { this.facePlayer(); this.game.audio.play('windup', { x: this.x, y: this.y }); this.atkA = this.angP(); }
    if (this.st < 20) { this.facePlayer(); this.atkA = this.angP(); }
    if (this.st >= 44) this.setState('SLAM');
  }

  s_SLAM() {
    if (this.st === 0) {
      const g = this.game;
      const hx = this.x + Math.cos(this.atkA) * 20, hy = this.y + Math.sin(this.atkA) * 16;
      g.combat.add({ owner: this, team: 'enemy', shape: 'circle', x: hx, y: hy, r: 22, damage: 3, knock: 5, life: 5, flags: { heavy: true, boss: true } });
      g.addEntity(new Shockwave(g, hx, hy, { speed: 2.4, max: 60, damage: 1 }));
      g.audio.play('slam', { x: this.x, y: this.y });
      g.camera.shake(0.4);
      FX.shards(g.particles, hx, hy, 10, [P.gray, P.steel]);
      this.impact = { x: hx, y: hy };
    }
    if (this.st >= 6) this.setState('STUCK');
  }

  s_STUCK() {
    if (this.st >= 64) this.setState('CHASE');
  }

  s_SPINUP() {
    if (this.st === 0) this.game.audio.play('windup', { x: this.x, y: this.y });
    if (this.st >= 36) this.setState('SPIN');
  }

  s_SPIN() {
    const g = this.game;
    if (this.st % 8 === 0) {
      g.combat.add({ owner: this, team: 'enemy', shape: 'circle', x: this.x, y: this.y - 8, r: 32, damage: 2, knock: 4, life: 4, flags: { heavy: true } });
      g.audio.play('swing', { combo: 2 });
    }
    const dirs = ['down', 'left', 'up', 'right'];
    this.dir = dirs[(this.st >> 2) % 4];
    this.steerTo(this.player.x, this.player.y, 0.9);
    if (this.st >= 64) this.setState('STUCK');
  }

  beforeHit(hit) {
    if (hit.flags.bomb || hit.flags.spin || this.state === 'STUCK') return null;
    // frontal armour
    if (hit.flags.sword && this.frontal(hit, dirAngle[this.dir], 1.0)) {
      this.flash = 2;
      this.game.audio.play('clank');
      FX.sparks(this.game.particles, (this.x + hit.x) / 2, this.y - 12, 5, [P.white, P.yellow]);
      return 'block';
    }
    return null;
  }

  damageMult() { return this.state === 'STUCK' ? 2 : 1; }

  onHurt() {
    this.game.audio.play('clank', { x: this.x, y: this.y });
    if (this.state === 'IDLE') this.setState('CHASE');
  }

  frame() {
    const S = this.sprites[this.dir] || this.sprites.down;
    switch (this.state) {
      case 'RAISE': case 'SPINUP': return S.raise[0];
      case 'SLAM': return S.slam[0];
      case 'STUCK': return S.stuck[0];
      case 'CHASE': case 'SPIN': return S.walk[Math.floor(this.animT / 10) % 4];
      default: return S.idle[(this.t >> 5) % 2];
    }
  }

  drawWeapon(ctx, cx, cy) {
    // great hammer
    let a = dirAngle[this.dir] + 0.6, len = 20, oy = 14;
    if (this.state === 'RAISE' || this.state === 'SPINUP') { a = this.atkA ? this.atkA + Math.PI : -Math.PI / 2; len = 18; oy = 24; }
    else if (this.state === 'SLAM' || this.state === 'STUCK') { a = this.atkA; len = 22; oy = 8; }
    else if (this.state === 'SPIN') { a = this.st * 0.4; len = 24; }
    const ox = this.x - cx, oyy = this.y - oy - cy;
    ctx.fillStyle = P.brownD;
    for (let i = 2; i < len; i++) ctx.fillRect(Math.round(ox + Math.cos(a) * i), Math.round(oyy + Math.sin(a) * i), 2, 2);
    const hx = Math.round(ox + Math.cos(a) * len), hy = Math.round(oyy + Math.sin(a) * len);
    ctx.fillStyle = P.ink;
    ctx.fillRect(hx - 5, hy - 4, 10, 8);
    ctx.fillStyle = this.corrupt ? P.purple : P.gray;
    ctx.fillRect(hx - 4, hy - 3, 8, 6);
    ctx.fillStyle = this.corrupt ? P.pink : P.silver;
    ctx.fillRect(hx - 4, hy - 3, 8, 1);
    const glint = (this.state === 'RAISE' && this.st > 30 && (this.st >> 1) % 2) || this.state === 'SPINUP';
    if (glint) { ctx.fillStyle = P.white; ctx.fillRect(hx - 1, hy - 5, 2, 2); }
  }

  draw(ctx, cx, cy) {
    const img = this.frame();
    const shake = (this.state === 'RAISE' && this.st > 32 && this.st % 2) ? 1 : 0;
    this.x += shake;
    const behind = this.dir === 'up';
    if (behind && !this.dying) this.drawWeapon(ctx, cx, cy);
    this.drawBody(ctx, cx, cy, img, { oy: 4 });
    if (!behind && !this.dying) this.drawWeapon(ctx, cx, cy);
    this.x -= shake;
    this.drawAlert(ctx, cx, cy, 36);
    if (this.state === 'RAISE' && this.st > 10 && this.atkA != null) {
      const tx = this.x + Math.cos(this.atkA) * 20 - cx, ty = this.y + Math.sin(this.atkA) * 16 - cy;
      ctx.strokeStyle = (this.st >> 2) % 2 ? P.red : P.salmon;
      ctx.beginPath();
      ctx.ellipse(Math.round(tx), Math.round(ty), 22, 14, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  lights(out, cx, cy) {
    const g = this.state === 'STUCK' ? 0.2 : 0.7;
    out.push({ x: this.x - cx, y: this.y - 24 - cy, r: 18, i: g, color: this.corrupt ? P.magenta : P.orange });
  }
}

