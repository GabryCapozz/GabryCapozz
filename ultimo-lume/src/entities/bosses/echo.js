// Final boss — L'Eco / Il Lume Morente.
// Phase 1: a shadow of the Wanderer that fights like you: dash-in combos, dodges your swings,
//          throws bombs, fires arrow fans and blinks behind you.
// Phase 2: it merges with the dying flame. A shield of light deflects the sword: break it with
//          the Light Blade, then strike. Fire rings, spirals and ember rain.
// Phase 3: the edges of the altar catch fire (the arena closes in); patterns speed up.
import { Boss } from './common.js';
import { Entity, drawFrame } from '../entity.js';
import { Projectile, Bomb } from '../projectiles.js';
import { SPR } from '../../gfx/sprites/index.js';
import { P } from '../../gfx/palette.js';
import { FX } from '../../systems/particles.js';
import { flashOf, tintOf } from '../../gfx/pixel.js';
import { dirFromAngle, dirAngle, rand, chance, lerp, TAU } from '../../core/math.js';
import { boxBlocked } from '../../systems/collision.js';

class Ember extends Entity {
  constructor(game, x, y, delay) {
    super(game, x, y);
    this.delay = delay;
    this.layer = 'top';
  }

  update() {
    this.t++;
    if (this.t === this.delay) {
      const g = this.game;
      g.combat.add({ owner: this, team: 'enemy', shape: 'circle', x: this.x, y: this.y, r: 11, damage: 1, knock: 2, life: 3, flags: { fire: true } });
      FX.embers(g.particles, this.x, this.y, 5);
      g.audio.play('sizzle', { x: this.x, y: this.y, vol: 0.4 });
      this.dead = true;
    }
  }

  draw(ctx, cx, cy) {
    const k = this.t / this.delay;
    ctx.fillStyle = 'rgba(14,11,22,0.45)';
    ctx.beginPath();
    ctx.ellipse(Math.round(this.x - cx), Math.round(this.y - cy), 3 + k * 7, 2 + k * 3, 0, 0, TAU);
    ctx.fill();
    const img = SPR.fx.orbFire[(this.t >> 2) % 4];
    ctx.drawImage(img, Math.round(this.x - cx - 6), Math.round(this.y - cy - 6 - (1 - k) * 170));
  }

  lights(out, cx, cy) { out.push({ x: this.x - cx, y: this.y - cy - (1 - this.t / this.delay) * 170, r: 20, i: 0.7, color: P.orange }); }
}

class WallFire extends Entity {
  constructor(game, x, y) {
    super(game, x, y);
    this.layer = 'floor';
  }

  update() {
    this.t++;
    if (this.t % 7 === 0) FX.embers(this.game.particles, this.x + rand(-6, 6), this.y - 4, 1);
    const p = this.game.player;
    if (Math.abs(p.x - this.x) < 10 && Math.abs(p.y - this.y) < 9) p.takeHit({ x: this.x, y: this.y, damage: 1, knock: 3, flags: { fire: true } });
  }

  draw(ctx, cx, cy) {
    const f = SPR.props.flameSmall[((this.t >> 3) + this.x) % 4];
    ctx.drawImage(f, Math.round(this.x - cx - 4), Math.round(this.y - cy - 12));
  }

  lights(out, cx, cy) { out.push({ x: this.x - cx, y: this.y - 6 - cy, r: 26, i: 0.7, color: P.orange }); }
}

export class Echo extends Boss {
  constructor(game, x, y, o) {
    super(game, x, y, o);
    this.bossId = 'echo';
    this.bossName = "L'Eco del Viandante";
    this.storyStage = 4;
    this.gateId = 's_final.gate';
    this.maxHp = this.hp = 140;
    this.w = 10; this.h = 7;
    this.hurtW = 10; this.hurtH = 16; this.hurtOY = 6;
    this.poise = 0.4;
    this.dir = 'down';
    this.form = 'shadow';
    this.phaseMarks = [0.55, 0.25];
    this.shield = 3;
    this.aim = Math.PI / 2;
    this.animT = 0;
    this.after = [];
    this.home = { x, y };
    this.sparkColors = [P.pink, P.purple, P.white];
  }

  get flame() { return this.form === 'flame'; }

  // ---------------------------------------------------------------- damage rules
  takeHit(hit) {
    if (hit.team === 'hazard') return null;
    if (this.state === 'DODGE' || this.state === 'BLINK' || this.state === 'MERGE') return null;
    if (this.flame && this.state !== 'EXPOSED') {
      if (hit.flags.light) {
        this.shield--;
        this.flash = 6;
        this.game.audio.play('crystal');
        FX.sparks(this.game.particles, this.x, this.y - 30, 10, [P.white, P.yellow]);
        if (this.shield <= 0) { this.setState('EXPOSED'); this.game.toast('Lo scudo di luce si spezza!', 80); }
        return 'hit';
      }
      if (hit.flags.sword) {
        this.game.audio.play('clank');
        FX.sparks(this.game.particles, (this.x + hit.x) / 2, this.y - 20, 6, [P.yellow, P.white]);
        if (!this.shieldHint) { this.shieldHint = true; this.game.toast('La fiamma ti respinge... serve una luce più forte.', 150); }
        return 'block';
      }
      return null;
    }
    return super.takeHit(hit);
  }

  checkPhase() {
    const f = this.hp / this.maxHp;
    if (this.phase === 1 && f <= this.phaseMarks[0]) { this.phase = 2; this.setState('MERGE'); return false; }
    if (this.phase === 2 && f <= this.phaseMarks[1]) { this.phase = 3; this.setState('BLAZE'); return false; }
    return false;
  }

  // ---------------------------------------------------------------- intro
  s_DORMANT() {
    const pl = this.player;
    this.alpha = 0.7 + Math.sin(this.t * 0.1) * 0.2;
    if (pl.x < this.room.tw * 16 - 90 && pl.state === 'move') this.setState('INTRO');
  }

  s_INTRO() {
    const g = this.game;
    const t = this.st;
    if (t === 0) {
      g.cutscene = true;
      g.room.emit(this.gateId, false, false);
      g.camera.focus = { x: this.x, y: this.y - 10 };
      g.bossActive = this;
      this.dir = 'right';
    }
    g.letterbox = Math.min(22, t * 0.8);
    if (t === 40) {
      this.talk = g.dialog([
        { speaker: 'echo', text: 'Sei arrivato fin qui. Proprio tu, che quella notte sei scappato.' },
        { speaker: 'echo', text: 'Io sono ciò che hai lasciato su questo altare: la paura. Il dubbio. Il tuo nome.' },
        { speaker: 'echo', text: 'Se vuoi il Lume, dovrai prenderlo da me.' },
      ]);
    }
    if (t > 40 && t < 60) return;
    if (t >= 60 && this.talk && !this.talk()) { this.st = 60; return; }
    if (t === 61) { g.audio.play('roar', { vol: 0.4 }); g.hud.showBanner(this.bossName, 'Ciò che hai lasciato indietro'); }
    if (t === 90) { g.audio.playMusic('finalBoss', 0.3); g.hud.setBoss(this); }
    if (t >= 110) {
      g.cutscene = false;
      g.camera.focus = null;
      g.letterbox = 0;
      this.alpha = 1;
      this.setState('STALK');
    }
  }

  // ---------------------------------------------------------------- phase 1: shadow duel
  s_STALK() {
    const pl = this.player;
    const d = this.distP();
    const a = this.angP();
    this.aim = a;
    this.dir = dirFromAngle(a);
    // orbit at ~64px
    const want = 64;
    const radial = d > want + 10 ? 1 : d < want - 10 ? -1 : 0;
    const side = Math.sin(this.t * 0.02) > 0 ? 1 : -1;
    const mx = Math.cos(a) * radial * 1.4 + Math.cos(a + Math.PI / 2) * side * 1.1;
    const my = Math.sin(a) * radial * 1.4 + Math.sin(a + Math.PI / 2) * side * 1.1;
    this.moveBy(mx, my, 'walk');
    this.animT++;
    // dodge the player's swings
    if (pl.state === 'attack' && d < 44 && chance(0.08)) return this.setState('DODGE');
    if (this.st < 40) return;
    const r = Math.random();
    if (r < 0.4) this.setState('RUSH');
    else if (r < 0.6) this.setState('BOMB');
    else if (r < 0.82) this.setState('ARROWS');
    else this.setState('BLINK');
  }

  s_RUSH() {
    // dash in, then a three-hit combo
    const g = this.game;
    if (this.st === 0) { this.aim = this.angP(); g.audio.play('dash'); }
    if (this.st < 10) {
      this.moveBy(Math.cos(this.aim) * 4.2, Math.sin(this.aim) * 4.2, 'walk');
      if (this.st % 2 === 0) this.after.push({ x: this.x, y: this.y, img: this.frame(), life: 10 });
      if (this.distP() < 22) this.st = 9;
      return;
    }
    const k = this.st - 10;
    const hitAt = [6, 16, 30];
    if (k === 0) { this.aim = this.angP(); this.dir = dirFromAngle(this.aim); g.audio.play('windup', { vol: 0.6 }); }
    for (let i = 0; i < 3; i++) {
      if (k === hitAt[i]) {
        const big = i === 2;
        g.combat.add({ owner: this, team: 'enemy', shape: 'arc', x: this.x, y: this.y - 7, r: big ? 26 : 22, angle: this.aim, span: big ? 3 : 2.4, damage: big ? 2 : 1, knock: big ? 4.5 : 2.6, life: 5, flags: { sword: true }, follow: (h) => { h.x = this.x; h.y = this.y - 7; } });
        g.addSlash(this, this.aim, { pal: 'dark', rOut: big ? 24 : 20, span: big ? 3 : 2.4, cw: i !== 1 });
        g.audio.play('swing', { combo: big ? 2 : 0 });
        this.moveBy(Math.cos(this.aim) * 3, Math.sin(this.aim) * 3, 'walk');
      }
    }
    if (k >= 50) this.setState('STALK');
  }

  s_DODGE() {
    if (this.st === 0) {
      const a = this.angP() + Math.PI + rand(-0.8, 0.8);
      this.dodgeA = a;
      this.game.audio.play('dash');
    }
    const k = Math.pow(1 - this.st / 14, 1.5);
    this.moveBy(Math.cos(this.dodgeA) * 4.6 * k, Math.sin(this.dodgeA) * 4.6 * k, 'walk');
    if (this.st % 2 === 0) this.after.push({ x: this.x, y: this.y, img: this.frame(), life: 10 });
    if (this.st >= 14) this.setState(chance(0.5) ? 'RUSH' : 'STALK');
  }

  s_BOMB() {
    const g = this.game;
    if (this.st === 6) {
      const a = this.angP();
      const d = Math.min(90, this.distP());
      g.addEntity(new Bomb(g, this.x, this.y, Math.cos(a) * d / 34, Math.sin(a) * d / 34, 3.4, 'enemy'));
      g.audio.play('swing');
    }
    if (this.st >= 24) this.setState('STALK');
  }

  s_ARROWS() {
    const g = this.game;
    if (this.st === 0) g.audio.play('windup', { vol: 0.6 });
    if (this.st < 14) { this.aim = this.angP(); this.dir = dirFromAngle(this.aim); }
    if (this.st === 20) {
      for (const off of [-0.3, 0, 0.3]) g.addEntity(new Projectile(g, this.x + Math.cos(this.aim) * 8, this.y - 4, this.aim + off, { team: 'enemy', kind: 'enemyArrow', speed: 3.6, damage: 1, r: 4, z: 6, life: 100, flags: { arrow: true } }));
      g.audio.play('arrow');
    }
    if (this.st >= 34) this.setState('STALK');
  }

  s_BLINK() {
    const g = this.game;
    if (this.st === 0) { FX.poof(g.particles, this.x, this.y - 8, 12, [P.purple, P.pink]); g.audio.play('teleport'); }
    this.alpha = this.st < 16 ? 1 - this.st / 16 : (this.st - 16) / 8;
    if (this.st === 16) {
      const pl = this.player;
      const behind = dirAngle[pl.dir] + Math.PI;
      for (const d of [30, 22, 16]) {
        const x = pl.x + Math.cos(behind) * d, y = pl.y + Math.sin(behind) * d;
        if (!boxBlocked(this.room, x, y, this.w, this.h, 'walk', this)) { this.x = x; this.y = y; break; }
      }
      FX.poof(g.particles, this.x, this.y - 8, 12, [P.purple, P.pink, P.white]);
    }
    if (this.st >= 24) { this.alpha = 1; this.setState('RUSH'); this.st = 10; }
  }

  // ---------------------------------------------------------------- transition
  s_MERGE() {
    const g = this.game;
    const t = this.st;
    if (t === 0) {
      g.cutscene = true;
      g.camera.focus = { x: this.home.x, y: this.home.y - 30 };
      g.combat.hits = g.combat.hits.filter((h) => h.owner !== this);
      this.talk = g.dialog([
        { speaker: 'echo', text: 'Non capisci? Non puoi sconfiggermi. Io sono te.' },
        { speaker: 'echo', text: 'E se non posso essere il Viandante... sarò la fiamma.' },
      ]);
    }
    if (t > 0 && t < 10) return;
    if (t >= 10 && this.talk && !this.talk()) { this.st = 10; return; }
    this.x = lerp(this.x, this.home.x, 0.06);
    this.y = lerp(this.y, this.home.y, 0.06);
    if (t % 3 === 0) g.particles.spawn({ x: this.x + rand(-10, 10), y: this.y - rand(0, 20), vy: -1, life: 30, color: chance(0.5) ? P.orange : P.yellow, drag: 1, glow: 4 });
    if (t === 70) {
      this.form = 'flame';
      this.shield = 3;
      g.flashScreen(P.white, 0.8);
      g.audio.play('explosion');
      g.audio.play('roar');
      g.camera.shake(0.8);
      g.audio.setIntensity(1);
      this.bossName = 'Il Lume Morente';
      g.hud.showBanner('Il Lume Morente', 'Rompi lo scudo con la Lama di Luce');
    }
    if (t >= 110) {
      g.cutscene = false;
      g.camera.focus = null;
      this.setState('FLOAT');
    }
  }

  // ---------------------------------------------------------------- phase 2/3: the dying flame
  s_FLOAT() {
    this.hover();
    if (this.st < (this.phase === 3 ? 30 : 50)) return;
    const r = Math.random();
    if (r < 0.35) this.setState('RING');
    else if (r < 0.6) this.setState('SPIRAL');
    else if (r < 0.82) this.setState('RAIN');
    else this.setState('SWEEP');
  }

  hover() {
    const tx = this.home.x + Math.sin(this.t * 0.013) * 90, ty = this.home.y + Math.sin(this.t * 0.021) * 26;
    this.x = lerp(this.x, tx, 0.03);
    this.y = lerp(this.y, ty, 0.03);
  }

  fireOrb(a, speed, kind = 'fire') {
    const g = this.game;
    g.addEntity(new Projectile(g, this.x + Math.cos(a) * 14, this.y - 24 + Math.sin(a) * 10, a, { team: 'enemy', kind, speed, damage: 1, r: 5, z: 12, life: 220, light: 18 }));
  }

  s_RING() {
    this.hover();
    const g = this.game;
    const n = this.phase === 3 ? 18 : 14;
    if (this.st === 0) g.audio.play('laserCharge');
    if (this.st === 30 || this.st === 60 || (this.phase === 3 && this.st === 90)) {
      const off = rand(0, TAU);
      for (let i = 0; i < n; i++) if (i % 5 !== 0) this.fireOrb(off + (i / n) * TAU, 1.5);
      g.audio.play('orb');
    }
    if (this.st >= (this.phase === 3 ? 110 : 80)) this.setState('FLOAT');
  }

  s_SPIRAL() {
    this.hover();
    if (this.st % (this.phase === 3 ? 5 : 7) === 0 && this.st > 20) {
      const a = this.st * 0.13;
      this.fireOrb(a, 1.7);
      this.fireOrb(a + Math.PI, 1.7);
      if (this.st % 21 === 0) this.game.audio.play('orb', { vol: 0.5 });
    }
    if (this.st >= 120) this.setState('FLOAT');
  }

  s_RAIN() {
    this.hover();
    const g = this.game;
    if (this.st === 0) g.audio.play('roar', { vol: 0.4 });
    if (this.st % 6 === 0 && this.st < 90) {
      const pl = this.player;
      g.addEntity(new Ember(g, pl.x + rand(-70, 70), pl.y + rand(-40, 40), 46));
    }
    if (this.st >= 110) this.setState('FLOAT');
  }

  s_SWEEP() {
    const g = this.game;
    if (this.st === 0) { this.sweepA = this.angP(); g.audio.play('windup'); }
    if (this.st < 30) {
      if (this.st < 20) this.sweepA = this.angP();
      return;
    }
    if (this.st === 30) {
      this.sweepHit = g.combat.add({ owner: this, team: 'enemy', shape: 'circle', x: this.x, y: this.y - 20, r: 22, damage: 2, knock: 5, life: 40, flags: { fire: true }, follow: (h) => { h.x = this.x; h.y = this.y - 20; } });
      g.audio.play('dash');
    }
    const r = this.moveBy(Math.cos(this.sweepA) * 4, Math.sin(this.sweepA) * 4, 'fly');
    if (this.st % 3 === 0) FX.embers(g.particles, this.x, this.y - 10, 2);
    if (r.x || r.y || this.st > 70) {
      if (this.sweepHit) this.sweepHit.life = 0;
      this.setState('FLOAT');
    }
  }

  s_EXPOSED() {
    // shield broken: the flame sinks and can be struck
    if (this.st === 0) { this.game.audio.play('sizzle'); this.game.camera.shake(0.3); }
    if (this.st >= 170) {
      this.shield = this.phase === 3 ? 4 : 3;
      this.game.audio.play('magic');
      this.game.toast('La fiamma si riaccende!', 70);
      this.setState('FLOAT');
    }
  }

  s_BLAZE() {
    // phase 3: fire along the edges of the altar
    const g = this.game;
    const t = this.st;
    if (t === 0) {
      g.audio.play('roar');
      g.camera.shake(0.7);
      g.flashScreen(P.orange, 0.25);
      g.audio.setIntensity(2);
      this.shield = 4;
      this.darkness = 0.6;
    }
    if (t % 4 === 0 && t < 80) {
      const room = this.room;
      const k = t / 4;
      const W = room.tw * 16, H = room.th * 16;
      const perim = 2 * (W - 96) + 2 * (H - 96);
      const d = (k / 20) * perim;
      const pts = [];
      for (let s = 0; s < 2; s++) {
        let dd = (d + s * perim / 2) % perim;
        let x, y;
        if (dd < W - 96) { x = 48 + dd; y = 48; }
        else if ((dd -= W - 96) < H - 96) { x = W - 48; y = 48 + dd; }
        else if ((dd -= H - 96) < W - 96) { x = W - 48 - dd; y = H - 48; }
        else { dd -= W - 96; x = 48; y = H - 48 - dd; }
        pts.push([x, y]);
      }
      for (const [x, y] of pts) if (Math.hypot(g.player.x - x, g.player.y - y) > 24) g.addEntity(new WallFire(g, x, y));
      g.audio.play('torch', { vol: 0.4 });
    }
    if (t >= 90) this.setState('FLOAT');
  }

  s_DYING() {
    const g = this.game;
    const t = this.st;
    g.letterbox = Math.min(22, t);
    g.camera.focus = { x: this.x, y: this.y - 20 };
    for (const e of g.room.entities) if (e instanceof WallFire || e instanceof Ember) e.dead = true;
    if (t === 20) {
      this.talk = g.dialog([
        { speaker: 'echo', text: '...Allora è così.' },
        { speaker: 'echo', text: 'Va\' pure. La fiamma è là, all\'altare. Piccola come una candela.' },
        { speaker: 'echo', text: 'Ricorda: la scelta è tua. Lo è sempre stata.' },
      ]);
    }
    if (t > 20 && t < 40) return;
    if (t >= 40 && this.talk && !this.talk()) { this.st = 40; return; }
    this.fade = Math.max(0, 1 - (t - 40) / 60);
    if (t % 3 === 0) g.particles.spawn({ x: this.x + rand(-12, 12), y: this.y - rand(0, 40), vx: -1.2, vy: -0.2, life: 50, color: chance(0.5) ? P.gold : P.white, drag: 0.99, glow: 4 });
    if (t === 110) {
      this.gone = true;
      this.darkness = null;
      this.defeated([]);
      g.toast('L\'altare ti attende.', 150);
    }
  }

  update() {
    super.update();
    for (let i = this.after.length - 1; i >= 0; i--) if (--this.after[i].life <= 0) this.after.splice(i, 1);
    this.hurtbox = !['DORMANT', 'INTRO', 'MERGE', 'DYING'].includes(this.state);
    if (this.flame) {
      this.hurtW = 30; this.hurtH = 44; this.hurtOY = 22;
      if (this.t % 4 === 0 && !this.gone) FX.embers(this.game.particles, this.x + rand(-14, 14), this.y - rand(10, 40), 1);
    }
  }

  // ---------------------------------------------------------------- drawing
  frame() {
    const S = SPR.echo[this.dir] || SPR.echo.down;
    switch (this.state) {
      case 'RUSH': return this.st < 10 ? S.dash[0] : S.attack[(this.st >> 3) % 2];
      case 'DODGE': return S.dash[0];
      case 'BOMB': case 'ARROWS': return S.cast[0];
      case 'STALK': return S.walk[Math.floor(this.animT / 6) % 4];
      default: return S.idle[(this.t >> 5) % 2];
    }
  }

  draw(ctx, cx, cy) {
    if (this.gone) return;
    if (!this.flame) {
      for (const a of this.after) drawFrame(ctx, tintOf(a.img, P.purple), a.x, a.y + 2, cx, cy, { alpha: a.life / 14, ay: 21 });
      const img = this.frame();
      drawFrame(ctx, img, this.x, this.y + 2, cx, cy, { flash: this.flash > 0, alpha: this.alpha ?? 1, ay: 21 });
      if (this.state === 'RUSH' && this.st >= 10 && this.st < 20) {
        ctx.fillStyle = P.pink;
        ctx.fillRect(Math.round(this.x - cx) - 1, Math.round(this.y - cy - 24), 3, 3);
      }
      return;
    }
    const frames = SPR.bosses.lume;
    const exposed = this.state === 'EXPOSED';
    const scale = exposed ? 0.7 : 1;
    const f = frames[(this.t >> 2) % frames.length];
    const w = f.width * scale, h = f.height * scale;
    const src = this.flash > 0 ? flashOf(f) : f;
    ctx.globalAlpha = this.fade ?? 1;
    ctx.drawImage(src, Math.round(this.x - cx - w / 2), Math.round(this.y - cy - h + 4), Math.round(w), Math.round(h));
    // the echo's silhouette within the flame
    const sil = tintOf(SPR.echo.down.idle[0], P.plum);
    ctx.globalAlpha = (this.fade ?? 1) * 0.55;
    ctx.drawImage(sil, Math.round(this.x - cx - 8), Math.round(this.y - cy - 30 * scale - 6));
    ctx.globalAlpha = 1;
    // light shield
    if (!exposed && this.shield > 0) {
      ctx.strokeStyle = (this.t >> 2) % 2 ? P.white : P.yellow;
      for (let i = 0; i < this.shield; i++) {
        ctx.beginPath();
        ctx.ellipse(Math.round(this.x - cx), Math.round(this.y - cy - 26), 26 + i * 4, 30 + i * 4, 0, 0, TAU);
        ctx.stroke();
      }
    }
    if (this.state === 'SWEEP' && this.st < 30 && (this.st >> 1) % 2) {
      ctx.fillStyle = P.orange;
      for (let i = 20; i < 200; i += 10) ctx.fillRect(Math.round(this.x + Math.cos(this.sweepA) * i - cx), Math.round(this.y - 10 + Math.sin(this.sweepA) * i - cy), 2, 2);
    }
  }

  drawShadow(ctx, cx, cy) {
    if (this.gone) return;
    const s = this.flame ? SPR.fx.shadow.xl : SPR.fx.shadow.m;
    ctx.drawImage(s, Math.round(this.x - cx - s.width / 2), Math.round(this.y - cy - s.height / 2 + 1));
  }

  lights(out, cx, cy) {
    if (this.gone) return;
    if (this.flame) out.push({ x: this.x - cx, y: this.y - 30 - cy, r: this.state === 'EXPOSED' ? 70 : 120, i: 1 * (this.fade ?? 1), color: P.orange });
    else out.push({ x: this.x - cx, y: this.y - 10 - cy, r: 28, i: 0.6, color: P.purple });
  }
}
