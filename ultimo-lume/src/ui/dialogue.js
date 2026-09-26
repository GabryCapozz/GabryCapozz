// Dialogue box: typewriter text, speaker name + portrait, voice blips, choices.
import { P } from '../gfx/palette.js';
import { font } from '../gfx/font.js';
import { SPR } from '../gfx/sprites/index.js';
import { panel, cursor } from './draw.js';
import { SPEAKERS } from '../data/npcs.js';

const BOX = { x: 12, y: 184, w: 456, h: 78 };

export class Dialogue {
  constructor(game) {
    this.game = game;
    this.active = false;
    this.lines = [];
    this.i = 0;
    this.shown = 0;
    this.t = 0;
    this.choice = null;
    this.sel = 0;
    this.result = null;
    this.onClose = null;
  }

  // lines: [{speaker, text}] ; choice: {options:[...]}
  open(lines, opts = {}) {
    this.active = true;
    this.lines = lines;
    this.i = 0;
    this.shown = 0;
    this.t = 0;
    this.choice = opts.choice || null;
    this.sel = 0;
    this.result = null;
    this.onClose = opts.onClose || null;
    this.slide = 0;
    this.prepare();
  }

  prepare() {
    const l = this.lines[this.i];
    const sp = l.speaker ? SPEAKERS[l.speaker] : null;
    const textX = sp && sp.look ? 62 : 24;
    this.wrapped = font.wrap(l.text, BOX.w - (textX - BOX.x) - 16);
    this.total = this.wrapped.join('').replace(/[{}]/g, '').length;
    this.shown = 0;
  }

  get line() { return this.lines[this.i]; }

  update() {
    if (!this.active) return;
    const inp = this.game.input;
    this.t++;
    if (this.slide < 1) this.slide = Math.min(1, this.slide + 0.2);
    const done = this.shown >= this.total;
    if (!done) {
      const speed = inp.held('confirm') && this.t > 10 ? 3 : 1;
      const before = Math.floor(this.shown);
      this.shown = Math.min(this.total, this.shown + speed * 0.9);
      const sp = this.line.speaker ? SPEAKERS[this.line.speaker] : null;
      if (Math.floor(this.shown) !== before && Math.floor(this.shown) % 2 === 0) {
        this.game.audio.play('blip', { pitch: sp ? sp.pitch : 400 });
      }
      if (inp.pressed('confirm') && this.t > 6) this.shown = this.total;
      return;
    }
    const last = this.i >= this.lines.length - 1;
    if (last && this.choice) {
      const n = this.choice.options.length;
      if (inp.repeat('up')) { this.sel = (this.sel + n - 1) % n; this.game.audio.play('uiMove'); }
      if (inp.repeat('down')) { this.sel = (this.sel + 1) % n; this.game.audio.play('uiMove'); }
      if (inp.pressed('confirm')) { this.result = this.sel; this.game.audio.play('uiSelect'); this.close(); }
      else if (inp.pressed('cancel')) { this.result = n - 1; this.game.audio.play('uiBack'); this.close(); }
      return;
    }
    if (inp.pressed('confirm') || inp.pressed('cancel')) {
      if (last) this.close();
      else { this.i++; this.prepare(); this.game.audio.play('uiMove'); }
    }
  }

  close() {
    this.active = false;
    this.game.input.clearAll();
    const cb = this.onClose;
    this.onClose = null;
    if (cb) cb(this.result);
  }

  draw(ctx) {
    if (!this.active) return;
    const l = this.line;
    const sp = l.speaker ? SPEAKERS[l.speaker] : null;
    const oy = Math.round((1 - this.slide) * 20);
    const bx = BOX.x, by = BOX.y + oy;
    panel(ctx, bx, by, BOX.w, BOX.h);
    let textX = bx + 12;
    if (sp && sp.look && SPR.npc[sp.look]) {
      panel(ctx, bx + 6, by + 8, 40, 60, 'light');
      const img = SPR.npc[sp.look].down.idle[(this.t >> 5) % 2];
      ctx.save();
      ctx.beginPath();
      ctx.rect(bx + 9, by + 11, 34, 54);
      ctx.clip();
      ctx.drawImage(img, bx + 10, by + 12, img.width * 2, img.height * 2);
      ctx.restore();
      textX = bx + 50;
    }
    if (sp) {
      const nw = font.measure(sp.name) + 16;
      panel(ctx, bx + 8, by - 12, nw, 15);
      font.draw(ctx, sp.name, bx + 16, by - 8, P.gold);
    }
    // typewriter
    let left = Math.floor(this.shown);
    let y = by + 12;
    for (const row of this.wrapped) {
      if (left <= 0) break;
      let out = '';
      for (const ch of row) {
        if (ch === '{' || ch === '}') { out += ch; continue; }
        if (left <= 0) break;
        out += ch;
        left--;
      }
      if (out.includes('{') && !out.includes('}')) out += '}';
      font.draw(ctx, out, textX, y, P.sand);
      y += 12;
    }
    const done = this.shown >= this.total;
    const last = this.i >= this.lines.length - 1;
    if (done && last && this.choice) {
      const opts = this.choice.options;
      const w = Math.max(...opts.map((o) => font.measure(o))) + 26;
      const h = opts.length * 12 + 10;
      const cx = bx + BOX.w - w - 6, cy = by - h - 2;
      panel(ctx, cx, cy, w, h);
      opts.forEach((o, i) => {
        font.draw(ctx, o, cx + 16, cy + 6 + i * 12, i === this.sel ? P.white : P.gray);
        if (i === this.sel) cursor(ctx, cx + 7, cy + 7 + i * 12, this.t);
      });
    } else if (done) {
      const bob = (this.t >> 4) % 2;
      ctx.fillStyle = P.gold;
      const ax = bx + BOX.w - 16, ay = by + BOX.h - 14 + bob;
      ctx.fillRect(ax, ay, 5, 1); ctx.fillRect(ax + 1, ay + 1, 3, 1); ctx.fillRect(ax + 2, ay + 2, 1, 1);
    }
  }
}
