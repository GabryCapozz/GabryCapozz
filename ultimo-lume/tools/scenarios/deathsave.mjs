export default async function ({ shot, key, hold, wait, evalg }) {
  const log = (x) => console.log(JSON.stringify(x));
  await key('Enter'); await wait(300); await key('Enter'); await wait(300); await key('Enter'); await wait(500);
  await evalg(() => {
    const g = window.__app.scene;
    g.scripts = []; g.cutscene = false; g.dialogue.active = false; g.hud.visible = true;
    g.player.setState('move');
    g.progress.coins = 42;
    g.enterRoom('v_fields', 18 * 16, 8 * 16);
    g.progress.hp = 1;
  });
  await wait(300);
  await evalg(() => { const g = window.__app.scene; g.player.takeHit({ x: g.player.x + 10, y: g.player.y, damage: 1, knock: 2, flags: {} }); });
  await wait(1800);
  await shot('gameover');
  await key('KeyJ'); await wait(1200);
  await shot('respawn');
  log(await evalg(() => { const g = window.__app.scene; return { room: g.room.id, hp: g.progress.hp, deaths: g.progress.deaths, coins: g.progress.coins }; }));
  // quit to title via menu then continue
  await key('Escape'); await wait(200);
  await key('KeyA'); await wait(100); // wrap to "Sistema"
  await key('Enter'); await wait(150); await key('KeyS'); await wait(150); await key('Enter'); await wait(800);
  await shot('title_again');
  await key('Enter'); await wait(1500); // "Continua"
  await shot('continued');
  log(await evalg(() => { const g = window.__app.scene; return { scene: g.constructor.name, room: g.room && g.room.id, coins: g.progress && g.progress.coins, deaths: g.progress && g.progress.deaths }; }));
}
