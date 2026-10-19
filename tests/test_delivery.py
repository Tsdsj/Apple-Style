import hashlib,json,pathlib,subprocess,tempfile,unittest
REPO=pathlib.Path(__file__).resolve().parents[1]
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
            for file in ['demo/index.html','skills/Apple-Style/web/demo-desktop.html','skills/Apple-Style/web/apple-style.css','skills/Apple-Style/web/apple-style.min.css','skills/Apple-Style/web/liquid-glass.js','skills/Apple-Style/web/liquid-glass.mjs',
                         'skills/Apple-Style/web/examples/site/index.html','skills/Apple-Style/web/examples/site/contact.html','skills/Apple-Style/web/examples/site/404.html','skills/Apple-Style/web/examples/site/css/base.css','skills/Apple-Style/web/examples/site/css/landing.css','skills/Apple-Style/web/examples/site/css/site.css','skills/Apple-Style/web/examples/site/js/site-nav.js','skills/Apple-Style/web/examples/site/js/site-form.js','skills/Apple-Style/web/examples/site/img/hero-1200.avif','skills/Apple-Style/web/examples/site/video/loop.webm']:
                self.assertEqual((site/file).read_bytes(),(REPO/file).read_bytes())
            self.assertFalse((site/'skills/Apple-Style-HIG').exists())
            self.assertFalse((site/'skills/Apple-Style/web/examples/site/liquid-glass.js').exists())
            self.assertEqual(sorted(p.name for p in (site/'skills/Apple-Style/web/examples/site/js').iterdir()), sorted(p.name for p in (REPO/'skills/Apple-Style/web/examples/site/js').iterdir()))
            self.assertFalse((site/'.claude').exists())
            self.assertTrue((site/'index.html').exists())
            again=subprocess.run(['bash',str(REPO/'scripts/prepare-demo.sh'),str(site)],capture_output=True)
            self.assertNotEqual(again.returncode,0)
