/* Pause control for the decorative loop on the home page (website-patterns.md, Images and media).
   The video is muted and aria-hidden; the button is the only control. Under reduced motion the
   video starts paused. No dependency; loaded with defer. */
(function () {
  'use strict';
  var video = document.getElementById('loop');
  var button = document.getElementById('loop-toggle');
  if (!video || !button) return;
  function sync() { button.textContent = video.paused ? 'Play video' : 'Pause video'; }
  button.addEventListener('click', function () {
    if (video.paused) video.play().catch(function () {}); else video.pause();
    sync();
  });
  video.addEventListener('play', sync);
  video.addEventListener('pause', sync);
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) video.pause();
  sync();
})();
