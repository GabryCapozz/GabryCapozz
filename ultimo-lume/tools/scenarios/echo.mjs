export default async function ({ shot, key, hold, wait, evalg }) {
  await key('Enter'); await wait(300); await key('Enter'); await wait(300); await key('Enter'); await wait(500);
  await evalg(() => {
    const g = window.__app.scene;
    g.scripts = []; g.cutscene = false; g.dialogue.active = false; g.hud.visible = true;
    g.player.setState('move');
    const pr = g.progress;
    Object.assign(pr.abilities, { bow: true, bombs: true, shadow: true, light: true, lantern: true });
    pr.arrows = 20; pr.bombs = 10; pr.equipped = 'light'; pr.story = 3;
    g.enterRoom('s_final', 58 * 16, 8 * 16 + 8);
  });
  await wait(600);
  await shot('enter');
  await hold(['KeyA'], 900);
  await wait(1200);
  await shot('intro');
  for (let i = 0; i < 5; i++) { await key('KeyE'); await wait(500); }
  await wait(2000);
  await shot('fight');
  await evalg(() => { const g = window.__app.scene; g.player.takeHit = () => null; });
  for (let i = 0; i < 6; i++) { await key('KeyJ'); await wait(250); await key('KeyJ'); await wait(500); await shot('p1_' + i); }
  const st = () => evalg(() => { const b = window.__app.scene.room.entities.find(e => e.isBoss); return { hp: b.hp, state: b.state, phase: b.phase, form: b.form, shield: b.shield }; });
  console.log(JSON.stringify(await st()));
  await evalg(() => { const b = window.__app.scene.room.entities.find(e => e.isBoss); b.hp = b.maxHp * 0.5; b.checkPhase(); });
  for (let i = 0; i < 7; i++) { await wait(500); await key("KeyE"); }
  for (let i = 0; i < 6; i++) { await wait(900); await shot('p2_' + i); }
  console.log(JSON.stringify(await st()));
  // break the shield with light slashes aimed at the flame
  for (let i = 0; i < 8; i++) {
    await evalg(() => { const g = window.__app.scene; const b = g.room.entities.find(e => e.isBoss); g.player.x = b.x; g.player.y = b.y + 50; g.player.dir = 'up'; g.player.aim = -Math.PI / 2; g.player.st = 0; g.progress.stamina = 999; });
    await key('KeyL'); await wait(450);
  }
  await shot('shieldbreak');
  console.log(JSON.stringify(await st()));
  await evalg(() => { const b = window.__app.scene.room.entities.find(e => e.isBoss); b.hp = b.maxHp * 0.2; b.checkPhase(); });
  for (let i = 0; i < 6; i++) { await wait(900); await shot('p3_' + i); }
  console.log(JSON.stringify(await st()));
  await evalg(() => { const b = window.__app.scene.room.entities.find(e => e.isBoss); b.hp = 0; b.startDeath(); });
  for (let i = 0; i < 5; i++) { await wait(1200); await shot('dead' + i); await key('KeyE'); }
  await wait(3000);
  await shot('after');
  // walk to the altar and interact
  await evalg(() => { const g = window.__app.scene; const a = g.room.entities.find(e => e.constructor.name === 'LumeAltar'); g.player.x = a.x + 30; g.player.y = a.y + 4; g.player.dir = 'left'; });
  await wait(500);
  await shot('altar');
  await key('KeyE');
  for (let i = 0; i < 6; i++) { await wait(900); await shot('finale' + i); await key('KeyE'); }
  await wait(1000);
  await shot('choice');
  await key('KeyE');
  await wait(1500);
  const sc = await evalg(() => window.__app.scene.constructor.name);
  console.log('scene', sc);
  for (let i = 0; i < 6; i++) { await shot('end' + i); await key('KeyE'); await wait(1400); }
  await wait(1500); await shot('stats'); await key('KeyE'); await wait(3000); await shot('credits'); await key('KeyE'); await wait(1500);
  console.log('scene', await evalg(() => window.__app.scene.constructor.name));
  await shot('title');
}
