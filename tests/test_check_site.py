import json, os, pathlib, shutil, subprocess, tempfile, unittest

REPO = pathlib.Path(__file__).resolve().parents[1]
CONFIG = REPO/'skills/Apple-Style-Review/scripts/check-site/check-site.config.js'
SITE = REPO/'tests/fixtures/bad-site'
PORT = '9390'
PROBE = ("const { chromium } = require('@playwright/test');"
         "(async () => { const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); await b.close(); })()"
         ".then(() => console.log('chromium ok'), (e) => { console.error(String(e.message).split('\\n')[0]); process.exit(1); });")
# (planted problem, check id, text that must appear in that check's evidence)
PLANTED = [
    ('broken link', '1', 'pricing-old.html'),
    ('broken anchor', '1', 'contact.html#team'),
    ('missing description', '2', 'meta description missing'),
    ('two h1', '2', 'h1 count 2'),
    ('320px overflow', '3', '@320px'),
    ('link in paragraph without underline', '4', '全部功能'),
    ('menu Esc does not close', '6', 'closed after Esc: no'),
    ('404 relative CSS breaks at deep path', '9', 'site.css'),
    ('form success never appears', '8', 'no success message'),
    ('animation ignores reduced motion', '11', 'blink'),
]
AXE_PROBLEM = ('low-contrast paragraph', '5', 'color-contrast')  # needs AXE=/path/to/axe.min.js
CLEAN = ['7', '10', '13']  # no planted problem in these checks


def skip_reason():
    if not shutil.which('npx') or not shutil.which('node'):
        return 'npx or node is not available'
    try:
        r = subprocess.run(['node', '-e', PROBE], cwd=REPO, capture_output=True, text=True, timeout=120)
    except (OSError, subprocess.TimeoutExpired) as e:
        return f'Playwright probe failed: {e}'
    if r.returncode != 0:
        return 'Playwright Chromium cannot launch: ' + (r.stderr.strip() or r.stdout.strip())[:200]
    return ''


class CheckSite(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        reason = skip_reason()
        if reason:
            raise unittest.SkipTest(reason)
        cls.out = tempfile.mkdtemp(prefix='check-site-')
        env = {**os.environ, 'SITE': str(SITE), 'PORT': PORT, 'OUT': cls.out}
        cls.proc = subprocess.run(['npx', 'playwright', 'test', '-c', str(CONFIG)], cwd=REPO, env=env,
                                  capture_output=True, text=True, timeout=600)
        try:
            with open(os.path.join(cls.out, 'results.json'), encoding='utf-8') as f:
                cls.results = json.load(f)
        except OSError:
            cls.results = None

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.out, ignore_errors=True)

    def checks(self):
        self.assertIsNotNone(self.results, (self.proc.stdout + self.proc.stderr)[-3000:])
        return {c['id']: c for c in self.results['checks']}

    def test_run_fails_and_writes_thirteen_checks(self):
        self.assertNotEqual(self.proc.returncode, 0, (self.proc.stdout + self.proc.stderr)[-3000:])
        self.assertEqual(len(self.checks()), 13)

    def test_planted_problems_are_reported_as_fail(self):
        checks = self.checks()
        for name, cid, text in PLANTED:
            with self.subTest(problem=name):
                c = checks[cid]
                self.assertEqual(c['status'], 'fail', c)
                self.assertIn(text, '\n'.join(c['evidence']))

    def test_axe_problem_is_reported_only_when_axe_runs(self):
        c = self.checks()[AXE_PROBLEM[1]]
        if os.environ.get('AXE'):
            self.assertEqual(c['status'], 'fail', c)
            self.assertIn(AXE_PROBLEM[2], '\n'.join(c['evidence']))
        else:
            self.assertEqual(c['status'], 'not checked')
            self.assertIn('AXE', c['reason'])

    def test_checks_without_planted_problems_pass(self):
        checks = self.checks()
        for cid in CLEAN:
            with self.subTest(check=cid):
                self.assertEqual(checks[cid]['status'], 'pass', checks[cid])



class ReferenceSite(unittest.TestCase):
    """The skill's own reference site passes every check-site check (plan 3.4), with axe when installed."""
    @classmethod
    def setUpClass(cls):
        reason = skip_reason()
        if reason:
            raise unittest.SkipTest(reason)
        cls.out = tempfile.mkdtemp(prefix='check-site-ref-')
        env = {**os.environ, 'SITE': str(REPO/'skills/Apple-Style/web/examples/site'), 'PORT': '9391', 'OUT': cls.out}
        axe = REPO/'node_modules/axe-core/axe.min.js'
        if axe.exists():
            env['AXE'] = str(axe)
        cls.axe = axe.exists()
        cls.proc = subprocess.run(['npx', 'playwright', 'test', '-c', str(CONFIG)], cwd=REPO, env=env,
                                  capture_output=True, text=True, timeout=600)
        with open(os.path.join(cls.out, 'results.json'), encoding='utf-8') as f:
            cls.results = json.load(f)

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.out, ignore_errors=True)

    def test_no_check_fails(self):
        failed = [c for c in self.results['checks'] if c['status'] == 'fail']
        self.assertEqual(failed, [], (self.proc.stdout + self.proc.stderr)[-3000:])
        self.assertEqual(self.proc.returncode, 0)

    def test_axe_ran_when_installed(self):
        status = {c['id']: c['status'] for c in self.results['checks']}['5']
        self.assertEqual(status, 'pass' if self.axe else 'not checked')


if __name__ == '__main__':
    unittest.main()
