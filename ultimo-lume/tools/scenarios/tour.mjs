// Visit every room (optionally filtered by id prefix) and screenshot it.
export default async function ({ shot, key, wait, evalg }) {
  const prefix = process.env.TOUR || '';
  await key('Enter'); await wait(300); await key('Enter'); await wait(300); await key('Enter'); await wait(500);
  const ids = await evalg((pre) => {
    const g = window.__app.scene;
    g.scripts = []; g.cutscene = false; g.dialogue.active = false; g.hud.visible = true;
    g.player.setState('move');
    g.player.takeHit = () => null;
    const pr = g.progress;
    Object.assign(pr.abilities, { bow: true, bombs: true, shadow: true, light: true, lantern: true });
    return Object.keys(g.world.defs).filter((id) => id.startsWith(pre));
  }, prefix);
  for (const id of ids) {
    await evalg((id) => {
      const g = window.__app.scene;
      const r = g.world.get(id);
      g.dialogue.active = false; g.cutscene = false;
      // find a walkable spot near the centre
      g.enterRoom(id, (r.w || 1) * 240, (r.h || 1) * 136);
      const room = g.room;
      let best = null;
      for (let d = 0; d < 12 && !best; d++) for (let y = -d; y <= d && !best; y++) for (let x = -d; x <= d; x++) {
        const tx = (room.tw >> 1) + x, ty = (room.th >> 1) + y;
        if (room.tileAt(tx, ty) === 0 || room.tileAt(tx, ty) === 1 || room.tileAt(tx, ty) === 2) { best = [tx, ty]; break; }
      }
      if (best) { g.player.x = best[0] * 16 + 8; g.player.y = best[1] * 16 + 8; }
    }, id);
    await wait(900);
    await shot(id);
  }
}
