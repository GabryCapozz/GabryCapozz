// Tile type ids and their physical properties.
export const T = {
  FLOOR: 0,
  FLOOR2: 1,
  FLOOR3: 2,
  WALL: 3,
  FOLIAGE: 4,
  WATER: 5,
  SHALLOW: 6,
  CHASM: 7,
  LAVA: 8,
  BRIDGE: 9,
  CRACKED: 10,
  FENCE: 11,
  RAIL: 12,
  BARRIER: 13, // invisible solid (under big props / map edges)
};

const PROPS = [];
const def = (id, p) => (PROPS[id] = Object.assign({ solid: false, wall: false, blocksProj: false, pit: false, lava: false, water: false, anim: false }, p));
def(T.FLOOR, {});
def(T.FLOOR2, {});
def(T.FLOOR3, {});
def(T.WALL, { solid: true, wall: true, blocksProj: true });
def(T.FOLIAGE, { solid: true, wall: true, blocksProj: true });
def(T.WATER, { solid: true, water: true, anim: true });
def(T.SHALLOW, { shallow: true, anim: true });
def(T.CHASM, { pit: true });
def(T.LAVA, { lava: true, anim: true });
def(T.BRIDGE, {});
def(T.CRACKED, { solid: true, wall: true, blocksProj: true, cracked: true });
def(T.FENCE, { solid: true });
def(T.RAIL, {});
def(T.BARRIER, { solid: true });

export const TILE_PROPS = PROPS;

// Characters in map strings that map directly to tile types.
export const CHAR_TILES = {
  '.': T.FLOOR,
  ',': T.FLOOR2,
  ';': T.FLOOR3,
  '#': T.WALL,
  T: T.FOLIAGE,
  '~': T.WATER,
  w: T.SHALLOW,
  _: T.CHASM,
  L: T.LAVA,
  '=': T.BRIDGE,
  '%': T.CRACKED,
  f: T.FENCE,
  R: T.RAIL,
  X: T.BARRIER,
};

export const isWallType = (t) => t === T.WALL || t === T.CRACKED || t === T.FOLIAGE;
export const isGroundType = (t) => t === T.FLOOR || t === T.FLOOR2 || t === T.FLOOR3 || t === T.BRIDGE || t === T.RAIL || t === T.SHALLOW;
