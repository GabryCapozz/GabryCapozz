// Usage: node tools/shot.mjs <url> <out.png> [waitMs] [w] [h]
import { chromium } from 'playwright';
const [url, out, wait = '800', w = '1280', h = '900'] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + '\n' + e.stack));
await page.goto(url);
await page.waitForTimeout(+wait);
await page.screenshot({ path: out });
if (errors.length) console.log(errors.join('\n'));
await browser.close();
