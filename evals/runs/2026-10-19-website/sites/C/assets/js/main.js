/*!
 * 青柠记账 Lime Ledger · 站点脚本
 * 无依赖、无网络请求。所有功能在没有 JS 时都有可用的降级：
 * 导航退化为横向滚动链接，价格显示年付并注明月付价，表单显示邮箱地址。
 */
(function () {
  'use strict';

  var root = document.documentElement;
  var THEME_KEY = 'll-theme';

  function $(sel, ctx) {
    return (ctx || document).querySelector(sel);
  }

  function $all(sel, ctx) {
    return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  }

  function storageGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  function storageSet(key, value) {
    try {
      if (value === null) window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, value);
    } catch (e) {
      /* 隐私模式或禁用存储时忽略 */
    }
  }

  /* ---------- 1. 移动端导航 ---------- */
  function initNav() {
    var toggle = $('.nav-toggle');
    var menu = document.getElementById('site-menu');
    var header = $('.site-header');
    if (!toggle || !menu || !header) return;

    var label = toggle.querySelector('.visually-hidden');
    var mq = window.matchMedia('(max-width: 833.98px)');

    function isOpen() {
      return toggle.getAttribute('aria-expanded') === 'true';
    }

    function setOpen(open, restoreFocus) {
      toggle.setAttribute('aria-expanded', String(open));
      if (label) label.textContent = open ? '关闭菜单' : '打开菜单';
      root.classList.toggle('menu-open', open);
      if (open) {
        var first = menu.querySelector('a');
        if (first) window.setTimeout(function () { first.focus(); }, 30);
      } else if (restoreFocus) {
        toggle.focus();
      }
    }

    if (label) label.textContent = '打开菜单';

    toggle.addEventListener('click', function () {
      setOpen(!isOpen());
    });

    menu.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('a')) setOpen(false);
    });

    document.addEventListener('keydown', function (e) {
      if (!isOpen()) return;
      if (e.key === 'Escape') {
        setOpen(false, true);
        return;
      }
      if (e.key !== 'Tab') return;
      // 菜单展开时把焦点限制在页头内
      var focusables = $all('a[href], button:not([disabled])', header).filter(function (el) {
        return el.offsetParent !== null || el === toggle;
      });
      if (!focusables.length) return;
      var first = focusables[0];
      var last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });

    function onChange(e) {
      if (!e.matches && isOpen()) setOpen(false);
    }
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);
  }

  /* ---------- 2. 外观（自动 / 浅色 / 深色） ---------- */
  function initTheme() {
    var inputs = $all('input[name="theme"]');
    var metas = $all('meta[name="theme-color"]');

    function saved() {
      var t = storageGet(THEME_KEY);
      return t === 'light' || t === 'dark' ? t : 'auto';
    }

    function apply(theme) {
      if (theme === 'auto') root.removeAttribute('data-theme');
      else root.setAttribute('data-theme', theme);

      metas.forEach(function (m) {
        if (!m.hasAttribute('data-original')) m.setAttribute('data-original', m.getAttribute('content'));
        var value = theme === 'light' ? '#ffffff' : theme === 'dark' ? '#000000' : m.getAttribute('data-original');
        m.setAttribute('content', value);
      });

      inputs.forEach(function (input) {
        input.checked = input.value === theme;
      });
    }

    apply(saved());

    inputs.forEach(function (input) {
      input.addEventListener('change', function () {
        if (!input.checked) return;
        storageSet(THEME_KEY, input.value === 'auto' ? null : input.value);
        apply(input.value);
      });
    });

    // 多个标签页之间同步
    window.addEventListener('storage', function (e) {
      if (e.key === THEME_KEY) apply(saved());
    });
  }

  /* ---------- 3. 价格页：按月 / 按年 ---------- */
  function initBilling() {
    var inputs = $all('input[name="billing"]');
    if (!inputs.length) return;

    function update(period) {
      $all('[data-monthly][data-yearly]').forEach(function (el) {
        el.textContent = el.getAttribute('data-' + period);
      });
    }

    inputs.forEach(function (input) {
      input.addEventListener('change', function () {
        if (input.checked) update(input.value);
      });
    });

    var checked = inputs.filter(function (i) { return i.checked; })[0];
    update(checked ? checked.value : 'yearly');
  }

  /* ---------- 4. 常见问题：锚点展开 + 搜索 ---------- */
  function openFromHash() {
    var id = window.location.hash.slice(1);
    if (!id) return;
    try {
      id = decodeURIComponent(id);
    } catch (e) {
      return;
    }
    var el = document.getElementById(id);
    if (el && el.tagName === 'DETAILS') {
      el.open = true;
      if (el.hidden) el.hidden = false;
    }
  }

  function initFaq() {
    openFromHash();
    window.addEventListener('hashchange', openFromHash);

    var input = $('#faq-search');
    if (!input) return;

    var items = $all('.faq-item');
    var groups = $all('.faq-group');
    var status = $('#faq-status');
    var empty = $('#faq-empty');
    var timer;

    items.forEach(function (item) {
      item.setAttribute('data-search', item.textContent.toLowerCase().replace(/\s+/g, ' '));
    });

    function filter() {
      var terms = input.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
      var count = 0;

      items.forEach(function (item) {
        var text = item.getAttribute('data-search');
        var match = terms.every(function (t) { return text.indexOf(t) !== -1; });
        item.hidden = !match;
        if (match) count++;
      });

      groups.forEach(function (group) {
        group.hidden = !group.querySelector('.faq-item:not([hidden])');
      });

      if (empty) empty.hidden = count !== 0;
      if (status) {
        status.textContent = terms.length
          ? count ? '找到 ' + count + ' 个相关问题' : '没有找到相关问题'
          : '';
      }
    }

    input.addEventListener('input', function () {
      window.clearTimeout(timer);
      timer = window.setTimeout(filter, 120);
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && input.value) {
        input.value = '';
        filter();
      }
    });

    var clear = $('#faq-clear');
    if (clear) {
      clear.addEventListener('click', function () {
        input.value = '';
        filter();
        input.focus();
      });
    }
  }

  /* ---------- 5. 联系表单（前端校验 + 模拟提交） ---------- */
  function initContact() {
    var form = $('#contact-form');
    if (!form) return;

    var success = $('#form-success');
    var submitBtn = form.querySelector('[type="submit"]');
    var submitLabel = submitBtn ? submitBtn.innerHTML : '';
    var status = $('#form-status');
    var message = form.elements.message;
    var counter = $('#message-counter');
    var maxLen = message ? parseInt(message.getAttribute('maxlength'), 10) || 1000 : 1000;
    var attempted = false;
    var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    var rules = {
      name: function (el) {
        var v = el.value.trim();
        if (!v) return '请填写你的称呼。';
        if (v.length > 40) return '称呼请控制在 40 个字以内。';
        return '';
      },
      email: function (el) {
        var v = el.value.trim();
        if (!v) return '请填写邮箱，方便我们回复你。';
        if (!EMAIL_RE.test(v)) return '邮箱格式好像不太对，例如 name@example.com。';
        return '';
      },
      topic: function (el) {
        return el.value ? '' : '请选择一个主题。';
      },
      message: function (el) {
        var v = el.value.trim();
        if (!v) return '请写下你想告诉我们的内容。';
        if (v.length < 10) return '再多写几个字吧，至少 10 个字。';
        if (v.length > maxLen) return '内容请控制在 ' + maxLen + ' 字以内。';
        return '';
      },
      consent: function (el) {
        return el.checked ? '' : '请先阅读并同意隐私政策。';
      }
    };

    function errorEl(el) {
      return document.getElementById(el.id + '-error');
    }

    function validate(name) {
      var el = form.elements[name];
      if (!el) return true;
      var msg = rules[name](el);
      var err = errorEl(el);
      if (err) err.textContent = msg;
      if (msg) el.setAttribute('aria-invalid', 'true');
      else el.removeAttribute('aria-invalid');
      return !msg;
    }

    function updateCounter() {
      if (!message || !counter) return;
      var len = message.value.length;
      counter.textContent = len + ' / ' + maxLen;
      counter.classList.toggle('is-over', len > maxLen);
    }

    Object.keys(rules).forEach(function (name) {
      var el = form.elements[name];
      if (!el) return;
      var evt = el.type === 'checkbox' || el.tagName === 'SELECT' ? 'change' : 'input';
      el.addEventListener(evt, function () {
        if (attempted || el.getAttribute('aria-invalid') === 'true') validate(name);
      });
      el.addEventListener('blur', function () {
        if (attempted || (el.value && el.type !== 'checkbox')) validate(name);
      });
    });

    if (message) {
      message.addEventListener('input', updateCounter);
      updateCounter();
    }

    // 支持 ?topic=xxx 预选主题（价格页、常见问题等处的链接会带上）
    function presetTopic(value) {
      var select = form.elements.topic;
      if (!select || !value) return;
      for (var i = 0; i < select.options.length; i++) {
        if (select.options[i].value === value) {
          select.value = value;
          break;
        }
      }
    }

    try {
      presetTopic(new URLSearchParams(window.location.search).get('topic'));
    } catch (e) {
      /* 旧浏览器不支持 URLSearchParams 时忽略 */
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      attempted = true;

      var names = Object.keys(rules);
      var invalid = names.filter(function (n) { return !validate(n); });

      if (invalid.length) {
        if (status) status.textContent = '有 ' + invalid.length + ' 项需要修改，请检查标红的内容。';
        form.elements[invalid[0]].focus();
        return;
      }

      // 蜜罐字段：真实用户看不到，被填写时静默丢弃
      var trap = form.elements.website;
      if (trap && trap.value) return;

      if (status) status.textContent = '正在发送…';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner" aria-hidden="true"></span>正在发送…';
      }

      // 此处没有真实后端：上线时把下面的 setTimeout 换成 fetch(表单服务地址)
      window.setTimeout(function () {
        var email = form.elements.email.value.trim();
        var target = $('#success-email');
        if (target) target.textContent = email;
        form.hidden = true;
        if (success) {
          success.hidden = false;
          success.focus();
        }
        if (status) status.textContent = '';
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = submitLabel;
        }
      }, 900);
    });

    var again = $('#form-again');
    if (again) {
      again.addEventListener('click', function () {
        form.reset();
        attempted = false;
        Object.keys(rules).forEach(function (name) {
          var el = form.elements[name];
          if (!el) return;
          el.removeAttribute('aria-invalid');
          var err = errorEl(el);
          if (err) err.textContent = '';
        });
        updateCounter();
        if (success) success.hidden = true;
        form.hidden = false;
        form.elements.name.focus();
      });
    }
  }

  /* ---------- 6. 文章页：复制链接 ---------- */
  function initCopyLink() {
    $all('[data-copy-link]').forEach(function (btn) {
      var original = btn.textContent;
      btn.addEventListener('click', function () {
        var url = window.location.href.split('#')[0];
        function done(ok) {
          btn.textContent = ok ? '已复制链接' : '复制失败，请手动复制地址栏';
          window.setTimeout(function () { btn.textContent = original; }, 2000);
        }
        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(url).then(function () { done(true); }, function () { done(fallbackCopy(url)); });
        } else {
          done(fallbackCopy(url));
        }
      });
    });
  }

  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try {
      ok = document.execCommand('copy');
    } catch (e) {
      ok = false;
    }
    document.body.removeChild(ta);
    return ok;
  }

  function init() {
    initNav();
    initTheme();
    initBilling();
    initFaq();
    initContact();
    initCopyLink();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
