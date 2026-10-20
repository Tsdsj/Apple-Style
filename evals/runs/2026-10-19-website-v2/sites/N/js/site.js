/* Tidepool docs: appearance switch and the documentation menu.
   The page works without this file: the system appearance applies and the menu
   stays open on wide screens and closed on narrow ones only when this runs. */
(function () {
  'use strict';
  var KEY = 'tidepool-theme';
  var root = document.documentElement;
  var wide = window.matchMedia('(min-width: 64em)');

  // Documentation menu: a native disclosure. Its summary is hidden on wide
  // screens, where the menu is always open.
  var menu = document.querySelector('[data-docs-menu]');
  function syncMenu() { if (menu) menu.open = wide.matches; }
  syncMenu();
  if (wide.addEventListener) wide.addEventListener('change', syncMenu);

  // Appearance: System, Light or Dark. Storage can be blocked, so errors are ignored.
  function read() {
    try {
      var v = localStorage.getItem(KEY);
      return v === 'light' || v === 'dark' ? v : 'system';
    } catch (e) { return 'system'; }
  }
  function write(v) {
    try {
      if (v === 'system') localStorage.removeItem(KEY); else localStorage.setItem(KEY, v);
    } catch (e) { /* not stored; the choice lasts for this page only */ }
  }
  function apply(v) {
    if (v === 'system') delete root.dataset.theme; else root.dataset.theme = v;
  }

  var current = read();
  var radios = document.querySelectorAll('input[name="theme"]');
  Array.prototype.forEach.call(radios, function (radio) {
    radio.checked = radio.value === current;
    radio.addEventListener('change', function () {
      if (radio.checked) { apply(radio.value); write(radio.value); }
    });
  });
  apply(current);
})();
