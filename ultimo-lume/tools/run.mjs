// Dev helper: load the game in headless Chromium, run a scripted sequence, take screenshots.
// Usage: node tools/run.mjs <script.json-ish module path> ; see tools/scenarios/*.mjs
import { chromium } from 'playwright';
const [scenario, outDir = '.'] = process.argv.slice(2);
const mod = await import(new URL(scenario, 'file://' + process.cwd() + '/'));
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 6).join('\n')));
await page.goto('http://localhost:8080/?debug=1');
await page.waitForTimeout(1200);
let n = 0;
const shot = async (name) => { await page.screenshot({ path: `${outDir}/${String(n++).padStart(2, '0')}_${name}.png` }); };
const key = async (code, ms = 60) => { await page.keyboard.down(code); await page.waitForTimeout(ms); await page.keyboard.up(code); };
const hold = async (codes, ms) => { for (const c of codes) await page.keyboard.down(c); await page.waitForTimeout(ms); for (const c of codes) await page.keyboard.up(c); };
const wait = (ms) => page.waitForTimeout(ms);
const evalg = (fn, arg) => page.evaluate(fn, arg);
try {
  await mod.default({ page, shot, key, hold, wait, evalg });
} catch (e) {
  errors.push('scenario: ' + e.message);
}
if (errors.length) console.log(errors.slice(0, 30).join('\n'));
else console.log('no console errors');
await browser.close();
