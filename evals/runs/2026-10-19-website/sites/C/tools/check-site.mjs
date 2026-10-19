// 静态检查（无依赖）：node tools/check-site.mjs
// - 每页：doctype、lang、viewport、title、description、唯一 h1、标题层级不跳级
// - 标签配对、重复 id、img alt、button type
// - aria-labelledby / aria-describedby / aria-controls / label[for] 引用存在
// - 内部链接与资源文件存在、#锚点存在
// - 页面、CSS、JS 不引用任何外部资源（外链 <a> 允许，但会列出供人工确认）
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
// SVG 内的自闭合元素
const errors = [];
const warnings = [];
const externalLinks = new Set();
const err = (f, m) => errors.push(`${f}: ${m}`);

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(d => {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) return d.name === 'tools' || d.name.startsWith('.') ? [] : walk(p);
    return [p];
  });
}

const files = walk(ROOT);
const htmlFiles = files.filter(f => f.endsWith('.html'));
const idCache = new Map();

function stripNonMarkup(src) {
  return src
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, m => m.replace(/>[\s\S]*<\//, '></'))
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '<style></style>');
}

function attrs(tag) {
  const out = {};
  const re = /([:\w-]+)(?:\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  let m;
  const body = tag.replace(/^<\/?[\w:-]+/, '').replace(/\/?>$/, '');
  while ((m = re.exec(body))) out[m[1].toLowerCase()] = m[3] ?? m[4] ?? m[5] ?? '';
  return out;
}

function idsOf(file) {
  if (!idCache.has(file)) {
    const src = stripNonMarkup(fs.readFileSync(file, 'utf8'));
    idCache.set(file, new Set([...src.matchAll(/\sid="([^"]+)"/g)].map(m => m[1])));
  }
  return idCache.get(file);
}

function resolve(fromFile, ref) {
  if (ref.startsWith('/')) return path.join(ROOT, ref);
  return path.resolve(path.dirname(fromFile), ref);
}

for (const file of htmlFiles) {
  const rel = path.relative(ROOT, file);
  const raw = fs.readFileSync(file, 'utf8');
  const src = stripNonMarkup(raw);

  if (!/^<!doctype html>/i.test(raw.trim())) err(rel, '缺少 <!doctype html>');
  if (!/<html lang="zh-CN">/.test(raw)) err(rel, '缺少 lang="zh-CN"');
  if (!/<meta charset="utf-8">/i.test(raw)) err(rel, '缺少 charset');
  if (!/<meta name="viewport"/.test(raw)) err(rel, '缺少 viewport');
  if (!/<title>[^<]{4,}<\/title>/.test(raw)) err(rel, '缺少 title');
  if (!/<meta name="description" content="[^"]{20,}"/.test(raw)) err(rel, '缺少或过短的 description');
  if (!/<main\b/.test(raw)) err(rel, '缺少 <main>');
  if (!/class="skip-link"/.test(raw)) err(rel, '缺少跳转链接');

  // 标签配对
  const stack = [];
  const tagRe = /<\/?([a-zA-Z][\w:-]*)\b[^>]*?>/g;
  let m;
  while ((m = tagRe.exec(src))) {
    const t = m[0];
    const name = m[1].toLowerCase();
    if (t.startsWith('</')) {
      const top = stack.pop();
      if (top !== name) { err(rel, `标签不匹配：期望 </${top}>，遇到 </${name}>（位置 ${m.index}）`); break; }
    } else if (!VOID.has(name) && !t.endsWith('/>')) {
      stack.push(name);
    }
  }
  if (stack.length) err(rel, `未闭合标签：${stack.join(', ')}`);

  // id 唯一
  const ids = [...src.matchAll(/\sid="([^"]+)"/g)].map(x => x[1]);
  const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
  if (dup.length) err(rel, `重复 id：${[...new Set(dup)].join(', ')}`);
  const idSet = new Set(ids);

  // 标题
  const headings = [...src.matchAll(/<h([1-6])\b/g)].map(x => +x[1]);
  const h1 = headings.filter(h => h === 1).length;
  if (h1 !== 1) err(rel, `h1 数量为 ${h1}`);
  for (let i = 1; i < headings.length; i++) {
    if (headings[i] > headings[i - 1] + 1) warnings.push(`${rel}: 标题从 h${headings[i - 1]} 跳到 h${headings[i]}`);
  }

  // 元素级检查
  for (const tm of src.matchAll(/<(img|button|a|link|script|input|textarea|select|label|use|source)\b[^>]*>/g)) {
    const tag = tm[1];
    const a = attrs(tm[0]);
    if (tag === 'img' && !('alt' in a)) err(rel, `img 缺少 alt：${a.src}`);
    if (tag === 'button' && !a.type) err(rel, `button 缺少 type`);
    if (tag === 'label' && a.for && !idSet.has(a.for)) err(rel, `label for="${a.for}" 找不到目标`);
    for (const k of ['aria-labelledby', 'aria-describedby', 'aria-controls']) {
      if (a[k]) for (const ref of a[k].split(/\s+/)) if (!idSet.has(ref)) err(rel, `${k}="${ref}" 找不到目标`);
    }
    const ref = a.href ?? a.src;
    if (ref === undefined || ref === '') continue;
    if (/^(mailto:|tel:|data:)/.test(ref)) continue;
    if (/^https?:\/\//.test(ref)) {
      if (tag === 'a') externalLinks.add(ref);
      else if (!(tag === 'link' && ['canonical', 'alternate'].includes(a.rel))) err(rel, `引用外部资源：<${tag}> ${ref}`);
      continue;
    }
    if (/^\/\//.test(ref)) { err(rel, `协议相对外链：${ref}`); continue; }
    const [pathPart, hash] = ref.split('#');
    const clean = pathPart.split('?')[0];
    let target = clean ? resolve(file, clean) : file;
    if (fs.existsSync(target) && fs.statSync(target).isDirectory()) target = path.join(target, 'index.html');
    if (!fs.existsSync(target)) { err(rel, `链接目标不存在：${ref}`); continue; }
    if (hash && target.endsWith('.html') && !idsOf(target).has(hash)) err(rel, `锚点不存在：${ref}`);
  }

  // 没有空 href="#"
  if (/href="#"/.test(src)) err(rel, '存在空锚点 href="#"');
  // 404 页面必须用绝对路径；其他页面必须用相对路径（便于子目录部署和本地打开）
  if (rel !== '404.html' && /(href|src)="\/(?!\/)/.test(src)) err(rel, '非 404 页面使用了以 / 开头的路径');
}

// CSS / JS 中不得出现外部 URL（data: 与 SVG xmlns 除外）
for (const f of files.filter(f => /\.(css|js)$/.test(f))) {
  const rel = path.relative(ROOT, f);
  const txt = fs.readFileSync(f, 'utf8').replace(/http:\/\/www\.w3\.org\/2000\/svg/g, '');
  for (const u of txt.matchAll(/https?:\/\/[^\s'")]+/g)) err(rel, `外部 URL：${u[0]}`);
  if (/@import|@font-face/.test(txt)) err(rel, '使用了 @import 或 @font-face');
}

// 站点地图中的每个 URL 都对应真实文件
const sitemap = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
for (const [, loc] of sitemap.matchAll(/<loc>https:\/\/limeledger\.app\/([^<]*)<\/loc>/g)) {
  let t = path.join(ROOT, loc || 'index.html');
  if (loc.endsWith('/')) t = path.join(t, 'index.html');
  if (!fs.existsSync(t)) err('sitemap.xml', `不存在：${loc}`);
}
const missingInSitemap = htmlFiles.map(f => path.relative(ROOT, f)).filter(r => r !== '404.html')
  .filter(r => !sitemap.includes(r.replace(/index\.html$/, '')) && !(r === 'index.html'));
if (missingInSitemap.length) warnings.push(`sitemap 未包含：${missingInSitemap.join(', ')}`);

console.log(`检查了 ${htmlFiles.length} 个 HTML 页面`);
console.log(`外部链接（仅 <a>，需人工确认）：\n  ${[...externalLinks].join('\n  ') || '无'}`);
if (warnings.length) console.log(`警告 ${warnings.length} 条：\n  ${warnings.join('\n  ')}`);
if (errors.length) {
  console.log(`错误 ${errors.length} 条：\n  ${errors.join('\n  ')}`);
  process.exit(1);
}
console.log('全部通过 ✓');
