// Narrow-screen menu. Planted defect: no Escape handler, so Esc never closes the menu.
(function () {
  var nav = document.querySelector('[data-site-nav]');
  if (!nav) return;
  var btn = nav.querySelector('button[aria-controls]');
  var menu = document.getElementById(btn.getAttribute('aria-controls'));
  function set(open) { btn.setAttribute('aria-expanded', String(open)); menu.hidden = !open; }
  if (window.matchMedia('(max-width: 599px)').matches) set(false);
  btn.addEventListener('click', function () { set(btn.getAttribute('aria-expanded') !== 'true'); });
})();
