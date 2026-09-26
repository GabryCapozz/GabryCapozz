// Non-player characters: idle animation, face the player, talk through data-driven scripts.
import { Entity, drawFrame } from './entity.js';
import { SPR } from '../gfx/sprites/index.js';
import { P } from '../gfx/palette.js';
import { dirFromVector, rand } from '../core/math.js';
import { NPCS } from '../data/npcs.js';
import { moveEntity } from '../systems/collision.js';

export class NPC extends Entity {
  constructor(game, x, y, o) {
    super(game, x, y);
    this.o = o;
    this.id = o.id;
    this.data = NPCS[o.id];
    this.look = o.look || this.data?.look || o.id;
    this.solid = true;
    this.w = 12; this.h = 8;
    this.interactable = true;
    this.prompt = 'Parla';
    this.interactRange = 22;
    this.dir = o.dir || 'down';
    this.baseDir = this.dir;
    this.ghost = !!(this.data && this.data.ghost);
    this.home = { x, y };
    this.walkT = 0;
    this.talking = false;
    this.fade = 1;
  }

  init() {
    if (this.data && this.data.present && !this.data.present(this.game.progress, this.game.room.id)) this.dead = true;
  }

  onInteract(pl) {
    this.faceTo(pl);
    this.game.talkTo(this);
  }

  faceTo(e) {
    this.dir = dirFromVector(e.x - this.x, e.y - this.y, this.dir);
  }

  update() {
    this.t++;
    const pl = this.game.player;
    const d = Math.hypot(pl.x - this.x, pl.y - this.y);
    if (d < 44) this.faceTo(pl);
    else if (this.o.wander && !this.talking) {
      if (!this.target || this.t % 200 === 0) this.target = { x: this.home.x + rand(-24, 24), y: this.home.y + rand(-12, 12) };
      const dx = this.target.x - this.x, dy = this.target.y - this.y;
      const dd = Math.hypot(dx, dy);
      if (dd > 2) {
        const r = moveEntity(this, (dx / dd) * 0.35, (dy / dd) * 0.35, 'ground');
        this.dir = dirFromVector(dx, dy, this.dir);
        this.walkT++;
        if (r.x || r.y) this.target = null;
      } else this.walkT = 0;
    } else if (d >= 60) this.dir = this.baseDir;
    if (this.vanishing) {
      this.fade -= 0.01;
      if (this.t % 3 === 0) this.game.particles.spawn({ x: this.x + rand(-6, 6), y: this.y - rand(2, 20), vy: -0.5, life: 30, color: P.silver, drag: 1, glow: 3 });
      if (this.fade <= 0) this.dead = true;
    }
  }

  draw(ctx, cx, cy) {
    const set = SPR.npc[this.look] || SPR.npc.ghost;
    const S = set[this.dir] || set.down;
    const img = this.walkT > 0 && S.walk ? S.walk[Math.floor(this.walkT / 8) % 4] : S.idle[Math.floor(this.t / 36) % 2];
    let alpha = this.fade;
    if (this.ghost) alpha *= 0.62 + Math.sin(this.t * 0.05) * 0.12;
    const bob = this.ghost ? Math.round(Math.sin(this.t * 0.06) * 1.5) - 2 : 0;
    drawFrame(ctx, img, this.x, this.y + 2 + bob, cx, cy, { alpha, ay: 21 });
    if (this.data && this.data.hasNews && this.data.hasNews(this.game.progress) && !this.talking) {
      const b = SPR.fx.bubble.dots;
      ctx.drawImage(b, Math.round(this.x - cx - 5), Math.round(this.y - cy - 34 + Math.sin(this.t * 0.1) * 1.5));
    }
  }

  drawShadow(ctx, cx, cy) {
    if (this.ghost) return;
    const s = SPR.fx.shadow.m;
    ctx.drawImage(s, Math.round(this.x - cx - s.width / 2), Math.round(this.y - cy - 1));
  }

  lights(out, cx, cy) {
    if (this.ghost) out.push({ x: this.x - cx, y: this.y - 10 - cy, r: 26, i: 0.6, color: P.silver });
    if (this.look === 'gert') out.push({ x: this.x - cx, y: this.y - 20 - cy, r: 40, i: 0.8, color: P.yellow });
  }
}
