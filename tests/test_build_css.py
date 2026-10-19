import importlib.util, pathlib, subprocess, sys, unittest
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
        problems, _ = build_css.undefined_variables(sources)
        self.assertEqual(problems, ['--as-zz'])
