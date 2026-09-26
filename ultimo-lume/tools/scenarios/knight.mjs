export default async function ({ shot, key, hold, wait, evalg }) {
  await key('Enter'); await wait(300); await key('Enter'); await wait(300); await key('Enter'); await wait(500);
  await evalg(() => {
    const g = window.__app.scene;
    g.scripts = []; g.cutscene = false; g.dialogue.active = false; g.hud.visible = true;
    g.player.setState('move');
    const pr = g.progress; pr.abilities.bow = true; pr.arrows = 20; pr.abilities.bombs = true; pr.bombs = 10; pr.abilities.shadow = true; pr.equipped = 'bombs'; pr.abilities.lantern = true;
    pr.story = 2;
    g.enterRoom('c_throne', 44 * 16 + 16, 15 * 16 + 8);
  });
  await wait(600);
  await shot('enter');
  await hold(['KeyW'], 900);
  await wait(1500);
  await shot('intro');
  for (let i = 0; i < 6; i++) { await key('KeyE'); await wait(500); }
  await wait(2000);
  await shot('fight');
  await evalg(() => { const g = window.__app.scene; g.player.takeHit = () => null; });
  for (let i = 0; i < 8; i++) {
    await key('KeyJ'); await wait(250); await key('KeyJ'); await wait(500);
    await shot('p1_' + i);
  }
  console.log(JSON.stringify(await evalg(() => { const b = window.__app.scene.room.entities.find(e => e.isBoss); return { hp: b.hp, state: b.state, phase: b.phase }; })));
  await evalg(() => { const b = window.__app.scene.room.entities.find(e => e.isBoss); b.hp = b.maxHp * 0.6; b.checkPhase(); b.setState('PHASE'); });
  for (let i = 0; i < 8; i++) { await wait(900); await shot('p2_' + i); }
  await evalg(() => { const b = window.__app.scene.room.entities.find(e => e.isBoss); b.hp = b.maxHp * 0.3; b.checkPhase(); b.setState('PHASE'); });
  for (let i = 0; i < 8; i++) { await wait(900); await shot('p3_' + i); }
  console.log(JSON.stringify(await evalg(() => { const b = window.__app.scene.room.entities.find(e => e.isBoss); return { hp: b.hp, state: b.state, phase: b.phase }; })));
  await evalg(() => { const b = window.__app.scene.room.entities.find(e => e.isBoss); b.hp = 0; b.startDeath(); });
  for (let i = 0; i < 4; i++) { await wait(1500); await shot('dead' + i); await key('KeyE'); }
  await wait(3000); await shot('after');
  console.log(JSON.stringify(await evalg(() => { const g = window.__app.scene; return { story: g.progress.story, abil: g.progress.abilities, ents: g.room.entities.filter(e => e.item || e.o?.style).map(e => e.item || e.o.style).join(','), cut: g.cutscene }; })));
}
