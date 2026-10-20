"""Unit tests for scripts/relativize-site.py (packaged reference site: root-relative URLs to per-file relative URLs)."""
import importlib.util
import pathlib
import tempfile
import unittest

REPO = pathlib.Path(__file__).resolve().parents[1]
_spec = importlib.util.spec_from_file_location('relativize_site', REPO / 'scripts/relativize-site.py')
rs = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(rs)


class RelativizeRules(unittest.TestCase):
    def test_depth_decides_the_number_of_parent_steps(self):
        self.assertEqual(rs.relativize_html('<link href="/css/base.css">', '.'), '<link href="css/base.css">')
        self.assertEqual(rs.relativize_html('<link href="/css/base.css">', 'blog'), '<link href="../css/base.css">')
        self.assertEqual(rs.relativize_html('<link href="/css/base.css">', 'blog/tags'), '<link href="../../css/base.css">')

    def test_root_and_directory_targets_become_index_files(self):
        self.assertEqual(rs.relativize_html('<a href="/">h</a>', '.'), '<a href="index.html">h</a>')
        self.assertEqual(rs.relativize_html('<a href="/">h</a>', 'blog/tags'), '<a href="../../index.html">h</a>')
        self.assertEqual(rs.relativize_html('<a href="/blog/">b</a>', '.'), '<a href="blog/index.html">b</a>')
        self.assertEqual(rs.relativize_html('<a href="/blog/">b</a>', 'blog'), '<a href="index.html">b</a>')

    def test_a_directory_link_without_trailing_slash_resolves_to_the_directory(self):
        self.assertEqual(rs.relativize_html('<a href="/blog">b</a>', 'blog/tags'), '<a href="../">b</a>')
        self.assertEqual(rs.relativize_html('<a href="/blog">b</a>', 'blog'), '<a href="./">b</a>')

    def test_query_and_fragment_are_kept(self):
        self.assertEqual(rs.relativize_html('<a href="/contact.html?ref=a&amp;b=2#top">c</a>', 'blog'),
                         '<a href="../contact.html?ref=a&amp;b=2#top">c</a>')
        self.assertEqual(rs.relativize_html('<a href="/#pricing">p</a>', 'blog'), '<a href="../index.html#pricing">p</a>')
        self.assertEqual(rs.relativize_html('<a href="/?x=1">p</a>', '.'), '<a href="index.html?x=1">p</a>')

    def test_srcset_rewrites_every_candidate_and_keeps_descriptors(self):
        before = '<img srcset="/img/a-800.webp 800w, /img/a-1200.webp 1200w" src="/img/a-1200.webp">'
        after = '<img srcset="../../img/a-800.webp 800w, ../../img/a-1200.webp 1200w" src="../../img/a-1200.webp">'
        self.assertEqual(rs.relativize_html(before, 'blog/tags'), after)

    def test_srcset_with_density_descriptors_and_absolute_candidate(self):
        before = '<img srcset="/img/a.png 1x,/img/a@2x.png 2x, https://cdn.example.com/a.png 3x">'
        after = '<img srcset="img/a.png 1x,img/a@2x.png 2x, https://cdn.example.com/a.png 3x">'
        self.assertEqual(rs.relativize_html(before, '.'), after)

    def test_absolute_protocol_relative_scheme_and_fragment_urls_are_untouched(self):
        html = ('<a href="https://example.com/x">1</a><a href="//cdn.example.com/y.js">2</a>'
                '<a href="mailto:hello@example.com">3</a><a href="tel:+1">4</a><a href="#main">5</a>'
                '<img src="data:image/png;base64,AAAA/BBB">')
        self.assertEqual(rs.relativize_html(html, 'blog/tags'), html)

    def test_canonical_and_og_image_absolute_urls_are_untouched(self):
        html = ('<link rel="canonical" href="https://example.com/blog/">'
                '<meta property="og:image" content="https://example.com/img/social.png">')
        self.assertEqual(rs.relativize_html(html, 'blog'), html)

    def test_meta_refresh_and_bare_path_content(self):
        self.assertEqual(rs.relativize_html('<meta http-equiv="refresh" content="0; url=/">', '.'),
                         '<meta http-equiv="refresh" content="0; url=index.html">')
        self.assertEqual(rs.relativize_html('<meta name="x" content="/img/s.png">', 'blog'),
                         '<meta name="x" content="../img/s.png">')
        # Free text that happens to start with a slash is not a URL.
        text = '<meta name="description" content="/ not a path">'
        self.assertEqual(rs.relativize_html(text, 'blog'), text)

    def test_script_and_style_bodies_and_comments_are_not_rewritten_but_script_src_is(self):
        html = ('<script src="/js/a.js" defer></script>'
                "<script>var s='<a href=\"/x\">';</script>"
                '<!-- <a href="/c">old</a> -->'
                '<style>.a{background:url(/img/x.png)}</style>')
        expected = ('<script src="../js/a.js" defer></script>'
                    "<script>var s='<a href=\"/x\">';</script>"
                    '<!-- <a href="/c">old</a> -->'
                    '<style>.a{background:url(/img/x.png)}</style>')
        self.assertEqual(rs.relativize_html(html, 'blog'), expected)

    def test_quoting_styles_are_preserved(self):
        self.assertEqual(rs.relativize_html("<a href='/a.html'>x</a>", 'blog'), "<a href='../a.html'>x</a>")
        self.assertEqual(rs.relativize_html('<a href=/a.html>x</a>', 'blog'), '<a href=../a.html>x</a>')

    def test_form_action_poster_and_xlink_href(self):
        self.assertEqual(rs.relativize_html('<form action="/api/contact" method="post"></form>', 'blog'),
                         '<form action="../api/contact" method="post"></form>')
        self.assertEqual(rs.relativize_html('<video poster="/video/p.jpg"></video>', '.'),
                         '<video poster="video/p.jpg"></video>')
        self.assertEqual(rs.relativize_html('<svg><use xlink:href="/img/s.svg#i"/></svg>', 'blog'),
                         '<svg><use xlink:href="../img/s.svg#i"/></svg>')

    def test_dot_segments_are_resolved_inside_the_site(self):
        self.assertEqual(rs.relativize_html('<a href="/a/../b.css">x</a>', 'blog'), '<a href="../b.css">x</a>')
        self.assertEqual(rs.relativize_html('<a href="/a/./b.css">x</a>', '.'), '<a href="a/b.css">x</a>')

    def test_scheme_like_first_segment_gets_a_dot_prefix(self):
        self.assertEqual(rs.relativize_html('<a href="/a:b.html">x</a>', '.'), '<a href="./a:b.html">x</a>')

    def test_relativizing_twice_changes_nothing(self):
        html = '<a href="/blog/">b</a><img srcset="/img/a.png 1x, /img/b.png 2x"><script src="/js/a.js"></script>'
        once = rs.relativize_html(html, 'blog/tags')
        self.assertEqual(rs.relativize_html(once, 'blog/tags'), once)

    def test_base_element_is_refused(self):
        with self.assertRaises(rs.RelativizeError):
            rs.relativize_html('<base href="/">', '.')

    def test_root_relative_references_are_reported_until_rewritten(self):
        html = '<a href="/x">a</a><a href="https://example.com/">b</a><script>var u="/nope";</script>'
        self.assertEqual(rs.root_relative_refs(html, '.'), ['/x'])
        self.assertEqual(rs.root_relative_refs(rs.relativize_html(html, '.'), '.'), [])


class RelativizeTree(unittest.TestCase):
    def _site(self, files):
        tmp = tempfile.TemporaryDirectory()
        root = pathlib.Path(tmp.name) / 'site'
        for name, text in files.items():
            path = root / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(text.encode('utf-8'))
        self.addCleanup(tmp.cleanup)
        return root

    def test_rewrites_html_files_at_their_depth_and_leaves_other_files_alone(self):
        css = 'a { background: url(/img/x.png) }'
        root = self._site({
            'index.html': '<link href="/css/base.css"><a href="/blog/">b</a>',
            'blog/tags/planning.html': '<link href="/css/base.css"><a href="/">h</a>',
            'css/base.css': css,
        })
        changed, problems = rs.relativize_tree(root)
        self.assertEqual((changed, problems), (2, []))
        self.assertEqual((root / 'index.html').read_text(), '<link href="css/base.css"><a href="blog/index.html">b</a>')
        self.assertEqual((root / 'blog/tags/planning.html').read_text(),
                         '<link href="../../css/base.css"><a href="../../index.html">h</a>')
        self.assertEqual((root / 'css/base.css').read_text(), css)

    def test_a_refused_file_means_no_file_is_written(self):
        root = self._site({
            'index.html': '<a href="/x.html">x</a>',
            'bad.html': '<base href="/"><a href="/y">y</a>',
        })
        with self.assertRaises(rs.RelativizeError):
            rs.relativize_tree(root)
        self.assertEqual((root / 'index.html').read_text(), '<a href="/x.html">x</a>')

    def test_the_real_reference_site_has_no_root_relative_urls_after_rewriting(self):
        site = REPO / 'skills/Apple-Style/web/examples/site'
        with tempfile.TemporaryDirectory() as tmp:
            copy = pathlib.Path(tmp) / 'site'
            import shutil
            shutil.copytree(site, copy)
            changed, problems = rs.relativize_tree(copy)
            self.assertGreater(changed, 0)
            self.assertEqual(problems, [])
            for path in copy.rglob('*.html'):
                text = path.read_text(encoding='utf-8')
                self.assertNotIn('href="/', text, path)
                self.assertNotIn('src="/', text, path)
                self.assertNotIn('srcset="/', text, path)


if __name__ == '__main__':
    unittest.main()
