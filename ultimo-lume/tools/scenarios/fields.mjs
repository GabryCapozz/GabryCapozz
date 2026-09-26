export default async function ({ shot, key, hold, wait, evalg }) {
  await key('Enter'); await wait(300); await key('Enter'); await wait(300); await key('Enter'); await wait(500);
  // skip the intro: jump straight into the fields with slimes
  await evalg(() => {
    const g = window.__app.scene;
    g.scripts = []; g.cutscene = false; g.dialogue.active = false; g.hud.visible = true;
    g.player.setState('move');
    g.enterRoom('v_fields', 9 * 16, 8 * 16 + 8);
  });
  await wait(900);
  await shot('fields');
  await hold(['KeyD'], 400);
  for (let i = 0; i < 6; i++) { await key('KeyJ', 50); await wait(90); }
  await shot('fight1');
  await hold(['KeyD', 'KeyS'], 300);
  await key('KeyK'); await wait(60);
  await shot('dash');
  for (let i = 0; i < 6; i++) { await key('KeyJ', 50); await wait(110); }
  await wait(300);
  await shot('fight2');
  await hold(['KeyD'], 900);
  for (let i = 0; i < 9; i++) { await key('KeyJ', 50); await wait(110); }
  await shot('fight3');
  const st = await evalg(() => { const g = window.__app.scene; return { hp: g.progress.hp, coins: g.progress.coins, enemies: g.room.entities.filter(e => e.isEnemy && !e.dead).length, kills: g.progress.stats.kills }; });
  console.log(JSON.stringify(st));
}
