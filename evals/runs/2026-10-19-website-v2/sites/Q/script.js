/* Northline — 主题切换与价格周期切换。无依赖，页面在 JS 关闭时仍可阅读。 */
(function () {
  "use strict";

  var root = document.documentElement;
  var STORAGE_KEY = "northline-theme";
  var systemDark = window.matchMedia("(prefers-color-scheme: dark)");

  /* ---------- 主题 ---------- */
  var themeToggle = document.getElementById("theme-toggle");

  function currentTheme() {
    if (root.dataset.theme === "dark" || root.dataset.theme === "light") {
      return root.dataset.theme;
    }
    return systemDark.matches ? "dark" : "light";
  }

  function syncThemeToggle() {
    if (!themeToggle) return;
    var target = currentTheme() === "dark" ? "浅色" : "深色";
    themeToggle.setAttribute("aria-label", "切换到" + target + "模式");
    themeToggle.setAttribute("title", "切换到" + target + "模式");
  }

  function setTheme(theme) {
    root.dataset.theme = theme;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (e) {
      /* 隐私模式或禁用存储时忽略，本次会话内仍生效 */
    }
    syncThemeToggle();
  }

  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      setTheme(currentTheme() === "dark" ? "light" : "dark");
    });
  }

  if (systemDark.addEventListener) {
    systemDark.addEventListener("change", syncThemeToggle);
  }
  syncThemeToggle();

  /* ---------- 价格周期 ---------- */
  var billingButtons = document.querySelectorAll("[data-billing]");
  var priceAmounts = document.querySelectorAll("[data-price-monthly]");
  var billingNotes = document.querySelectorAll("[data-billing-note]");

  function setBilling(mode) {
    Array.prototype.forEach.call(billingButtons, function (btn) {
      var active = btn.getAttribute("data-billing") === mode;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", String(active));
    });

    Array.prototype.forEach.call(priceAmounts, function (el) {
      el.textContent = mode === "yearly" ? el.getAttribute("data-price-yearly") : el.getAttribute("data-price-monthly");
    });

    Array.prototype.forEach.call(billingNotes, function (el) {
      el.textContent = mode === "yearly" ? el.getAttribute("data-yearly-note") : el.getAttribute("data-monthly-note");
    });
  }

  Array.prototype.forEach.call(billingButtons, function (btn) {
    btn.addEventListener("click", function () {
      setBilling(btn.getAttribute("data-billing"));
    });
  });
})();
