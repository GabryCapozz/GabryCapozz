// Save slots (3) + settings, stored in localStorage with an in-memory fallback
// when storage is unavailable (private mode, sandboxed previews).
import { SAVE_PREFIX } from '../core/constants.js';
import { DEFAULT_BINDINGS } from '../core/input.js';

export const SLOTS = 3;

const memory = new Map();
let persistent = true;

function read(key) {
  try {
    const v = window.localStorage.getItem(key);
    return v;
  } catch {
    persistent = false;
    return memory.has(key) ? memory.get(key) : null;
  }
}

function write(key, value) {
  memory.set(key, value);
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    persistent = false;
    return false;
  }
}

function remove(key) {
  memory.delete(key);
  try { window.localStorage.removeItem(key); } catch { persistent = false; }
}

export function storageIsPersistent() {
  read(SAVE_PREFIX + '.probe');
  return persistent;
}

export function newProgress() {
  return {
    version: 1,
    created: Date.now(),
    updated: Date.now(),
    playTime: 0,
    deaths: 0,
    hp: 6,
    maxHp: 6,
    maxStamina: 100,
    potions: 2,
    potionMax: 2,
    coins: 0,
    bombs: 0,
    bombMax: 10,
    arrows: 0,
    arrowMax: 20,
    swordLv: 1,
    heartPieces: 0,
    abilities: { dodge: true, charge: false, bombs: false, bow: false, shadow: false, light: false, lantern: false },
    equipped: null,
    items: {},
    keys: {},
    bossKeys: {},
    flags: {},
    visited: {},
    markers: [],
    checkpoint: null,
    pos: null,
    story: 0,
    stats: { secrets: 0, kills: 0 },
    ended: null,
  };
}

export function loadSlot(i) {
  const raw = read(`${SAVE_PREFIX}.slot${i}`);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    return Object.assign(newProgress(), data, {
      abilities: Object.assign(newProgress().abilities, data.abilities || {}),
      stats: Object.assign(newProgress().stats, data.stats || {}),
    });
  } catch {
    return null;
  }
}

export function saveSlot(i, progress) {
  progress.updated = Date.now();
  return write(`${SAVE_PREFIX}.slot${i}`, JSON.stringify(progress));
}

export function deleteSlot(i) {
  remove(`${SAVE_PREFIX}.slot${i}`);
}

export function slotSummaries() {
  const out = [];
  for (let i = 0; i < SLOTS; i++) out.push(loadSlot(i));
  return out;
}

export const DEFAULT_SETTINGS = {
  music: 7,
  sfx: 8,
  shake: 2, // 0 off, 1 reduced, 2 normal
  integerScale: true,
  bindings: DEFAULT_BINDINGS,
  lastSlot: 0,
};

export function loadSettings() {
  const raw = read(`${SAVE_PREFIX}.settings`);
  const s = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  if (!raw) return s;
  try {
    const d = JSON.parse(raw);
    Object.assign(s, d);
    s.bindings = Object.assign(JSON.parse(JSON.stringify(DEFAULT_BINDINGS)), d.bindings || {});
  } catch {
    /* corrupted settings: use defaults */
  }
  return s;
}

export function saveSettings(s) {
  write(`${SAVE_PREFIX}.settings`, JSON.stringify(s));
}

export function formatTime(frames) {
  const s = Math.floor(frames / 60);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
}
