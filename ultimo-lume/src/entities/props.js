// Interactive world props: breakables, chests, doors, gates, puzzle pieces, decor.
import { Entity, drawFrame } from './entity.js';
import { SPR } from '../gfx/sprites/index.js';
import { P } from '../gfx/palette.js';
import { FX } from '../systems/particles.js';
import { dropLoot, Pickup } from './pickups.js';
import { T, TILE_PROPS } from '../world/tiletypes.js';
import { boxBlocked } from '../systems/collision.js';
import { DIR_VEC, rand } from '../core/math.js';

class Prop extends Entity {
  constructor(game, x, y, o = {}) {
    super(game, x, y);
    this.o = o;
    this.img = null;
    this.drawOY = 8;
    this.flash = 0;
  }

  get flags() { return this.game.progress.flags; }
  key(prefix) { return `${prefix}:${this.room.id}:${this.tx},${this.ty}`; }

  draw(ctx, cx, cy) {
    if (this.img) drawFrame(ctx, this.img, this.x, this.y + this.drawOY, cx, cy, { flash: this.flash > 0 });
  }
}

// ------------------------------------------------------------------ Breakables
export class Breakable extends Prop {
  constructor(game, x, y, o) {
    super(game, x, y, o);
    this.kind = o.kind || 'pot';
    this.team = 'neutral';
    this.hurtbox = true;
    this.broken = false;
    const pal = game.room.theme === 'forest' || game.room.theme === 'ruins' ? 1 : game.room.theme === 'caves' ? 2 : 0;
    this.pal = pal;
    switch (this.kind) {
      case 'pot': this.solid = true; this.w = 12; this.h = 9; this.img = SPR.props.pot.whole; this.table = 'pot'; break;
      case 'crate': this.solid = true; this.w = 14; this.h = 11; this.img = SPR.props.crate; this.table = 'pot'; break;
      case 'bush': this.solid = true; this.w = 14; this.h = 11; this.img = SPR.props.bush[pal].whole; this.table = 'grass'; break;
      case 'grass': this.solid = false; this.w = 14; this.h = 10; this.img = SPR.props.tallGrass[pal ? 1 : 0][0]; this.table = 'grass'; this.sortBias = -2; break;
      default: break;
    }
    this.hurtW = 14; this.hurtH = 14; this.hurtOY = 3;
    this.sway = 0;
  }

  takeHit(hit) {
    if (this.broken) return null;
    if (hit.team === 'enemy' && !hit.flags.bomb) return null;
    this.smash();
    return 'hit';
  }

  smash() {
    const g = this.game;
    this.broken = true;
    const x = this.x, y = this.y;
    switch (this.kind) {
      case 'pot':
      case 'crate':
        this.dead = true;
        FX.shards(g.particles, x, y - 4, 10, this.kind === 'pot' ? [P.clay, P.rust, P.tan] : [P.brown, P.brownD, P.tan]);
        g.audio.play('break', { x, y });
        break;
      case 'bush':
        this.solid = false;
        this.hurtbox = false;
        this.img = SPR.props.bush[this.pal].cut;
        FX.leaves(g.particles, x, y - 6, 10, this.pal === 2 ? [P.blueD, P.teal, P.blue] : [P.green, P.greenL, P.greenD]);
        g.audio.play('cut', { x, y });
        break;
      case 'grass':
        this.dead = true;
        FX.leaves(g.particles, x, y - 4, 6, this.pal ? [P.green, P.greenD] : [P.greenL, P.green]);
        g.audio.play('cut', { x, y });
        break;
      default: break;
    }
    if (this.o.drop) {
      const [item, n] = this.o.drop.split(':');
      g.addEntity(new Pickup(g, x, y, item, parseInt(n || '1', 10), { pop: true, temporary: item === 'coin' || item === 'heart' }));
    } else dropLoot(g, x, y, this.table);
  }

  update() {
    this.t++;
    if (this.kind === 'grass' && !this.broken) {
      const pl = this.game.player;
      if (pl && Math.abs(pl.x - this.x) < 9 && Math.abs(pl.y - this.y) < 8 && pl.moving) {
        if (this.sway <= 0 && Math.random() < 0.3) FX.leaves(this.game.particles, this.x, this.y - 4, 1, [P.greenL, P.green]);
        this.sway = 12;
      }
      if (this.sway > 0) this.sway--;
      this.img = SPR.props.tallGrass[this.pal ? 1 : 0][this.sway > 0 && (this.sway >> 2) % 2 ? 1 : 0];
    }
  }
}

// ------------------------------------------------------------------ Chest
export class Chest extends Prop {
  constructor(game, x, y, o) {
    super(game, x, y, o);
    this.big = !!o.big;
    this.w = this.big ? 22 : 14;
    this.h = this.big ? 12 : 10;
    this.solid = true;
    this.flag = o.flag || null;
    this.drawOY = this.big ? 8 : 8;
    this.prompt = 'Apri';
  }

  init() {
    this.flag = this.flag || this.key('chest');
    this.opened = !!this.flags[this.flag];
    this.hidden = !!this.o.appearOn && !this.flags['sig:' + this.o.appearOn];
    this.refresh();
  }

  refresh() {
    const set = this.big ? SPR.props.bigChest : SPR.props.chest;
    this.img = this.opened ? set.open : set.closed;
    this.solid = !this.hidden;
    this.interactable = !this.opened && !this.hidden;
  }

  onSignal(name, on, instant) {
    if (name !== this.o.appearOn || !on || !this.hidden) return;
    this.hidden = false;
    this.refresh();
    if (!instant) {
      FX.poof(this.game.particles, this.x, this.y - 6, 16, [P.white, P.yellow, P.silver]);
      this.game.audio.play('secret');
    }
  }

  onInteract() {
    if (this.opened || this.hidden) return;
    this.opened = true;
    this.flags[this.flag] = true;
    this.refresh();
    this.game.audio.play('chest', { x: this.x, y: this.y });
    this.game.particles.burst(this.x, this.y - 10, 10, { speed: 1, life: 26, colors: [P.yellow, P.white, P.gold], drag: 0.93, vz: 0, glow: 3 });
    this.game.giveItem(this.o.item, this.o.count || 1, { present: true, chest: this });
  }

  draw(ctx, cx, cy) {
    if (this.hidden) return;
    super.draw(ctx, cx, cy);
  }

  drawShadow(ctx, cx, cy) {
    if (this.hidden) return;
    const s = this.big ? SPR.fx.shadow.l : SPR.fx.shadow.m;
    ctx.drawImage(s, Math.round(this.x - cx - s.width / 2), Math.round(this.y - cy + 4));
  }
}

// ------------------------------------------------------------------ Sign / lore tablet
export class Sign extends Prop {
  constructor(game, x, y, o) {
    super(game, x, y, o);
    this.solid = true;
    this.w = 14; this.h = 8;
    this.img = o.style === 'statue' ? SPR.props.statue : o.style === 'grave' ? SPR.props.grave[o.v || 0] : o.style === 'none' ? null : SPR.props.sign;
    if (o.style === 'statue') { this.w = 14; this.h = 10; }
    this.interactable = true;
    this.prompt = 'Leggi';
  }

  onInteract() {
    const lines = Array.isArray(this.o.text) ? this.o.text : [this.o.text];
    this.game.dialog(lines.map((text) => ({ text, speaker: this.o.speaker || null })));
    if (this.o.flag) this.flags[this.o.flag] = true;
  }
}

// ------------------------------------------------------------------ Doors (locked)
export class Door extends Prop {
  constructor(game, x, y, o) {
    super(game, x, y, o);
    this.lock = o.lock || 'key';
    this.solid = true;
    this.blocksBlink = true;
    this.blocksFlyers = true;
    this.prompt = 'Apri';
    this.openT = 0;
  }

  init() {
    this.vertical = this.gh > this.gw;
    this.w = this.gw * 16;
    this.h = this.gh * 16;
    this.flag = this.key('door');
    this.open = !!this.flags[this.flag];
    this.solid = !this.open;
    this.interactable = !this.open;
    this.interactRange = 26;
    this.dungeon = this.o.dungeon || this.room.def.dungeon || this.room.def.region;
    this.sortBias = -8;
  }

  onInteract() {
    const pr = this.game.progress;
    if (this.lock === 'boss') {
      if (pr.bossKeys[this.dungeon]) {
        pr.bossKeys[this.dungeon] = 'used';
        return this.unlock();
      }
      return this.game.dialog([{ text: 'Un sigillo antico chiude la porta. Serve una {Chiave Antica}.' }]);
    }
    if ((pr.keys[this.dungeon] || 0) > 0) {
      pr.keys[this.dungeon]--;
      return this.unlock();
    }
    this.game.dialog([{ text: 'La porta è chiusa a chiave.' }]);
  }

  unlock() {
    this.open = true;
    this.flags[this.flag] = true;
    this.interactable = false;
    this.openT = 1;
    this.game.audio.play('unlock');
    setTimeout(() => this.game.audio.play('door'), 150);
  }

  update() {
    if (this.openT > 0) {
      this.openT++;
      if (this.openT > 18) { this.solid = false; this.openT = 0; }
      if (this.openT % 3 === 0) FX.dust(this.game.particles, this.x + rand(-this.w / 2, this.w / 2), this.y + this.h / 2, 1, P.gray);
    }
  }

  draw(ctx, cx, cy) {
    if (this.open && this.openT === 0) return;
    const set = this.vertical ? SPR.props.doorV : SPR.props.doorH;
    const img = set[this.lock === 'boss' ? 'boss' : 'key'];
    const alpha = this.openT > 0 ? 1 - this.openT / 18 : 1;
    const shift = this.openT > 0 ? Math.round(this.openT / 2) : 0;
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.drawImage(img, Math.round(this.x - this.w / 2 - cx), Math.round(this.y - this.h / 2 - cy - shift), this.w, this.h);
    ctx.globalAlpha = 1;
  }
}

// ------------------------------------------------------------------ Gate (bars), driven by signals
export class Gate extends Prop {
  constructor(game, x, y, o) {
    super(game, x, y, o);
    this.id = o.id;
    this.blocksBlink = true;
    this.anim = 0; // 0 closed .. 1 open
  }

  init() {
    this.vertical = this.gh > this.gw;
    this.w = this.gw * 16;
    this.h = this.gh * 16;
    const saved = this.flags['sig:' + this.id];
    this.isOpen = saved !== undefined ? !!saved : !!this.o.open;
    this.anim = this.isOpen ? 1 : 0;
    this.solid = !this.isOpen;
    this.sortBias = -8;
  }

  onSignal(name, on, instant) {
    if (name !== this.id) return;
    if (this.isOpen === on) return;
    this.isOpen = on;
    if (!on) this.solid = true;
    if (instant) { this.anim = on ? 1 : 0; this.solid = !on; return; }
    this.game.audio.play('gate', { x: this.x, y: this.y });
  }

  update() {
    const target = this.isOpen ? 1 : 0;
    if (this.anim !== target) {
      this.anim += (target - this.anim > 0 ? 1 : -1) / 16;
      if (Math.abs(this.anim - target) < 0.07) this.anim = target;
      if (this.anim === 1) this.solid = false;
      if (!this.isOpen) {
        // closing on the player: push them out of the way
        const pl = this.game.player;
        if (Math.abs(pl.x - this.x) < (this.w + pl.w) / 2 && Math.abs(pl.y - this.y) < (this.h + pl.h) / 2) {
          if (this.vertical) pl.x += pl.x < this.x ? -2 : 2;
          else pl.y += pl.y < this.y ? -2 : 2;
        }
      }
    }
  }

  draw(ctx, cx, cy) {
    if (this.anim >= 1) {
      // retracted: small stubs
      ctx.fillStyle = P.steel;
      if (this.vertical) ctx.fillRect(Math.round(this.x - cx - 6), Math.round(this.y - cy + this.h / 2 - 3), 12, 2);
      else for (let i = 0; i < this.w; i += 5) ctx.fillRect(Math.round(this.x - this.w / 2 - cx + i + 2), Math.round(this.y - cy + this.h / 2 - 2), 2, 2);
      return;
    }
    const set = this.vertical ? SPR.props.doorV : SPR.props.doorH;
    const img = set.gate;
    const hVis = Math.round(this.h * (1 - this.anim));
    const x = Math.round(this.x - this.w / 2 - cx), y = Math.round(this.y - this.h / 2 - cy);
    if (this.vertical) ctx.drawImage(img, 0, 0, 16, img.height * (1 - this.anim), x, y, this.w, hVis);
    else ctx.drawImage(img, 0, 0, img.width, img.height * (1 - this.anim), x, y + (this.h - hVis), this.w, hVis);
  }
}

// ------------------------------------------------------------------ Lever
export class Lever extends Prop {
  constructor(game, x, y, o) {
    super(game, x, y, o);
    this.solid = true;
    this.w = 12; this.h = 8;
    this.team = 'neutral';
    this.hurtbox = true;
    this.hurtW = 12; this.hurtH = 12;
    this.interactable = true;
    this.prompt = 'Tira';
    this.cool = 0;
  }

  init() {
    this.on = !!this.flags['sig:' + this.o.target];
    this.img = this.on ? SPR.props.lever.on : SPR.props.lever.off;
    if (this.on && this.o.once !== false) this.interactable = false;
  }

  onInteract() { this.flip(); }

  takeHit(hit) {
    if (hit.team !== 'player') return null;
    this.flip();
    return 'hit';
  }

  flip() {
    if (this.cool > 0) return;
    if (this.on && this.o.once !== false) return;
    this.cool = 20;
    this.on = !this.on;
    this.img = this.on ? SPR.props.lever.on : SPR.props.lever.off;
    this.game.audio.play('switch', { x: this.x, y: this.y });
    this.room.emit(this.o.target, this.on, true);
    if (this.on && this.o.once !== false) this.interactable = false;
    if (this.o.secret) this.game.audio.play('secret');
  }

  update() { if (this.cool > 0) this.cool--; }
}

// ------------------------------------------------------------------ Pressure plate
export class Plate extends Prop {
  constructor(game, x, y, o) {
    super(game, x, y, o);
    this.layer = 'floor';
    this.w = 14; this.h = 14;
    this.pressed = false;
  }

  init() {
    if (this.o.latch && this.flags['sig:' + this.o.target]) this.pressed = true;
    this.img = this.pressed ? SPR.props.plate.down : SPR.props.plate.up;
  }

  update() {
    if (this.o.latch && this.pressed) return;
    let now = false;
    const pl = this.game.player;
    if (Math.abs(pl.x - this.x) < 9 && Math.abs(pl.y - this.y) < 9 && pl.state !== 'fall') now = true;
    if (!now) for (const e of this.room.entities) {
      if (e === this || e.dead) continue;
      if ((e instanceof PushBlock || (e.team === 'enemy' && e.moveMode !== 'fly')) && Math.abs(e.x - this.x) < 9 && Math.abs(e.y - this.y) < 9) { now = true; break; }
    }
    if (now !== this.pressed) {
      this.pressed = now;
      this.img = now ? SPR.props.plate.down : SPR.props.plate.up;
      this.game.audio.play('switch', { x: this.x, y: this.y });
      this.room.emit(this.o.target, now, !!this.o.latch);
      if (now && this.o.latch) this.game.audio.play('secret');
    }
  }
}

// ------------------------------------------------------------------ Push block
export class PushBlock extends Prop {
  constructor(game, x, y, o) {
    super(game, x, y, o);
    this.solid = true;
    this.pushable = true;
    this.w = 16; this.h = 16;
    this.img = SPR.props.block;
    this.drawOY = 10;
    this.slide = null;
    this.blocksFlyers = true;
  }

  push(dir) {
    if (this.slide) return;
    const v = DIR_VEC[dir];
    const nx = this.x + v.x * 16, ny = this.y + v.y * 16;
    const t = this.room.tileAtPx(nx, ny);
    const tp = TILE_PROPS[t];
    if (tp.solid && !tp.water) return;
    if (tp.water) return;
    this.solid = false;
    const blocked = boxBlocked(this.room, nx, ny, 14, 14, 'walk', this);
    this.solid = true;
    if (blocked) return;
    this.slide = { fx: this.x, fy: this.y, tx: nx, ty: ny, t: 0, pit: tp.pit || tp.lava };
    this.game.audio.play('push', { x: this.x, y: this.y });
  }

  update() {
    if (!this.slide) return;
    const s = this.slide;
    s.t++;
    const k = s.t / 14;
    this.x = s.fx + (s.tx - s.fx) * Math.min(1, k);
    this.y = s.fy + (s.ty - s.fy) * Math.min(1, k);
    if (s.t % 3 === 0) FX.dust(this.game.particles, this.x, this.y + 7, 1, P.gray);
    if (s.t >= 14) {
      this.slide = null;
      if (s.pit) {
        // the block fills the hole
        const tx = Math.floor(this.x / 16), ty = Math.floor(this.y / 16);
        this.room.setTile(tx, ty, T.FLOOR3);
        this.flags[`fill:${this.room.id}:${tx},${ty}`] = true;
        this.dead = true;
        this.game.audio.play('rockBreak', { x: this.x, y: this.y });
        FX.poof(this.game.particles, this.x, this.y, 10, [P.gray, P.steel]);
      }
    }
  }
}

// ------------------------------------------------------------------ Torch (puzzle / light)
export class Torch extends Prop {
  constructor(game, x, y, o) {
    super(game, x, y, o);
    this.solid = true;
    this.w = 8; this.h = 6;
    this.img = SPR.props.torch;
    this.drawOY = 6;
    this.team = 'neutral';
    this.hurtbox = true;
    this.hurtW = 10; this.hurtH = 16;
    this.prompt = 'Accendi';
    this.blue = !!o.blue;
  }

  init() {
    this.lit = !!this.o.lit || (this.o.target && !!this.flags['sig:' + this.o.target]);
    this.timer = 0;
    this.interactable = !this.lit;
  }

  onInteract() {
    if (this.lit) return;
    if (!this.game.progress.abilities.lantern) {
      this.game.dialog([{ text: 'Una torcia spenta. Ti servirebbe una fiamma per accenderla.' }]);
      return;
    }
    this.light();
  }

  takeHit(hit) {
    if (!this.lit && (hit.flags.fire || hit.flags.light)) { this.light(); return 'hit'; }
    return null;
  }

  light() {
    this.lit = true;
    this.interactable = false;
    this.timer = this.o.duration || 0;
    this.game.audio.play('torch', { x: this.x, y: this.y });
    FX.embers(this.game.particles, this.x, this.y - 16, 6);
    if (this.o.group) this.checkGroup();
  }

  checkGroup() {
    const group = this.room.entities.filter((e) => e instanceof Torch && e.o.group === this.o.group);
    if (group.every((e) => e.lit)) {
      const target = group.find((e) => e.o.target)?.o.target;
      if (target && !this.flags['sig:' + target]) {
        this.room.emit(target, true, true);
        this.game.audio.play('secret');
        for (const e of group) e.timer = 0;
      }
    }
  }

  update() {
    this.t++;
    if (this.lit && this.timer > 0) {
      this.timer--;
      if (this.timer === 0) {
        this.lit = false;
        this.interactable = true;
        this.game.audio.play('sizzle', { x: this.x, y: this.y, vol: 0.5 });
      }
    }
    if (this.lit && this.t % 14 === 0) FX.embers(this.game.particles, this.x + rand(-2, 2), this.y - 20, 1);
  }

  draw(ctx, cx, cy) {
    super.draw(ctx, cx, cy);
    if (this.lit) {
      const f = (this.blue ? SPR.props.flameBlue : SPR.props.flameSmall)[(this.t >> 3) % 4];
      const blink = this.timer > 0 && this.timer < 90 && (this.timer >> 3) % 2 === 0;
      if (!blink) ctx.drawImage(f, Math.round(this.x - cx - f.width / 2), Math.round(this.y - cy - 25 + (this.blue ? -4 : 0)), this.blue ? 8 : f.width, this.blue ? 12 : f.height);
    }
  }

  lights(out, cx, cy) {
    if (!this.lit) return;
    const flick = Math.sin(this.t * 0.3) * 2 + Math.sin(this.t * 0.73) * 1.5;
    out.push({ x: this.x - cx, y: this.y - 20 - cy, r: 70 + flick, i: 1, color: this.blue ? P.cyan : P.orange });
  }
}

// ------------------------------------------------------------------ Brazier (checkpoint)
export class Brazier extends Prop {
  constructor(game, x, y, o) {
    super(game, x, y, o);
    this.solid = true;
    this.w = 16; this.h = 8;
    this.drawOY = 7;
    this.interactable = true;
    this.prompt = 'Riposa';
    this.interactRange = 22;
  }

  init() {
    this.lit = !!this.flags['brazier:' + this.room.id];
    this.prompt = this.lit ? 'Riposa' : 'Accendi';
  }

  onInteract() {
    this.game.restAtBrazier(this);
    this.lit = true;
    this.prompt = 'Riposa';
  }

  update() { this.t++; if (this.lit && this.t % 10 === 0) FX.embers(this.game.particles, this.x + rand(-4, 4), this.y - 18, 1); }

  draw(ctx, cx, cy) {
    this.img = this.lit ? SPR.props.brazier.lit : SPR.props.brazier.unlit;
    super.draw(ctx, cx, cy);
    if (this.lit) {
      const f = SPR.props.flameBig[(this.t >> 3) % 4];
      ctx.drawImage(f, Math.round(this.x - cx - f.width / 2), Math.round(this.y - cy - 27));
    }
  }

  lights(out, cx, cy) {
    const flick = Math.sin(this.t * 0.25) * 3;
    if (this.lit) out.push({ x: this.x - cx, y: this.y - 18 - cy, r: 96 + flick, i: 1, color: P.orange });
    else out.push({ x: this.x - cx, y: this.y - 10 - cy, r: 22, i: 0.5, color: P.rust });
  }
}

// ------------------------------------------------------------------ Crystal switch + barriers
export class CrystalSwitch extends Prop {
  constructor(game, x, y, o) {
    super(game, x, y, o);
    this.solid = true;
    this.w = 12; this.h = 8;
    this.team = 'neutral';
    this.hurtbox = true;
    this.hurtW = 12; this.hurtH = 18; this.hurtOY = 6;
    this.cool = 0;
    this.drawOY = 7;
  }

  takeHit(hit) {
    if (hit.team !== 'player' || this.cool > 0) return null;
    this.cool = 24;
    this.room.toggleCrystal();
    this.game.audio.play('crystal', { x: this.x, y: this.y });
    this.flash = 6;
    return 'hit';
  }

  update() { if (this.cool > 0) this.cool--; if (this.flash > 0) this.flash--; this.t++; }

  draw(ctx, cx, cy) {
    this.img = SPR.props.crystalSwitch[this.room.crystal];
    super.draw(ctx, cx, cy);
  }

  lights(out, cx, cy) { out.push({ x: this.x - cx, y: this.y - 10 - cy, r: 30, i: 0.8, color: this.room.crystal === 'red' ? P.red : P.blue }); }
}

export class Barrier extends Prop {
  constructor(game, x, y, o) {
    super(game, x, y, o);
    this.color = o.color || 'red';
    this.w = 16; this.h = 16;
    this.blocksBlink = true;
    this.blocksFlyers = true;
    this.layer = 'floor';
  }

  get up() { return this.room.crystal === this.color; }

  update() {
    const want = this.up;
    if (want && !this.solid) {
      // don't rise under someone
      const pl = this.game.player;
      if (Math.abs(pl.x - this.x) < 12 && Math.abs(pl.y - this.y) < 11) return;
    }
    this.solid = want;
    this.layer = want ? 'main' : 'floor';
  }

  draw(ctx, cx, cy) {
    const s = SPR.props.barrier;
    const img = this.color === 'red' ? (this.solid ? s.redUp : s.redDown) : (this.solid ? s.blueUp : s.blueDown);
    ctx.drawImage(img, Math.round(this.x - 8 - cx), Math.round(this.y - 8 - cy));
  }
}

// ------------------------------------------------------------------ Eye switch (arrow target)
export class EyeSwitch extends Prop {
  constructor(game, x, y, o) {
    super(game, x, y, o);
    this.team = 'neutral';
    this.hurtbox = true;
    this.w = 16; this.h = 16;
    this.hurtW = 16; this.hurtH = 24; this.hurtOY = 8;
    this.layer = 'floor';
  }

  init() { this.done = !!this.flags['sig:' + this.o.target]; }

  takeHit(hit) {
    if (this.done) return null;
    if (!hit.flags.arrow && !hit.flags.light) {
      if (hit.flags.sword) { this.game.audio.play('clank'); return 'block'; }
      return null;
    }
    this.done = true;
    this.flash = 10;
    this.room.emit(this.o.target, true, true);
    this.game.audio.play('switch');
    this.game.audio.play('secret');
    return 'hit';
  }

  update() { this.t++; if (this.flash > 0) this.flash--; }

  draw(ctx, cx, cy) {
    const s = SPR.props.eyeSwitch;
    const img = this.done ? s.hit : (this.t >> 5) % 5 === 0 ? s.closed : s.open;
    drawFrame(ctx, img, this.x, this.y - 8, cx, cy, { flash: this.flash > 0 });
  }

  lights(out, cx, cy) { if (!this.done) out.push({ x: this.x - cx, y: this.y - 16 - cy, r: 18, i: 0.6, color: P.red }); }
}

// ------------------------------------------------------------------ Rotating owl statue
const ROT = ['down', 'left', 'up', 'right'];
export class OwlStatue extends Prop {
  constructor(game, x, y, o) {
    super(game, x, y, o);
    this.solid = true;
    this.w = 14; this.h = 10;
    this.interactable = true;
    this.prompt = 'Ruota';
    this.drawOY = 8;
  }

  init() {
    this.done = !!this.flags['sig:' + this.o.target];
    this.dir = this.done ? this.o.want : (this.o.dir || 'down');
    if (this.done) this.interactable = false;
  }

  onInteract() {
    if (this.done) return;
    this.dir = ROT[(ROT.indexOf(this.dir) + 1) % 4];
    this.game.audio.play('push', { x: this.x, y: this.y });
    FX.dust(this.game.particles, this.x, this.y + 4, 4, P.gray);
    const group = this.room.entities.filter((e) => e instanceof OwlStatue && e.o.group === this.o.group);
    if (group.every((e) => e.dir === e.o.want)) {
      for (const e of group) { e.done = true; e.interactable = false; }
      const target = group.find((e) => e.o.target)?.o.target;
      this.room.emit(target, true, true);
      this.game.audio.play('secret');
    }
  }

  draw(ctx, cx, cy) {
    this.img = SPR.props.owl[this.dir];
    super.draw(ctx, cx, cy);
  }
}

// ------------------------------------------------------------------ Symbol floor tiles (sequence puzzle)
export class SymbolTile extends Prop {
  constructor(game, x, y, o) {
    super(game, x, y, o);
    this.layer = 'floor';
    this.lit = false;
    this.inside = false;
  }

  init() {
    this.done = !!this.flags['sig:' + this.o.target];
    if (this.done) this.lit = true;
  }

  update() {
    this.t++;
    if (this.done) return;
    const pl = this.game.player;
    const on = Math.abs(pl.x - this.x) < 7 && Math.abs(pl.y - this.y) < 7;
    if (on && !this.inside) this.step();
    this.inside = on;
  }

  step() {
    const room = this.room;
    const group = room.entities.filter((e) => e instanceof SymbolTile && e.o.group === this.o.group);
    const next = group.filter((e) => e.lit).length;
    if (this.lit) return;
    if (this.o.index === next) {
      this.lit = true;
      this.game.audio.play('crystal', { vol: 0.7 });
      if (group.every((e) => e.lit)) {
        for (const e of group) e.done = true;
        const target = group.find((e) => e.o.target)?.o.target;
        room.emit(target, true, true);
        this.game.audio.play('secret');
      }
    } else {
      for (const e of group) e.lit = false;
      this.game.audio.play('uiError');
      this.flash = 20;
    }
  }

  draw(ctx, cx, cy) {
    const x = Math.round(this.x - 8 - cx), y = Math.round(this.y - 8 - cy);
    ctx.fillStyle = P.navy;
    ctx.fillRect(x + 1, y + 1, 14, 14);
    ctx.fillStyle = this.lit ? P.gold : P.slate;
    ctx.fillRect(x + 2, y + 2, 12, 12);
    ctx.fillStyle = this.lit ? P.yellow : P.steel;
    drawGlyph(ctx, this.o.symbol || 0, x + 4, y + 4);
  }

  lights(out, cx, cy) { if (this.lit) out.push({ x: this.x - cx, y: this.y - cy, r: 20, i: 0.5, color: P.gold }); }
}

// 8x8 rune glyphs used by symbol puzzles and murals.
export const GLYPHS = [
  ['..##....', '.#..#...', '#....#..', '#....#..', '.#..#...', '..##....', '..##....', '..##....'],
  ['#......#', '.#....#.', '..#..#..', '...##...', '...##...', '..#..#..', '.#....#.', '#......#'],
  ['...##...', '...##...', '########', '...##...', '...##...', '..#..#..', '.#....#.', '#......#'],
  ['########', '#......#', '#.####.#', '#.#..#.#', '#.#..#.#', '#.####.#', '#......#', '########'],
  ['...#....', '..###...', '.#####..', '#######.', '...#....', '...#....', '...#....', '...#....'],
];

export function drawGlyph(ctx, idx, x, y, scale = 1) {
  const g = GLYPHS[idx % GLYPHS.length];
  for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) if (g[j][i] === '#') ctx.fillRect(x + i * scale, y + j * scale, scale, scale);
}

// ------------------------------------------------------------------ Spikes
export class Spikes extends Prop {
  constructor(game, x, y, o) {
    super(game, x, y, o);
    this.layer = 'floor';
    this.period = o.period || 0;
    this.offset = o.offset || 0;
  }

  get up() {
    if (!this.period) return true;
    return ((this.game.time + this.offset) % this.period) < this.period * 0.5;
  }

  update() {
    if (!this.up) return;
    const pl = this.game.player;
    if (Math.abs(pl.x - this.x) < 11 && Math.abs(pl.y - this.y) < 10) {
      pl.takeHit({ x: this.x, y: this.y - 10, damage: 1, knock: 3, flags: {} });
    }
    for (const e of this.room.entities) {
      if (e.team === 'enemy' && e.moveMode !== 'fly' && !e.dead && e.takeHit && Math.abs(e.x - this.x) < 10 && Math.abs(e.y - this.y) < 10) {
        e.takeHit({ x: this.x, y: this.y - 10, damage: 1, knock: 2, flags: {}, team: 'hazard' });
      }
    }
  }

  draw(ctx, cx, cy) {
    const img = this.up ? SPR.props.spikes.up : SPR.props.spikes.down;
    ctx.drawImage(img, Math.round(this.x - 8 - cx), Math.round(this.y - 8 - cy));
  }
}

// ------------------------------------------------------------------ Boulder (broken by the charged spin)
export class Boulder extends Prop {
  constructor(game, x, y, o) {
    super(game, x, y, o);
    this.solid = true;
    this.w = 16; this.h = 14;
    this.team = 'neutral';
    this.hurtbox = true;
    this.hurtW = 16; this.hurtH = 16;
    this.img = SPR.props.boulder;
    this.drawOY = 9;
    this.blocksFlyers = true;
    this.blocksBlink = true;
  }

  init() {
    this.flag = this.key('boulder');
    if (this.flags[this.flag]) this.dead = true;
  }

  takeHit(hit) {
    if (hit.flags.spin || (hit.flags.heavy && hit.flags.boss)) {
      this.dead = true;
      this.flags[this.flag] = true;
      this.game.audio.play('rockBreak', { x: this.x, y: this.y });
      this.game.camera.shake(0.3);
      FX.shards(this.game.particles, this.x, this.y - 6, 16, [P.gray, P.steel, P.slate]);
      FX.poof(this.game.particles, this.x, this.y - 4, 8, [P.silver, P.gray]);
      if (this.o.secret) this.game.audio.play('secret');
      return 'hit';
    }
    if (hit.flags.sword) {
      this.game.hints.show('boulder');
      return 'block';
    }
    return null;
  }
}

// ------------------------------------------------------------------ Decor (static, optional light / collision)
export class Decor extends Prop {
  constructor(game, x, y, o) {
    super(game, x, y, o);
    const path = o.sprite.split('.');
    let img = SPR.props;
    for (const k of path) img = img?.[k];
    this.img = img;
    this.solid = !!o.solid;
    this.w = o.w ?? 14;
    this.h = o.h ?? 10;
    this.drawOY = o.oy ?? 8;
    this.layer = o.layer || 'main';
    this.sortBias = o.sortBias || 0;
    this.blocksFlyers = !!o.tall;
    this.blocksBlink = !!o.tall;
    if (o.ox) this.x += o.ox;
    this.anchorX = o.ax;
  }

  init() {
    if (this.o.hideFlag && this.flags[this.o.hideFlag]) this.dead = true;
    if (this.o.showFlag && !this.flags[this.o.showFlag]) this.dead = true;
  }

  update() { this.t++; }

  draw(ctx, cx, cy) {
    if (!this.img) return;
    if (this.o.alpha) ctx.globalAlpha = this.o.alpha;
    drawFrame(ctx, this.img, this.x, this.y + this.drawOY, cx, cy, { ax: this.anchorX });
    ctx.globalAlpha = 1;
    if (this.o.flame) {
      const f = SPR.props[this.o.flame][(this.t >> 3) % 4];
      ctx.drawImage(f, Math.round(this.x - cx - f.width / 2), Math.round(this.y - cy + (this.o.flameY ?? -27)));
    }
  }

  lights(out, cx, cy) {
    const l = this.o.light;
    if (!l) return;
    const flick = l.flicker ? Math.sin(this.t * 0.27 + this.x) * 3 : 0;
    out.push({ x: this.x - cx, y: this.y + (l.oy ?? -8) - cy, r: l.r + flick, i: l.i ?? 1, color: l.color });
  }
}

// ------------------------------------------------------------------ Warp (stairs, cave mouths, holes)
export class Warp extends Prop {
  constructor(game, x, y, o) {
    super(game, x, y, o);
    this.layer = o.style === 'cave' || o.style === 'mine' ? 'main' : 'floor';
    this.armed = true;
    this.sortBias = -20;
  }

  init() {
    this.w = this.gw * 16;
    this.h = this.gh * 16;
    if (this.o.showFlag && !this.flags[this.o.showFlag]) this.inactive = true;
  }

  update() {
    if (this.inactive) {
      if (this.flags[this.o.showFlag]) this.inactive = false;
      else return;
    }
    const pl = this.game.player;
    const inside = Math.abs(pl.x - this.x) < this.w / 2 - 2 && Math.abs(pl.y - this.y) < this.h / 2;
    if (!inside) { this.armed = true; return; }
    if (this.armed && pl.state === 'move' && !this.game.transition) this.game.warpTo(this.o.to, this.o.at, this.o.dir);
  }

  draw(ctx, cx, cy) {
    if (this.inactive) return;
    const s = this.o.style;
    let img = null;
    if (s === 'stairsDown') img = SPR.props.stairsDown;
    else if (s === 'stairsUp') img = SPR.props.stairsUp;
    else if (s === 'cave') img = SPR.props.caveMouth;
    else if (s === 'mine') img = SPR.props.mineMouth;
    else if (s === 'hole') img = SPR.props.hole;
    else if (s === 'ladder') img = SPR.props.ladder;
    if (!img) return;
    if (s === 'cave' || s === 'mine') ctx.drawImage(img, Math.round(this.x - img.width / 2 - cx), Math.round(this.y + this.h / 2 - img.height - cy));
    else if (s === 'ladder') ctx.drawImage(img, Math.round(this.x - 8 - cx), Math.round(this.y + this.h / 2 - img.height - cy));
    else ctx.drawImage(img, Math.round(this.x - img.width / 2 - cx), Math.round(this.y - img.height / 2 - cy));
  }
}

// ------------------------------------------------------------------ Invisible trigger zone
export class Trigger extends Prop {
  constructor(game, x, y, o) {
    super(game, x, y, o);
    this.fired = false;
  }

  init() {
    this.w = (this.gw || 1) * 16;
    this.h = (this.gh || 1) * 16;
    if (this.o.flag && this.flags[this.o.flag]) this.fired = true;
  }

  update() {
    if (this.fired) return;
    const pl = this.game.player;
    if (Math.abs(pl.x - this.x) < this.w / 2 && Math.abs(pl.y - this.y) < this.h / 2) {
      this.fired = true;
      if (this.o.flag) this.flags[this.o.flag] = true;
      this.game.runEvent(this.o.event, this);
    }
  }
}

// ------------------------------------------------------------------ Sanctuary seal (three artifact sockets)
export class SealGate extends Prop {
  constructor(game, x, y, o) {
    super(game, x, y, o);
    this.solid = true;
    this.blocksBlink = true;
    this.blocksFlyers = true;
    this.interactable = true;
    this.prompt = 'Esamina';
    this.interactRange = 30;
    this.sortBias = -16;
  }

  init() {
    this.w = this.gw * 16;
    this.h = this.gh * 16;
    this.open = !!this.flags['seal.open'];
    this.solid = !this.open;
    this.interactable = !this.open;
    this.promptY = 44;
  }

  count() {
    const it = this.game.progress.items;
    return (it.stoneHeart ? 1 : 0) + (it.abyssEye ? 1 : 0) + (it.brokenOath ? 1 : 0);
  }

  onInteract() {
    const n = this.count();
    if (n < 3) {
      this.game.dialog([
        { text: 'Un grande portale di pietra. Tre incavi attendono qualcosa.' },
        { text: n === 0 ? 'Sulla soglia è inciso: "Pietra, abisso, acciaio."' : `Hai ${n} sigill${n === 1 ? 'o' : 'i'} su 3. Gli incavi vuoti sembrano freddi.` },
      ]);
      return;
    }
    this.game.runEvent('openSeal', this);
  }

  draw(ctx, cx, cy) {
    const img = SPR.props.socketGate[this.open ? 3 : this.count()];
    const x = Math.round(this.x - img.width / 2 - cx + 8), y = Math.round(this.y + this.h / 2 - img.height - cy);
    if (this.open) {
      ctx.globalAlpha = 0.35;
      ctx.drawImage(img, x, y);
      ctx.globalAlpha = 1;
      return;
    }
    ctx.drawImage(img, x, y);
  }

  lights(out, cx, cy) {
    const n = this.count();
    if (n > 0) out.push({ x: this.x - cx + 8, y: this.y - 8 - cy, r: 20 + n * 10, i: 0.7, color: P.gold });
  }
}

// ------------------------------------------------------------------ Bridge that appears on a signal (over chasms / lava)
export class BridgeZone extends Prop {
  constructor(game, x, y, o) {
    super(game, x, y, o);
    this.layer = 'floor';
  }

  init() {
    if (this.flags['sig:' + this.o.id]) this.build(true);
  }

  onSignal(name, on) {
    if (name === this.o.id && on && !this.built) this.build(false);
  }

  build(instant) {
    this.built = true;
    const tiles = [];
    for (let j = 0; j < this.gh; j++) for (let i = 0; i < this.gw; i++) tiles.push([this.tx + i, this.ty + j]);
    if (instant) {
      for (const [x, y] of tiles) this.room.setTile(x, y, T.BRIDGE);
      return;
    }
    // planks appear one by one
    tiles.forEach(([x, y], k) => {
      setTimeout(() => {
        if (this.game.room !== this.room) return;
        this.room.setTile(x, y, T.BRIDGE);
        FX.dust(this.game.particles, x * 16 + 8, y * 16 + 8, 3, P.tan);
        this.game.audio.play('push', { vol: 0.5 });
      }, 120 * k);
    });
  }
}

// ------------------------------------------------------------------ Shortcut ladder / well (one-way unlock, then two-way warp)
export class Shortcut extends Prop {
  constructor(game, x, y, o) {
    super(game, x, y, o);
    this.solid = o.style === 'well';
    this.interactable = true;
    this.interactRange = 20;
    if (o.style === 'well') { this.w = 28; this.h = 14; this.img = SPR.props.well; this.drawOY = 10; this.x += 8; }
    else { this.w = 16; this.h = 16; }
  }

  init() {
    this.open = !!this.flags[this.o.flag];
    this.prompt = this.open ? (this.o.style === 'well' ? 'Scendi' : 'Sali') : 'Esamina';
  }

  onInteract() {
    if (this.open) { this.game.warpTo(this.o.to, this.o.at, this.o.exit || 'down'); return; }
    if (this.o.unlock) {
      this.open = true;
      this.flags[this.o.flag] = true;
      this.prompt = this.o.style === 'well' ? 'Scendi' : 'Sali';
      this.game.audio.play('door');
      this.game.audio.play('secret');
      this.game.dialog([{ text: this.o.unlockText }]);
      return;
    }
    this.game.dialog([{ text: this.o.lockedText }]);
  }

  draw(ctx, cx, cy) {
    if (this.o.style === 'well') return super.draw(ctx, cx, cy);
    const img = this.open ? SPR.props.ladder : SPR.props.hatch;
    if (this.open) ctx.drawImage(img, Math.round(this.x - 8 - cx), Math.round(this.y + 8 - img.height - cy));
    else ctx.drawImage(img, Math.round(this.x - 8 - cx), Math.round(this.y - 8 - cy));
  }
}

// ------------------------------------------------------------------ Mural: a wall plaque showing a rune sequence
export class Mural extends Prop {
  constructor(game, x, y, o) {
    super(game, x, y, o);
    this.interactable = true;
    this.prompt = 'Osserva';
    this.layer = 'floor';
    this.interactRange = 20;
  }

  onInteract() {
    this.game.dialog((this.o.text || []).map((text) => ({ text })));
  }

  draw(ctx, cx, cy) {
    const n = this.o.glyphs.length;
    const w = n * 12 + 6, h = 16;
    const x = Math.round(this.x - w / 2 - cx), y = Math.round(this.y - 24 - cy);
    ctx.fillStyle = P.ink;
    ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = P.slate;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = P.steel;
    ctx.fillRect(x, y, w, 1);
    ctx.fillStyle = P.gold;
    this.o.glyphs.forEach((gi, i) => drawGlyph(ctx, gi, x + 4 + i * 12, y + 4));
  }
}

// ------------------------------------------------------------------ Light sigil: awakened only by the Light Blade
export class Sigil extends Prop {
  constructor(game, x, y, o) {
    super(game, x, y, o);
    this.team = 'neutral';
    this.hurtbox = true;
    this.w = 16; this.h = 16;
    this.hurtW = 18; this.hurtH = 26; this.hurtOY = 8;
    this.layer = 'floor';
  }

  init() { this.lit = !!this.flags['sig:' + this.o.target] || !!this.flags['sigil:' + this.room.id + ':' + this.tx]; }

  takeHit(hit) {
    if (this.lit) return null;
    if (!hit.flags.light) {
      if (hit.flags.sword) { this.flash = 6; this.game.audio.play('clank'); return 'block'; }
      return null;
    }
    this.lit = true;
    this.flags['sigil:' + this.room.id + ':' + this.tx] = true;
    this.game.audio.play('crystal');
    FX.sparks(this.game.particles, this.x, this.y - 14, 10, [P.white, P.yellow, P.gold]);
    const group = this.room.entities.filter((e) => e instanceof Sigil && e.o.group === this.o.group);
    if (group.every((e) => e.lit)) {
      this.room.emit(this.o.target, true, true);
      this.game.audio.play('secret');
    }
    return 'hit';
  }

  update() { this.t++; if (this.flash > 0) this.flash--; }

  draw(ctx, cx, cy) {
    const x = Math.round(this.x - cx), y = Math.round(this.y - 16 - cy);
    const pulse = (this.t >> 4) % 2;
    ctx.fillStyle = P.ink;
    ctx.fillRect(x - 7, y - 7, 14, 14);
    ctx.fillStyle = this.lit ? P.gold : this.flash > 0 ? P.white : P.steel;
    ctx.fillRect(x - 6, y - 6, 12, 12);
    ctx.fillStyle = this.lit ? P.yellow : pulse ? P.gray : P.slate;
    drawGlyph(ctx, 4, x - 4, y - 4);
  }

  lights(out, cx, cy) {
    out.push({ x: this.x - cx, y: this.y - 16 - cy, r: this.lit ? 44 : 16, i: this.lit ? 1 : 0.5, color: this.lit ? P.gold : P.silver });
  }
}

// ------------------------------------------------------------------ The altar of the Lume (final choice)
export class LumeAltar extends Prop {
  constructor(game, x, y, o) {
    super(game, x, y, o);
    this.solid = true;
    this.w = 36; this.h = 14;
    this.img = SPR.props.altar;
    this.drawOY = 10;
    this.prompt = 'Avvicinati alla fiamma';
    this.interactRange = 26;
    this.promptY = 48;
  }

  init() { this.interactable = !!this.flags['boss:echo']; }

  update() {
    this.t++;
    if (!this.interactable && this.flags['boss:echo']) this.interactable = true;
    if (this.t % 12 === 0) FX.embers(this.game.particles, this.x + rand(-3, 3), this.y - 26, 1);
  }

  onInteract() { this.game.runEvent('finale', this); }

  draw(ctx, cx, cy) {
    super.draw(ctx, cx, cy);
    const small = !this.flags['boss:echo'];
    const f = (small ? SPR.props.flameVoid : SPR.props.flameBig)[(this.t >> 3) % 4];
    const s = small ? 0.6 : 0.8 + Math.sin(this.t * 0.05) * 0.1;
    const w = f.width * s, h = f.height * s;
    ctx.drawImage(f, Math.round(this.x - cx - w / 2), Math.round(this.y - cy - 18 - h), Math.round(w), Math.round(h));
  }

  lights(out, cx, cy) {
    const on = this.flags['boss:echo'];
    out.push({ x: this.x - cx, y: this.y - 30 - cy, r: on ? 70 + Math.sin(this.t * 0.07) * 6 : 34, i: on ? 1 : 0.6, color: on ? P.gold : P.purple });
  }
}
