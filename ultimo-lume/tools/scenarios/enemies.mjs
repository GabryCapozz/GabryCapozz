// Fight in rooms that host every enemy type; kill them all and look for runtime errors.
export default async function ({ shot, key, hold, wait, evalg }) {
  await key('Enter'); await wait(300); await key('Enter'); await wait(300); await key('Enter'); await wait(500);
  await evalg(() => {
    const g = window.__app.scene;
    g.scripts = []; g.cutscene = false; g.dialogue.active = false; g.hud.visible = true;
    g.player.setState('move');
    Object.assign(g.progress.abilities, { bow: true, bombs: true, shadow: true, light: true, lantern: true });
    g.progress.arrows = 30; g.progress.bombs = 10;
  });
  const rooms = [['c_yard', 15, 7], ['k_mage', 15, 8], ['m_rails', 15, 8], ['s_steps', 15, 8], ['c_hall', 15, 8], ['k_crystal', 15, 8], ['m_entry', 15, 9]];
  for (const [id, tx, ty] of rooms) {
    await evalg(([id, tx, ty]) => { const g = window.__app.scene; g.enterRoom(id, tx * 16 + 8, ty * 16 + 8); g.progress.hp = g.progress.maxHp; }, [id, tx, ty]);
    await wait(700);
    const types = await evalg(() => window.__app.scene.room.entities.filter((e) => e.team === 'enemy' && e.aggro != null).map((e) => e.constructor.name).join(','));
    console.log(id, types);
    for (let i = 0; i < 10; i++) {
      await hold(['KeyD'], 150); await key('KeyJ'); await wait(120); await key('KeyJ');
      await hold(['KeyW'], 150); await key('KeyK'); await wait(200);
      await evalg(() => { const g = window.__app.scene; g.progress.hp = g.progress.maxHp; if (g.player.state === 'dead') g.player.setState('move'); });
    }
    await shot(id + '_fight');
    // finish them with real hits so death paths run
    for (let i = 0; i < 6; i++) {
      await evalg(() => {
        const g = window.__app.scene;
        for (const e of g.room.entities) if (e.team === 'enemy' && e.aggro != null && !e.dead && !e.isBoss && e.takeHit) {
          e.invuln = 0; if (e.state === 'GUARD' || e.guarding) e.guarding = false;
          e.takeHit({ x: e.x, y: e.y - 12, damage: 3, knock: 2, team: 'player', flags: { sword: true, bomb: true, light: true } });
        }
      });
      await wait(250);
    }
    await wait(800);
    const left = await evalg(() => window.__app.scene.room.entities.filter((e) => e.team === 'enemy' && e.aggro != null && !e.dead).map((e) => e.constructor.name + ':' + e.hp + ':' + e.state).join(','));
    console.log('  left', left || '(none)');
    await shot(id + '_after');
  }
}
