// Boss 1 — Antico Guardiano di Pietra.
// Phase 1: fist slams with shockwaves (the fist gets stuck: core exposed).
// Phase 2: double slams, arm sweeps, rockfalls that leave rubble in the arena.
// Phase 3: torches die out, glowing cracks; wall-crashing charges (break pillars) and a sweeping eye beam.
import { Boss, Shockwave, Rubble, spawnRocks } from './common.js';
import { SPR } from '../../gfx/sprites/index.js';
import { P } from '../../gfx/palette.js';
import { FX } from '../../systems/particles.js';
import { flashOf } from '../../gfx/pixel.js';
import { angleTo, rand, chance, clamp, lerp } from '../../core/math.js';
import { Torch, Decor } from '../props.js';

export class StoneGuardian extends Boss {
  constructor(game, x, y, o) {
    super(game, x, y, o);
    this.bossId = 'stone';
    this.bossName = 'Antico Guardiano di Pietra';
    this.storyStage = 1;
    this.gateId = 'r_boss.gate';
    this.maxHp = this.hp = 72;
    this.w = 40; this.h = 16;
    this.hurtW = 50; this.hurtH = 58; this.hurtOY = 26;
    this.eye = 0;
    this.bob = 0;
    this.cool = 60;
    this.cracked = false;
    this.fists = [this.restFist(-1), this.restFist(1)];
    this.picks = 0;
    this.stepT = 0;
    this.sparkColors = [P.white, P.silver, P.orange];
  }

  restFist(side) { return { side, x: this.x + side * 30, y: this.y - 4, z: 10 }; }

  get parts() { return this.cracked ? SPR.bosses.stone.cracked : SPR.bosses.stone.normal; }

  damageMult(hit) {
    let m = this.state === 'STUCK' || this.state === 'STUNNED' || (this.state === 'SLAM' && this.st > 40) ? 2 : 1;
    if (hit.flags.bomb) m *= 2;
    return m;
  }

  // ---------------------------------------------------------------- states
  s_DORMANT() {
    const pl = this.player;
    if (pl.y < this.room.th * 16 - 64 && pl.state === 'move') this.setState('INTRO');
  }

  s_INTRO() {
    const g = this.game;
    const t = this.st;
    if (t === 0) {
      g.cutscene = true;
      g.room.emit(this.gateId, false, false);
      g.camera.focus = { x: this.x, y: this.y - 40 };
      g.audio.play('rumble');
      g.bossActive = this;
    }
    g.letterbox = Math.min(22, t * 0.8);
    if (t < 80 && t % 6 === 0) {
      g.camera.shake(0.18);
      FX.dust(g.particles, this.x + rand(-30, 30), this.y - rand(0, 40), 2, P.gray);
    }
    if (t > 30) this.eye = Math.min(1, (t - 30) / 40);
    if (t > 40 && t < 80) this.bob = -Math.min(4, (t - 40) / 10);
    if (t === 90) {
      g.audio.play('roar');
      g.camera.shake(0.7);
      g.flashScreen(P.white, 0.15);
      FX.poof(g.particles, this.x, this.y - 30, 20, [P.silver, P.gray]);
      g.hud.showBanner(this.bossName, 'Custode del primo sigillo');
    }
    if (t === 150) {
      g.audio.playMusic('boss', 0.3);
      g.audio.setIntensity(0);
      g.hud.setBoss(this);
    }
    if (t >= 170) {
      g.cutscene = false;
      g.camera.focus = null;
      g.letterbox = 0;
      this.bob = 0;
      this.setState('IDLE');
    }
  }

  s_IDLE() {
    this.returnFists(0.12);
    this.bob = Math.sin(this.t * 0.05) * 1.5;
    const cd = [0, 38, 28, 20][this.phase];
    if (this.st < cd) return;
    this.choose();
  }

  choose() {
    const d = this.distP();
    this.picks++;
    const p = this.phase;
    if (p === 1) {
      if (d > 95) return this.setState('WALK');
      return this.setState('SLAM');
    }
    if (p === 2) {
      if (this.picks % 4 === 0) return this.setState('ROCKFALL');
      if (d < 80 && chance(0.5)) return this.setState('SWEEP');
      if (d > 110) return this.setState('WALK');
      return this.setState('SLAM');
    }
    // phase 3
    const r = Math.random();
    if (this.picks % 5 === 0) return this.setState('ROCKFALL');
    if (d < 75 && r < 0.4) return this.setState('SWEEP');
    if (r < 0.55) return this.setState('CHARGE');
    if (r < 0.8) return this.setState('LASER');
    return this.setState('SLAM');
  }

  s_WALK() {
    const pl = this.player;
    const a = angleTo(this.x, this.y, pl.x, pl.y);
    const sp = this.phase === 3 ? 0.75 : 0.55;
    this.moveBy(Math.cos(a) * sp, Math.sin(a) * sp);
    this.returnFists(0.2);
    this.stepT++;
    this.bob = Math.abs(Math.sin(this.stepT * 0.1)) * -2;
    if (this.stepT % 32 === 0) {
      this.game.audio.play('stomp', { x: this.x, y: this.y });
      this.game.camera.shake(0.14);
      FX.dust(this.game.particles, this.x + (this.stepT % 64 ? -12 : 12), this.y, 5, P.gray);
    }
    if (this.distP() < 70 || this.st > 110) this.setState(this.phase >= 2 && chance(0.4) && this.distP() < 80 ? 'SWEEP' : 'SLAM');
  }

  s_SLAM() {
    const g = this.game;
    const t = this.st;
    const pl = this.player;
    const double = this.phase >= 2;
    if (t === 0) {
      this.target = { x: pl.x, y: pl.y };
      this.side = pl.x < this.x ? -1 : 1;
      g.audio.play('windup', { x: this.x, y: this.y });
    }
    const f = this.fists[this.side < 0 ? 0 : 1];
    if (t < 22) { this.target.x = lerp(this.target.x, pl.x, 0.15); this.target.y = lerp(this.target.y, pl.y, 0.15); }
    const wind = 34;
    if (t < wind) {
      const k = t / wind;
      f.x = lerp(f.x, lerp(this.x + this.side * 26, this.target.x, 0.6), 0.12);
      f.y = lerp(f.y, lerp(this.y - 4, this.target.y, 0.6), 0.12);
      f.z = lerp(f.z, 46, 0.12);
      this.bob = -k * 3;
    } else if (t < wind + 6) {
      const k = (t - wind) / 6;
      f.x = lerp(f.x, this.target.x, 0.5);
      f.y = lerp(f.y, this.target.y, 0.5);
      f.z = 46 * (1 - k);
    } else if (t === wind + 6) {
      this.impact(f.x, f.y, 1);
    }
    // second fist in later phases
    if (double) {
      const f2 = this.fists[this.side < 0 ? 1 : 0];
      const t2 = t - 24;
      if (t2 === 0) { this.target2 = { x: pl.x, y: pl.y }; }
      if (t2 >= 0 && t2 < wind) {
        if (t2 < 20) { this.target2.x = lerp(this.target2.x, pl.x, 0.15); this.target2.y = lerp(this.target2.y, pl.y, 0.15); }
        f2.x = lerp(f2.x, lerp(this.x - this.side * 26, this.target2.x, 0.6), 0.12);
        f2.y = lerp(f2.y, lerp(this.y - 4, this.target2.y, 0.6), 0.12);
        f2.z = lerp(f2.z, 46, 0.12);
      } else if (t2 >= wind && t2 < wind + 6) {
        f2.x = lerp(f2.x, this.target2.x, 0.5);
        f2.y = lerp(f2.y, this.target2.y, 0.5);
        f2.z = 46 * (1 - (t2 - wind) / 6);
      } else if (t2 === wind + 6) this.impact(f2.x, f2.y, 1);
    }
    const stuckStart = double ? wind + 30 : wind + 6;
    if (t > stuckStart) this.setState('STUCK');
  }

  impact(x, y, scale) {
    const g = this.game;
    g.combat.add({ owner: this, team: 'enemy', shape: 'circle', x, y, r: 20, damage: 2, knock: 5, life: 4, flags: { boss: true, heavy: true } });
    g.addEntity(new Shockwave(g, x, y, { speed: this.phase >= 2 ? 3.4 : 2.8, max: this.phase >= 2 ? 120 : 90, damage: 1 }));
    g.audio.play('slam', { x, y });
    g.camera.shake(0.55 * scale);
    FX.shards(g.particles, x, y - 2, 12, [P.gray, P.steel, P.slate]);
    FX.dust(g.particles, x, y, 12, P.silver);
    // fist impacts shatter nearby rubble
    for (const e of g.room.entities) if (e instanceof Rubble && Math.hypot(e.x - x, e.y - y) < 24) e.shatter();
  }

  s_STUCK() {
    // fists stuck in the floor: core exposed
    this.bob = 2 + Math.sin(this.st * 0.4) * 0.5;
    if (this.st % 10 === 0) FX.dust(this.game.particles, this.fists[0].x, this.fists[0].y, 1, P.gray);
    if (this.st >= (this.phase === 1 ? 80 : 60)) this.setState('IDLE');
  }

  s_SWEEP() {
    const g = this.game;
    const t = this.st;
    if (t === 0) {
      this.side = this.player.x < this.x ? 1 : -1; // wind up on the opposite side
      this.sweepA = angleTo(this.x, this.y - 10, this.player.x, this.player.y);
      g.audio.play('windup', { x: this.x, y: this.y });
    }
    const f = this.fists[this.side < 0 ? 0 : 1];
    if (t < 30) {
      f.x = lerp(f.x, this.x + this.side * 44, 0.15);
      f.y = lerp(f.y, this.y - 16, 0.15);
      f.z = lerp(f.z, 14, 0.15);
      if (t % 4 === 0) FX.dust(g.particles, f.x, f.y, 1, P.gray);
    } else if (t < 40) {
      const k = (t - 30) / 10;
      const a = this.sweepA + this.side * (1.5 - k * 3);
      f.x = this.x + Math.cos(a) * 60;
      f.y = this.y - 6 + Math.sin(a) * 42;
      f.z = 10;
      if (t === 30) {
        g.combat.add({ owner: this, team: 'enemy', shape: 'arc', x: this.x, y: this.y - 8, r: 76, angle: this.sweepA, span: Math.PI * 1.1, damage: 2, knock: 6, life: 9, flags: { boss: true, heavy: true } });
        g.audio.play('swing', { combo: 2 });
        g.camera.shake(0.25);
      }
    } else if (t > 62) this.setState('IDLE');
  }

  s_ROCKFALL() {
    const g = this.game;
    const t = this.st;
    for (const f of this.fists) {
      if (t < 22) { f.z = lerp(f.z, 50, 0.12); f.y = lerp(f.y, this.y - 20, 0.1); }
      else if (t < 28) f.z = 50 * (1 - (t - 22) / 6);
    }
    if (t === 28) {
      g.audio.play('slam');
      g.audio.play('roar', { vol: 0.6 });
      g.camera.shake(0.7);
      spawnRocks(g, this.phase === 3 ? 7 : 5, this.player, 170, 46);
      for (const f of this.fists) FX.dust(g.particles, f.x, f.y, 8, P.gray);
    }
    if (t > 80) this.setState('IDLE');
  }

  s_CHARGE() {
    const g = this.game;
    const t = this.st;
    if (t === 0) { g.audio.play('windup'); this.bob = 0; }
    if (t < 44) {
      if (t < 32) this.chargeA = angleTo(this.x, this.y, this.player.x, this.player.y);
      this.bob = Math.min(4, t / 6);
      this.eye = 1;
      if (t % 5 === 0) FX.dust(g.particles, this.x + rand(-16, 16), this.y + 2, 1, P.gray);
      this.returnFists(0.2);
      return;
    }
    if (t === 44) {
      g.audio.play('roar', { vol: 0.5 });
      this.chargeHit = g.combat.add({ owner: this, team: 'enemy', shape: 'circle', x: this.x, y: this.y - 14, r: 28, damage: 2, knock: 6, life: 999, flags: { boss: true, heavy: true }, follow: (h) => { h.x = this.x; h.y = this.y - 14; } });
    }
    const r = this.moveBy(Math.cos(this.chargeA) * 4.2, Math.sin(this.chargeA) * 4.2, 'walk');
    if (t % 3 === 0) FX.dust(g.particles, this.x, this.y + 2, 3, P.gray);
    this.smashProps();
    if (r.x || r.y || t > 140) {
      if (this.chargeHit) this.chargeHit.life = 0;
      g.audio.play('slam');
      g.camera.shake(0.8);
      g.flashScreen(P.white, 0.1);
      spawnRocks(g, 3, null, 0, 40);
      FX.shards(g.particles, this.x + Math.cos(this.chargeA) * 24, this.y - 20, 14, [P.gray, P.steel]);
      this.setState('STUNNED');
    }
  }

  // charging through the arena destroys pillars and rubble
  smashProps() {
    const g = this.game;
    for (const e of g.room.entities) {
      if (e.dead) continue;
      const near = Math.abs(e.x - this.x) < 30 && Math.abs(e.y - this.y) < 20;
      if (!near) continue;
      if (e instanceof Rubble) e.shatter();
      else if (e instanceof Decor && e.o.id === 'pillar') {
        e.dead = true;
        g.audio.play('rockBreak');
        g.camera.shake(0.4);
        FX.shards(g.particles, e.x, e.y - 16, 20, [P.gray, P.silver, P.steel]);
        const stump = new Decor(g, e.x, e.y, { sprite: 'pillarBroken', solid: true, w: 12, h: 8, oy: 7 });
        g.addEntity(stump);
      }
    }
  }

  s_STUNNED() {
    this.bob = 3;
    this.eye = 0.3;
    this.returnFists(0.1);
    if (this.st >= 110) { this.eye = 1; this.setState('IDLE'); }
  }

  s_LASER() {
    const g = this.game;
    const t = this.st;
    const ex = this.x, ey = this.y - 50 + this.bob;
    if (t === 0) {
      g.audio.play('laserCharge');
      const a = angleTo(ex, ey, this.player.x, this.player.y - 6);
      this.dirSign = chance(0.5) ? 1 : -1;
      this.laserA0 = a - this.dirSign * 0.9;
      this.laserA1 = a + this.dirSign * 0.9;
    }
    this.returnFists(0.15);
    if (t < 52) {
      this.eye = 1;
      if (t % 2 === 0) {
        const a = rand(0, Math.PI * 2);
        g.particles.spawn({ x: ex + Math.cos(a) * 24, y: ey + Math.sin(a) * 24, vx: -Math.cos(a) * 1.2, vy: -Math.sin(a) * 1.2, life: 18, color: P.orange, drag: 1, glow: 4 });
      }
      return;
    }
    const k = clamp((t - 52) / 60, 0, 1);
    this.laserA = lerp(this.laserA0, this.laserA1, k);
    if (t === 52) {
      g.audio.play('laser');
      this.laserHit = g.combat.add({ owner: this, team: 'enemy', shape: 'line', x: ex, y: ey, angle: this.laserA0, len: 460, w: 6, damage: 2, knock: 4, life: 60, flags: { boss: true, fire: true }, follow: (h) => { h.angle = this.laserA; } });
    }
    if (t % 2 === 0) g.camera.shake(0.12);
    if (t > 112) { this.laserA = null; this.setState('IDLE'); }
  }

  s_PHASE() {
    const g = this.game;
    const t = this.st;
    this.returnFists(0.1);
    if (t === 10) {
      g.audio.play('roar');
      g.camera.shake(0.8);
      g.flashScreen(P.white, 0.2);
      FX.poof(g.particles, this.x, this.y - 30, 24, [P.silver, P.gray]);
    }
    if (this.phase === 2 && t === 30) {
      g.audio.setIntensity(1);
      spawnRocks(g, 5, this.player, 180, 50);
      g.toast('Il soffitto trema!', 100);
    }
    if (this.phase === 3 && t === 30) {
      this.cracked = true;
      g.audio.setIntensity(2);
      this.darkness = 0.82;
      for (const e of g.room.entities) if (e instanceof Torch && e.lit) { e.lit = false; FX.poof(g.particles, e.x, e.y - 20, 6, [P.gray, P.slate]); }
      g.audio.play('sizzle');
      g.toast('Le torce si spengono...', 100);
    }
    if (t >= 80) this.setState('IDLE');
  }

  s_DYING() {
    const g = this.game;
    const t = this.st;
    g.letterbox = Math.min(22, t);
    g.camera.focus = { x: this.x, y: this.y - 30 };
    if (t % 3 === 0) g.camera.shake(0.3);
    if (t % 9 === 0) {
      const x = this.x + rand(-26, 26), y = this.y - rand(8, 56);
      g.spawnFx('explosion', x, y);
      g.audio.play('rockBreak', { vol: 0.7 });
      FX.shards(g.particles, x, y, 8, [P.gray, P.steel, P.orange]);
    }
    this.bob = Math.min(12, t / 12);
    if (t === 150) g.flashScreen(P.white, 0.8);
    if (t === 160) {
      FX.poof(g.particles, this.x, this.y - 30, 40, [P.silver, P.gray, P.white]);
      FX.shards(g.particles, this.x, this.y - 30, 40, [P.gray, P.steel, P.slate, P.orange]);
      g.audio.play('explosion');
      this.gone = true;
    }
    if (t === 200) {
      this.defeated([
        { item: 'stoneHeart', flag: 'item.stoneHeart' },
        { item: 'heartContainer', flag: 'item.hc.stone' },
      ]);
    }
  }

  returnFists(k) {
    for (const f of this.fists) {
      const r = this.restFist(f.side);
      f.x = lerp(f.x, r.x, k);
      f.y = lerp(f.y, r.y, k);
      f.z = lerp(f.z, r.z + Math.sin(this.t * 0.06 + f.side) * 2, k);
    }
  }

  update() {
    super.update();
    // body contact
    const pl = this.player;
    if ((this.state === 'WALK' || this.state === 'IDLE') && Math.abs(pl.x - this.x) < 24 && Math.abs(pl.y - this.y) < 12) {
      pl.takeHit({ x: this.x, y: this.y, damage: 1, knock: 4, flags: {} });
    }
    // keep the player from standing inside the statue
    if (!this.gone && this.state !== 'DORMANT' && Math.abs(pl.x - this.x) < 20 && Math.abs(pl.y - this.y) < 8) {
      pl.x += pl.x < this.x ? -1.5 : 1.5;
    }
  }

  // ---------------------------------------------------------------- drawing
  draw(ctx, cx, cy) {
    if (this.dead || this.gone) return;
    const S = this.parts;
    const flash = this.flash > 0;
    const pick = (img) => (flash ? flashOf(img) : img);
    const x = Math.round(this.x - cx), y = Math.round(this.y - cy);
    const b = Math.round(this.bob);
    const shake = this.state === 'DYING' ? Math.round(rand(-2, 2)) : 0;
    const dim = this.state === 'DORMANT';
    // legs
    const step = this.state === 'WALK' ? Math.round(Math.sin(this.stepT * 0.1) * 2) : 0;
    ctx.drawImage(pick(S.leg), x - 22 + shake, y - 12 + step);
    ctx.drawImage(pick(S.leg), x + 8 + shake, y - 12 - step);
    // torso
    ctx.drawImage(pick(S.torso), x - 23 + shake, y - 44 + b);
    // core
    const exposed = this.state === 'STUCK' || this.state === 'STUNNED';
    const core = exposed ? SPR.bosses.stone.coreHurt[(this.t >> 2) % 2] : SPR.bosses.stone.core[(this.t >> 3) % 4];
    if (!dim) ctx.drawImage(core, x - 5 + shake, y - 31 + b);
    // head
    ctx.drawImage(pick(S.head), x - 12 + shake, y - 62 + b + (this.state === 'CHARGE' ? 3 : 0));
    // eye
    if (this.eye > 0) {
      const ey = y - 53 + b + (this.state === 'CHARGE' ? 3 : 0);
      const w = Math.round(12 * this.eye);
      ctx.fillStyle = this.phase === 3 ? P.red : P.orange;
      ctx.fillRect(x - Math.round(w / 2) + shake, ey, w, 2);
      ctx.fillStyle = P.yellow;
      ctx.fillRect(x - Math.round(w / 4) + shake, ey, Math.round(w / 2), 1);
    }
    // arms + fists
    for (const f of this.fists) {
      const sx = this.x + f.side * 22, sy = this.y - 36 + b;
      const fx = f.x, fy = f.y - f.z - 8;
      const mx = (sx + fx) / 2, my = (sy + fy) / 2;
      ctx.drawImage(pick(S.arm), Math.round(mx - 6 - cx), Math.round(my - 6 - cy));
      const img = f.side < 0 ? S.fistL : S.fist;
      ctx.drawImage(pick(img), Math.round(fx - 9 - cx), Math.round(fy - 8 - cy));
    }
    // stun stars
    if (this.state === 'STUNNED') {
      for (let i = 0; i < 3; i++) {
        const a = this.t * 0.12 + (i * Math.PI * 2) / 3;
        const s = SPR.fx.star[1];
        ctx.drawImage(s, Math.round(x + Math.cos(a) * 16 - 3), Math.round(y - 68 + b + Math.sin(a) * 5));
      }
    }
    // telegraphs
    if (this.state === 'SLAM' && this.target && this.st > 8 && this.st < 40) this.drawTarget(ctx, this.target.x - cx, this.target.y - cy);
    if (this.state === 'SLAM' && this.target2 && this.phase >= 2 && this.st > 30 && this.st < 64) this.drawTarget(ctx, this.target2.x - cx, this.target2.y - cy);
    if (this.state === 'SWEEP' && this.st < 30 && (this.st >> 2) % 2 === 0) {
      ctx.strokeStyle = 'rgba(228,59,68,0.7)';
      ctx.beginPath();
      ctx.ellipse(x, y - 8, 76, 56, 0, this.sweepA - 1.7, this.sweepA + 1.7);
      ctx.stroke();
    }
    if (this.state === 'CHARGE' && this.st > 10 && this.st < 44 && (this.st >> 1) % 2) {
      ctx.fillStyle = P.red;
      for (let i = 30; i < 260; i += 10) ctx.fillRect(Math.round(x + Math.cos(this.chargeA) * i), Math.round(y - 8 + Math.sin(this.chargeA) * i), 2, 2);
    }
    if (this.state === 'LASER' && this.laserA != null) this.drawBeam(ctx, x, y - 50 + b);
  }

  drawTarget(ctx, tx, ty) {
    const r = 18;
    ctx.fillStyle = 'rgba(162,38,51,0.35)';
    ctx.beginPath();
    ctx.ellipse(Math.round(tx), Math.round(ty), r, r * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    if ((this.t >> 2) % 2) {
      ctx.strokeStyle = P.red;
      ctx.beginPath();
      ctx.ellipse(Math.round(tx), Math.round(ty), r, r * 0.6, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  drawBeam(ctx, ex, ey) {
    const a = this.laserA;
    const len = 460;
    const w = 5 + Math.sin(this.t * 0.9) * 1.5;
    ctx.save();
    ctx.translate(ex, ey);
    ctx.rotate(a);
    ctx.fillStyle = P.rust;
    ctx.fillRect(0, -w - 2, len, (w + 2) * 2);
    ctx.fillStyle = P.orange;
    ctx.fillRect(0, -w, len, w * 2);
    ctx.fillStyle = P.yellow;
    ctx.fillRect(0, -w / 2, len, w);
    ctx.fillStyle = P.white;
    ctx.fillRect(0, -1, len, 2);
    ctx.restore();
    // impact sparks along the floor
    if (this.t % 2 === 0) {
      const d = rand(40, 300);
      FX.sparks(this.game.particles, this.x + Math.cos(a) * d, this.y - 50 + Math.sin(a) * d, 2, [P.yellow, P.orange]);
    }
  }

  lights(out, cx, cy) {
    if (this.dead || this.gone) return;
    if (this.eye > 0) out.push({ x: this.x - cx, y: this.y - 54 + this.bob - cy, r: 40 + this.eye * 20, i: 0.9, color: P.orange });
    out.push({ x: this.x - cx, y: this.y - 28 - cy, r: this.cracked ? 90 : 36, i: 0.9, color: this.cracked ? P.orange : P.gold });
    if (this.laserA != null && this.state === 'LASER') {
      for (let d = 30; d < 400; d += 60) out.push({ x: this.x + Math.cos(this.laserA) * d - cx, y: this.y - 50 + Math.sin(this.laserA) * d - cy, r: 50, i: 1, color: P.orange });
    }
  }
}
