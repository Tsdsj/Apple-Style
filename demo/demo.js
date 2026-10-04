/* ==========================================================================
   Apple-Style demo — 演示站脚本（只存在于 demo/）
   职责：国际化、动态内容生成、交互连线、无障碍偏好模拟。
   设计语言本身全部来自 ../skills/Apple-Style/web/{apple-style.css,liquid-glass.js}
   ========================================================================== */
(function () {
  'use strict';

  const html = document.documentElement;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const store = {
    get(k, d) { try { const v = localStorage.getItem('as-demo:' + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('as-demo:' + k, JSON.stringify(v)); } catch { /* 隐私模式下忽略 */ } }
  };

  /* ---------------------------------------------------------------- 国际化 */
  const DEFAULT_LANG = 'zh';                      // 默认中文
  let lang = store.get('lang', DEFAULT_LANG);
  if (!window.I18N[lang]) lang = DEFAULT_LANG;

  function t(key) {
    const dict = window.I18N[lang] || {};
    if (key in dict) return dict[key];
    console.warn('[i18n] 缺少翻译 / missing key:', key, '@', lang);
    return (window.I18N.en && window.I18N.en[key]) || key;
  }

  function translate(root = document) {
    $$('[data-i18n]', root).forEach(el => { el.textContent = t(el.dataset.i18n); });
    $$('[data-i18n-html]', root).forEach(el => { el.innerHTML = t(el.dataset.i18nHtml); });
    $$('[data-i18n-aria]', root).forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
    $$('[data-i18n-ph]', root).forEach(el => { el.setAttribute('placeholder', t(el.dataset.i18nPh)); });
    document.title = t('doc.title');
    html.lang = lang === 'zh' ? 'zh-Hans' : 'en';
  }

  function setLang(next) {
    lang = window.I18N[next] ? next : DEFAULT_LANG;
    store.set('lang', lang);
    translate();
    renderTypeScale();          // 字阶表的用途列随语言变化
    syncPrefLabels(); renderChecklist();
  }

  /* ----------------------------------------------------------- 动态内容 */

  // 目录：由页面里的 <section data-nav> 自动生成，新增小节无需改这里
  function buildToc() {
    const list = $('#tocList');
    list.innerHTML = $$('.section[data-nav]').map(s =>
      `<a href="#${s.id}" data-i18n="${s.dataset.nav}"></a>`).join('');
  }

  // 运行状态芯片：用来确认技能文件确实被加载、lensing 是否生效
  function buildChips(status) {
    // 三通道折射（色散）是有预算的，数一下实际用上的元素，方便调 chromaBudget
    const chroma = $$('filter[id^="as-lens"]').filter(f => f.querySelectorAll('feDisplacementMap').length === 3).length;
    $('#statusChips').innerHTML = `
      <span class="chip ${status.lens ? 'ok' : 'warn'}"><span data-i18n="ov.chip.lens"></span>
        <b data-chip="lens">${status.lens ? t('ov.yes') : t('ov.no')}</b></span>
      <span class="chip ${chroma ? 'ok' : ''}"><span data-i18n="ov.chip.chroma"></span><b>${chroma}</b></span>
      <span class="chip"><span data-i18n="ov.chip.glass"></span><b data-chip="count">${status.attached}</b></span>
      <span class="chip"><span data-i18n="ov.chip.scheme"></span><b data-chip="scheme">–</b></span>
      <span class="chip"><span data-i18n="ov.chip.platform"></span><b data-chip="platform">iOS</b></span>`;
    translate($('#statusChips'));
  }

  const SYSTEM_COLORS = ['red', 'orange', 'yellow', 'green', 'mint', 'teal', 'cyan', 'blue',
    'indigo', 'purple', 'pink', 'brown', 'gray', 'gray2', 'gray3', 'gray4', 'gray5', 'gray6'];
  const SEMANTIC_COLORS = ['label', 'label-secondary', 'label-tertiary', 'separator',
    'bg', 'bg-secondary', 'bg-grouped', 'bg-grouped-2', 'fill', 'fill-secondary'];

  function resolve(varName) {
    const probe = document.createElement('span');
    probe.style.cssText = `color: var(--as-${varName}); position:absolute; visibility:hidden`;
    document.body.appendChild(probe);
    const v = getComputedStyle(probe).color;
    probe.remove();
    return v;
  }

  function renderSwatches() {
    const cell = name => `<div class="swatch${name.startsWith('fill') || name.includes('separator') ? ' on-check' : ''}">
        <i style="background: var(--as-${name})"></i><b>${name}</b><span>${resolve(name)}</span></div>`;
    $('#systemColors').innerHTML = SYSTEM_COLORS.map(cell).join('');
    $('#semanticColors').innerHTML = SEMANTIC_COLORS.map(cell).join('');
  }

  // 字阶：iOS(Large 档) 与 macOS 内置样式两套规格
  const TYPE_SCALE = [
    ['largetitle', 'Large Title', '34/41 · 400', '26/32 · 400'],
    ['title1', 'Title 1', '28/34 · 400', '22/26 · 400'],
    ['title2', 'Title 2', '22/28 · 400', '17/22 · 400'],
    ['title3', 'Title 3', '20/25 · 400', '15/20 · 400'],
    ['headline', 'Headline', '17/22 · 600', '13/16 · 700'],
    ['body', 'Body', '17/22 · 400', '13/16 · 400'],
    ['callout', 'Callout', '16/21 · 400', '12/15 · 400'],
    ['subhead', 'Subheadline', '15/20 · 400', '11/14 · 400'],
    ['footnote', 'Footnote', '13/18 · 400', '10/13 · 400'],
    ['caption1', 'Caption 1', '12/16 · 400', '10/13 · 400'],
    ['caption2', 'Caption 2', '11/13 · 400', '10/13 · 500']
  ];

  function renderTypeScale() {
    const mac = html.dataset.platform === 'macos';
    $('#typeScale').innerHTML =
      `<div class="type-row head"><span data-i18n="ty.col.style"></span><span data-i18n="ty.col.spec"></span><span data-i18n="ty.col.usage"></span></div>` +
      TYPE_SCALE.map(([key, label, ios, macos]) => `
        <div class="type-row">
          <span class="sample as-text-${key}">${t('ty.sample')}<em class="name">${label}</em></span>
          <span class="spec">${mac ? macos : ios}</span>
          <span class="usage" data-i18n="ty.u.${key}"></span>
        </div>`).join('');
    translate($('#typeScale'));
  }

  function renderMistakes() {
    const rows = Array.from({ length: 9 }, (_, i) => i + 1);
    $('#mistakes').innerHTML =
      `<div class="mistake-row head"><span data-i18n="mk.col.bad"></span><span data-i18n="mk.col.fix"></span></div>` +
      rows.map(n => `<div class="mistake-row">
          <span class="bad-cell" data-i18n="mk.r${n}a"></span>
          <span class="fix-cell" data-i18n="mk.r${n}b"></span>
        </div>`).join('');
    translate($('#mistakes'));
  }

  const CHECK_COUNT = 12;
  function renderChecklist() {
    const records = store.get('check-evidence', {});
    $('#checklist').innerHTML = Array.from({ length: CHECK_COUNT }, (_, i) => {
      const n = i + 1;
      return `<li><label for="check-${n}" class="label" data-i18n="ck.i${n}"></label>
        <select id="check-${n}" data-n="${n}">${['not-checked', 'pass', 'fail', 'na'].map(value =>
          `<option value="${value}" ${records[n] === value ? 'selected' : ''} data-i18n="ck.state.${value}"></option>`).join('')}</select></li>`;
    }).join('');
    translate($('#checklist')); updateProgress();
  }
  function updateProgress() {
    const records = store.get('check-evidence', {});
    const checked = Object.values(records).filter(s => s === 'pass' || s === 'fail').length;
    $('#ckBar').style.width = (checked / CHECK_COUNT * 100) + '%';
    $('#ckCount').textContent = checked + '/' + CHECK_COUNT + ' · ' + t('ck.manual');
  }

  /* ------------------------------------------------------ Hero 画布内容 */
  // 给玻璃一个有真实细节的背景去折射（纯色背景看不出 lensing）
  function paintHero() {
    const c = $('#heroArt'); if (!c) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const W = c.width = c.offsetWidth * dpr, H = c.height = c.offsetHeight * dpr;
    const x = c.getContext('2d');
    x.globalAlpha = .9;
    for (let i = 0; i < 140; i++) {
      x.beginPath();
      x.arc(Math.random() * W, Math.random() * H, 20 + Math.random() * 120 * dpr, 0, 7);
      x.fillStyle = `hsl(${Math.random() * 360} 90% ${40 + Math.random() * 40}% / .32)`;
      x.fill();
    }
    // 文字细节让折射更容易被看见，但要压暗，避免和标题抢视线
    x.globalAlpha = 1;
    x.fillStyle = 'rgb(255 255 255 / .30)';
    x.font = `${24 * dpr}px -apple-system, system-ui`;
    for (let i = 0; i < 7; i++) x.fillText('content layer · 内容层 · content layer · 内容层', 20, (i + 1) * H / 8);
  }

  /* -------------------------------------------------------------- 交互 */
  function showToast(msg) {
    const el = $('#toast');
    el.textContent = msg; el.classList.add('is-on');
    clearTimeout(el.__t); el.__t = setTimeout(() => el.classList.remove('is-on'), 1600);
  }

  function wireSnippets() {
    document.addEventListener('click', e => {
      const s = e.target.closest('.snippet'); if (!s) return;
      navigator.clipboard?.writeText(s.textContent.trim()).then(() => showToast(t('toast.copied')));
    });
  }

  function wireMenu() {
    const menu = $('#shareMenu'); let source;
    const close = (restore = true) => {
      menu.hidden = true; menu.classList.remove('is-open'); source?.setAttribute('aria-expanded', 'false');
      if (restore) source?.focus();
    };
    const open = src => {
      source = src;
      const r = src.getBoundingClientRect();
      menu.hidden = false;
      menu.style.top = (r.bottom + window.scrollY + 8) + 'px';
      menu.style.left = Math.max(8, Math.min(r.left + window.scrollX, innerWidth - 266)) + 'px';
      menu.style.setProperty('--as-origin', 'top left'); menu.classList.add('is-open');
      src.setAttribute('aria-expanded', 'true'); $('.as-menu-item', menu)?.focus();
    };
    [$('#shareBtn'), $('#menuDemoBtn')].forEach(b => {
      if (!b) return;
      b.setAttribute('aria-haspopup', 'menu'); b.setAttribute('aria-expanded', 'false'); b.setAttribute('aria-controls', menu.id);
      b.addEventListener('click', () => menu.hidden ? open(b) : close());
    });
    document.addEventListener('pointerdown', e => { if (!menu.hidden && !menu.contains(e.target) && !source?.contains(e.target)) close(false); });
    menu.addEventListener('keydown', e => {
      const items = $$('.as-menu-item:not(:disabled)', menu), index = items.indexOf(document.activeElement);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault(); items[(index + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length]?.focus();
      } else if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); items[e.key === 'Home' ? 0 : items.length - 1]?.focus(); }
      else if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'Tab') close(false);
    });
    $$('.as-menu-item', menu).forEach(i => i.addEventListener('click', () => close()));
  }

  // Demo-only dialog behavior; the material runtime does not own app modality.
  function modal(panel, backdrop) {
    let source = null, previous = [];
    function close() {
      if (panel.hidden) return;
      panel.hidden = true; panel.classList.remove('is-open', 'is-full'); backdrop.classList.remove('is-open');
      previous.forEach(([el, inert]) => { el.inert = inert; }); previous = [];
      source?.focus(); source = null;
    }
    function open() {
      if (!panel.hidden) return;
      source = document.activeElement;
      previous = [...document.body.children].filter(el => !el.contains(panel) && el !== backdrop && el.tagName !== 'SCRIPT').map(el => [el, el.inert]);
      previous.forEach(([el]) => { el.inert = true; });
      panel.hidden = false; panel.classList.add('is-open'); backdrop.classList.add('is-open');
      panel.querySelector('button, [href], input, [tabindex="0"]')?.focus();
    }
    panel.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      if (e.key !== 'Tab') return;
      const items = [...panel.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),[tabindex="0"]')].filter(el => el.getClientRects().length);
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    backdrop.addEventListener('click', close);
    return { open, close };
  }
  function wireSheet() {
    const sheet = $('#sheet'), controller = modal(sheet, $('#sheetBackdrop'));
    [$('#heroSheet'), $('#sheetDemoBtn')].forEach(b => b?.addEventListener('click', controller.open));
    $('#sheetClose').addEventListener('click', controller.close);
    $('#sheetFull').addEventListener('click', () => sheet.classList.toggle('is-full'));
  }
  function wireAlert() {
    const controller = modal($('#alert'), $('#alertBackdrop'));
    $('#alertDemoBtn').addEventListener('click', controller.open);
    [$('#alertCancel'), $('#alertOk')].forEach(b => b.addEventListener('click', controller.close));
  }

  function wireMotion() {
    const btn = $('#morphBtn'), panel = $('#morphPanel');
    btn.addEventListener('click', () => {
      panel.hidden = false;
      LiquidGlass.morph(btn, panel, { keepSource: false });
    });
    $('#morphClose').addEventListener('click', () => {
      btn.style.visibility = '';
      LiquidGlass.morph(panel, btn, { keepSource: false }).then(() => { panel.hidden = true; });
    });

    let shown = true;
    $('#matBtn').addEventListener('click', () => { shown = !shown; LiquidGlass.materialize($('#matPanel'), shown); });
  }

  function wireControls() {
    // 开关、分段控件、滑块的状态与拖拽手势由 liquid-glass.js 接管，
    // 演示站只监听它派发的 change 事件。
    $$('.as-toggle[data-sim]').forEach(el => el.addEventListener('change', () =>
      applySim(el.dataset.sim, el.getAttribute('aria-checked') === 'true')));
    // 玻璃分组 / 标签栏里的选中态（排除演示设置面板）
    $$('.as-glass-group').forEach(g => {
      if (g.closest('.prefs')) return;
      g.addEventListener('click', e => {
        const b = e.target.closest('.as-item, .as-tab'); if (!b || b.classList.contains('as-tab-search')) return;
        $$('.as-item, .as-tab', g).forEach(x => {
          if (x.classList.contains('as-tab-search')) return;
          x.classList.toggle('is-selected', x === b);
          if (x.classList.contains('as-tab')) { if (x === b) x.setAttribute('aria-current', 'location'); else x.removeAttribute('aria-current'); }
        });
        if (b.classList.contains('as-tab')) { const index = $$('.as-tab', g).indexOf(b); $(['#s-overview', '#s-controls', '#s-check'][index])?.scrollIntoView(); }
      });
    });
    // This is a manual record, never a claim that automated checks passed.
    $('#checklist').addEventListener('change', e => {
      if (!e.target.matches('select[data-n]')) return;
      const records = store.get('check-evidence', {}); records[e.target.dataset.n] = e.target.value;
      store.set('check-evidence', records); updateProgress();
    });
    $('#ckReset').addEventListener('click', () => { store.set('check-evidence', {}); renderChecklist(); });
  }

  // 同心圆角调试台
  function wireConcentric() {
    const r = $('#cRadius'), i = $('#cInset'), box = $('#cBox'), art = $('#cArt');
    const sync = () => {
      const R = +r.value, I = +i.value;   // 轨道填充由 liquid-glass.js 维护
      box.style.setProperty('--as-container-radius', R + 'px');
      box.style.padding = I + 'px';
      art.style.setProperty('--as-concentric-inset', I + 'px');
      $('#cRadiusV').textContent = R;
      $('#cInsetV').textContent = I;
      $('#cInner').textContent = Math.max(0, R - I);
    };
    r.addEventListener('input', sync); i.addEventListener('input', sync); sync();
  }

  /* -------------------------------------------- 演示设置 + 无障碍模拟 */
  const THEMES = ['auto', 'light', 'dark'];

  function syncPrefLabels() {
    const theme = store.get('theme', 'auto');
    $('#themeBtn').innerHTML = '🌓 <span>' + t('ctl.theme.' + theme) + '</span>';
    $('#platBtn').textContent = html.dataset.platform === 'macos' ? 'macOS' : 'iOS';
    const tinted = html.dataset.liquidGlass === 'tinted';
    $('#glassBtn').textContent = t(tinted ? 'ctl.glass.tinted' : 'ctl.glass.clear');
    $('#glassPrefLabel').textContent = t(tinted ? 'ctl.glass.tinted' : 'ctl.glass.clear');
    $('#langBtn').textContent = t('ctl.lang.next');
    const chip = $('[data-chip="scheme"]'), plat = $('[data-chip="platform"]');
    if (chip) chip.textContent = t('ctl.theme.' + theme);
    if (plat) plat.textContent = html.dataset.platform === 'macos' ? 'macOS' : 'iOS';
  }

  function applyTheme(theme) {
    store.set('theme', theme);
    theme === 'auto' ? html.removeAttribute('data-theme') : (html.dataset.theme = theme);
    syncPrefLabels();
    refreshGlass();
    renderSwatches();
  }

  // lensing 的滤镜是写在元素 inline style 上的，会盖过模拟用的 CSS；
  // 打开「降低透明度 / 增强对比度」时先摘掉它，关闭后再重新计算。
  function refreshGlass() {
    const suppress = html.hasAttribute('data-sim-rt') || html.hasAttribute('data-sim-ct');
    $$('.as-glass').forEach(el => {
      LiquidGlass.attach(el, { lens: !suppress && el.dataset.lens !== 'off' });
    });
    LiquidGlass.refresh();
  }

  function applySim(kind, on) {
    const attr = 'data-sim-' + kind;
    on ? html.setAttribute(attr, '') : html.removeAttribute(attr);
    store.set('sim:' + kind, on);
    refreshGlass();
  }

  function wirePrefs() {
    $('#themeBtn').addEventListener('click', () => {
      const next = THEMES[(THEMES.indexOf(store.get('theme', 'auto')) + 1) % THEMES.length];
      applyTheme(next);
    });
    $('#platBtn').addEventListener('click', () => {
      const mac = html.dataset.platform !== 'macos';
      mac ? (html.dataset.platform = 'macos') : html.removeAttribute('data-platform');
      store.set('platform', mac ? 'macos' : 'ios');
      syncPrefLabels(); renderTypeScale(); refreshGlass();
    });
    $('#glassBtn').addEventListener('click', () => {
      const tinted = html.dataset.liquidGlass !== 'tinted';
      tinted ? (html.dataset.liquidGlass = 'tinted') : html.removeAttribute('data-liquid-glass');
      store.set('glass', tinted ? 'tinted' : 'clear');
      syncPrefLabels();
    });
    $('#langBtn').addEventListener('click', () => setLang(lang === 'zh' ? 'en' : 'zh'));
  }

  function restorePrefs() {
    const theme = store.get('theme', 'auto');
    if (theme !== 'auto') html.dataset.theme = theme;
    if (store.get('platform', 'ios') === 'macos') html.dataset.platform = 'macos';
    if (store.get('glass', 'clear') === 'tinted') html.dataset.liquidGlass = 'tinted';
    ['rt', 'ct', 'rm', 'dt'].forEach(k => {
      if (store.get('sim:' + k, false)) {
        html.setAttribute('data-sim-' + k, '');
        const btn = $(`.as-toggle[data-sim="${k}"]`);
        if (btn) btn.setAttribute('aria-checked', 'true');
      }
    });
  }

  /* ------------------------------------------------------------ 目录高亮 */
  function wireToc() {
    const links = new Map($$('.toc a').map(a => [a.getAttribute('href').slice(1), a]));
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        const a = links.get(e.target.id); if (!a) return;
        if (e.isIntersecting) { $$('.toc a').forEach(x => x.classList.remove('is-active')); a.classList.add('is-active'); }
      });
    }, { rootMargin: '-88px 0px -70% 0px' });
    $$('.section[data-nav]').forEach(s => io.observe(s));
  }

  /* --------------------------------------------------------------- 启动 */
  function boot() {
    restorePrefs();
    buildToc();
    renderSwatches();
    renderTypeScale();
    renderMistakes();
    renderChecklist();
    translate();
    paintHero();

    const status = LiquidGlass.init();
    buildChips(status);
    syncPrefLabels();

    wireToc(); wireSnippets(); wireMenu(); wireSheet(); wireAlert();
    wireMotion(); wireControls(); wireConcentric(); wirePrefs();
    refreshGlass();

    html.classList.remove('i18n-pending');
    console.info('[Apple-Style demo] lensing:', status.lens, '| glass elements:', status.attached, '| lang:', lang);
  }

  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', boot);
  else boot();
})();
