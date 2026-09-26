export default async function ({ shot, key, hold, wait }) {
  await shot('loading');
  await key('Enter');
  await wait(400);
  await shot('title');
  await key('Enter'); // "Nuova partita" is preselected when no save exists
  await wait(300);
  await shot('slots');
  await key('Enter');
  await wait(1500);
  await shot('intro_sleep');
  for (let i = 0; i < 4; i++) { await key('Enter'); await wait(500); }
  await wait(1200);
  await shot('awake');
  await hold(['KeyA'], 500);
  await hold(['KeyW'], 700);
  await shot('walk');
  await hold(['KeyW'], 600);
  await shot('near_bushes');
}
