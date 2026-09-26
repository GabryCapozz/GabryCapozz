export default async function ({ shot, key, hold, wait, evalg }) {
  await key('Enter'); await wait(300); await key('Enter'); await wait(300); await key('Enter'); await wait(500);
  await evalg(() => {
    const g = window.__app.scene;
    g.scripts = []; g.cutscene = false; g.dialogue.active = false; g.hud.visible = true;
    g.player.setState('move');
    const pr = g.progress;
    pr.abilities.bombs = true; pr.bombs = 7; pr.equipped = 'bombs'; pr.abilities.charge = true; pr.items.stoneHeart = 1;
    pr.items.ore = 2; pr.coins = 137; pr.heartPieces = 2; pr.items.page = 1;
    for (const id of ['v_shrine', 'v_square', 'v_east', 'f_edge', 'f_path', 'f_ruins', 'r_entry', 'r_hall', 'r_west']) pr.visited[id] = true;
    pr.flags['brazier:v_shrine'] = true;
    pr.markers.push({ gx: 9, gy: 5, icon: 1 });
    g.enterRoom('f_path', 10 * 16, 8 * 16);
  });
  await wait(800);
  await shot('forest_path');
  await key('KeyI'); await wait(400);
  await shot('inventory');
  await key('KeyK'); await wait(150); await key('KeyD'); await wait(150); await key('Enter'); await wait(300);
  await shot('abilities');
  await key('KeyK'); await wait(150); await key('KeyD'); await wait(150); await key('Enter'); await wait(300);
  await key('KeyD'); await wait(100); await key('KeyD'); await wait(100); await key('KeyJ'); await wait(200);
  await shot('map');
  await key('Backspace'); await wait(150); await key('KeyD'); await wait(150); await key('Enter'); await wait(300);
  await shot('options');
  await key('Escape'); await wait(150); await key('KeyD'); await wait(150); await key('Enter'); await wait(300);
  await shot('system');
  await key('Escape'); await wait(200); await key('Escape'); await wait(300);
  await shot('closed');
}
