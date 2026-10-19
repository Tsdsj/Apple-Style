import importlib.util, json, pathlib, subprocess, tempfile, unittest, sys
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
import transcript
class Maintenance(unittest.TestCase):
    def test_transcript_event_comes_from_the_page_or_url(self):
        body = (FIXTURES/'transcript.html').read_text()
        self.assertEqual(transcript.render(body).splitlines()[0], '# Meet the fixture')
        canonical = '<link rel="canonical" href="https://developer.apple.com/videos/play/wwdc2026/204/" />' + body
        self.assertEqual(transcript.render(canonical).splitlines()[0], '# Meet the fixture (WWDC26)')
        self.assertEqual(transcript.render(body, 'https://developer.apple.com/videos/play/wwdc2025/219/').splitlines()[0], '# Meet the fixture (WWDC25)')
    def test_new_event_directory_is_accepted_and_indexed(self):
        with tempfile.TemporaryDirectory() as tmp:
            ref = pathlib.Path(tmp)/'reference'; (ref/'wwdc26').mkdir(parents=True)
            (ref/'wwdc26/204-webkit.md').write_text('old')
            source = dict(path='wwdc26/204-webkit.md', kind='transcript', url='https://developer.apple.com/videos/play/wwdc2026/204/',
                          fetch_url='https://developer.apple.com/videos/play/wwdc2026/204/', sha256=None, fetched_at=None)
            (ref/'sources.json').write_text(json.dumps({'schema': 1, 'sources': [source]}))
            result = updater.update(ref, discover=False, fetcher=lambda url: (FIXTURES/'transcript.html').read_bytes(), cheatsheets=tmp)
            self.assertTrue(result['applied'])
            self.assertTrue((ref/'wwdc26/204-webkit.md').read_text().startswith('# Meet the fixture (WWDC26)'))
            self.assertIn('## wwdc26', (ref/'INDEX.md').read_text())
        with self.assertRaises(ValueError):
            updater.validate_source(dict(source, path='videos/204.md'))
    def test_recheck_lists_only_cheatsheets_citing_changed_pages(self):
        with tempfile.TemporaryDirectory() as tmp:
            sheets = pathlib.Path(tmp)
            (sheets/'cites-path.md').write_text('Rule (`hig/fixture.md`).')
            (sheets/'cites-session.md').write_text('See WWDC25 219 for the anatomy.')
            (sheets/'cites-name.md').write_text('Source: HIG *Fixture*, *Other page*.')
            (sheets/'unrelated.md').write_text('Nothing cited here.')
            sources = [{'path': 'hig/fixture.md'}, {'path': 'wwdc25/219-meet.md'}, {'path': 'hig/other.md'}]
            reasons = updater.recheck(['hig/fixture.md', 'wwdc25/219-meet.md'], sources, sheets)
            self.assertEqual(reasons, {'cites-name.md': ['hig/fixture.md'], 'cites-path.md': ['hig/fixture.md'], 'cites-session.md': ['wwdc25/219-meet.md']})
    def test_retire_removes_entry_and_file_in_the_same_transaction(self):
        with tempfile.TemporaryDirectory() as tmp:
            ref = pathlib.Path(tmp)/'reference'; (ref/'hig').mkdir(parents=True)
            sources = []
            for slug in ('kept', 'renamed'):
                (ref/f'hig/{slug}.md').write_text('old')
                sources.append(dict(path=f'hig/{slug}.md', kind='docc', url=f'https://developer.apple.com/design/human-interface-guidelines/{slug}',
                                    fetch_url='https://developer.apple.com/docc.json', sha256=None, fetched_at=None))
            (ref/'sources.json').write_text(json.dumps({'schema': 1, 'sources': sources}))
            result = updater.update(ref, discover=False, fetcher=lambda url: (FIXTURES/'docc.json').read_bytes(), cheatsheets=tmp, retire=['hig/renamed.md'])
            self.assertTrue(result['applied']); self.assertEqual(result['retired'], ['hig/renamed.md'])
            self.assertFalse((ref/'hig/renamed.md').exists())
            self.assertEqual([s['path'] for s in json.loads((ref/'sources.json').read_text())['sources']], ['hig/kept.md'])
            self.assertNotIn('renamed', (ref/'INDEX.md').read_text())
            with self.assertRaises(ValueError):
                updater.update(ref, discover=False, fetcher=lambda url: b'', cheatsheets=tmp, retire=['hig/unknown.md'])
    def test_missing_page_reports_where_it_moved(self):
        with tempfile.TemporaryDirectory() as tmp:
            ref = pathlib.Path(tmp)/'reference'; (ref/'hig').mkdir(parents=True); (ref/'hig/old.md').write_text('old')
            source = dict(path='hig/old.md', kind='docc', url='https://developer.apple.com/design/human-interface-guidelines/old',
                          fetch_url='https://developer.apple.com/tutorials/data/design/human-interface-guidelines/old.json', sha256=None, fetched_at=None)
            (ref/'sources.json').write_text(json.dumps({'schema': 1, 'sources': [source]}))
            def gone(url): raise HTTPError(url, 404, 'Not Found', None, None)
            result = updater.update(ref, discover=False, fetcher=gone, cheatsheets=tmp,
                                    resolver=lambda url: 'https://developer.apple.com/design/human-interface-guidelines/new')
            self.assertFalse(result['applied'])
            self.assertEqual(result['failed'][0]['moved_to'], 'https://developer.apple.com/design/human-interface-guidelines/new')
            self.assertEqual((ref/'hig/old.md').read_text(), 'old')
    def test_html_tables_render_as_rows_and_hidden_chrome_is_skipped(self):
        page = ('<main><h1>What’s new</h1><p>Updates to design guidance across every platform this year.</p>'
                '<button class="filter-button">All</button><span class="visuallyhidden">Search Reset</span>'
                '<table><thead><tr><th>October 13, 2026</th></tr></thead><tbody>'
                '<tr><td><span><a href="/design/human-interface-guidelines/widgets">Widgets</a></span>'
                '<p style="display:none">Guidancesearchterm</p><p style="display: none"><b>October 13, 2026</b></p></td>'
                '<td><span>Added guidance for Apple HomeView.</span></td></tr>'
                '<tr><td><a href="/x">Live Activities</a></td><td>Added guidance for limited width layouts.</td></tr>'
                '</tbody></table></main>')
        text = updater.render_html(page)
        self.assertIn('### October 13, 2026', text)
        self.assertIn('[Widgets](https://developer.apple.com/design/human-interface-guidelines/widgets) — Added guidance for Apple HomeView.', text)
        self.assertIn('\n[Live Activities](https://developer.apple.com/x) — Added guidance for limited width layouts.', text)
        for chrome in ('Guidancesearchterm', 'Search Reset', 'All'):
            self.assertNotIn(chrome, text.replace('Added', ''))
        self.assertEqual(text.count('October 13, 2026'), 1)
    def test_marketing_category_is_accepted_indexed_and_cited(self):
        with tempfile.TemporaryDirectory() as tmp:
            ref = pathlib.Path(tmp)/'reference'; (ref/'marketing').mkdir(parents=True)
            (ref/'marketing/guidelines.md').write_text('# Marketing Resources and Identity Guidelines\n\nBody.\n')
            source = dict(path='marketing/guidelines.md', kind='html', url='https://developer.apple.com/app-store/marketing/guidelines/',
                          fetch_url='https://developer.apple.com/app-store/marketing/guidelines/', sha256=None, fetched_at=None)
            updater.validate_source(source)
            self.assertIn('## marketing', updater.index(ref, [source]))
            self.assertIn('(marketing/guidelines.md)', updater.index(ref, [source]))
            self.assertIn('marketing/guidelines.md', updater.cited('Rule (`marketing/guidelines.md`).', {}))
        with self.assertRaises(ValueError):
            updater.validate_source(dict(source, path='press/guidelines.md'))
    def test_lookup_page_finds_pages_outside_hig(self):
        script = SCRIPT/'hig-lookup.sh'
        for slug, title in [('219', '# Meet Liquid Glass'), ('pre-orders', '# Offering apps'), ('materials', '# Materials')]:
            result = subprocess.run(['bash', str(script), '--page', slug], capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertTrue(result.stdout.startswith(title), result.stdout[:80])
