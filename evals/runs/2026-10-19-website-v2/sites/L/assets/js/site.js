/* 青柠记账官网 · 交互脚本
 * 渐进增强：没有 JS 时，所有内容与导航仍可正常阅读与使用。
 * 所有 localStorage 读写都包在 try/catch 中，存储不可用时页面照常工作。
 */
(function () {
  'use strict';

  var root = document.documentElement;
  root.classList.remove('no-js');
  root.classList.add('js');

  function safeGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  function safeSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (e) {
      /* 隐私模式或存储被禁用时忽略 */
    }
  }

  /* ---------- 移动端导航 ---------- */
  var navToggle = document.querySelector('.nav-toggle');
  var navMenu = document.getElementById('nav-links');

  if (navToggle && navMenu) {
    var toggleLabel = navToggle.querySelector('.sr-only');

    var setMenuOpen = function (open) {
      navToggle.setAttribute('aria-expanded', String(open));
      navMenu.classList.toggle('is-open', open);
      if (toggleLabel) toggleLabel.textContent = open ? '关闭菜单' : '打开菜单';
    };

    navToggle.addEventListener('click', function () {
      setMenuOpen(navToggle.getAttribute('aria-expanded') !== 'true');
    });

    navMenu.addEventListener('click', function (event) {
      if (event.target.closest && event.target.closest('a')) setMenuOpen(false);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && navToggle.getAttribute('aria-expanded') === 'true') {
        setMenuOpen(false);
        navToggle.focus();
      }
    });

    window.matchMedia('(min-width: 761px)').addEventListener('change', function (event) {
      if (event.matches) setMenuOpen(false);
    });
  }

  /* ---------- 外观：跟随系统 / 浅色 / 深色 ---------- */
  var THEME_MODES = ['system', 'light', 'dark'];
  var THEME_NAMES = { system: '跟随系统', light: '浅色', dark: '深色' };
  var themeButton = document.querySelector('[data-theme-toggle]');
  var themeMode = safeGet('ll-theme');
  if (THEME_MODES.indexOf(themeMode) === -1) themeMode = 'system';

  var applyTheme = function (mode) {
    if (mode === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', mode);
    }
    if (themeButton) themeButton.textContent = '外观：' + THEME_NAMES[mode];
  };

  applyTheme(themeMode);

  if (themeButton) {
    themeButton.addEventListener('click', function () {
      themeMode = THEME_MODES[(THEME_MODES.indexOf(themeMode) + 1) % THEME_MODES.length];
      safeSet('ll-theme', themeMode);
      applyTheme(themeMode);
    });
  }

  /* ---------- 价格：按月 / 按年 ---------- */
  var billingButtons = document.querySelectorAll('[data-billing]');

  billingButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      var cycle = button.getAttribute('data-billing');
      billingButtons.forEach(function (other) {
        other.setAttribute('aria-pressed', String(other === button));
      });
      document.querySelectorAll('[data-month][data-year]').forEach(function (el) {
        el.textContent = el.getAttribute('data-' + cycle);
      });
    });
  });

  /* ---------- 联系表单：本地校验与反馈（不发送任何数据） ---------- */
  var form = document.getElementById('contact-form');

  if (form) {
    var formStatus = document.getElementById('form-status');
    var submitButton = form.querySelector('button[type="submit"]');
    var submitText = submitButton.textContent;

    var fields = [
      {
        el: document.getElementById('name'),
        check: function (el) {
          return el.value.trim() ? '' : '请填写你的姓名。';
        }
      },
      {
        el: document.getElementById('email'),
        check: function (el) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim())
            ? ''
            : '请输入有效的邮箱地址，例如 name@example.com。';
        }
      },
      {
        el: document.getElementById('topic'),
        check: function (el) {
          return el.value ? '' : '请选择一个留言主题。';
        }
      },
      {
        el: document.getElementById('message'),
        check: function (el) {
          return el.value.trim().length >= 10
            ? ''
            : '请至少写 10 个字，方便我们理解你的问题。';
        }
      },
      {
        el: document.getElementById('consent'),
        check: function (el) {
          return el.checked ? '' : '提交前请先阅读并同意隐私政策。';
        }
      }
    ];

    var showError = function (field, message) {
      var errorEl = document.getElementById(field.id + '-error');
      if (message) {
        field.setAttribute('aria-invalid', 'true');
        errorEl.textContent = message;
        errorEl.hidden = false;
      } else {
        field.removeAttribute('aria-invalid');
        errorEl.textContent = '';
        errorEl.hidden = true;
      }
    };

    var validateField = function (item) {
      var message = item.check(item.el);
      showError(item.el, message);
      return message;
    };

    fields.forEach(function (item) {
      var eventName = item.el.tagName === 'SELECT' || item.el.type === 'checkbox' ? 'change' : 'input';
      item.el.addEventListener(eventName, function () {
        if (item.el.getAttribute('aria-invalid') === 'true') validateField(item);
      });
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();

      var firstInvalid = null;
      fields.forEach(function (item) {
        if (validateField(item) && !firstInvalid) firstInvalid = item.el;
      });

      formStatus.classList.remove('is-success');
      formStatus.textContent = '';

      if (firstInvalid) {
        firstInvalid.focus();
        return;
      }

      submitButton.disabled = true;
      submitButton.textContent = '正在提交…';

      window.setTimeout(function () {
        form.reset();
        fields.forEach(function (item) {
          showError(item.el, '');
        });
        submitButton.disabled = false;
        submitButton.textContent = submitText;
        formStatus.classList.add('is-success');
        formStatus.textContent = '感谢你的留言，我们已经收到。通常会在 1 个工作日内回复你。';
      }, 700);
    });
  }
})();
