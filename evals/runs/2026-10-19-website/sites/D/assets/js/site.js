/* 青柠记账 Lime Ledger — site behaviour (no dependencies besides liquid-glass.js).
   Every module checks for its markup first, so one file serves every page. */
(function () {
  'use strict';
  var doc = document.documentElement;
  var LG = window.LiquidGlass;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function storage(action, key, value) {
    try {
      if (action === 'get') return window.localStorage.getItem(key);
      if (action === 'set') window.localStorage.setItem(key, value);
      if (action === 'remove') window.localStorage.removeItem(key);
    } catch (e) { /* private mode or blocked storage: the default still works */ }
    return null;
  }

  /* ---------- Appearance (auto / light / dark) ----------------------------
     The inline script in <head> applies a saved choice before first paint.
     Here we reflect it in the footer control and keep theme-color in step. */
  var THEME_KEY = 'll-theme';
  var themeMetas = Array.prototype.slice.call(document.querySelectorAll('meta[name="theme-color"]'));
  themeMetas.forEach(function (m) { m.dataset.original = m.getAttribute('content'); });
  function applyTheme(pref) {
    if (pref === 'light' || pref === 'dark') doc.setAttribute('data-theme', pref);
    else doc.removeAttribute('data-theme');
    themeMetas.forEach(function (m) {
      m.setAttribute('content', pref === 'light' ? '#ffffff' : pref === 'dark' ? '#000000' : m.dataset.original);
    });
  }
  var themeSwitch = document.querySelector('[data-theme-switch]');
  var savedTheme = storage('get', THEME_KEY);
  if (savedTheme !== 'light' && savedTheme !== 'dark') savedTheme = 'auto';
  applyTheme(savedTheme);
  if (themeSwitch) {
    // Mark the saved option before the runtime upgrades the control: it reads
    // the initial selection from .is-selected.
    Array.prototype.forEach.call(themeSwitch.querySelectorAll('.as-segment'), function (seg) {
      var on = seg.dataset.value === savedTheme;
      seg.classList.toggle('is-selected', on);
      seg.setAttribute('aria-checked', String(on));
    });
    themeSwitch.addEventListener('change', function () {
      var selected = themeSwitch.querySelector('.as-segment.is-selected');
      var pref = selected ? selected.dataset.value : 'auto';
      applyTheme(pref);
      if (pref === 'auto') storage('remove', THEME_KEY); else storage('set', THEME_KEY, pref);
    });
  }

  /* ---------- Billing period (set before init for the same reason) -------- */
  var billing = document.querySelector('[data-billing]');

  /* ---------- Liquid Glass runtime: glass surfaces + segmented controls --- */
  if (LG && typeof LG.init === 'function') LG.init(document);

  /* ---------- Mobile navigation (disclosure, not a modal) ----------------- */
  var menuButton = document.querySelector('.menu-button');
  var menu = document.getElementById('site-menu');
  if (menuButton && menu) {
    var closeTimer = 0;
    var isOpen = function () { return menuButton.getAttribute('aria-expanded') === 'true'; };
    var openMenu = function () {
      window.clearTimeout(closeTimer);
      menu.hidden = false;
      menuButton.setAttribute('aria-expanded', 'true');
      window.requestAnimationFrame(function () { menu.classList.add('is-open'); });
    };
    var closeMenu = function (restoreFocus) {
      if (!isOpen()) return;
      menuButton.setAttribute('aria-expanded', 'false');
      menu.classList.remove('is-open');
      closeTimer = window.setTimeout(function () { menu.hidden = true; }, reduceMotion.matches ? 0 : 220);
      if (restoreFocus) menuButton.focus();
    };
    menuButton.addEventListener('click', function () { if (isOpen()) closeMenu(false); else openMenu(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen()) { e.preventDefault(); closeMenu(true); }
    });
    document.addEventListener('pointerdown', function (e) {
      if (isOpen() && !menu.contains(e.target) && !menuButton.contains(e.target)) closeMenu(false);
    });
    // Tabbing past the last link closes it, so it never covers focused content.
    menu.addEventListener('focusout', function (e) {
      if (isOpen() && e.relatedTarget && !menu.contains(e.relatedTarget) && e.relatedTarget !== menuButton) closeMenu(false);
    });
    window.matchMedia('(min-width: 900px)').addEventListener('change', function (mq) { if (mq.matches) closeMenu(false); });
  }

  /* ---------- Scroll reveal (skipped with Reduce Motion) ------------------ */
  var revealables = document.querySelectorAll('.reveal');
  if (revealables.length && !reduceMotion.matches && 'IntersectionObserver' in window) {
    doc.classList.add('reveal-on');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('is-in'); io.unobserve(entry.target); }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
    Array.prototype.forEach.call(revealables, function (el) { io.observe(el); });
    // Anything already above the fold or targeted by the URL shows at once.
    window.requestAnimationFrame(function () {
      Array.prototype.forEach.call(revealables, function (el) {
        if (el.getBoundingClientRect().top < window.innerHeight * 0.94) el.classList.add('is-in');
      });
    });
    window.addEventListener('beforeprint', function () {
      Array.prototype.forEach.call(revealables, function (el) { el.classList.add('is-in'); });
    });
  }

  /* ---------- Pricing: monthly / yearly ----------------------------------- */
  if (billing) {
    var renderPrices = function () {
      var selected = billing.querySelector('.as-segment.is-selected');
      var period = selected ? selected.dataset.value : 'yearly';
      Array.prototype.forEach.call(document.querySelectorAll('[data-price]'), function (el) {
        var text = el.getAttribute('data-' + period);
        if (text !== null) el.textContent = text;
      });
      Array.prototype.forEach.call(document.querySelectorAll('[data-period-only]'), function (el) {
        el.hidden = el.getAttribute('data-period-only') !== period;
      });
    };
    billing.addEventListener('change', renderPrices);
    renderPrices();
  }

  /* ---------- FAQ: deep links + search ------------------------------------ */
  var faq = document.querySelector('[data-faq]');
  if (faq) {
    var items = Array.prototype.slice.call(faq.querySelectorAll('.faq-item'));
    var groups = Array.prototype.slice.call(faq.querySelectorAll('.faq-group'));
    var openFromHash = function () {
      if (!location.hash) return;
      var target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (target && target.classList.contains('faq-item')) {
        target.open = true;
        target.querySelector('summary').focus({ preventScroll: true });
      }
    };
    openFromHash();
    window.addEventListener('hashchange', openFromHash);

    var search = document.getElementById('faq-search');
    var status = document.getElementById('faq-status');
    var empty = document.getElementById('faq-empty');
    var emptyTerm = document.getElementById('faq-empty-term');
    var normalize = function (s) { return s.toLowerCase().replace(/\s+/g, ''); };
    items.forEach(function (item) { item.dataset.text = normalize(item.textContent); });
    var timer = 0;
    var filter = function () {
      var q = normalize(search.value);
      var shown = 0;
      items.forEach(function (item) {
        var match = !q || item.dataset.text.indexOf(q) !== -1;
        item.hidden = !match;
        if (match) shown++;
      });
      groups.forEach(function (group) { group.hidden = !group.querySelector('.faq-item:not([hidden])'); });
      empty.hidden = shown !== 0;
      if (emptyTerm) emptyTerm.textContent = search.value.trim();
      status.textContent = q ? (shown ? '找到 ' + shown + ' 个相关问题' : '没有找到相关问题') : '';
    };
    if (search) {
      search.addEventListener('input', function () { window.clearTimeout(timer); timer = window.setTimeout(filter, 150); });
      search.addEventListener('search', filter);
      var clear = document.getElementById('faq-clear');
      if (clear) clear.addEventListener('click', function () { search.value = ''; filter(); search.focus(); });
    }
  }

  /* ---------- Article: copy link ------------------------------------------ */
  Array.prototype.forEach.call(document.querySelectorAll('[data-copy-link]'), function (btn) {
    btn.addEventListener('click', function () {
      var url = location.href.split('#')[0];
      var say = function (text) { if (LG && LG.toast) LG.toast(text); };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(url).then(function () { say('链接已复制'); }, function () { say('无法复制，请手动复制地址栏中的链接'); });
      } else {
        say('无法复制，请手动复制地址栏中的链接');
      }
    });
  });

  /* ---------- Contact form: validation + simulated send ------------------- */
  var form = document.getElementById('contact-form');
  if (form) {
    form.noValidate = true;   // we show our own messages next to each field
    var done = document.getElementById('contact-done');
    var submit = form.querySelector('[type="submit"]');
    var submitLabel = submit.querySelector('.btn-label');
    var counter = document.getElementById('message-count');
    var message = form.elements.message;
    var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    var rules = {
      name: function (v) { return v.trim() ? '' : '请填写你的称呼。'; },
      email: function (v) {
        if (!v.trim()) return '请填写邮箱，我们会把回复发到这里。';
        return EMAIL.test(v.trim()) ? '' : '邮箱格式好像不对，请检查一下，例如 name@example.com。';
      },
      topic: function (v) { return v ? '' : '请选择一个主题，方便我们转给合适的同事。'; },
      message: function (v) {
        var n = v.trim().length;
        if (!n) return '请写下你想告诉我们的内容。';
        return n < 10 ? '再多写几句吧，至少 10 个字，我们才能更好地帮你。' : '';
      },
      consent: function (v, el) { return el.checked ? '' : '请勾选同意，我们才能使用这些信息回复你。'; }
    };
    var errorFor = function (el) { return document.getElementById(el.name + '-error'); };
    var setError = function (el, text) {
      var box = errorFor(el);
      if (text) {
        el.setAttribute('aria-invalid', 'true');
        box.querySelector('span').textContent = text;
        box.hidden = false;
      } else {
        el.removeAttribute('aria-invalid');
        box.hidden = true;
      }
    };
    var check = function (el) {
      var rule = rules[el.name];
      if (!rule) return true;
      var text = rule(el.value, el);
      setError(el, text);
      return !text;
    };
    Object.keys(rules).forEach(function (name) {
      var el = form.elements[name];
      // Validate when leaving a field the person has touched; once a field
      // shows an error, re-check as they type so it clears as soon as it's fixed.
      el.addEventListener('blur', function () { if (el.dataset.touched) check(el); });
      el.addEventListener('input', function () { el.dataset.touched = '1'; if (el.getAttribute('aria-invalid') === 'true') check(el); });
      el.addEventListener('change', function () { el.dataset.touched = '1'; if (el.type === 'checkbox' || el.tagName === 'SELECT') check(el); });
    });
    var updateCount = function () { counter.textContent = message.value.length + ' / ' + message.maxLength; };
    message.addEventListener('input', updateCount);
    updateCount();

    var sending = false;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (sending) return;
      var firstInvalid = null;
      Object.keys(rules).forEach(function (name) {
        var el = form.elements[name];
        if (!check(el) && !firstInvalid) firstInvalid = el;
      });
      if (firstInvalid) { firstInvalid.focus(); return; }

      // No backend: simulate the round trip so the states are real.
      sending = true;
      submit.setAttribute('aria-disabled', 'true');
      submit.classList.add('is-busy');
      submitLabel.textContent = '正在发送…';
      form.setAttribute('aria-busy', 'true');
      window.setTimeout(function () {
        var now = new Date();
        var ref = 'LL-' + now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0') + '-' + String(Math.floor(1000 + Math.random() * 9000));
        document.getElementById('done-email').textContent = form.elements.email.value.trim();
        document.getElementById('done-ref').textContent = ref;
        form.hidden = true;
        done.hidden = false;
        var heading = document.getElementById('contact-done-title');
        heading.focus();
        if (LG && LG.toast) LG.toast('消息已发送');
        sending = false;
        submit.removeAttribute('aria-disabled');
        submit.classList.remove('is-busy');
        submitLabel.textContent = '发送消息';
        form.removeAttribute('aria-busy');
      }, 1100);
    });

    var again = document.getElementById('contact-again');
    if (again) again.addEventListener('click', function () {
      form.reset();
      Object.keys(rules).forEach(function (name) { var el = form.elements[name]; delete el.dataset.touched; setError(el, ''); });
      updateCount();
      done.hidden = true;
      form.hidden = false;
      form.elements.name.focus();
    });
  }
})();
