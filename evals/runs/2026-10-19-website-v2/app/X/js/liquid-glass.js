/*  Apple-Style — Liquid Glass runtime (vanilla JS, no deps)
 *  Adds the dynamic behaviors apple-style.css cannot do alone:
 *    1. Lensing: per-element SVG displacement filter that refracts the backdrop
 *       at the rim, with optional chromatic dispersion (Chromium; Safari and
 *       Firefox fall back to blur + highlights).
 *    2. Interactive illumination + gel flex: the glow starts under the pointer
 *       and spreads; the light source travels around the silhouette; the slab
 *       flexes while pressed.
 *    3. Adaptivity: samples what is behind small glass elements and flips them
 *       light/dark (data-glass-scheme); raises shadow over text.
 *    4. Morphing: matchedGeometry-style transition of one glass shape into
 *       another (button → menu/sheet), materialize in/out.
 *    5. Scrubbable controls: segmented control, switch and slider track the
 *       pointer 1:1, stretch with the drag, and settle on a spring.
 *    6. Tab bar minimize-on-scroll; scroll-edge activation; concentric radii.
 *    7. Web app components: selectable list (listbox) and announced toast.
 *  Usage:  LiquidGlass.init()   // auto-wires [class*="as-glass"] + controls
 *          LiquidGlass.attach(el, {lens:true, adapt:true, chroma:true})
 *          LiquidGlass.morph(fromEl, toEl, {duration:420})
 *          LiquidGlass.materialize(el, true|false)
 *          LiquidGlass.controls(root)      // or .segmented(el) / .toggle(el) / .slider(input) / .listbox(el)
 *          LiquidGlass.toast('Saved')      // returns hide()
 *          LiquidGlass.concentric(container)
 *  Controls dispatch a bubbling `change` event; read state from the element
 *  (aria-checked, .is-selected, aria-selected, input.value) rather than
 *  tracking it yourself.
 *  Loading: a classic <script> sets window.LiquidGlass; CommonJS gets it as
 *  module.exports; liquid-glass.mjs re-exports it for ES modules. Without a
 *  DOM (server rendering, workers, DOM-less tests) the same API is inert, so
 *  importing never throws — call init() after mounting in the browser.
 */
(function (root, factory) {
  'use strict';
  // One runtime per page: the classic script and the ES module entry (or the
  // same file included twice) share it instead of wiring every control twice.
  const existing = root && root.LiquidGlass;
  const api = existing && existing.__runtime === 'browser' ? existing : factory(root);
  if (root) root.LiquidGlass = api;
  if (typeof module === 'object' && module && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (global) {
  'use strict';
  function inertApi() {
    const none = () => {};
    return Object.freeze({
      init: () => ({ attached: 0, controls: 0, shortcuts: 0, lens: false, destroy: none }),
      attach: () => ({ detach: none }), detach: none, destroy: none, adapt: none, applyLens: none,
      morph: () => Promise.resolve(), materialize: () => Promise.resolve(), controls: () => 0,
      segmented: none, toggle: none, slider: none, listbox: none, toast: () => none, tabBarMinimize: none, titleOnScroll: none,
      concentric: none, splitDivider: none, menuBar: none, menuShortcuts: () => 0, supportsLens: false, refresh: none
    });
  }
  if (!global || !global.document || typeof global.matchMedia !== 'function'
    || typeof global.ResizeObserver !== 'function' || typeof global.IntersectionObserver !== 'function'
    || typeof global.MutationObserver !== 'function') return inertApi();
  const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const reduceTransparency = () => matchMedia('(prefers-reduced-transparency: reduce)').matches;
  const moreContrast = () => matchMedia('(prefers-contrast: more)').matches;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  // backdrop-filter: url(#svg) works in Chromium only. Feature-detect honestly.
  const supportsLens = (() => {
    try {
      // Chromium UAs contain "Chrome"; Safari UAs contain "Version/" and no "Chrome".
      return CSS.supports('backdrop-filter', 'url(#x)') && /Chrome|Chromium|Edg|Electron/.test(navigator.userAgent) && !/Version\//.test(navigator.userAgent);
    } catch { return false; }
  })();

  // Every listener, observer and scheduled callback has a component owner.
  const resources = new Map(), roots = new Map(), suspended = new WeakSet();
  function isSuspended(el) {
    for (let node = el; node; node = node.parentNode || node.host) if (suspended.has(node)) return true;
    return false;
  }
  function state(owner) {
    if (owner.nodeType) startShared();
    if (!resources.has(owner)) resources.set(owner, { cleanup: [], frames: new Set(), timers: new Set(), animations: new Set() });
    return resources.get(owner);
  }
  function cleanup(owner, fn) {
    const st = state(owner); st.cleanup.push(fn);
    return () => { const i = st.cleanup.indexOf(fn); if (i >= 0) st.cleanup.splice(i, 1); };
  }
  function cancelFrame(owner, id) { cancelAnimationFrame(id); resources.get(owner)?.frames.delete(id); }
  function cancelTimer(owner, id) { clearTimeout(id); resources.get(owner)?.timers.delete(id); }
  function listen(owner, target, type, fn, options) {
    target.addEventListener(type, fn, options);
    cleanup(owner, () => target.removeEventListener(type, fn, options));
  }
  function frame(owner, fn) {
    const st = state(owner);
    const id = requestAnimationFrame(() => { st.frames.delete(id); if (resources.get(owner) === st) fn(); });
    st.frames.add(id); return id;
  }
  function timer(owner, fn, delay) {
    const st = state(owner);
    const id = setTimeout(() => { st.timers.delete(id); if (resources.get(owner) === st) fn(); }, delay);
    st.timers.add(id); return id;
  }
  function observe(owner, Type, callback, options) {
    const st = state(owner);
    const ob = new Type((...args) => { if (resources.get(owner) === st) callback(...args); }, options);
    cleanup(owner, () => ob.disconnect()); return ob;
  }
  function animate(owner, el, frames, options) {
    const st = state(owner), animation = el.animate(frames, options);
    st.animations.add(animation);
    animation.finished.then(() => st.animations.delete(animation), () => st.animations.delete(animation));
    return animation;
  }
  const members = (root, selector) => [...(root.matches?.(selector) ? [root] : []), ...root.querySelectorAll(selector)].filter(el => !isSuspended(el));
  const disabled = el => !el || el.matches(':disabled,[aria-disabled="true"]') || !!el.closest('[inert]');

  let svgRoot = null, uid = 0, chromaBudget = 8;
  const liteMode = () => document.documentElement.dataset.perf === 'lite';
  function ensureSvg() {
    if (svgRoot) return svgRoot;
    svgRoot = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgRoot.setAttribute('aria-hidden', 'true');
    svgRoot.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';
    document.body.appendChild(svgRoot);
    return svgRoot;
  }

  /* ---------- 1. Lensing --------------------------------------------------
   * Displacement map: neutral gray (128,128) in the middle, and near the edges
   * a vector pointing along the inward *surface normal* of the rounded rect,
   * ramped with a steep falloff. Using the real normal (rather than the
   * direction to the center) is what makes long capsules and bars refract
   * correctly at their flat edges instead of smearing toward the middle.     */
  function buildMap(w, h, radius, rim) {
    const c = document.createElement('canvas');
    c.width = Math.max(2, Math.round(w)); c.height = Math.max(2, Math.round(h));
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(c.width, c.height), d = img.data;
    const halfW = c.width / 2, halfH = c.height / 2;
    const r = Math.min(radius, halfW, halfH);
    const innerW = halfW - r, innerH = halfH - r;
    for (let y = 0; y < c.height; y++) {
      for (let x = 0; x < c.width; x++) {
        const dx = x + .5 - halfW, dy = y + .5 - halfH;
        const sx = Math.sign(dx) || 1, sy = Math.sign(dy) || 1;
        const qx = Math.abs(dx) - innerW, qy = Math.abs(dy) - innerH;
        const ox = Math.max(qx, 0), oy = Math.max(qy, 0);
        // distance from the edge, positive inside
        const dist = r - (Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0));
        // outward surface normal of the rounded rect at this point
        let nx, ny;
        if (qx > 0 && qy > 0) { const l = Math.hypot(qx, qy) || 1; nx = sx * qx / l; ny = sy * qy / l; }
        else if (qx > qy) { nx = sx; ny = 0; }
        else { nx = 0; ny = sy; }
        // steep ramp: glass bends light hard right at the rim, barely in the middle
        let t = 1 - clamp(dist / rim, 0, 1);
        t = t * t * (3 - 2 * t);
        t = t * t * 0.55 + t * 0.45;
        const i = (y * c.width + x) * 4;
        d[i]     = 128 - nx * 127 * t;   // R → x displacement
        d[i + 1] = 128 - ny * 127 * t;   // G → y displacement
        d[i + 2] = 128;
        d[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return c.toDataURL('image/png');
  }

  // A map depends only on size, radius and rim, so re-entering the viewport, a
  // theme change or a remount reuses it instead of recomputing every pixel and
  // re-encoding a PNG. Least recently used entries are dropped past the cap.
  const mapCache = new Map(), MAP_CACHE_MAX = 48;
  function cachedMap(w, h, radius, rim) {
    const key = [Math.round(w), Math.round(h), radius.toFixed(1), rim.toFixed(1)].join(':');
    let href = mapCache.get(key);
    if (href) mapCache.delete(key);
    else href = buildMap(w, h, radius, rim);
    mapCache.set(key, href);
    if (mapCache.size > MAP_CACHE_MAX) mapCache.delete(mapCache.keys().next().value);
    return href;
  }

  // Three displacement passes at slightly different strengths, recombined one
  // channel each: real glass disperses wavelengths, and that faint colour
  // fringe at the rim is most of what reads as "thick glass" rather than blur.
  function filterMarkup(chroma) {
    if (!chroma) {
      return '<feImage result="map" preserveAspectRatio="none"/>' +
        '<feDisplacementMap in="SourceGraphic" in2="map" xChannelSelector="R" yChannelSelector="G" result="lens"/>' +
        '<feGaussianBlur in="lens" stdDeviation="0" result="blurred"/>' +
        '<feColorMatrix in="blurred" type="saturate" values="1.6"/>';
    }
    return '<feImage result="map" preserveAspectRatio="none"/>' +
      '<feDisplacementMap in="SourceGraphic" in2="map" xChannelSelector="R" yChannelSelector="G" result="dR"/>' +
      '<feDisplacementMap in="SourceGraphic" in2="map" xChannelSelector="R" yChannelSelector="G" result="dG"/>' +
      '<feDisplacementMap in="SourceGraphic" in2="map" xChannelSelector="R" yChannelSelector="G" result="dB"/>' +
      '<feColorMatrix in="dR" type="matrix" result="cR" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"/>' +
      '<feColorMatrix in="dG" type="matrix" result="cG" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"/>' +
      '<feColorMatrix in="dB" type="matrix" result="cB" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"/>' +
      '<feComposite in="cR" in2="cG" operator="arithmetic" k2="1" k3="1" result="cRG"/>' +
      '<feComposite in="cRG" in2="cB" operator="arithmetic" k2="1" k3="1" result="lens"/>' +
      '<feGaussianBlur in="lens" stdDeviation="0" result="blurred"/>' +
      '<feColorMatrix in="blurred" type="saturate" values="1.6"/>';
  }

  // Chrome that is permanently on screen (fixed bars, sticky headers, the tab
  // bar) has its backdrop invalidated by *any* pixel change on the page, so it
  // re-runs its filter every frame of every drag and scroll. Never give those
  // the expensive multi-pass variant.
  function alwaysOnScreen(el) {
    if (el.closest('.as-tabbar, .as-scroll-edge, .as-sheet, .as-menu')) return true;
    const p = getComputedStyle(el).position;
    return p === 'fixed' || p === 'sticky';
  }

  function applyLens(el, opts = {}) {
    if (!attached.has(el)) attach(el, opts);
    if (!supportsLens || liteMode() || reduceTransparency() || moreContrast()) return;
    const rect = el.getBoundingClientRect();
    if (rect.width < 8 || rect.height < 8) return;
    const cs = getComputedStyle(el);
    const radius = parseFloat(cs.borderTopLeftRadius) || 0;
    const large = el.classList.contains('as-glass-large');
    opts = { ...el.__lgOptions, ...opts };
    if (opts.lens === false || el.dataset.lens === 'off') return;
    const rim = opts.rim ?? Math.max(12, Math.min(rect.height * .5, 30));
    const scale = opts.scale ?? (large ? 14 : 30);
    const blur = parseFloat(cs.getPropertyValue('--_blur')) || 14;
    // Dispersion triples the cost of the most expensive stage, so it is
    // OPT-IN (`data-chroma="on"`) and budgeted. Spend it on a couple of hero
    // controls that sit over real imagery — that is where the colour fringe
    // reads at all. The decision is sticky per element so relensing on resize
    // or a theme change cannot silently downgrade it once the budget is spent.
    const chroma = opts.chroma !== undefined ? opts.chroma
      : el.__lgChroma !== undefined ? el.__lgChroma
      : el.dataset.chroma === 'on' && !large && !alwaysOnScreen(el) && chromaBudget > 0;

    const id = el.__lgId || (el.__lgId = 'as-lens-' + (++uid));
    let f = document.getElementById(id);
    if (!f || el.__lgChroma !== chroma) {
      if (f) { if (el.__lgChroma) chromaBudget++; f.remove(); }
      if (chroma) chromaBudget--;
      f = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
      f.id = id;
      f.setAttribute('x', '0'); f.setAttribute('y', '0');
      f.setAttribute('width', '100%'); f.setAttribute('height', '100%');
      f.setAttribute('color-interpolation-filters', 'sRGB');
      f.innerHTML = filterMarkup(chroma);
      ensureSvg().appendChild(f);
      el.__lgChroma = chroma;
    }
    const href = cachedMap(rect.width, rect.height, radius, rim);
    f.querySelectorAll('feImage').forEach(n => {
      n.setAttribute('href', href);
      n.setAttribute('width', rect.width); n.setAttribute('height', rect.height);
    });
    const maps = f.querySelectorAll('feDisplacementMap');
    if (maps.length === 3) {
      maps[0].setAttribute('scale', scale * 1.14);   // R bends most
      maps[1].setAttribute('scale', scale);
      maps[2].setAttribute('scale', scale * 0.86);   // B least
    } else {
      maps[0].setAttribute('scale', scale);
    }
    f.querySelector('feGaussianBlur').setAttribute('stdDeviation', Math.max(0, blur * .5));
    el.style.setProperty('--as-glass-filter', `url(#${id})`);
    el.style.setProperty('--as-glass-lens', '1');
  }

  /* ---------- 2. Illumination, travelling light, gel flex ------------------ */
  function wireInteraction(el) {
    if (el.__lgWired) return; el.__lgWired = true;
    cleanup(el, () => spreadToNeighbors(el, null, false));
    let raf = 0, px = 50, py = 50, angle = null, box = null;

    const paint = () => {
      raf = 0;
      el.style.setProperty('--as-px', px + '%');
      el.style.setProperty('--as-py', py + '%');
      if (angle !== null) el.style.setProperty('--as-glass-light-angle', angle + 'deg');
    };
    const move = e => {
      // rect cached for the duration of the hover: reading it per pointermove
      // forces a layout on every frame
      const r = box || (box = el.getBoundingClientRect());
      px = (e.clientX - r.left) / r.width * 100;
      py = (e.clientY - r.top) / r.height * 100;
      // put the bright pole of the conic rim on the side the pointer is on, so
      // the highlight travels around the silhouette instead of sitting still
      if (!reduceMotion()) {
        const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        angle = Math.round(Math.atan2(dy, dx) * 180 / Math.PI + 90);
      }
      if (!raf) raf = frame(el, paint);
    };
    const enter = e => { box = el.getBoundingClientRect(); el.classList.add('is-lit'); move(e); };
    el.__lgInvalidate = () => { box = null; };
    const leave = () => {
      el.classList.remove('is-lit', 'is-pressed');
      el.style.removeProperty('--as-glass-light-angle');
      angle = null; box = null;
      spreadToNeighbors(el, null, false);
    };
    listen(el, el, 'pointerenter', enter);
    listen(el, el, 'pointermove', move);
    listen(el, el, 'pointerdown', e => { move(e); el.classList.add('is-pressed'); spreadToNeighbors(el, e, true); });
    const up = () => { el.classList.remove('is-pressed'); spreadToNeighbors(el, null, false); };
    listen(el, el, 'pointerup', up);
    listen(el, el, 'pointercancel', up);
    listen(el, el, 'pointerleave', leave);
  }
  // "the glow spreads onto any Liquid Glass elements nearby" — only ever a
  // neighbour that is actually on screen, so this stays a handful of rect
  // reads per press rather than one per glass element on the page
  function spreadToNeighbors(el, e, on) {
    const r = el.getBoundingClientRect();
    onScreen.forEach(o => {
      if (o === el || !o.isConnected) return;
      const q = o.getBoundingClientRect();
      const gap = Math.hypot(
        Math.max(0, Math.max(q.left - r.right, r.left - q.right)),
        Math.max(0, Math.max(q.top - r.bottom, r.top - q.bottom)));
      if (gap < 24) {
        o.style.setProperty('--as-glow', on ? '.28' : '');
        if (e) {
          o.style.setProperty('--as-px', ((e.clientX - q.left) / q.width * 100) + '%');
          o.style.setProperty('--as-py', ((e.clientY - q.top) / q.height * 100) + '%');
        }
      }
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
    // The element and its descendants are filtered out of the stack below, so
    // there is no need to toggle pointer-events (two style writes per sample,
    // each invalidating style before the next layout read).
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
    if (!lums.length) return { scheme: null, overText };
    const avg = lums.reduce((a, b) => a + b, 0) / lums.length;
    return { scheme: avg < .3 ? 'dark' : avg > .5 ? 'light' : null, overText };
  }
  function adapt(el) {
    if (el.hasAttribute('data-glass-scheme-fixed')) return;
    if (el.classList.contains('as-glass-large') || el.classList.contains('as-glass-clear')) return;
    const { scheme, overText } = sampleBehind(el);
    if (scheme) el.dataset.glassScheme = scheme; else if (!el.hasAttribute('data-glass-scheme-fixed')) el.removeAttribute('data-glass-scheme');
    if (overText) el.dataset.glassOver = 'text'; else el.removeAttribute('data-glass-over');
  }

  /* ---------- 4. Morphing / materialize ------------------------------------ */
  function morph(from, to, o = {}) {
    const dur = reduceMotion() ? 1 : (o.duration ?? 460);
    const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
    const ra = getComputedStyle(from).borderRadius, rb = getComputedStyle(to).borderRadius;
    const ghost = from.cloneNode(false);
    ghost.removeAttribute('id'); ghost.setAttribute('aria-hidden', 'true'); ghost.inert = true;
    ghost.className = from.className.replace(/\bas-glass-interactive\b/, '');
    ghost.style.cssText = `position:fixed;left:${a.left}px;top:${a.top}px;width:${a.width}px;height:${a.height}px;margin:0;z-index:9999;pointer-events:none;border-radius:${ra};transition:none`;
    document.body.appendChild(ghost);
    const fromVisibility = from.style.visibility, toVisibility = to.style.visibility;
    to.style.visibility = 'hidden'; from.style.visibility = 'hidden';
    const st = state(from);
    const anim = animate(from, ghost, [
      { left: a.left + 'px', top: a.top + 'px', width: a.width + 'px', height: a.height + 'px', borderRadius: ra },
      { left: b.left + 'px', top: b.top + 'px', width: b.width + 'px', height: b.height + 'px', borderRadius: rb }
    ], { duration: dur, easing: 'cubic-bezier(.32,1.25,.4,1)', fill: 'forwards' });
    let cancelled = false;
    const restore = () => { cancelled = true; anim.cancel(); ghost.remove(); to.style.visibility = toVisibility; from.style.visibility = fromVisibility; };
    const offFrom = cleanup(from, restore), offTo = cleanup(to, restore);
    return anim.finished.then(() => {
      if (cancelled || resources.get(from) !== st) return;
      ghost.remove(); to.style.visibility = toVisibility;
      if (o.keepSource !== false) from.style.visibility = fromVisibility;
      anim.cancel();
      if (o.lens !== false) applyLens(to);
    }, restore).finally(() => { offFrom(); offTo(); });
  }
  function materialize(el, show, o = {}) {
    const st = state(el);
    if (el.__lgAnimation) el.__lgAnimation.cancel();
    const dur = reduceMotion() ? 1 : (o.duration ?? 380);
    // The brief blur reads as lensing settling in. Its cost grows with area, so
    // large glass (menus, sheets, sidebars) and lite mode use scale + opacity.
    const blur = !liteMode() && !el.classList.contains('as-glass-large');
    const hidden = blur ? 'blur(6px) saturate(.6)' : 'none';
    const kf = show ? [{ opacity: 0, transform: 'scale(.86)', filter: hidden }, { opacity: 1, transform: 'none', filter: 'none' }]
                    : [{ opacity: 1, transform: 'none', filter: 'none' }, { opacity: 0, transform: 'scale(.92)', filter: hidden }];
    if (show) el.hidden = false;
    const anim = el.__lgAnimation = animate(el, el, kf, { duration: dur, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'forwards' });
    return anim.finished.then(() => {
      if (resources.get(el) === st && el.__lgAnimation === anim) { el.hidden = !show; delete el.__lgAnimation; }
      anim.cancel();
    }, () => {});
  }

  /* ---------- 5. Scrubbable controls ---------------------------------------
   * On Apple platforms these are all drag targets, not just tap targets:
   * UISegmentedControl lets you grab the selected segment and slide it,
   * UISwitch lets you throw the knob, UISlider tracks the thumb. Motion stays
   * in sync with the gesture (HIG Motion) and the moving part stretches with
   * the drag, which is the gel flex of Liquid Glass applied to a control.    */

  // shared: turn drag velocity into a horizontal stretch factor
  function stretchFor(velocity, cap = 0.22) {
    if (reduceMotion()) return 1;
    return 1 + clamp(Math.abs(velocity) / 900, 0, cap);
  }
  const fire = el => el.dispatchEvent(new Event('change', { bubbles: true }));

  function segmented(el) {
    if (el.__lgSeg) return;
    const segs = () => Array.from(el.querySelectorAll('.as-segment'));
    if (!segs().length) return;
    el.__lgSeg = true;

    const ind = document.createElement('span');
    ind.className = 'as-seg-indicator';
    ind.setAttribute('aria-hidden', 'true');
    el.insertBefore(ind, el.firstChild);
    el.dataset.indicator = '';

    cleanup(el, () => { ind.remove(); delete el.dataset.indicator; });
    const tabs = el.getAttribute('role') === 'tablist';
    el.setAttribute('role', tabs ? 'tablist' : 'radiogroup');
    let idx = segs().findIndex(s => !disabled(s) && s.classList.contains('is-selected'));
    if (idx < 0) idx = segs().findIndex(s => !disabled(s));
    const rove = active => segs().forEach(s => { s.tabIndex = !disabled(el) && !disabled(s) && s === active ? 0 : -1; });

    function select(i, { silent = false, restore = false } = {}) {
      const list = segs();
      if (!restore && (i < 0 || disabled(list[i]) || disabled(el))) return false;
      const changed = i !== idx;
      idx = i;
      list.forEach((s, n) => {
        s.classList.toggle('is-selected', n === i);
        s.setAttribute('role', tabs ? 'tab' : 'radio');
        s.setAttribute(tabs ? 'aria-selected' : 'aria-checked', String(n === i));
        s.removeAttribute(tabs ? 'aria-checked' : 'aria-selected');
        if (tabs) {
          const panel = document.getElementById(s.getAttribute('aria-controls'));
          if (panel) {
            if (!s.id) s.id = 'as-tab-' + (++uid);
            panel.setAttribute('role', 'tabpanel'); panel.setAttribute('aria-labelledby', s.id);
            panel.hidden = n !== i;
          }
        }
      });
      rove(list[i]);
      if (changed && !silent) fire(el);
      return changed;
    }
    // Geometry is measured once per gesture (and on resize), never per frame:
    // reading a rect inside pointermove forces a synchronous layout, and doing
    // it for every segment on every move is what makes a drag feel gluey.
    function measure() {
      const c = el.getBoundingClientRect();
      return segs().map(s => {
        const r = s.getBoundingClientRect();
        return { x: r.left - c.left, w: r.width, center: r.left - c.left + r.width / 2 };
      });
    }
    function place(i, cache) {
      const g = (cache || measure())[i];
      if (!g) return;
      ind.style.width = g.w + 'px';
      ind.style.setProperty('--as-ind-x', g.x + 'px');
    }
    function nearest(cache, centerX) {
      let best = 0, bestD = Infinity;
      for (let i = 0; i < cache.length; i++) {
        const d = Math.abs(cache[i].center - centerX);
        if (!disabled(segs()[i]) && d < bestD) { bestD = d; best = i; }
      }
      return best;
    }

    select(idx, { silent: true, restore: true });
    place(idx);
    observe(el, ResizeObserver, () => { if (!el.classList.contains('is-scrubbing')) place(idx); }).observe(el);
    observe(el, MutationObserver, () => {
      const list = segs();
      let next = list.findIndex(s => s.classList.contains('is-selected') && !disabled(s));
      if (next < 0) next = list.findIndex(s => !disabled(s));
      select(next, { silent: true, restore: true }); place(idx);
    }).observe(el, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled', 'aria-disabled'] });


    let drag = null, raf = 0, pending = null, suppressClick = false;
    // one style write per frame, and never a read
    function flush() {
      raf = 0;
      if (!pending) return;
      const { x, sx, i } = pending; pending = null;
      ind.style.setProperty('--as-ind-x', x + 'px');
      ind.style.setProperty('--as-ind-sx', sx);
      if (i !== idx) select(i, { silent: true });
    }

    listen(el, el, 'pointerdown', e => {
      const seg = e.target.closest('.as-segment');
      if (!seg || disabled(seg) || disabled(el) || e.button !== 0 || drag) return;
      suppressClick = false;
      const cache = measure();
      const hit = segs().indexOf(seg);
      const onSelected = hit === idx;
      drag = {
        capture: seg, id: e.pointerId, startX: e.clientX, lastX: e.clientX, lastT: e.timeStamp,
        v: 0, moved: false, cache, from: cache[idx], scrub: onSelected, hit, startIdx: idx
      };
      try { seg.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
      // pressing the selected segment grabs the knob; pressing another one
      // arms a tap that commits on release (matching UISegmentedControl)
      if (onSelected) { el.classList.add('is-scrubbing'); ind.style.setProperty('--as-ind-sx', String(stretchFor(0, .06))); }
    });

    listen(el, el, 'pointermove', e => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.startX;
      if (!drag.moved && Math.abs(dx) > 3) {
        drag.moved = true;
        if (!drag.scrub) { drag.scrub = true; drag.from = drag.cache[idx]; el.classList.add('is-scrubbing'); }
      }
      if (!drag.scrub) return;
      const dt = Math.max(1, e.timeStamp - drag.lastT);
      drag.v = (e.clientX - drag.lastX) / dt * 1000;
      drag.lastX = e.clientX; drag.lastT = e.timeStamp;

      const cache = drag.cache;
      const minX = cache[0].x, maxX = cache[cache.length - 1].x;
      // rubber-band past the ends instead of hard-stopping
      let x = drag.from.x + dx;
      if (x < minX) x = minX - Math.pow(minX - x, .55);
      if (x > maxX) x = maxX + Math.pow(x - maxX, .55);
      // selection updates live so the labels track the knob
      pending = { x, sx: String(stretchFor(drag.v)), i: nearest(cache, x + drag.from.w / 2) };
      if (!raf) raf = frame(el, flush);
    });

    const end = e => {
      if (!drag || e.pointerId !== drag.id) return;
      const { moved, startIdx, cache, id, capture } = drag;
      const cancelled = e.type !== 'pointerup' || disabled(el);
      drag = null;
      if (raf) { cancelFrame(el, raf); raf = 0; }
      if (pending && !cancelled && moved) select(pending.i, { silent: true });
      pending = null;
      el.classList.remove('is-scrubbing'); ind.style.setProperty('--as-ind-sx', '1');
      if (cancelled) select(startIdx, { silent: true, restore: true });
      suppressClick = moved || cancelled;
      place(idx, cache);
      if (moved && !cancelled) { segs()[idx]?.focus(); if (idx !== startIdx) fire(el); }
      if (capture.hasPointerCapture(id)) capture.releasePointerCapture(id);
    };
    listen(el, el, 'pointerup', end);
    listen(el, el, 'pointercancel', end);
    listen(el, el, 'lostpointercapture', end);
    listen(el, el, 'click', e => {
      if (suppressClick && e.detail !== 0) { suppressClick = false; e.preventDefault(); return; }
      suppressClick = false;
      const seg = e.target.closest('.as-segment');
      if (!seg || disabled(seg) || disabled(el)) return;
      select(segs().indexOf(seg)); place(idx); seg.focus();
    });
    listen(el, el, 'keydown', e => {
      const list = segs().filter(s => !disabled(s));
      if (!list.length || disabled(el)) return;
      let current = list.indexOf(e.target), next = current;
      if (current < 0) return;
      const vertical = el.getAttribute('aria-orientation') === 'vertical';
      const rtl = getComputedStyle(el).direction === 'rtl';
      const forward = vertical ? 'ArrowDown' : rtl ? 'ArrowLeft' : 'ArrowRight';
      const backward = vertical ? 'ArrowUp' : rtl ? 'ArrowRight' : 'ArrowLeft';
      if (e.key === forward || (!tabs && e.key === 'ArrowDown')) next = (current + 1) % list.length;
      else if (e.key === backward || (!tabs && e.key === 'ArrowUp')) next = (current + list.length - 1) % list.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = list.length - 1;
      else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!e.repeat) { select(segs().indexOf(list[current])); place(idx); } return; }
      else return;
      e.preventDefault();
      // Manual tabs and toolbar radio groups move focus without changing value.
      if (!(tabs && el.dataset.activation === 'manual') && !( !tabs && el.closest('[role="toolbar"]'))) {
        select(segs().indexOf(list[next])); place(idx);
      }
      rove(list[next]); list[next].focus();
    });
  }

  function toggle(el) {
    if (el.__lgToggle) return;
    const knob = el.querySelector('.as-knob');
    if (!knob) return;
    el.__lgToggle = true;
    // Resting knob is a circle inset 2px on each side, so it is clientHeight−4
    // wide and its travel is clientWidth−clientHeight. While held it widens,
    // and the reachable travel shrinks by exactly that growth — otherwise the
    // stretched knob would push past the end of the capsule.
    function metrics() {
      const rest = el.clientHeight - 4;
      const grow = Math.max(0, knob.offsetWidth - rest);
      return { max: Math.max(0, el.clientWidth - el.clientHeight - grow) };
    }
    let drag = null, suppressClick = false;
    el.setAttribute('role', 'switch');
    if (!el.hasAttribute('aria-checked')) el.setAttribute('aria-checked', 'false');
    if (el.tagName !== 'BUTTON' && !el.hasAttribute('tabindex')) el.tabIndex = 0;
    const commit = on => {
      const wasOn = el.getAttribute('aria-checked') === 'true';
      el.setAttribute('aria-checked', String(on)); if (wasOn !== on) fire(el);
    };
    listen(el, el, 'click', e => {
      if (disabled(el)) return;
      if (suppressClick && e.detail !== 0) { suppressClick = false; e.preventDefault(); return; }
      suppressClick = false; commit(el.getAttribute('aria-checked') !== 'true');
    });
    listen(el, el, 'pointerdown', e => {
      if (disabled(el) || e.button !== 0 || drag) return;
      suppressClick = false;
      try { el.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
      const { max } = metrics();
      // Travel is measured from the inline start, so a mirrored (RTL) switch
      // turns on by moving its knob toward the left.
      const dir = getComputedStyle(el).direction === 'rtl' ? -1 : 1;
      const from = el.getAttribute('aria-checked') === 'true' ? max : 0;
      drag = { id: e.pointerId, startX: e.clientX, moved: false, max, dir, from, pos: from };
    });
    listen(el, el, 'pointermove', e => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.startX;
      if (Math.abs(dx) > 3) { drag.moved = true; el.classList.add('is-scrubbing'); }
      if (!drag.moved) return;
      drag.pos = clamp(drag.from + dx * drag.dir, 0, drag.max);
      el.style.setProperty('--as-knob-x', drag.pos * drag.dir + 'px');
    });
    const end = e => {
      if (!drag || e.pointerId !== drag.id) return;
      const { moved, max, id, pos } = drag;
      const cancelled = e.type !== 'pointerup' || disabled(el);
      drag = null; suppressClick = moved || cancelled;
      el.classList.remove('is-scrubbing'); el.style.removeProperty('--as-knob-x');
      if (moved && !cancelled) commit(pos > max / 2);
      if (el.hasPointerCapture(id)) el.releasePointerCapture(id);
    };
    listen(el, el, 'pointerup', end); listen(el, el, 'pointercancel', end); listen(el, el, 'lostpointercapture', end);
    // Native buttons generate click for Enter/Space; custom switch hosts need it.
    listen(el, el, 'keydown', e => {
      if (disabled(el) || el.tagName === 'BUTTON' || ![' ', 'Enter'].includes(e.key)) return;
      e.preventDefault(); if (!e.repeat) el.click();
    });
  }

  function slider(input) {
    if (input.__lgSlider) return;
    // Overlay a real glass knob as a *sibling* rather than wrapping the input:
    // a wrapper would replace the input as the grid/flex item and, having no
    // intrinsic width of its own, would collapse the track it sits in.
    const host = input.parentElement;
    if (!host) return;
    input.__lgSlider = true;
    if (!host.__lgSliderHost) host.__lgSliderHost = { count: 0, original: host.style.position, changed: getComputedStyle(host).position === 'static' };
    const hostState = host.__lgSliderHost; hostState.count++;
    if (hostState.changed) host.style.position = 'relative';
    cleanup(input, () => {
      if (--hostState.count === 0) {
        if (hostState.changed && host.style.position === 'relative') host.style.position = hostState.original;
        delete host.__lgSliderHost;
      }
    });
    const knob = document.createElement('span');
    knob.className = 'as-slider-knob';
    knob.setAttribute('aria-hidden', 'true');
    host.appendChild(knob);
    input.classList.add('is-upgraded');
    cleanup(input, () => { knob.remove(); input.classList.remove('is-upgraded'); });

    let lastV = null, lastT = 0, geom = null, raf = 0, pendingF = null;
    function frac() {
      const min = +input.min || 0, max = input.max === '' ? 100 : +input.max;
      return max === min ? 0 : (+input.value - min) / (max - min);
    }
    // measured on layout changes only — not on every input event
    function remeasure() {
      // A range input runs right to left in RTL, so the drawn knob mirrors the value.
      geom = { w: input.clientWidth, kw: knob.offsetWidth || 28, l: input.offsetLeft, y: input.offsetTop + input.offsetHeight / 2,
        rtl: getComputedStyle(input).direction === 'rtl' };
      knob.style.setProperty('--as-knob-l', geom.l + 'px');
      knob.style.setProperty('--as-knob-y', geom.y + 'px');
    }
    function paint() {
      raf = 0;
      const f = pendingF; pendingF = null;
      if (f === null || !geom) return;
      input.style.setProperty('--as-value', (f * 100) + '%');
      knob.style.setProperty('--as-knob-x', (geom.kw / 2 + (geom.rtl ? 1 - f : f) * (geom.w - geom.kw)) + 'px');
      const now = performance.now();
      if (lastV !== null && now > lastT) {
        knob.style.setProperty('--as-knob-sx', String(stretchFor((f - lastV) * geom.w / (now - lastT) * 1000, .35)));
      }
      lastV = f; lastT = now;
    }
    function place(track) {
      if (!geom) remeasure();
      pendingF = frac();
      if (!track) { lastV = null; paint(); return; }        // immediate, no stretch
      if (!raf) raf = frame(input, paint);          // one write per frame
    }
    place(false);
    frame(input, () => { remeasure(); place(false); });   // after first layout
    listen(input, input, 'input', () => place(true));
    observe(input, ResizeObserver, () => { remeasure(); place(false); }).observe(input);

    const stop = () => { knob.classList.remove('is-scrubbing'); knob.style.setProperty('--as-knob-sx', '1'); };
    listen(input, input, 'pointerdown', () => { remeasure(); knob.classList.add('is-scrubbing'); lastV = null; });
    listen(input, window, 'pointerup', stop);
    listen(input, window, 'pointercancel', stop);
    listen(input, input, 'focus', () => knob.classList.add('is-focused'));
    listen(input, input, 'blur', () => { knob.classList.remove('is-focused'); stop(); });
    // keyboard changes should lift the knob briefly too
    listen(input, input, 'keydown', () => { knob.classList.add('is-scrubbing'); cancelTimer(input, knob.__t); knob.__t = timer(input, stop, 400); });
  }

  /* ---------- 5b. Selectable list and toast -------------------------------
   * listbox(): single-select listbox (APG). One tab stop — the selected option
   * — and arrows move the selection with focus (data-activation="manual":
   * focus only, Space/Enter selects). Home/End, type-ahead, disabled options
   * skipped. aria-selected is the state: the page renders rows and sets it,
   * the runtime keeps roles and the tab stop in step and keeps keyboard focus
   * in the list when the focused row is re-rendered.                         */
  function listbox(el) {
    if (el.__lgListbox) return;
    el.__lgListbox = true;
    el.setAttribute('role', 'listbox');
    const options = () => [...el.querySelectorAll('[role="option"], .as-option')].filter(o => o.closest('[role="listbox"], .as-listbox') === el);
    const optionOf = node => options().find(o => o === node || o.contains(node));
    const selected = list => list.find(o => o.getAttribute('aria-selected') === 'true') || null;
    let focused = null, typed = '', typedAt = 0;

    function sync(target, stop) {
      const list = options();
      list.forEach(o => {
        if (o.getAttribute('role') !== 'option') o.setAttribute('role', 'option');
        const on = String(o === target);
        if (o.getAttribute('aria-selected') !== on) o.setAttribute('aria-selected', on);
      });
      stop = list.includes(stop) ? stop : target || list.find(o => !disabled(o));
      list.forEach(o => { o.tabIndex = o === stop && !disabled(el) ? 0 : -1; });
      return stop;
    }
    function select(o) {
      if (!o || disabled(o) || disabled(el)) return;
      const changed = o !== selected(options());
      sync(o, o);
      if (changed) fire(el);
    }

    sync(selected(options()), null);
    listen(el, el, 'focusin', e => { focused = optionOf(e.target) || null; });
    // Chrome also blurs a focused row that is being removed, so decide once the
    // removal is done: a row still in the document lost focus on purpose.
    listen(el, el, 'focusout', e => {
      if (!el.contains(e.relatedTarget)) queueMicrotask(() => { if (focused === e.target && e.target.isConnected) focused = null; });
    });
    observe(el, MutationObserver, records => {
      const list = options();
      // The page selects from code by setting aria-selected="true"; the newest wins.
      const set = records.filter(r => r.attributeName === 'aria-selected' && r.target.getAttribute('aria-selected') === 'true' && list.includes(r.target)).pop()?.target;
      const active = list.includes(document.activeElement) ? document.activeElement : null;
      const stop = sync(set || selected(list), active);
      if (focused && !focused.isConnected && stop && (!document.activeElement || document.activeElement === document.body)) stop.focus();
    }).observe(el, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-selected', 'aria-disabled', 'disabled'] });

    listen(el, el, 'click', e => {
      const o = optionOf(e.target);
      if (!o || disabled(o) || disabled(el)) return;
      select(o); o.focus();
    });
    listen(el, el, 'keydown', e => {
      if (disabled(el) || e.altKey || e.ctrlKey || e.metaKey) return;
      const list = options().filter(o => !disabled(o)), from = optionOf(e.target);
      if (!list.length) return;
      const at = list.indexOf(from);
      const horizontal = el.getAttribute('aria-orientation') === 'horizontal';
      const rtl = horizontal && getComputedStyle(el).direction === 'rtl';
      const next = horizontal ? (rtl ? 'ArrowLeft' : 'ArrowRight') : 'ArrowDown';
      const prev = horizontal ? (rtl ? 'ArrowRight' : 'ArrowLeft') : 'ArrowUp';
      let to;
      if (e.key === next) to = list[Math.min(list.length - 1, at + 1)];
      else if (e.key === prev) to = list[Math.max(0, at - 1)];
      else if (e.key === 'Home') to = list[0];
      else if (e.key === 'End') to = list[list.length - 1];
      else if (e.key === ' ' || e.key === 'Enter') {
        if (e.key === ' ') e.preventDefault();
        if (from && !e.repeat) select(from);
        return;
      } else if (e.key.length === 1 && e.key.trim()) {
        // Type-ahead: characters typed within half a second build a prefix;
        // the same letter repeated cycles through the items that start with it,
        // and a prefix that matches nothing starts over from the new letter.
        const now = performance.now(), key = e.key.toLocaleLowerCase();
        const name = o => (o.getAttribute('aria-label') || o.textContent).trim().toLocaleLowerCase();
        const find = text => {
          const query = /^(.)\1+$/u.test(text) ? text[0] : text;
          const start = query.length === 1 ? at + 1 : Math.max(at, 0);
          return [...list.slice(start), ...list.slice(0, start)].find(o => name(o).startsWith(query));
        };
        typed = (now - typedAt > 500 ? '' : typed) + key; typedAt = now;
        to = find(typed);
        if (!to && typed.length > 1) to = find(typed = key);
        if (!to) return;
      } else return;
      e.preventDefault();
      if (el.dataset.activation === 'manual') sync(selected(options()), to);
      else select(to);
      to.focus();
    });
  }

  // toast(): one message at a time, announced through role="status". It goes
  // into the open modal dialog when there is one — the rest of the page is
  // inert then, and an inert live region is not announced. Returns hide().
  function toast(message, { duration = 2600 } = {}) {
    let host = document.body;
    try { const open = document.querySelectorAll('dialog:modal'); if (open.length) host = open[open.length - 1]; } catch { /* no :modal */ }
    let el = [...host.children].find(c => c.classList.contains('as-toast')), created = false;
    if (!el) { el = document.createElement('div'); el.className = 'as-toast'; host.appendChild(el); created = true; }
    el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite'); el.setAttribute('aria-atomic', 'true');
    if (!el.__lgToast) {
      el.__lgToast = true;
      cleanup(el, () => { el.classList.remove('is-on'); if (created) el.remove(); else el.textContent = ''; });
    }
    const st = state(el), seq = el.__lgToastSeq = (el.__lgToastSeq || 0) + 1;
    st.timers.forEach(clearTimeout); st.timers.clear();
    // hide() of an earlier message must not hide the one that replaced it
    const hide = () => {
      if (resources.get(el) !== st || el.__lgToastSeq !== seq) return;
      el.classList.remove('is-on');
      timer(el, () => { el.textContent = ''; }, 400);
    };
    const show = () => {
      // The same words twice still change the region (a zero-width space), so
      // a repeated message is announced again.
      el.textContent = el.textContent === message ? message + '​' : message;
      el.classList.add('is-on');
      if (duration > 0 && duration !== Infinity) timer(el, hide, duration);
    };
    // A region inserted just now has to reach the accessibility tree before
    // its content changes, or the first message is lost.
    if (created) timer(el, show, 100); else show();
    return hide;
  }

  function controls(root = document) {
    let n = 0;
    members(root, '.as-segmented').forEach(el => { segmented(el); n++; });
    members(root, '.as-toggle').forEach(el => { toggle(el); n++; });
    members(root, '.as-slider').forEach(el => { slider(el); n++; });
    members(root, '.as-listbox').forEach(el => { listbox(el); n++; });
    return n;
  }

  /* ---------- 6. Structure helpers ----------------------------------------- */
  function tabBarMinimize(bar, opts = {}) {
    if (bar.__lgMinimize) return; bar.__lgMinimize = true;
    const scroller = opts.scroller || window; let last = scroller === window ? scrollY : scroller.scrollTop, acc = 0;
    const onScroll = () => { const y = scroller === window ? scrollY : scroller.scrollTop; const dy = y - last; last = y; acc = Math.sign(dy) === Math.sign(acc) ? acc + dy : dy;
      if (acc > 24 && y > 40) bar.classList.add('is-minimized'); else if (acc < -24 || y <= 40) bar.classList.remove('is-minimized'); };
    listen(bar, scroller, 'scroll', onScroll, { passive: true });
  }
  // Navigation bar title behaviour (HIG): the large title owns the top of the
  // view, and the compact toolbar title only appears once that large title has
  // scrolled out — showing both at rest prints the same words twice.
  // Opt in per title: <div class="as-toolbar-title" data-reveal-on-scroll>.
  // The optional attribute value is a selector for the large title(s);
  // multiple titles (one per view/tab) are supported — hidden ones report as
  // not intersecting, so the visible view is the one that decides.
  function titleOnScroll(title, opts = {}) {
    if (title.__lgTitle) return; title.__lgTitle = true;
    const sel = opts.selector || title.dataset.revealOnScroll || '.as-large-title';
    const scope = opts.root || title.getRootNode();
    const seen = new Map();
    const update = () => {
      let largeVisible = false;
      seen.forEach((inter, el) => { if (inter && el.isConnected) largeVisible = true; });
      title.classList.toggle('is-visible', !largeVisible);
    };
    const io = observe(title, IntersectionObserver, es => { es.forEach(e => seen.set(e.target, e.isIntersecting)); update(); });
    const sync = () => {
      scope.querySelectorAll(sel).forEach(t => { if (!seen.has(t)) { seen.set(t, false); io.observe(t); } });
      seen.forEach((_, el) => { if (!scope.contains(el)) { io.unobserve(el); seen.delete(el); }; });
      update();
    };
    sync();
    // views that swap with [hidden], and lists that re-render, both need a
    // resync — coalesced into one frame so a re-render storm costs one pass
    let queued = 0;
    const resync = () => { if (queued) return; queued = frame(title, () => { queued = 0; sync(); }); };
    observe(title, MutationObserver, resync).observe(opts.root || document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
  }
  // Concentric: child radius = container radius − child's inset from container edge
  function concentric(container, min = 0) {
    const cs = getComputedStyle(container); const R = parseFloat(cs.borderTopLeftRadius) || 0; const cr = container.getBoundingClientRect();
    container.querySelectorAll('.as-concentric').forEach(ch => { const r = ch.getBoundingClientRect(); const inset = Math.max(0, Math.min(r.left - cr.left, r.top - cr.top, cr.right - r.right, cr.bottom - r.bottom)); ch.style.borderRadius = Math.max(min, R - inset) + 'px'; });
  }

  // Split divider (desktop window). "Prefer the thin divider style… one point
  // in width" (hig/split-views.md), which makes it a 1px line — so it has to
  // be a real control rather than a decoration: focusable, arrow-key operable,
  // and reporting the width that is actually drawn. It resizes the pane on one
  // side by writing a custom property on the .as-split, and it never lets the
  // detail column fall below --as-content-min (the width at which a list row
  // with a number in it starts wrapping).
  function splitDivider(el, opts = {}) {
    if (el.__lgDivider) return; el.__lgDivider = true;
    const split = el.parentElement;
    if (!split) return;
    const prev = el.previousElementSibling, next = el.nextElementSibling;
    const isContent = n => !!n && n.classList.contains('as-content');
    // by default the divider drives the pane on its side that is not the
    // detail column; data-resize="before|after" overrides
    const side = opts.resize || el.dataset.resize || (prev && !isContent(prev) ? 'before' : 'after');
    const pane = side === 'before' ? prev : next;
    if (!pane) return;
    const cssVar = opts.var || el.dataset.var
      || (pane.classList.contains('as-inspector') ? '--as-inspector-w'
        : pane.classList.contains('as-list-column') ? '--as-list-column-w' : '--as-sidebar-w');
    const min = +(opts.min ?? el.dataset.min ?? 180);
    const hardMax = +(opts.max ?? el.dataset.max ?? 560);
    const initial = Math.round(pane.getBoundingClientRect().width);

    const num = (v, f) => { const n = parseFloat(v); return Number.isFinite(n) ? n : f; };
    const contentMin = () => num(getComputedStyle(split).getPropertyValue('--as-content-min'), 380);
    // How wide this pane may get before the detail column hits its floor.
    // Computed from the split's own width rather than from the content
    // column's current width: a pane that was dragged wide in a big window
    // has to give the space back when the window shrinks, and "current
    // content width minus the floor" is already 0 by then.
    const capacity = () => {
      let others = 0;
      for (const n of split.children) {
        if (n === pane || n.hidden || isContent(n)) continue;
        others += n.getBoundingClientRect().width;
      }
      const room = split.getBoundingClientRect().width - others - contentMin();
      return Math.max(min, Math.min(hardMax, Math.round(room)));
    };

    el.setAttribute('role', 'separator');
    if (!el.hasAttribute('aria-orientation')) el.setAttribute('aria-orientation', 'vertical');
    if (!el.hasAttribute('tabindex')) el.tabIndex = 0;
    if (!el.hasAttribute('aria-label') && !el.hasAttribute('aria-labelledby')) {
      el.setAttribute('aria-label', (pane.getAttribute('aria-label') || 'Pane') + ' width');
    }
    el.setAttribute('aria-valuemin', String(min));

    let syncing = 0;
    // aria-valuenow has to be the width the browser actually drew, not the
    // width we asked for: the flex line, the content floor or a max can all
    // clamp it, and a value that disagrees with the layout is worse than none.
    function publish() {
      if (syncing) return;
      syncing = frame(el, () => {
        syncing = 0;
        const real = Math.round(pane.getBoundingClientRect().width);
        el.setAttribute('aria-valuenow', String(real));
        el.setAttribute('aria-valuetext', real + ' pixels');
        el.setAttribute('aria-valuemax', String(Math.max(real, capacity())));
      });
    }
    function setWidth(px, cap) {
      split.style.setProperty(cssVar, clamp(Math.round(px), min, cap ?? capacity()) + 'px');
      publish();
    }
    // Resizing the window — or any other change that eats the detail column's
    // room — can invalidate a width the user dragged. Give the space back
    // instead of overflowing the window. Clamping settles in one extra pass:
    // the write shrinks the pane, the pane is then within capacity, and the
    // next callback only publishes.
    publish();
    const reclamp = () => {
      // Only a width someone actually dragged gives space back. A pane still
      // at the stylesheet's default for its tier is left alone, or two
      // dividers reclamping against each other would squeeze an untouched
      // sidebar down to its minimum to pay for a wide inspector.
      if (!split.style.getPropertyValue(cssVar)) return publish();
      const cap = capacity();
      if (pane.getBoundingClientRect().width > cap + .5) setWidth(cap, cap);
      else publish();
    };
    const pro = observe(el, ResizeObserver, reclamp);
    pro.observe(split);
    pro.observe(pane);
    cleanup(el, () => { if (el.classList.contains('is-dragging')) document.documentElement.style.cursor = ''; });

    // Measure once at gesture start; pointermove only does arithmetic.
    let startX = 0, startW = 0, cap = 0, dir = 1;
    listen(el, el, 'pointerdown', e => {
      if (e.button !== 0) return;
      e.preventDefault();
      const rtl = getComputedStyle(split).direction === 'rtl';
      // dragging away from the pane makes it wider; which screen direction
      // that is depends on the side the pane is on and on the writing mode
      dir = (side === 'before' ? 1 : -1) * (rtl ? -1 : 1);
      startX = e.clientX; startW = pane.getBoundingClientRect().width; cap = capacity();
      el.setPointerCapture(e.pointerId);
      el.classList.add('is-dragging');
      document.documentElement.style.cursor = 'col-resize';
    });
    listen(el, el, 'pointermove', e => {
      if (!el.classList.contains('is-dragging')) return;
      setWidth(startW + (e.clientX - startX) * dir, cap);
    });
    const endDrag = () => {
      if (!el.classList.contains('is-dragging')) return;
      el.classList.remove('is-dragging');
      document.documentElement.style.cursor = '';
      publish();
    };
    listen(el, el, 'pointerup', endDrag);
    listen(el, el, 'pointercancel', endDrag);
    // double-click resets to the stylesheet's default for this tier
    listen(el, el, 'dblclick', () => { split.style.removeProperty(cssVar); publish(); });

    listen(el, el, 'keydown', e => {
      const rtl = getComputedStyle(split).direction === 'rtl';
      const grow = (side === 'before') === !rtl ? 'ArrowRight' : 'ArrowLeft';
      const shrink = grow === 'ArrowRight' ? 'ArrowLeft' : 'ArrowRight';
      const step = e.shiftKey ? 1 : 16;
      const w = pane.getBoundingClientRect().width;
      if (e.key === grow) setWidth(w + step);
      else if (e.key === shrink) setWidth(w - step);
      else if (e.key === 'Home') setWidth(min);
      else if (e.key === 'End') setWidth(capacity());
      else if (e.key === 'Enter') { split.style.removeProperty(cssVar); publish(); }
      else return;
      e.preventDefault();
    });
    return { setWidth, publish };
  }

  // Menu-bar keyboard shortcuts. A menu item that prints ⌘S and does nothing
  // when you press ⌘S is a broken promise, and on the web nothing wires it up
  // for you. Opt in with `data-shortcuts` on the .as-menubar so a page that
  // merely *displays* ⌘C next to a Copy item doesn't hijack the real one.
  const MODS = { '⌘': 'meta', '⌃': 'ctrl', '⌥': 'alt', '⇧': 'shift' };
  // Glyphs Apple prints for non-character keys. These arrive in `e.key` as
  // names and are not disturbed by modifiers, so they match on `key`.
  const NAMED = {
    '⏎': 'Enter', '↩': 'Enter', '⌤': 'Enter', '⌫': 'Backspace', '⌦': 'Delete',
    '⎋': 'Escape', '⇥': 'Tab', '␣': ' ', '⇞': 'PageUp', '⇟': 'PageDown',
    '↖': 'Home', '↘': 'End', '↑': 'ArrowUp', '↓': 'ArrowDown',
    '←': 'ArrowLeft', '→': 'ArrowRight',
  };
  // Physical positions for the printable keys. Matching a letter on `e.key` is
  // the bug this table exists to avoid: with Option held, macOS composes the
  // character, so ⌥S arrives as key "ß" and ⌥I as a dead key — the shortcut
  // silently never fires on the one platform it was written for. `e.code` is
  // the physical key and is unaffected, which is also how macOS itself routes
  // ⌘, and friends.
  const PUNCT_CODE = {
    ',': 'Comma', '.': 'Period', '/': 'Slash', ';': 'Semicolon', "'": 'Quote',
    '[': 'BracketLeft', ']': 'BracketRight', '\\': 'Backslash', '`': 'Backquote',
    '-': 'Minus', '=': 'Equal',
  };
  function parseShortcut(text) {
    const s = (text || '').trim(); if (!s) return null;
    const need = { meta: false, ctrl: false, alt: false, shift: false };
    let i = 0;
    while (i < s.length && MODS[s[i]]) { need[MODS[s[i]]] = true; i++; }
    const rest = s.slice(i);
    if (!rest || (!need.meta && !need.ctrl && !need.alt)) return null;   // bare letters are typing
    if (NAMED[rest]) return { ...need, key: NAMED[rest].toLowerCase() };
    if (/^[a-z]$/i.test(rest)) return { ...need, code: 'Key' + rest.toUpperCase() };
    if (/^[0-9]$/.test(rest)) return { ...need, code: 'Digit' + rest };
    if (PUNCT_CODE[rest]) return { ...need, code: PUNCT_CODE[rest] };
    return { ...need, key: rest.toLowerCase() };   // multi-char names like "Enter"
  }
  // ⌘ means Command on Apple platforms and Ctrl elsewhere, the mapping apps
  // use when they ship on both. The Windows key never stands in for Ctrl, and
  // on a Mac Ctrl never stands in for Command.
  const applePlatform = (() => {
    try { return /mac|iphone|ipad|ipod/i.test(navigator.userAgentData?.platform || navigator.platform || ''); }
    catch { return false; }
  })();
  // Keys a focused text field already owns: select all, clipboard, undo/redo,
  // and word/line movement and deletion (plus bold/italic/underline in rich
  // text). An app command bound to one of them — ⌘A for "Select All Rows" —
  // must not take it away from the field, just as a Mac sends Edit ▸ Select
  // All to the focused text view. Other commands (⌘S, ⌘⏎) still run.
  const FIELD_CODES = new Set(['KeyA', 'KeyC', 'KeyV', 'KeyX', 'KeyZ', 'KeyY']);
  const RICH_CODES = new Set(['KeyB', 'KeyI', 'KeyU']);
  const FIELD_KEYS = new Set(['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'backspace', 'delete', 'home', 'end']);
  const NON_TEXT_INPUTS = /^(checkbox|radio|range|color|file|button|submit|reset|image|hidden)$/;
  function fieldOwns(target, combo) {
    if (!target || target.nodeType !== 1) return false;
    const rich = target.isContentEditable;
    const field = rich || target.tagName === 'TEXTAREA' || (target.tagName === 'INPUT' && !NON_TEXT_INPUTS.test(target.type));
    if (!field) return false;
    return combo.code ? FIELD_CODES.has(combo.code) || (rich && RICH_CODES.has(combo.code)) : FIELD_KEYS.has(combo.key);
  }
  function modifiersMatch(combo, e) {
    if (combo.shift !== e.shiftKey || combo.alt !== e.altKey) return false;
    if (applePlatform) return combo.meta === e.metaKey && combo.ctrl === e.ctrlKey;
    return !e.metaKey && (combo.meta || combo.ctrl) === e.ctrlKey;
  }
  function menuShortcuts(root = document) {
    if (root.__lgShortcuts) return 0;
    // The menus themselves are usually siblings of the bar, not inside it, so
    // the bar is only the opt-in flag; the search runs over the document.
    if (!root.querySelector?.('.as-menubar[data-shortcuts]')) return 0;
    root.__lgShortcuts = true;
    const binds = [];
    const collect = () => {
      binds.length = 0;
      root.querySelectorAll('.as-menu-item .as-shortcut').forEach(tag => {
        const combo = parseShortcut(tag.textContent);
        const item = tag.closest('.as-menu-item');
        if (combo && item) binds.push({ combo, item });
      });
    };
    collect();
    // Re-collect only when menu items or shortcut labels change, not on every
    // DOM update an app makes (each collect is a query over the whole root).
    const SHORTCUT_NODES = '.as-menu-item, .as-shortcut';
    const touches = n => n.nodeType === 1 && (n.matches(SHORTCUT_NODES) || !!n.querySelector(SHORTCUT_NODES));
    observe(root, MutationObserver, records => {
      if (records.some(r => r.target.closest?.('.as-shortcut') || [...r.addedNodes].some(touches) || [...r.removedNodes].some(touches))) collect();
    }).observe(root, { childList: true, subtree: true });
    listen(root, root === document ? window : root, 'keydown', e => {
      if (e.defaultPrevented) return;
      const hit = binds.find(({ combo }) => modifiersMatch(combo, e)
        && (combo.code ? e.code === combo.code : e.key.toLowerCase() === combo.key));
      if (!hit || hit.item.disabled || hit.item.getAttribute('aria-disabled') === 'true') return;
      if (fieldOwns(e.composedPath?.()[0] || e.target, hit.combo)) return;
      e.preventDefault();
      hit.item.click();
    });
    return binds.length;
  }

  // Menu bar keyboard model. `role="menubar"` is a contract in the same way
  // `role="menu"` is: the whole bar is ONE tab stop, Left/Right walks the
  // titles, Down (or Enter/Space) opens one, and while a menu is open
  // Left/Right moves to the neighbouring menu and opens that instead. Opening
  // and placing the menu stays with the app — this only owns focus.
  function menuBar(bar) {
    if (bar.__lgMenuBar) return; bar.__lgMenuBar = true;
    const items = () => [...bar.querySelectorAll('.as-menubar-item')];
    const roving = active => items().forEach(it => { it.tabIndex = it === active ? 0 : -1; });
    roving(items()[0]);
    listen(bar, bar, 'focusin', e => {
      if (e.target.classList?.contains('as-menubar-item')) roving(e.target);
    });
    listen(bar, bar, 'keydown', e => {
      const list = items(), i = list.indexOf(document.activeElement);
      if (i < 0) return;
      const rtl = getComputedStyle(bar).direction === 'rtl';
      const fwd = rtl ? 'ArrowLeft' : 'ArrowRight', back = rtl ? 'ArrowRight' : 'ArrowLeft';
      let target = null;
      if (e.key === fwd) target = list[(i + 1) % list.length];
      else if (e.key === back) target = list[(i - 1 + list.length) % list.length];
      else if (e.key === 'Home') target = list[0];
      else if (e.key === 'End') target = list[list.length - 1];
      else if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (list[i].getAttribute('aria-expanded') !== 'true') list[i].click();
        return;
      } else return;
      e.preventDefault();
      const wasOpen = list[i].getAttribute('aria-expanded') === 'true';
      roving(target);
      // If a menu was open, clicking the neighbour closes this one and opens
      // that one, and the app moves focus into it; otherwise just walk focus.
      if (wasOpen) target.click(); else target.focus();
    });
  }

  /* ---------- Attach / init ------------------------------------------------ */
  const attached = new Set(), onScreen = new Set();
  let vo = null, ro = null, shared = null, ticking = 0, adaptTimer = 0, adaptAgain = false;
  function clearLens(el) {
    if (el.__lgId) document.getElementById(el.__lgId)?.remove();
    if (el.__lgChroma) chromaBudget++;
    delete el.__lgId; delete el.__lgChroma;
    el.style.removeProperty('--as-glass-filter'); el.style.removeProperty('--as-glass-lens');
  }
  function relens(el) {
    clearLens(el);
    if (onScreen.has(el)) applyLens(el, el.__lgOptions || {});
  }
  function startShared() {
    if (shared) return;
    shared = {};
    vo = observe(shared, IntersectionObserver, entries => entries.forEach(e => {
      if (!attached.has(e.target)) return;
      if (e.isIntersecting) { onScreen.add(e.target); relens(e.target); }
      else { onScreen.delete(e.target); clearLens(e.target); }
    }), { rootMargin: '240px' });
    ro = observe(shared, ResizeObserver, entries => entries.forEach(e => { if (attached.has(e.target)) relens(e.target); }));
    listen(shared, window, 'scroll', throttleAdapt, { passive: true, capture: true });
    listen(shared, window, 'resize', throttleAdapt);
    for (const q of ['(prefers-reduced-transparency: reduce)', '(prefers-contrast: more)', '(prefers-color-scheme: dark)']) {
      listen(shared, matchMedia(q), 'change', () => { attached.forEach(relens); scheduleAdapt(); });
    }
    observe(shared, MutationObserver, records => {
      if (records.some(r => r.type === 'attributes' && r.target === document.documentElement)) { attached.forEach(relens); scheduleAdapt(); }
      // Only a removal can disconnect an owner or move it out of its scope (a
      // move is a removal plus an insertion), so additions and attribute
      // changes skip the sweep over every owner.
      if (!records.some(r => r.removedNodes.length)) return;
      for (const root of roots.keys()) if (root !== document && !root.isConnected) destroy(root);
      for (const [owner, st] of [...resources]) if (owner.nodeType === 1) {
        const movedOut = st.scope && !st.scope.contains(owner) && ![...roots.keys()].some(r => r.contains(owner));
        if (!owner.isConnected || movedOut) detach(owner, true);
      }
    }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-theme', 'data-perf', 'data-liquid-glass'] });
  }
  function attach(el, opts = {}) {
    suspended.delete(el);
    startShared(); state(el);
    el.__lgOptions = { ...el.__lgOptions, ...opts };
    if (!attached.has(el)) {
      attached.add(el);
      if (el.classList.contains('as-glass-interactive') || el.querySelector('.as-item,.as-tab')) wireInteraction(el);
      vo.observe(el); ro.observe(el);
    }
    relens(el);
    if (el.__lgOptions.adapt !== false && el.dataset.adapt !== 'off') adapt(el);
    return { detach: () => detach(el) };
  }
  function scheduleAdapt() {
    if (!shared || ticking) return;
    ticking = frame(shared, () => {
      ticking = 0;
      onScreen.forEach(el => { if (el.isConnected && el.__lgOptions?.adapt !== false && el.dataset.adapt !== 'off') adapt(el); });
      attached.forEach(el => el.__lgInvalidate?.());
    });
  }
  // Sampling reads layout (elementsFromPoint plus computed styles) for every
  // visible glass element. While scrolling or resizing it runs at most every
  // ADAPT_INTERVAL ms, plus once more after the movement stops, instead of on
  // every frame. Cached pointer rects are dropped immediately — that is free.
  const ADAPT_INTERVAL = 120;
  function throttleAdapt() {
    if (!shared) return;
    attached.forEach(el => el.__lgInvalidate?.());
    if (adaptTimer) { adaptAgain = true; return; }
    scheduleAdapt();
    adaptTimer = timer(shared, () => {
      adaptTimer = 0;
      if (adaptAgain) { adaptAgain = false; throttleAdapt(); }
    }, ADAPT_INTERVAL);
  }
  function refresh() { attached.forEach(relens); scheduleAdapt(); }
  function release(owner) {
    const st = resources.get(owner);
    if (!st) return;
    resources.delete(owner);
    st.frames.forEach(cancelAnimationFrame); st.timers.forEach(clearTimeout); st.animations.forEach(a => a.cancel());
    st.cleanup.reverse().forEach(fn => fn());
    if (owner.nodeType === 1 || owner === document) {
      if (attached.has(owner)) { vo?.unobserve(owner); ro?.unobserve(owner); clearLens(owner); }
      attached.delete(owner); onScreen.delete(owner);
      if (owner.style) {
        ['--as-px','--as-py','--as-glow','--as-glass-light-angle','--as-knob-x','--as-value'].forEach(p => owner.style.removeProperty(p));
        owner.classList.remove('is-lit','is-pressed','is-scrubbing','is-dragging');
      }
      Object.keys(owner).filter(k => k.startsWith('__lg')).forEach(k => delete owner[k]);
    }
  }
  function stopIfIdle() {
    if (!roots.size && ![...resources.keys()].some(o => o !== shared)) {
      const old = shared; shared = null; release(old); vo = ro = null; ticking = adaptTimer = 0; adaptAgain = false;
      svgRoot?.remove(); svgRoot = null; chromaBudget = 8; mapCache.clear();
    }
    if (svgRoot && !svgRoot.children.length) { svgRoot.remove(); svgRoot = null; }
  }
  function detach(el, automatic = false) {
    if (!automatic && el !== document) suspended.add(el);
    for (const owner of [...resources.keys()]) if (owner === el || el.contains?.(owner.nodeType ? owner : null)) release(owner);
    stopIfIdle();
  }
  function destroy(root = document) {
    if (root !== document) suspended.add(root);
    for (const [scope, observer] of [...roots]) if (root === document || scope === root || (scope.nodeType && root.contains?.(scope))) {
      observer.disconnect(); roots.delete(scope);
    }
    for (const owner of [...resources.keys()]) if (owner !== shared && (root === document || owner === root || (owner.nodeType && root.contains?.(owner)))) release(owner);
    stopIfIdle();
  }
  // A glass element directly inside a glass group is glass on glass. The CSS
  // renders it flat so its content stays visible and usable; the runtime
  // leaves it unattached (no lens or sampling) and says so once.
  const warnedNested = new WeakSet();
  function nestedGlass(el) {
    if (!el.parentElement?.classList.contains('as-glass-group')) return false;
    if (!warnedNested.has(el)) {
      warnedNested.add(el);
      console.warn('[Apple-Style] .as-glass inside .as-glass-group is glass on glass; it is rendered flat. Use .as-item for group children.', el);
    }
    return true;
  }
  function scan(root, scope) {
    if (isSuspended(root)) return 0;
    members(root, '.as-glass').forEach(el => { if (!nestedGlass(el)) attach(el); });
    const wired = controls(root);
    members(root, '.as-tabbar[data-minimize]').forEach(b => tabBarMinimize(b));
    members(root, '.as-toolbar-title[data-reveal-on-scroll]').forEach(t => titleOnScroll(t, { root: scope }));
    members(root, '.as-container[data-concentric]').forEach(c => concentric(c));
    members(root, '.as-split-divider').forEach(d => splitDivider(d));
    members(root, '.as-menubar[role="menubar"]').forEach(b => menuBar(b));
    for (const owner of resources.keys()) if (owner.nodeType === 1 && (owner === root || root.contains(owner))) state(owner).scope = scope;
    return wired;
  }
  function init(root = document) {
    suspended.delete(root);
    startShared();
    const wired = scan(root, root), shortcuts = menuShortcuts(root);
    if (!roots.has(root)) {
      const observer = new MutationObserver(records => {
        for (const record of records) {
          for (const node of record.addedNodes) if (node.nodeType === 1 && root.contains(node)) scan(node, root);
          if (root.contains(record.target) && !isSuspended(record.target) && record.target.matches?.('.as-segmented')) segmented(record.target);
          if (root.contains(record.target) && !isSuspended(record.target) && record.target.matches?.('.as-toggle')) toggle(record.target);
        }
        if (records.some(r => r.removedNodes.length)) {
          for (const owner of [...resources.keys()]) if (owner.nodeType === 1 && !owner.isConnected) detach(owner, true);
        }
        // Opting in later (a menu bar that mounts after init) is picked up from
        // the added subtree instead of re-querying the whole root every batch.
        if (!root.__lgShortcuts && records.some(r => [...r.addedNodes].some(n => n.nodeType === 1
          && (n.matches('.as-menubar[data-shortcuts]') || n.querySelector('.as-menubar[data-shortcuts]'))))) menuShortcuts(root);
      });
      observer.observe(root, { childList: true, subtree: true }); roots.set(root, observer);
    }
    return { attached: attached.size, controls: wired, shortcuts, lens: supportsLens && !liteMode(), destroy: () => destroy(root) };
  }
  const api = { init, attach, detach, destroy, adapt, applyLens, morph, materialize, controls, segmented, toggle, slider, listbox, toast, tabBarMinimize, titleOnScroll, concentric, splitDivider, menuBar, menuShortcuts, supportsLens, refresh };
  Object.defineProperty(api, '__runtime', { value: 'browser' });
  if (document.readyState !== 'loading' && document.currentScript?.dataset.auto !== undefined) init();
  else if (document.currentScript?.dataset.auto !== undefined) {
    startShared(); listen(shared, document, 'DOMContentLoaded', () => init(), { once: true });
  }
  return api;
});
