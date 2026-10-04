import pathlib, subprocess, tempfile, unittest, shutil
REPO = pathlib.Path(__file__).resolve().parents[1]
NAMES = ['Apple-Style', 'Apple-Style-HIG', 'Apple-Style-Review', 'Apple-Style-Liquid-Glass']
class Installer(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='apple style ')
        self.base = pathlib.Path(self.tmp.name)
        self.src = self.base / 'source tree'
        for n in NAMES:
            p = self.src / 'skills' / n; p.mkdir(parents=True); (p/'SKILL.md').write_text('original')
        self.dest = self.base/'target skills'; self.dest.mkdir()
    def tearDown(self): self.tmp.cleanup()
    def run_install(self, *args):
        return subprocess.run(['bash', str(REPO/'install.sh'), '--dir', str(self.src), '--to', str(self.dest), *args], capture_output=True, text=True)
    def test_unowned_preserved(self):
        p = self.dest/NAMES[0]; p.mkdir(); (p/'SKILL.md').write_text('personal')
        self.run_install('--uninstall'); self.assertTrue(p.exists())
        self.run_install('--copy'); self.assertEqual((p/'SKILL.md').read_text(), 'personal')
    def test_modified_preserved(self):
        self.assertEqual(self.run_install('--copy').returncode, 0)
        p = self.dest/NAMES[0]/'SKILL.md'; p.write_text('edited')
        self.run_install('--copy'); self.assertEqual(p.read_text(), 'edited')
        self.run_install('--uninstall'); self.assertEqual(p.read_text(), 'edited')
    def test_repeat_update_uninstall(self):
        for mode in ['--copy', '--link']:
            self.assertEqual(self.run_install(mode).returncode, 0)
            self.assertEqual(self.run_install(mode).returncode, 0)
            (self.src/'skills'/NAMES[0]/'SKILL.md').write_text('updated')
            self.assertEqual(self.run_install(mode, '--update').returncode, 0)
            self.assertEqual((self.dest/NAMES[0]/'SKILL.md').read_text(), 'updated')
            self.assertEqual(self.run_install('--uninstall').returncode, 0)
            self.assertFalse((self.dest/NAMES[0]).exists())
    def test_conflict(self):
        result = subprocess.run(['bash', str(REPO/'install.sh'), '--dir', str(self.src), '--to', str(self.src/'skills'), '--copy'], capture_output=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertTrue((self.src/'skills'/NAMES[0]/'SKILL.md').exists())
    def test_foreign_link_preserved(self):
        foreign=self.base/'manual'; foreign.mkdir(); (foreign/'SKILL.md').write_text('mine')
        (self.dest/NAMES[0]).symlink_to(foreign,target_is_directory=True)
        self.run_install('--link'); self.run_install('--uninstall')
        self.assertTrue((self.dest/NAMES[0]).is_symlink()); self.assertEqual((foreign/'SKILL.md').read_text(),'mine')
    def test_modified_permissions_preserved(self):
        self.run_install('--copy'); p=self.dest/NAMES[0]/'SKILL.md'; p.chmod(0o700)
        self.run_install('--uninstall'); self.assertTrue(p.exists())
    def test_nested_change_and_missing_receipt_preserved(self):
        self.run_install('--copy'); p=self.dest/NAMES[0]; (p/'extra').write_text('user file')
        (self.dest/'.apple-style-install'/NAMES[1]).unlink()
        self.run_install('--uninstall');self.assertTrue(p.exists());self.assertTrue((self.dest/NAMES[1]).exists())
    def test_alias_overlap_preserved(self):
        alias=self.base/'alias';alias.symlink_to(self.src,target_is_directory=True)
        result=subprocess.run(['bash',str(REPO/'install.sh'),'--dir',str(alias),'--to',str(self.src/'skills'),'--link'],capture_output=True)
        self.assertNotEqual(result.returncode,0);self.assertTrue((self.src/'skills'/NAMES[0]/'SKILL.md').exists())
    def test_cache_unowned_preserved(self):
        import os
        cache=self.base/'data'/'apple-style';cache.mkdir(parents=True);(cache/'personal').write_text('keep')
        env=dict(os.environ,XDG_DATA_HOME=str(self.base/'data'))
        result=subprocess.run(['bash',str(REPO/'install.sh'),'--update','--to',str(self.dest)],env=env,capture_output=True)
        self.assertNotEqual(result.returncode,0);self.assertEqual((cache/'personal').read_text(),'keep')
    def test_no_git_branch_and_tag_archive_and_failed_update(self):
        import os, tarfile
        commands=self.base/'bin';commands.mkdir()
        for cmd in ['gzip','cp','mkdir','dirname','mktemp','tar','mv','rm','find','sort','cut','cat','sed','readlink','shasum','stat','uname','rmdir']:
            executable=shutil.which(cmd)
            if executable: (commands/cmd).symlink_to(executable)
        archive=self.base/'fixture.tar.gz'
        with tarfile.open(archive,'w:gz') as tf: tf.add(self.src,arcname='Apple-Style-fixture')
        mock=commands/'curl';mock.write_text('#!/bin/bash\n[ "${FAIL_DOWNLOAD:-0}" = 0 ] || exit 22\nfor arg in "$@"; do case "$arg" in https://*) printf "%s\\n" "$arg" >> "$URL_LOG";; esac; done\nwhile [ "$1" != -o ]; do shift; done\n/bin/cp "$FIXTURE_ARCHIVE" "$2"\n');mock.chmod(0o755)
        env=dict(os.environ,PATH=str(commands),XDG_DATA_HOME=str(self.base/'data'),FIXTURE_ARCHIVE=str(archive),URL_LOG=str(self.base/'urls'))
        for ref in ['feature/test','v1.2.3']:
            result=subprocess.run(['/bin/bash',str(REPO/'install.sh'),'--update','--ref',ref,'--to',str(self.dest),'--copy'],env=env,capture_output=True,text=True)
            self.assertEqual(result.returncode,0,result.stderr)
            self.assertIn('/tar.gz/'+ref,(self.base/'urls').read_text())
        before=(self.dest/NAMES[0]/'SKILL.md').read_text()
        env['FAIL_DOWNLOAD']='1'
        result=subprocess.run(['/bin/bash',str(REPO/'install.sh'),'--update','--to',str(self.dest),'--copy'],env=env,capture_output=True)
        self.assertNotEqual(result.returncode,0);self.assertEqual((self.dest/NAMES[0]/'SKILL.md').read_text(),before)
        self.assertTrue((self.base/'data/apple-style/skills'/NAMES[0]/'SKILL.md').exists())
    def test_incomplete_source_does_not_partially_install(self):
        shutil.rmtree(self.src/'skills'/NAMES[-1])
        result=self.run_install('--copy');self.assertNotEqual(result.returncode,0)
        self.assertFalse((self.dest/NAMES[0]).exists())
