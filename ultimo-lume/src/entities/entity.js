// Base entity + Actor (anything with health, knockback and hit reactions).
import { moveEntity } from '../systems/collision.js';
import { flashOf } from '../gfx/pixel.js';
import { SPR } from '../gfx/sprites/index.js';
import { P } from '../gfx/palette.js';
import { FX } from '../systems/particles.js';
import { TILE_PROPS } from '../world/tiletypes.js';

export class Entity {
  constructor(game, x, y) {
    this.game = game;
    this.x = x;
    this.y = y;
    this.z = 0;
    this.w = 12;
    this.h = 8;
    this.vx = 0;
    this.vy = 0;
    this.dead = false;
    this.solid = false;
    this.hurtbox = false;
    this.team = null;
    this.layer = 'main'; // 'floor' | 'main' | 'top'
    this.sortBias = 0;
    this.interactable = false;
    this.interactRange = 18;
    this.prompt = 'Esamina';
    this.t = 0;
  }

  get room() { return this.game.room; }
  get sortY() { return this.y + this.sortBias; }

  update() {}
  draw() {}
  drawShadow() {}
  takeHit() { return null; }
  onInteract() {}
  lights() {}

  remove() { this.dead = true; }

  distTo(e) { return Math.hypot(e.x - this.x, e.y - this.y); }
}

// Draw a frame with bottom-centre anchor at world position.
export function drawFrame(ctx, img, wx, wy, cx, cy, opts = {}) {
  if (!img) return;
  const ax = opts.ax ?? img.width / 2;
  const ay = opts.ay ?? img.height;
  const src = opts.flash ? flashOf(img) : img;
  const x = Math.round(wx - cx - ax), y = Math.round(wy - cy - ay);
  if (opts.alpha != null && opts.alpha < 1) {
    ctx.globalAlpha = Math.max(0, opts.alpha);
    ctx.drawImage(src, x, y);
    ctx.globalAlpha = 1;
  } else ctx.drawImage(src, x, y);
}

export class Actor extends Entity {
  constructor(game, x, y) {
    super(game, x, y);
    this.hurtbox = true;
    this.hp = 3;
    this.maxHp = 3;
    this.kbx = 0;
    this.kby = 0;
    this.flash = 0;
    this.invuln = 0;
    this.iframes = 8;
    this.poise = 0;
    this.shadow = 'm';
    this.moveMode = 'ground';
    this.hurtW = 12;
    this.hurtH = 14;
    this.hurtOY = 5;
    this.bloodColors = [P.white, P.silver];
  }

  moveBy(dx, dy, mode = this.moveMode) {
    return moveEntity(this, dx, dy, mode);
  }

  physics() {
    if (Math.abs(this.kbx) > 0.05 || Math.abs(this.kby) > 0.05) {
      this.moveBy(this.kbx, this.kby, this.moveMode === 'fly' ? 'fly' : 'knock');
      this.kbx *= 0.78;
      this.kby *= 0.78;
    } else {
      this.kbx = this.kby = 0;
    }
  }

  applyKnockback(hit, mult = 1) {
    const a = hit.kAngle ?? Math.atan2(this.y - hit.y, this.x - hit.x);
    const s = hit.knock * mult * (1 - this.poise);
    this.kbx = Math.cos(a) * s;
    this.kby = Math.sin(a) * s;
  }

  // Returns 'hit' | 'block' | 'ignore' | null
  takeHit(hit) {
    if (this.dead || this.invuln > 0) return null;
    const pre = this.beforeHit ? this.beforeHit(hit) : null;
    if (pre) return pre;
    const dmg = hit.damage * (this.damageMult ? this.damageMult(hit) : 1);
    this.hp -= dmg;
    this.flash = 7;
    this.invuln = this.iframes;
    this.applyKnockback(hit);
    const g = this.game;
    const px = (this.x + hit.x) / 2, py = (this.y - 6 + hit.y) / 2;
    FX.sparks(g.particles, px, py, 5);
    FX.blood(g.particles, this.x, this.y - 6, 4, this.bloodColors);
    g.spawnFx('star', px, py);
    if (this.hp <= 0) {
      this.hp = 0;
      this.die(hit);
    } else if (this.onHurt) this.onHurt(hit);
    return 'hit';
  }

  die() {
    this.dead = true;
  }

  // Common per-frame timers.
  tickTimers() {
    this.t++;
    if (this.flash > 0) this.flash--;
    if (this.invuln > 0) this.invuln--;
  }

  // Is the entity's centre over a pit / lava?
  hazardUnder() {
    const tt = this.room.tileAtPx(this.x, this.y);
    const p = TILE_PROPS[tt];
    if (p.pit) return 'pit';
    if (p.lava) return 'lava';
    return null;
  }

  drawShadow(ctx, cx, cy) {
    if (!this.shadow) return;
    const s = SPR.fx.shadow[this.shadow];
    ctx.drawImage(s, Math.round(this.x - cx - s.width / 2), Math.round(this.y - cy - s.height / 2 + 1));
  }
}
