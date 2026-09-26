// Boss 3 — Ser Aldric, il Cavaliere Corrotto.
// Phase 1: 2-3 hit sword combos with clear glints, dash thrusts, parry + riposte.
// Phase 2: dark flames (slashes leave fire), leap slams, rows of falling shadow swords; banners burn.
// Phase 3: the hall goes dark; he vanishes into shadow and strikes from behind, and hurls dark crescents.
import { Boss, Shockwave } from './common.js';
import { Entity, drawFrame } from '../entity.js';
import { Projectile } from '../projectiles.js';
import { SPR } from '../../gfx/sprites/index.js';
import { P } from '../../gfx/palette.js';
import { FX } from '../../systems/particles.js';
import { flashOf } from '../../gfx/pixel.js';
import { Decor } from '../props.js';
import { angleTo, dirFromAngle, dirAngle, rand, chance, angleDiff, lerp } from '../../core/math.js';
import { boxBlocked } from '../../systems/collision.js';

// A spectral sword that falls on a marked spot.
class ShadowSword extends Entity {
  constructor(game, x, y, delay) {
    super(game, x, y);
    this.delay = delay;
    this.layer = 'top';
  }

  update() {
    this.t++;
    if (this.t === this.delay) {
      const g = this.game;
      g.combat.add({ owner: this, team: 'enemy', shape: 'rect', x: this.x, y: this.y, w: 10, h: 14, damage: 2, knock: 3, life: 3, flags: { magic: true } });
      g.audio.play('clank', { x: this.x, y: this.y, vol: 0.6 });
      FX.sparks(g.particles, this.x, this.y, 5, [P.pink, P.purple, P.white]);
    }
    if (this.t > this.delay + 30) this.dead = true;
  }

  draw(ctx, cx, cy) {
    const x = Math.round(this.x - cx), y = Math.round(this.y - cy);
    if (this.t < this.delay) {
      const k = this.t / this.delay;
      ctx.fillStyle = (this.t >> 2) % 2 ? P.purple : P.magenta;
      ctx.fillRect(x - 4, y - 1, 9, 2);
      ctx.fillRect(x, y - 3, 1, 6);
      const h = (1 - k) * 90;
      if (k > 0.5) { ctx.fillStyle = P.pink; ctx.fillRect(x, Math.round(y - 24 - h), 1, 20); }
      return;
    }
    const fade = 1 - (this.t - this.delay) / 30;
    ctx.globalAlpha = Math.max(0, fade);
    ctx.fillStyle = P.ink;
    ctx.fillRect(x - 2, y - 22, 5, 22);
    ctx.fillStyle = P.pink;
    ctx.fillRect(x - 1, y - 21, 3, 18);
    ctx.fillStyle = P.white;
    ctx.fillRect(x, y - 21, 1, 18);
    ctx.fillStyle = P.purple;
    ctx.fillRect(x - 4, y - 24, 9, 2);
    ctx.globalAlpha = 1;
  }

  lights(out, cx, cy) { out.push({ x: this.x - cx, y: this.y - 10 - cy, r: 20, i: 0.6, color: P.magenta }); }
}

// Short-lived dark fire left by phase-2 slashes.
class DarkFlame extends Entity {
  constructor(game, x, y) {
    super(game, x, y);
    this.layer = 'floor';
    this.life = 110;
  }

  update() {
    this.t++;
    if (--this.life <= 0) this.dead = true;
    if (this.t % 6 === 0) this.game.particles.spawn({ x: this.x + rand(-5, 5), y: this.y - 2, vy: -0.6, life: 20, color: this.t % 12 ? P.purple : P.magenta, drag: 1, glow: 3 });
    const p = this.game.player;
    if (this.life > 10 && Math.abs(p.x - this.x) < 9 && Math.abs(p.y - this.y) < 6) p.takeHit({ x: this.x, y: this.y, damage: 1, knock: 1.5, flags: {} });
  }

  draw(ctx, cx, cy) {
    const f = SPR.props.flameVoid[(this.t >> 3) % 4];
    const k = Math.min(1, this.life / 30);
    ctx.globalAlpha = k;
    ctx.drawImage(f, Math.round(this.x - cx - 5), Math.round(this.y - cy - 12), 10, 13);
    ctx.globalAlpha = 1;
  }

  lights(out, cx, cy) { out.push({ x: this.x - cx, y: this.y - 6 - cy, r: 24, i: 0.6, color: P.magenta }); }
}

export class CorruptedKnight extends Boss {
  constructor(game, x, y, o) {
    super(game, x, y, o);
    this.bossId = 'knight';
    this.bossName = 'Ser Aldric, il Cavaliere Corrotto';
    this.storyStage = 3;
    this.gateId = 'c_throne.gate';
    this.maxHp = this.hp = 110;
    this.w = 12; this.h = 8;
    this.hurtW = 16; this.hurtH = 30; this.hurtOY = 14;
    this.poise = 0.85;
    this.dir = 'down';
    this.alpha = 1;
    this.combo = 0;
    this.picks = 0;
    this.walkT = 0;
    this.moveMode = 'ground';
    this.sparkColors = [P.white, P.pink, P.purple];
    this.kneeling = true;
  }

  get S() { return SPR.bosses.knight[this.dir] || SPR.bosses.knight.down; }

  face(a) { this.dir = dirFromAngle(a); }

  damageMult(hit) {
    if (this.state === 'RECOVER' || this.state === 'LANDED') return 1.6;
    return 1;
  }

  takeHit(hit) {
    if (this.state === 'GUARD' && !hit.flags.bomb && !hit.flags.breaksGuard) {
      const a = Math.atan2(hit.y - this.y, hit.x - this.x);
      if (Math.abs(angleDiff(dirAngle[this.dir], a)) < 1.3) {
        this.game.audio.play('clank');
        FX.sparks(this.game.particles, (this.x + hit.x) / 2, this.y - 16, 8, [P.white, P.pink]);
        this.riposte = true;
        return 'block';
      }
    }
    if (this.state === 'VANISH' || this.state === 'LEAP') return null;
    const r = super.takeHit(hit);
    // may raise the guard when pressed from the front
    if (r === 'hit' && ['IDLE', 'WALK'].includes(this.state) && chance(0.35)) this.setState('GUARD');
    return r;
  }

  // ---------------------------------------------------------------- states
  s_DORMANT() {
    const pl = this.player;
    if (pl.y < this.room.th * 16 - 72 && pl.state === 'move') this.setState('INTRO');
  }

  s_INTRO() {
    const g = this.game;
    const t = this.st;
    if (t === 0) {
      g.cutscene = true;
      g.room.emit(this.gateId, false, false);
      g.camera.focus = { x: this.x, y: this.y - 20 };
      g.bossActive = this;
      this.dir = 'down';
      this.kneeling = true;
    }
    g.letterbox = Math.min(22, t * 0.8);
    if (t === 40) {
      this.introScript = g.dialog([
        { speaker: 'aldric', text: '...Sei tornato.' },
        { speaker: 'aldric', text: 'Sette inverni ti ho cercato. Poi ho smesso di cercare, e ho cominciato ad aspettare.' },
        { speaker: 'aldric', text: 'Hai lasciato la fiamma. Io ho lasciato me stesso, un pezzo alla volta.' },
        { speaker: 'aldric', text: 'Alzati, Portatore. Mostrami che non è stato tutto inutile.' },
      ]);
    }
    if (t > 40 && t < 60) return;
    if (t >= 60 && this.introScript && !this.introScript()) { this.st = 60; return; }
    if (t === 61) {
      this.kneeling = false;
      g.audio.play('roar', { vol: 0.5 });
      g.camera.shake(0.5);
      FX.poof(g.particles, this.x, this.y - 10, 20, [P.purple, P.plum, P.black]);
      g.hud.showBanner(this.bossName, 'Custode del terzo sigillo');
    }
    if (t === 100) { g.audio.playMusic('boss', 0.3); g.hud.setBoss(this); }
    if (t >= 120) {
      g.cutscene = false;
      g.camera.focus = null;
      g.letterbox = 0;
      this.setState('IDLE');
    }
  }

  s_IDLE() {
    this.face(this.angP());
    if (this.st < [0, 26, 18, 12][this.phase]) return;
    this.choose();
  }

  choose() {
    const d = this.distP();
    this.picks++;
    const r = Math.random();
    if (this.phase >= 2 && this.picks % 4 === 0) return this.setState(chance(0.5) ? 'SWORDS' : 'LEAP');
    if (this.phase === 3 && r < 0.3) return this.setState('VANISH');
    if (this.phase === 3 && r < 0.45) return this.setState('BEAM');
    if (d > 110) return this.setState(chance(0.6) ? 'DASHTELL' : 'WALK');
    if (d < 44) { this.combo = this.phase === 1 ? 2 : 3; return this.setState('WINDUP'); }
    return this.setState(chance(0.5) ? 'WALK' : 'DASHTELL');
  }

  s_WALK() {
    const pl = this.player;
    const a = angleTo(this.x, this.y, pl.x, pl.y);
    this.moveBy(Math.cos(a) * 1.15, Math.sin(a) * 1.15);
    this.face(a);
    this.walkT++;
    if (this.walkT % 20 === 0) this.game.audio.play('step', { surface: 'stone' });
    if (this.distP() < 40) { this.combo = this.phase === 1 ? 2 : 3; this.setState('WINDUP'); }
    else if (this.st > 70) this.setState('DASHTELL');
  }

  s_WINDUP() {
    const g = this.game;
    const last = this.combo === 1;
    const dur = last ? 22 : 15;
    if (this.st === 0) { this.atkA = this.angP(); g.audio.play('windup', { x: this.x, y: this.y, vol: 0.7 }); }
    if (this.st < dur - 6) { this.atkA = this.angP(); this.face(this.atkA); }
    if (this.st >= dur) this.setState('SLASH');
  }

  s_SLASH() {
    const g = this.game;
    const last = this.combo === 1;
    if (this.st === 0) {
      g.combat.add({
        owner: this, team: 'enemy', shape: 'arc', x: this.x, y: this.y - 12, r: last ? 36 : 30, angle: this.atkA, span: last ? 2.8 : 2.2,
        damage: last ? 3 : 2, knock: last ? 5 : 3.5, life: 5, flags: { sword: true, heavy: last },
        follow: (h) => { h.x = this.x; h.y = this.y - 12; },
      });
      g.addSlash(this, this.atkA, { pal: 'dark', rOut: last ? 32 : 26, span: last ? 2.8 : 2.2, cw: this.combo % 2 === 0 });
      g.audio.play('swing', { combo: last ? 2 : 0 });
      if (last) g.camera.shake(0.25);
      if (this.phase >= 2) {
        const fx = this.x + Math.cos(this.atkA) * 26, fy = this.y + Math.sin(this.atkA) * 18;
        g.addEntity(new DarkFlame(g, fx, fy));
      }
    }
    if (this.st < 6) this.moveBy(Math.cos(this.atkA) * 2.4, Math.sin(this.atkA) * 2.4);
    if (this.st >= 9) {
      this.combo--;
      if (this.combo > 0) this.setState('WINDUP');
      else this.setState('RECOVER');
    }
  }

  s_RECOVER() {
    if (this.st >= (this.phase === 3 ? 22 : 34)) this.setState('IDLE');
  }

  s_GUARD() {
    this.face(this.angP());
    if (this.riposte && this.st > 6) {
      this.riposte = false;
      this.combo = 1;
      this.atkA = this.angP();
      this.setState('SLASH');
      return;
    }
    if (this.st >= 44) this.setState('IDLE');
  }

  s_DASHTELL() {
    const g = this.game;
    if (this.st === 0) g.audio.play('windup', { x: this.x, y: this.y });
    if (this.st < 20) { this.dashA = this.angP(); this.face(this.dashA); }
    if (this.st % 4 === 0) FX.dust(g.particles, this.x, this.y + 2, 1, P.gray);
    if (this.st >= 28) this.setState('DASH');
  }

  s_DASH() {
    const g = this.game;
    if (this.st === 0) {
      this.dashHit = g.combat.add({ owner: this, team: 'enemy', shape: 'circle', x: this.x, y: this.y - 12, r: 16, damage: 2, knock: 5, life: 20, flags: { sword: true }, follow: (h) => { h.x = this.x + Math.cos(this.dashA) * 10; h.y = this.y - 10; } });
      g.audio.play('dash');
    }
    const r = this.moveBy(Math.cos(this.dashA) * 5, Math.sin(this.dashA) * 5, 'walk');
    if (this.st % 2 === 0) this.after = { x: this.x, y: this.y, t: 8 };
    if (this.st >= 20 || r.x || r.y) {
      if (this.dashHit) this.dashHit.life = 0;
      this.setState('RECOVER');
    }
  }

  s_LEAP() {
    const g = this.game;
    const t = this.st;
    if (t === 0) {
      this.leapFrom = { x: this.x, y: this.y };
      this.leapTo = { x: this.player.x, y: this.player.y };
      g.audio.play('dash');
    }
    const k = Math.min(1, t / 40);
    if (t < 30) { this.leapTo.x = lerp(this.leapTo.x, this.player.x, 0.08); this.leapTo.y = lerp(this.leapTo.y, this.player.y, 0.08); }
    this.x = lerp(this.leapFrom.x, this.leapTo.x, k);
    this.y = lerp(this.leapFrom.y, this.leapTo.y, k);
    this.z = Math.sin(k * Math.PI) * 60;
    if (t >= 40) {
      this.z = 0;
      g.combat.add({ owner: this, team: 'enemy', shape: 'circle', x: this.x, y: this.y, r: 24, damage: 3, knock: 5, life: 4, flags: { heavy: true } });
      g.addEntity(new Shockwave(g, this.x, this.y, { speed: 3, max: 90, damage: 1, color: P.pink }));
      g.audio.play('slam');
      g.camera.shake(0.55);
      FX.dust(g.particles, this.x, this.y, 12, P.gray);
      // don't land inside walls
      if (boxBlocked(this.room, this.x, this.y, this.w, this.h, 'walk', this)) { this.x = this.leapFrom.x; this.y = this.leapFrom.y; }
      this.setState('LANDED');
    }
  }

  s_LANDED() {
    if (this.st >= 36) this.setState('IDLE');
  }

  s_SWORDS() {
    const g = this.game;
    const t = this.st;
    if (t === 0) { g.audio.play('cast'); g.audio.play('roar', { vol: 0.4 }); }
    if (t === 20) {
      const pl = this.player;
      const n = this.phase === 3 ? 9 : 7;
      const a = angleTo(this.x, this.y, pl.x, pl.y);
      // a line of swords through the player, plus a crossing line
      for (let i = 0; i < n; i++) {
        const off = (i - (n - 1) / 2) * 20;
        g.addEntity(new ShadowSword(g, pl.x + Math.cos(a + Math.PI / 2) * off, pl.y + Math.sin(a + Math.PI / 2) * off * 0.7, 40 + Math.abs(i - (n - 1) / 2) * 4));
      }
      if (this.phase === 3) for (let i = 0; i < 5; i++) {
        const off = (i - 2) * 22;
        g.addEntity(new ShadowSword(g, pl.x + Math.cos(a) * off, pl.y + Math.sin(a) * off * 0.7, 70 + i * 3));
      }
    }
    if (t >= 80) this.setState('IDLE');
  }

  s_VANISH() {
    const g = this.game;
    const t = this.st;
    if (t === 0) { g.audio.play('teleport'); FX.poof(g.particles, this.x, this.y - 12, 16, [P.purple, P.black, P.plum]); }
    this.alpha = Math.max(0, 1 - t / 12);
    if (t === 40) {
      const pl = this.player;
      const behind = dirAngle[pl.dir] + Math.PI;
      for (const d of [34, 26, 18]) {
        const x = pl.x + Math.cos(behind) * d, y = pl.y + Math.sin(behind) * d;
        if (!boxBlocked(this.room, x, y, this.w, this.h, 'walk', this)) { this.x = x; this.y = y; break; }
      }
      FX.poof(g.particles, this.x, this.y - 12, 16, [P.purple, P.pink, P.black]);
      g.audio.play('teleport');
    }
    if (t > 40) this.alpha = Math.min(1, (t - 40) / 6);
    if (t >= 50) { this.combo = 1; this.atkA = this.angP(); this.face(this.atkA); this.setState('WINDUP'); this.st = 8; }
  }

  s_BEAM() {
    const g = this.game;
    if (this.st === 0) { this.atkA = this.angP(); g.audio.play('windup'); }
    if (this.st < 16) { this.atkA = this.angP(); this.face(this.atkA); }
    if (this.st === 22) {
      for (const off of [-0.25, 0, 0.25]) {
        g.addEntity(new Projectile(g, this.x + Math.cos(this.atkA) * 12, this.y - 8, this.atkA + off, { team: 'enemy', kind: 'void', speed: 3.2, damage: 2, r: 7, z: 10, life: 120, light: 30 }));
      }
      g.addSlash(this, this.atkA, { pal: 'dark', rOut: 30, span: 2.4 });
      g.audio.play('lightBlade');
    }
    if (this.st >= 40) this.setState('RECOVER');
  }

  s_PHASE() {
    const g = this.game;
    const t = this.st;
    this.kneeling = t < 60;
    if (t === 5) { g.audio.play('roar'); g.camera.shake(0.7); g.flashScreen(P.magenta, 0.2); FX.poof(g.particles, this.x, this.y - 12, 24, [P.purple, P.black]); }
    if (this.phase === 2 && t === 30) {
      g.audio.setIntensity(1);
      // banners catch dark fire
      for (const e of g.room.entities) if (e instanceof Decor && e.o.id === 'banner' && !e.dead) {
        e.dead = true;
        for (let i = 0; i < 3; i++) g.addEntity(new DarkFlame(g, e.x + rand(-6, 6), e.y + 4));
      }
      g.toast('Fiamme oscure divorano gli stendardi!', 100);
    }
    if (this.phase === 3 && t === 30) {
      g.audio.setIntensity(2);
      this.darkness = 0.9;
      g.toast('L\'oscurità inghiotte la sala...', 100);
    }
    if (t >= 70) this.setState('IDLE');
  }

  s_DYING() {
    const g = this.game;
    const t = this.st;
    this.kneeling = true;
    g.letterbox = Math.min(22, t);
    g.camera.focus = { x: this.x, y: this.y - 20 };
    if (t === 30) {
      this.deathTalk = g.dialog([
        { speaker: 'aldric', text: 'Ah... ecco la luce che ricordavo.' },
        { speaker: 'aldric', text: 'Il giuramento era proteggere la strada fino al tuo ritorno. L\'ho mantenuto. A modo mio.' },
        { speaker: 'aldric', text: 'Prendi l\'elsa. Il Lume ti aspetta, oltre il cancello del villaggio.' },
        { speaker: 'aldric', text: 'Qualunque cosa sceglierai... sarà abbastanza.' },
      ]);
    }
    if (t > 30 && t < 50) return;
    if (t >= 50 && this.deathTalk && !this.deathTalk()) { this.st = 50; return; }
    if (t > 50) {
      this.alpha = Math.max(0, 1 - (t - 50) / 80);
      if (t % 3 === 0) g.particles.spawn({ x: this.x + rand(-8, 8), y: this.y - rand(0, 30), vy: -0.8, life: 40, color: chance(0.5) ? P.white : P.gold, drag: 1, glow: 4 });
    }
    if (t === 140) {
      this.gone = true;
      this.darkness = null;
      this.defeated([
        { item: 'brokenOath', flag: 'item.brokenOath' },
        { item: 'heartContainer', flag: 'item.hc.knight' },
      ]);
    }
  }

  update() {
    super.update();
    if (this.after && --this.after.t <= 0) this.after = null;
    if (this.phase >= 2 && this.t % 5 === 0 && !this.gone && this.alpha > 0.5) {
      this.game.particles.spawn({ x: this.x + rand(-8, 8), y: this.y - rand(4, 30), vy: -0.5, life: 24, color: chance(0.5) ? P.purple : P.magenta, drag: 1, glow: 3 });
    }
  }

  // ---------------------------------------------------------------- drawing
  frame() {
    const S = this.S;
    if (this.kneeling) return SPR.bosses.knight.down.kneel[0];
    switch (this.state) {
      case 'WALK': return S.walk[Math.floor(this.walkT / 8) % 4];
      case 'WINDUP': case 'DASHTELL': case 'SWORDS': case 'BEAM': return this.st < 10 && this.state === 'BEAM' ? S.back[0] : S.windup[0];
      case 'SLASH': case 'DASH': case 'RECOVER': case 'LANDED': return S.strike[0];
      case 'GUARD': return S.back[0];
      case 'LEAP': return S.windup[0];
      default: return S.idle[(this.t >> 5) % 2];
    }
  }

  drawSword(ctx, cx, cy) {
    let a = dirAngle[this.dir] + 0.9, len = 22;
    if (this.state === 'WINDUP' || this.state === 'DASHTELL' || this.state === 'LEAP' || this.state === 'SWORDS') { a = -Math.PI / 2 - 0.3; len = 24; }
    else if (this.state === 'SLASH') { const k = Math.min(1, this.st / 4); a = this.atkA - 1.2 + k * 2.4; len = 26; }
    else if (this.state === 'DASH' || this.state === 'RECOVER') { a = (this.dashA ?? this.atkA ?? a); len = 24; }
    else if (this.state === 'GUARD') { a = dirAngle[this.dir] - Math.PI / 2; len = 20; }
    const ox = this.x - cx, oy = this.y - 16 - (this.z || 0) - cy;
    const glint = (this.state === 'WINDUP' && this.st > 8 && (this.st >> 1) % 2) || (this.state === 'DASHTELL' && (this.st >> 2) % 2);
    for (let i = 4; i <= len; i++) {
      const x = Math.round(ox + Math.cos(a) * i), y = Math.round(oy + Math.sin(a) * i);
      ctx.fillStyle = P.ink;
      ctx.fillRect(x - 1, y - 1, 3, 3);
    }
    for (let i = 4; i <= len; i++) {
      const x = Math.round(ox + Math.cos(a) * i), y = Math.round(oy + Math.sin(a) * i);
      ctx.fillStyle = glint ? P.white : i > len - 2 ? P.pink : this.phase >= 2 ? P.purple : P.gray;
      ctx.fillRect(x, y, 1, 1);
    }
    ctx.fillStyle = P.purple;
    ctx.fillRect(Math.round(ox + Math.cos(a) * 4) - 2, Math.round(oy + Math.sin(a) * 4) - 2, 4, 4);
  }

  draw(ctx, cx, cy) {
    if (this.gone) return;
    const img = this.frame();
    ctx.globalAlpha = this.alpha;
    if (this.after) drawFrame(ctx, img, this.after.x, this.after.y + 2, cx, cy, { alpha: 0.3 * this.alpha, ay: 40 });
    const behind = this.dir === 'up';
    if (behind && !this.kneeling) this.drawSword(ctx, cx, cy);
    const src = this.flash > 0 ? flashOf(img) : img;
    ctx.globalAlpha = this.alpha;
    ctx.drawImage(src, Math.round(this.x - cx - 17), Math.round(this.y - cy - 40 - (this.z || 0)));
    if (!behind && !this.kneeling) this.drawSword(ctx, cx, cy);
    ctx.globalAlpha = 1;
    if (this.state === 'DASHTELL' && this.st > 8 && (this.st >> 1) % 2) {
      ctx.fillStyle = P.magenta;
      for (let i = 20; i < 150; i += 8) ctx.fillRect(Math.round(this.x + Math.cos(this.dashA) * i - cx), Math.round(this.y - 6 + Math.sin(this.dashA) * i - cy), 2, 2);
    }
    if (this.state === 'LEAP' && this.leapTo) {
      // landing marker: a dotted pixel ring
      ctx.fillStyle = (this.st >> 2) % 2 ? P.red : P.magenta;
      const mx = Math.round(this.leapTo.x - cx), my = Math.round(this.leapTo.y - cy);
      for (let i = 0; i < 40; i++) {
        const a = (i / 40) * Math.PI * 2 + this.st * 0.02;
        ctx.fillRect(Math.round(mx + Math.cos(a) * 24), Math.round(my + Math.sin(a) * 15), 2, 1);
      }
    }
  }

  drawShadow(ctx, cx, cy) {
    if (this.gone || this.alpha < 0.3) return;
    const s = SPR.fx.shadow.l;
    ctx.drawImage(s, Math.round(this.x - cx - s.width / 2), Math.round(this.y - cy - 2));
  }

  lights(out, cx, cy) {
    if (this.gone) return;
    out.push({ x: this.x - cx, y: this.y - 30 - (this.z || 0) - cy, r: this.phase >= 2 ? 60 : 30, i: 0.9 * this.alpha, color: P.magenta });
  }
}
