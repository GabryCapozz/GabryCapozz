// Projectiles & bombs for both the player and enemies.
import { Entity, drawFrame } from './entity.js';
import { SPR } from '../gfx/sprites/index.js';
import { arrowSprite } from '../gfx/sprites/fx.js';
import { P } from '../gfx/palette.js';
import { FX } from '../systems/particles.js';
import { TILE_PROPS, T } from '../world/tiletypes.js';
import { moveEntity } from '../systems/collision.js';
import { angleTo, rand } from '../core/math.js';

// ------------------------------------------------------------------ Bomb
export class Bomb extends Entity {
  constructor(game, x, y, vx = 0, vy = 0, vz = 0, owner = 'player') {
    super(game, x, y);
    this.w = 8; this.h = 6;
    this.vx = vx; this.vy = vy; this.vz = vz;
    this.fuse = 90;
    this.owner = owner;
  }

  update() {
    this.t++;
    if (this.z > 0 || this.vz > 0) {
      this.vz -= 0.35;
      this.z = Math.max(0, this.z + this.vz);
      const r = moveEntity(this, this.vx, this.vy, 'fly');
      if (r.x) this.vx *= -0.4;
      if (r.y) this.vy *= -0.4;
      if (this.z === 0 && this.vz < 0) {
        this.vz = Math.abs(this.vz) > 1.2 ? -this.vz * 0.35 : 0;
        this.vx *= 0.5; this.vy *= 0.5;
        this.game.audio.play('bombPlace', { x: this.x, y: this.y });
      }
    } else {
      this.vx *= 0.8; this.vy *= 0.8;
      moveEntity(this, this.vx, this.vy, 'fly');
      const tp = TILE_PROPS[this.room.tileAtPx(this.x, this.y)];
      if (tp.pit || tp.water) { this.dead = true; this.game.audio.play('splash', { x: this.x, y: this.y }); return; }
      if (tp.lava) { this.fuse = Math.min(this.fuse, 1); }
    }
    if (this.t % 6 === 0) this.game.particles.spawn({ x: this.x + 3, y: this.y - 12 - this.z, vx: rand(-0.3, 0.3), vy: -0.4, life: 12, colors: null, color: this.t % 12 ? P.yellow : P.orange, glow: 3 });
    if (this.t % 12 === 0) this.game.audio.play('fuse', { x: this.x, y: this.y });
    if (--this.fuse <= 0) this.explode();
  }

  explode() {
    this.dead = true;
    explosion(this.game, this.x, this.y - 4, this.owner === 'player' ? 'all' : 'hazard', 3, 30);
  }

  draw(ctx, cx, cy) {
    const img = SPR.items.bomb;
    const flash = this.fuse < 30 && (this.fuse >> 1) % 2 === 0;
    drawFrame(ctx, img, this.x, this.y + 3 - this.z, cx, cy, { flash, ay: 16 });
  }

  drawShadow(ctx, cx, cy) {
    const s = SPR.fx.shadow.s;
    ctx.drawImage(s, Math.round(this.x - cx - 4), Math.round(this.y - cy));
  }

  lights(out, cx, cy) { out.push({ x: this.x - cx, y: this.y - 10 - this.z - cy, r: 14, i: 0.6, color: P.orange }); }
}

// Shared explosion routine (bombs, boss attacks, barrels).
export function explosion(game, x, y, team = 'all', damage = 3, radius = 30) {
  game.spawnFx('explosion', x, y);
  game.audio.play('explosion', { x, y });
  game.camera.shake(0.55);
  game.flashScreen(P.white, 0.12);
  game.hitstop(3);
  game.combat.add({ owner: null, team, shape: 'circle', x, y, r: radius, damage, knock: 5, life: 4, flags: { bomb: true, heavy: true, fire: true, breaks: true, breaksGuard: true } });
  FX.shards(game.particles, x, y, 10, [P.orange, P.yellow, P.gray]);
  game.particles.burst(x, y, 14, { speed: 2.5, life: 34, colors: [P.gray, P.steel, P.silver], size: 2, drag: 0.9, kind: 'fade' });
  game.addLight(x, y, 90, 18, P.orange);
  // cracked walls in range
  const room = game.room;
  const r2 = radius + 10;
  for (let ty = Math.floor((y - r2) / 16); ty <= Math.floor((y + r2) / 16); ty++) {
    for (let tx = Math.floor((x - r2) / 16); tx <= Math.floor((x + r2) / 16); tx++) {
      if (room.tileAt(tx, ty) !== T.CRACKED || tx < 0 || ty < 0 || tx >= room.tw || ty >= room.th) continue;
      const d = Math.hypot(tx * 16 + 8 - x, ty * 16 + 8 - y);
      if (d <= r2 + 8) room.breakWall(tx, ty);
    }
  }
}

// ------------------------------------------------------------------ Generic projectile
export class Projectile extends Entity {
  constructor(game, x, y, angle, o) {
    super(game, x, y);
    this.angle = angle;
    this.speed = o.speed ?? 4;
    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;
    this.team = o.team || 'enemy';
    this.damage = o.damage ?? 1;
    this.knock = o.knock ?? 2;
    this.kind = o.kind || 'orb';
    this.life = o.life ?? 180;
    this.r = o.r ?? 4;
    this.z = o.z ?? 8;
    this.homing = o.homing || 0;
    this.pierce = !!o.pierce;
    this.flags = o.flags || {};
    this.overWater = o.overWater ?? true;
    this.w = 4; this.h = 4;
    this.layer = 'top';
    this.reflectable = !!o.reflectable;
    this.onDie = o.onDie || null;
    this.light = o.light ?? null;
    this.hit = game.combat.add({
      owner: this, team: this.team, shape: 'circle', x, y, r: this.r, damage: this.damage, knock: this.knock,
      life: 99999, flags: { ...this.flags, projectile: true },
      follow: (h) => { h.x = this.x; h.y = this.y; },
      onHit: (e, res) => this.onHitTarget(e, res),
    });
  }

  onHitTarget(e, res) {
    if (res === 'block' && this.kind === 'arrow' && this.team === 'enemy') {
      this.destroy(true);
      return;
    }
    if (!res) return;
    if (!this.pierce || e.team === 'player') this.destroy(res === 'hit');
    if (this.team === 'player' && res === 'hit' && (e.team === 'enemy' || e.isBoss)) {
      this.game.hitstop(2);
      this.game.audio.play('arrowHit', { x: this.x, y: this.y });
    }
  }

  update() {
    this.t++;
    if (this.homing) {
      const pl = this.game.player;
      const target = angleTo(this.x, this.y, pl.x, pl.y - 6);
      let d = target - this.angle;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      this.angle += Math.max(-this.homing, Math.min(this.homing, d));
      this.vx = Math.cos(this.angle) * this.speed;
      this.vy = Math.sin(this.angle) * this.speed;
    }
    this.x += this.vx;
    this.y += this.vy;
    const room = this.room;
    const tt = room.tileAtPx(this.x, this.y + this.z * 0);
    const tp = TILE_PROPS[tt];
    if (tp.blocksProj || this.x < -8 || this.y < -8 || this.x > room.tw * 16 + 8 || this.y > room.th * 16 + 8) {
      this.destroy(false, true);
      return;
    }
    // solid props (closed doors, blocks) stop projectiles
    for (const s of room.solids) {
      if (s.dead || !s.solid || s.projPass) continue;
      const bw = s.bw ?? s.w, bh = s.bh ?? s.h;
      if (Math.abs(s.x - this.x) < bw / 2 && Math.abs(s.y - this.y) < bh / 2 + 4) {
        if (s.onProjectile && s.onProjectile(this)) { this.destroy(true); return; }
        this.destroy(false, true);
        return;
      }
    }
    if (--this.life <= 0) this.destroy(false);
    if (this.kind === 'bolt' && this.t % 2 === 0) this.game.particles.spawn({ x: this.x, y: this.y - this.z, life: 10, color: P.cyan, drag: 0.9, glow: 4 });
    if (this.kind === 'fire' && this.t % 3 === 0) FX.embers(this.game.particles, this.x, this.y - this.z, 1);
  }

  destroy(hitSomething, wall = false) {
    if (this.dead) return;
    this.dead = true;
    this.hit.life = 0;
    const g = this.game;
    if (this.kind === 'arrow') {
      if (wall) { g.audio.play('arrowHit', { x: this.x, y: this.y }); FX.sparks(g.particles, this.x, this.y - this.z, 3, [P.tan, P.white]); }
    } else {
      const cols = this.kind === 'bolt' ? [P.white, P.cyan, P.blue] : this.kind === 'acid' ? [P.greenL, P.green] : this.kind === 'fire' ? [P.yellow, P.orange] : this.kind === 'rock' ? [P.gray, P.steel] : [P.pink, P.purple, P.white];
      g.particles.burst(this.x, this.y - this.z, 8, { speed: 1.6, life: 18, colors: cols, drag: 0.88 });
      if (this.kind === 'rock') g.audio.play('rockBreak', { x: this.x, y: this.y, vol: 0.5 });
    }
    if (this.onDie) this.onDie(this, hitSomething);
  }

  draw(ctx, cx, cy) {
    const x = this.x, y = this.y - this.z;
    let img;
    switch (this.kind) {
      case 'arrow': img = arrowSprite(this.angle, 'arrow'); break;
      case 'enemyArrow': img = arrowSprite(this.angle, 'enemy'); break;
      case 'bolt': img = arrowSprite(this.angle, 'bolt'); break;
      case 'rock': img = SPR.fx.rock; break;
      case 'acid': img = SPR.fx.acid[(this.t >> 3) % 2]; break;
      case 'fire': img = SPR.fx.orbFire[(this.t >> 2) % 4]; break;
      case 'cyan': img = SPR.fx.orbCyan[(this.t >> 2) % 4]; break;
      case 'void': img = SPR.fx.orbVoid[(this.t >> 2) % 4]; break;
      default: img = SPR.fx.orb[(this.t >> 2) % 4];
    }
    ctx.drawImage(img, Math.round(x - cx - img.width / 2), Math.round(y - cy - img.height / 2));
  }

  drawShadow(ctx, cx, cy) {
    if (this.kind === 'arrow' || this.kind === 'enemyArrow') return;
    const s = SPR.fx.shadow.s;
    ctx.drawImage(s, Math.round(this.x - cx - 4), Math.round(this.y - cy));
  }

  lights(out, cx, cy) {
    if (this.kind === 'arrow' || this.kind === 'enemyArrow' || this.kind === 'rock') return;
    const color = this.kind === 'bolt' || this.kind === 'cyan' ? P.cyan : this.kind === 'fire' ? P.orange : this.kind === 'acid' ? P.greenL : P.pink;
    out.push({ x: this.x - cx, y: this.y - this.z - cy, r: this.light || 22, i: 0.8, color });
  }
}
