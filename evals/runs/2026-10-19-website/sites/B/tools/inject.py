# 把公共的 <head> 片段、页头、页脚注入到站点每个 HTML 文件的标记之间（可重复运行）。
import re, sys, pathlib, html
ROOT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else pathlib.Path(__file__).resolve().parent.parent)
SITE = "https://www.limeledger.example"

NAV = [("features", "features.html", "功能"), ("pricing", "pricing.html", "价格"),
       ("blog", "blog/index.html", "博客"), ("faq", "faq.html", "常见问题"),
       ("about", "about.html", "关于"), ("contact", "contact.html", "联系我们")]

def canonical_path(rel):
    if rel == "index.html": return "/"
    if rel.endswith("/index.html"): return "/" + rel[:-len("index.html")]
    return "/" + rel

def build(rel, src):
    is404 = rel == "404.html"
    depth = rel.count("/")
    p = "/" if is404 else "../" * depth
    home = "/" if is404 else p + "index.html"
    download = "#download" if rel == "index.html" else (("/" if is404 else p + "index.html") + "#download")
    m = re.search(r'<body[^>]*data-nav="([^"]*)"', src); cur = m.group(1) if m else ""
    title = html.unescape(re.search(r"<title>(.*?)</title>", src, re.S).group(1).strip())
    desc = html.unescape(re.search(r'<meta name="description" content="([^"]*)"', src).group(1))
    ogtype = "article" if rel.startswith("blog/") and rel != "blog/index.html" else "website"
    esc = lambda s: html.escape(s, quote=True)

    head = f'''
<meta name="color-scheme" content="light dark">
<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)">
<link rel="icon" href="{p}favicon.svg" type="image/svg+xml">
<link rel="icon" href="{p}assets/img/icon-192.png" type="image/png" sizes="192x192">
<link rel="apple-touch-icon" href="{p}apple-touch-icon.png">
<link rel="manifest" href="{p}site.webmanifest">
<link rel="alternate" type="application/atom+xml" title="青柠记账博客" href="{p}blog/feed.xml">
<link rel="stylesheet" href="{p}assets/css/style.css">
<script src="{p}assets/js/theme.js"></script>
<script src="{p}assets/js/main.js" defer></script>
'''
    if is404:
        head += '<meta name="robots" content="noindex">\n'
    else:
        url = SITE + canonical_path(rel)
        head += f'''<link rel="canonical" href="{url}">
<meta property="og:type" content="{ogtype}">
<meta property="og:site_name" content="青柠记账 Lime Ledger">
<meta property="og:locale" content="zh_CN">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{SITE}/assets/img/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="青柠记账：记账，本该这么轻">
<meta name="twitter:card" content="summary_large_image">
'''
    links = []
    for key, href, label in NAV:
        attr = ""
        if key == cur:
            exact = (rel == href)
            attr = ' aria-current="page"' if exact else ' aria-current="true"'
        links.append(f'        <li><a href="{p}{href}"{attr}>{label}</a></li>')
    links = "\n".join(links)

    header = f'''
<a class="skip-link" href="#main">跳到主要内容</a>
<header class="site-header">
  <nav class="nav container" aria-label="主导航">
    <a class="brand" href="{home}"><img class="brand__mark" src="{p}assets/img/icon.svg" alt="" width="26" height="26"><span>青柠记账</span></a>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="nav-menu" aria-label="打开菜单"><span class="nav-toggle__bar"></span><span class="nav-toggle__bar"></span></button>
    <div class="nav-menu" id="nav-menu">
      <ul class="nav-links">
{links}
      </ul>
      <a class="btn btn-primary btn-sm nav-cta" href="{download}">免费下载</a>
    </div>
  </nav>
</header>
'''
    footer = f'''
<footer class="site-footer">
  <div class="container">
    <div class="footer-top">
      <div class="footer-brand">
        <a class="brand" href="{home}"><img class="brand__mark" src="{p}assets/img/icon.svg" alt="" width="26" height="26"><span>青柠记账</span></a>
        <p>为 iPhone 与 Mac 设计的记账应用。让记账变轻，让生活更从容。</p>
      </div>
      <nav class="footer-nav" aria-label="页脚导航">
        <div>
          <h2>产品</h2>
          <ul><li><a href="{p}features.html">功能</a></li><li><a href="{p}pricing.html">价格</a></li><li><a href="{download}">下载</a></li></ul>
        </div>
        <div>
          <h2>支持</h2>
          <ul><li><a href="{p}faq.html">常见问题</a></li><li><a href="{p}contact.html">联系我们</a></li></ul>
        </div>
        <div>
          <h2>公司</h2>
          <ul><li><a href="{p}about.html">关于我们</a></li><li><a href="{p}blog/index.html">博客</a></li><li><a href="{p}blog/feed.xml">RSS 订阅</a></li></ul>
        </div>
        <div>
          <h2>法律</h2>
          <ul><li><a href="{p}privacy.html">隐私政策</a></li><li><a href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/" rel="noopener">最终用户许可协议</a></li></ul>
        </div>
      </nav>
    </div>
    <div class="footer-bottom">
      <div class="footer-legal">
        <p>© 2026 青柠工作室 Lime Ledger Studio。保留所有权利。</p>
        <p>Apple、iPhone、Mac、iCloud、App Store 和面容 ID 是 Apple Inc. 的商标。</p>
      </div>
      <fieldset class="theme-switch js-only">
        <legend class="sr-only">外观</legend>
        <span class="theme-switch__label" aria-hidden="true">外观</span>
        <span class="segmented">
          <input type="radio" name="theme" id="theme-auto" value="auto" checked><label for="theme-auto">自动</label>
          <input type="radio" name="theme" id="theme-light" value="light"><label for="theme-light">浅色</label>
          <input type="radio" name="theme" id="theme-dark" value="dark"><label for="theme-dark">深色</label>
        </span>
      </fieldset>
    </div>
  </div>
</footer>
'''
    for name, block in (("head", head), ("header", header), ("footer", footer)):
        pat = re.compile(r"<!-- inject:%s -->.*?<!-- /inject:%s -->" % (name, name), re.S)
        if not pat.search(src):
            raise SystemExit(f"{rel}: missing inject:{name}")
        src = pat.sub(lambda _m: f"<!-- inject:{name} -->{block}<!-- /inject:{name} -->", src, count=1)
    return src

for f in sorted(ROOT.rglob("*.html")):
    rel = f.relative_to(ROOT).as_posix()
    if rel.startswith((".qa", "node_modules", "tools/")): continue
    s = f.read_text("utf-8")
    out = build(rel, s)
    if out != s:
        f.write_text(out, "utf-8")
    print("ok", rel)
