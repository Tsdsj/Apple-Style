// 快速截图：node tools/shoot.mjs <页面路径> <宽度> <light|dark> [输出文件] [fullPage=1]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/home/user/Apple-Style/node_modules/playwright');
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from './serve.mjs';

const [page = '/', width = '1280', theme = 'light', out = 'tools/.output/shot.png', full = '1'] = process.argv.slice(2);
const server = createServer().listen(9103);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ viewport: { width: +width, height: 900 }, colorScheme: theme, deviceScaleFactor: 1 });
const p = await ctx.newPage();
p.on('console', m => { if (m.type() === 'error') console.log('console error:', m.text()); });
p.on('pageerror', e => console.log('page error:', e.message));
await p.goto('http://localhost:9103' + page, { waitUntil: 'networkidle' });
const sw = await p.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth, document.documentElement.scrollHeight]);
console.log('scrollWidth/innerWidth/height', sw);
fs.mkdirSync(path.dirname(out), { recursive: true });
await p.screenshot({ path: out, fullPage: full === '1' });
await browser.close(); server.close();
