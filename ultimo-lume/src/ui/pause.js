// Pause menu with tabs: Inventory, Abilities, Map, Options, System.
import { P } from '../gfx/palette.js';
import { font } from '../gfx/font.js';
import { SPR } from '../gfx/sprites/index.js';
import { panel, cursor, dim, paragraph, keyCap } from './draw.js';
import { ITEMS, ARTIFACTS, MATERIALS, TOTAL_PAGES } from '../data/items.js';
import { ABILITIES, ABILITY_ORDER } from '../systems/abilities.js';
import { SettingsMenu } from './settings.js';
import { MapView } from './mapview.js';
import { formatTime } from '../systems/save.js';
import { REGIONS } from '../data/regions.js';

const TABS = ['Inventario', 'Abilità', 'Mappa', 'Opzioni', 'Sistema'];
const X = 14, Y = 10, WD = 452, HT = 250;

export class PauseMenu {
  constructor(game) {
    this.game = game;
    this.active = false;
    this.tab = 0;
    this.focus = 'tabs';
    this.t = 0;
    this.invSel = 0;
    this.abSel = 0;
    this.sysSel = 0;
    this.settings = new SettingsMenu(game.app);
    this.map = new MapView(game);
  }

  open(tab = 0, focusContent = false) {
    this.active = true;
    this.tab = tab;
    this.focus = focusContent ? 'content' : 'tabs';
    this.map.reset();
    this.settings.mode = 'main';
    this.game.audio.play('menuOpen');
    this.game.input.clearAll();
  }

  close() {
    this.active = false;
    this.game.audio.play('uiBack');
    this.game.input.clearAll();
  }

  update() {
    const inp = this.game.input;
    this.t++;
    if (this.focus === 'tabs') {
      if (inp.repeat('left')) { this.tab = (this.tab + TABS.length - 1) % TABS.length; this.game.audio.play('uiMove'); }
      if (inp.repeat('right')) { this.tab = (this.tab + 1) % TABS.length; this.game.audio.play('uiMove'); }
      if (inp.pressed('confirm') || inp.pressed('down')) { this.focus = 'content'; this.game.audio.play('uiSelect'); if (this.tab === 2) this.map.reset(); }
      if (inp.pressed('cancel') || inp.pressed('pause')) this.close();
      return;
    }
    // content focus
    switch (this.tab) {
      case 0: this.updateInventory(inp); break;
      case 1: this.updateAbilities(inp); break;
      case 2:
        if (inp.pressed('pause') || (inp.pressed('cancel') && !inp.pressed('dodge'))) { this.focus = 'tabs'; this.game.audio.play('uiBack'); return; }
        this.map.update();
        break;
      case 3:
        if (this.settings.update() === 'back') this.focus = 'tabs';
        break;
      case 4: this.updateSystem(inp); break;
      default: break;
    }
    if (inp.pressed('pause') && this.tab !== 3) this.close();
  }

  // ---------------- inventory
  entries() {
    const pr = this.game.progress;
    const out = [];
    const push = (id, count, extra = {}) => out.push({ id, count, ...extra });
    push('potion', `${pr.potions}/${pr.potionMax}`);
    if (pr.abilities.bombs) push('bombAmmo', `${pr.bombs}/${pr.bombMax}`, { name: 'Bombe', desc: 'Munizioni per le bombe. Si trovano nei vasi o da Brann.' });
    if (pr.abilities.bow) push('arrowAmmo', `${pr.arrows}/${pr.arrowMax}`, { name: 'Frecce', desc: 'Munizioni per l\'arco.' });
    if (pr.abilities.lantern) push('lantern', '');
    push('heartPiece', `${pr.heartPieces}/4`, { desc: 'Quattro frammenti formano un nuovo cuore. Sono nascosti nei luoghi più remoti.' });
    for (const a of ARTIFACTS) push(a, pr.items[a] ? '' : null, { locked: !pr.items[a] });
    for (const m of MATERIALS) if (pr.items[m]) push(m, 'x' + pr.items[m]);
    if (pr.items.toyHorse) push('toyHorse', '');
    if (pr.items.locket) push('locket', '');
    if (pr.items.page) push('page', `${pr.items.page}/${TOTAL_PAGES}`);
    return out;
  }

  updateInventory(inp) {
    const n = this.entries().length;
    const cols = 6;
    if (inp.repeat('left')) this.invSel = Math.max(0, this.invSel - 1);
    if (inp.repeat('right')) this.invSel = Math.min(n - 1, this.invSel + 1);
    if (inp.repeat('up')) this.invSel = Math.max(0, this.invSel - cols);
    if (inp.repeat('down')) this.invSel = Math.min(n - 1, this.invSel + cols);
    if (inp.state.left.pressed || inp.state.right.pressed || inp.state.up.pressed || inp.state.down.pressed) this.game.audio.play('uiMove');
    if (inp.pressed('cancel')) { this.focus = 'tabs'; this.game.audio.play('uiBack'); }
  }

  drawInventory(ctx, x, y, w, h) {
    const pr = this.game.progress;
    const list = this.entries();
    this.invSel = Math.min(this.invSel, list.length - 1);
    const cols = 6, cs = 26;
    list.forEach((e, i) => {
      const cx = x + 6 + (i % cols) * cs, cy = y + 6 + Math.floor(i / cols) * cs;
      panel(ctx, cx, cy, cs - 2, cs - 2, i === this.invSel && this.focus === 'content' ? 'light' : 'dark');
      const def = ITEMS[e.id];
      const icon = SPR.items[def?.icon];
      if (icon) {
        if (e.locked) { ctx.globalAlpha = 0.25; ctx.drawImage(icon, cx + 4, cy + 3); ctx.globalAlpha = 1; }
        else ctx.drawImage(icon, cx + 4, cy + 3);
      }
      if (e.count) font.draw(ctx, e.count, cx + cs - 4, cy + cs - 12, P.white, { align: 'right' });
    });
    // description
    const sel = list[this.invSel];
    const dx = x + cols * cs + 16, dw = w - (cols * cs + 16);
    panel(ctx, dx, y + 4, dw, 112, 'dark');
    if (sel) {
      const def = ITEMS[sel.id] || {};
      const name = sel.locked ? '???' : sel.name || def.name;
      font.draw(ctx, name, dx + 10, y + 12, P.gold);
      const desc = sel.locked ? 'Un sigillo custodito da un guardiano. Ancora lontano.' : sel.desc || def.desc || '';
      paragraph(ctx, desc, dx + 10, y + 28, dw - 20, P.sand);
    }
    // stats
    const sy = y + 126;
    panel(ctx, dx, sy, dw, 78, 'dark');
    const hearts = pr.maxHp / 2;
    const lines = [
      [`Cuori`, `${hearts}`],
      [`Vigore`, `${pr.maxStamina}`],
      [`Spada`, `Livello ${pr.swordLv}`],
      [`Tempo`, formatTime(pr.playTime)],
      [`Segreti`, `${pr.stats.secrets || 0}`],
    ];
    lines.forEach(([a, b], i) => {
      font.draw(ctx, a, dx + 10, sy + 8 + i * 13, P.gray);
      font.draw(ctx, b, dx + dw - 10, sy + 8 + i * 13, P.sand, { align: 'right' });
    });
    // coins & keys under grid
    const gy = y + 6 + Math.ceil(list.length / cols) * cs + 10;
    ctx.drawImage(SPR.items.coinIcon, x + 6, gy);
    font.draw(ctx, String(pr.coins), x + 24, gy + 4, P.yellow);
    const region = this.game.room.def.dungeon;
    if (region) {
      ctx.drawImage(SPR.items.key, x + 70, gy);
      font.draw(ctx, String(pr.keys[region] || 0), x + 88, gy + 4, P.sand);
    }
  }

  // ---------------- abilities
  abilityList() {
    return ['dodge', 'charge', ...ABILITY_ORDER, 'lantern'];
  }

  updateAbilities(inp) {
    const list = this.abilityList();
    if (inp.repeat('up')) { this.abSel = (this.abSel + list.length - 1) % list.length; this.game.audio.play('uiMove'); }
    if (inp.repeat('down')) { this.abSel = (this.abSel + 1) % list.length; this.game.audio.play('uiMove'); }
    const id = list[this.abSel];
    const pr = this.game.progress;
    if (inp.pressed('confirm') && ABILITY_ORDER.includes(id) && pr.abilities[id]) {
      pr.equipped = id;
      this.game.audio.play('uiSelect');
      this.game.hud.bumpAbility();
    }
    if (inp.pressed('cancel')) { this.focus = 'tabs'; this.game.audio.play('uiBack'); }
  }

  drawAbilities(ctx, x, y, w, h) {
    const pr = this.game.progress;
    const list = this.abilityList();
    list.forEach((id, i) => {
      const a = ABILITIES[id];
      const owned = pr.abilities[id];
      const yy = y + 6 + i * 25;
      const sel = i === this.abSel && this.focus === 'content';
      panel(ctx, x + 4, yy, 190, 23, sel ? 'light' : 'dark');
      if (owned) ctx.drawImage(SPR.items[a.icon], x + 9, yy + 3);
      font.draw(ctx, owned ? a.name : '???', x + 30, yy + 7, owned ? (pr.equipped === id ? P.gold : P.sand) : P.steel);
      if (pr.equipped === id) font.draw(ctx, 'E', x + 182, yy + 7, P.gold, { align: 'right' });
    });
    const id = list[this.abSel];
    const a = ABILITIES[id];
    const owned = pr.abilities[id];
    const dx = x + 204, dw = w - 208;
    panel(ctx, dx, y + 6, dw, 120);
    font.draw(ctx, owned ? a.name : 'Abilità sconosciuta', dx + 10, y + 14, P.gold);
    paragraph(ctx, owned ? a.desc : 'Esplora Velmora per scoprirla.', dx + 10, y + 30, dw - 20);
    if (owned && ABILITY_ORDER.includes(id)) {
      const ly = y + 104;
      let lx = dx + 10;
      lx += keyCap(ctx, this.game.input.primaryLabel('attack'), lx, ly) + 4;
      font.draw(ctx, pr.equipped === id ? 'Equipaggiata' : 'Equipaggia', lx, ly + 2, P.gray);
    }
    const ty = y + 134;
    panel(ctx, dx, ty, dw, 72);
    const I = this.game.input;
    const tips = [
      ['Abilità', 'ability'], ['Cambia', 'cycle'], ['Schivata', 'dodge'], ['Corsa', 'run'],
    ];
    tips.forEach(([label, act], i) => {
      const lx = dx + 10 + (i % 2) * (dw / 2 - 4), ly = ty + 10 + Math.floor(i / 2) * 18;
      const kw = keyCap(ctx, I.primaryLabel(act), lx, ly);
      font.draw(ctx, label, lx + kw + 4, ly + 2, P.sand);
    });
    font.draw(ctx, 'Tieni premuto Attacco per il Fendente Rotante', dx + 10, ty + 50, pr.abilities.charge ? P.gray : P.navy);
  }

  // ---------------- system
  updateSystem(inp) {
    const opts = 2;
    if (inp.repeat('up') || inp.repeat('down')) { this.sysSel = (this.sysSel + 1) % opts; this.game.audio.play('uiMove'); }
    if (inp.pressed('confirm')) {
      this.game.audio.play('uiSelect');
      if (this.sysSel === 0) this.close();
      else this.game.quitToTitle();
    }
    if (inp.pressed('cancel')) { this.focus = 'tabs'; this.game.audio.play('uiBack'); }
  }

  drawSystem(ctx, x, y, w) {
    const pr = this.game.progress;
    const items = ['Riprendi', 'Salva ed esci al titolo'];
    items.forEach((it, i) => {
      const yy = y + 20 + i * 18;
      const sel = i === this.sysSel && this.focus === 'content';
      font.draw(ctx, it, x + 30, yy, sel ? P.white : P.gray);
      if (sel) cursor(ctx, x + 18, yy + 1, this.t);
    });
    const info = [
      `Slot ${this.game.slot + 1}`,
      `Tempo di gioco: ${formatTime(pr.playTime)}`,
      `Regione: ${REGIONS[this.game.room.region]?.name || ''}`,
      `Cadute: ${pr.deaths}`,
    ];
    info.forEach((s, i) => font.draw(ctx, s, x + 30, y + 80 + i * 12, P.steel));
    paragraph(ctx, 'Il gioco salva automaticamente quando riposi a un braciere, entri in una nuova zona o ottieni qualcosa di importante.', x + 30, y + 140, w - 60, P.steel);
  }

  draw(ctx) {
    if (!this.active) return;
    dim(ctx, 0.65);
    panel(ctx, X, Y, WD, HT);
    // tabs
    const tw = WD / TABS.length;
    TABS.forEach((name, i) => {
      const cx = X + tw * i + tw / 2;
      const sel = i === this.tab;
      font.draw(ctx, name, cx, Y + 9, sel ? (this.focus === 'tabs' ? P.white : P.gold) : P.steel, { align: 'center' });
      if (sel) {
        ctx.fillStyle = P.gold;
        const w = font.measure(name) + 8;
        ctx.fillRect(Math.round(cx - w / 2), Y + 20, w, 1);
        if (this.focus === 'tabs') {
          ctx.fillRect(Math.round(cx - w / 2) - 6, Y + 11, 3, 3);
          ctx.fillRect(Math.round(cx + w / 2) + 3, Y + 11, 3, 3);
        }
      }
    });
    ctx.fillStyle = P.slate;
    ctx.fillRect(X + 6, Y + 24, WD - 12, 1);
    const cx = X + 8, cy = Y + 30, cw = WD - 16, ch = HT - 38;
    switch (this.tab) {
      case 0: this.drawInventory(ctx, cx, cy, cw, ch); break;
      case 1: this.drawAbilities(ctx, cx, cy, cw, ch); break;
      case 2: this.map.draw(ctx, cx, cy, cw, ch, this.focus === 'content'); break;
      case 3: this.settings.draw(ctx, cx + 30, cy + 14, cw - 60); break;
      case 4: this.drawSystem(ctx, cx, cy, cw); break;
      default: break;
    }
    if (this.focus === 'tabs') font.draw(ctx, '←→ scegli · conferma per entrare · indietro per chiudere', 240, Y + HT - 13, P.steel, { align: 'center' });
  }
}
