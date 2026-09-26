export default async function ({ shot, key, hold, wait, evalg }) {
  const advance = async () => {
    for (let i = 0; i < 20; i++) {
      const active = await evalg(() => window.__app.scene.dialogue && window.__app.scene.dialogue.active);
      if (!active) return;
      await key('KeyE', 40);
      await wait(120);
    }
  };
  await key('Enter'); await wait(300);
  await key('Enter'); await wait(300);
  await key('Enter'); await wait(2400);
  await advance();
  await wait(1200);
  await shot('awake');
  // walk to Maren and talk
  await hold(['KeyD'], 700);
  await hold(['KeyW'], 250);
  await shot('near_maren');
  await key('KeyE'); await wait(600);
  await shot('maren_talk');
  await advance();
  // light the brazier
  await hold(['KeyA'], 1300);
  await shot('near_brazier');
  await key('KeyE'); await wait(1500);
  await shot('rest');
  await wait(1000);
  // go to the bushes and cut them
  await hold(['KeyD'], 520);
  await hold(['KeyW'], 700);
  await shot('at_bushes');
  await key('KeyJ'); await wait(100); await key('KeyJ'); await wait(100); await key('KeyJ');
  await wait(80);
  await shot('attack');
  await wait(500);
  await hold(['KeyW'], 1500);
  await wait(800);
  await shot('square');
}
