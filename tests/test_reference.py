import importlib.util, json, pathlib, tempfile, unittest, sys
SCRIPT = pathlib.Path(__file__).resolve().parents[1]/'skills/Apple-Style/scripts'
sys.path.insert(0, str(SCRIPT))
import docc2md
class Parser(unittest.TestCase):
    def test_empty_document_rejected(self):
        with self.assertRaises(ValueError): docc2md.render({})
    def test_title_only_document_rejected(self):
        with self.assertRaises(ValueError): docc2md.render({'metadata': {'title': 'Oops'}})
import update_reference as updater
from unittest.mock import patch
from urllib.error import HTTPError, URLError
FIXTURES = pathlib.Path(__file__).parent/'fixtures/reference'
class Update(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.ref = pathlib.Path(self.tmp.name)/'reference'; self.ref.mkdir()
        self.sources = []
        for directory, kind, fixture in [('hig','docc','docc.json'), ('liquid-glass/api','docc','docc.json'), ('design-site','html','design.html'), ('wwdc25','transcript','transcript.html')]:
            path = directory+'/fixture.md'; dest = self.ref/path; dest.parent.mkdir(parents=True,exist_ok=True); dest.write_text('valid old content')
            self.sources.append(dict(path=path,kind=kind,url='https://developer.apple.com/'+directory+'/fixture',fetch_url='https://developer.apple.com/'+fixture,sha256=updater.digest(dest.read_bytes()),fetched_at=None))
        (self.ref/'sources.json').write_text(json.dumps({'schema':1,'sources':self.sources}))
    def tearDown(self): self.tmp.cleanup()
    def fetch(self,url): return (FIXTURES/url.rsplit('/',1)[-1]).read_bytes()
    def snapshot(self): return {str(p.relative_to(self.ref)):p.read_bytes() for p in self.ref.rglob('*') if p.is_file()}
    def test_all_categories_metadata_and_index(self):
        result = updater.update(self.ref, discover=False, fetcher=self.fetch)
        self.assertTrue(result['applied']); self.assertEqual(len(result['modified']),4)
        manifest=json.loads((self.ref/'sources.json').read_text())
        for source in manifest['sources']:
            self.assertEqual(source['sha256'],updater.digest((self.ref/source['path']).read_bytes()))
            self.assertTrue(source['fetched_at']); self.assertIn('source_sha256',source)
            self.assertIn(source['path'],(self.ref/'INDEX.md').read_text())
    def test_errors_preserve_every_file(self):
        errors=[HTTPError('url',404,'Not Found',None,None),URLError('offline'),TimeoutError('timeout'),b'{invalid',b'{}',b'<html>error</html>']
        for failure in errors:
            with self.subTest(failure=str(failure)):
                before=self.snapshot()
                def bad(url):
                    if isinstance(failure,Exception): raise failure
                    return failure
                result=updater.update(self.ref,fetcher=bad)
                self.assertFalse(result['applied']); self.assertTrue(result['failed']); self.assertEqual(before,self.snapshot())
    def test_partial_success_is_not_committed(self):
        before=self.snapshot()
        def partial(url):
            if url.endswith('design.html'): raise URLError('offline')
            return self.fetch(url)
        result=updater.update(self.ref,discover=False,fetcher=partial)
        self.assertFalse(result['applied']); self.assertEqual(before,self.snapshot())
    def test_discovery_adds_page(self):
        def fetch(url): return (FIXTURES/'docc.json').read_bytes() if url.endswith('.json') else self.fetch(url)
        result=updater.update(self.ref,fetcher=fetch)
        self.assertIn('hig/new-fixture.md',result['added']); self.assertTrue((self.ref/'hig/new-fixture.md').exists())
    def test_failed_commit_rolls_back(self):
        before=self.snapshot(); original=updater.os.replace
        def fail(src,dst):
            if pathlib.Path(src).name=='next': raise OSError('simulated commit failure')
            return original(src,dst)
        with patch.object(updater.os,'replace',side_effect=fail):
            with self.assertRaises(OSError): updater.update(self.ref,discover=False,fetcher=self.fetch)
        self.assertEqual(before,self.snapshot())
    def test_path_traversal_rejected(self):
        self.sources[0]['path']='../escape.md'
        (self.ref/'sources.json').write_text(json.dumps({'sources':self.sources}))
        with self.assertRaises(ValueError): updater.update(self.ref,fetcher=self.fetch)
