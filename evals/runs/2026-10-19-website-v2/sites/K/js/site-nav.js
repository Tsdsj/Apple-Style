/* Site navigation disclosure for narrow screens (pattern: website-patterns.md, Site header).
   No dependency on liquid-glass.js. Not a focus trap: this is a disclosure, not a modal.
   Markup:
     <nav class="as-site-nav" data-site-nav aria-label="Primary">
       <button type="button" aria-controls="site-links" aria-expanded="false" hidden>Menu</button>
       <ul id="site-links" class="as-site-nav-links">…links…</ul>
     </nav>
   NARROW must match the max-width query in web/patterns/site-nav.css. */
(function () {
  'use strict';
  var NARROW = '(max-width: 47.99em)';
  var ATTR = 'aria-expanded';
  var live = new WeakMap();

  function attach(root) {
    if (live.has(root)) return live.get(root);
    var toggle = root.querySelector('button[aria-controls]');
    var panel = toggle && document.getElementById(toggle.getAttribute('aria-controls'));
    if (!panel || !root.contains(panel)) return null;

    var mq = window.matchMedia(NARROW);
    var original = toggle.getAttribute(ATTR);
    var isOpen = function () { return toggle.getAttribute(ATTR) === 'true'; };
    var close = function (returnFocus) {
      if (!isOpen()) return;
      toggle.setAttribute(ATTR, 'false');
      if (returnFocus) toggle.focus();
    };
    var onToggle = function () { toggle.setAttribute(ATTR, isOpen() ? 'false' : 'true'); };
    var onKey = function (e) {
      // Focus returns to the toggle only when it was inside the menu; otherwise it stays where the user is.
      if (e.key === 'Escape' && isOpen()) close(root.contains(document.activeElement));
    };
    var onDown = function (e) { if (!root.contains(e.target)) close(false); };
    var onLink = function (e) { if (panel.contains(e.target) && e.target.closest('a[href]')) close(false); };
    // Tabbing or clicking out of the menu closes it, without moving focus back.
    var onOut = function (e) { if (e.relatedTarget && !root.contains(e.relatedTarget)) close(false); };
    var onMq = function () { if (!mq.matches) close(false); };

    toggle.addEventListener('click', onToggle);
    panel.addEventListener('click', onLink);
    root.addEventListener('focusout', onOut);
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    mq.addEventListener('change', onMq);
    toggle.hidden = false;
    root.setAttribute('data-enhanced', '');
    toggle.setAttribute(ATTR, 'false');

    var handle = {
      destroy: function () {
        toggle.removeEventListener('click', onToggle);
        panel.removeEventListener('click', onLink);
        root.removeEventListener('focusout', onOut);
        document.removeEventListener('keydown', onKey);
        document.removeEventListener('pointerdown', onDown);
        mq.removeEventListener('change', onMq);
        root.removeAttribute('data-enhanced');
        toggle.hidden = true;
        if (original === null) toggle.removeAttribute(ATTR); else toggle.setAttribute(ATTR, original);
        live.delete(root);
      }
    };
    live.set(root, handle);
    return handle;
  }

  function init(scope) {
    var base = scope || document;
    var roots = Array.prototype.slice.call(base.querySelectorAll('[data-site-nav]'));
    if (base.nodeType === 1 && base.hasAttribute('data-site-nav')) roots.unshift(base);
    var handles = roots.map(attach).filter(Boolean);
    return { destroy: function () { handles.forEach(function (h) { h.destroy(); }); } };
  }

  window.SiteNav = { init: init };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { init(); });
  else init();
})();
