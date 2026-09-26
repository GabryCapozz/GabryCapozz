// Validates every room map: dimensions, legend characters, exit alignment
// between neighbouring rooms and warp links. Run with `npm run check`.
import { ROOMS } from '../src/data/world/index.js';
import { GLOBAL_LEGEND } from '../src/data/legend.js';

const CELL_W = 30, CELL_H = 17;
const TILE_CHARS = new Set(['.', ',', ';', '#', 'T', '~', 'w', '_', 'L', '=', '%', 'f', 'R', 'X']);
const BLOCKING = new Set(['#', 'T', '~', 'X', 'f', '_', 'L']);
let errors = 0, warnings = 0;
const err = (m) => { errors++; console.log('ERROR  ' + m); };
const warn = (m) => { warnings++; console.log('warn   ' + m); };

const cells = new Map();
const byId = {};
for (const r of ROOMS) {
  byId[r.id] = r;
  const w = (r.w || 1) * CELL_W, h = (r.h || 1) * CELL_H;
  if (r.map.length !== h) err(`${r.id}: ${r.map.length} rows, expected ${h}`);
  r.map.forEach((row, y) => {
    if (row.length !== w) err(`${r.id}: row ${y} has ${row.length} chars, expected ${w}: "${row}"`);
    for (const ch of row) {
      if (r.legend && r.legend[ch]) continue;
      if (TILE_CHARS.has(ch) || GLOBAL_LEGEND[ch]) continue;
      err(`${r.id}: unknown char '${ch}' in row ${y}`);
    }
  });
  for (let y = 0; y < (r.h || 1); y++) for (let x = 0; x < (r.w || 1); x++) {
    const k = `${r.gx + x},${r.gy + y}`;
    if (cells.has(k)) err(`${r.id} overlaps ${cells.get(k).id} at cell ${k}`);
    cells.set(k, r);
  }
}

function charAt(r, x, y) {
  const row = r.map[y];
  return row ? row[x] : undefined;
}

function isOpen(r, ch) {
  if (ch === undefined) return false;
  if (r.legend && r.legend[ch]) {
    const spec = r.legend[ch];
    return spec.type !== 'decor' || !spec.solid;
  }
  return !BLOCKING.has(ch);
}

// exits: compare border tiles with neighbours
for (const r of ROOMS) {
  const w = (r.w || 1) * CELL_W, h = (r.h || 1) * CELL_H;
  const check = (x, y, nx, ny, side) => {
    const ch = charAt(r, x, y);
    if (!isOpen(r, ch)) return;
    const wx = r.gx * CELL_W + nx, wy = r.gy * CELL_H + ny;
    const cell = cells.get(`${Math.floor(wx / CELL_W)},${Math.floor(wy / CELL_H)}`);
    if (!cell) { if (!r.edgeOk) warn(`${r.id}: open ${side} edge at ${x},${y} leads nowhere`); return; }
    const lx = wx - cell.gx * CELL_W, ly = wy - cell.gy * CELL_H;
    const other = charAt(cell, lx, ly);
    if (!isOpen(cell, other) && ch !== '%' && other !== '%') err(`${r.id} ${side} edge ${x},${y} ('${ch}') -> ${cell.id} ${lx},${ly} ('${other}') is blocked`);
  };
  for (let x = 0; x < w; x++) { check(x, 0, x, -1, 'top'); check(x, h - 1, x, h, 'bottom'); }
  for (let y = 0; y < h; y++) { check(0, y, -1, y, 'left'); check(w - 1, y, w, y, 'right'); }
}

// warps
for (const r of ROOMS) {
  for (const [ch, spec] of Object.entries(r.legend || {})) {
    if (spec.type !== 'warp') continue;
    if (!r.map.some((row) => row.includes(ch))) warn(`${r.id}: warp '${ch}' not placed on map`);
    const t = byId[spec.to];
    if (!t) { err(`${r.id}: warp to unknown room ${spec.to}`); continue; }
    const target = Object.values(t.legend || {}).find((s) => s.type === 'warp' && s.id === spec.at);
    if (!target) err(`${r.id}: warp '${ch}' -> ${spec.to} has no warp with id '${spec.at}'`);
  }
  for (const [ch, spec] of Object.entries(r.legend || {})) {
    if (spec.type && spec.type !== 'spawn' && !r.map.some((row) => row.includes(ch)) && !GLOBAL_LEGEND[ch]) warn(`${r.id}: legend '${ch}' (${spec.type}) unused`);
  }
}

console.log(`\n${ROOMS.length} rooms checked: ${errors} errors, ${warnings} warnings`);
process.exit(errors ? 1 : 0);
