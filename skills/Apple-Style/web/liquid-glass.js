/*  Apple-Style — Liquid Glass runtime (vanilla JS, no deps, ~9 KB)
 *  Adds the dynamic behaviors apple-style.css cannot do alone:
 *    1. Lensing: per-element SVG displacement filter that bends the backdrop at
 *       the rim (Chromium; Safari/Firefox fall back to blur + highlights).
 *    2. Interactive illumination: glow starts under the pointer and spreads.
 *    3. Adaptivity: samples what is behind small glass elements and flips them
 *       light/dark (data-glass-scheme); raises shadow over text.
 *    4. Morphing: matchedGeometry-style transition of one glass shape into
 *       another (button → menu/sheet), materialize in/out.
 *    5. Tab bar minimize-on-scroll; scroll-edge activation; concentric radii.
 *  Usage:  LiquidGlass.init()   // auto-wires [class*="as-glass"] in document
 *          LiquidGlass.attach(el, {lens:true, adapt:true})
 *          LiquidGlass.morph(fromEl, toEl, {duration:420})
 *          LiquidGlass.materialize(el, true|false)
 *          LiquidGlass.concentric(container)   // sets child radii = parent − inset
 */
(function (global) {
  'use strict';
  const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const reduceTransparency = () => matchMedia('(prefers-reduced-transparency: reduce)').matches;
  const moreContrast = () => matchMedia('(prefers-contrast: more)').matches;
  // backdrop-filter: url(#svg) works in Chromium only. Feature-detect honestly.
  const supportsLens = (() => {
    try {
      // Chromium UAs contain "Chrome"; Safari UAs contain "Version/" and no "Chrome".
      return CSS.supports('backdrop-filter', 'url(#x)') && /Chrome|Chromium|Edg|Electron/.test(navigator.userAgent) && !/Version\//.test(navigator.userAgent);
    } catch { return false; }
  })();

  let svgRoot = null, uid = 0;
  function ensureSvg() {
    if (svgRoot) return svgRoot;
    svgRoot = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgRoot.setAttribute('aria-hidden', 'true');
    svgRoot.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';
    document.body.appendChild(svgRoot);
    return svgRoot;
  }

  /* ---------- 1. Lensing --------------------------------------------------
   * Displacement map: neutral gray (128,128) in the center, and near the edges
   * a vector pointing inward whose magnitude ramps with a smooth falloff. This
   * makes the backdrop appear refracted/magnified at the rim, like a thick
   * glass slab — the primary visual cue of Liquid Glass ("lensing").        */
  function buildMap(w, h, radius, rim) {
    const c = document.createElement('canvas'); c.width = Math.max(2, Math.round(w)); c.height = Math.max(2, Math.round(h));
    const ctx = c.getContext('2d'); const img = ctx.createImageData(c.width, c.height); const d = img.data;
    const r = Math.min(radius, c.width / 2, c.height / 2);
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
      // signed distance to rounded-rect edge
      const qx = Math.abs(x + .5 - c.width / 2) - (c.width / 2 - r), qy = Math.abs(y + .5 - c.height / 2) - (c.height / 2 - r);
      const ox = Math.max(qx, 0), oy = Math.max(qy, 0);
      const dist = r - (Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0)); // >0 inside, distance from edge
      let t = 1 - Math.min(Math.max(dist / rim, 0), 1); t = t * t * (3 - 2 * t);      // smoothstep falloff
      // direction toward center
      const cx = x + .5 - c.width / 2, cy = y + .5 - c.height / 2, len = Math.hypot(cx, cy) || 1;
      const i = (y * c.width + x) * 4;
      d[i] = 128 - (cx / len) * 127 * t; d[i + 1] = 128 - (cy / len) * 127 * t; d[i + 2] = 128; d[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0); return c.toDataURL('image/png');
  }
  function applyLens(el, opts) {
    if (!supportsLens || reduceTransparency() || moreContrast()) return;
    const rect = el.getBoundingClientRect(); if (rect.width < 8 || rect.height < 8) return;
    const cs = getComputedStyle(el);
    const radius = parseFloat(cs.borderTopLeftRadius) || 0;
    const rim = opts.rim || Math.max(10, Math.min(rect.height * .45, 26));
    const scale = opts.scale || (el.classList.contains('as-glass-large') ? 12 : 22);
    const blur = parseFloat(cs.getPropertyValue('--_blur')) || 14;
    const id = el.__lgId || (el.__lgId = 'as-lens-' + (++uid));
    let f = document.getElementById(id);
    if (!f) {
      f = document.createElementNS('http://www.w3.org/2000/svg', 'filter'); f.id = id;
      f.setAttribute('x', '0'); f.setAttribute('y', '0'); f.setAttribute('width', '100%'); f.setAttribute('height', '100%');
      f.setAttribute('color-interpolation-filters', 'sRGB');
      f.innerHTML = '<feImage result="map" preserveAspectRatio="none"/>' +
        '<feDisplacementMap in="SourceGraphic" in2="map" xChannelSelector="R" yChannelSelector="G" result="lens"/>' +
        '<feGaussianBlur in="lens" stdDeviation="0" result="blurred"/>' +
        '<feColorMatrix in="blurred" type="saturate" values="1.6"/>';
      ensureSvg().appendChild(f);
    }
    const img = f.querySelector('feImage');
    img.setAttribute('href', buildMap(rect.width, rect.height, radius, rim));
    img.setAttribute('width', rect.width); img.setAttribute('height', rect.height);
    f.querySelector('feDisplacementMap').setAttribute('scale', scale);
    f.querySelector('feGaussianBlur').setAttribute('stdDeviation', Math.max(0, blur * .5));
    el.style.setProperty('--as-glass-filter', `url(#${id})`);
    el.style.setProperty('--as-glass-lens', '1');
  }

  /* ---------- 2. Interactive illumination --------------------------------- */
  function wireInteraction(el) {
    if (el.__lgWired) return; el.__lgWired = true;
    const move = e => { const r = el.getBoundingClientRect(); el.style.setProperty('--as-px', ((e.clientX - r.left) / r.width * 100) + '%'); el.style.setProperty('--as-py', ((e.clientY - r.top) / r.height * 100) + '%'); };
    el.addEventListener('pointerenter', move); el.addEventListener('pointermove', move);
    el.addEventListener('pointerdown', e => { move(e); el.classList.add('is-pressed'); spreadToNeighbors(el, e, true); });
    const up = () => { el.classList.remove('is-pressed'); spreadToNeighbors(el, null, false); };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('pointerleave', up);
  }
  // "the glow spreads onto any Liquid Glass elements nearby"
  function spreadToNeighbors(el, e, on) {
    const r = el.getBoundingClientRect();
    document.querySelectorAll('.as-glass').forEach(o => {
      if (o === el) return; const q = o.getBoundingClientRect();
      const gap = Math.hypot(Math.max(0, Math.max(q.left - r.right, r.left - q.right)), Math.max(0, Math.max(q.top - r.bottom, r.top - q.bottom)));
      if (gap < 24) { o.style.setProperty('--as-glow', on ? '.28' : ''); if (e) { o.style.setProperty('--as-px', ((e.clientX - q.left) / q.width * 100) + '%'); o.style.setProperty('--as-py', ((e.clientY - q.top) / q.height * 100) + '%'); } }
    });
  }

  /* ---------- 3. Adaptivity (backdrop sampling) ---------------------------
   * Small glass (bars, buttons) flips light/dark with the content behind it;
   * large glass (.as-glass-large) never flips. We look at what is under the
   * element's center via elementsFromPoint: solid backgrounds → luminance of
   * the color; same-origin <img>/<video>/<canvas> → average pixel luminance;
   * data-glass-scheme on an ancestor → explicit hint. Text underneath → over=text. */
  const lumCache = new WeakMap();
  function relLum(rgb) { const m = rgb.match(/[\d.]+/g); if (!m) return null; const a = m[3] === undefined ? 1 : +m[3]; if (a < .2) return null; const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }; return .2126 * f(+m[0]) + .7152 * f(+m[1]) + .0722 * f(+m[2]); }
  function mediaLum(node) {
    if (lumCache.has(node)) return lumCache.get(node);
    let l = null; try { const c = document.createElement('canvas'); c.width = c.height = 8; const ctx = c.getContext('2d'); ctx.drawImage(node, 0, 0, 8, 8); const d = ctx.getImageData(0, 0, 8, 8).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += relLum(`rgb(${d[i]},${d[i + 1]},${d[i + 2]})`); l = s / (d.length / 4); } catch { l = null; }
    if (node.tagName !== 'VIDEO') lumCache.set(node, l); return l;
  }
  function sampleBehind(el) {
    const r = el.getBoundingClientRect(); const pts = [[r.left + r.width / 2, r.top + r.height / 2], [r.left + r.width * .2, r.top + r.height / 2], [r.left + r.width * .8, r.top + r.height / 2]];
    let lums = [], overText = false;
    const prev = el.style.pointerEvents; el.style.pointerEvents = 'none';
    for (const [x, y] of pts) {
      const stack = document.elementsFromPoint(x, y).filter(n => n !== el && !el.contains(n));
      for (const n of stack) {
        const hint = n.closest?.('[data-glass-scheme-hint]'); if (hint) { lums.push(hint.dataset.glassSchemeHint === 'dark' ? 0 : 1); break; }
        if (/^(P|H[1-6]|SPAN|LI|A|LABEL|TD|TH)$/.test(n.tagName) && n.textContent.trim()) overText = true;
        if (/^(IMG|VIDEO|CANVAS)$/.test(n.tagName)) { const l = mediaLum(n); if (l !== null) { lums.push(l); break; } }
        const cs = getComputedStyle(n); const l = relLum(cs.backgroundColor);
        if (l !== null) { lums.push(l); break; }
        if (cs.backgroundImage !== 'none') { const g = cs.backgroundImage.match(/rgba?\([^)]+\)/g); if (g) { lums.push(g.map(relLum).filter(v => v !== null).reduce((a, b) => a + b, 0) / g.length); break; } }
      }
    }
    el.style.pointerEvents = prev;
    if (!lums.length) return { scheme: null, overText };
    const avg = lums.reduce((a, b) => a + b, 0) / lums.length;
    return { scheme: avg < .3 ? 'dark' : avg > .5 ? 'light' : null, overText };
  }
  function adapt(el) {
    if (el.classList.contains('as-glass-large') || el.classList.contains('as-glass-clear')) return;
    const { scheme, overText } = sampleBehind(el);
    if (scheme) el.dataset.glassScheme = scheme; else if (!el.hasAttribute('data-glass-scheme-fixed')) el.removeAttribute('data-glass-scheme');
    if (overText) el.dataset.glassOver = 'text'; else el.removeAttribute('data-glass-over');
  }

  /* ---------- 4. Morphing / materialize ------------------------------------ */
  function morph(from, to, o = {}) {
    const dur = reduceMotion() ? 1 : (o.duration || 460);
    const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
    const ra = getComputedStyle(from).borderRadius, rb = getComputedStyle(to).borderRadius;
    const ghost = from.cloneNode(false); ghost.className = from.className.replace(/\bas-glass-interactive\b/, ''); ghost.innerHTML = '';
    ghost.style.cssText = `position:fixed;left:${a.left}px;top:${a.top}px;width:${a.width}px;height:${a.height}px;margin:0;z-index:9999;pointer-events:none;border-radius:${ra};transition:none`;
    document.body.appendChild(ghost);
    to.style.visibility = 'hidden'; from.style.visibility = 'hidden';
    const anim = ghost.animate([
      { left: a.left + 'px', top: a.top + 'px', width: a.width + 'px', height: a.height + 'px', borderRadius: ra },
      { left: b.left + 'px', top: b.top + 'px', width: b.width + 'px', height: b.height + 'px', borderRadius: rb }
    ], { duration: dur, easing: 'cubic-bezier(.32,1.25,.4,1)', fill: 'forwards' });
    return anim.finished.then(() => { ghost.remove(); to.style.visibility = ''; if (o.keepSource !== false) from.style.visibility = ''; to.animate([{ opacity: 0 }, { opacity: 1 }], { duration: dur * .35, fill: 'both' }); if (o.lens !== false) applyLens(to, {}); });
  }
  // "objects materialize in and out by gradually modulating lensing" (not a plain fade)
  function materialize(el, show, o = {}) {
    const dur = reduceMotion() ? 1 : (o.duration || 380);
    const kf = show ? [{ opacity: 0, transform: 'scale(.86)', filter: 'blur(6px) saturate(.6)' }, { opacity: 1, transform: 'none', filter: 'none' }]
                    : [{ opacity: 1, transform: 'none', filter: 'none' }, { opacity: 0, transform: 'scale(.92)', filter: 'blur(6px) saturate(.6)' }];
    if (show) el.hidden = false;
    return el.animate(kf, { duration: dur, easing: show ? 'cubic-bezier(.2,1.2,.3,1)' : 'cubic-bezier(.4,0,.6,1)', fill: 'forwards' }).finished.then(() => { if (!show) el.hidden = true; });
  }

  /* ---------- 5. Structure helpers ----------------------------------------- */
  function tabBarMinimize(bar, opts = {}) {
    const scroller = opts.scroller || window; let last = scroller === window ? scrollY : scroller.scrollTop, acc = 0;
    const onScroll = () => { const y = scroller === window ? scrollY : scroller.scrollTop; const dy = y - last; last = y; acc = Math.sign(dy) === Math.sign(acc) ? acc + dy : dy;
      if (acc > 24 && y > 40) bar.classList.add('is-minimized'); else if (acc < -24 || y <= 40) bar.classList.remove('is-minimized'); };
    scroller.addEventListener('scroll', onScroll, { passive: true });
  }
  // Concentric: child radius = container radius − child's inset from container edge
  function concentric(container, min = 0) {
    const cs = getComputedStyle(container); const R = parseFloat(cs.borderTopLeftRadius) || 0; const cr = container.getBoundingClientRect();
    container.querySelectorAll('.as-concentric').forEach(ch => { const r = ch.getBoundingClientRect(); const inset = Math.max(0, Math.min(r.left - cr.left, r.top - cr.top, cr.right - r.right, cr.bottom - r.bottom)); ch.style.borderRadius = Math.max(min, R - inset) + 'px'; });
  }

  /* ---------- Attach / init ------------------------------------------------ */
  const attached = new Set();
  function attach(el, opts = {}) {
    if (attached.has(el)) return; attached.add(el);
    if (el.classList.contains('as-glass-interactive') || el.querySelector('.as-item,.as-tab')) wireInteraction(el);
    if (opts.lens !== false && el.dataset.lens !== 'off') applyLens(el, opts);
    if (opts.adapt !== false && el.dataset.adapt !== 'off') adapt(el);
    ro.observe(el);
  }
  const ro = new ResizeObserver(entries => entries.forEach(e => { if (attached.has(e.target)) applyLens(e.target, {}); }));
  let ticking = false;
  function scheduleAdapt() { if (ticking) return; ticking = true; requestAnimationFrame(() => { ticking = false; attached.forEach(el => { if (el.isConnected && el.dataset.adapt !== 'off') adapt(el); }); }); }
  function init(root = document) {
    root.querySelectorAll('.as-glass').forEach(el => attach(el));
    addEventListener('scroll', scheduleAdapt, { passive: true, capture: true }); addEventListener('resize', scheduleAdapt);
    document.querySelectorAll('.as-tabbar[data-minimize]').forEach(b => tabBarMinimize(b));
    document.querySelectorAll('.as-container[data-concentric]').forEach(c => concentric(c));
    new MutationObserver(m => m.forEach(x => x.addedNodes.forEach(n => { if (n.nodeType === 1) { if (n.matches?.('.as-glass')) attach(n); n.querySelectorAll?.('.as-glass').forEach(attach); } }))).observe(document.body, { childList: true, subtree: true });
    ['(prefers-reduced-transparency: reduce)', '(prefers-contrast: more)', '(prefers-color-scheme: dark)'].forEach(q => matchMedia(q).addEventListener('change', () => attached.forEach(el => { el.style.removeProperty('--as-glass-filter'); applyLens(el, {}); adapt(el); })));
    return { attached: attached.size, lens: supportsLens };
  }
  global.LiquidGlass = { init, attach, adapt, applyLens, morph, materialize, tabBarMinimize, concentric, supportsLens, refresh: scheduleAdapt };
  if (document.readyState !== 'loading' && document.currentScript?.dataset.auto !== undefined) init();
  else if (document.currentScript?.dataset.auto !== undefined) addEventListener('DOMContentLoaded', () => init());
})(window);
