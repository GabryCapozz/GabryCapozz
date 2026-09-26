// World map: shows only visited rooms, the player's position, checkpoints, bosses
// and player-placed markers (move the cursor, place / cycle / remove).
import { P } from '../gfx/palette.js';
import { font } from '../gfx/font.js';
import { SPR } from '../gfx/sprites/index.js';
import { CELL_W, CELL_H, CELL_PX_W, CELL_PX_H } from '../core/constants.js';
import { keyCap } from './draw.js';
import { REGIONS } from '../data/regions.js';

const WALLISH = new Set(['#', 'T', '~', 'X', '%', '_', 'L', 'f']);
export const MARKERS = ['star', 'alert', 'question', 'cross'];

function openingsOf(def) {
  const res = [];
  const rows = def.map;
  const w = (def.w || 1) * CELL_W, h = (def.h || 1) * CELL_H;
  const scan = (get, len, side) => {
    let start = -1;
    for (let i = 0; i <= len; i++) {
      const open = i < len && !WALLISH.has(get(i));
      if (open && start < 0) start = i;
      if (!open && start >= 0) { res.push({ side, a: start, b: i - 1 }); start = -1; }
    }
  };
  scan((i) => rows[0][i], w, 'top');
  scan((i) => rows[h - 1][i], w, 'bottom');
  scan((i) => rows[i][0], h, 'left');
  scan((i) => rows[i][w - 1], h, 'right');
  return res;
}

const openCache = new Map();

export class MapView {
  constructor(game) {
    this.game = game;
    this.t = 0;
    this.cur = null;
    this.icon = 0;
  }

  reset() {
    const r = this.game.room;
    const pl = this.game.player;
    this.cur = { x: r.gx + Math.floor(pl.x / CELL_PX_W), y: r.gy + Math.floor(pl.y / CELL_PX_H) };
  }

  update() {
    const inp = this.game.input;
    this.t++;
    if (!this.cur) this.reset();
    if (inp.repeat('left')) this.cur.x--;
    if (inp.repeat('right')) this.cur.x++;
    if (inp.repeat('up')) this.cur.y--;
    if (inp.repeat('down')) this.cur.y++;
    const b = this.bounds();
    this.cur.x = Math.max(b.x0, Math.min(b.x1, this.cur.x));
    this.cur.y = Math.max(b.y0, Math.min(b.y1, this.cur.y));
    const markers = this.game.progress.markers;
    const at = markers.findIndex((m) => m.gx === this.cur.x && m.gy === this.cur.y);
    if (inp.pressed('attack') || inp.pressed('interact')) {
      if (at >= 0) markers[at].icon = (markers[at].icon + 1) % MARKERS.length;
      else markers.push({ gx: this.cur.x, gy: this.cur.y, icon: this.icon });
      this.game.audio.play('uiSelect');
    }
    if (inp.pressed('dodge') && at >= 0) {
      markers.splice(at, 1);
      this.game.audio.play('uiBack');
    }
    if (inp.pressed('cycle')) {
      this.icon = (this.icon + 1) % MARKERS.length;
      if (at >= 0) markers[at].icon = this.icon;
      this.game.audio.play('uiMove');
    }
  }

  bounds() {
    let x0 = 99, y0 = 99, x1 = -99, y1 = -99;
    for (const d of Object.values(this.game.world.defs)) {
      x0 = Math.min(x0, d.gx); y0 = Math.min(y0, d.gy);
      x1 = Math.max(x1, d.gx + (d.w || 1) - 1); y1 = Math.max(y1, d.gy + (d.h || 1) - 1);
    }
    return { x0, y0, x1, y1 };
  }

  draw(ctx, x, y, w, h, interactive = true) {
    const g = this.game;
    const pr = g.progress;
    const b = this.bounds();
    // scale cells to fill the available area (cells keep the 30:17 screen ratio)
    const cols = b.x1 - b.x0 + 1, rows = b.y1 - b.y0 + 1;
    const CW = Math.max(12, Math.floor(Math.min(w / cols, ((h - 44) / rows) * 1.76)));
    const CH = Math.max(7, Math.round(CW * 0.566));
    const mw = cols * CW, mh = rows * CH;
    const ox = Math.round(x + (w - mw) / 2 - b.x0 * CW);
    const oy = Math.round(y + (h - mh) / 2 - b.y0 * CH) - 6;
    // parchment grid
    ctx.fillStyle = P.navy;
    for (let gy = b.y0; gy <= b.y1; gy++) for (let gx = b.x0; gx <= b.x1; gx++) ctx.fillRect(ox + gx * CW + CW / 2, oy + gy * CH + CH / 2, 1, 1);
    for (const d of Object.values(g.world.defs)) {
      if (!pr.visited[d.id]) continue;
      const reg = REGIONS[d.region] || REGIONS.village;
      const rx = ox + d.gx * CW, ry = oy + d.gy * CH, rw = (d.w || 1) * CW - 2, rh = (d.h || 1) * CH - 2;
      const current = d.id === g.room.id;
      ctx.fillStyle = P.ink;
      ctx.fillRect(rx, ry, rw + 1, rh + 1);
      ctx.fillStyle = current && (this.t >> 4) % 2 ? reg.light : reg.color;
      ctx.fillRect(rx + 1, ry + 1, rw - 1, rh - 1);
      // openings
      let ops = openCache.get(d.id);
      if (!ops) { ops = openingsOf(d); openCache.set(d.id, ops); }
      ctx.fillStyle = reg.light;
      const sx = rw / ((d.w || 1) * CELL_W), sy = rh / ((d.h || 1) * CELL_H);
      for (const o of ops) {
        const a = Math.floor(o.a * (o.side === 'top' || o.side === 'bottom' ? sx : sy));
        const len = Math.max(2, Math.ceil((o.b - o.a + 1) * (o.side === 'top' || o.side === 'bottom' ? sx : sy)));
        if (o.side === 'top') ctx.fillRect(rx + a, ry - 1, len, 2);
        if (o.side === 'bottom') ctx.fillRect(rx + a, ry + rh - 1, len, 2);
        if (o.side === 'left') ctx.fillRect(rx - 1, ry + a, 2, len);
        if (o.side === 'right') ctx.fillRect(rx + rw - 1, ry + a, 2, len);
      }
      if (pr.flags['brazier:' + d.id]) {
        ctx.fillStyle = P.orange;
        ctx.fillRect(rx + 3, ry + 3, 2, 3);
        ctx.fillStyle = P.yellow;
        ctx.fillRect(rx + 3, ry + 3, 1, 1);
      }
      if (d.boss) {
        const img = SPR.items.skull;
        ctx.drawImage(img, 0, 0, 16, 16, rx + rw / 2 - 4, ry + rh / 2 - 4, 8, 8);
        if (pr.flags['boss:' + d.boss]) {
          ctx.fillStyle = P.red;
          for (let i = 0; i < 8; i++) { ctx.fillRect(rx + rw / 2 - 4 + i, ry + rh / 2 - 4 + i, 1, 1); ctx.fillRect(rx + rw / 2 + 3 - i, ry + rh / 2 - 4 + i, 1, 1); }
        }
      }
    }
    // markers
    for (const m of pr.markers) drawMarker(ctx, m.icon, ox + m.gx * CW + CW / 2 - 3, oy + m.gy * CH + CH / 2 - 3);
    // player
    const r = g.room, pl = g.player;
    const px = ox + r.gx * CW + (pl.x / (r.tw * 16)) * (r.cw * CW - 2);
    const py = oy + r.gy * CH + (pl.y / (r.th * 16)) * (r.ch * CH - 2);
    if ((this.t >> 3) % 2 === 0) {
      ctx.fillStyle = P.ink;
      ctx.fillRect(Math.round(px) - 2, Math.round(py) - 2, 5, 5);
      ctx.fillStyle = P.white;
      ctx.fillRect(Math.round(px) - 1, Math.round(py) - 1, 3, 3);
    }
    if (!interactive) return;
    // cursor
    const cxp = ox + this.cur.x * CW, cyp = oy + this.cur.y * CH;
    ctx.strokeStyle = P.gold;
    ctx.lineWidth = 1;
    ctx.strokeRect(cxp - 1.5, cyp - 1.5, CW + 1, CH + 1);
    const def = g.world.roomAtCell(this.cur.x, this.cur.y);
    const name = def && pr.visited[def.id] ? (REGIONS[def.region]?.name || '') + (def.name ? ' · ' + def.name : '') : '???';
    font.draw(ctx, name, x + w / 2, y + h - 30, P.sand, { align: 'center' });
    // legend
    let lx = x + 8;
    const ly = y + h - 14;
    lx += keyCap(ctx, g.input.primaryLabel('attack'), lx, ly) + 3;
    lx += font.draw(ctx, 'Segna', lx, ly + 2, P.gray) + 10;
    lx += keyCap(ctx, g.input.primaryLabel('dodge'), lx, ly) + 3;
    lx += font.draw(ctx, 'Rimuovi', lx, ly + 2, P.gray) + 10;
    lx += keyCap(ctx, g.input.primaryLabel('cycle'), lx, ly) + 3;
    lx += font.draw(ctx, 'Simbolo', lx, ly + 2, P.gray) + 4;
    drawMarker(ctx, this.icon, lx + 2, ly + 2);
  }
}

export function drawMarker(ctx, icon, x, y) {
  x = Math.round(x); y = Math.round(y);
  ctx.fillStyle = P.ink;
  ctx.fillRect(x - 1, y - 1, 9, 9);
  const kind = MARKERS[icon];
  const c = kind === 'star' ? P.yellow : kind === 'alert' ? P.red : kind === 'question' ? P.cyan : P.white;
  ctx.fillStyle = c;
  const pix = {
    star: ['...#...', '..###..', '#######', '.#####.', '.##.##.', '#.....#', '.......'],
    alert: ['..###..', '..###..', '..###..', '..###..', '.......', '..###..', '.......'],
    question: ['.####..', '#....#.', '....#..', '...#...', '.......', '...#...', '.......'],
    cross: ['#.....#', '.#...#.', '..#.#..', '...#...', '..#.#..', '.#...#.', '#.....#'],
  }[kind];
  pix.forEach((row, j) => { for (let i = 0; i < 7; i++) if (row[i] === '#') ctx.fillRect(x + i, y + j, 1, 1); });
}
