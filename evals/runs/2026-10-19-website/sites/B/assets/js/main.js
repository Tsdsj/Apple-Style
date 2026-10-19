/* 青柠记账 Lime Ledger · 站点交互
   所有功能都是渐进增强：没有 JS 时页面内容依然完整可读。 */
(function () {
  'use strict';

  const doc = document;
  const root = doc.documentElement;
  const $ = (sel, ctx) => (ctx || doc).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || doc).querySelectorAll(sel));
  const media = (q) => (window.matchMedia ? window.matchMedia(q) : { matches: false, addEventListener() {} });
  const reduceMotion = media('(prefers-reduced-motion: reduce)').matches;

  function onMediaChange(mq, fn) {
    if (mq.addEventListener) mq.addEventListener('change', fn);
    else if (mq.addListener) mq.addListener(fn);
  }

  /* 1. 导航：移动端菜单、滚动描边 ------------------------------------------ */
  const header = $('.site-header');
  const toggle = $('.nav-toggle');
  const menu = $('#nav-menu');

  if (header && toggle && menu) {
    const isOpen = () => toggle.getAttribute('aria-expanded') === 'true';
    const setOpen = (open, restoreFocus) => {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? '关闭菜单' : '打开菜单');
      header.classList.toggle('is-open', open);
      root.classList.toggle('nav-open', open);
      if (!open && restoreFocus) toggle.focus();
    };

    toggle.addEventListener('click', () => setOpen(!isOpen()));
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });

    doc.addEventListener('keydown', (e) => {
      if (!isOpen()) return;
      if (e.key === 'Escape') { setOpen(false, true); return; }
      if (e.key !== 'Tab') return;
      // 菜单展开时把焦点限制在“关闭按钮 + 菜单项”之内
      const focusables = [toggle].concat($$('a[href], button:not([disabled])', menu));
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!header.contains(doc.activeElement)) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    onMediaChange(media('(max-width: 833px)'), (e) => { if (!e.matches) setOpen(false); });
  }

  if (header) {
    let ticking = false;
    const update = () => { header.classList.toggle('is-scrolled', window.scrollY > 4); ticking = false; };
    window.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  /* 2. 外观：自动 / 浅色 / 深色 -------------------------------------------- */
  const THEME_KEY = 'll-theme';
  const themeInputs = $$('input[name="theme"]');
  const themeMetas = $$('meta[name="theme-color"]');

  const readTheme = () => {
    try { return localStorage.getItem(THEME_KEY) || 'auto'; } catch (e) { return 'auto'; }
  };
  const applyTheme = (value) => {
    if (value === 'light' || value === 'dark') root.setAttribute('data-theme', value);
    else root.removeAttribute('data-theme');
    themeMetas.forEach((m) => {
      if (!m.dataset.auto) m.dataset.auto = m.content;
      m.content = value === 'light' ? '#ffffff' : value === 'dark' ? '#000000' : m.dataset.auto;
    });
    themeInputs.forEach((input) => { input.checked = input.value === value; });
  };

  themeInputs.forEach((input) => {
    input.addEventListener('change', () => {
      if (!input.checked) return;
      try {
        if (input.value === 'auto') localStorage.removeItem(THEME_KEY);
        else localStorage.setItem(THEME_KEY, input.value);
      } catch (e) { /* 无法持久化时仅对当前页面生效 */ }
      applyTheme(input.value);
    });
  });
  window.addEventListener('storage', (e) => { if (e.key === THEME_KEY) applyTheme(readTheme()); });
  applyTheme(readTheme());

  /* 3. 滚动渐显 ------------------------------------------------------------ */
  const reveals = $$('.reveal');
  if (reveals.length) {
    if (reduceMotion || !('IntersectionObserver' in window)) {
      reveals.forEach((el) => el.classList.add('is-visible'));
    } else {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      }, { rootMargin: '0px 0px -6% 0px', threshold: 0 });
      reveals.forEach((el) => io.observe(el));
    }
  }

  /* 4. 价格页：按月 / 按年 ------------------------------------------------- */
  const billingInputs = $$('input[name="billing"]');
  if (billingInputs.length) {
    const setBilling = (period) => {
      $$('[data-monthly][data-yearly]').forEach((el) => {
        el.textContent = el.getAttribute('data-' + period);
      });
    };
    billingInputs.forEach((input) => {
      input.addEventListener('change', () => { if (input.checked) setBilling(input.value); });
    });
    const checked = billingInputs.find((i) => i.checked);
    if (checked) setBilling(checked.value);
  }

  /* 5. 常见问题：搜索过滤 + 通过锚点直接展开 ------------------------------- */
  const faqInput = $('#faq-search');
  if (faqInput) {
    const items = $$('.faq-item');
    const groups = $$('.faq-group');
    const empty = $('#faq-empty');
    const status = $('#faq-status');
    const normalize = (s) => s.toLowerCase().replace(/\s+/g, ' ').trim();
    items.forEach((item) => { item.dataset.text = normalize(item.textContent); });

    let timer;
    const filter = () => {
      const terms = normalize(faqInput.value).split(' ').filter(Boolean);
      let count = 0;
      items.forEach((item) => {
        const hit = terms.every((t) => item.dataset.text.indexOf(t) > -1);
        item.hidden = !hit;
        if (hit) count++;
      });
      groups.forEach((g) => { g.hidden = !$$('.faq-item', g).some((i) => !i.hidden); });
      if (empty) empty.hidden = count !== 0;
      if (status) status.textContent = terms.length ? `找到 ${count} 个相关问题` : '';
    };
    faqInput.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(filter, 120); });
    faqInput.addEventListener('search', filter);
  }

  const openFromHash = () => {
    const id = decodeURIComponent(location.hash.slice(1));
    if (!id) return;
    const el = doc.getElementById(id);
    if (el && el.tagName === 'DETAILS') el.open = true;
  };
  openFromHash();
  window.addEventListener('hashchange', openFromHash);

  /* 6. 联系表单：前端校验 + 提交反馈 --------------------------------------
     默认没有后端：校验通过后模拟发送并显示成功状态。
     接入真实服务时，只需给 <form> 加上 data-endpoint="https://…"，
     脚本会以 JSON POST 到该地址，并根据响应显示成功或失败。 */
  const form = $('#contact-form');
  if (form) {
    const success = $('#form-success');
    const alertBox = $('#form-alert');
    const submitBtn = form.querySelector('[type="submit"]');
    const submitLabel = submitBtn.innerHTML;
    const message = form.elements.message;
    const counter = $('#message-count');
    const MAX = 1000;
    let attempted = false;

    const rules = {
      name: (v) => (v.trim() ? '' : '请填写你的称呼。'),
      email: (v) => {
        v = v.trim();
        if (!v) return '请填写邮箱，方便我们回复你。';
        return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : '邮箱格式好像不太对，请检查一下。';
      },
      topic: (v) => (v ? '' : '请选择一个主题。'),
      message: (v) => {
        const len = v.trim().length;
        if (!len) return '请写下你想说的内容。';
        if (len < 10) return '再多写几句吧，至少 10 个字。';
        if (len > MAX) return `内容超出 ${MAX} 字，请精简一下。`;
        return '';
      },
      consent: (v, el) => (el.checked ? '' : '请先阅读并同意隐私政策。'),
    };

    const validate = (name) => {
      const el = form.elements[name];
      const error = rules[name](el.value, el);
      const field = el.closest('.field');
      const errorEl = $('#' + name + '-error');
      field.classList.toggle('is-invalid', Boolean(error));
      if (error) el.setAttribute('aria-invalid', 'true');
      else el.removeAttribute('aria-invalid');
      if (errorEl) errorEl.textContent = error;
      return !error;
    };

    Object.keys(rules).forEach((name) => {
      const el = form.elements[name];
      const live = el.type === 'checkbox' || el.tagName === 'SELECT' ? 'change' : 'input';
      el.addEventListener(live, () => {
        if (attempted || el.closest('.field').classList.contains('is-invalid')) validate(name);
      });
      // 离开已填写的字段时提前校验，空字段不打扰
      if (el.type !== 'checkbox') {
        el.addEventListener('blur', () => { if (el.value.trim()) validate(name); });
      }
    });

    const updateCount = () => {
      if (!counter) return;
      const len = message.value.trim().length;
      counter.textContent = `${len} / ${MAX}`;
      counter.style.color = len > MAX ? 'var(--danger)' : '';
    };
    message.addEventListener('input', updateCount);
    updateCount();

    // 支持从其他页面带入主题，例如 contact.html?topic=billing
    const presetTopic = new URLSearchParams(location.search).get('topic');
    if (presetTopic && form.elements.topic.querySelector(`option[value="${CSS.escape(presetTopic)}"]`)) {
      form.elements.topic.value = presetTopic;
    }

    const setLoading = (loading) => {
      submitBtn.disabled = loading;
      submitBtn.setAttribute('aria-busy', String(loading));
      submitBtn.innerHTML = loading ? '<span class="spinner" aria-hidden="true"></span>正在发送…' : submitLabel;
    };

    const showAlert = (html) => {
      alertBox.innerHTML = html;
      alertBox.hidden = false;
    };

    const showSuccess = (data) => {
      const d = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const ticket = `LL-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${String(Math.floor(1000 + Math.random() * 9000))}`;
      $('#success-email').textContent = (data && data.email) || '你的邮箱';
      $('#success-ticket').textContent = ticket;
      form.hidden = true;
      success.hidden = false;
      const heading = success.querySelector('h2');
      heading.focus();
      success.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
    };

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      attempted = true;
      alertBox.hidden = true;

      // 蜂蜜罐字段被填写：大概率是机器人，静默“成功”
      if (form.elements.website && form.elements.website.value) { showSuccess(); return; }

      const invalid = Object.keys(rules).filter((name) => !validate(name));
      if (invalid.length) {
        showAlert(`还有 ${invalid.length} 处需要修改，请检查标红的内容。`);
        form.elements[invalid[0]].focus();
        return;
      }

      const data = {
        name: form.elements.name.value.trim(),
        email: form.elements.email.value.trim(),
        topic: form.elements.topic.value,
        device: form.elements.device.value,
        message: form.elements.message.value.trim(),
      };
      const endpoint = form.getAttribute('data-endpoint');
      const request = endpoint
        ? fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(data),
        }).then((res) => { if (!res.ok) throw new Error('HTTP ' + res.status); })
        : new Promise((resolve) => setTimeout(resolve, 900));

      setLoading(true);
      request
        .then(() => { setLoading(false); showSuccess(data); })
        .catch(() => {
          setLoading(false);
          showAlert('发送失败了，可能是网络问题。请稍后再试，或直接写信到 <a href="mailto:support@limeledger.example">support@limeledger.example</a>。');
        });
    });

    const again = $('#form-again');
    if (again) {
      again.addEventListener('click', () => {
        form.reset();
        attempted = false;
        $$('.field.is-invalid', form).forEach((f) => f.classList.remove('is-invalid'));
        $$('[aria-invalid]', form).forEach((el) => el.removeAttribute('aria-invalid'));
        updateCount();
        success.hidden = true;
        form.hidden = false;
        form.elements.name.focus();
      });
    }
  }

  /* 7. 文章页：复制链接 ---------------------------------------------------- */
  $$('[data-copy-link]').forEach((btn) => {
    const status = btn.parentNode.querySelector('.copy-status');
    const report = (ok) => {
      if (!status) return;
      status.textContent = ok ? '链接已复制' : '复制失败，请手动复制地址栏中的链接';
      clearTimeout(btn._t);
      btn._t = setTimeout(() => { status.textContent = ''; }, 2600);
    };
    btn.addEventListener('click', () => {
      const url = location.href.split('#')[0];
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(url).then(() => report(true), () => report(false));
        return;
      }
      const ta = doc.createElement('textarea');
      ta.value = url;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
      doc.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = doc.execCommand('copy'); } catch (err) { ok = false; }
      doc.body.removeChild(ta);
      report(ok);
    });
  });

  /* 8. 隐私政策：目录高亮当前章节 ----------------------------------------- */
  const tocLinks = $$('.toc a[href^="#"]');
  if (tocLinks.length && 'IntersectionObserver' in window) {
    const byId = {};
    tocLinks.forEach((a) => { byId[a.getAttribute('href').slice(1)] = a; });
    const setActive = (id) => {
      tocLinks.forEach((a) => { a.classList.remove('is-active'); a.removeAttribute('aria-current'); });
      if (byId[id]) { byId[id].classList.add('is-active'); byId[id].setAttribute('aria-current', 'true'); }
    };
    const tio = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) setActive(entry.target.id); });
    }, { rootMargin: '-12% 0px -72% 0px' });
    Object.keys(byId).forEach((id) => { const el = doc.getElementById(id); if (el) tio.observe(el); });
  }
})();
