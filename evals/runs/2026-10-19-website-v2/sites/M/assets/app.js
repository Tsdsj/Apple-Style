/* Tidepool docs: theme toggle, mobile menu, copy buttons, TOC highlighting. */
(function () {
  "use strict";

  var root = document.documentElement;
  var KEY = "tidepool-theme";

  function storedTheme() {
    try {
      var v = localStorage.getItem(KEY);
      return v === "light" || v === "dark" ? v : null;
    } catch (e) {
      return null;
    }
  }

  function saveTheme(value) {
    try {
      localStorage.setItem(KEY, value);
    } catch (e) {
      /* Storage unavailable (private window, blocked site data): the choice lasts for this page only. */
    }
  }

  function currentTheme() {
    var explicit = root.getAttribute("data-theme");
    if (explicit === "light" || explicit === "dark") return explicit;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  /* Theme toggle */
  var themeBtn = document.getElementById("theme-toggle");

  function labelTheme() {
    if (!themeBtn) return;
    var next = currentTheme() === "dark" ? "light" : "dark";
    themeBtn.textContent = next === "dark" ? "Dark mode" : "Light mode";
    themeBtn.setAttribute("aria-label", "Switch to " + next + " theme");
  }

  if (themeBtn) {
    labelTheme();
    themeBtn.addEventListener("click", function () {
      var next = currentTheme() === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      saveTheme(next);
      labelTheme();
    });
    if (window.matchMedia) {
      var mq = window.matchMedia("(prefers-color-scheme: dark)");
      var onScheme = function () {
        if (!storedTheme()) labelTheme();
      };
      if (mq.addEventListener) mq.addEventListener("change", onScheme);
    }
  }

  /* Mobile menu */
  var menuBtn = document.querySelector(".menu-btn");
  var sidebar = document.getElementById("sidebar");

  function setMenu(open) {
    if (!menuBtn || !sidebar) return;
    sidebar.classList.toggle("open", open);
    menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    menuBtn.textContent = open ? "Close" : "Menu";
  }

  if (menuBtn && sidebar) {
    menuBtn.addEventListener("click", function () {
      setMenu(!sidebar.classList.contains("open"));
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && sidebar.classList.contains("open")) {
        setMenu(false);
        menuBtn.focus();
      }
    });
    sidebar.addEventListener("click", function (e) {
      if (e.target.closest("a") && window.innerWidth < 900) setMenu(false);
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth >= 900) setMenu(false);
    });
  }

  /* Copy buttons on code blocks */
  if (navigator.clipboard) {
    document.querySelectorAll(".code").forEach(function (wrap) {
      var pre = wrap.querySelector("pre");
      if (!pre) return;
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "copy-btn";
      btn.textContent = "Copy";
      btn.setAttribute("aria-label", "Copy code block");
      btn.addEventListener("click", function () {
        try {
          navigator.clipboard.writeText(pre.innerText).then(
            function () { btn.textContent = "Copied"; setTimeout(function () { btn.textContent = "Copy"; }, 1600); },
            function () { btn.textContent = "Failed"; }
          );
        } catch (e) {
          btn.textContent = "Failed";
        }
      });
      wrap.appendChild(btn);
    });
  }

  /* Highlight the current section in the desktop "On this page" list */
  var tocLinks = document.querySelectorAll(".toc a[href^='#']");
  if (tocLinks.length) {
    var items = [];
    tocLinks.forEach(function (a) {
      var h = document.getElementById(a.getAttribute("href").slice(1));
      if (h) items.push({ heading: h, link: a });
    });
    var ticking = false;
    function updateToc() {
      ticking = false;
      var current = null;
      items.forEach(function (it) {
        if (it.heading.getBoundingClientRect().top <= 160) current = it;
      });
      tocLinks.forEach(function (a) {
        a.classList.remove("active");
        a.removeAttribute("aria-current");
      });
      if (current) {
        current.link.classList.add("active");
        current.link.setAttribute("aria-current", "true");
      }
    }
    window.addEventListener("scroll", function () {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(updateToc);
      }
    }, { passive: true });
    updateToc();
  }
})();
