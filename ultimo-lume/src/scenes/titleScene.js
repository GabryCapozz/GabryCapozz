// Title screen: animated backdrop, main menu, 3 save slots, options, credits.
import { W, H } from '../core/constants.js';
import { P } from '../gfx/palette.js';
import { font } from '../gfx/font.js';
import { makeCanvas } from '../gfx/pixel.js';
import { SPR } from '../gfx/sprites/index.js';
import { panel, cursor, dim, keyCap } from '../ui/draw.js';
import { SettingsMenu } from '../ui/settings.js';
import { slotSummaries, newProgress, loadSlot, deleteSlot, saveSettings, formatTime, storageIsPersistent, SLOTS } from '../systems/save.js';
import { REGIONS } from '../data/regions.js';
import { mulberry32, bayer } from '../core/math.js';

let backdrop = null;

function buildBackdrop() {
  const c = makeCanvas(W, H);
  const ctx = c.getContext('2d');
  // dithered night sky bands
  const bands = [P.void, P.black, P.navy, '#2c2447', P.purple];
  for (let y = 0; y < H; y++) {
    const t = y / H;
    for (let x = 0; x < W; x++) {
      const v = t * (bands.length - 1) + (bayer(x, y) - 0.5) * 0.9;
      ctx.fillStyle = bands[Math.max(0, Math.min(bands.length - 1, Math.round(v)))];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  const rng = mulberry32(7);
  for (let i = 0; i < 90; i++) {
    ctx.fillStyle = rng() < 0.2 ? P.white : rng() < 0.5 ? P.silver : P.steel;
    ctx.fillRect((rng() * W) | 0, (rng() * H * 0.6) | 0, 1, 1);
  }
  // distant mountains
  ctx.fillStyle = '#211b33';
  for (let x = 0; x < W; x++) {
    const h = 150 + Math.sin(x * 0.013) * 22 + Math.sin(x * 0.041) * 9 + Math.sin(x * 0.11) * 3;
    ctx.fillRect(x, Math.round(h), 1, H);
  }
  // castle silhouette on the left hill
  ctx.fillStyle = P.black;
  for (let x = 0; x < W; x++) {
    const h = 196 + Math.sin(x * 0.02 + 1) * 14 + Math.sin(x * 0.07) * 4;
    ctx.fillRect(x, Math.round(h), 1, H);
  }
  const tower = (x, y, w, h) => { ctx.fillRect(x, y, w, h); for (let i = 0; i < w; i += 3) ctx.fillRect(x + i, y - 3, 2, 3); };
  tower(60, 150, 16, 50); tower(80, 162, 26, 40); tower(108, 140, 12, 60); tower(122, 170, 30, 30);
  ctx.fillRect(110, 120, 4, 20);
  // broken window glow
  ctx.fillStyle = P.plum;
  ctx.fillRect(112, 150, 2, 4);
  // foreground ruins / trees
  ctx.fillStyle = P.ink;
  for (let x = 0; x < W; x++) {
    const h = 236 + Math.sin(x * 0.05) * 6 + Math.sin(x * 0.17) * 3;
    ctx.fillRect(x, Math.round(h), 1, H);
  }
  for (let i = 0; i < 9; i++) {
    const tx = 20 + i * 57 + ((rng() * 20) | 0), th = 30 + ((rng() * 26) | 0);
    for (let r = 0; r < 18; r++) {
      const ww = Math.max(1, (r / 18) * 20);
      ctx.fillRect(Math.round(tx - ww / 2), 240 - th + r * (th / 18), Math.round(ww), 3);
    }
  }
  // the sanctuary pillar on the right hill with the dying flame bowl
  ctx.fillStyle = P.black;
  ctx.fillRect(372, 170, 10, 40);
  ctx.fillRect(366, 166, 22, 5);
  return c;
}

const MAIN = ['Continua', 'Nuova partita', 'Carica partita', 'Opzioni', 'Crediti'];

export class TitleScene {
  constructor(app) {
    this.app = app;
    this.input = app.input;
    this.audio = app.audio;
    this.t = 0;
    this.mode = app.audio.engine.ready ? 'menu' : 'press';
    this.sel = 0;
    this.slotSel = 0;
    this.slots = slotSummaries();
    this.settings = new SettingsMenu(app);
    this.confirm = null;
    this.embers = [];
    this.persistent = storageIsPersistent();
    if (!backdrop) backdrop = buildBackdrop();
    const hasSave = this.slots.some(Boolean);
    this.sel = hasSave ? 0 : 1;
    if (this.mode === 'menu') this.audio.playMusic('title', 1);
  }

  items() {
    const hasSave = this.slots.some(Boolean);
    return MAIN.map((label, i) => ({ label, disabled: (i === 0 || i === 2) && !hasSave }));
  }

  update() {
    this.t++;
    const inp = this.input;
    if (Math.random() < 0.3) this.embers.push({ x: 377 + (Math.random() - 0.5) * 10, y: 166, vx: (Math.random() - 0.5) * 0.3, vy: -0.3 - Math.random() * 0.4, life: 120 });
    for (const e of this.embers) { e.x += e.vx + Math.sin((e.life + e.x) * 0.05) * 0.15; e.y += e.vy; e.life--; }
    this.embers = this.embers.filter((e) => e.life > 0);

    if (this.mode === 'press') {
      if (inp.anyPressed || this.audio.engine.ready) {
        this.audio.init();
        this.audio.play('uiSelect');
        this.audio.playMusic('title', 1);
        this.mode = 'menu';
        inp.clearAll();
      }
      return;
    }
    if (this.mode === 'menu') return this.updateMenu(inp);
    if (this.mode === 'slots') return this.updateSlots(inp);
    if (this.mode === 'options') { if (this.settings.update() === 'back') this.mode = 'menu'; return; }
    if (this.mode === 'credits') { if (inp.pressed('confirm') || inp.pressed('cancel')) { this.mode = 'menu'; this.audio.play('uiBack'); } }
  }

  updateMenu(inp) {
    const items = this.items();
    const move = (d) => {
      do { this.sel = (this.sel + d + items.length) % items.length; } while (items[this.sel].disabled);
      this.audio.play('uiMove');
    };
    if (inp.repeat('up')) move(-1);
    if (inp.repeat('down')) move(1);
    if (!inp.pressed('confirm')) return;
    this.audio.play('uiSelect');
    switch (this.sel) {
      case 0: { // continue most recent save
        let best = -1, bt = -1;
        this.slots.forEach((s, i) => { if (s && s.updated > bt) { bt = s.updated; best = i; } });
        if (best >= 0) this.launch(best, loadSlot(best), false);
        break;
      }
      case 1: this.mode = 'slots'; this.slotAction = 'new'; this.slotSel = this.firstEmpty(); break;
      case 2: this.mode = 'slots'; this.slotAction = 'load'; this.slotSel = Math.max(0, this.slots.findIndex(Boolean)); break;
      case 3: this.mode = 'options'; this.settings.mode = 'main'; break;
      case 4: this.mode = 'credits'; break;
      default: break;
    }
  }

  firstEmpty() {
    const i = this.slots.findIndex((s) => !s);
    return i >= 0 ? i : 0;
  }

  updateSlots(inp) {
    if (this.confirm) {
      if (inp.repeat('left') || inp.repeat('right') || inp.repeat('up') || inp.repeat('down')) { this.confirm.sel = 1 - this.confirm.sel; this.audio.play('uiMove'); }
      if (inp.pressed('confirm')) {
        const c = this.confirm;
        this.confirm = null;
        if (c.sel === 0) c.yes();
        this.audio.play(c.sel === 0 ? 'uiSelect' : 'uiBack');
      } else if (inp.pressed('cancel')) { this.confirm = null; this.audio.play('uiBack'); }
      return;
    }
    if (inp.repeat('up')) { this.slotSel = (this.slotSel + SLOTS - 1) % SLOTS; this.audio.play('uiMove'); }
    if (inp.repeat('down')) { this.slotSel = (this.slotSel + 1) % SLOTS; this.audio.play('uiMove'); }
    if (inp.pressed('cancel')) { this.mode = 'menu'; this.audio.play('uiBack'); return; }
    const s = this.slots[this.slotSel];
    if (inp.pressed('ability') && s) {
      this.confirm = { text: `Eliminare lo slot ${this.slotSel + 1}?`, sel: 1, yes: () => { deleteSlot(this.slotSel); this.slots = slotSummaries(); } };
      return;
    }
    if (!inp.pressed('confirm')) return;
    if (this.slotAction === 'load') {
      if (!s) { this.audio.play('uiError'); return; }
      this.audio.play('uiSelect');
      this.launch(this.slotSel, loadSlot(this.slotSel), false);
    } else {
      const start = () => this.launch(this.slotSel, newProgress(), true);
      if (s) this.confirm = { text: `Sovrascrivere lo slot ${this.slotSel + 1}?`, sel: 1, yes: start };
      else { this.audio.play('uiSelect'); start(); }
    }
  }

  launch(slot, progress, isNew) {
    this.app.settings.lastSlot = slot;
    saveSettings(this.app.settings);
    this.audio.stopMusic(0.8);
    this.app.startGame(slot, progress, isNew);
  }

  // ------------------------------------------------------------ render
  render(ctx) {
    ctx.drawImage(backdrop, 0, 0);
    // dying flame on the sanctuary pillar
    const f = SPR.props.flameBig[(this.t >> 3) % 4];
    ctx.globalAlpha = 0.8 + Math.sin(this.t * 0.07) * 0.2;
    ctx.drawImage(f, 370, 148, 14, 18);
    ctx.globalAlpha = 1;
    for (const e of this.embers) {
      ctx.fillStyle = e.life > 60 ? P.yellow : e.life > 30 ? P.orange : P.rust;
      ctx.fillRect(Math.round(e.x), Math.round(e.y), 1, 1);
    }
    // drifting fog bands
    for (let i = 0; i < 5; i++) {
      const y = 204 + i * 9;
      const off = ((this.t * (0.15 + i * 0.07)) % 700) - 350;
      ctx.fillStyle = `rgba(192,203,220,${0.025 + i * 0.008})`;
      for (let k = 0; k < 3; k++) {
        const x = Math.round(off + k * 260);
        ctx.fillRect(x + 6, y, 150, 1);
        ctx.fillRect(x, y + 1, 170, 2);
        ctx.fillRect(x + 10, y + 3, 130, 1);
      }
    }
    this.drawLogo(ctx);
    if (this.mode === 'press') {
      if ((this.t >> 5) % 2 === 0) font.draw(ctx, 'Premi un tasto', 240, 180, P.sand, { align: 'center' });
    } else if (this.mode === 'menu') this.drawMenu(ctx);
    else if (this.mode === 'slots') this.drawSlots(ctx);
    else if (this.mode === 'options') {
      dim(ctx, 0.5);
      panel(ctx, 70, 70, 340, 170);
      font.draw(ctx, 'Opzioni', 240, 78, P.gold, { align: 'center' });
      this.settings.draw(ctx, 86, 96, 308);
    } else if (this.mode === 'credits') this.drawCredits(ctx);
    font.draw(ctx, 'v1.0', 474, 260, P.steel, { align: 'right' });
    if (!this.persistent) font.draw(ctx, 'Archiviazione non disponibile: i salvataggi dureranno solo questa sessione', 240, 260, P.salmon, { align: 'center' });
  }

  drawLogo(ctx) {
    if (!this.logo) {
      const text = 'ULTIMO LUME';
      const w = font.measure(text) + 2;
      const small = makeCanvas(w, 11);
      const sctx = small.getContext('2d');
      font.draw(sctx, text, 1, 0, P.gold, { shadow: null });
      const shade = makeCanvas(w, 11);
      font.draw(shade.getContext('2d'), text, 1, 0, P.rust, { shadow: null });
      this.logo = { small, shade, w };
    }
    const s = 4;
    const lw = this.logo.w * s;
    const x = Math.round(240 - lw / 2), y = 34 + Math.round(Math.sin(this.t * 0.03) * 1.5);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.logo.shade, x + 2, y + 3, lw, 11 * s);
    ctx.drawImage(this.logo.small, x, y, lw, 11 * s);
    font.draw(ctx, 'una fiamma, un regno addormentato, un ritorno', 240, y + 50, P.gray, { align: 'center' });
  }

  drawMenu(ctx) {
    const items = this.items();
    const y0 = 124;
    items.forEach((it, i) => {
      const sel = i === this.sel;
      const col = it.disabled ? P.slate : sel ? P.white : P.gray;
      font.draw(ctx, it.label, 240, y0 + i * 16, col, { align: 'center' });
      if (sel) cursor(ctx, 240 - font.measure(it.label) / 2 - 12, y0 + i * 16 + 1, this.t);
    });
    const I = this.input;
    let x = 128;
    const y = 222;
    x += keyCap(ctx, I.primaryLabel('attack'), x, y) + 3;
    x += font.draw(ctx, 'Conferma', x, y + 2, P.steel) + 10;
    x += keyCap(ctx, I.primaryLabel('dodge'), x, y) + 3;
    x += font.draw(ctx, 'Indietro', x, y + 2, P.steel) + 10;
    x += keyCap(ctx, '↑↓', x, y) + 3;
    font.draw(ctx, 'Scegli', x, y + 2, P.steel);
  }

  drawSlots(ctx) {
    dim(ctx, 0.55);
    panel(ctx, 60, 64, 360, 176);
    font.draw(ctx, this.slotAction === 'new' ? 'Nuova partita — scegli uno slot' : 'Carica partita', 240, 72, P.gold, { align: 'center' });
    for (let i = 0; i < SLOTS; i++) {
      const s = this.slots[i];
      const y = 88 + i * 44;
      const sel = i === this.slotSel;
      panel(ctx, 76, y, 328, 40, sel ? 'light' : 'dark');
      font.draw(ctx, `Slot ${i + 1}`, 88, y + 7, sel ? P.gold : P.gray);
      if (!s) {
        font.draw(ctx, 'Vuoto', 88, y + 21, P.steel);
        continue;
      }
      const reg = REGIONS[(s.pos && s.pos.room && this.regionOf(s.pos.room)) || 'village'];
      font.draw(ctx, reg ? reg.name : '', 140, y + 7, P.sand);
      // hearts
      for (let h = 0; h < Math.min(10, s.maxHp / 2); h++) {
        const v = s.hp - h * 2;
        ctx.drawImage(v >= 2 ? SPR.items.heart.full : v === 1 ? SPR.items.heart.half : SPR.items.heart.empty, 86 + h * 10, y + 19);
      }
      const seals = (s.items.stoneHeart ? 1 : 0) + (s.items.abyssEye ? 1 : 0) + (s.items.brokenOath ? 1 : 0);
      font.draw(ctx, `Sigilli ${seals}/3`, 250, y + 22, P.gray);
      font.draw(ctx, formatTime(s.playTime), 396, y + 7, P.sand, { align: 'right' });
      if (s.ended) font.draw(ctx, 'Completato', 396, y + 22, P.gold, { align: 'right' });
    }
    const I = this.input;
    let x = 100;
    const y = 222;
    x += keyCap(ctx, I.primaryLabel('attack'), x, y) + 3;
    x += font.draw(ctx, this.slotAction === 'new' ? 'Inizia' : 'Carica', x, y + 2, P.steel) + 10;
    x += keyCap(ctx, I.primaryLabel('ability'), x, y) + 3;
    x += font.draw(ctx, 'Elimina', x, y + 2, P.steel) + 10;
    x += keyCap(ctx, I.primaryLabel('dodge'), x, y) + 3;
    font.draw(ctx, 'Indietro', x, y + 2, P.steel);
    if (this.confirm) {
      panel(ctx, 150, 110, 180, 56);
      font.draw(ctx, this.confirm.text, 240, 120, P.white, { align: 'center' });
      ['Sì', 'No'].forEach((t, i) => {
        const tx = 210 + i * 60;
        font.draw(ctx, t, tx, 142, this.confirm.sel === i ? P.gold : P.gray, { align: 'center' });
        if (this.confirm.sel === i) cursor(ctx, tx - 14, 143, this.t);
      });
    }
  }

  regionOf(roomId) {
    const prefix = roomId.split('_')[0];
    return { v: 'village', f: 'forest', r: 'ruins', m: 'mines', k: 'caves', c: 'castle', s: 'sanctuary' }[prefix] || 'village';
  }

  drawCredits(ctx) {
    dim(ctx, 0.6);
    panel(ctx, 70, 70, 340, 160);
    const lines = [
      ['{Ultimo Lume}', P.sand],
      ['Un action-adventure in pixel art', P.gray],
      ['', P.gray],
      ['Grafica, musica e suoni generati proceduralmente', P.gray],
      ['in JavaScript: nessun asset esterno.', P.gray],
      ['', P.gray],
      ['Palette ispirata a ENDESGA 32', P.steel],
      ['Font bitmap disegnato a mano', P.steel],
      ['', P.gray],
      ['Grazie per aver giocato.', P.sand],
    ];
    lines.forEach(([t, c], i) => font.draw(ctx, t, 240, 82 + i * 13, c, { align: 'center' }));
  }
}
