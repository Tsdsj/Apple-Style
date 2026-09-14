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
 *  Usage:  LiquidGlass.init()   // auto-wires [class*="as-glass"] + controls
 *          LiquidGlass.attach(el, {lens:true, adapt:true, chroma:true})
 *          LiquidGlass.morph(fromEl, toEl, {duration:420})
 *          LiquidGlass.materialize(el, true|false)
 *          LiquidGlass.controls(root)      // or .segmented(el) / .toggle(el) / .slider(input)
 *          LiquidGlass.concentric(container)
 *  Controls dispatch a bubbling `change` event; read state from the element
 *  (aria-checked, .is-selected, input.value) rather than tracking it yourself.
 */
(function (global) {
  'use strict';
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
    if (!supportsLens || liteMode() || reduceTransparency() || moreContrast()) return;
    const rect = el.getBoundingClientRect();
    if (rect.width < 8 || rect.height < 8) return;
    const cs = getComputedStyle(el);
    const radius = parseFloat(cs.borderTopLeftRadius) || 0;
    const large = el.classList.contains('as-glass-large');
    const rim = opts.rim || Math.max(12, Math.min(rect.height * .5, 30));
    const scale = opts.scale || (large ? 14 : 30);
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
      if (f) f.remove(); else if (chroma) chromaBudget--;
      f = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
      f.id = id;
      f.setAttribute('x', '0'); f.setAttribute('y', '0');
      f.setAttribute('width', '100%'); f.setAttribute('height', '100%');
      f.setAttribute('color-interpolation-filters', 'sRGB');
      f.innerHTML = filterMarkup(chroma);
      ensureSvg().appendChild(f);
      el.__lgChroma = chroma;
    }
    const href = buildMap(rect.width, rect.height, radius, rim);
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
      if (!raf) raf = requestAnimationFrame(paint);
    };
    const enter = e => { box = el.getBoundingClientRect(); el.classList.add('is-lit'); move(e); };
    el.__lgInvalidate = () => { box = null; };
    const leave = () => {
      el.classList.remove('is-lit', 'is-pressed');
      el.style.removeProperty('--as-glass-light-angle');
      angle = null; box = null;
      spreadToNeighbors(el, null, false);
    };
    el.addEventListener('pointerenter', enter);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerdown', e => { move(e); el.classList.add('is-pressed'); spreadToNeighbors(el, e, true); });
    const up = () => { el.classList.remove('is-pressed'); spreadToNeighbors(el, null, false); };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('pointerleave', leave);
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
    if (el.__lgSeg) return; el.__lgSeg = true;
    const segs = () => Array.from(el.querySelectorAll('.as-segment'));
    if (!segs().length) return;

    const ind = document.createElement('span');
    ind.className = 'as-seg-indicator';
    ind.setAttribute('aria-hidden', 'true');
    el.insertBefore(ind, el.firstChild);
    el.dataset.indicator = '';

    let idx = Math.max(0, segs().findIndex(s => s.classList.contains('is-selected')));

    function select(i, { silent = false } = {}) {
      const list = segs();
      i = clamp(i, 0, list.length - 1);
      const changed = i !== idx;
      idx = i;
      list.forEach((s, n) => {
        s.classList.toggle('is-selected', n === i);
        if (s.getAttribute('role') === 'tab') s.setAttribute('aria-selected', String(n === i));
        else if (s.hasAttribute('aria-checked')) s.setAttribute('aria-checked', String(n === i));
      });
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
        if (d < bestD) { bestD = d; best = i; }
      }
      return best;
    }

    place(idx);
    new ResizeObserver(() => { if (!el.classList.contains('is-scrubbing')) place(idx); }).observe(el);

    let drag = null, raf = 0, pending = null;
    // one style write per frame, and never a read
    function flush() {
      raf = 0;
      if (!pending) return;
      const { x, sx, i } = pending; pending = null;
      ind.style.setProperty('--as-ind-x', x + 'px');
      ind.style.setProperty('--as-ind-sx', sx);
      if (i !== idx) select(i, { silent: true });
    }

    el.addEventListener('pointerdown', e => {
      const seg = e.target.closest('.as-segment');
      if (!seg) return;
      const cache = measure();
      const hit = segs().indexOf(seg);
      const onSelected = hit === idx;
      drag = {
        id: e.pointerId, startX: e.clientX, lastX: e.clientX, lastT: e.timeStamp,
        v: 0, moved: false, cache, from: cache[idx], scrub: onSelected, hit, startIdx: idx
      };
      try { el.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
      // pressing the selected segment grabs the knob; pressing another one
      // arms a tap that commits on release (matching UISegmentedControl)
      if (onSelected) { el.classList.add('is-scrubbing'); ind.style.setProperty('--as-ind-sx', String(stretchFor(0, .06))); }
    });

    el.addEventListener('pointermove', e => {
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
      if (!raf) raf = requestAnimationFrame(flush);
    });

    const end = e => {
      if (!drag || (e && e.pointerId !== drag.id)) return;
      const { moved, hit, startIdx, cache } = drag;
      drag = null;
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      if (pending) { const i = pending.i; pending = null; if (i !== idx) select(i, { silent: true }); }
      el.classList.remove('is-scrubbing');
      ind.style.setProperty('--as-ind-sx', '1');
      if (!moved) select(hit, { silent: true });   // plain tap
      place(idx, cache);
      if (idx !== startIdx) fire(el);
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);

    el.addEventListener('keydown', e => {
      const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!step) return;
      e.preventDefault();
      if (select(idx + step)) place(idx, null);
    });
  }

  function toggle(el) {
    if (el.__lgToggle) return; el.__lgToggle = true;
    const knob = el.querySelector('.as-knob');
    if (!knob) return;
    // Resting knob is a circle inset 2px on each side, so it is clientHeight−4
    // wide and its travel is clientWidth−clientHeight. While held it widens,
    // and the reachable travel shrinks by exactly that growth — otherwise the
    // stretched knob would push past the end of the capsule.
    function metrics() {
      const rest = el.clientHeight - 4;
      const grow = Math.max(0, knob.offsetWidth - rest);
      return { max: Math.max(0, el.clientWidth - el.clientHeight - grow) };
    }
    let drag = null;

    el.addEventListener('pointerdown', e => {
      try { el.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
      const { max } = metrics();   // read after :active applies, so grow is included
      drag = { id: e.pointerId, startX: e.clientX, moved: false, max, from: el.getAttribute('aria-checked') === 'true' ? max : 0 };
    });
    el.addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.startX;
      if (!drag.moved && Math.abs(dx) > 3) { drag.moved = true; el.classList.add('is-scrubbing'); }
      if (!drag.moved) return;
      el.style.setProperty('--as-knob-x', clamp(drag.from + dx, 0, drag.max) + 'px');
    });
    const end = e => {
      if (!drag || (e && e.pointerId !== drag.id)) return;
      const t = drag.max;
      const x = parseFloat(el.style.getPropertyValue('--as-knob-x'));
      const wasOn = el.getAttribute('aria-checked') === 'true';
      // a drag lands wherever it was thrown; a tap flips
      const on = drag.moved && !Number.isNaN(x) ? x > t / 2 : !wasOn;
      drag = null;
      el.classList.remove('is-scrubbing');
      el.style.removeProperty('--as-knob-x');
      el.setAttribute('aria-checked', String(on));
      if (on !== wasOn) fire(el);
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('keydown', e => {
      if (e.key !== ' ' && e.key !== 'Enter') return;
      e.preventDefault();
      el.setAttribute('aria-checked', String(el.getAttribute('aria-checked') !== 'true'));
      fire(el);
    });
  }

  function slider(input) {
    if (input.__lgSlider) return; input.__lgSlider = true;
    // Overlay a real glass knob as a *sibling* rather than wrapping the input:
    // a wrapper would replace the input as the grid/flex item and, having no
    // intrinsic width of its own, would collapse the track it sits in.
    const host = input.parentElement;
    if (!host) return;
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    const knob = document.createElement('span');
    knob.className = 'as-slider-knob';
    knob.setAttribute('aria-hidden', 'true');
    host.appendChild(knob);
    input.classList.add('is-upgraded');

    let lastV = null, lastT = 0, geom = null, raf = 0, pendingF = null;
    function frac() {
      const min = +input.min || 0, max = input.max === '' ? 100 : +input.max;
      return max === min ? 0 : (+input.value - min) / (max - min);
    }
    // measured on layout changes only — not on every input event
    function remeasure() {
      geom = { w: input.clientWidth, kw: knob.offsetWidth || 28, l: input.offsetLeft, y: input.offsetTop + input.offsetHeight / 2 };
      knob.style.setProperty('--as-knob-l', geom.l + 'px');
      knob.style.setProperty('--as-knob-y', geom.y + 'px');
    }
    function paint() {
      raf = 0;
      const f = pendingF; pendingF = null;
      if (f === null || !geom) return;
      input.style.setProperty('--as-value', (f * 100) + '%');
      knob.style.setProperty('--as-knob-x', (geom.kw / 2 + f * (geom.w - geom.kw)) + 'px');
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
      if (!raf) raf = requestAnimationFrame(paint);          // one write per frame
    }
    place(false);
    requestAnimationFrame(() => { remeasure(); place(false); });   // after first layout
    input.addEventListener('input', () => place(true));
    new ResizeObserver(() => { remeasure(); place(false); }).observe(input);

    const stop = () => { knob.classList.remove('is-scrubbing'); knob.style.setProperty('--as-knob-sx', '1'); };
    input.addEventListener('pointerdown', () => { remeasure(); knob.classList.add('is-scrubbing'); lastV = null; });
    addEventListener('pointerup', stop);
    addEventListener('pointercancel', stop);
    input.addEventListener('focus', () => knob.classList.add('is-focused'));
    input.addEventListener('blur', () => { knob.classList.remove('is-focused'); stop(); });
    // keyboard changes should lift the knob briefly too
    input.addEventListener('keydown', () => { knob.classList.add('is-scrubbing'); clearTimeout(knob.__t); knob.__t = setTimeout(stop, 400); });
  }

  function controls(root = document) {
    let n = 0;
    root.querySelectorAll('.as-segmented').forEach(el => { segmented(el); n++; });
    root.querySelectorAll('.as-toggle').forEach(el => { toggle(el); n++; });
    root.querySelectorAll('.as-slider').forEach(el => { slider(el); n++; });
    return n;
  }

  /* ---------- 6. Structure helpers ----------------------------------------- */
  function tabBarMinimize(bar, opts = {}) {
    const scroller = opts.scroller || window; let last = scroller === window ? scrollY : scroller.scrollTop, acc = 0;
    const onScroll = () => { const y = scroller === window ? scrollY : scroller.scrollTop; const dy = y - last; last = y; acc = Math.sign(dy) === Math.sign(acc) ? acc + dy : dy;
      if (acc > 24 && y > 40) bar.classList.add('is-minimized'); else if (acc < -24 || y <= 40) bar.classList.remove('is-minimized'); };
    scroller.addEventListener('scroll', onScroll, { passive: true });
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
    const seen = new Map();
    const update = () => {
      let largeVisible = false;
      seen.forEach((inter, el) => { if (inter && el.isConnected) largeVisible = true; });
      title.classList.toggle('is-visible', !largeVisible);
    };
    const io = new IntersectionObserver(es => { es.forEach(e => seen.set(e.target, e.isIntersecting)); update(); });
    const sync = () => {
      document.querySelectorAll(sel).forEach(t => { if (!seen.has(t)) { seen.set(t, false); io.observe(t); } });
      seen.forEach((_, el) => { if (!el.isConnected) seen.delete(el); });
      update();
    };
    sync();
    // views that swap with [hidden], and lists that re-render, both need a
    // resync — coalesced into one frame so a re-render storm costs one pass
    let queued = 0;
    const resync = () => { if (queued) return; queued = requestAnimationFrame(() => { queued = 0; sync(); }); };
    new MutationObserver(resync).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
  }
  // Concentric: child radius = container radius − child's inset from container edge
  function concentric(container, min = 0) {
    const cs = getComputedStyle(container); const R = parseFloat(cs.borderTopLeftRadius) || 0; const cr = container.getBoundingClientRect();
    container.querySelectorAll('.as-concentric').forEach(ch => { const r = ch.getBoundingClientRect(); const inset = Math.max(0, Math.min(r.left - cr.left, r.top - cr.top, cr.right - r.right, cr.bottom - r.bottom)); ch.style.borderRadius = Math.max(min, R - inset) + 'px'; });
  }

  /* ---------- Attach / init ------------------------------------------------ */
  const attached = new Set();
  const onScreen = new Set();
  // Lens only what is actually in (or near) the viewport. A long page can hold
  // dozens of glass surfaces; filtering the ones nobody can see is pure cost.
  const vo = new IntersectionObserver(entries => entries.forEach(e => {
    const el = e.target;
    if (e.isIntersecting) {
      onScreen.add(el);
      if (el.__lgLens !== false && el.dataset.lens !== 'off') applyLens(el, {});
    } else {
      onScreen.delete(el);
      el.style.removeProperty('--as-glass-filter');
      el.style.setProperty('--as-glass-lens', '0');
    }
  }), { rootMargin: '240px' });

  function attach(el, opts = {}) {
    if (attached.has(el)) return; attached.add(el);
    if (el.classList.contains('as-glass-interactive') || el.querySelector('.as-item,.as-tab')) wireInteraction(el);
    // observed even when lensing is off: membership of onScreen is what gates
    // the per-scroll backdrop sampling too
    el.__lgLens = opts.lens !== false;
    vo.observe(el);
    if (opts.adapt !== false && el.dataset.adapt !== 'off') adapt(el);
    ro.observe(el);
  }
  const ro = new ResizeObserver(entries => entries.forEach(e => { if (onScreen.has(e.target)) applyLens(e.target, {}); }));
  let ticking = false;
  // Backdrop sampling is the most expensive thing here (elementsFromPoint plus
  // getComputedStyle, three probes per element) and it runs on scroll — so it
  // only ever visits glass that is currently on screen.
  function scheduleAdapt() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      onScreen.forEach(el => { if (el.isConnected && el.dataset.adapt !== 'off') adapt(el); });
      attached.forEach(el => el.__lgInvalidate?.());
    });
  }
  function init(root = document) {
    root.querySelectorAll('.as-glass').forEach(el => attach(el));
    const wired = controls(root);
    addEventListener('scroll', scheduleAdapt, { passive: true, capture: true }); addEventListener('resize', scheduleAdapt);
    document.querySelectorAll('.as-tabbar[data-minimize]').forEach(b => tabBarMinimize(b));
    document.querySelectorAll('.as-toolbar-title[data-reveal-on-scroll]').forEach(t => titleOnScroll(t));
    document.querySelectorAll('.as-container[data-concentric]').forEach(c => concentric(c));
    new MutationObserver(m => m.forEach(x => x.addedNodes.forEach(n => {
      if (n.nodeType !== 1) return;
      if (n.matches?.('.as-glass')) attach(n);
      n.querySelectorAll?.('.as-glass').forEach(attach);
      if (n.matches?.('.as-segmented')) segmented(n);
      if (n.matches?.('.as-toggle')) toggle(n);
      if (n.matches?.('.as-slider')) slider(n);
      controls(n);
    }))).observe(document.body, { childList: true, subtree: true });
    ['(prefers-reduced-transparency: reduce)', '(prefers-contrast: more)', '(prefers-color-scheme: dark)'].forEach(q => matchMedia(q).addEventListener('change', () => attached.forEach(el => { el.style.removeProperty('--as-glass-filter'); if (onScreen.has(el)) applyLens(el, {}); adapt(el); })));
    return { attached: attached.size, controls: wired, lens: supportsLens && !liteMode() };
  }
  global.LiquidGlass = { init, attach, adapt, applyLens, morph, materialize, controls, segmented, toggle, slider, tabBarMinimize, titleOnScroll, concentric, supportsLens, refresh: scheduleAdapt };
  if (document.readyState !== 'loading' && document.currentScript?.dataset.auto !== undefined) init();
  else if (document.currentScript?.dataset.auto !== undefined) addEventListener('DOMContentLoaded', () => init());
})(window);
