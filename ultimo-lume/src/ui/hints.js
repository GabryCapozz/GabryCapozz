// Contextual tutorial hints ("tutorial naturale"): each appears once, with the
// player's current key bindings, and disappears when the action is performed.
import { P } from '../gfx/palette.js';
import { font } from '../gfx/font.js';
import { keyCap } from './draw.js';

const HINTS = {
  move: { keys: ['up', 'left', 'down', 'right'], text: 'Muoviti', done: (g) => g.player.moving },
  attack: { keys: ['attack'], text: 'Attacca · premi ancora per la combo', done: (g) => g.player.state === 'attack' && g.player.combo >= 1 },
  dodge: { keys: ['dodge'], text: 'Schiva: sei invulnerabile per un istante', done: (g) => g.player.state === 'dash' },
  run: { keys: ['run'], text: 'Tieni premuto per correre (consuma vigore)', done: (g) => g.player.running },
  potion: { keys: ['potion'], text: 'Bevi una pozione (si ricaricano ai bracieri)', done: (g) => g.player.state === 'drink' },
  menu: { keys: ['map', 'pause'], text: 'Mappa · Menu', done: (g) => g.pause.active },
  ability: { keys: ['ability', 'cycle'], text: 'Usa abilità · Cambia abilità', done: (g) => g.player.state === 'use' },
  charge: { keys: ['attack'], text: 'Colpisci e TIENI premuto, poi rilascia: Fendente Rotante', done: (g) => g.player.state === 'spin' },
  boulder: { keys: [], text: 'Troppo duro per un colpo normale...', done: () => false },
  interact: { keys: ['interact'], text: 'Interagisci', done: (g) => g.dialogue.active },
};

export class Hints {
  constructor(game) {
    this.game = game;
    this.current = null;
    this.t = 0;
  }

  show(id, delay = 0) {
    const pr = this.game.progress;
    if (pr.flags['hint.' + id]) return;
    if (this.current && this.current.id === id) return;
    if (this.current && !this.current.done) {
      // queue behind the current hint
      this.next = { id, delay };
      return;
    }
    this.current = { id, def: HINTS[id], t: -delay, life: id === 'boulder' ? 150 : 600 };
  }

  update() {
    const c = this.current;
    if (!c) {
      if (this.next) { const n = this.next; this.next = null; this.show(n.id, n.delay); }
      return;
    }
    c.t++;
    if (c.t < 0) return;
    const g = this.game;
    if (!c.doneT && c.t > 20 && c.def.done(g)) c.doneT = 1;
    if (c.doneT) c.doneT++;
    if ((c.doneT && c.doneT > 30) || c.t > c.life) {
      if (c.id !== 'boulder') g.progress.flags['hint.' + c.id] = true;
      this.current = null;
    }
  }

  draw(ctx) {
    const c = this.current;
    if (!c || c.t < 0) return;
    const g = this.game;
    if (g.dialogue.active || g.pause.active) return;
    let a = Math.min(1, c.t / 15);
    if (c.doneT) a = Math.max(0, 1 - c.doneT / 30);
    else if (c.t > c.life - 20) a = (c.life - c.t) / 20;
    ctx.globalAlpha = a;
    const labels = c.id === 'move' && g.input.lastDevice !== 'pad' ? ['W', 'A', 'S', 'D'] : c.def.keys.map((k) => g.input.primaryLabel(k));
    const uniq = [...new Set(labels)];
    let w = font.measure(c.def.text) + 16;
    for (const l of uniq) w += Math.max(9, font.measure(l) + 6) + 2;
    const x = 8, y = 270 - 24;
    ctx.fillStyle = 'rgba(14,11,22,0.8)';
    ctx.fillRect(x, y, w, 17);
    ctx.fillStyle = c.doneT ? P.greenL : P.gold;
    ctx.fillRect(x, y, 2, 17);
    let kx = x + 6;
    for (const l of uniq) kx += keyCap(ctx, l, kx, y + 3) + 2;
    font.draw(ctx, c.def.text, kx + 4, y + 5, P.sand);
    ctx.globalAlpha = 1;
  }
}
