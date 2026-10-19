import importlib.util, pathlib, subprocess, sys, tempfile, unittest
from unittest import mock
REPO = pathlib.Path(__file__).resolve().parents[1]
SCRIPT = REPO/'scripts/build-css.py'
spec = importlib.util.spec_from_file_location('build_css', SCRIPT)
build_css = importlib.util.module_from_spec(spec); spec.loader.exec_module(build_css)
class BuildCss(unittest.TestCase):
    def test_generated_files_match_sources(self):
        result = subprocess.run([sys.executable, str(SCRIPT), '--check'], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
    def test_minify_keeps_strings_and_calc_spacing(self):
        css = '/* drop me */\n.a { font: 12px "SF  Pro , Text"; width: calc(100% - 32px); }\n.b:is( .c ) > .d { content: "a;b"; }\n'
        self.assertEqual(build_css.minify(css), '.a{font:12px "SF  Pro , Text";width:calc(100% - 32px)}.b:is( .c ) > .d{content:"a;b"}\n')
    def test_undefined_variable_needs_declaration_or_fallback(self):
        sources = [('t.css', ':root { --as-a: 1; }\n.b { color: var(--as-a); }\n.c { color: var(--as-zz); }\n.d { color: var(--as-yy, red); }\n')]
        with tempfile.TemporaryDirectory() as empty:  # isolate from the real web/patterns/ tokens
            with mock.patch.object(build_css, 'PATTERNS_DIR', pathlib.Path(empty)):
                problems, _ = build_css.undefined_variables(sources)
        self.assertEqual(problems, ['--as-zz'])
    def test_pattern_files_are_checked_for_undefined_variables(self):
        sources = [('t.css', ':root { --as-a: 1; }\n')]
        with tempfile.TemporaryDirectory() as tmp:
            pathlib.Path(tmp, 'p.css').write_text('.as-site-x { color: var(--as-a); background: var(--as-nope); }\n')
            with mock.patch.object(build_css, 'PATTERNS_DIR', pathlib.Path(tmp)):
                problems, count = build_css.undefined_variables(sources)
        self.assertEqual((problems, count), (['--as-nope'], 1))
class ExampleBundles(unittest.TestCase):
    def test_every_listed_source_exists_and_core_comes_first(self):
        for name, parts in build_css.EXAMPLE_BUNDLES.items():
            if name == 'base.css':
                self.assertTrue(parts[0].startswith('css/tokens'), name)
            for part in parts:
                self.assertTrue((build_css.WEB / part).is_file(), f'{name} lists missing {part}')
    def test_bundle_is_the_minified_concatenation_of_its_manifest(self):
        bundles = build_css.example_bundles()
        self.assertEqual(sorted(bundles), sorted(build_css.EXAMPLE_BUNDLES))
        texts = dict(build_css.example_sources())
        expected = build_css.minify('\n'.join(texts[p] for p in build_css.EXAMPLE_BUNDLES['base.css']))
        self.assertEqual(bundles['base.css'], expected)
    def test_check_fails_for_a_stale_or_unlisted_bundle(self):
        bundles = {'base.css': 'a{b:c}\n'}
        with tempfile.TemporaryDirectory() as tmp:
            folder = pathlib.Path(tmp)
            (folder / 'base.css').write_text('a{b:d}\n')
            with mock.patch.object(build_css, 'EXAMPLE_CSS_DIR', folder), \
                 mock.patch.object(build_css, 'example_sources', return_value=[('site.css', ':root{--as-x:1}\n')]), \
                 mock.patch.object(build_css, 'undefined_variables', return_value=([], 0)):
                self.assertFalse(build_css.check_examples(bundles))
                (folder / 'base.css').write_text('a{b:c}\n')
                (folder / 'extra.css').write_text('a{}\n')
                self.assertFalse(build_css.check_examples(bundles))
                (folder / 'extra.css').unlink()
                self.assertTrue(build_css.check_examples(bundles))
