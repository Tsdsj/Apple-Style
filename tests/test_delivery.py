import hashlib,importlib.util,json,pathlib,posixpath,re,subprocess,tempfile,unittest
from html.parser import HTMLParser
REPO=pathlib.Path(__file__).resolve().parents[1]
EXAMPLE='skills/Apple-Style/web/examples/site'
URL_ATTRS={'href','src','poster'}
_spec=importlib.util.spec_from_file_location('relativize_site',REPO/'scripts/relativize-site.py')
relativize_site=importlib.util.module_from_spec(_spec); _spec.loader.exec_module(relativize_site)
class _URLs(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True); self.found=[]
    def handle_starttag(self,tag,attrs):
        for name,value in attrs:
            if name in URL_ATTRS and value is not None: self.found.append((tag,name,value))
def local_urls(text):
    parser=_URLs(); parser.feed(text); return [v for _,_,v in parser.found if not re.match(r'^([a-z][a-z0-9+.-]*:|//|#)',v,re.I)]
def resolves(site,file_rel,url):
    path=re.split(r'[?#]',url,maxsplit=1)[0]
    target=posixpath.normpath(posixpath.join(posixpath.dirname(file_rel),path))
    if path=='' or path.endswith('/'): target=posixpath.join(target,'index.html')
    return (site/target).is_file()
class Delivery(unittest.TestCase):
    def test_manifest_hashes_and_index_cover_all_reference_files(self):
        root=REPO/'skills/Apple-Style-HIG/reference'
        sources=json.loads((root/'sources.json').read_text())['sources']
        paths={s['path'] for s in sources}
        self.assertEqual(paths,{p.relative_to(root).as_posix() for p in root.rglob('*.md') if p.name!='INDEX.md'})
        index=(root/'INDEX.md').read_text()
        for s in sources:
            self.assertEqual(hashlib.sha256((root/s['path']).read_bytes()).hexdigest(),s['sha256'],s['path'])
            self.assertIn('('+s['path']+')',index)
    def test_static_package_excludes_reference_and_preserves_runtime(self):
        with tempfile.TemporaryDirectory() as tmp:
            site=pathlib.Path(tmp)/'site'
            result=subprocess.run(['bash',str(REPO/'scripts/prepare-demo.sh'),str(site)],capture_output=True,text=True)
            self.assertEqual(result.returncode,0,result.stderr)
            for file in ['demo/index.html','demo/i18n.js','index.html','skills/Apple-Style/web/demo-desktop.html','skills/Apple-Style/web/apple-style.css','skills/Apple-Style/web/apple-style.min.css','skills/Apple-Style/web/liquid-glass.js','skills/Apple-Style/web/liquid-glass.mjs',
                         'skills/Apple-Style/web/examples/site/css/base.css','skills/Apple-Style/web/examples/site/css/landing.css','skills/Apple-Style/web/examples/site/css/site.css','skills/Apple-Style/web/examples/site/js/site-nav.js','skills/Apple-Style/web/examples/site/js/site-form.js','skills/Apple-Style/web/examples/site/img/hero-1200.avif','skills/Apple-Style/web/examples/site/video/loop.webm']:
                self.assertEqual((site/file).read_bytes(),(REPO/file).read_bytes())
            self.assertFalse((site/'skills/Apple-Style-HIG').exists())
            self.assertFalse((site/'skills/Apple-Style/web/examples/site/liquid-glass.js').exists())
            self.assertEqual(sorted(p.name for p in (site/'skills/Apple-Style/web/examples/site/js').iterdir()), sorted(p.name for p in (REPO/'skills/Apple-Style/web/examples/site/js').iterdir()))
            self.assertFalse((site/'.claude').exists())
            # The example's HTML is rewritten to relative paths; the rest of its files are byte-identical.
            for html in (REPO/EXAMPLE).rglob('*.html'):
                rel=html.relative_to(REPO).as_posix()
                expected=relativize_site.relativize_html(html.read_bytes().decode('utf-8'),posixpath.dirname(html.relative_to(REPO/EXAMPLE).as_posix()) or '.')
                self.assertEqual((site/rel).read_bytes().decode('utf-8'),expected,rel)
            self.assertTrue((site/'index.html').exists())
            again=subprocess.run(['bash',str(REPO/'scripts/prepare-demo.sh'),str(site)],capture_output=True)
            self.assertNotEqual(again.returncode,0)
    def test_packaged_landing_links_resolve_and_reference_site_has_no_root_relative_urls(self):
        with tempfile.TemporaryDirectory() as tmp:
            site=pathlib.Path(tmp)/'site'
            result=subprocess.run(['bash',str(REPO/'scripts/prepare-demo.sh'),str(site)],capture_output=True,text=True)
            self.assertEqual(result.returncode,0,result.stderr)
            landing=(site/'index.html').read_text(encoding='utf-8')
            hrefs=re.findall(r'<a class="card-link" href="([^"]+)" data-card-link="([a-z]+)"',landing)
            self.assertEqual(sorted(card for _,card in hrefs),['site','workbench'])
            targets={card:href for href,card in hrefs}
            self.assertEqual(targets['site'],EXAMPLE+'/')
            self.assertEqual(targets['workbench'],'demo/index.html')
            for href in targets.values():
                self.assertTrue(resolves(site,'index.html',href),href)
            for url in local_urls(landing):
                self.assertTrue(resolves(site,'index.html',url),url)
            self.assertTrue((site/'demo/index.html').is_file())
            # The landing text must exist in both locales of the shared dictionary.
            i18n=(REPO/'demo/i18n.js').read_text(encoding='utf-8')
            zh_part,en_part=i18n.split('  en: {',1)
            zh_keys=set(re.findall(r"'([A-Za-z0-9_.-]+)':",zh_part)); en_keys=set(re.findall(r"'([A-Za-z0-9_.-]+)':",en_part))
            used=set(re.findall(r'data-i18n="([^"]+)"',landing))
            self.assertTrue(used,'landing has no translated text')
            self.assertEqual(sorted(used-zh_keys),[])
            self.assertEqual(sorted(used-en_keys),[])
            for html in sorted((site/EXAMPLE).rglob('*.html')):
                rel=html.relative_to(site).as_posix()
                text=html.read_text(encoding='utf-8')
                for attr in ['href="/','src="/','srcset="/','action="/','poster="/']:
                    self.assertNotIn(attr,text,rel)
                for url in local_urls(text):
                    self.assertTrue(resolves(site,rel,url),rel+' -> '+url)
