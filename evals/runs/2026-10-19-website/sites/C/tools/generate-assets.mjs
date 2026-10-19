// 由 SVG 源文件生成位图资源（apple-touch-icon、PWA 图标、favicon.ico 用的 PNG、OG 分享图）。
// 用法：node tools/generate-assets.mjs && python3 tools/make-ico.py
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('/home/user/Apple-Style/node_modules/playwright');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IMG = path.join(ROOT, 'assets/img');
fs.mkdirSync(path.join(ROOT, 'tools/.output'), { recursive: true });
const icon = fs.readFileSync(path.join(IMG, 'app-icon.svg'), 'utf8');
const square = icon.replace('rx="14.5"', 'rx="0"'); // iOS / Android 会自行加圆角
const dataUri = s => 'data:image/svg+xml;base64,' + Buffer.from(s).toString('base64');

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage();

async function renderIcon(svg, size, out) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:transparent"><img src="${dataUri(svg)}" style="display:block;width:${size}px;height:${size}px"></body></html>`);
  await page.screenshot({ path: out, omitBackground: true });
}

await renderIcon(square, 180, path.join(IMG, 'apple-touch-icon.png'));
await renderIcon(square, 192, path.join(IMG, 'icon-192.png'));
await renderIcon(square, 512, path.join(IMG, 'icon-512.png'));
await renderIcon(icon, 256, path.join(ROOT, 'tools/.output/favicon-256.png'));

await page.setViewportSize({ width: 1200, height: 630 });
await page.setContent(`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><style>
  body{margin:0;width:1200px;height:630px;display:flex;align-items:center;gap:56px;padding:0 96px;box-sizing:border-box;
    background:radial-gradient(circle at 18% 50%,rgba(143,209,79,.35),rgba(143,209,79,0) 45%),#f5f5f7;
    font-family:-apple-system,"PingFang SC","Noto Sans CJK SC","WenQuanYi Zen Hei",sans-serif;color:#1d1d1f}
  img{width:220px;height:220px;border-radius:50px;box-shadow:0 24px 60px rgba(95,181,42,.35)}
  h1{margin:0;font-size:84px;line-height:1.1;letter-spacing:-1px}
  p{margin:18px 0 0;font-size:40px;color:#424245}
  small{display:block;margin-top:36px;font-size:24px;color:#6e6e73;letter-spacing:.5px}
</style></head><body><img src="${dataUri(icon)}" alt=""><div><h1>青柠记账</h1><p>记账，本该这么轻。</p><small>为 iPhone 和 Mac 打造 · Lime Ledger</small></div></body></html>`);
await page.screenshot({ path: path.join(IMG, 'og-image.png') });

await browser.close();
console.log('assets generated');
