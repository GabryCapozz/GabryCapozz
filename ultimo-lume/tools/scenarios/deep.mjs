export default async function ({ shot, key, hold, wait, evalg }) {
  await key('Enter'); await wait(300); await key('Enter'); await wait(300); await key('Enter'); await wait(500);
  await evalg(() => {
    const g = window.__app.scene;
    g.scripts = []; g.cutscene = false; g.dialogue.active = false; g.hud.visible = true;
    g.player.setState('move');
    const pr = g.progress; pr.abilities.bow = true; pr.arrows = 20; pr.equipped = 'bow'; pr.abilities.lantern = true;
    g.enterRoom('k_boss', 57 * 16, 8 * 16 + 8);
  });
  await wait(400);
  await hold(['KeyA'], 700);
  await wait(2500);
  await shot('intro');
  await evalg(() => { const g = window.__app.scene; g.player.takeHit = () => null; });
  for (let i = 0; i < 8; i++) { await wait(800); await shot('p1_' + i); }
  // shoot the eye when open
  for (let i = 0; i < 10; i++) {
    const open = await evalg(() => window.__app.scene.room.entities.find(e => e.isBoss).eyeOpen);
    if (open > 0.8) { await key('KeyL'); }
    await wait(300);
  }
  console.log(JSON.stringify(await evalg(() => { const b = window.__app.scene.room.entities.find(e => e.isBoss); return { hp: b.hp, state: b.state }; })));
  await evalg(() => { const b = window.__app.scene.room.entities.find(e => e.isBoss); b.hp = b.maxHp * 0.6; b.checkPhase(); b.setState('PHASE'); });
  for (let i = 0; i < 5; i++) { await wait(900); await shot('p2_' + i); }
  await evalg(() => { const b = window.__app.scene.room.entities.find(e => e.isBoss); b.hp = b.maxHp * 0.3; b.checkPhase(); b.setState('PHASE'); });
  for (let i = 0; i < 6; i++) { await wait(900); await shot('p3_' + i); }
  await evalg(() => { const b = window.__app.scene.room.entities.find(e => e.isBoss); b.hurtFrom({}, 999); });
  await wait(4000); await shot('dead');
  console.log(JSON.stringify(await evalg(() => { const g = window.__app.scene; return { story: g.progress.story, ents: g.room.entities.filter(e => e.item || e.o?.style).map(e => e.item || e.o.style).join(',') }; })));
}
