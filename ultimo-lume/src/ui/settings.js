// Settings list shared by the title screen and the pause menu (incl. key rebinding).
import { P } from '../gfx/palette.js';
import { font } from '../gfx/font.js';
import { cursor, keyCap } from './draw.js';
import { REBINDABLE, ACTION_LABELS, keyLabel } from '../core/input.js';
import { saveSettings } from '../systems/save.js';

const SHAKE = ['Disattivata', 'Ridotta', 'Normale'];

export class SettingsMenu {
  constructor(app) {
    this.app = app; // provides input, audio, settings, screen, applySettings()
    this.sel = 0;
    this.mode = 'main';
    this.bindSel = 0;
    this.waiting = false;
    this.t = 0;
  }

  items() {
    const s = this.app.settings;
    return [
      { label: 'Musica', value: bars(s.music), adjust: (d) => { s.music = clamp(s.music + d, 0, 10); } },
      { label: 'Effetti sonori', value: bars(s.sfx), adjust: (d) => { s.sfx = clamp(s.sfx + d, 0, 10); this.app.audio.play('coin'); } },
      { label: 'Scossa schermo', value: SHAKE[s.shake], adjust: (d) => { s.shake = clamp(s.shake + d, 0, 2); } },
      { label: 'Scala pixel', value: s.integerScale ? 'Intera (nitida)' : 'Adatta allo schermo', adjust: () => { s.integerScale = !s.integerScale; } },
      { label: 'Schermo intero', value: document.fullscreenElement ? 'Sì' : 'No', action: () => this.app.screen.toggleFullscreen() },
      { label: 'Comandi', value: '...', action: () => { this.mode = 'bind'; this.bindSel = 0; } },
    ];
  }

  // returns 'back' when the user leaves the menu
  update() {
    const inp = this.app.input;
    this.t++;
    if (this.waiting) return null;
    if (this.mode === 'bind') return this.updateBind();
    const items = this.items();
    if (inp.repeat('up')) { this.sel = (this.sel + items.length - 1) % items.length; this.app.audio.play('uiMove'); }
    if (inp.repeat('down')) { this.sel = (this.sel + 1) % items.length; this.app.audio.play('uiMove'); }
    const it = items[this.sel];
    if (it.adjust && inp.repeat('left')) { it.adjust(-1); this.changed(); }
    if (it.adjust && inp.repeat('right')) { it.adjust(1); this.changed(); }
    if (inp.pressed('confirm')) {
      if (it.action) it.action();
      else if (it.adjust) it.adjust(1);
      this.changed();
      this.app.audio.play('uiSelect');
    }
    if (inp.pressed('cancel')) { this.app.audio.play('uiBack'); return 'back'; }
    return null;
  }

  updateBind() {
    const inp = this.app.input;
    const n = REBINDABLE.length + 1;
    if (inp.repeat('up')) { this.bindSel = (this.bindSel + n - 1) % n; this.app.audio.play('uiMove'); }
    if (inp.repeat('down')) { this.bindSel = (this.bindSel + 1) % n; this.app.audio.play('uiMove'); }
    if (inp.pressed('confirm')) {
      if (this.bindSel === REBINDABLE.length) {
        inp.resetBindings();
        this.app.settings.bindings = inp.bindings;
        this.changed();
        this.app.audio.play('uiSelect');
      } else {
        const action = REBINDABLE[this.bindSel];
        this.waiting = true;
        this.app.audio.play('uiSelect');
        // wait one frame so the confirm key itself isn't captured
        setTimeout(() => inp.captureKey((code) => {
          this.waiting = false;
          if (code !== 'Escape') {
            inp.rebind(action, code);
            this.app.settings.bindings = inp.bindings;
            this.changed();
            this.app.audio.play('uiSelect');
          } else this.app.audio.play('uiBack');
          inp.clearAll();
        }), 50);
      }
    }
    if (inp.pressed('cancel')) { this.mode = 'main'; this.app.audio.play('uiBack'); }
    return null;
  }

  changed() {
    this.app.applySettings();
    saveSettings(this.app.settings);
  }

  draw(ctx, x, y, w) {
    if (this.mode === 'bind') return this.drawBind(ctx, x, y, w);
    const items = this.items();
    items.forEach((it, i) => {
      const yy = y + i * 16;
      const selected = i === this.sel;
      font.draw(ctx, it.label, x + 14, yy, selected ? P.white : P.gray);
      const vx = x + w - 14;
      if (it.adjust && selected) {
        font.draw(ctx, '<', vx - font.measure(it.value) - 10, yy, P.gold);
        font.draw(ctx, '>', vx + 4, yy, P.gold);
      }
      font.draw(ctx, it.value, vx, yy, selected ? P.gold : P.sand, { align: 'right' });
      if (selected) cursor(ctx, x + 4, yy + 1, this.t);
    });
    font.draw(ctx, 'Sinistra/Destra per regolare', x + 14, y + items.length * 16 + 8, P.steel);
  }

  drawBind(ctx, x, y, w) {
    const inp = this.app.input;
    font.draw(ctx, 'Tastiera — seleziona un comando e premi il nuovo tasto', x + 14, y - 2, P.steel);
    REBINDABLE.forEach((a, i) => {
      const yy = y + 12 + i * 13;
      const sel = i === this.bindSel;
      font.draw(ctx, ACTION_LABELS[a], x + 14, yy, sel ? P.white : P.gray);
      const label = this.waiting && sel ? '...' : keyLabel(inp.bindings[a][0]);
      const alt = inp.bindings[a].slice(1).map(keyLabel).join(' ');
      keyCap(ctx, label, x + w - 120, yy - 1, !(this.waiting && sel));
      font.draw(ctx, alt, x + w - 92, yy, P.steel);
      if (sel) cursor(ctx, x + 4, yy + 1, this.t);
    });
    const ry = y + 12 + REBINDABLE.length * 13 + 4;
    const sel = this.bindSel === REBINDABLE.length;
    font.draw(ctx, 'Ripristina predefiniti', x + 14, ry, sel ? P.white : P.gray);
    if (sel) cursor(ctx, x + 4, ry + 1, this.t);
    font.draw(ctx, 'Movimento: WASD / Frecce · Menu: ESC · Mappa: M · Inventario: I', x + 14, ry + 16, P.steel);
    font.draw(ctx, 'Gamepad supportato (A attacco, B schivata, X abilità, Y interagisci)', x + 14, ry + 28, P.steel);
  }
}

function bars(v) {
  return v === 0 ? 'Muto' : String(v * 10) + '%';
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
