export default async function ({ key, wait, evalg }) {
  await key('Enter'); await wait(300); await key('Enter'); await wait(300); await key('Enter'); await wait(200);
  await evalg(() => {
    const g = window.__app.scene;
    window.__log = [];
    let last = g.progress.hp;
    const orig = g.update.bind(g);
    g.update = () => { orig(); if (g.progress.hp !== last) { window.__log.push({ t: g.time, hp: g.progress.hp, st: g.player.state, room: g.room.id, x: Math.round(g.player.x), y: Math.round(g.player.y) }); last = g.progress.hp; } };
  });
  await wait(4000);
  console.log(JSON.stringify(await evalg(() => ({ log: window.__log, hp: window.__app.scene.progress.hp, max: window.__app.scene.progress.maxHp }))));
}
