import pathlib, re, unittest, urllib.parse
REPO = pathlib.Path(__file__).resolve().parents[1]
SKILLS = (REPO/'skills').resolve()
MD_LINK = re.compile(r'\]\(([^)\s]+)(?:\s+"[^"]*")?\)')
TICK_PATH = re.compile(r'`(\.\./[^`\s]+)`')
REMOTE = ('http://', 'https://', 'mailto:')
def inside_skills(path): return path == SKILLS or SKILLS in path.parents
class SkillLinks(unittest.TestCase):
    def check(self, origin, target, problems, where):
        path = urllib.parse.unquote(target.split('#', 1)[0])
        resolved = (origin.parent/path).resolve()
        if not inside_skills(resolved): problems.append(f'{where}: {target} leaves skills/')
        elif not resolved.exists(): problems.append(f'{where}: {target} does not exist')
    def test_markdown_links_exist_inside_skills(self):
        problems = []
        for md in sorted(SKILLS.rglob('*.md')):
            for n, line in enumerate(md.read_text(encoding='utf-8').splitlines(), 1):
                for m in MD_LINK.finditer(line):
                    target = m.group(1)
                    if target.startswith(REMOTE) or target.startswith('#'): continue
                    self.check(md, target, problems, f'{md.relative_to(REPO)}:{n}')
        self.assertEqual(problems, [])
    def test_backticked_parent_paths_in_skill_md_exist_inside_skills(self):
        problems = []
        for md in sorted(SKILLS.rglob('SKILL.md')):
            for n, line in enumerate(md.read_text(encoding='utf-8').splitlines(), 1):
                for m in TICK_PATH.finditer(line):
                    self.check(md, m.group(1), problems, f'{md.relative_to(REPO)}:{n}')
        self.assertEqual(problems, [])
    def test_installers_put_all_skills_in_one_directory(self):
        # Sibling links such as ../Apple-Style-HIG/ resolve only if every installer
        # places all four skills side by side in the same parent directory.
        skills = {p.parent.name for p in SKILLS.glob('*/SKILL.md')}
        sh = re.search(r'^SKILLS=\((.*?)\)', (REPO/'install.sh').read_text(encoding='utf-8'), re.M)
        ps = re.search(r"\$SkillNames\s*=\s*@\((.*?)\)", (REPO/'install.ps1').read_text(encoding='utf-8'))
        self.assertIsNotNone(sh); self.assertIsNotNone(ps)
        self.assertEqual(set(sh.group(1).split()), skills)
        self.assertEqual(set(re.findall(r"'([^']+)'", ps.group(1))), skills)
