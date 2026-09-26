export default async function ({ shot, key, hold, wait, evalg }) {
  await key('Enter'); await wait(300); await key('Enter'); await wait(300); await key('Enter'); await wait(500);
  await evalg(() => {
    const g = window.__app.scene;
    g.scripts = []; g.cutscene = false; g.dialogue.active = false; g.hud.visible = true;
    g.player.setState('move');
    g.progress.abilities.bombs = true; g.progress.bombs = 10; g.progress.equipped = 'bombs';
    g.enterRoom('r_boss', 15 * 16, 15 * 16);
  });
  await wait(600);
  await hold(['KeyW'], 900);
  await wait(1000);
  await shot('intro');
  await wait(1800);
  await shot('intro2');
  // make the player invulnerable to watch patterns
  await evalg(() => { const g = window.__app.scene; g.player.takeHit = () => null; });
  for (let i = 0; i < 6; i++) { await wait(900); await shot('p1_' + i); }
  await evalg(() => { const b = window.__app.scene.room.entities.find(e => e.isBoss); b.hp = b.maxHp * 0.6; b.checkPhase(); b.setState('PHASE'); });
  for (let i = 0; i < 6; i++) { await wait(900); await shot('p2_' + i); }
  await evalg(() => { const b = window.__app.scene.room.entities.find(e => e.isBoss); b.hp = b.maxHp * 0.3; b.checkPhase(); b.setState('PHASE'); });
  for (let i = 0; i < 8; i++) { await wait(900); await shot('p3_' + i); }
  await evalg(() => { const b = window.__app.scene.room.entities.find(e => e.isBoss); b.hp = 1; b.takeHit({ damage: 5, x: b.x, y: b.y, flags: {} }); });
  await wait(1500); await shot('dying');
  await wait(3000); await shot('dead');
  const st = await evalg(() => { const g = window.__app.scene; return { story: g.progress.story, flags: Object.keys(g.progress.flags).filter(k => k.startsWith('boss')), ents: g.room.entities.map(e => e.constructor.name + (e.item ? ':' + e.item : '')).join(',') }; });
  console.log(JSON.stringify(st));
}
