// Global engine constants. Internal resolution is 480x270, scaled pixel-perfect.
export const W = 480;
export const H = 270;
export const TILE = 16;

// A world "cell" is one screen-sized chunk of map. Rooms are made of 1..n cells.
export const CELL_W = 30;
export const CELL_H = 17;
export const CELL_PX_W = CELL_W * TILE;
export const CELL_PX_H = CELL_H * TILE;

export const FPS = 60;
export const STEP = 1 / FPS;

export const DEBUG = typeof location !== 'undefined' && new URLSearchParams(location.search).has('debug');

export const SAVE_PREFIX = 'ultimolume.v1';
