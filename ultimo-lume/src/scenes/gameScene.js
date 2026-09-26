// The gameplay scene: owns the current room, player, systems and UI overlays.
import { W, H, CELL_PX_W, CELL_PX_H, DEBUG } from '../core/constants.js';
import { P } from '../gfx/palette.js';
import { font } from '../gfx/font.js';
import { SPR } from '../gfx/sprites/index.js';
import { slashArc } from '../gfx/sprites/fx.js';
import { bayer } from '../core/math.js';
import { World } from '../world/world.js';
import { Room } from '../world/room.js';
import { drawAnimatedTiles } from '../world/roomRender.js';
import { T } from '../world/tiletypes.js';
import { Player } from '../entities/player.js';
import { Camera } from '../systems/camera.js';
import { Particles } from '../systems/particles.js';
import { Combat } from '../systems/combat.js';
import { Lighting } from '../systems/lighting.js';
import { Ambient } from '../systems/ambient.js';
import { applyItem, isBigItem, PRESENTED } from '../systems/inventory.js';
import { saveSlot } from '../systems/save.js';
import { Hud } from '../ui/hud.js';
import { Dialogue } from '../ui/dialogue.js';
import { PauseMenu } from '../ui/pause.js';
import { ShopMenu } from '../ui/shop.js';
import { Hints } from '../ui/hints.js';
import { ITEMS } from '../data/items.js';
import { REGIONS } from '../data/regions.js';
import { NPCS } from '../data/npcs.js';
import { ROOMS, START } from '../data/world/index.js';
import { EVENTS } from '../data/events.js';

const FX_FRAMES = { star: [2, 3], smoke: [4, 5], explosion: [6, 4], sparkle: [3, 4] };

export class GameScene {
  constructor(app, slot, progress, opts = {}) {
    this.app = app;
    this.input = app.input;
    this.audio = app.audio;
    this.slot = slot;
    this.progress = progress;
    this.world = new World(ROOMS);
    this.camera = new Camera();
    this.particles = new Particles();
    this.combat = new Combat(this);
    this.lighting = new Lighting();
    this.hud = new Hud(this);
    this.dialogue = new Dialogue(this);
    this.pause = new PauseMenu(this);
    this.shop = new ShopMenu(this);
    this.hints = new Hints(this);
    this.ambient = new Ambient(this);
    this.scripts = [];
    this.effects = [];
    this.tempLights = [];
    this.time = 0;
    this.freeze = 0;
    this.flash = null;
    this.transition = null;
    this.cutscene = false;
    this.gameOver = null;
    this.interactTarget = null;
    this.region = null;
    this.lastSave = -9999;
    this.applyShake();

    const pos = progress.pos || START;
    this.player = new Player(this, pos.x, pos.y);
    if (pos.dir) this.player.dir = pos.dir;
    this.enterRoom(pos.room, pos.x, pos.y, { initial: true });
    this.transition = { t: 0, phase: 'in', dur: 30 };
    if (opts.newGame) this.runEvent('intro');
  }

  applyShake() {
    this.camera.shakeScale = [0, 0.45, 1][this.app.settings.shake];
  }

  // ------------------------------------------------------------ room management
  enterRoom(id, x, y, opts = {}) {
    const def = this.world.get(id);
    if (!def) throw new Error('Unknown room ' + id);
    this.room = new Room(this, def);
    this.player.x = x;
    this.player.y = y;
    this.player.lastSafe = { x, y };
    this.player.kbx = this.player.kby = 0;
    this.player.after = [];
    this.player.scarf.forEach((p) => { p.x = x; p.y = y - 12; });
    this.combat.clear();
    this.particles.clear();
    this.effects = [];
    this.tempLights = [];
    this.room.spawnAll();
    this.arenaActive = false;
    this.camera.snap(x, y, this.room);
    this.progress.visited[id] = true;
    this.entry = { room: id, x, y, dir: this.player.dir };
    this.bossActive = null;
    this.hud.setBoss(null);
    this.audio.setIntensity(0);
    // lava glow points
    this.lavaLights = [];
    for (let ty = 0; ty < this.room.th; ty += 2) for (let tx = 0; tx < this.room.tw; tx += 2) {
      if (this.room.tileAt(tx, ty) === T.LAVA) this.lavaLights.push({ x: tx * 16 + 16, y: ty * 16 + 16 });
    }
    if (def.region !== this.region) {
      const first = !this.progress.flags['region.' + def.region];
      this.progress.flags['region.' + def.region] = true;
      this.region = def.region;
      const reg = REGIONS[def.region];
      if (!opts.initial || first) this.hud.showBanner(reg.name, reg.sub);
      if (def.region === 'forest') this.hints.show('menu', 240);
    }
    const music = def.music !== undefined ? def.music : REGIONS[def.region].music;
    if (def.boss && !this.progress.flags['boss:' + def.boss]) this.audio.stopMusic(1.2);
    else if (music) this.audio.playMusic(music, 1.2);
    else this.audio.stopMusic(1.2);
    if (def.onEnter && EVENTS[def.onEnter]) this.runEvent(def.onEnter);
    if (!opts.noSave) this.autosave(opts.initial ? 0 : 600);
  }

  // Leave through an opening in the room border.
  checkExits() {
    const pl = this.player;
    const r = this.room;
    const out = pl.x < 0 || pl.y < 0 || pl.x >= r.tw * 16 || pl.y >= r.th * 16;
    if (!out || pl.state === 'dead') return;
    const wx = r.px + pl.x, wy = r.py + pl.y;
    const def = this.world.roomAtPx(wx, wy);
    if (!def) {
      pl.x = Math.max(4, Math.min(r.tw * 16 - 4, pl.x));
      pl.y = Math.max(4, Math.min(r.th * 16 - 4, pl.y));
      return;
    }
    let lx = wx - def.gx * CELL_PX_W, ly = wy - def.gy * CELL_PX_H;
    if (pl.x < 0) lx -= 8;
    if (pl.x >= r.tw * 16) lx += 8;
    if (pl.y < 0) ly -= 10;
    if (pl.y >= r.th * 16) ly += 10;
    const dir = pl.dir;
    this.startTransition(() => {
      this.enterRoom(def.id, lx, ly);
      this.player.dir = dir;
    });
  }

  warpTo(roomId, warpId, dir) {
    this.startTransition(() => {
      // enter first at a temporary spot, then move to the linked warp
      this.enterRoom(roomId, 16, 16, { noSave: true });
      const w = this.room.entities.find((e) => e.o && e.o.id === warpId);
      const pl = this.player;
      if (w) {
        const d = w.o.exit || dir || 'down';
        const off = { down: [0, w.h / 2 + 10], up: [0, -w.h / 2 - 6], left: [-w.w / 2 - 8, 0], right: [w.w / 2 + 8, 0] }[d];
        pl.x = w.x + off[0];
        pl.y = w.y + off[1];
        pl.dir = d;
        w.armed = false;
      } else if (this.room.spawnPoints.start) {
        pl.x = this.room.spawnPoints.start.x;
        pl.y = this.room.spawnPoints.start.y;
      }
      pl.lastSafe = { x: pl.x, y: pl.y };
      pl.scarf.forEach((p) => { p.x = pl.x; p.y = pl.y - 12; });
      this.camera.snap(pl.x, pl.y, this.room);
      this.entry = { room: roomId, x: pl.x, y: pl.y, dir: pl.dir };
      this.autosave(600);
    });
  }

  startTransition(fn, dur = 12) {
    if (this.transition) return;
    this.transition = { t: 0, phase: 'out', dur, fn };
  }

  updateTransition() {
    const tr = this.transition;
    tr.t++;
    if (tr.phase === 'out' && tr.t >= tr.dur) {
      if (tr.fn) tr.fn();
      tr.phase = 'in';
      tr.t = 0;
    } else if (tr.phase === 'in' && tr.t >= tr.dur) {
      this.transition = null;
    }
  }

  drawTransition(ctx) {
    const tr = this.transition;
    if (!tr) return;
    const k = tr.phase === 'out' ? tr.t / tr.dur : 1 - tr.t / tr.dur;
    if (k <= 0) return;
    if (k >= 1) { ctx.fillStyle = P.void; ctx.fillRect(0, 0, W, H); return; }
    // dithered fade in 4px blocks for a retro wipe
    ctx.fillStyle = P.void;
    for (let y = 0; y < H; y += 4) for (let x = 0; x < W; x += 4) {
      if (bayer(x >> 2, y >> 2) < k) ctx.fillRect(x, y, 4, 4);
    }
  }

  // ------------------------------------------------------------ helpers used by entities
  controlsEnabled() {
    return !this.cutscene && !this.dialogue.active && !this.pause.active && !this.shop.active && !this.transition && !this.gameOver;
  }

  hitstop(n) { this.freeze = Math.max(this.freeze, n); }
  flashScreen(color, a = 0.2) { this.flash = { color, a }; }
  spawnFx(kind, x, y) { this.effects.push({ kind, x, y, t: 0 }); }
  addSlash(owner, angle, opts = {}) { this.effects.push({ kind: 'slash', owner, angle, opts, t: -(opts.delay || 0) }); }
  addLight(x, y, r, life, color) { this.tempLights.push({ x, y, r, life, max: life, color }); }
  addEntity(e) { this.room.entities.push(e); if (e.init && !e._inited) { e._inited = true; } return e; }
  toast(text, frames = 120) { this.hud.toast(text, frames); }
  onEnemyKilled() { this.progress.stats.kills = (this.progress.stats.kills || 0) + 1; }

  // ------------------------------------------------------------ scripts & dialogue
  runScript(genFn, ...args) {
    const gen = genFn(this, ...args);
    const s = { gen, wait: null };
    this.scripts.push(s);
    this.stepScript(s);
    return s;
  }

  runEvent(name, ...args) {
    const ev = EVENTS[name];
    if (ev) this.runScript(ev, ...args);
  }

  stepScript(s) {
    for (let guard = 0; guard < 50; guard++) {
      if (s.wait != null) {
        if (typeof s.wait === 'number') { if (s.wait-- > 0) return; }
        else if (typeof s.wait === 'function') { if (!s.wait()) return; }
        s.wait = null;
      }
      const r = s.gen.next(this.lastResult);
      if (r.done) { s.done = true; return; }
      s.wait = r.value ?? null;
      if (s.wait === null) continue;
    }
  }

  updateScripts() {
    for (const s of this.scripts) if (!s.done) this.stepScript(s);
    this.scripts = this.scripts.filter((s) => !s.done);
  }

  dialog(lines, opts = {}) {
    this.dialogue.open(lines, {
      ...opts,
      onClose: (r) => { this.lastResult = r; if (opts.onClose) opts.onClose(r); },
    });
    return () => !this.dialogue.active;
  }

  say(speaker, lines) {
    return this.dialog(lines.map((text) => ({ speaker, text })));
  }

  ask(speaker, text, options) {
    return this.dialog([{ speaker, text }], { choice: { options } });
  }

  talkTo(npc) {
    const data = NPCS[npc.id];
    if (!data || !data.talk) return;
    npc.talking = true;
    this.cutscene = true;
    const self = this;
    this.runScript(function* (g) {
      yield* data.talk(g, npc);
      npc.talking = false;
      self.cutscene = false;
    });
  }

  openShop(id) { this.shop.open('shop', id); return () => !this.shop.active; }
  openForge() { this.shop.open('forge'); return () => !this.shop.active; }

  // ------------------------------------------------------------ items
  giveItem(id, count = 1, opts = {}) {
    const extra = applyItem(this, id, count);
    const def = ITEMS[id] || { name: id };
    if (id === 'coin') { this.audio.play('coin'); return null; }
    if (id === 'heart') { this.audio.play('heart'); this.hud.pulseHearts(); return null; }
    if (opts.silent || !opts.present || !PRESENTED.has(id)) {
      this.audio.play(id === 'potion' || id === 'bombAmmo' || id === 'arrowAmmo' ? 'pickup' : 'item');
      this.toast(`${def.name}${count > 1 ? ' x' + count : ''}`, 90);
      if (extra) this.toast(extra, 150);
      if (!opts.silent && PRESENTED.has(id)) this.autosave(0);
      return null;
    }
    const pl = this.player;
    const prevCutscene = this.cutscene;
    pl.setState('hold');
    pl.holdItem = SPR.items[def.icon];
    this.cutscene = true;
    this.audio.play(isBigItem(id) ? 'bigItem' : 'item');
    this.particles.burst(pl.x, pl.y - 30, 16, { speed: 1.4, life: 36, colors: [P.yellow, P.white, P.gold], drag: 0.94, glow: 4 });
    const lines = [{ text: `Hai ottenuto: {${def.name}}!` }];
    if (def.desc) lines.push({ text: def.desc });
    if (extra) lines.push({ text: extra });
    this.dialog(lines, {
      onClose: () => {
        pl.setState('move');
        pl.holdItem = null;
        this.cutscene = prevCutscene;
      },
    });
    this.autosave(0);
    return () => !this.dialogue.active;
  }

  // ------------------------------------------------------------ interaction
  findInteractTarget() {
    const pl = this.player;
    let best = null, bd = 1e9;
    const fx = Math.cos(pl.aim), fy = Math.sin(pl.aim);
    for (const e of this.room.entities) {
      if (!e.interactable || e.dead) continue;
      const dx = e.x - pl.x, dy = e.y - pl.y;
      const d = Math.hypot(dx, dy);
      const reach = e.interactRange + (e.w || 0) / 2;
      if (d > reach) continue;
      const facing = d < 12 ? 1 : (dx * fx + dy * fy) / d;
      if (facing < -0.3) continue;
      const score = d - facing * 8;
      if (score < bd) { bd = score; best = e; }
    }
    return best;
  }

  tryInteract() {
    const t = this.interactTarget;
    if (!t) return;
    this.audio.play('uiMove', { vol: 0.5 });
    t.onInteract(this.player);
  }

  // ------------------------------------------------------------ checkpoints, death, saving
  restAtBrazier(b) {
    const pr = this.progress;
    const first = !pr.flags['brazier:' + this.room.id];
    pr.flags['brazier:' + this.room.id] = true;
    pr.checkpoint = { room: this.room.id, x: b.x, y: b.y + 18 };
    this.audio.play('checkpoint');
    this.cutscene = true;
    const pl = this.player;
    pl.setState('locked');
    this.runScript(function* (g) {
      yield 30;
      g.startTransition(() => {
        pr.hp = pr.maxHp;
        pr.potions = pr.potionMax;
        pl.stamina = pr.maxStamina;
        // reload the room: enemies and breakables come back
        g.enterRoom(g.room.id, b.x, b.y + 18, { noSave: true });
        g.player.dir = 'up';
      }, 24);
      yield () => !g.transition;
      g.player.setState('move');
      g.cutscene = false;
      g.toast(first ? 'Braciere acceso. Il cammino è stato salvato.' : 'Hai riposato. Salute e pozioni ripristinate.', 150);
      g.autosave(0);
    });
  }

  autosave(minGap = 600) {
    if (this.time - this.lastSave < minGap && minGap > 0) return;
    if (this.player.state === 'dead') return;
    this.lastSave = this.time;
    const pr = this.progress;
    pr.pos = { ...this.entry };
    saveSlot(this.slot, pr);
    this.hud.showSaving();
  }

  onPlayerDeath() {
    this.progress.deaths++;
    this.gameOver = { t: 0 };
  }

  respawn() {
    const pr = this.progress;
    pr.hp = pr.maxHp;
    pr.potions = pr.potionMax;
    const cp = pr.checkpoint || this.startPos();
    this.gameOver = null;
    this.startTransition(() => {
      this.player = new Player(this, cp.x, cp.y);
      this.player.dir = 'down';
      this.cutscene = false;
      this.scripts = [];
      this.region = null;
      this.enterRoom(cp.room, cp.x, cp.y, { noSave: true });
      this.player.invuln = 60;
      saveSlot(this.slot, Object.assign(pr, { pos: { ...this.entry } }));
    }, 20);
  }

  startPos() {
    return this.progress.checkpoint || { room: START.room, x: START.x, y: START.y };
  }

  quitToTitle() {
    this.pause.active = false;
    this.autosave(0);
    this.app.toTitle();
  }

  // ------------------------------------------------------------ arenas
  updateArena() {
    const def = this.room.def;
    if (!def.arena) return;
    const flags = this.progress.flags;
    const gate = def.arena.gate;
    const alive = this.room.entities.some((e) => e.isEnemy && !e.dead);
    if (!this.arenaActive && !flags['clear:' + this.room.id]) {
      const pl = this.player;
      const m = 40;
      if (alive && pl.x > m && pl.y > m && pl.x < this.room.tw * 16 - m && pl.y < this.room.th * 16 - m) {
        this.arenaActive = true;
        this.room.emit(gate, false, false);
        this.audio.play('gate');
        this.audio.setIntensity(1);
      }
    } else if (this.arenaActive && !alive) {
      this.arenaActive = false;
      flags['clear:' + this.room.id] = true;
      this.room.emit(gate, true, true);
      this.audio.play('secret');
      this.audio.setIntensity(0);
      if (def.arena.reward) this.room.emit(def.arena.reward, true, true);
    }
  }

  // ------------------------------------------------------------ update
  update() {
    this.audio.listener = this.player;
    this.audio.update();
    if (this.gameOver) return this.updateGameOver();
    if (this.transition) { this.updateTransition(); if (this.transition && this.transition.phase === 'out') return; }
    this.hud.update();
    this.hints.update();
    if (this.pause.active) { this.pause.update(); return; }
    if (this.shop.active) { this.shop.update(); return; }
    if (this.dialogue.active) this.dialogue.update();
    this.updateScripts();
    if (this.dialogue.active || this.shop.active) return;
    if (this.freeze > 0) { this.freeze--; this.camera.update(); return; }

    this.time++;
    this.progress.playTime++;
    const inp = this.input;
    if (this.controlsEnabled()) {
      if (inp.pressed('pause')) return this.pause.open(0);
      if (inp.pressed('map')) return this.pause.open(2, true);
      if (inp.pressed('inventory')) return this.pause.open(0, true);
    }
    if (DEBUG) this.debugKeys();

    this.player.update();
    const ents = this.room.entities;
    for (let i = 0; i < ents.length; i++) {
      const e = ents[i];
      if (!e.dead) e.update();
    }
    this.room.refreshLists();
    this.combat.update();
    this.room.entities = ents.filter((e) => !e.dead);
    this.room.refreshLists();
    this.room.tick();
    this.particles.update();
    for (const fx of this.effects) fx.t++;
    this.effects = this.effects.filter((fx) => fx.t < this.fxLife(fx));
    for (const l of this.tempLights) l.life--;
    this.tempLights = this.tempLights.filter((l) => l.life > 0);
    this.ambient.update();
    this.updateArena();
    this.interactTarget = this.controlsEnabled() && this.player.state === 'move' ? this.findInteractTarget() : null;
    const pl = this.player;
    let fx = pl.x, fy = pl.y - 8;
    const boss = this.bossActive;
    if (boss && !boss.dead && !boss.gone && this.hud.boss) {
      // keep big bosses in frame: bias the camera towards them
      fx += (boss.x - fx) * 0.35;
      fy += (boss.y - 30 - fy) * 0.3;
    }
    this.camera.follow(fx, fy, this.room, pl.moving ? Math.cos(pl.aim) : 0, pl.moving ? Math.sin(pl.aim) : 0);
    this.camera.update();
    if (this.flash) { this.flash.a -= 0.02; if (this.flash.a <= 0) this.flash = null; }
    if (!this.transition && this.controlsEnabled()) this.checkExits();
  }

  fxLife(fx) {
    if (fx.kind === 'slash') return 9;
    const f = FX_FRAMES[fx.kind];
    return f ? f[0] * f[1] : 20;
  }

  updateGameOver() {
    const go = this.gameOver;
    go.t++;
    if (go.t > 90 && (this.input.pressed('confirm') || this.input.pressed('attack'))) {
      this.audio.play('uiSelect');
      this.respawn();
    }
  }

  debugKeys() {
    const inp = this.input;
    if (inp.keys.has('Digit0')) {
      const pr = this.progress;
      pr.hp = pr.maxHp;
    }
  }

  // ------------------------------------------------------------ render
  render(ctx) {
    const cx = this.camera.rx, cy = this.camera.ry;
    ctx.fillStyle = P.void;
    ctx.fillRect(0, 0, W, H);
    const room = this.room;
    const sx = Math.max(0, cx), sy = Math.max(0, cy);
    const sw = Math.min(W - (sx - cx), room.canvas.width - sx), sh = Math.min(H - (sy - cy), room.canvas.height - sy);
    if (sw > 0 && sh > 0) ctx.drawImage(room.canvas, sx, sy, sw, sh, sx - cx, sy - cy, sw, sh);
    drawAnimatedTiles(ctx, room, cx, cy, W, H, this.time);
    if (sw > 0 && sh > 0) ctx.drawImage(room.overlay, sx, sy, sw, sh, sx - cx, sy - cy, sw, sh);

    const ents = room.entities;
    for (const e of ents) if (e.layer === 'floor') e.draw(ctx, cx, cy);
    this.particles.draw(ctx, cx, cy, 'floor');
    for (const e of ents) if (e.layer === 'main') e.drawShadow(ctx, cx, cy);
    this.player.drawShadow(ctx, cx, cy);
    const sorted = ents.filter((e) => e.layer === 'main');
    sorted.push(this.player);
    sorted.sort((a, b) => a.sortY - b.sortY);
    for (const e of sorted) e.draw(ctx, cx, cy);
    this.drawEffects(ctx, cx, cy);
    for (const e of ents) if (e.layer === 'top') { e.drawShadow(ctx, cx, cy); e.draw(ctx, cx, cy); }
    this.particles.draw(ctx, cx, cy, 'top');
    if (DEBUG && this.input.keys.has('KeyH')) this.combat.draw(ctx, cx, cy);

    this.renderLighting(ctx, cx, cy);
    this.ambient.drawOverlay(ctx);
    if (this.flash) {
      ctx.globalAlpha = Math.max(0, this.flash.a);
      ctx.fillStyle = this.flash.color;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
    if (this.letterbox) {
      ctx.fillStyle = P.void;
      ctx.fillRect(0, 0, W, Math.round(this.letterbox));
      ctx.fillRect(0, H - Math.round(this.letterbox), W, Math.round(this.letterbox));
    }
    this.hud.draw(ctx);
    this.hints.draw(ctx);
    this.dialogue.draw(ctx);
    this.shop.draw(ctx);
    this.pause.draw(ctx);
    if (this.gameOver) this.drawGameOver(ctx);
    this.drawTransition(ctx);
  }

  renderLighting(ctx, cx, cy) {
    const def = this.room.def;
    let dark = def.dark ?? REGIONS[this.room.region].dark;
    if (dark <= 0.01) return;
    if (def.needsLantern && !this.progress.abilities.lantern) dark = Math.max(dark, 0.97);
    dark = Math.max(0, dark - this.ambient.lightningBoost());
    if (this.bossActive && this.bossActive.darkness != null) dark = this.bossActive.darkness;
    const lights = [];
    this.player.lights(lights, cx, cy);
    for (const e of this.room.entities) e.lights(lights, cx, cy);
    this.particles.lights(lights, cx, cy);
    for (const l of this.tempLights) lights.push({ x: l.x - cx, y: l.y - cy, r: l.r * (0.5 + (l.life / l.max) * 0.5), i: l.life / l.max, color: l.color });
    for (const l of this.lavaLights) {
      const x = l.x - cx, y = l.y - cy;
      if (x > -60 && y > -60 && x < W + 60 && y < H + 60) lights.push({ x, y, r: 44 + Math.sin(this.time * 0.05 + l.x) * 4, i: 0.85, color: P.orange });
    }
    if (def.lights) for (const l of def.lights) lights.push({ x: l.x - cx, y: l.y - cy, r: l.r, i: l.i ?? 1, color: l.color });
    this.lighting.render(ctx, dark, def.tint || REGIONS[this.room.region].tint, lights);
  }

  drawEffects(ctx, cx, cy) {
    for (const fx of this.effects) {
      if (fx.t < 0) continue;
      if (fx.kind === 'slash') {
        const o = fx.owner;
        const f = Math.min(2, Math.floor(fx.t / 3));
        const img = slashArc(fx.angle, f, fx.opts);
        ctx.drawImage(img, Math.round(o.x - cx - img.width / 2), Math.round(o.y - 7 - cy - img.height / 2 - (o.z || 0)));
        continue;
      }
      const [n, d] = FX_FRAMES[fx.kind] || [1, 10];
      const i = Math.min(n - 1, Math.floor(fx.t / d));
      const list = fx.kind === 'star' ? SPR.fx.star : fx.kind === 'smoke' ? SPR.fx.smoke : fx.kind === 'explosion' ? SPR.fx.explosion : SPR.fx.sparkle;
      const img = list[i];
      ctx.drawImage(img, Math.round(fx.x - cx - img.width / 2), Math.round(fx.y - cy - img.height / 2));
    }
  }

  drawGameOver(ctx) {
    const t = this.gameOver.t;
    const a = Math.min(0.85, t / 60);
    ctx.fillStyle = `rgba(7,6,12,${a})`;
    ctx.fillRect(0, 0, W, H);
    if (t > 30) {
      ctx.globalAlpha = Math.min(1, (t - 30) / 30);
      font.draw(ctx, 'SEI CADUTO', 240, 110, P.red, { align: 'center' });
      font.draw(ctx, 'La fiamma del braciere ti richiama.', 240, 128, P.gray, { align: 'center' });
      if (t > 90 && (t >> 4) % 2 === 0) font.draw(ctx, `Premi ${this.input.primaryLabel('attack')} per riprendere`, 240, 160, P.sand, { align: 'center' });
      ctx.globalAlpha = 1;
    }
  }
}

