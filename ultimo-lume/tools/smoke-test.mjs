// Headless smoke test (Playwright + Chromium). Fails on any page error or console error.
//  1. source build: title -> new game -> intro dialogue -> walk, attack, pause menu, map;
//     then renders every room of the world for a moment.
//  2. single-file build (dist/ultimo-lume.html, rebuilt first): boots from file:// and
//     starts a new game.
// Usage: `npm test` (after `npm install`).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
const server = http.createServer((req, res) => {
  const file = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  const target = file.endsWith('/') ? path.join(file, 'index.html') : file;
  if (!target.startsWith(root) || !fs.existsSync(target)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': types[path.extname(target)] || 'application/octet-stream' });
  res.end(fs.readFileSync(target));
});
await new Promise((ok) => server.listen(0, ok));
const base = `http://localhost:${server.address().port}/`;

const failures = [];
const check = (cond, msg) => { if (!cond) failures.push(msg); console.log(`${cond ? 'ok  ' : 'FAIL'}  ${msg}`); };

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

async function openPage(url) {
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url);
  await page.waitForFunction(() => document.getElementById('game'));
  await page.waitForTimeout(1200);
  const key = async (code, ms = 60) => { await page.keyboard.down(code); await page.waitForTimeout(ms); await page.keyboard.up(code); };
  return { page, errors, key };
}

// Starts a new game from the title and skips the intro dialogue.
async function newGame(key, page) {
  await key('Enter'); await page.waitForTimeout(400); // title: "Nuova partita"
  await key('Enter'); await page.waitForTimeout(400); // first empty slot
  await page.waitForTimeout(1200);
  for (let i = 0; i < 8; i++) { await key('Enter'); await page.waitForTimeout(350); }
  await page.waitForTimeout(1500);
}

// canvas shows something other than a flat colour
const canvasAlive = (page) => page.evaluate(() => {
  const c = document.getElementById('game');
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  const seen = new Set();
  for (let i = 0; i < d.length; i += 4 * 97) seen.add((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]);
  return seen.size;
});

try {
  // ---------------------------------------------------------------- source build
  {
    const { page, errors, key } = await openPage(base + '?debug=1');
    check((await canvasAlive(page)) > 8, 'title screen renders');
    await newGame(key, page);
    const s0 = await page.evaluate(() => { const g = window.__app.scene; return { scene: g.constructor.name, x: g.player?.x, y: g.player?.y, room: g.room?.id }; });
    check(s0.scene === 'GameScene', `new game starts the game scene (got ${s0.scene})`);
    check(s0.room === 'v_shrine', `player wakes up in the shrine (got ${s0.room})`);
    await page.evaluate(() => { const g = window.__app.scene; g.scripts = []; g.cutscene = false; g.dialogue.active = false; g.player.setState('move'); });
    await page.keyboard.down('KeyW'); await page.waitForTimeout(500); await page.keyboard.up('KeyW');
    const s1 = await page.evaluate(() => ({ x: window.__app.scene.player.x, y: window.__app.scene.player.y }));
    check(Math.hypot(s1.x - s0.x, s1.y - s0.y) > 10, 'player walks');
    await key('KeyJ'); await page.waitForTimeout(150);
    check(await page.evaluate(() => window.__app.scene.player.state === 'attack' || window.__app.scene.player.state === 'move'), 'player attacks');
    await page.waitForTimeout(400);
    await key('Escape'); await page.waitForTimeout(300);
    check(await page.evaluate(() => !!window.__app.scene.pause?.active), 'pause menu opens');
    await key('Escape'); await page.waitForTimeout(300);
    await key('KeyM'); await page.waitForTimeout(300);
    check(await page.evaluate(() => !!window.__app.scene.pause?.active), 'map opens');
    await key('Escape'); await page.waitForTimeout(300);

    // every room: enter, simulate a little, render
    const ids = await page.evaluate(() => Object.keys(window.__app.scene.world.defs));
    for (const id of ids) {
      await page.evaluate((id) => {
        const g = window.__app.scene;
        const d = g.world.get(id);
        g.player.takeHit = () => null;
        g.scripts = []; g.cutscene = false; g.dialogue.active = false;
        g.enterRoom(id, (d.w || 1) * 240, (d.h || 1) * 136);
      }, id);
      await page.waitForTimeout(250);
    }
    check(ids.length >= 40, `visited ${ids.length} rooms`);
    check(errors.length === 0, 'source build: no runtime errors' + (errors.length ? '\n      ' + errors.slice(0, 5).join('\n      ') : ''));
    await page.close();
  }

  // ---------------------------------------------------------------- single-file build
  {
    execFileSync(process.execPath, [path.join(root, 'tools/build.js')], { stdio: 'inherit' });
    const file = path.join(root, 'dist/ultimo-lume.html');
    const { page, errors, key } = await openPage(pathToFileURL(file).href);
    check((await canvasAlive(page)) > 8, 'single-file build: title screen renders');
    await newGame(key, page);
    await page.keyboard.down('KeyS'); await page.waitForTimeout(400); await page.keyboard.up('KeyS');
    check((await canvasAlive(page)) > 8, 'single-file build: game renders');
    check(errors.length === 0, 'single-file build: no runtime errors' + (errors.length ? '\n      ' + errors.slice(0, 5).join('\n      ') : ''));
    await page.close();
  }
} catch (e) {
  failures.push(e.message);
  console.log('FAIL  ' + e.message);
}

await browser.close();
server.close();
console.log(failures.length ? `\n${failures.length} check(s) failed` : '\nall checks passed');
process.exit(failures.length ? 1 : 0);
