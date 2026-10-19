/* 青柠记账 Lime Ledger — site behaviour (no dependencies besides the optional
   liquid-glass.js runtime). Every feature checks that its markup exists, so
   one file serves every page. Content is fully readable without JavaScript. */
(function () {
  'use strict';

  var root = document.documentElement;
  var THEME_KEY = 'll-theme';
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  var store = {
    get: function (k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { if (v == null) window.localStorage.removeItem(k); else window.localStorage.setItem(k, v); } catch (e) { /* private mode: keep working without persistence */ } }
  };
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $all(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function glass() { return window.LiquidGlass || null; }

  /* ------------------------------------------------------------------
     1. Appearance: Auto / Light / Dark. The inline <head> script applies a
        stored choice before first paint; this keeps the control in sync.
     ------------------------------------------------------------------ */
  var themeMetas = $all('meta[name="theme-color"]');
  themeMetas.forEach(function (m) { m.setAttribute('data-default', m.getAttribute('content')); });
  function applyTheme(pref) {
    if (pref === 'light' || pref === 'dark') root.setAttribute('data-theme', pref);
    else root.removeAttribute('data-theme');
    themeMetas.forEach(function (m) {
      m.setAttribute('content', pref === 'dark' ? '#000000' : pref === 'light' ? '#ffffff' : m.getAttribute('data-default'));
    });
  }
  var appearance = $('[data-appearance]');
  if (appearance) {
    var stored = store.get(THEME_KEY);
    var pref = stored === 'light' || stored === 'dark' ? stored : 'auto';
    applyTheme(pref);
    $all('.as-segment', appearance).forEach(function (seg) {
      var on = seg.getAttribute('data-value') === pref;
      seg.classList.toggle('is-selected', on);
      seg.setAttribute('aria-checked', String(on));
    });
    appearance.addEventListener('change', function () {
      var sel = $('.as-segment.is-selected', appearance);
      var value = sel ? sel.getAttribute('data-value') : 'auto';
      store.set(THEME_KEY, value === 'auto' ? null : value);
      applyTheme(value);
      if (glass()) glass().refresh();
    });
  }

  /* ------------------------------------------------------------------
     2. Compact navigation: a disclosure (button + list of links), not a
        role="menu" — links keep their native keyboard behaviour.
     ------------------------------------------------------------------ */
  var toggle = $('.menu-toggle');
  var menu = toggle && document.getElementById(toggle.getAttribute('aria-controls'));
  if (toggle && menu) {
    var hideTimer = 0;
    var isOpen = function () { return toggle.getAttribute('aria-expanded') === 'true'; };
    var openMenu = function () {
      clearTimeout(hideTimer);
      menu.hidden = false;
      toggle.setAttribute('aria-expanded', 'true');
      requestAnimationFrame(function () { requestAnimationFrame(function () { menu.classList.add('is-open'); }); });
    };
    var closeMenu = function (restoreFocus) {
      if (!isOpen()) return;
      toggle.setAttribute('aria-expanded', 'false');
      menu.classList.remove('is-open');
      hideTimer = setTimeout(function () { menu.hidden = true; }, reduceMotion.matches ? 0 : 260);
      if (restoreFocus) toggle.focus();
    };
    toggle.addEventListener('click', function () { if (isOpen()) closeMenu(false); else openMenu(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen()) { e.preventDefault(); closeMenu(true); }
    });
    document.addEventListener('pointerdown', function (e) {
      if (isOpen() && !menu.contains(e.target) && !toggle.contains(e.target)) closeMenu(false);
    });
    menu.addEventListener('focusout', function (e) {
      if (e.relatedTarget && !menu.contains(e.relatedTarget) && e.relatedTarget !== toggle) closeMenu(false);
    });
    var wide = window.matchMedia('(min-width: 900px)');
    var onWide = function (e) { if (e.matches) { closeMenu(false); menu.hidden = true; } };
    if (wide.addEventListener) wide.addEventListener('change', onWide); else wide.addListener(onWide);
  }

  /* ------------------------------------------------------------------
     2b. Header over an always-dark band: the scroll edge dims instead of
         washing the band white (HIG Scroll views, soft edge).
     ------------------------------------------------------------------ */
  var header = $('.site-header');
  var darkBands = $all('.band-dark');
  if (header && darkBands.length && 'IntersectionObserver' in window) {
    var overDark = new Set();
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) overDark.add(en.target); else overDark.delete(en.target); });
      header.classList.toggle('is-over-dark', overDark.size > 0);   // glass inside re-samples on scroll by itself
    }, { rootMargin: '0px 0px -92% 0px', threshold: 0 });
    darkBands.forEach(function (b) { io.observe(b); });
  }

  /* ------------------------------------------------------------------
     3. Pricing: billing period radiogroup swaps every [data-monthly][data-yearly]
     ------------------------------------------------------------------ */
  var billing = $('[data-billing]');
  if (billing) {
    var applyBilling = function () {
      var sel = $('.as-segment.is-selected', billing);
      var period = sel ? sel.getAttribute('data-value') : 'yearly';
      $all('[data-monthly][data-yearly]').forEach(function (el) {
        el.textContent = el.getAttribute(period === 'monthly' ? 'data-monthly' : 'data-yearly');
      });
    };
    billing.addEventListener('change', applyBilling);
    applyBilling();
  }

  /* ------------------------------------------------------------------
     4. FAQ: open the question named in the URL, and filter by keyword
     ------------------------------------------------------------------ */
  function openFromHash() {
    var id = decodeURIComponent(location.hash.slice(1));
    if (!id) return;
    var target = document.getElementById(id);
    if (target && target.tagName === 'DETAILS') target.open = true;
  }
  if ($('details.qa')) {
    openFromHash();
    window.addEventListener('hashchange', openFromHash);
  }

  var faqSearch = $('#faq-search');
  if (faqSearch) {
    var groups = $all('[data-faq-group]');
    var count = $('#faq-count');
    var empty = $('#faq-empty');
    var emptyTerm = $('#faq-empty-term');
    var tocLinks = $all('.faq-toc a');
    var items = $all('details.qa').map(function (d) { return { el: d, text: d.textContent.replace(/\s+/g, '').toLowerCase() }; });
    var debounce = 0;
    var runFilter = function () {
      var q = faqSearch.value.trim().toLowerCase();
      var terms = q.split(/\s+/).filter(Boolean);
      var shown = 0;
      items.forEach(function (it) {
        var hit = terms.every(function (t) { return it.text.indexOf(t) !== -1; });
        it.el.hidden = !hit;
        if (hit) shown++;
      });
      groups.forEach(function (g) {
        var any = $all('details.qa', g).some(function (d) { return !d.hidden; });
        g.hidden = !any;
        var link = tocLinks.filter(function (a) { return a.getAttribute('href') === '#' + g.id; })[0];
        if (link) link.parentElement.hidden = !any;
      });
      if (empty) {
        empty.hidden = shown !== 0;
        if (emptyTerm) emptyTerm.textContent = faqSearch.value.trim();
      }
      if (count) count.textContent = q ? (shown ? '找到 ' + shown + ' 个相关问题' : '没有找到相关问题') : '';
    };
    faqSearch.addEventListener('input', function () { clearTimeout(debounce); debounce = setTimeout(runFilter, 180); });
    faqSearch.addEventListener('search', runFilter);
    var clearBtn = $('#faq-clear');
    if (clearBtn) clearBtn.addEventListener('click', function () { faqSearch.value = ''; runFilter(); faqSearch.focus(); });
    var params = new URLSearchParams(location.search);
    if (params.get('q')) { faqSearch.value = params.get('q'); runFilter(); }
  }

  /* ------------------------------------------------------------------
     5. Contact form: validate on blur and on submit, simulate sending
     ------------------------------------------------------------------ */
  var form = $('#contact-form');
  if (form) {
    var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    var MAX = 1000;
    var rules = {
      name: function (v) { return v.trim() ? '' : '请填写称呼，方便我们回复时称呼你。'; },
      email: function (v) {
        if (!v.trim()) return '请填写邮箱地址，我们会把回复发到这里。';
        return EMAIL.test(v.trim()) ? '' : '邮箱格式看起来不对，请检查，例如 name@example.com。';
      },
      topic: function (v) { return v ? '' : '请选择一个主题，好让合适的同事来回复。'; },
      message: function (v) {
        var n = v.trim().length;
        if (!n) return '请写下你想告诉我们的内容。';
        if (n < 10) return '再多写几句吧（至少 10 个字），方便我们了解情况。';
        if (v.length > MAX) return '内容超过 ' + MAX + ' 字，请精简后再发送。';
        return '';
      }
    };
    var touched = {};
    var field = function (name) { return form.elements[name]; };
    var errorEl = function (name) { return document.getElementById(name + '-error'); };
    var validate = function (name) {
      var input = field(name);
      var msg = rules[name](input.value);
      var err = errorEl(name);
      if (msg) {
        input.setAttribute('aria-invalid', 'true');
        err.querySelector('span').textContent = msg;
        err.hidden = false;
      } else {
        input.removeAttribute('aria-invalid');
        err.hidden = true;
      }
      return !msg;
    };
    Object.keys(rules).forEach(function (name) {
      var input = field(name);
      input.addEventListener('blur', function () { if (input.value || touched[name]) { touched[name] = true; validate(name); } });
      input.addEventListener(name === 'topic' ? 'change' : 'input', function () {
        if (input.getAttribute('aria-invalid') === 'true') validate(name);   // clear the error as soon as it is fixed
      });
    });

    var message = field('message');
    var counter = $('#message-count');
    var updateCount = function () {
      var left = MAX - message.value.length;
      counter.textContent = left >= 0 ? '还可输入 ' + left + ' 字' : '已超出 ' + (-left) + ' 字';
      counter.classList.toggle('is-over', left < 0);
    };
    message.addEventListener('input', updateCount);
    updateCount();

    var submit = $('#contact-submit');
    var submitLabel = submit.querySelector('.label');
    var success = $('#contact-success');
    var sending = false;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (sending) return;
      var names = Object.keys(rules);
      var firstInvalid = null;
      names.forEach(function (n) { touched[n] = true; if (!validate(n) && !firstInvalid) firstInvalid = field(n); });
      if (firstInvalid) { firstInvalid.focus(); return; }

      sending = true;
      form.setAttribute('aria-busy', 'true');
      submit.setAttribute('aria-disabled', 'true');
      submitLabel.textContent = '正在发送…';
      var spin = document.createElement('span');
      spin.className = 'spinner'; spin.setAttribute('aria-hidden', 'true');
      submit.insertBefore(spin, submitLabel);

      // No backend: the site is static. Replace this timeout with a fetch()
      // to your form endpoint (see README → 部署).
      setTimeout(function () {
        var d = new Date();
        var ref = 'LL-' + d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
        $('#success-email').textContent = field('email').value.trim();
        $('#success-topic').textContent = field('topic').options[field('topic').selectedIndex].text;
        $('#success-ref').textContent = ref;
        form.hidden = true;
        success.hidden = false;
        var heading = $('h2', success);
        heading.focus();
        sending = false;
        form.removeAttribute('aria-busy');
        submit.removeAttribute('aria-disabled');
        spin.remove();
        submitLabel.textContent = '发送';
      }, 900);
    });

    var again = $('#contact-again');
    if (again) again.addEventListener('click', function () {
      form.reset();
      touched = {};
      Object.keys(rules).forEach(function (n) { field(n).removeAttribute('aria-invalid'); errorEl(n).hidden = true; });
      updateCount();
      success.hidden = true;
      form.hidden = false;
      field('name').focus();
    });

    // Prefill the topic from ?topic=press etc. (links from other pages)
    var topicParam = new URLSearchParams(location.search).get('topic');
    if (topicParam) {
      var opt = $all('option', field('topic')).filter(function (o) { return o.value === topicParam; })[0];
      if (opt) field('topic').value = topicParam;
    }
  }

  /* ------------------------------------------------------------------
     6. Share an article: native share sheet where available, else copy
     ------------------------------------------------------------------ */
  $all('[data-share]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var data = { title: document.title, url: location.href };
      var toast = function (msg) { if (glass()) glass().toast(msg); };
      if (navigator.share) {
        navigator.share(data).catch(function () { /* dismissed */ });
        return;
      }
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(location.href).then(function () { toast('链接已复制'); }, function () { toast('无法复制，请手动复制地址栏中的链接'); });
      } else {
        toast('无法复制，请手动复制地址栏中的链接');
      }
    });
  });

  /* ------------------------------------------------------------------
     7. Liquid Glass runtime: lensing/adaptivity for the navigation layer and
        the segmented controls. Runs last so restored state is picked up.
     ------------------------------------------------------------------ */
  if (glass()) glass().init();
})();
