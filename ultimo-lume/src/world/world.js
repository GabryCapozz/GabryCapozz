// World graph: room definitions placed on a grid of screen-sized cells.
import { CELL_PX_W, CELL_PX_H } from '../core/constants.js';

export class World {
  constructor(defs) {
    this.defs = {};
    this.cells = new Map();
    for (const d of defs) {
      if (this.defs[d.id]) throw new Error('Duplicate room id ' + d.id);
      this.defs[d.id] = d;
      for (let y = 0; y < (d.h || 1); y++) {
        for (let x = 0; x < (d.w || 1); x++) {
          const key = d.gx + x + ',' + (d.gy + y);
          if (this.cells.has(key)) throw new Error(`Rooms ${d.id} and ${this.cells.get(key).id} overlap at ${key}`);
          this.cells.set(key, d);
        }
      }
    }
  }

  get(id) { return this.defs[id]; }

  roomAtCell(gx, gy) { return this.cells.get(gx + ',' + gy) || null; }

  roomAtPx(wx, wy) {
    return this.roomAtCell(Math.floor(wx / CELL_PX_W), Math.floor(wy / CELL_PX_H));
  }

  // All rooms in a region (for the map legend / completion).
  byRegion(region) {
    return Object.values(this.defs).filter((d) => d.region === region);
  }
}
