// Boss 2 — Creatura delle Profondità.
// Lurks in the central pool. Tentacles rise on the rim (ripple telegraph), slam towards the
// player and get stuck on the ground (melee window). After each wave the great eye opens
// briefly: shoot it with the bow for heavy damage. Acid volleys leave puddles.
// Phase 2: the water rises (arena shrinks) and leeches crawl out.
// Phase 3: the cavern darkens, tentacles sweep and acid rains from the ceiling.
import { Boss } from './common.js';
import { Entity } from '../entity.js';
import { Slime } from '../enemies/slime.js';
import { SPR } from '../../gfx/sprites/index.js';
import { P } from '../../gfx/palette.js';
import { FX } from '../../systems/particles.js';
import { flashOf } from '../../gfx/pixel.js';
import { T } from '../../world/tiletypes.js';
import { angleTo, rand, chance, clamp, lerp } from '../../core/math.js';

class AcidPuddle extends Entity {
  constructor(game, x, y) {
    super(game, x, y);
    this.layer = 'floor';
    this.life = 150;
  }

  update() {
    this.t++;
    if (--this.life <= 0) this.dead = true;
    const p = this.game.player;
    if (this.life > 12 && Math.abs(p.x - this.x) < 11 && Math.abs(p.y - this.y) < 6) p.takeHit({ x: this.x, y: this.y, damage: 1, knock: 1.5, flags: {} });
  }

  draw(ctx, cx, cy) {
    const img = SPR.fx.puddle[this.life < 30 ? 2 : this.life < 60 ? 1 : 0];
    ctx.drawImage(img, Math.round(this.x - cx - 10), Math.round(this.y - cy - 5));
  }

  lights(out, cx, cy) { out.push({ x: this.x - cx, y: this.y - cy, r: 18, i: 0.5, color: P.greenL }); }
}

// Lobbed acid blob with a landing shadow.
class AcidBlob extends Entity {
  constructor(game, x, y, tx, ty, frames = 50) {
    super(game, x, y);
    this.sx = x; this.sy = y; this.tx = tx; this.ty = ty;
    this.frames = frames;
    this.layer = 'top';
  }

  update() {
    this.t++;
    const k = this.t / this.frames;
    this.x = lerp(this.sx, this.tx, k);
    this.y = lerp(this.sy, this.ty, k);
    this.z = Math.sin(k * Math.PI) * 70;
    if (this.t >= this.frames) {
      this.dead = true;
      const g = this.game;
      g.combat.add({ owner: this, team: 'hazard', shape: 'circle', x: this.tx, y: this.ty, r: 12, damage: 1, knock: 2, life: 3, flags: {} });
      g.audio.play('splash', { x: this.tx, y: this.ty, vol: 0.6 });
      FX.blood(g.particles, this.tx, this.ty, 6, [P.greenL, P.green]);
      const tile = g.room.tileAtPx(this.tx, this.ty);
      if (tile !== T.WATER) g.addEntity(new AcidPuddle(g, this.tx, this.ty));
    }
  }

  draw(ctx, cx, cy) {
    const k = this.t / this.frames;
    ctx.fillStyle = 'rgba(14,11,22,0.5)';
    ctx.beginPath();
    ctx.ellipse(Math.round(this.tx - cx), Math.round(this.ty - cy), 4 + k * 6, 2 + k * 3, 0, 0, Math.PI * 2);
    ctx.fill();
    const img = SPR.fx.acid[(this.t >> 3) % 2];
    ctx.drawImage(img, Math.round(this.x - cx - 6), Math.round(this.y - this.z - cy - 6));
  }

  lights(out, cx, cy) { out.push({ x: this.x - cx, y: this.y - this.z - cy, r: 16, i: 0.6, color: P.greenL }); }
}

class Tentacle extends Entity {
  constructor(game, boss, x, y, o = {}) {
    super(game, x, y);
    this.boss = boss;
    this.team = 'enemy';
    this.hurtbox = false;
    this.hp = 6;
    this.state = 'RISE';
    this.st = 0;
    this.len = 0;
    this.maxLen = 64;
    this.angle = -Math.PI / 2;
    this.sweep = !!o.sweep;
    this.flash = 0;
    this.layer = 'main';
    this.w = 12; this.h = 8;
    this.hurtW = 16; this.hurtH = 16; this.hurtOY = 0;
    this.sortBias = 4;
  }

  tipPos() {
    return { x: this.x + Math.cos(this.angle) * this.len, y: this.y + Math.sin(this.angle) * this.len * 0.8 };
  }

  update() {
    this.t++;
    if (this.flash > 0) this.flash--;
    const g = this.game;
    const pl = g.player;
    const toP = angleTo(this.x, this.y, pl.x, pl.y);
    const before = this.state;
    switch (this.state) {
      case 'RISE':
        if (this.st % 6 === 0) g.particles.spawn({ x: this.x + rand(-8, 8), y: this.y + rand(-3, 3), vy: -0.2, life: 16, color: P.cyan, drag: 1, layer: 'floor' });
        if (this.st >= 40) { this.state = 'UP'; g.audio.play('splash', { x: this.x, y: this.y, vol: 0.7 }); FX.blood(g.particles, this.x, this.y, 8, [P.cyan, P.white]); }
        break;
      case 'UP':
        this.len = Math.min(34, this.len + 3);
        this.angle = lerp(this.angle, -Math.PI / 2 + Math.sin(this.t * 0.08) * 0.4, 0.2);
        if (this.st >= 36) { this.state = 'WIND'; this.targetA = toP; g.audio.play('windup', { x: this.x, y: this.y, vol: 0.6 }); }
        break;
      case 'WIND':
        this.len = lerp(this.len, 40, 0.2);
        if (this.st < 14) this.targetA = lerp(this.targetA, toP, 0.2);
        this.angle = lerp(this.angle, this.sweep ? this.targetA - 1.4 : -Math.PI / 2 - 0.3, 0.15);
        if (this.st >= 26) {
          this.state = 'SLAM';
          g.audio.play('swing', { combo: 2 });
          if (this.sweep) this.sweepFrom = this.angle;
        }
        break;
      case 'SLAM': {
        if (this.sweep) {
          const k = Math.min(1, this.st / 12);
          this.len = this.maxLen;
          this.angle = this.sweepFrom + k * 2.8;
          const tp = this.tipPos();
          g.combat.add({ owner: this, team: 'enemy', shape: 'line', x: this.x, y: this.y, angle: Math.atan2(tp.y - this.y, tp.x - this.x), len: this.maxLen, w: 7, damage: 1, knock: 4, life: 1, flags: {} });
          if (this.st >= 12) { this.state = 'STUCK'; }
          break;
        }
        this.angle = lerp(this.angle, this.targetA, 0.5);
        this.len = Math.min(this.maxLen, this.len + 12);
        if (this.st === 4) {
          const tp = this.tipPos();
          g.combat.add({ owner: this, team: 'enemy', shape: 'line', x: this.x, y: this.y, angle: Math.atan2(tp.y - this.y, tp.x - this.x), len: this.maxLen, w: 8, damage: 2, knock: 5, life: 4, flags: { heavy: true } });
          g.camera.shake(0.35);
          g.audio.play('slam', { x: tp.x, y: tp.y, vol: 0.7 });
          FX.dust(g.particles, tp.x, tp.y, 8, P.steel);
          FX.blood(g.particles, tp.x, tp.y, 6, [P.cyan, P.white]);
        }
        if (this.st >= 8) this.state = 'STUCK';
        break;
      }
      case 'STUCK':
        this.hurtbox = true;
        if (this.st >= (this.boss.phase === 3 ? 50 : 70)) { this.state = 'RETRACT'; this.hurtbox = false; }
        break;
      case 'RETRACT':
        this.len -= 4;
        if (this.len <= 0) { this.dead = true; g.audio.play('splash', { x: this.x, y: this.y, vol: 0.5 }); }
        break;
      default: break;
    }
    if (this.state === before) this.st++; else this.st = 0;
  }

  // the stuck tentacle's hurtbox follows the limb (used by the combat system)
  get hurtCenter() {
    const k = 0.6;
    return { x: this.x + Math.cos(this.angle) * this.len * k, y: this.y + Math.sin(this.angle) * this.len * 0.8 * k };
  }

  takeHit(hit) {
    if (this.state !== 'STUCK') return null;
    const dmg = hit.damage;
    this.hp -= dmg;
    this.flash = 6;
    this.boss.hurtFrom(hit, dmg * 0.8);
    FX.blood(this.game.particles, this.hurtCenter.x, this.hurtCenter.y - 4, 5, [P.pink, P.purple]);
    this.game.audio.play('hit');
    if (this.hp <= 0) {
      this.state = 'RETRACT';
      this.hurtbox = false;
      this.boss.tentacleSevered();
    }
    return 'hit';
  }

  draw(ctx, cx, cy) {
    if (this.state === 'RISE') {
      if (this.st < 0) return;
      // ripples telegraph
      const r = 4 + (this.st % 20) * 0.6;
      ctx.strokeStyle = (this.st >> 2) % 2 ? P.cyan : P.white;
      ctx.beginPath();
      ctx.ellipse(Math.round(this.x - cx), Math.round(this.y - cy), r * 1.6, r * 0.7, 0, 0, Math.PI * 2);
      ctx.stroke();
      return;
    }
    const segs = SPR.bosses.deep.segs;
    const n = 12;
    for (let i = n; i >= 0; i--) {
      const k = i / n;
      const wob = Math.sin(this.t * 0.2 - i * 0.6) * (this.state === 'STUCK' ? 1 : 3) * k;
      const px = this.x + Math.cos(this.angle) * this.len * k + Math.cos(this.angle + Math.PI / 2) * wob;
      const py = this.y + Math.sin(this.angle) * this.len * 0.8 * k + Math.sin(this.angle + Math.PI / 2) * wob;
      const r = Math.round(lerp(7, 2, k));
      let img = segs[Math.max(0, Math.min(segs.length - 1, r - 2))];
      if (this.flash > 0) img = flashOf(img);
      ctx.drawImage(img, Math.round(px - cx - img.width / 2), Math.round(py - cy - img.height / 2 - 2));
    }
    if (this.state === 'WIND' && (this.st >> 2) % 2) {
      ctx.strokeStyle = P.red;
      ctx.beginPath();
      const a = this.sweep ? this.targetA : this.targetA;
      ctx.moveTo(Math.round(this.x - cx), Math.round(this.y - cy));
      ctx.lineTo(Math.round(this.x + Math.cos(a) * this.maxLen - cx), Math.round(this.y + Math.sin(a) * this.maxLen * 0.8 - cy));
      ctx.stroke();
    }
  }

  lights(out, cx, cy) { if (this.state === 'STUCK') out.push({ x: this.hurtCenter.x - cx, y: this.hurtCenter.y - cy, r: 20, i: 0.5, color: P.pink }); }
}

export class DeepHorror extends Boss {
  constructor(game, x, y, o) {
    super(game, x, y, o);
    this.bossId = 'deep';
    this.bossName = 'Creatura delle Profondità';
    this.storyStage = 2;
    this.gateId = 'k_boss.gate';
    this.maxHp = this.hp = 80;
    this.hurtbox = false;
    this.hurtW = 30; this.hurtH = 24; this.hurtOY = 26;
    this.rise = 0; // 0 submerged .. 1 fully out
    this.eyeOpen = 0;
    this.look = { x: 0, y: 0 };
    this.tentacles = [];
    this.wave = 0;
    this.rewardAt = { x: x, y: 13 * 16 + 8 };
    this.sparkColors = [P.pink, P.purple, P.white];
    this.blinks = Array.from({ length: 6 }, (_, i) => ({ x: -34 + i * 13 + rand(-3, 3), y: -26 + rand(-6, 8), t: rand(0, 200) | 0 }));
  }

  get submerged() { return this.rise < 0.5; }

  damageMult(hit) {
    return hit.flags.arrow ? 2 : 1;
  }

  // damage transmitted through a tentacle
  hurtFrom(hit, dmg) {
    if (['DYING', 'PHASE', 'INTRO'].includes(this.state)) return;
    this.hp -= dmg;
    this.flash = 4;
    if (this.hp <= 0) { this.hp = 0; this.startDeath(); return; }
    if (this.checkPhase()) this.setState('PHASE');
  }

  tentacleSevered() {
    this.game.audio.play('roar', { vol: 0.5 });
    this.severed = (this.severed || 0) + 1;
  }

  takeHit(hit) {
    if (this.eyeOpen < 0.8) return null;
    return super.takeHit(hit);
  }

  // ---------------------------------------------------------------- states
  s_DORMANT() {
    const pl = this.player;
    if (pl.x < this.room.tw * 16 - 72 && pl.state === 'move') this.setState('INTRO');
    if (this.t % 30 === 0) this.game.particles.spawn({ x: this.x + rand(-30, 30), y: this.y + rand(-10, 10), vy: -0.2, life: 20, color: P.cyan, drag: 1, layer: 'floor' });
  }

  s_INTRO() {
    const g = this.game;
    const t = this.st;
    if (t === 0) {
      g.cutscene = true;
      g.room.emit(this.gateId, false, false);
      g.camera.focus = { x: this.x, y: this.y - 20 };
      g.audio.play('rumble');
      g.bossActive = this;
    }
    g.letterbox = Math.min(22, t * 0.8);
    if (t % 5 === 0 && t < 90) {
      g.particles.spawn({ x: this.x + rand(-60, 60), y: this.y + rand(-20, 20), vy: -0.4, life: 24, color: P.white, drag: 1 });
      g.camera.shake(0.12);
    }
    if (t > 60) this.rise = Math.min(1, (t - 60) / 40);
    if (t === 100) {
      g.audio.play('roar');
      g.camera.shake(0.6);
      this.eyeOpen = 1;
      FX.blood(g.particles, this.x, this.y - 20, 30, [P.cyan, P.white, P.blue]);
      g.hud.showBanner(this.bossName, 'Custode del secondo sigillo');
    }
    if (t === 160) { g.audio.playMusic('boss', 0.3); g.hud.setBoss(this); }
    if (t >= 180) {
      g.cutscene = false;
      g.camera.focus = null;
      g.letterbox = 0;
      this.setState('SINK');
    }
  }

  s_SINK() {
    this.eyeOpen = Math.max(0, this.eyeOpen - 0.08);
    this.rise = Math.max(0.35, this.rise - 0.03);
    if (this.st >= 30) this.setState('WAVE');
  }

  rimPoint(a) {
    // points just outside the pool ellipse (on the shallow rim / ground)
    const rx = 12.5 * 16, ry = 4.2 * 16;
    return { x: this.x + Math.cos(a) * rx, y: this.y + 8 + Math.sin(a) * ry };
  }

  s_WAVE() {
    const g = this.game;
    if (this.st === 0) {
      this.wave++;
      const n = this.phase === 1 ? 2 : 3;
      const pa = angleTo(this.x, this.y + 8, this.player.x, this.player.y);
      this.tentacles = [];
      for (let i = 0; i < n; i++) {
        const a = pa + (i - (n - 1) / 2) * (this.phase === 1 ? 0.45 : 0.4) + rand(-0.08, 0.08);
        const p = this.rimPoint(a);
        const tt = new Tentacle(g, this, p.x, p.y, { sweep: this.phase === 3 && i === 1 });
        tt.st = -i * 14;
        this.tentacles.push(tt);
        g.addEntity(tt);
      }
      g.audio.play('bubble');
      if (this.phase >= 2) this.spawnLeech();
    }
    this.eyeOpen = Math.max(0, this.eyeOpen - 0.05);
    if (this.st > 30 && this.tentacles.every((t) => t.dead)) this.setState(this.phase === 3 && chance(0.5) ? 'RAIN' : 'SPIT');
  }

  spawnLeech() {
    const g = this.game;
    const alive = g.room.entities.filter((e) => e instanceof Slime && !e.dead).length;
    if (alive >= 3) return;
    const p = this.rimPoint(rand(0, Math.PI * 2));
    const s = new Slime(g, p.x, p.y + 12, { variant: 'blue', small: true });
    s.isEnemy = false; // doesn't hold the arena gates
    s.setState('CHASE');
    g.addEntity(s);
  }

  s_SPIT() {
    const g = this.game;
    this.rise = Math.min(0.8, this.rise + 0.05);
    if (this.st === 10) g.audio.play('windup');
    if (this.st === 30 || this.st === 42 || (this.phase >= 2 && this.st === 54)) {
      const pl = this.player;
      for (let i = 0; i < 3; i++) {
        const tx = pl.x + rand(-26, 26), ty = pl.y + rand(-14, 14);
        g.addEntity(new AcidBlob(g, this.x, this.y - 30, tx, ty, 44 + i * 4));
      }
      g.audio.play('slimeJump');
    }
    if (this.st >= 70) this.setState('OPEN');
  }

  s_RAIN() {
    const g = this.game;
    this.rise = Math.min(0.8, this.rise + 0.05);
    if (this.st === 0) { g.audio.play('roar', { vol: 0.6 }); g.camera.shake(0.4); }
    if (this.st % 8 === 0 && this.st < 80) {
      const pl = this.player;
      const tx = pl.x + rand(-60, 60), ty = pl.y + rand(-40, 40);
      g.addEntity(new AcidBlob(g, tx, ty - 200, tx, ty, 50));
    }
    if (this.st >= 100) this.setState('OPEN');
  }

  s_OPEN() {
    // the eye is exposed: shoot it!
    const g = this.game;
    this.rise = Math.min(1, this.rise + 0.06);
    if (this.st === 0) { g.audio.play('bubble'); g.toast('L\'occhio si apre!', 60); }
    this.eyeOpen = Math.min(1, this.eyeOpen + 0.1);
    const dur = (this.phase === 3 ? 80 : 110) + (this.severed ? 40 : 0);
    if (this.st >= dur) { this.severed = 0; this.setState('SINK'); }
  }

  s_PHASE() {
    const g = this.game;
    const t = this.st;
    this.eyeOpen = Math.max(0, this.eyeOpen - 0.1);
    for (const tt of this.tentacles) if (!tt.dead && tt.state !== 'RETRACT') { tt.state = 'RETRACT'; tt.hurtbox = false; }
    if (t === 5) { g.audio.play('roar'); g.camera.shake(0.7); g.flashScreen(P.cyan, 0.15); }
    if (this.phase === 2) {
      if (t === 20) { g.audio.setIntensity(1); g.audio.play('rumble'); g.toast('L\'acqua sale!', 90); }
      if (t >= 20 && t % 6 === 0) this.floodRing();
    }
    if (this.phase === 3 && t === 20) {
      g.audio.setIntensity(2);
      this.darkness = 0.88;
      g.toast('Le luci dei cristalli si affievoliscono...', 100);
    }
    if (t >= 90) this.setState('SINK');
  }

  // phase 2: shallow water around the pool becomes deep (arena shrinks)
  floodRing() {
    const room = this.room;
    const pl = this.player;
    let changed = 0;
    for (let ty = 0; ty < room.th && changed < 6; ty++) {
      for (let tx = 0; tx < room.tw && changed < 6; tx++) {
        if (room.tileAt(tx, ty) !== T.SHALLOW) continue;
        const px = tx * 16 + 8, py = ty * 16 + 8;
        if (Math.abs(pl.x - px) < 16 && Math.abs(pl.y - py) < 14) continue;
        room.setTile(tx, ty, T.WATER);
        this.game.particles.spawn({ x: px, y: py, vy: -0.3, life: 18, color: P.cyan, drag: 1 });
        changed++;
      }
    }
  }

  s_DYING() {
    const g = this.game;
    const t = this.st;
    g.letterbox = Math.min(22, t);
    g.camera.focus = { x: this.x, y: this.y - 20 };
    this.eyeOpen = Math.max(0, 1 - t / 120);
    if (t % 4 === 0) g.camera.shake(0.25);
    if (t % 6 === 0) FX.blood(g.particles, this.x + rand(-40, 40), this.y - rand(0, 30), 6, [P.pink, P.purple, P.cyan]);
    this.rise = Math.max(0, 1 - t / 150);
    if (t === 130) { g.flashScreen(P.white, 0.7); g.audio.play('explosion'); }
    if (t === 170) {
      this.gone = true;
      this.defeated([
        { item: 'abyssEye', flag: 'item.abyssEye' },
        { item: 'heartContainer', flag: 'item.hc.deep' },
      ]);
      g.toast('Una radice nodosa sale verso la superficie.', 150);
    }
  }

  update() {
    super.update();
    this.hurtbox = this.eyeOpen > 0.8 && !['DYING', 'PHASE', 'INTRO'].includes(this.state);
    const pl = this.player;
    const a = angleTo(this.x, this.y - 30, pl.x, pl.y);
    this.look.x = lerp(this.look.x, Math.cos(a) * 4, 0.1);
    this.look.y = lerp(this.look.y, Math.sin(a) * 2.5, 0.1);
    for (const b of this.blinks) b.t++;
  }

  // ---------------------------------------------------------------- drawing
  draw(ctx, cx, cy) {
    if (this.gone) return;
    const x = Math.round(this.x - cx), y = Math.round(this.y - cy);
    const body = SPR.bosses.deep.body;
    const rise = this.rise;
    const visible = Math.round(body.height * clamp(rise, 0, 1));
    const bob = Math.round(Math.sin(this.t * 0.05) * 2);
    const waterY = y + 6;
    if (visible > 2) {
      const src = this.flash > 0 ? flashOf(body) : body;
      ctx.drawImage(src, 0, 0, body.width, visible, x - 48, waterY - visible + bob, body.width, visible);
      // small eyes
      for (const b of this.blinks) {
        const ey = waterY - body.height + 46 + b.y + bob + (body.height - visible);
        if (ey > waterY - 2) continue;
        const shut = b.t % 180 < 8;
        ctx.fillStyle = P.ink;
        ctx.fillRect(x + b.x - 1, ey - 1, 4, 3);
        ctx.fillStyle = shut ? P.plum : P.yellow;
        ctx.fillRect(x + b.x, ey, 2, shut ? 1 : 1);
      }
      // the great eye
      const eyeY = waterY - visible + 16 + bob;
      if (eyeY < waterY - 6) {
        const open = this.eyeOpen;
        const h = Math.max(1, Math.round(9 * open));
        ctx.fillStyle = P.ink;
        ctx.fillRect(x - 15, eyeY - h - 1, 30, h * 2 + 2);
        if (open > 0.1) {
          ctx.fillStyle = P.sand;
          ctx.fillRect(x - 13, eyeY - h + 1, 26, h * 2 - 2);
          ctx.fillStyle = P.white;
          ctx.fillRect(x - 11, eyeY - h + 1, 22, Math.max(1, h * 2 - 4));
          const ix = Math.round(x + this.look.x), iy = Math.round(eyeY + this.look.y);
          ctx.fillStyle = this.phase === 3 ? P.red : P.magenta;
          ctx.fillRect(ix - 5, iy - Math.min(5, h - 1), 10, Math.min(10, h * 2 - 2));
          ctx.fillStyle = P.ink;
          ctx.fillRect(ix - 2, iy - Math.min(3, h - 1), 4, Math.min(6, h * 2 - 2));
          ctx.fillStyle = P.white;
          ctx.fillRect(ix - 4, iy - 3, 2, 2);
        } else {
          ctx.fillStyle = P.purple;
          ctx.fillRect(x - 13, eyeY - 1, 26, 2);
        }
        if (this.state === 'OPEN' && (this.t >> 3) % 2 === 0) {
          ctx.strokeStyle = P.yellow;
          ctx.strokeRect(x - 17.5, eyeY - h - 3.5, 35, h * 2 + 7);
        }
      }
    }
    // ripples on the waterline
    ctx.fillStyle = P.cyan;
    const w = 44 + Math.sin(this.t * 0.1) * 4;
    for (let i = 0; i < 16; i++) {
      const rx = Math.round(x + Math.cos(i / 16 * Math.PI * 2 + this.t * 0.02) * w);
      const ry = Math.round(waterY + Math.sin(i / 16 * Math.PI * 2 + this.t * 0.02) * 6);
      ctx.fillRect(rx, ry, 2, 1);
    }
  }

  drawShadow() {}

  lights(out, cx, cy) {
    if (this.gone) return;
    if (this.eyeOpen > 0.1) out.push({ x: this.x - cx, y: this.y - 30 - cy, r: 50 + this.eyeOpen * 30, i: 0.9, color: this.phase === 3 ? P.red : P.magenta });
    out.push({ x: this.x - cx, y: this.y - cy, r: 70, i: 0.4, color: P.purple });
  }
}
