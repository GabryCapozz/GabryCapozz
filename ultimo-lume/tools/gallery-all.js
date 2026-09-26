import { buildSprites } from '../src/gfx/sprites/index.js';
import { slashArc } from '../src/gfx/sprites/fx.js';
const t0 = performance.now();
const S = buildSprites();
console.log('build ms', Math.round(performance.now() - t0));
const c = document.getElementById('c');
c.width = 480; c.height = 300;
const ctx = c.getContext('2d');
ctx.fillStyle = '#3e8948'; ctx.fillRect(0, 0, c.width, c.height);
let x = 2, y = 2, rowH = 0;
function put(img) {
  if (x + img.width > 478) { x = 2; y += rowH + 2; rowH = 0; }
  ctx.drawImage(img, x, y); x += img.width + 2; rowH = Math.max(rowH, img.height);
}
const pr = S.props;
[pr.chest.closed, pr.chest.open, pr.bigChest.closed, pr.bigChest.open, pr.pot.whole, pr.pot.broken, pr.bush[0].whole, pr.bush[0].cut, pr.bush[1].whole, pr.tallGrass[0][0], pr.sign, pr.lever.off, pr.lever.on, pr.torch, pr.flameSmall[0], pr.brazier.unlit, pr.brazier.lit, pr.flameBig[1], pr.plate.up, pr.plate.down, pr.block, pr.crystalSwitch.red, pr.crystalSwitch.blue, pr.barrier.redUp, pr.barrier.blueDown, pr.eyeSwitch.closed, pr.eyeSwitch.open, pr.owl.down, pr.owl.left].forEach(put);
[pr.doorH.key, pr.doorH.boss, pr.doorH.gate, pr.doorV.key, pr.spikes.up, pr.spikes.down, pr.stairsDown, pr.caveMouth, pr.mineMouth, pr.boulder, pr.rock, pr.grave[0], pr.grave[1], pr.crate, pr.barrel, pr.well].forEach(put);
[pr.house[0], pr.house[1], pr.pillar, pr.pillarBroken, pr.tree[0], pr.tree[1], pr.tree[2], pr.deadTree, pr.statue, pr.socketGate[2], pr.banner.red, pr.bookshelf, pr.throne, pr.crystal.blue, pr.crystal.pink, pr.minecart, pr.bones, pr.mushrooms, pr.glowshrooms, pr.candles, pr.altar, pr.ladder].forEach(put);
const it = S.items;
[it.heart.full, it.heart.half, it.heart.empty, it.coin[0][0], it.coin[1][0], it.coin[2][1], ...Object.entries(it).filter(([k]) => k !== 'heart' && k !== 'coin').map(([, v]) => v)].forEach(put);
const fx = S.fx;
[...fx.star, ...fx.smoke, ...fx.explosion.slice(0, 4), fx.shadow.m, fx.shadow.l, ...fx.orb.slice(0, 2), fx.bubble.alert, fx.bubble.question, fx.rock, ...fx.acid].forEach(put);
for (let f = 0; f < 3; f++) put(slashArc(0.3, f));
put(slashArc(Math.PI / 2, 1, { pal: 'heavy', rOut: 23, span: 3.4 }));
put(slashArc(-Math.PI / 2, 1, { pal: 'enemy' }));
[...S.slime.green.idle, S.slime.green.prep[0], S.slime.green.jump[0], S.slime.blue.idle[0], S.slime.red.idle[0], S.slime.blueSmall.idle[0], ...S.bat.cave.fly.slice(0, 3), ...S.wisp.fly.slice(0, 2), ...S.beetle.mine.down.walk, S.beetle.mine.right.charge[0], S.beetle.mine.down.stun[0], ...S.armor.iron.down.idle, S.armor.iron.down.raise[0], S.armor.iron.down.slam[0], S.armor.iron.right.walk[0], S.turret.open[0]].forEach(put);
const b = S.bosses.stone.normal;
[b.torso, b.head, b.fist, b.arm, b.leg, S.bosses.stone.core[0], S.bosses.stone.cracked.torso].forEach(put);
c.style.width = c.width * 3 + 'px'; c.style.height = c.height * 3 + 'px';
