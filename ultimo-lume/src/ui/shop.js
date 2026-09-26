// Merchant shop and blacksmith forge modals.
import { P } from '../gfx/palette.js';
import { font } from '../gfx/font.js';
import { SPR } from '../gfx/sprites/index.js';
import { panel, cursor, dim, paragraph } from './draw.js';
import { SHOPS, FORGE } from '../data/npcs.js';
import { ITEMS } from '../data/items.js';

export class ShopMenu {
  constructor(game) {
    this.game = game;
    this.active = false;
    this.sel = 0;
    this.t = 0;
    this.kind = 'shop';
    this.msg = '';
    this.msgT = 0;
  }

  open(kind, id) {
    this.active = true;
    this.kind = kind;
    this.id = id;
    this.sel = 0;
    this.msg = '';
    this.game.input.clearAll();
  }

  close() {
    this.active = false;
    this.game.input.clearAll();
    this.game.audio.play('uiBack');
  }

  stock() {
    const pr = this.game.progress;
    return SHOPS[this.id].filter((s) => (!s.need || s.need(pr)) && !(s.once && pr.flags['bought.' + s.id]));
  }

  say(text) { this.msg = text; this.msgT = 120; }

  update() {
    const inp = this.game.input;
    this.t++;
    if (this.msgT > 0) this.msgT--;
    if (inp.pressed('cancel')) return this.close();
    if (this.kind === 'forge') return this.updateForge(inp);
    const list = this.stock();
    const n = list.length + 1;
    if (inp.repeat('up')) { this.sel = (this.sel + n - 1) % n; this.game.audio.play('uiMove'); }
    if (inp.repeat('down')) { this.sel = (this.sel + 1) % n; this.game.audio.play('uiMove'); }
    if (inp.pressed('confirm')) {
      if (this.sel === list.length) return this.close();
      const it = list[this.sel];
      const pr = this.game.progress;
      if (it.full && it.full(pr)) { this.say('Ne hai già abbastanza.'); this.game.audio.play('uiError'); return; }
      if (pr.coins < it.price) { this.say('Non hai abbastanza monete.'); this.game.audio.play('uiError'); return; }
      pr.coins -= it.price;
      if (it.once) pr.flags['bought.' + it.id] = true;
      this.game.giveItem(it.item, it.count, { silent: true });
      this.game.audio.play('coin');
      this.say(`Grazie! ${it.name}.`);
      if (this.sel >= this.stock().length) this.sel = Math.max(0, this.stock().length - 1);
    }
  }

  nextForge() {
    const pr = this.game.progress;
    return FORGE.find((f) => f.lv === pr.swordLv + 1) || null;
  }

  updateForge(inp) {
    if (inp.repeat('up') || inp.repeat('down')) { this.sel = 1 - this.sel; this.game.audio.play('uiMove'); }
    if (!inp.pressed('confirm')) return;
    if (this.sel === 1) return this.close();
    const f = this.nextForge();
    const pr = this.game.progress;
    if (!f) { this.say('La tua lama è già la migliore che io sappia fare.'); return; }
    if ((pr.items[f.mat] || 0) < f.n) { this.say(`Mi servono ${f.n} x ${ITEMS[f.mat].name}.`); this.game.audio.play('uiError'); return; }
    if (pr.coins < f.coins) { this.say('Il carbone costa. Portami più monete.'); this.game.audio.play('uiError'); return; }
    pr.items[f.mat] -= f.n;
    pr.coins -= f.coins;
    pr.swordLv = f.lv;
    this.game.audio.play('clank');
    setTimeout(() => this.game.audio.play('clank'), 220);
    setTimeout(() => this.game.audio.play('item'), 480);
    this.say(`${f.text}! La spada ora infligge più danni.`);
    this.game.autosave();
  }

  draw(ctx) {
    if (!this.active) return;
    dim(ctx, 0.5);
    const x = 96, y = 30, w = 288, h = 200;
    panel(ctx, x, y, w, h);
    const pr = this.game.progress;
    ctx.drawImage(SPR.items.coinIcon, x + w - 58, y + 8);
    font.draw(ctx, String(pr.coins), x + w - 12, y + 12, P.yellow, { align: 'right' });
    if (this.kind === 'forge') this.drawForge(ctx, x, y, w, h);
    else this.drawShop(ctx, x, y, w, h);
    if (this.msgT > 0) {
      panel(ctx, x + 10, y + h - 30, w - 20, 22, 'light');
      font.draw(ctx, this.msg, x + w / 2, y + h - 23, P.white, { align: 'center' });
    }
  }

  drawShop(ctx, x, y, w) {
    font.draw(ctx, 'Bottega di Brann', x + 12, y + 12, P.gold);
    const list = this.stock();
    list.forEach((it, i) => {
      const yy = y + 34 + i * 20;
      const sel = i === this.sel;
      const icon = SPR.items[ITEMS[it.item].icon];
      ctx.drawImage(icon, x + 22, yy - 3);
      const pr = this.game.progress;
      const afford = pr.coins >= it.price && !(it.full && it.full(pr));
      font.draw(ctx, it.name, x + 42, yy + 1, sel ? P.white : afford ? P.sand : P.steel);
      font.draw(ctx, String(it.price), x + w - 16, yy + 1, afford ? P.yellow : P.redD, { align: 'right' });
      if (sel) cursor(ctx, x + 10, yy + 2, this.t);
    });
    const yy = y + 34 + list.length * 20;
    font.draw(ctx, 'Esci', x + 42, yy + 1, this.sel === list.length ? P.white : P.gray);
    if (this.sel === list.length) cursor(ctx, x + 10, yy + 2, this.t);
    const it = list[this.sel];
    if (it) paragraph(ctx, ITEMS[it.item].desc || '', x + 14, y + 150, w - 28, P.steel);
  }

  drawForge(ctx, x, y, w) {
    font.draw(ctx, 'Forgia di Oda', x + 12, y + 12, P.gold);
    const pr = this.game.progress;
    const f = this.nextForge();
    ctx.drawImage(SPR.items.sword, x + 16, y + 34);
    font.draw(ctx, `Spada attuale: livello ${pr.swordLv}`, x + 38, y + 38, P.sand);
    if (f) {
      font.draw(ctx, `Prossimo: ${f.text} (liv. ${f.lv})`, x + 16, y + 62, P.white);
      const have = pr.items[f.mat] || 0;
      ctx.drawImage(SPR.items[ITEMS[f.mat].icon], x + 16, y + 78);
      font.draw(ctx, `${ITEMS[f.mat].name}: ${have}/${f.n}`, x + 38, y + 82, have >= f.n ? P.greenL : P.salmon);
      ctx.drawImage(SPR.items.coinIcon, x + 16, y + 98);
      font.draw(ctx, `Monete: ${f.coins}`, x + 38, y + 102, pr.coins >= f.coins ? P.greenL : P.salmon);
    } else {
      font.draw(ctx, 'Non c\'è altro da migliorare.', x + 16, y + 62, P.gray);
    }
    ['Migliora la spada', 'Esci'].forEach((s, i) => {
      const yy = y + 128 + i * 16;
      font.draw(ctx, s, x + 30, yy, this.sel === i ? P.white : P.gray);
      if (this.sel === i) cursor(ctx, x + 18, yy + 1, this.t);
    });
  }
}
