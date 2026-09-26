// Shared boss helpers: shockwaves, falling rocks, rubble, beams, boss base behaviour.
import { Entity, Actor } from '../entity.js';
import { SPR } from '../../gfx/sprites/index.js';
import { P } from '../../gfx/palette.js';
import { FX } from '../../systems/particles.js';
import { Pickup } from '../pickups.js';
import { rand, angleTo } from '../../core/math.js';

// Expanding ground ring that damages whatever it passes through.
export class Shockwave extends Entity {
  constructor(game, x, y, o = {}) {
    super(game, x, y);
    this.layer = 'floor';
    this.r = o.r0 ?? 8;
    this.speed = o.speed ?? 3;
    this.max = o.max ?? 110;
    this.color = o.color || P.silver;
    this.hit = game.combat.add({
      owner: this, team: o.team || 'enemy', shape: 'ring', x, y, r: this.r, rIn: this.r - 8,
      damage: o.damage ?? 1, knock: 3.5, life: 9999, flags: { shock: true },
    });
  }

  update() {
    this.r += this.speed;
    this.hit.r = this.r;
    this.hit.rIn = this.r - 9;
    if (this.r >= this.max) { this.dead = true; this.hit.life = 0; }
  }

  draw(ctx, cx, cy) {
    const n = Math.max(12, Math.floor(this.r * 0.8));
    const fade = 1 - this.r / this.max;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const x = Math.round(this.x + Math.cos(a) * this.r - cx), y = Math.round(this.y + Math.sin(a) * this.r * 0.75 - cy);
      ctx.fillStyle = i % 3 === 0 ? P.white : this.color;
      ctx.fillRect(x - 1, y - 1, 2 + (fade > 0.5 ? 1 : 0), 2);
      if (i % 4 === 0) { ctx.fillStyle = P.steel; ctx.fillRect(x, y + 2, 1, 1); }
    }
  }
}

// Breakable debris left in the arena (changes the battlefield).
export class Rubble extends Entity {
  constructor(game, x, y) {
    super(game, x, y);
    this.solid = true;
    this.w = 14; this.h = 12;
    this.team = 'neutral';
    this.hurtbox = true;
    this.hurtW = 16; this.hurtH = 16;
    this.hp = 2;
    this.flash = 0;
    this.blocksFlyers = true;
  }

  takeHit(hit) {
    this.hp -= hit.flags.bomb || hit.flags.boss || hit.flags.spin ? 3 : 1;
    this.flash = 5;
    this.game.audio.play('rockBreak', { x: this.x, y: this.y, vol: 0.5 });
    if (this.hp <= 0) this.shatter();
    return 'hit';
  }

  shatter() {
    this.dead = true;
    FX.shards(this.game.particles, this.x, this.y - 6, 10, [P.gray, P.steel, P.slate]);
  }

  update() { if (this.flash > 0) this.flash--; }

  draw(ctx, cx, cy) {
    const img = this.flash > 0 ? SPR.props.boulder : SPR.props.rock;
    ctx.drawImage(img, Math.round(this.x - cx - img.width / 2), Math.round(this.y - cy - img.height + 6));
  }

  drawShadow(ctx, cx, cy) {
    const s = SPR.fx.shadow.m;
    ctx.drawImage(s, Math.round(this.x - cx - 6), Math.round(this.y - cy));
  }
}

// A rock falling from the ceiling: growing shadow telegraph, then impact.
export class FallingRock extends Entity {
  constructor(game, x, y, o = {}) {
    super(game, x, y);
    this.delay = o.delay ?? 50;
    this.t = 0;
    this.leaveRubble = o.rubble ?? true;
    this.layer = 'top';
  }

  update() {
    this.t++;
    if (this.t === this.delay) {
      const g = this.game;
      g.combat.add({ owner: this, team: 'hazard', shape: 'circle', x: this.x, y: this.y, r: 13, damage: 2, knock: 3, life: 3, flags: { boss: true } });
      g.audio.play('rockBreak', { x: this.x, y: this.y, vol: 0.7 });
      g.camera.shake(0.2);
      FX.shards(g.particles, this.x, this.y - 4, 8, [P.gray, P.steel]);
      FX.dust(g.particles, this.x, this.y, 8, P.silver);
      this.dead = true;
      if (this.leaveRubble) {
        const pl = g.player;
        const clear = Math.hypot(pl.x - this.x, pl.y - this.y) > 18;
        const tooMany = g.room.entities.filter((e) => e instanceof Rubble).length >= 7;
        if (clear && !tooMany) g.addEntity(new Rubble(g, this.x, this.y));
      }
    }
  }

  draw(ctx, cx, cy) {
    const k = Math.min(1, this.t / this.delay);
    // shadow telegraph
    const r = 4 + k * 9;
    ctx.fillStyle = 'rgba(14,11,22,0.55)';
    ctx.beginPath();
    ctx.ellipse(Math.round(this.x - cx), Math.round(this.y - cy), r, r * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    if (this.t > this.delay * 0.6 && (this.t >> 1) % 2 === 0) {
      ctx.strokeStyle = P.red;
      ctx.strokeRect(Math.round(this.x - cx - r), Math.round(this.y - cy - r * 0.55), Math.round(r * 2), Math.round(r * 1.1));
    }
    // the rock itself, dropping
    const h = (1 - k) * 160;
    if (k > 0.35) {
      const img = SPR.fx.rock;
      ctx.drawImage(img, Math.round(this.x - cx - 7), Math.round(this.y - cy - 12 - h));
    }
  }
}

// Base for bosses: bar, phases, intro/death plumbing.
export class Boss extends Actor {
  constructor(game, x, y, o = {}) {
    super(game, x, y);
    this.o = o;
    this.isBoss = true;
    this.team = 'enemy';
    this.poise = 1;
    this.iframes = 4;
    this.phase = 1;
    this.phaseMarks = [0.66, 0.33];
    this.state = 'DORMANT';
    this.st = 0;
    this.darkness = null;
    this.moveMode = 'ground';
  }

  init() {
    if (this.game.progress.flags['boss:' + this.bossId]) this.dead = true;
  }

  setState(s) { this.state = s; this.st = 0; }

  get player() { return this.game.player; }
  distP() { return Math.hypot(this.player.x - this.x, this.player.y - this.y); }
  angP() { return angleTo(this.x, this.y, this.player.x, this.player.y); }

  update() {
    this.tickTimers();
    const before = this.state;
    const fn = this['s_' + this.state];
    if (fn) fn.call(this);
    if (this.state === before) this.st++;
  }

  // phase thresholds
  checkPhase() {
    const f = this.hp / this.maxHp;
    const want = f <= this.phaseMarks[1] ? 3 : f <= this.phaseMarks[0] ? 2 : 1;
    if (want > this.phase) {
      this.phase = want;
      this.onPhase(want);
      return true;
    }
    return false;
  }

  onPhase() {}

  takeHit(hit) {
    if (['DORMANT', 'INTRO', 'DYING', 'PHASE'].includes(this.state) || this.dead) return null;
    if (this.invuln > 0) return null;
    let dmg = hit.damage * (this.damageMult ? this.damageMult(hit) : 1);
    this.hp -= dmg;
    this.flash = 6;
    this.invuln = this.iframes;
    const g = this.game;
    FX.sparks(g.particles, hit.x + (this.x - hit.x) * 0.5, hit.y + (this.y - 20 - hit.y) * 0.5, 6, this.sparkColors || [P.white, P.silver, P.gray]);
    g.audio.play('hit', { heavy: dmg >= 4 });
    if (this.hp <= 0) { this.hp = 0; this.startDeath(); return 'hit'; }
    if (this.checkPhase()) this.setState('PHASE');
    return 'hit';
  }

  startDeath() {
    this.setState('DYING');
    this.hurtbox = false;
    this.game.combat.hits = this.game.combat.hits.filter((h) => h.owner !== this);
    this.game.audio.stopMusic(0.5);
    this.game.audio.play('bossDie');
    this.game.cutscene = true;
  }

  // Called at the end of the death animation.
  defeated(rewards) {
    const g = this.game;
    const pr = g.progress;
    this.dead = true;
    pr.flags['boss:' + this.bossId] = true;
    pr.story = Math.max(pr.story, this.storyStage);
    g.hud.setBoss(null);
    g.bossActive = null;
    g.cutscene = false;
    g.letterbox = 0;
    g.camera.focus = null;
    g.audio.setIntensity(0);
    g.audio.play('victory');
    const at = this.rewardAt || { x: this.x, y: this.y };
    rewards.forEach((r, i) => {
      g.addEntity(new Pickup(g, at.x + (i - (rewards.length - 1) / 2) * 28, at.y, r.item, 1, { persist: r.flag, present: true }));
    });
    if (this.gateId) g.room.emit(this.gateId, true, true);
    setTimeout(() => g.audio.playMusic(g.room.def.afterMusic || 'ruins', 2), 3500);
    g.autosave(0);
  }

  drawShadow(ctx, cx, cy) {
    if (this.dead) return;
    const s = SPR.fx.shadow.boss;
    ctx.drawImage(s, Math.round(this.x - cx - s.width / 2), Math.round(this.y - cy - s.height / 2 + 2));
  }
}

export function spawnRocks(game, n, around = null, spread = 200, delay = 50) {
  const room = game.room;
  for (let i = 0; i < n; i++) {
    let x, y;
    if (around && i === 0) { x = around.x; y = around.y; }
    else {
      x = rand(48, room.tw * 16 - 48);
      y = rand(64, room.th * 16 - 56);
      if (around) {
        x = around.x + rand(-spread, spread);
        y = around.y + rand(-spread * 0.5, spread * 0.5);
        x = Math.max(40, Math.min(room.tw * 16 - 40, x));
        y = Math.max(56, Math.min(room.th * 16 - 48, y));
      }
    }
    game.addEntity(new FallingRock(game, x, y, { delay: delay + i * 6 }));
  }
}
