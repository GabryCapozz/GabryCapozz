// Collectable pickups (coins, hearts, ammo, keys, upgrades) and loot tables.
import { Entity } from './entity.js';
import { SPR } from '../gfx/sprites/index.js';
import { P } from '../gfx/palette.js';
import { rand, chance } from '../core/math.js';
import { ITEMS } from '../data/items.js';
import { moveEntity } from '../systems/collision.js';

const COIN_VALUE = [1, 5, 20];

export class Pickup extends Entity {
  constructor(game, x, y, item, count = 1, o = {}) {
    super(game, x, y);
    this.item = item;
    this.count = count;
    this.w = 8;
    this.h = 6;
    this.z = o.pop ? 2 : 0;
    this.vz = o.pop ? rand(2, 3.2) : 0;
    this.vx = o.pop ? rand(-0.9, 0.9) : 0;
    this.vy = o.pop ? rand(-0.6, 0.6) : 0;
    this.life = o.temporary ? 600 : -1;
    this.persist = o.persist || null; // flag key: collected once forever
    this.present = !!o.present;
    this.delay = o.pop ? 20 : 0;
    this.tier = item === 'coin' ? (count >= 20 ? 2 : count >= 5 ? 1 : 0) : 0;
    this.bob = Math.random() * 6;
  }

  update() {
    this.t++;
    if (this.delay > 0) this.delay--;
    if (this.z > 0 || this.vz > 0) {
      this.vz -= 0.25;
      this.z += this.vz;
      if (this.z <= 0) {
        this.z = 0;
        this.vz = Math.abs(this.vz) > 0.8 ? -this.vz * 0.45 : 0;
      }
      moveEntity(this, this.vx, this.vy, 'fly');
      this.vx *= 0.96; this.vy *= 0.96;
    }
    if (this.life > 0 && --this.life === 0) this.dead = true;
    const pl = this.game.player;
    if (!pl || pl.state === 'dead' || this.delay > 0) return;
    const d = Math.hypot(pl.x - this.x, pl.y - 4 - this.y);
    // light magnet for small pickups
    if (!this.persist && d < 28 && d > 2) {
      this.x += ((pl.x - this.x) / d) * 1.4;
      this.y += ((pl.y - this.y) / d) * 1.4;
    }
    if (d < 10) this.collect();
  }

  collect() {
    if (this.dead) return;
    const g = this.game;
    // don't waste full-health hearts etc.
    this.dead = true;
    if (this.persist) g.progress.flags[this.persist] = true;
    g.giveItem(this.item, this.count, { present: this.present, source: this });
  }

  icon() {
    const I = SPR.items;
    switch (this.item) {
      case 'coin': return I.coin[this.tier][(this.t >> 3) % 4];
      case 'heart': return I.heart.full;
      case 'bombAmmo': return I.bomb;
      case 'arrowAmmo': return I.arrows;
      default: return I[ITEMS[this.item]?.icon] || I.coinIcon;
    }
  }

  draw(ctx, cx, cy) {
    if (this.life > 0 && this.life < 120 && (this.life >> 2) % 2 === 0) return;
    const img = this.icon();
    const hover = this.persist || this.present ? Math.round(Math.sin((this.t + this.bob) * 0.08) * 1.5) - 3 : 0;
    ctx.drawImage(img, Math.round(this.x - cx - img.width / 2), Math.round(this.y - cy - img.height + 2 - this.z + hover));
    if ((this.persist || this.present) && this.t % 40 < 8) {
      const s = SPR.fx.sparkle[Math.min(2, (this.t % 40) >> 2)];
      ctx.drawImage(s, Math.round(this.x - cx + 3), Math.round(this.y - cy - img.height - 2 + hover));
    }
  }

  drawShadow(ctx, cx, cy) {
    const s = SPR.fx.shadow.s;
    ctx.drawImage(s, Math.round(this.x - cx - 4), Math.round(this.y - cy));
  }

  lights(out, cx, cy) {
    if (this.persist || this.present) out.push({ x: this.x - cx, y: this.y - 6 - cy, r: 20, i: 0.6, color: P.gold });
  }
}

// ---- loot tables ----
export function dropLoot(game, x, y, table = 'common') {
  const pr = game.progress;
  const roll = Math.random();
  const add = (item, n) => game.addEntity(new Pickup(game, x, y, item, n, { pop: true, temporary: true }));
  const needHeart = pr.hp < pr.maxHp;
  switch (table) {
    case 'none': return;
    case 'grass':
      if (roll < 0.08) add('coin', 1);
      else if (roll < 0.14 && needHeart) add('heart', 1);
      return;
    case 'pot':
      if (roll < 0.3) add('coin', 1);
      else if (roll < 0.42) add('coin', 5);
      else if (roll < 0.55 && needHeart) add('heart', 1);
      else if (roll < 0.63 && pr.abilities.bombs) add('bombAmmo', 2);
      else if (roll < 0.7 && pr.abilities.bow) add('arrowAmmo', 5);
      return;
    case 'rich':
      add('coin', 5);
      if (chance(0.5)) add('coin', 5);
      if (chance(0.3)) add('coin', 20);
      return;
    case 'common':
    default:
      if (roll < 0.28) add('coin', 1);
      else if (roll < 0.36) add('coin', 5);
      else if (roll < 0.48 && needHeart) add('heart', 1);
      else if (roll < 0.53 && pr.abilities.bombs && pr.bombs < pr.bombMax) add('bombAmmo', 1);
      else if (roll < 0.58 && pr.abilities.bow && pr.arrows < pr.arrowMax) add('arrowAmmo', 3);
  }
}

export function coinBurst(game, x, y, total) {
  let left = total;
  while (left > 0) {
    const n = left >= 20 ? 20 : left >= 5 ? 5 : 1;
    game.addEntity(new Pickup(game, x, y, 'coin', n, { pop: true, temporary: true }));
    left -= n;
  }
}

export { COIN_VALUE };
