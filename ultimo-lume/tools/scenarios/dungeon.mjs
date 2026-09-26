export default async function ({ shot, key, hold, wait, evalg }) {
  const log = (x) => console.log(JSON.stringify(x));
  await key('Enter'); await wait(300); await key('Enter'); await wait(300); await key('Enter'); await wait(500);
  const go = (room, tx, ty) => evalg(([room, tx, ty]) => {
    const g = window.__app.scene;
    g.scripts = []; g.cutscene = false; g.dialogue.active = false; g.hud.visible = true;
    g.player.setState('move');
    g.enterRoom(room, tx * 16 + 8, ty * 16 + 8);
  }, [room, tx, ty]);
  // --- arena in r_hall
  await go('r_hall', 15, 13);
  await hold(['KeyW'], 700);
  await wait(300);
  await shot('hall_arena');
  log(await evalg(() => { const g = window.__app.scene; return { arena: g.arenaActive, gates: g.room.entities.filter(e => e.id === 'r_hall.arena').map(e => e.isOpen) }; }));
  await evalg(() => { const g = window.__app.scene; for (const e of g.room.entities) if (e.isEnemy) e.die(null); });
  await wait(800);
  log(await evalg(() => { const g = window.__app.scene; return { arena: g.arenaActive, cleared: !!g.progress.flags['clear:r_hall'], gates: g.room.entities.filter(e => e.id === 'r_hall.arena').map(e => e.isOpen) }; }));
  // --- push block in r_west: stand right of block and push left once
  await go('r_west', 12, 12);
  await wait(300);
  await hold(['KeyA'], 900);
  await wait(300);
  log(await evalg(() => { const b = window.__app.scene.room.entities.find(e => e.pushable); return { blockTx: Math.floor(b.x / 16), blockTy: Math.floor(b.y / 16) }; }));
  await shot('west_push');
  // move block onto the plate
  await evalg(() => { const g = window.__app.scene; const b = g.room.entities.find(e => e.pushable); b.x = 4 * 16 + 8; b.y = 9 * 16 + 8; });
  await wait(500);
  log(await evalg(() => { const g = window.__app.scene; return { gate: g.room.entities.find(e => e.id === 'r_west.gate').isOpen, flag: g.progress.flags['sig:r_west.gate'] }; }));
  await shot('west_gate_open');
  // --- door with key in r_hall
  await evalg(() => { window.__app.scene.progress.keys.ruins = 1; });
  await go('r_hall', 27, 8);
  await hold(['KeyD'], 300);
  await key('KeyE'); await wait(900);
  log(await evalg(() => { const g = window.__app.scene; const d = g.room.entities.find(e => e.lock === 'key'); return { doorOpen: d.open, keys: g.progress.keys.ruins }; }));
  // --- crystals in r_east
  await go('r_east', 15, 13);
  await hold(['KeyW'], 250);
  await key('KeyJ'); await wait(400);
  log(await evalg(() => { const g = window.__app.scene; return { crystal: g.room.crystal, red: g.room.entities.filter(e => e.color === 'red').map(e => e.solid), blue: g.room.entities.filter(e => e.color === 'blue').map(e => e.solid) }; }));
  await shot('east_crystal');
  // --- owls in r_bosskey
  await go('r_bosskey', 15, 6);
  await evalg(() => { const g = window.__app.scene; for (const o of g.room.entities.filter(e => e.o && e.o.group === 'owls')) { while (o.dir !== o.o.want) o.onInteract(); } });
  await wait(600);
  log(await evalg(() => { const g = window.__app.scene; const c = g.room.entities.find(e => e.o && e.o.item === 'bossKey'); return { chestHidden: c.hidden, flag: g.progress.flags['sig:r_bosskey.owls'] }; }));
  await shot('owls');
  // --- bombs on the cracked wall in r_bombs
  await evalg(() => { const pr = window.__app.scene.progress; pr.abilities.bombs = true; pr.bombs = 5; pr.equipped = 'bombs'; });
  await go('r_bombs', 2, 8);
  await evalg(() => { const g = window.__app.scene; for (const e of g.room.entities) if (e.isEnemy) e.dead = true; });
  await hold(['KeyA'], 100);
  await key('KeyL'); await wait(2200);
  await shot('bomb');
  log(await evalg(() => { const g = window.__app.scene; return { t8: g.room.tileAt(0, 8), t9: g.room.tileAt(0, 9), flag: !!g.progress.flags['wall:r_bombs:0,8'] }; }));
}
