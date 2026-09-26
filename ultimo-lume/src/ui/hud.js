// Minimal HUD: hearts, stamina, equipped ability, potions, coins, keys, boss bar,
// region banners, toasts, interaction prompts and the save indicator.
import { P } from '../gfx/palette.js';
import { font } from '../gfx/font.js';
import { SPR } from '../gfx/sprites/index.js';
import { panel, keyCap, bar } from './draw.js';
import { ABILITIES } from '../systems/abilities.js';

export class Hud {
  constructor(game) {
    this.game = game;
    this.heartPulse = 0;
    this.abilityBump = 0;
    this.banner = null;
    this.toasts = [];
    this.saving = 0;
    this.boss = null;
    this.bossShown = 0;
    this.visible = true;
    this.coinShown = 0;
  }

  pulseHearts() { this.heartPulse = 14; }
  bumpAbility() { this.abilityBump = 10; }
  showBanner(text, sub = '') { this.banner = { text, sub, t: 0 }; }
  toast(text, frames = 120) {
    this.toasts = this.toasts.filter((t) => t.text !== text);
    this.toasts.push({ text, t: 0, life: frames });
    if (this.toasts.length > 3) this.toasts.shift();
  }
  showSaving() { this.saving = 90; }
  setBoss(boss) { this.boss = boss; this.bossShown = boss ? boss.hp : 0; }

  update() {
    if (this.heartPulse > 0) this.heartPulse--;
    if (this.abilityBump > 0) this.abilityBump--;
    if (this.saving > 0) this.saving--;
    if (this.banner && ++this.banner.t > 220) this.banner = null;
    for (const t of this.toasts) t.t++;
    this.toasts = this.toasts.filter((t) => t.t < t.life);
    const pr = this.game.progress;
    if (this.coinShown !== pr.coins) this.coinShown += Math.sign(pr.coins - this.coinShown) * Math.max(1, Math.floor(Math.abs(pr.coins - this.coinShown) / 8));
    if (this.boss) {
      if (this.boss.dead && this.boss.hp <= 0 && this.bossShown <= 0.5) this.boss = null;
      else this.bossShown += (Math.max(0, this.boss.hp) - this.bossShown) * 0.08;
    }
  }

  draw(ctx) {
    const g = this.game;
    const pr = g.progress;
    const pl = g.player;
    if (!this.visible || !pl) return;
    const t = g.time;

    // hearts
    const hearts = pr.maxHp / 2;
    for (let i = 0; i < hearts; i++) {
      const v = pr.hp - i * 2;
      const img = v >= 2 ? SPR.items.heart.full : v === 1 ? SPR.items.heart.half : SPR.items.heart.empty;
      let y = 5;
      if (this.heartPulse > 0 && (this.heartPulse >> 1) % 2 === 0) y -= 1;
      if (pr.hp <= 2 && v > 0 && (t >> 4) % 2 === 0) y -= 1;
      ctx.drawImage(img, 5 + i * 10, y);
    }
    // heart pieces indicator
    if (pr.heartPieces > 0) {
      const x = 5 + hearts * 10 + 3;
      ctx.fillStyle = P.ink;
      ctx.fillRect(x, 8, 7, 7);
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = i < pr.heartPieces ? P.red : P.plum;
        ctx.fillRect(x + 1 + (i % 2) * 3, 9 + (i >> 1) * 3, 2, 2);
      }
    }
    // stamina
    const sw = Math.round(pr.maxStamina * 0.62);
    const sf = pl.stamina / pr.maxStamina;
    const flash = pl.stamFlash > 0 && (pl.stamFlash >> 2) % 2 === 0;
    bar(ctx, 8, 18, sw, 3, sf, flash ? P.red : sf < 0.25 ? P.gold : P.greenL, P.teal);

    // potions + coins + keys
    let x = 7;
    const y = 25;
    ctx.drawImage(SPR.items.potion, x - 3, y - 2);
    font.draw(ctx, `${pr.potions}/${pr.potionMax}`, x + 13, y + 2, pr.potions > 0 ? P.sand : P.gray);
    x += 44;
    ctx.drawImage(SPR.items.coinIcon, x - 3, y - 2);
    font.draw(ctx, String(Math.round(this.coinShown)), x + 13, y + 2, P.yellow);
    const region = g.room.def.dungeon;
    if (region) {
      x += 38;
      ctx.drawImage(SPR.items.key, x - 3, y - 2);
      font.draw(ctx, String(pr.keys[region] || 0), x + 13, y + 2, P.sand);
      if (pr.bossKeys[region] === true) ctx.drawImage(SPR.items.bossKey, x + 20, y - 2);
    }

    // equipped ability (top right)
    const id = pr.equipped;
    const bx = 480 - 34, by = 5;
    panel(ctx, bx, by - (this.abilityBump > 6 ? 1 : 0), 29, 27);
    if (id) {
      const icon = SPR.items[ABILITIES[id].icon];
      ctx.drawImage(icon, bx + 6, by + 3);
      let count = null;
      if (id === 'bombs') count = pr.bombs;
      if (id === 'bow') count = pr.arrows;
      if (count != null) font.draw(ctx, String(count), bx + 26, by + 16, count > 0 ? P.white : P.red, { align: 'right' });
    } else {
      font.draw(ctx, '-', bx + 14, by + 9, P.gray, { align: 'center' });
    }
    keyCap(ctx, g.input.primaryLabel('ability'), bx - 12, by + 16);

    // interact prompt
    const target = g.interactTarget;
    if (target && pl.state === 'move' && !g.dialogue.active) {
      const label = g.input.primaryLabel('interact');
      const text = target.prompt || 'Esamina';
      const w = font.measure(text) + 14 + font.measure(label);
      const px = Math.round(target.x - g.camera.rx - w / 2);
      const py = Math.round(target.y - g.camera.ry - (target.promptY || 34) + Math.sin(t * 0.12) * 1.2);
      ctx.fillStyle = 'rgba(14,11,22,0.75)';
      ctx.fillRect(px - 2, py - 1, w + 4, 13);
      const kw = keyCap(ctx, label, px, py);
      font.draw(ctx, text, px + kw + 3, py + 2, P.white);
    }

    // boss bar
    if (this.boss) {
      const w = 240, bxx = 240 - w / 2, byy = 248;
      font.draw(ctx, this.boss.bossName, 240, byy - 11, P.sand, { align: 'center' });
      bar(ctx, bxx, byy, w, 5, this.bossShown / this.boss.maxHp, P.red, P.plum);
      ctx.fillStyle = P.salmon;
      ctx.fillRect(bxx, byy, Math.round(w * Math.max(0, this.boss.hp) / this.boss.maxHp), 1);
      // phase ticks
      ctx.fillStyle = P.ink;
      for (const f of this.boss.phaseMarks || []) ctx.fillRect(Math.round(bxx + w * f), byy, 1, 5);
    }

    // region banner
    if (this.banner) {
      const b = this.banner;
      const a = b.t < 30 ? b.t / 30 : b.t > 170 ? (220 - b.t) / 50 : 1;
      ctx.globalAlpha = Math.max(0, a);
      const tw = font.measure(b.text);
      ctx.fillStyle = 'rgba(14,11,22,0.55)';
      ctx.fillRect(240 - tw / 2 - 30, 44, tw + 60, b.sub ? 28 : 16);
      ctx.fillStyle = P.gold;
      ctx.fillRect(240 - tw / 2 - 24, 51, 16, 1);
      ctx.fillRect(240 + tw / 2 + 8, 51, 16, 1);
      font.draw(ctx, b.text, 240, 47, P.sand, { align: 'center' });
      if (b.sub) font.draw(ctx, b.sub, 240, 60, P.gray, { align: 'center' });
      ctx.globalAlpha = 1;
    }

    // toasts
    let ty = this.boss ? 222 : 246;
    for (let i = this.toasts.length - 1; i >= 0; i--) {
      const tt = this.toasts[i];
      const a = Math.min(1, tt.t / 8, (tt.life - tt.t) / 15);
      ctx.globalAlpha = Math.max(0, a);
      const w = font.measure(tt.text) + 12;
      ctx.fillStyle = 'rgba(14,11,22,0.8)';
      ctx.fillRect(Math.round(240 - w / 2), ty - 2, w, 13);
      font.draw(ctx, tt.text, 240, ty, P.sand, { align: 'center' });
      ctx.globalAlpha = 1;
      ty -= 15;
    }

    // save indicator
    if (this.saving > 0) {
      const f = SPR.props.flameSmall[(t >> 3) % 4];
      ctx.globalAlpha = Math.min(1, this.saving / 20);
      ctx.drawImage(f, 480 - 18, 270 - 20);
      font.draw(ctx, 'Salvataggio', 480 - 22, 270 - 14, P.sand, { align: 'right' });
      ctx.globalAlpha = 1;
    }

    // low health vignette
    if (pr.hp > 0 && pr.hp <= 2) {
      const a = 0.12 + Math.sin(t * 0.12) * 0.06;
      ctx.fillStyle = `rgba(162,38,51,${a})`;
      ctx.fillRect(0, 0, 480, 3); ctx.fillRect(0, 267, 480, 3);
      ctx.fillRect(0, 0, 3, 270); ctx.fillRect(477, 0, 3, 270);
    }
  }
}
