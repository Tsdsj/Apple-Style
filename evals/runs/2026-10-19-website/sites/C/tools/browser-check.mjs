// 浏览器检查（Playwright + Chromium）：node tools/browser-check.mjs [--shots]
// 1. 每个页面 × 5 种宽度 × 浅色/深色：无横向滚动、无控制台错误、无外部请求、图片全部加载
// 2. 对比度审计：所有可见文字（装饰性样机 role=img / aria-hidden 除外）满足 WCAG AA
// 3. 交互：移动端菜单、外观切换、价格切换、FAQ 搜索与锚点、联系表单、复制链接、404、禁用 JS
// --shots 时把截图写入 tools/.output/shots/
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createServer } from './serve.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('/home/user/Apple-Style/node_modules/playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = process.argv.includes('--shots');
const SHOT_DIR = path.join(ROOT, 'tools/.output/shots');
if (SHOTS) fs.mkdirSync(SHOT_DIR, { recursive: true });

const PORT = 9103;
const BASE = `http://localhost:${PORT}`;
const PAGES = ['/', '/features.html', '/pricing.html', '/faq.html', '/blog/', '/blog/lime-ledger-3-for-mac.html',
  '/blog/why-no-account.html', '/blog/first-budget-50-30-20.html', '/about.html', '/contact.html', '/privacy.html', '/404.html'];
const WIDTHS = [390, 768, 1024, 1440, 1920];
const failures = [];
const notes = [];
const fail = m => { failures.push(m); console.log('  ✗ ' + m); };
const ok = m => console.log('  ✓ ' + m);

const server = createServer().listen(PORT);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

async function newPage(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...opts });
  const page = await ctx.newPage();
  page._errors = [];
  page.on('console', m => { if (m.type() === 'error') page._errors.push(m.text()); });
  page.on('pageerror', e => page._errors.push(e.message));
  await page.route('**/*', route => {
    const u = new URL(route.request().url());
    if (u.hostname !== 'localhost') { page._errors.push('外部请求：' + u.href); return route.abort(); }
    route.continue();
  });
  page.on('response', r => { if (r.status() >= 400 && !r.url().includes('/does-not-exist')) page._errors.push(`${r.status()} ${r.url()}`); });
  return { ctx, page };
}

// ---------- 1. 布局 / 错误 / 资源 ----------
console.log('\n[1] 布局与资源');
for (const theme of ['light', 'dark']) {
  const { ctx, page } = await newPage({ colorScheme: theme });
  for (const url of PAGES) {
    for (const w of WIDTHS) {
      await page.setViewportSize({ width: w, height: 900 });
      await page.goto(BASE + url, { waitUntil: 'networkidle' });
      const r = await page.evaluate(() => ({
        sw: document.documentElement.scrollWidth,
        iw: window.innerWidth,
        broken: [...document.images].filter(i => !i.complete || i.naturalWidth === 0).map(i => i.src),
        offenders: [...document.querySelectorAll('body *')].filter(el => {
          const b = el.getBoundingClientRect();
          if (b.width === 0 || b.right <= window.innerWidth + 1) return false;
          for (let p = el.parentElement; p; p = p.parentElement) {
            const s = getComputedStyle(p);
            if (/(hidden|clip|auto|scroll)/.test(s.overflowX)) return false;
          }
          return true;
        }).slice(0, 3).map(el => el.tagName + '.' + el.className),
      }));
      if (r.sw > r.iw) fail(`${url} @${w} ${theme}: 横向溢出 ${r.sw}>${r.iw} ${r.offenders.join(' ')}`);
      if (r.broken.length) fail(`${url} @${w}: 图片加载失败 ${r.broken.join(', ')}`);
      if (SHOTS && ((w === 390 || w === 1440) || (w === 1920 && theme === 'light'))) {
        const name = (url.replace(/\//g, '_').replace(/^_$/, '_index') || '_index').replace(/\.html$/, '');
        await page.screenshot({ path: path.join(SHOT_DIR, `${name}-${w}-${theme}.png`), fullPage: true });
      }
    }
  }
  if (page._errors.length) fail(`${theme}: 控制台/网络错误 ${[...new Set(page._errors)].join(' | ')}`);
  else ok(`${theme}：${PAGES.length} 页 × ${WIDTHS.length} 宽度，无溢出、无错误、无外部请求`);
  await ctx.close();
}

// ---------- 2. 对比度审计 ----------
console.log('\n[2] 文字对比度（WCAG AA）');
for (const theme of ['light', 'dark']) {
  const { ctx, page } = await newPage({ colorScheme: theme });
  let checked = 0;
  for (const url of PAGES) {
    for (const w of [390, 1440]) {
      await page.setViewportSize({ width: w, height: 900 });
      await page.goto(BASE + url, { waitUntil: 'networkidle' });
      const res = await page.evaluate(() => {
        const parse = c => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p[3] ?? 1 }; };
        const lum = ({ r, g, b }) => [r, g, b].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
        const blend = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
        function bgOf(el) {
          const layers = [];
          for (let e = el; e; e = e.parentElement) {
            const s = getComputedStyle(e);
            if (s.backgroundImage !== 'none' && !s.backgroundImage.startsWith('url(')) return null; // 渐变背景：跳过
            const c = parse(s.backgroundColor);
            if (c && c.a > 0) { layers.push(c); if (c.a >= 1) break; }
          }
          let base = { r: 255, g: 255, b: 255, a: 1 };
          if (!layers.length || layers[layers.length - 1].a < 1) base = parse(getComputedStyle(document.documentElement).backgroundColor) || base;
          return layers.reverse().reduce((acc, c) => blend(c, acc), base);
        }
        const bad = []; let n = 0;
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        const seen = new Set();
        while (walker.nextNode()) {
          const t = walker.currentNode; const el = t.parentElement;
          if (!t.textContent.trim() || seen.has(el)) continue; seen.add(el);
          if (el.closest('[role="img"], [aria-hidden="true"], .visually-hidden, .hp-field, svg, [hidden], noscript, .skip-link')) continue;
          const s = getComputedStyle(el);
          if (s.visibility === 'hidden' || s.display === 'none' || +s.opacity === 0) continue;
          const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
          const bg = bgOf(el); if (!bg) continue;
          let fg = parse(s.color); if (!fg) continue;
          let op = 1; for (let e = el; e; e = e.parentElement) op *= +getComputedStyle(e).opacity;
          fg = blend({ ...fg, a: fg.a * op }, bg);
          const L1 = lum(fg), L2 = lum(bg); const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
          const size = parseFloat(s.fontSize); const bold = +s.fontWeight >= 700;
          const need = size >= 24 || (bold && size >= 18.66) ? 3 : 4.5;
          n++;
          if (ratio < need) bad.push(`${ratio.toFixed(2)} < ${need} “${t.textContent.trim().slice(0, 18)}” <${el.tagName.toLowerCase()} class="${el.className}">`);
        }
        return { n, bad };
      });
      checked += res.n;
      for (const b of res.bad) fail(`${url} @${w} ${theme}: ${b}`);
    }
  }
  ok(`${theme}：审计 ${checked} 处文字`);
  await ctx.close();
}

// ---------- 3. 交互 ----------
console.log('\n[3] 交互');
{
  // 移动端菜单
  const { ctx, page } = await newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(BASE + '/features.html');
  const toggle = page.locator('.nav-toggle');
  if (!(await toggle.isVisible())) fail('390px 下看不到菜单按钮');
  await toggle.click();
  await page.waitForTimeout(350);
  const st = await page.evaluate(() => ({
    exp: document.querySelector('.nav-toggle').getAttribute('aria-expanded'),
    vis: getComputedStyle(document.getElementById('site-menu')).visibility,
    focus: document.activeElement && document.activeElement.textContent,
    lock: getComputedStyle(document.body).overflow,
  }));
  if (st.exp !== 'true' || st.vis !== 'visible') fail('菜单未展开 ' + JSON.stringify(st)); else ok(`菜单展开，焦点在“${st.focus}”，页面滚动锁定=${st.lock}`);
  // Tab 循环不跑出页头
  for (let i = 0; i < 12; i++) await page.keyboard.press('Tab');
  const inHeader = await page.evaluate(() => !!document.activeElement.closest('.site-header'));
  if (!inHeader) fail('菜单展开时焦点跑出了页头'); else ok('菜单展开时 Tab 焦点限制在页头内');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  const st2 = await page.evaluate(() => ({ exp: document.querySelector('.nav-toggle').getAttribute('aria-expanded'), vis: getComputedStyle(document.getElementById('site-menu')).visibility, f: document.activeElement.className }));
  if (st2.exp !== 'false' || st2.vis !== 'hidden' || !st2.f.includes('nav-toggle')) fail('Esc 未正确关闭菜单 ' + JSON.stringify(st2)); else ok('Esc 关闭菜单并把焦点还给按钮');
  // 点击菜单项后关闭
  await toggle.click(); await page.waitForTimeout(300);
  await page.locator('#site-menu a[href="pricing.html"]').click();
  await page.waitForURL('**/pricing.html');
  ok('点击菜单链接正常跳转');
  // 跳转链接
  await page.keyboard.press('Tab');
  await page.waitForTimeout(350); // 等待跳转链接的滑入过渡结束
  const skip = await page.evaluate(() => document.activeElement.classList.contains('skip-link') && document.activeElement.getBoundingClientRect().top >= 0);
  if (!skip) fail('首个 Tab 不是可见的“跳到主要内容”'); else ok('首个 Tab 聚焦到可见的“跳到主要内容”');
  await ctx.close();
}
{
  // 外观切换 + 持久化
  const { ctx, page } = await newPage({ colorScheme: 'light' });
  await page.goto(BASE + '/');
  await page.locator('.theme-switch label:has(input[value="dark"])').click();
  let t = await page.evaluate(() => [document.documentElement.dataset.theme, getComputedStyle(document.body).backgroundColor, localStorage.getItem('ll-theme'), document.querySelector('meta[name="theme-color"]').content]);
  if (t[0] !== 'dark' || t[1] !== 'rgb(0, 0, 0)' || t[2] !== 'dark') fail('切换深色失败 ' + t); else ok('手动切换深色生效（背景 ' + t[1] + '，theme-color ' + t[3] + '）');
  await page.goto(BASE + '/about.html');
  t = await page.evaluate(() => [document.documentElement.dataset.theme, document.querySelector('input[name="theme"][value="dark"]').checked]);
  if (t[0] !== 'dark' || !t[1]) fail('深色未在其他页面保持'); else ok('外观选择跨页面保持');
  await page.locator('.theme-switch label:has(input[value="auto"])').click();
  t = await page.evaluate(() => [document.documentElement.hasAttribute('data-theme'), localStorage.getItem('ll-theme')]);
  if (t[0] || t[1] !== null) fail('切回自动失败'); else ok('切回“自动”后跟随系统');
  await ctx.close();
}
{
  // 价格切换
  const { ctx, page } = await newPage();
  await page.goto(BASE + '/pricing.html');
  const read = () => page.evaluate(() => [...document.querySelectorAll('.plan--pro [data-monthly]')].map(e => e.textContent.trim()).join(' | '));
  const y = await read();
  await page.locator('.billing label:has(input[value="monthly"])').click();
  const mo = await read();
  if (!mo.startsWith('12 | / 月')) fail('按月价格不对：' + mo); else ok('按月：' + mo);
  await page.locator('.billing label:has(input[value="yearly"])').click();
  if ((await read()) !== y || !y.startsWith('98 | / 年')) fail('按年价格不对：' + y); else ok('按年：' + y);
  await ctx.close();
}
{
  // FAQ 搜索与锚点
  const { ctx, page } = await newPage();
  await page.goto(BASE + '/faq.html');
  await page.fill('#faq-search', '退款');
  await page.waitForTimeout(300);
  let r = await page.evaluate(() => [document.querySelectorAll('.faq-item:not([hidden])').length, document.getElementById('faq-status').textContent]);
  if (r[0] < 1) fail('搜索“退款”无结果'); else ok(`搜索“退款”：${r[0]} 条，状态“${r[1]}”`);
  await page.fill('#faq-search', 'zzzz');
  await page.waitForTimeout(300);
  r = await page.evaluate(() => [document.querySelectorAll('.faq-item:not([hidden])').length, !document.getElementById('faq-empty').hidden]);
  if (r[0] !== 0 || !r[1]) fail('无结果时未显示空状态'); else ok('无结果时显示空状态');
  await page.click('#faq-clear');
  r = await page.evaluate(() => document.querySelectorAll('.faq-item:not([hidden])').length);
  ok(`清除搜索后恢复 ${r} 条问题`);
  await page.goto(BASE + '/faq.html#export-data');
  r = await page.evaluate(() => document.getElementById('export-data').open);
  if (!r) fail('锚点 #export-data 未自动展开'); else ok('从页脚锚点进入时自动展开对应问题');
  await ctx.close();
}
{
  // 联系表单
  const { ctx, page } = await newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(BASE + '/contact.html?topic=billing');
  let r = await page.evaluate(() => document.getElementById('topic').value);
  if (r !== 'billing') fail('?topic=billing 未预选主题'); else ok('?topic= 参数预选主题');
  await page.selectOption('#topic', '');
  await page.click('#contact-form [type="submit"]');
  r = await page.evaluate(() => ({ invalid: [...document.querySelectorAll('[aria-invalid="true"]')].map(e => e.id), focus: document.activeElement.id, status: document.getElementById('form-status').textContent }));
  if (r.invalid.length !== 5 || r.focus !== 'name') fail('空表单校验异常 ' + JSON.stringify(r)); else ok(`空表单提交：${r.invalid.length} 项报错，焦点移到第一项，状态“${r.status}”`);
  await page.fill('#name', '小青');
  await page.fill('#email', 'abc@');
  await page.locator('#email').blur();
  r = await page.textContent('#email-error');
  if (!r.includes('格式')) fail('邮箱格式错误未提示'); else ok('邮箱格式提示：' + r);
  await page.fill('#email', 'xiaoqing@example.com');
  await page.selectOption('#topic', 'feedback');
  await page.fill('#message', '希望可以支持按周查看预算。');
  await page.check('#consent');
  await page.click('#contact-form [type="submit"]');
  r = await page.evaluate(() => document.querySelector('#contact-form [type="submit"]').disabled);
  if (!r) fail('提交时按钮未进入加载状态'); else ok('提交中按钮禁用并显示“正在发送…”');
  await page.waitForSelector('#form-success:not([hidden])', { timeout: 3000 });
  r = await page.evaluate(() => [document.getElementById('success-email').textContent, document.activeElement.id, document.getElementById('contact-form').hidden]);
  if (r[0] !== 'xiaoqing@example.com' || r[1] !== 'form-success' || !r[2]) fail('成功状态异常 ' + r); else ok('成功反馈显示邮箱并获得焦点');
  if (SHOTS) await page.screenshot({ path: path.join(SHOT_DIR, 'contact-success-390.png') });
  await page.click('#form-again');
  r = await page.evaluate(() => [document.getElementById('contact-form').hidden, document.getElementById('name').value, document.activeElement.id]);
  if (r[0] || r[1] !== '' || r[2] !== 'name') fail('“再写一条”未重置表单'); else ok('“再写一条”重置表单');
  await ctx.close();
}
{
  // 复制链接
  const { ctx, page } = await newPage({ permissions: ['clipboard-read', 'clipboard-write'] });
  await page.goto(BASE + '/blog/why-no-account.html');
  await page.click('[data-copy-link]');
  await page.waitForTimeout(200); // 剪贴板写入是异步的
  const txt = await page.textContent('[data-copy-link]');
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  if (txt !== '已复制链接' || !clip.endsWith('/blog/why-no-account.html')) fail(`复制链接异常：${txt} ${clip}`); else ok('复制文章链接：' + clip);
  await ctx.close();
}
{
  // 404
  const { ctx, page } = await newPage();
  const resp = await page.goto(BASE + '/does-not-exist/deep/page.html');
  const r = await page.evaluate(() => [document.querySelector('h1').textContent, getComputedStyle(document.querySelector('.site-header')).position, [...document.images].every(i => i.naturalWidth > 0)]);
  if (resp.status() !== 404 || r[1] !== 'sticky' || !r[2]) fail('404 异常 ' + resp.status() + ' ' + r); else ok(`深层不存在路径返回 404，样式与图片正常（“${r[0]}”）`);
  await ctx.close();
}
{
  // 禁用 JS 时仍可用
  const { ctx, page } = await newPage({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  for (const url of ['/', '/pricing.html', '/faq.html', '/contact.html']) {
    await page.goto(BASE + url);
    const r = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, links: [...document.querySelectorAll('.nav-links a')].filter(a => a.getBoundingClientRect().width > 0).length }));
    if (r.sw > 390 || r.links < 1) fail(`无 JS ${url}: 溢出或导航不可见 ${JSON.stringify(r)}`);
  }
  await page.goto(BASE + '/contact.html');
  const formHidden = await page.evaluate(() => getComputedStyle(document.getElementById('contact-form')).display === 'none');
  if (!formHidden) fail('无 JS 时联系表单仍然显示（会以 GET 提交个人信息）'); else ok('无 JS 时隐藏联系表单，显示邮箱替代方案');
  await page.goto(BASE + '/pricing.html');
  const note = await page.textContent('.plan--pro .price-note');
  ok(`禁用 JS：导航可用、无溢出；价格页显示“${note}”`);
  await ctx.close();
}

await browser.close();
server.close();
console.log(failures.length ? `\n共 ${failures.length} 项失败` : '\n全部通过 ✓');
process.exit(failures.length ? 1 : 0);
