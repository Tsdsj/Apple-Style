const { test, expect } = require('@playwright/test');
const base = 'http://127.0.0.1:8767';
test('all runtime observers, listeners, frames and timers are released', async ({ page }) => {
  await page.goto(base);
  await page.evaluate(() => {
    const observers = [], listeners = [], frames = new Set(), timers = new Set();
    window.audit = { observers, listeners, frames, timers, active: false };
    for (const type of ['ResizeObserver','IntersectionObserver','MutationObserver']) {
      const Original = window[type];
      window[type] = class extends Original {
        constructor(...args) { super(...args); this.targets = new Set(); observers.push(this); }
        observe(target, ...args) { this.targets.add(target); return super.observe(target, ...args); }
        unobserve(target) { this.targets.delete(target); return super.unobserve(target); }
        disconnect() { this.targets.clear(); return super.disconnect(); }
      };
    }
    const add = EventTarget.prototype.addEventListener, remove = EventTarget.prototype.removeEventListener;
    EventTarget.prototype.addEventListener = function(type, fn, opts) { if (audit.active) listeners.push({ target:this, type, fn, opts }); return add.call(this,type,fn,opts); };
    EventTarget.prototype.removeEventListener = function(type,fn,opts) { for(let i=listeners.length-1;i>=0;i--) if(listeners[i].target===this && listeners[i].type===type && listeners[i].fn===fn) listeners.splice(i,1); return remove.call(this,type,fn,opts); };
    const raf = requestAnimationFrame, caf = cancelAnimationFrame, timeout = setTimeout, clear = clearTimeout;
    window.requestAnimationFrame = fn => { const id = raf(time => { frames.delete(id); fn(time); }); frames.add(id); return id; };
    window.cancelAnimationFrame = id => { frames.delete(id); caf(id); };
    window.setTimeout = (fn,ms) => { const id=timeout(() => { timers.delete(id); fn(); },ms); if(audit.active) timers.add(id); return id; };
    window.clearTimeout = id => { timers.delete(id); clear(id); };
  });
  await page.setContent(`<link rel="stylesheet" href="${base}/skills/Apple-Style/web/apple-style.css"><main id="scope">
  <button class="as-glass as-glass-interactive as-button">Glass</button>
  <div class="as-segmented"><button class="as-segment is-selected">A</button><button class="as-segment">B</button></div>
  <input type="range" class="as-slider" aria-label="Value"><nav class="as-tabbar" data-minimize></nav>
  <h1 class="as-large-title">Title</h1><div class="as-toolbar-title" data-reveal-on-scroll>Title</div>
  <div class="as-menubar" role="menubar" data-shortcuts><button class="as-menubar-item">Menu</button></div>
  <button class="as-menu-item">Save<span class="as-shortcut">⌘S</span></button></main><script src="${base}/skills/Apple-Style/web/liquid-glass.js"></script>`);
  const counts = await page.evaluate(() => {
    audit.active=true;
    const root=document.querySelector('#scope'); LiquidGlass.init(root);
    const first=audit.listeners.length; LiquidGlass.init(root); const second=audit.listeners.length;
    document.querySelector('.as-slider').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight'}));
    LiquidGlass.materialize(document.querySelector('.as-glass'),true);
    LiquidGlass.destroy(root); audit.active=false;
    return {first,second, listeners:audit.listeners.length, targets:audit.observers.reduce((n,o)=>n+o.targets.size,0),frames:audit.frames.size,timers:audit.timers.size,animations:document.getAnimations().filter(a => !(a instanceof CSSTransition) && !(a instanceof CSSAnimation)).length,filters:document.querySelectorAll('filter').length,knobs:document.querySelectorAll('.as-slider-knob,.as-seg-indicator').length};
  });
  expect(counts.first).toBe(counts.second);
  expect({...counts, first:0, second:0}).toEqual({first:0,second:0,listeners:0,targets:0,frames:0,timers:0,animations:0,filters:0,knobs:0});
});
