// All rooms of Velmora.
import { VILLAGE } from './village.js';
import { FOREST } from './forest.js';
import { RUINS } from './ruins.js';

export const ROOMS = [...VILLAGE, ...FOREST, ...RUINS];

// New games start lying on the altar of the shrine.
export const START = { room: 'v_shrine', x: 15 * 16 + 8, y: 9 * 16 + 8, dir: 'down' };
