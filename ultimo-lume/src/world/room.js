// A room: parsed tile grid + entities spawned from the ASCII map legend.
import { CELL_W, CELL_H, CELL_PX_W, CELL_PX_H } from '../core/constants.js';
import { T, TILE_PROPS, CHAR_TILES } from './tiletypes.js';
import { renderRoom, repaintArea } from './roomRender.js';
import { hashStr } from '../core/math.js';
import { createEntity, GLOBAL_LEGEND, GROUPED, ENEMY_TYPES } from '../entities/factory.js';
import { FX } from '../systems/particles.js';
import { P } from '../gfx/palette.js';

export class Room {
  constructor(game, def) {
    this.game = game;
    this.def = def;
    this.id = def.id;
    this.gx = def.gx;
    this.gy = def.gy;
    this.cw = def.w || 1;
    this.ch = def.h || 1;
    this.tw = this.cw * CELL_W;
    this.th = this.ch * CELL_H;
    this.px = this.gx * CELL_PX_W;
    this.py = this.gy * CELL_PX_H;
    this.theme = def.theme;
    this.region = def.region;
    this.wallKind = def.wallKind || null;
    this.seed = hashStr(def.id) % 100000;
    this.tiles = new Uint8Array(this.tw * this.th);
    this.entities = [];
    this.solids = [];
    this.hurtables = [];
    this.crystal = def.crystal || 'red';
    this.flow = null;
    this.flowAge = 999;
    this.spawnPoints = {};
    this.pending = [];
    this.parse();
    this.applyPersistentTiles();
    renderRoom(this);
  }

  get flags() { return this.game.progress.flags; }

  parse() {
    const rows = this.def.map;
    if (rows.length !== this.th) throw new Error(`Room ${this.id}: expected ${this.th} rows, got ${rows.length}`);
    const legend = { ...GLOBAL_LEGEND, ...(this.def.legend || {}) };
    const local = this.def.legend || {};
    const seen = new Set();
    for (let ty = 0; ty < this.th; ty++) {
      const row = rows[ty];
      if (row.length !== this.tw) throw new Error(`Room ${this.id}: row ${ty} has ${row.length} chars, expected ${this.tw}`);
      for (let tx = 0; tx < this.tw; tx++) {
        const ch = row[tx];
        let tile;
        if (CHAR_TILES[ch] !== undefined && !local[ch]) tile = CHAR_TILES[ch];
        else {
          const spec = legend[ch];
          if (!spec) throw new Error(`Room ${this.id}: unknown map char '${ch}' at ${tx},${ty}`);
          tile = spec.under != null ? (CHAR_TILES[spec.under] ?? T.FLOOR) : (this.def.under != null ? CHAR_TILES[this.def.under] : T.FLOOR);
          const key = tx + ',' + ty;
          if (!seen.has(key)) {
            let gw = 1, gh = 1;
            if (GROUPED.has(spec.type)) {
              while (tx + gw < this.tw && row[tx + gw] === ch) gw++;
              while (ty + gh < this.th && rows[ty + gh][tx] === ch) gh++;
              for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) seen.add(tx + i + ',' + (ty + j));
            }
            this.pending.push({ ch, spec, tx, ty, gw, gh });
          }
        }
        this.tiles[ty * this.tw + tx] = tile;
      }
    }
  }

  applyPersistentTiles() {
    const prefix = `wall:${this.id}:`;
    for (const k of Object.keys(this.flags)) {
      if (!k.startsWith(prefix)) continue;
      const [tx, ty] = k.slice(prefix.length).split(',').map(Number);
      this.tiles[ty * this.tw + tx] = this.def.brokenTile != null ? this.def.brokenTile : T.FLOOR3;
    }
    const fill = `fill:${this.id}:`;
    for (const k of Object.keys(this.flags)) {
      if (!k.startsWith(fill)) continue;
      const [tx, ty] = k.slice(fill.length).split(',').map(Number);
      this.tiles[ty * this.tw + tx] = T.FLOOR3;
    }
  }

  // Spawn entities. Called by the game after the room becomes current.
  spawnAll(opts = {}) {
    const cleared = this.def.arena && this.flags['clear:' + this.id];
    for (const p of this.pending) {
      const { spec, tx, ty, gw, gh } = p;
      if (spec.type === 'spawn') { this.spawnPoints[spec.name || 'start'] = { x: tx * 16 + 8, y: ty * 16 + 8 }; continue; }
      if ((spec.enemy || ENEMY_TYPES.has(spec.type)) && (cleared || opts.noEnemies)) continue;
      if (spec.if && !spec.if(this.game.progress)) continue;
      const x = tx * 16 + (gw * 16) / 2, y = ty * 16 + (gh * 16) / 2;
      const e = createEntity(this.game, spec, x, y);
      if (!e) continue;
      e.tx = tx; e.ty = ty; e.gw = gw; e.gh = gh;
      e.spawnChar = p.ch;
      this.entities.push(e);
    }
    for (const e of this.entities) if (e.init) e.init();
    this.entities = this.entities.filter((e) => !e.dead);
    this.refreshLists();
  }

  refreshLists() {
    this.solids = this.entities.filter((e) => e.solid);
    this.hurtables = this.entities.filter((e) => e.hurtbox);
    if (this.game.player && !this.hurtables.includes(this.game.player)) this.hurtables.push(this.game.player);
  }

  // ---- tiles ----
  tileAt(tx, ty) {
    if (tx < 0) tx = 0; else if (tx >= this.tw) tx = this.tw - 1;
    if (ty < 0) ty = 0; else if (ty >= this.th) ty = this.th - 1;
    return this.tiles[ty * this.tw + tx];
  }

  tileAtPx(x, y) { return this.tileAt(Math.floor(x / 16), Math.floor(y / 16)); }

  setTile(tx, ty, t) {
    if (tx < 0 || ty < 0 || tx >= this.tw || ty >= this.th) return;
    this.tiles[ty * this.tw + tx] = t;
    repaintArea(this, tx, ty);
    this.flowAge = 999;
  }

  // Out-of-bounds tile next to an opening that leads to a neighbouring room.
  isExitEdge(tx, ty) {
    const t = this.tileAt(tx, ty);
    if (TILE_PROPS[t].solid) return false;
    const wx = this.px + tx * 16 + 8, wy = this.py + ty * 16 + 8;
    return !!this.game.world.roomAtPx(wx, wy);
  }

  breakWall(tx, ty) {
    this.flags[`wall:${this.id}:${tx},${ty}`] = true;
    this.setTile(tx, ty, this.def.brokenTile != null ? this.def.brokenTile : T.FLOOR3);
    const x = tx * 16 + 8, y = ty * 16 + 8;
    FX.shards(this.game.particles, x, y, 18, [P.gray, P.steel, P.slate, P.silver]);
    FX.poof(this.game.particles, x, y, 12, [P.silver, P.gray]);
    this.game.audio.play('rockBreak');
    if (!this._secretPlayed) {
      this._secretPlayed = true;
      setTimeout(() => this.game.audio.play('secret'), 250);
      this.game.progress.stats.secrets = (this.game.progress.stats.secrets || 0) + 1;
    }
  }

  // ---- signals (levers, plates, puzzles, arenas) ----
  emit(name, on = true, persist = false) {
    if (!name) return;
    if (persist) this.flags['sig:' + name] = on;
    for (const e of this.entities) if (e.onSignal) e.onSignal(name, on, false);
    if (this.game.onSignal) this.game.onSignal(name, on);
  }

  toggleCrystal() {
    this.crystal = this.crystal === 'red' ? 'blue' : 'red';
  }

  // ---- flow field towards the player for ground enemies ----
  updateFlow(target) {
    const tw = this.tw, th = this.th;
    if (!this.flow) {
      this.flow = new Int16Array(tw * th);
      this.blockMask = new Uint8Array(tw * th);
    }
    const mask = this.blockMask;
    for (let i = 0; i < mask.length; i++) {
      const p = TILE_PROPS[this.tiles[i]];
      mask[i] = p.solid || p.pit || p.lava ? 1 : 0;
    }
    for (const s of this.solids) {
      if (!s.solid || s.team === 'enemy') continue;
      const bw = s.bw ?? s.w, bh = s.bh ?? s.h;
      const x0 = Math.floor((s.x - bw / 2 + 2) / 16), x1 = Math.floor((s.x + bw / 2 - 2) / 16);
      const y0 = Math.floor((s.y - bh / 2 + 2) / 16), y1 = Math.floor((s.y + bh / 2 - 2) / 16);
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (x >= 0 && y >= 0 && x < tw && y < th) mask[y * tw + x] = 1;
    }
    const flow = this.flow;
    flow.fill(-1);
    const sx = Math.floor(target.x / 16), sy = Math.floor(target.y / 16);
    if (sx < 0 || sy < 0 || sx >= tw || sy >= th) return;
    const q = new Int32Array(tw * th);
    let qh = 0, qt = 0;
    flow[sy * tw + sx] = 0;
    q[qt++] = sy * tw + sx;
    while (qh < qt) {
      const i = q[qh++];
      const x = i % tw, y = (i / tw) | 0;
      const d = flow[i] + 1;
      if (x > 0) { const n = i - 1; if (flow[n] < 0 && !mask[n]) { flow[n] = d; q[qt++] = n; } }
      if (x < tw - 1) { const n = i + 1; if (flow[n] < 0 && !mask[n]) { flow[n] = d; q[qt++] = n; } }
      if (y > 0) { const n = i - tw; if (flow[n] < 0 && !mask[n]) { flow[n] = d; q[qt++] = n; } }
      if (y < th - 1) { const n = i + tw; if (flow[n] < 0 && !mask[n]) { flow[n] = d; q[qt++] = n; } }
    }
    this.flowAge = 0;
  }

  flowDir(x, y, target) {
    if (!this.flow || this.flowAge > 20) this.updateFlow(target);
    const tw = this.tw, th = this.th;
    const tx = Math.floor(x / 16), ty = Math.floor(y / 16);
    if (tx < 0 || ty < 0 || tx >= tw || ty >= th) return null;
    const cur = this.flow[ty * tw + tx];
    let best = cur < 0 ? 32767 : cur, bx = -1, by = -1;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = tx + dx, ny = ty + dy;
      if (nx < 0 || ny < 0 || nx >= tw || ny >= th) continue;
      if (dx && dy && (this.blockMask[ty * tw + nx] || this.blockMask[ny * tw + tx])) continue;
      const v = this.flow[ny * tw + nx];
      if (v >= 0 && v < best) { best = v; bx = nx; by = ny; }
    }
    if (bx < 0) return null;
    return Math.atan2(by * 16 + 8 - y, bx * 16 + 8 - x);
  }

  tick() { this.flowAge++; }
}
