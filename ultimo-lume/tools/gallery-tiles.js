import { renderRoom, drawAnimatedTiles } from '../src/world/roomRender.js';
import { CHAR_TILES, T } from '../src/world/tiletypes.js';
const theme = new URLSearchParams(location.search).get('theme') || 'village';
const map = [
  '##############################',
  '##############################',
  '#.....,,,,.......TTTTTT......#',
  '#.....,,,,.......TTTTTT......#',
  '#..,,,,,,,,,,....TTTT........#',
  '#..,,,..,,,,,,.........;;;...#',
  '#..,,.....~~~~~~.......;;;...#',
  '#..,,.....~~~~~~===....;;;...#',
  '#.........~~~~~~.......####..#',
  '#...ffff..wwww.........##%#..#',
  '#.........wwww.........#..#..#',
  '#...######.....__________....#',
  '#...######.....____===___....#',
  '#...#%.#.......__________....#',
  '#..............LLLLL...RRRR..#',
  '#......TTTT....LLLLL.........#',
  '##############################',
];
const room = {
  tw: 30, th: 17, theme, seed: 3,
  tiles: new Uint8Array(30 * 17),
  tileAt(x, y) { x = Math.max(0, Math.min(this.tw - 1, x)); y = Math.max(0, Math.min(this.th - 1, y)); return this.tiles[y * this.tw + x]; },
};
map.forEach((row, y) => { for (let x = 0; x < 30; x++) room.tiles[y * 30 + x] = CHAR_TILES[row[x]] ?? T.FLOOR; });
renderRoom(room);
const c = document.getElementById('c');
c.width = 480; c.height = 272;
const ctx = c.getContext('2d');
ctx.drawImage(room.canvas, 0, 0);
drawAnimatedTiles(ctx, room, 0, 0, 480, 272, 30);
ctx.drawImage(room.overlay, 0, 0);
c.style.width = '1440px'; c.style.height = '816px';
