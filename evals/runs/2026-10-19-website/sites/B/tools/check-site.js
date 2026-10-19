// 青柠记账站点 · 自动检查脚本
// 覆盖：控制台错误、资源加载失败、外部依赖、横向溢出（5 种宽度 × 浅色/深色）、
//       页面结构与基础无障碍、文字对比度、站内链接与锚点、关键交互、无 JS 降级、页面体积。
//
// 用法（需要 Node 18+ 与 Playwright）：
//   node tools/serve.js &            # 启动本地预览（端口 9102）
//   node tools/check-site.js
// 可选环境变量：
//   BASE_URL    站点地址，默认 http://localhost:9102
//   PLAYWRIGHT  playwright 模块路径，默认 require('playwright')
//   CHROMIUM    Chromium 可执行文件路径，默认使用 Playwright 自带浏览器
'use strict';

const http = require('http');
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');

const BASE = (process.env.BASE_URL || 'http://localhost:9102').replace(/\/$/, '');
const PAGES = [
  'index.html', 'features.html', 'pricing.html', 'faq.html',
  'blog/index.html', 'blog/lime-ledger-3.html', 'blog/local-first.html', 'blog/30-day-habits.html',
  'about.html', 'contact.html', 'privacy.html', '404.html',
];
const WIDTHS = [390, 768, 1024, 1440, 1920];
const SCHEMES = ['light', 'dark'];

const problems = [];
const info = [];
const fail = (where, msg) => problems.push(`✗ ${where} — ${msg}`);
const ok = (msg) => info.push(`✓ ${msg}`);

function get(url) {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { body += c; });
      res.on('end', () => resolve({ status: res.statusCode, body }));
    }).on('error', (e) => resolve({ status: 0, body: String(e) }));
  });
}

/* 在页面内运行：文字对比度（考虑半透明前景、祖先 opacity 与背景叠加） */
function contrastAudit() {
  const parse = (c) => {
    const m = c && c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const lum = ({ r, g, b }) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const over = (top, bottom) => ({
    r: top.r * top.a + bottom.r * (1 - top.a),
    g: top.g * top.a + bottom.g * (1 - top.a),
    b: top.b * top.a + bottom.b * (1 - top.a),
    a: 1,
  });
  const out = [];
  const seen = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (!node.textContent.trim()) continue;
    const el = node.parentElement;
    if (!el || seen.has(el)) continue;
    seen.add(el);
    if (el.closest('[aria-hidden="true"], [role="img"], .sr-only, script, style, noscript, svg')) continue;
    if (!el.checkVisibility || !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    const cs = getComputedStyle(el);
    let fg = parse(cs.color);
    if (!fg) continue;
    // 找到提供背景的祖先，并累计其间的 opacity
    const layers = [];
    let opacity = 1;
    let unknown = false;
    for (let e = el; e; e = e.parentElement) {
      const s = getComputedStyle(e);
      if (s.backgroundImage && s.backgroundImage !== 'none') { unknown = true; break; }
      const bg = parse(s.backgroundColor);
      if (bg && bg.a > 0) { layers.push(bg); if (bg.a >= 1) break; }
      if (!layers.length) opacity *= Number(s.opacity);
    }
    if (unknown) continue;
    let bg = { r: 255, g: 255, b: 255, a: 1 };
    for (let i = layers.length - 1; i >= 0; i--) bg = over(layers[i], bg);
    fg = { ...fg, a: fg.a * opacity };
    const fgc = over(fg, bg);
    const L1 = lum(fgc); const L2 = lum(bg);
    const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const size = parseFloat(cs.fontSize);
    const bold = Number(cs.fontWeight) >= 700;
    const large = size >= 24 || (size >= 18.66 && bold);
    const need = large ? 3 : 4.5;
    if (ratio < need) {
      out.push(`${el.tagName.toLowerCase()}.${[...el.classList].join('.')} “${node.textContent.trim().slice(0, 24)}” ${ratio.toFixed(2)}:1 (需 ${need}:1)`);
    }
  }
  return out;
}

/* 在页面内运行：结构与基础无障碍 */
function structureAudit() {
  const issues = [];
  const html = document.documentElement;
  if (html.lang !== 'zh-CN') issues.push('html lang 不是 zh-CN');
  if (!document.title.trim()) issues.push('缺少 <title>');
  const desc = document.querySelector('meta[name="description"]');
  if (!desc || !desc.content.trim()) issues.push('缺少 meta description');
  else if (desc.content.length > 160) issues.push(`meta description 过长（${desc.content.length} 字）`);
  if (!document.querySelector('meta[name="viewport"]')) issues.push('缺少 viewport');
  const h1s = document.querySelectorAll('h1');
  if (h1s.length !== 1) issues.push(`h1 数量为 ${h1s.length}`);
  for (const sel of ['header', 'main#main', 'footer', 'nav', 'a.skip-link[href="#main"]']) {
    if (!document.querySelector(sel)) issues.push(`缺少 ${sel}`);
  }
  // 标题层级不跳级
  let prev = 0;
  document.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach((h) => {
    if (h.closest('[role="img"], [aria-hidden="true"]')) return;
    const lvl = Number(h.tagName[1]);
    if (prev && lvl > prev + 1) issues.push(`标题跳级：h${prev} → h${lvl}「${h.textContent.trim().slice(0, 20)}」`);
    prev = lvl;
  });
  // 重复 id
  const ids = {};
  document.querySelectorAll('[id]').forEach((e) => { ids[e.id] = (ids[e.id] || 0) + 1; });
  Object.keys(ids).filter((k) => ids[k] > 1).forEach((k) => issues.push(`重复 id：#${k}`));
  // 图片 alt
  document.querySelectorAll('img').forEach((img) => { if (!img.hasAttribute('alt')) issues.push(`图片缺少 alt：${img.getAttribute('src')}`); });
  // 表单控件标签
  document.querySelectorAll('input:not([type="hidden"]), select, textarea').forEach((c) => {
    const named = (c.labels && c.labels.length) || c.getAttribute('aria-label') || c.getAttribute('aria-labelledby');
    if (!named) issues.push(`表单控件缺少标签：#${c.id || c.name}`);
  });
  // 链接与按钮的可访问名称
  const nameOf = (e) => (e.getAttribute('aria-label') || e.textContent || [...e.querySelectorAll('img[alt]')].map((i) => i.alt).join('')).trim();
  document.querySelectorAll('a').forEach((a) => {
    const href = a.getAttribute('href');
    if (!href || href === '#') issues.push(`链接缺少有效 href：「${nameOf(a).slice(0, 20)}」`);
    if (!nameOf(a)) issues.push(`链接没有可读名称：${href}`);
  });
  document.querySelectorAll('button').forEach((b) => { if (!nameOf(b)) issues.push('按钮没有可读名称'); });
  // ARIA 引用的 id 必须存在
  document.querySelectorAll('[aria-describedby],[aria-labelledby],[aria-controls],label[for]').forEach((e) => {
    const refs = ['aria-describedby', 'aria-labelledby', 'aria-controls', 'for']
      .map((a) => e.getAttribute(a)).filter(Boolean).join(' ').split(/\s+/);
    refs.forEach((id) => { if (id && !document.getElementById(id)) issues.push(`引用了不存在的 id：#${id}`); });
  });
  // 外链安全
  document.querySelectorAll('a[target="_blank"]').forEach((a) => { if (!/noopener/.test(a.rel)) issues.push(`target=_blank 缺少 rel=noopener：${a.href}`); });
  return issues;
}

(async () => {
  const launch = { };
  if (process.env.CHROMIUM) launch.executablePath = process.env.CHROMIUM;
  const browser = await chromium.launch(launch);
  const titles = {};
  const weights = {};
  const links = new Map(); // url -> 来源页

  /* 1. 每页 × 宽度 × 主题：错误、外部请求、溢出、对比度 */
  for (const page of PAGES) {
    for (const scheme of SCHEMES) {
      for (const width of WIDTHS) {
        const ctx = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: scheme, reducedMotion: 'reduce' });
        const pg = await ctx.newPage();
        const where = `${page} @${width} ${scheme}`;
        const errors = [];
        pg.on('console', (m) => { if (m.type() === 'error' && !(page === '404.html' && /404/.test(m.text()))) errors.push(m.text()); });
        pg.on('pageerror', (e) => errors.push(String(e)));
        pg.on('requestfailed', (r) => errors.push(`请求失败 ${r.url()}`));
        pg.on('request', (r) => {
          const u = r.url();
          if (!u.startsWith(BASE) && !u.startsWith('data:')) errors.push(`外部请求 ${u}`);
        });
        pg.on('response', (res) => {
          if (res.status() >= 400 && !res.url().endsWith('404.html')) errors.push(`HTTP ${res.status()} ${res.url()}`);
        });
        await pg.goto(`${BASE}/${page}`, { waitUntil: 'networkidle' });
        const overflow = await pg.evaluate(() => {
          const w = window.innerWidth;
          if (document.documentElement.scrollWidth <= w) return null;
          return [...document.querySelectorAll('body *')]
            .filter((e) => e.getBoundingClientRect().right > w + 1)
            .slice(0, 5).map((e) => e.tagName.toLowerCase() + '.' + [...e.classList].join('.'));
        });
        if (overflow) fail(where, `横向溢出：${overflow.join(', ')}`);
        errors.forEach((e) => fail(where, e));

        if (width === 390 || width === 1440) {
          const low = await pg.evaluate(contrastAudit);
          low.forEach((l) => fail(where, `对比度不足 ${l}`));
        }
        if (width === 1440 && scheme === 'light') {
          (await pg.evaluate(structureAudit)).forEach((i) => fail(page, i));
          titles[page] = await pg.title();
          weights[page] = await pg.evaluate(() => {
            const nav = performance.getEntriesByType('navigation')[0];
            return [nav, ...performance.getEntriesByType('resource')]
              .reduce((sum, e) => sum + (e.encodedBodySize || e.decodedBodySize || 0), 0);
          });
          const found = await pg.evaluate(() => [...document.querySelectorAll('a[href], link[href]:not([rel="canonical"]), script[src], img[src]')]
            .map((e) => e.href || e.src));
          found.forEach((u) => { if (!links.has(u)) links.set(u, page); });
        }
        await ctx.close();
      }
    }
  }
  ok(`${PAGES.length} 个页面 × ${WIDTHS.length} 种宽度 × 2 种主题已检查控制台错误、外部请求与横向溢出`);

  const dupTitles = Object.values(titles).filter((t, i, a) => a.indexOf(t) !== i);
  if (dupTitles.length) fail('全站', `重复标题：${dupTitles.join(' / ')}`);

  /* 2. 站内链接与锚点 */
  let internal = 0; let external = 0;
  const cache = {};
  for (const [url, from] of links) {
    if (url.startsWith('mailto:')) continue;
    if (!url.startsWith(BASE)) { external++; continue; }
    internal++;
    const [base, hash] = url.split('#');
    if (!cache[base]) cache[base] = await get(base);
    const res = cache[base];
    if (res.status !== 200) { fail(from, `链接 ${url} 返回 ${res.status}`); continue; }
    if (hash && !new RegExp(`id="${hash}"`).test(res.body)) fail(from, `锚点不存在：${url}`);
  }
  ok(`站内链接 ${internal} 个全部可达（外链 ${external} 个未请求，见 README）`);

  /* 3. 关键交互 */
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE });
  const pg = await ctx.newPage();
  const expect = (cond, msg) => (cond ? ok(msg) : fail('交互', msg));

  // 3.1 键盘：第一个 Tab 落在“跳到主要内容”
  await pg.goto(`${BASE}/index.html`);
  await pg.bringToFront(); // 窗口未获得焦点时 Chromium 不会匹配 :focus
  await pg.keyboard.press('Tab');
  await pg.waitForTimeout(100);
  expect(await pg.evaluate(() => document.activeElement.classList.contains('skip-link') && document.activeElement.getBoundingClientRect().top >= 0),
    '首个 Tab 聚焦“跳到主要内容”并可见');

  // 3.2 移动端菜单
  await pg.click('.nav-toggle');
  await pg.waitForTimeout(150);
  expect(await pg.getAttribute('.nav-toggle', 'aria-expanded') === 'true' && await pg.isVisible('.nav-links a'), '移动端菜单可展开');
  for (let i = 0; i < 12; i++) await pg.keyboard.press('Tab');
  const trapped = await pg.evaluate(() => (document.activeElement.closest('.site-header') ? '' : document.activeElement.outerHTML.slice(0, 60)));
  expect(!trapped, '菜单展开时焦点被限制在菜单内' + (trapped ? `（焦点落在 ${trapped}）` : ''));
  await pg.keyboard.press('Escape');
  expect(await pg.getAttribute('.nav-toggle', 'aria-expanded') === 'false'
    && await pg.evaluate(() => document.activeElement.classList.contains('nav-toggle')), 'Esc 关闭菜单并把焦点还给按钮');

  // 3.3 外观切换与持久化
  await pg.click('label[for="theme-dark"]');
  const darkBg = await pg.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await pg.reload();
  expect(darkBg === 'rgb(0, 0, 0)' && await pg.getAttribute('html', 'data-theme') === 'dark'
    && await pg.isChecked('#theme-dark'), '切换到深色后刷新仍保持深色');
  await pg.click('label[for="theme-auto"]');
  expect(await pg.getAttribute('html', 'data-theme') === null, '可切回“自动”跟随系统');

  // 3.4 价格页计费周期
  await pg.goto(`${BASE}/pricing.html`);
  await pg.click('label[for="billing-monthly"]');
  const monthly = await pg.textContent('.plan--pro .plan__amount');
  await pg.click('label[for="billing-yearly"]');
  const yearly = await pg.textContent('.plan--pro .plan__amount');
  expect(monthly === '¥8' && yearly === '¥68', `计费周期切换（按月 ${monthly} / 按年 ${yearly}）`);

  // 3.5 常见问题搜索与锚点
  await pg.goto(`${BASE}/faq.html`);
  const total = await pg.locator('.faq-item').count();
  await pg.fill('#faq-search', '退款');
  await pg.waitForTimeout(300);
  const shown = await pg.locator('.faq-item:visible').count();
  expect(shown > 0 && shown < total && await pg.isVisible('#refund'), `FAQ 搜索“退款”显示 ${shown}/${total} 条`);
  await pg.fill('#faq-search', '完全不存在的词');
  await pg.waitForTimeout(300);
  expect(await pg.isVisible('#faq-empty'), 'FAQ 无结果时显示提示');
  await pg.goto(`${BASE}/faq.html#refund`);
  expect(await pg.evaluate(() => document.getElementById('refund').open), '通过锚点 #refund 直接展开对应问题');

  // 3.6 联系表单
  await pg.goto(`${BASE}/contact.html?topic=billing`);
  expect(await pg.inputValue('#f-topic') === 'billing', '通过 ?topic=billing 预选主题');
  await pg.goto(`${BASE}/contact.html`);
  await pg.click('#contact-form [type="submit"]');
  const invalid = await pg.locator('.field.is-invalid').count();
  expect(invalid === 5 && await pg.isVisible('#form-alert')
    && await pg.evaluate(() => document.activeElement.id === 'f-name'), `空表单提交：${invalid} 处错误提示，焦点移到第一个错误字段`);
  await pg.fill('#f-email', 'abc');
  await pg.locator('#f-email').blur();
  expect((await pg.textContent('#email-error')).includes('格式'), '邮箱格式错误时给出具体提示');
  await pg.fill('#f-name', '测试用户');
  await pg.fill('#f-email', 'tester@example.com');
  await pg.selectOption('#f-topic', 'feedback');
  await pg.fill('#f-message', '希望增加按周统计的预算视图，谢谢你们。');
  await pg.check('#f-consent');
  await pg.click('#contact-form [type="submit"]');
  expect(await pg.isDisabled('#contact-form [type="submit"]'), '提交中按钮进入加载状态');
  await pg.waitForSelector('#form-success:not([hidden])', { timeout: 5000 });
  expect(await pg.textContent('#success-email') === 'tester@example.com'
    && await pg.evaluate(() => document.activeElement.matches('#form-success h2')), '提交成功：显示成功面板、回显邮箱并移动焦点');
  await pg.click('#form-again');
  expect(await pg.isVisible('#contact-form') && await pg.inputValue('#f-name') === '', '“再写一条”重置表单');

  // 3.7 复制文章链接
  await pg.goto(`${BASE}/blog/local-first.html`);
  await pg.click('[data-copy-link]');
  await pg.waitForTimeout(200);
  expect((await pg.textContent('.copy-status')) === '链接已复制', '文章页“复制链接”有反馈');

  // 3.8 404：任意路径返回 404 状态并正确加载样式
  for (const p of ['/does-not-exist', '/blog/nope/deeper/']) {
    const res = await pg.goto(BASE + p);
    const styled = await pg.evaluate(() => getComputedStyle(document.querySelector('.site-header')).position === 'sticky');
    expect(res.status() === 404 && styled && (await pg.textContent('h1')).includes('记丢了'), `访问 ${p} 返回带样式的 404 页面`);
  }
  await ctx.close();

  /* 4. 无 JS 降级 */
  const nojs = await browser.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
  const np = await nojs.newPage();
  for (const page of PAGES) {
    await np.goto(`${BASE}/${page}`);
    const r = await np.evaluate(() => ({
      hidden: [...document.querySelectorAll('.reveal')].filter((e) => getComputedStyle(e).opacity === '0').length,
      nav: [...document.querySelectorAll('.nav-links a')].filter((a) => a.getBoundingClientRect().width > 0).length,
    }));
    if (r.hidden) fail(`${page} 无 JS`, `${r.hidden} 个区块不可见`);
    if (r.nav < 6) fail(`${page} 无 JS`, `导航链接只显示了 ${r.nav} 个`);
  }
  await np.goto(`${BASE}/contact.html`);
  expect(await np.isVisible('noscript, .form-alert') || (await np.content()).includes('留言表单需要启用 JavaScript'), '无 JS 时联系页给出邮件替代方案');
  ok('无 JS 时所有页面内容与导航完整可见');
  await nojs.close();
  await browser.close();

  /* 汇总 */
  console.log('\n页面体积（HTML + CSS + JS + 图片，未压缩）：');
  Object.entries(weights).forEach(([p, b]) => console.log(`  ${p.padEnd(26)} ${(b / 1024).toFixed(1)} KB`));
  console.log('\n' + info.join('\n'));
  if (problems.length) {
    console.log(`\n发现 ${problems.length} 个问题：\n` + [...new Set(problems)].join('\n'));
    process.exit(1);
  }
  console.log('\n全部检查通过。');
})().catch((e) => { console.error(e); process.exit(1); });
