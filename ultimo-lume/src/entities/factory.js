// Maps legend specs to entity instances.
import { Breakable, Chest, Sign, Door, Gate, Lever, Plate, PushBlock, Torch, Brazier, CrystalSwitch, Barrier, EyeSwitch, OwlStatue, SymbolTile, Spikes, Boulder, Decor, Warp, Trigger, SealGate } from './props.js';
import { Pickup } from './pickups.js';
import { NPC } from './npc.js';
import { Slime } from './enemies/slime.js';
import { Bat } from './enemies/bat.js';
import { Skeleton } from './enemies/skeleton.js';
import { Archer } from './enemies/archer.js';
import { GLOBAL_LEGEND } from '../data/legend.js';
import { StoneGuardian } from './bosses/stoneGuardian.js';

export { GLOBAL_LEGEND };

// Types whose adjacent identical map chars merge into a single entity.
export const GROUPED = new Set(['door', 'gate', 'warp', 'trigger', 'sealGate']);

const TYPES = {
  breakable: (g, x, y, o) => new Breakable(g, x, y, o),
  chest: (g, x, y, o) => new Chest(g, x, y, o),
  sign: (g, x, y, o) => new Sign(g, x, y, o),
  door: (g, x, y, o) => new Door(g, x, y, o),
  gate: (g, x, y, o) => new Gate(g, x, y, o),
  lever: (g, x, y, o) => new Lever(g, x, y, o),
  plate: (g, x, y, o) => new Plate(g, x, y, o),
  block: (g, x, y, o) => new PushBlock(g, x, y, o),
  torch: (g, x, y, o) => new Torch(g, x, y, o),
  brazier: (g, x, y, o) => new Brazier(g, x, y, o),
  crystalSwitch: (g, x, y, o) => new CrystalSwitch(g, x, y, o),
  barrier: (g, x, y, o) => new Barrier(g, x, y, o),
  eye: (g, x, y, o) => new EyeSwitch(g, x, y, o),
  owl: (g, x, y, o) => new OwlStatue(g, x, y, o),
  symbol: (g, x, y, o) => new SymbolTile(g, x, y, o),
  spikes: (g, x, y, o) => new Spikes(g, x, y, o),
  boulder: (g, x, y, o) => new Boulder(g, x, y, o),
  decor: (g, x, y, o) => new Decor(g, x, y, o),
  warp: (g, x, y, o) => new Warp(g, x, y, o),
  trigger: (g, x, y, o) => new Trigger(g, x, y, o),
  npc: (g, x, y, o) => new NPC(g, x, y, o),
  sealGate: (g, x, y, o) => new SealGate(g, x, y, o),
  pickup: (g, x, y, o) => {
    if (o.flag && g.progress.flags[o.flag]) return null;
    return new Pickup(g, x, y, o.item, o.count || 1, { persist: o.flag, present: true });
  },
  tree: (g, x, y, o) => new Decor(g, x, y + 4, { sprite: 'tree.' + (o.v ?? ((x * 7 + y * 3) % 3)), solid: true, w: 10, h: 8, oy: 4, tall: true, ...o }),
  grave: (g, x, y, o) => new Decor(g, x, y, { sprite: 'grave.' + (o.v ?? ((x + y) % 2)), solid: true, w: 12, h: 8, ...o }),
  rock: (g, x, y, o) => new Decor(g, x, y, { sprite: 'rock', solid: true, w: 14, h: 10, oy: 6, ...o }),
  slime: (g, x, y, o) => new Slime(g, x, y, o),
  bat: (g, x, y, o) => new Bat(g, x, y, o),
  skeleton: (g, x, y, o) => new Skeleton(g, x, y, o),
  archer: (g, x, y, o) => new Archer(g, x, y, o),
  stoneGuardian: (g, x, y, o) => new StoneGuardian(g, x, y, o),
};

export function registerType(name, fn, enemy = false) {
  TYPES[name] = fn;
  if (enemy) ENEMY_TYPES.add(name);
}

export const ENEMY_TYPES = new Set(['slime', 'bat', 'skeleton', 'archer']);

export function createEntity(game, spec, x, y) {
  const fn = TYPES[spec.type];
  if (!fn) throw new Error('Unknown entity type ' + spec.type);
  const e = fn(game, x, y, spec);
  if (e && (spec.enemy || ENEMY_TYPES.has(spec.type))) e.isEnemy = true;
  return e;
}
