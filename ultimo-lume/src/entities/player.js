// The Wanderer: responsive 8-way movement, run, dash with i-frames, 3-hit combo,
// charged spin attack, abilities, potions, interaction and hazards.
import { Actor, drawFrame } from './entity.js';
import { SPR } from '../gfx/sprites/index.js';
import { P } from '../gfx/palette.js';
import { FX } from '../systems/particles.js';
import { moveEntity, boxBlocked } from '../systems/collision.js';
import { dirFromVector, dirFromAngle, dirAngle, DIR_VEC, rand } from '../core/math.js';
import { TILE_PROPS, T } from '../world/tiletypes.js';
import { useAbility, abilityCost, ABILITY_ORDER } from '../systems/abilities.js';

const COMBO = [
  { startup: 3, active: 5, recovery: 9, lunge: 1.6, dmg: 1, knock: 2.6, r: 22, span: 2.4, cw: true },
  { startup: 3, active: 5, recovery: 9, lunge: 1.6, dmg: 1, knock: 2.6, r: 22, span: 2.4, cw: false },
  { startup: 5, active: 6, recovery: 15, lunge: 2.6, dmg: 1.6, knock: 4.5, r: 26, span: 3.1, cw: true, heavy: true },
];

const WALK = 1.35;
const RUN = 2.05;
const DASH_COST = 22;
const DASH_FRAMES = 15;

export class Player extends Actor {
  constructor(game, x, y) {
    super(game, x, y);
    this.w = 10;
    this.h = 7;
    this.hurtW = 9;
    this.hurtH = 15;
    this.hurtOY = 6;
    this.team = 'player';
    this.moveMode = 'walk';
    this.shadow = 'm';
    this.dir = 'down';
    this.aim = Math.PI / 2;
    this.state = 'move';
    this.st = 0;
    this.stamina = this.prog.maxStamina;
    this.stamDelay = 0;
    this.stamFlash = 0;
    this.combo = 0;
    this.comboQueued = false;
    this.attackBuffer = 0;
    this.dodgeBuffer = 0;
    this.dodgeFrames = 0;
    this.charge = 0;
    this.chargeReady = false;
    this.animT = 0;
    this.moving = false;
    this.running = false;
    this.lastSafe = { x, y };
    this.after = [];
    this.pushT = 0;
    this.pushDir = null;
    this.locked = false;
    this.holdItem = null;
    this.scale = 1;
    this.stepT = 0;
    this.heartbeat = 0;
    this.bloodColors = [P.red, P.redD];
    this.scarf = Array.from({ length: 6 }, () => ({ x, y: y - 12 }));
    this.dashVX = 0;
    this.dashVY = 0;
    this.ready = true;
  }

  get prog() { return this.game.progress; }
  get hp() { return this.prog.hp; }
  // the base Actor constructor assigns a default hp: ignore writes until we're built
  set hp(v) { if (this.ready) this.prog.hp = v; }
  get maxHp() { return this.prog.maxHp; }
  set maxHp(v) {}

  get input() { return this.game.input; }

  setState(s) {
    this.state = s;
    this.st = 0;
  }

  // ---------------------------------------------------------------- update
  update() {
    this.tickTimers();
    const inp = this.input;
    const ctrl = !this.locked && this.game.controlsEnabled();
    if (ctrl && inp.pressed('attack')) this.attackBuffer = 9;
    if (ctrl && inp.pressed('dodge')) this.dodgeBuffer = 7;
    if (this.attackBuffer > 0) this.attackBuffer--;
    if (this.dodgeBuffer > 0) this.dodgeBuffer--;
    if (this.dodgeFrames > 0) this.dodgeFrames--;
    if (this.stamFlash > 0) this.stamFlash--;

    // stamina regen
    if (this.stamDelay > 0) this.stamDelay--;
    else if (this.stamina < this.prog.maxStamina) this.stamina = Math.min(this.prog.maxStamina, this.stamina + (this.state === 'move' ? 1.15 : 0.5));

    const before = this.state;
    const handler = this['s_' + this.state];
    if (handler) handler.call(this, inp, ctrl);
    if (this.state === before) this.st++;

    if (this.state !== 'dash' && this.state !== 'blink') this.physics();
    this.checkHazards();
    this.updateScarf();
    this.updateAfterimages();

    // low health heartbeat
    if (this.hp > 0 && this.hp <= 2 && this.state !== 'dead') {
      if (++this.heartbeat % 55 === 0) this.game.audio.play('lowHp');
    }
  }

  axis(inp, ctrl) {
    if (!ctrl) return { x: 0, y: 0 };
    let { x, y } = inp.axis;
    if (x && y) { x *= Math.SQRT1_2; y *= Math.SQRT1_2; }
    return { x, y };
  }

  aimFromInput(inp, ctrl) {
    const a = this.axis(inp, ctrl);
    if (a.x || a.y) this.aim = Math.atan2(a.y, a.x);
    else this.aim = dirAngle[this.dir];
    this.dir = dirFromAngle(this.aim);
  }

  surfaceSpeed() {
    const t = this.room.tileAtPx(this.x, this.y);
    return t === T.SHALLOW ? 0.72 : 1;
  }

  // ---------------------------------------------------------------- states
  s_move(inp, ctrl) {
    const a = this.axis(inp, ctrl);
    this.moving = !!(a.x || a.y);
    if (this.moving) {
      this.dir = dirFromVector(a.x, a.y, this.dir);
      this.aim = Math.atan2(a.y, a.x);
    }
    const wantRun = ctrl && inp.held('run') && this.moving && this.stamina > 1;
    this.running = wantRun;
    const speed = (wantRun ? RUN : WALK) * this.surfaceSpeed();
    const tx = a.x * speed, ty = a.y * speed;
    const acc = this.moving ? 0.32 : 0.4;
    this.vx += (tx - this.vx) * acc;
    this.vy += (ty - this.vy) * acc;
    if (Math.abs(this.vx) < 0.02) this.vx = 0;
    if (Math.abs(this.vy) < 0.02) this.vy = 0;
    const res = moveEntity(this, this.vx, this.vy, 'walk', 6);
    if (wantRun) {
      this.stamina -= 0.32;
      this.stamDelay = 30;
      if (this.stamina <= 0) { this.stamina = 0; this.stamFlash = 20; }
    }
    this.handlePush(a, res);
    this.animT += this.moving ? (wantRun ? 1.4 : 1) : 1;
    this.footsteps();
    if (this.moving && this.st % 8 === 0) this.recordSafe();
    else if (!this.moving && this.st % 20 === 0) this.recordSafe();

    if (!ctrl) return;
    if (this.attackBuffer > 0) return this.startAttack(0);
    if (this.dodgeBuffer > 0 && this.tryDash(a)) return;
    if (inp.pressed('ability')) return this.tryAbility(inp, ctrl);
    if (inp.pressed('potion')) return this.tryPotion();
    if (inp.pressed('interact')) this.game.tryInteract();
    if (inp.pressed('cycle')) this.cycleAbility();
  }

  handlePush(a, res) {
    const cardinal = (a.x === 0) !== (a.y === 0);
    const blocker = res.hitX && res.hitX.pushable ? res.hitX : res.hitY && res.hitY.pushable ? res.hitY : null;
    if (cardinal && blocker) {
      const d = dirFromVector(a.x, a.y);
      if (this.pushDir === d && this.pushTarget === blocker) this.pushT++;
      else { this.pushT = 0; this.pushDir = d; this.pushTarget = blocker; }
      if (this.pushT > 18) {
        blocker.push(d);
        this.pushT = 0;
      }
    } else {
      this.pushT = 0;
      this.pushTarget = null;
    }
  }

  footsteps() {
    if (!this.moving) return;
    const cycle = this.running ? 10 : 14;
    if (++this.stepT % cycle === 0) {
      const t = this.room.tileAtPx(this.x, this.y);
      const theme = this.room.theme;
      let surface = 'grass';
      if (t === T.SHALLOW) surface = 'water';
      else if (t === T.BRIDGE || (t === T.FLOOR2 && theme === 'mines')) surface = 'wood';
      else if (!(theme === 'village' || theme === 'forest') || t === T.FLOOR3) surface = 'stone';
      this.game.audio.play('step', { surface });
      if (surface === 'water') FX.dust(this.game.particles, this.x, this.y, 3, P.cyan);
      else if (this.running) FX.dust(this.game.particles, this.x, this.y + 2, 2, theme === 'village' || theme === 'forest' ? P.tan : P.gray);
    }
  }

  tryDash(a) {
    this.dodgeBuffer = 0;
    if (this.stamina < DASH_COST * 0.6) {
      this.stamFlash = 24;
      this.game.audio.play('uiError', { vol: 0.5 });
      return false;
    }
    this.stamina = Math.max(0, this.stamina - DASH_COST);
    this.stamDelay = 40;
    let dx = a ? a.x : 0, dy = a ? a.y : 0;
    if (!dx && !dy) { dx = DIR_VEC[this.dir].x; dy = DIR_VEC[this.dir].y; }
    const l = Math.hypot(dx, dy);
    this.dashVX = dx / l;
    this.dashVY = dy / l;
    this.dir = dirFromVector(dx, dy, this.dir);
    this.dodgeFrames = 12;
    this.setState('dash');
    this.cancelCharge();
    this.game.audio.play('dash');
    FX.dust(this.game.particles, this.x, this.y + 2, 6, P.silver);
    return true;
  }

  s_dash(inp, ctrl) {
    const t = this.st;
    const k = Math.pow(1 - t / DASH_FRAMES, 1.6);
    const sp = 0.9 + 4.2 * k;
    moveEntity(this, this.dashVX * sp, this.dashVY * sp, 'walk', 4);
    if (t % 2 === 0) this.after.push({ x: this.x, y: this.y, img: this.frame(), life: 10 });
    if (t % 3 === 0) FX.dust(this.game.particles, this.x, this.y + 2, 1, P.silver);
    this.animT++;
    if (ctrl && t >= 7 && this.attackBuffer > 0) {
      this.vx = this.dashVX * WALK;
      this.vy = this.dashVY * WALK;
      return this.startAttack(0, true);
    }
    if (t >= DASH_FRAMES) {
      this.vx = this.dashVX * WALK;
      this.vy = this.dashVY * WALK;
      this.setState('move');
    }
  }

  startAttack(step, dashAttack = false) {
    const inp = this.input;
    this.attackBuffer = 0;
    this.comboQueued = false;
    this.combo = step;
    this.aimFromInput(inp, this.game.controlsEnabled() && !this.locked);
    this.lunge = COMBO[step].lunge + (dashAttack ? 1.6 : 0);
    this.setState('attack');
  }

  s_attack(inp, ctrl) {
    const def = COMBO[this.combo];
    const t = this.st;
    const total = def.startup + def.active + def.recovery;
    if (t <= def.startup + def.active) {
      const k = 1 - t / (def.startup + def.active + 1);
      moveEntity(this, Math.cos(this.aim) * this.lunge * k, Math.sin(this.aim) * this.lunge * k, 'walk', 3);
    }
    if (t === def.startup) this.swing(def);
    if (ctrl && this.attackBuffer > 0 && t >= def.startup + 1 && this.combo < 2) {
      this.comboQueued = true;
      this.attackBuffer = 0;
    }
    if (t >= def.startup + def.active) {
      if (this.comboQueued) return this.startAttack(this.combo + 1);
      if (ctrl && this.dodgeBuffer > 0 && this.tryDash(this.axis(inp, ctrl))) return;
    }
    if (t >= total) {
      if (ctrl && this.prog.abilities.charge && this.combo === 0 && inp.held('attack') && inp.state.attack.heldFrames >= total - 1) {
        this.charge = 0;
        this.chargeReady = false;
        this.setState('charge');
        this.game.audio.play('charging', { vol: 0.6 });
        return;
      }
      this.vx = this.vy = 0;
      this.setState('move');
    }
  }

  swordDamage() {
    return 2 + (this.prog.swordLv - 1);
  }

  swing(def) {
    const g = this.game;
    const cx = this.x, cy = this.y - 7;
    g.combat.add({
      owner: this, team: 'player', shape: 'arc', x: cx, y: cy, r: def.r, angle: this.aim, span: def.span,
      damage: this.swordDamage() * def.dmg, knock: def.knock, life: def.active,
      flags: { sword: true, heavy: !!def.heavy, breaks: true },
      follow: (h) => { h.x = this.x; h.y = this.y - 7; },
      onHit: (e, r) => this.onSwordHit(e, r, def),
    });
    g.addSlash(this, this.aim, { cw: def.cw, rOut: def.r - 2, span: def.span, pal: def.heavy ? 'heavy' : 'player' });
    g.audio.play('swing', { combo: def.heavy ? 2 : 0 });
  }

  onSwordHit(e, r, def) {
    const g = this.game;
    if (r === 'block') {
      g.hitstop(5);
      this.kbx = -Math.cos(this.aim) * 2.2;
      this.kby = -Math.sin(this.aim) * 2.2;
      g.audio.play('clank');
      FX.sparks(g.particles, (this.x + e.x) / 2, (this.y + e.y) / 2 - 8, 8, [P.white, P.yellow]);
      return;
    }
    if (r !== 'hit') return;
    if (e.team === 'enemy' || e.isBoss) {
      g.hitstop(def.heavy ? 6 : 3);
      g.audio.play('hit', { heavy: def.heavy });
      if (def.heavy) g.camera.shake(0.32);
    }
  }

  s_charge(inp, ctrl) {
    const a = this.axis(inp, ctrl);
    moveEntity(this, a.x * 0.6, a.y * 0.6, 'walk', 4);
    this.moving = !!(a.x || a.y);
    this.animT += 0.5;
    this.charge++;
    const g = this.game;
    if (!this.chargeReady && this.charge % 4 === 0) {
      const ang = rand(0, Math.PI * 2);
      g.particles.spawn({ x: this.x + Math.cos(ang) * 16, y: this.y - 8 + Math.sin(ang) * 12, vx: -Math.cos(ang) * 0.9, vy: -Math.sin(ang) * 0.7, life: 16, color: P.yellow, drag: 1 });
    }
    if (!this.chargeReady && this.charge >= 38) {
      if (this.stamina >= 25) {
        this.chargeReady = true;
        this.flash = 4;
        g.audio.play('chargeReady');
        FX.sparks(g.particles, this.x, this.y - 10, 6, [P.white, P.yellow]);
      } else if (this.charge === 38) this.stamFlash = 24;
    }
    if (this.chargeReady && this.charge % 6 === 0) g.particles.spawn({ x: this.x + rand(-6, 6), y: this.y - rand(4, 16), vy: -0.5, life: 14, color: P.gold, drag: 1, glow: 3 });
    if (!ctrl || !inp.held('attack')) {
      if (this.chargeReady) return this.startSpin();
      this.cancelCharge();
      this.setState('move');
      return;
    }
    if (this.dodgeBuffer > 0 && this.tryDash(a)) return;
  }

  cancelCharge() {
    this.charge = 0;
    this.chargeReady = false;
  }

  startSpin() {
    const g = this.game;
    this.stamina = Math.max(0, this.stamina - 25);
    this.stamDelay = 45;
    this.cancelCharge();
    this.setState('spin');
    g.audio.play('spin');
    g.camera.shake(0.3);
    g.combat.add({
      owner: this, team: 'player', shape: 'circle', x: this.x, y: this.y - 6, r: 30,
      damage: this.swordDamage() * 2.5, knock: 5.5, life: 14,
      flags: { sword: true, heavy: true, spin: true, breaksGuard: true, breaks: true },
      follow: (h) => { h.x = this.x; h.y = this.y - 6; },
      onHit: (e, r) => this.onSwordHit(e, r, COMBO[2]),
    });
    for (let i = 0; i < 4; i++) {
      g.addSlash(this, this.aim + (i * Math.PI) / 2, { cw: true, rOut: 28, span: 2.2, pal: 'heavy', delay: i * 3 });
    }
  }

  s_spin() {
    const dirs = ['down', 'left', 'up', 'right'];
    this.dir = dirs[Math.floor(this.st / 3) % 4];
    if (this.st >= 20) {
      this.dir = dirFromAngle(this.aim);
      this.setState('move');
    }
  }

  tryAbility(inp, ctrl) {
    const id = this.prog.equipped;
    if (!id) {
      this.game.toast('Nessuna abilità equipaggiata', 60);
      this.game.audio.play('uiError');
      return;
    }
    const cost = abilityCost(id);
    if (cost.stamina && this.stamina < cost.stamina) { this.stamFlash = 24; this.game.audio.play('uiError'); return; }
    if (cost.ammo && (this.prog[cost.ammo] || 0) <= 0) {
      this.game.toast(cost.ammo === 'bombs' ? 'Niente bombe' : 'Niente frecce', 60);
      this.game.audio.play('uiError');
      return;
    }
    this.aimFromInput(inp, ctrl);
    this.useId = id;
    this.setState('use');
  }

  s_use() {
    const res = useAbility(this, this.useId, this.st);
    if (res === 'done') this.setState('move');
  }

  cycleAbility() {
    const owned = ABILITY_ORDER.filter((id) => this.prog.abilities[id]);
    if (!owned.length) return;
    const i = owned.indexOf(this.prog.equipped);
    this.prog.equipped = owned[(i + 1) % owned.length];
    this.game.audio.play('uiMove');
    this.game.hud.bumpAbility();
  }

  tryPotion() {
    const pr = this.prog;
    if (pr.potions <= 0) { this.game.toast('Nessuna pozione', 60); this.game.audio.play('uiError'); return; }
    if (pr.hp >= pr.maxHp) { this.game.toast('Salute già al massimo', 60); this.game.audio.play('uiError'); return; }
    this.setState('drink');
    this.game.audio.play('potion');
  }

  s_drink(inp, ctrl) {
    const a = this.axis(inp, ctrl);
    moveEntity(this, a.x * 0.35, a.y * 0.35, 'walk', 4);
    if (this.st === 26) {
      const pr = this.prog;
      pr.potions--;
      pr.hp = Math.min(pr.maxHp, pr.hp + 6);
      this.game.audio.play('heal');
      this.game.particles.burst(this.x, this.y - 10, 12, { speed: 1.2, life: 30, colors: [P.salmon, P.red, P.white], vz: 0, drag: 0.95, glow: 4 });
      this.game.hud.pulseHearts();
    }
    if (this.st >= 36) this.setState('move');
  }

  s_hurt() {
    if (this.st >= 14) this.setState('move');
  }

  s_blink() {
    if (this.st >= 8) this.setState('move');
  }

  s_hold() {
    // item presentation, released by the game script
  }

  s_locked() {}

  s_sleep() {
    if (this.t % 50 === 0) this.game.particles.spawn({ x: this.x + 6, y: this.y - 10, vx: 0.2, vy: -0.3, life: 50, color: '#c0cbdc', drag: 1 });
  }

  s_rise() {}

  s_fall() {
    this.scale = Math.max(0, 1 - this.st / 26);
    if (this.st === 28) {
      this.scale = 1;
      this.x = this.lastSafe.x;
      this.y = this.lastSafe.y;
      this.vx = this.vy = 0;
      this.kbx = this.kby = 0;
      const dmg = 2;
      this.prog.hp -= dmg;
      this.game.hud.pulseHearts();
      this.invuln = 60;
      if (this.prog.hp <= 0) { this.prog.hp = 0; this.die(); return; }
      this.game.audio.play('hurt');
      this.setState('move');
    }
  }

  s_dead() {
    if (this.st === 70) this.game.onPlayerDeath();
  }

  // ---------------------------------------------------------------- damage
  takeHit(hit) {
    if (this.state === 'dead' || this.state === 'fall' || this.state === 'hold' || this.game.cutscene) return null;
    if (this.invuln > 0 || this.dodgeFrames > 0) return null;
    const g = this.game;
    this.prog.hp -= hit.damage;
    this.flash = 10;
    this.invuln = 70;
    this.applyKnockback(hit, 1.3);
    this.cancelCharge();
    g.hitstop(6);
    g.camera.shake(0.45);
    g.audio.play('hurt');
    g.flashScreen(P.red, 0.18);
    g.hud.pulseHearts();
    FX.sparks(g.particles, this.x, this.y - 8, 6, [P.white, P.red]);
    if (this.prog.hp <= 0) {
      this.prog.hp = 0;
      this.die();
    } else {
      this.setState('hurt');
      g.hints.show('potion');
    }
    return 'hit';
  }

  die() {
    if (this.state === 'dead') return;
    this.setState('dead');
    this.vx = this.vy = 0;
    this.game.audio.stopMusic(0.5);
    this.game.audio.play('death');
    this.game.camera.shake(0.5);
  }

  // ---------------------------------------------------------------- hazards
  checkHazards() {
    if (['fall', 'dead', 'blink', 'hold', 'locked', 'sleep', 'rise'].includes(this.state) || this.game.cutscene) return;
    const t = this.room.tileAtPx(this.x, this.y);
    const p = TILE_PROPS[t];
    if (p.pit || p.lava) {
      this.setState('fall');
      this.cancelCharge();
      this.game.audio.play(p.lava ? 'sizzle' : 'fall');
      if (p.lava) this.game.particles.burst(this.x, this.y, 14, { speed: 1.5, life: 30, colors: [P.orange, P.yellow, P.rust], vz: 2, g: 0.1, glow: 5 });
    }
  }

  recordSafe() {
    const r = this.room;
    const pts = [[-6, -5], [6, -5], [-6, 5], [6, 5]];
    for (const [ox, oy] of pts) {
      const p = TILE_PROPS[r.tileAtPx(this.x + ox, this.y + oy)];
      if (p.pit || p.lava || p.solid) return;
    }
    if (boxBlocked(r, this.x, this.y, this.w, this.h, 'walk', this)) return;
    this.lastSafe = { x: this.x, y: this.y };
  }

  // ---------------------------------------------------------------- visuals
  updateScarf() {
    const bob = this.frameBob();
    const back = DIR_VEC[this.dir];
    const s = this.scarf;
    s[0].x = this.x - back.x * 2;
    s[0].y = this.y - 13 + bob;
    const wind = Math.sin(this.t * 0.12) * 0.25;
    for (let i = 1; i < s.length; i++) {
      const p = s[i], q = s[i - 1];
      p.x += (-this.vx * 0.5 - back.x * 0.4 + wind) * 0.5;
      p.y += 0.35 - (this.running ? 0.2 : 0);
      const dx = p.x - q.x, dy = p.y - q.y;
      const d = Math.hypot(dx, dy) || 1;
      const L = 2.2;
      p.x = q.x + (dx / d) * L;
      p.y = q.y + (dy / d) * L;
    }
  }

  frameBob() {
    if (this.state === 'move' && this.moving) {
      const f = Math.floor(this.animT / (this.running ? 5 : 7)) % 4;
      return f % 2 === 1 ? -1 : 0;
    }
    return 0;
  }

  updateAfterimages() {
    for (let i = this.after.length - 1; i >= 0; i--) if (--this.after[i].life <= 0) this.after.splice(i, 1);
  }

  frame() {
    const S = SPR.player[this.dir];
    switch (this.state) {
      case 'move':
        if (this.moving) return S.walk[Math.floor(this.animT / (this.running ? 5 : 7)) % 4];
        return S.idle[Math.floor(this.animT / 30) % 2];
      case 'attack': return this.st < COMBO[this.combo].startup ? S.attack[0] : S.attack[1];
      case 'charge': return this.moving ? S.walk[Math.floor(this.animT / 8) % 4] : S.attack[0];
      case 'spin': return S.attack[1];
      case 'dash': return S.dash[0];
      case 'hurt': return S.hurt[0];
      case 'drink': return S.drink[0];
      case 'use': return S.cast[0];
      case 'hold': return SPR.player.down.hold[0];
      case 'dead': return this.st < 30 ? SPR.player.down.kneel[0] : SPR.player.lying;
      case 'sleep': return SPR.player.lying;
      case 'rise': return this.st < 26 ? SPR.player.down.kneel[0] : SPR.player.down.idle[0];
      default: return S.idle[0];
    }
  }

  drawScarf(ctx, cx, cy) {
    const s = this.scarf;
    for (let i = 1; i < s.length; i++) {
      ctx.fillStyle = i < 3 ? P.red : P.redD;
      const x = Math.round(s[i].x - cx), y = Math.round(s[i].y - cy);
      ctx.fillRect(x, y, i < 4 ? 2 : 1, i < 3 ? 2 : 1);
    }
  }

  drawSword(ctx, cx, cy) {
    let len = 0, a = this.aim;
    if (this.state === 'attack') {
      const def = COMBO[this.combo];
      const t = this.st;
      const sw = def.span / 2;
      if (t < def.startup) { len = 9; a = this.aim + (def.cw ? -sw : sw) * 0.9; }
      else if (t < def.startup + def.active + 3) {
        const k = Math.min(1, (t - def.startup) / (def.active - 1));
        len = 12;
        a = this.aim + (def.cw ? -sw + sw * 2 * k : sw - sw * 2 * k);
      } else { len = 10; a = this.aim + (def.cw ? sw : -sw) * 0.8; }
    } else if (this.state === 'charge') { len = 10; a = this.aim + Math.PI * 0.75; }
    else if (this.state === 'spin') { len = 13; a = this.aim + (this.st / 20) * Math.PI * 2; }
    else return;
    const ox = this.x - cx, oy = this.y - 8 - cy;
    const glow = this.state === 'charge' && this.chargeReady && (this.t >> 2) % 2 === 0;
    for (let i = 3; i <= len; i++) {
      const x = Math.round(ox + Math.cos(a) * i), y = Math.round(oy + Math.sin(a) * i);
      ctx.fillStyle = i >= len - 1 ? P.white : glow ? P.yellow : P.silver;
      ctx.fillRect(x, y, 1, 1);
      if (i < len - 1) { ctx.fillStyle = glow ? P.gold : P.gray; ctx.fillRect(x + (Math.abs(Math.sin(a)) > 0.7 ? 1 : 0), y + (Math.abs(Math.sin(a)) > 0.7 ? 0 : 1), 1, 1); }
    }
    ctx.fillStyle = P.gold;
    ctx.fillRect(Math.round(ox + Math.cos(a) * 3) - 1, Math.round(oy + Math.sin(a) * 3) - 1, 2, 2);
  }

  draw(ctx, cx, cy) {
    for (const a of this.after) drawFrame(ctx, a.img, a.x, a.y + 2, cx, cy, { alpha: a.life / 18, ay: 21 });
    if (this.state === 'blink' && this.st < 4) return;
    const blinkHide = this.invuln > 0 && this.state !== 'dead' && (this.invuln >> 2) % 2 === 0;
    const img = this.frame();
    const swordBehind = this.state !== 'spin' && this.dir === 'up';
    if (this.dir !== 'up') this.drawScarf(ctx, cx, cy);
    if (swordBehind) this.drawSword(ctx, cx, cy);
    if (this.state === 'fall') {
      const s = this.scale;
      const w = img.width * s, h = img.height * s;
      if (s > 0.05) ctx.drawImage(img, Math.round(this.x - cx - w / 2), Math.round(this.y - cy - h + 2), Math.round(w), Math.round(h));
    } else if ((this.state === 'dead' && this.st >= 30) || this.state === 'sleep') {
      drawFrame(ctx, img, this.x, this.y + 4, cx, cy);
    } else if (!blinkHide) {
      drawFrame(ctx, img, this.x, this.y + 2, cx, cy, { flash: this.flash > 0 && this.flash % 4 < 2, ay: 21 });
    }
    if (this.dir === 'up' && !blinkHide) this.drawScarf(ctx, cx, cy);
    if (!swordBehind) this.drawSword(ctx, cx, cy);
    if (this.state === 'hold' && this.holdItem) {
      ctx.drawImage(this.holdItem, Math.round(this.x - cx - this.holdItem.width / 2), Math.round(this.y - cy - 34));
    }
  }

  lights(out, cx, cy) {
    const lantern = this.prog.abilities.lantern;
    out.push({ x: this.x - cx, y: this.y - 8 - cy, r: lantern ? 84 : 44, i: 1, color: lantern ? P.gold : null });
    if (this.chargeReady) out.push({ x: this.x - cx, y: this.y - 8 - cy, r: 24, i: 0.8, color: P.yellow });
  }

  drawShadow(ctx, cx, cy) {
    if (this.state === 'fall' || this.state === 'sleep' || (this.state === 'dead' && this.st >= 30)) return;
    super.drawShadow(ctx, cx, cy);
  }
}
