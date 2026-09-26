import { buildHumanoid, LOOKS } from '../src/gfx/sprites/humanoid.js';
const S = 4;
const c = document.getElementById('c');
c.width = 320; c.height = 225;
const ctx = c.getContext('2d');
ctx.imageSmoothingEnabled = false;
ctx.fillStyle = '#3e8948'; ctx.fillRect(0, 0, c.width, c.height);
let y = 2;
const which = new URLSearchParams(location.search).get('set') || 'humans';
if (which === 'humans') {
  for (const name of ['player', 'maren', 'brann', 'oda', 'gert', 'skeleton', 'mage', 'skeletonKnight']) {
    const h = buildHumanoid(LOOKS[name]);
    let x = 2;
    for (const dir of ['right', 'left']) {
      for (const anim of ['idle', 'walk', 'attack', 'hurt', 'dash', 'hold', 'drink']) {
        for (const f of h[dir][anim]) { ctx.drawImage(f, x, y); x += 17; if (x > 300) break; }
      }
      if (x > 300) break;
    }
    y += 23;
  }
}
c.style.width = c.width * S + 'px'; c.style.height = c.height * S + 'px';
