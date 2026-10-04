"""Runs with pwsh or Windows PowerShell. No global tool installation needed."""
import os, pathlib, shutil, subprocess, tempfile, unittest
REPO=pathlib.Path(__file__).resolve().parents[1]
PWSH=os.environ.get('APPLE_STYLE_PWSH') or shutil.which('pwsh') or shutil.which('powershell')
def shell_env():
    env = dict(os.environ)
    # A pwsh-hosted runner exports its module paths. Let Windows PowerShell 5.1
    # bootstrap its own built-in modules instead of loading PowerShell 7 modules.
    if os.name == 'nt': env.pop('PSModulePath', None)
    return env

NAMES=['Apple-Style','Apple-Style-HIG','Apple-Style-Review','Apple-Style-Liquid-Glass']
@unittest.skipUnless(PWSH,'PowerShell runtime not available')
class PowerShellInstaller(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory(prefix='apple style ps '); self.base=pathlib.Path(self.tmp.name); self.src=self.base/'source tree';self.dest=self.base/'target skills';self.dest.mkdir()
        for name in NAMES:
            p=self.src/'skills'/name;p.mkdir(parents=True);(p/'SKILL.md').write_text('original')
    def tearDown(self):self.tmp.cleanup()
    def install(self,*args,dest=None):
        return subprocess.run([PWSH,'-NoProfile','-File',str(REPO/'install.ps1'),'-Dir',str(self.src),'-To',str(dest or self.dest),*args],env=shell_env(),capture_output=True,encoding='utf-8',errors='backslashreplace')
    def test_unowned_and_modified_preserved(self):
        manual=self.dest/NAMES[0];manual.mkdir();(manual/'SKILL.md').write_text('personal')
        result=self.install('-Copy');self.assertEqual(result.returncode,2,result.stdout+result.stderr)
        self.assertEqual((manual/'SKILL.md').read_text(),'personal')
        p=self.dest/NAMES[1]/'SKILL.md';p.write_text('edited')
        self.install('-Copy');self.assertEqual(p.read_text(),'edited')
        self.install('-Uninstall');self.assertEqual(p.read_text(),'edited');self.assertTrue(manual.exists())
    def test_repeat_update_uninstall(self):
        for mode in ['-Copy','-Link']:
            for _ in range(2):
                result=self.install(mode);self.assertEqual(result.returncode,0,result.stdout+result.stderr)
            if os.name == 'nt' and mode == '-Link':
                import json
                receipt=json.loads((self.dest/'.apple-style-install'/NAMES[0]).read_text(encoding='utf-8-sig'))
                self.assertEqual(receipt['mode'],'link','Windows CI must exercise native junctions')
            (self.src/'skills'/NAMES[0]/'SKILL.md').write_text('updated')
            result=self.install(mode,'-Update');self.assertEqual(result.returncode,0,result.stdout+result.stderr)
            self.assertEqual((self.dest/NAMES[0]/'SKILL.md').read_text(),'updated')
            result=self.install('-Uninstall');self.assertEqual(result.returncode,0,result.stdout+result.stderr)
            self.assertFalse((self.dest/NAMES[0]).exists());self.assertTrue((self.src/'skills'/NAMES[0]/'SKILL.md').exists())
    def test_source_conflict(self):
        result=self.install('-Copy',dest=self.src/'skills');self.assertNotEqual(result.returncode,0)
        self.assertTrue((self.src/'skills'/NAMES[0]/'SKILL.md').exists())
    def test_added_file_and_missing_receipt_preserved(self):
        result=self.install('-Copy');self.assertEqual(result.returncode,0,result.stdout+result.stderr)
        p=self.dest/NAMES[0];(p/'user.txt').write_text('keep')
        (self.dest/'.apple-style-install'/NAMES[1]).unlink()
        self.install('-Uninstall');self.assertTrue(p.exists());self.assertTrue((self.dest/NAMES[1]).exists())
    def test_native_parser(self):
        code='$tokens=$null;$errors=$null;[System.Management.Automation.Language.Parser]::ParseFile($args[0],[ref]$tokens,[ref]$errors)>$null;if($errors.Count){$errors|Out-String;exit 1}'
        # -File paths are already parsed in all behavior tests. Also check -Help succeeds.
        result=subprocess.run([PWSH,'-NoProfile','-File',str(REPO/'install.ps1'),'-Help'],env=shell_env(),capture_output=True,encoding='utf-8',errors='backslashreplace')
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
    def test_no_git_branch_tag_and_failed_download(self):
        import json, zipfile
        archive=self.base/'source.zip'
        with zipfile.ZipFile(archive,'w') as z:
            for p in self.src.rglob('*'):
                if p.is_file():z.write(p,'Apple-Style-fixture/'+p.relative_to(self.src).as_posix())
        wrapper=self.base/'remote.ps1'
        wrapper.write_text('''$ErrorActionPreference = 'Stop'
function global:Get-Command { [CmdletBinding()] param([string]$Name) if($Name -eq 'git'){return $null}; Microsoft.PowerShell.Core\\Get-Command $Name }
function global:Invoke-WebRequest { [CmdletBinding()] param($Uri,$OutFile,[switch]$UseBasicParsing) if($env:FAIL_DOWNLOAD -eq '1'){throw 'fixture HTTP 503'}; Add-Content -LiteralPath $env:URL_LOG -Value $Uri; Copy-Item -LiteralPath $env:FIXTURE_ARCHIVE -Destination $OutFile }
& $env:INSTALL_SCRIPT -Update -Ref $env:INSTALL_REF -To $env:INSTALL_TARGET -Copy
''')
        env=dict(shell_env(),LOCALAPPDATA=str(self.base/'cache'),FIXTURE_ARCHIVE=str(archive),URL_LOG=str(self.base/'urls'),INSTALL_SCRIPT=str(REPO/'install.ps1'),INSTALL_TARGET=str(self.dest))
        for ref in ['feature/test','v1.2.3']:
            env['INSTALL_REF']=ref
            result=subprocess.run([PWSH,'-NoProfile','-File',str(wrapper)],env=env,capture_output=True,encoding='utf-8',errors='backslashreplace')
            self.assertEqual(result.returncode,0,result.stdout+result.stderr)
            self.assertIn('/zip/'+ref,(self.base/'urls').read_text(encoding='utf-8-sig'))
        before=(self.dest/NAMES[0]/'SKILL.md').read_text();env['FAIL_DOWNLOAD']='1'
        result=subprocess.run([PWSH,'-NoProfile','-File',str(wrapper)],env=env,capture_output=True,encoding='utf-8',errors='backslashreplace')
        self.assertNotEqual(result.returncode,0);self.assertEqual((self.dest/NAMES[0]/'SKILL.md').read_text(),before)
    def test_incomplete_source_does_not_partially_install(self):
        shutil.rmtree(self.src/'skills'/NAMES[-1])
        result=self.install('-Copy');self.assertNotEqual(result.returncode,0)
        self.assertFalse((self.dest/NAMES[0]).exists())
    def test_fingerprinting_without_get_file_hash_cmdlet(self):
        wrapper=self.base/'without-hash-cmdlet.ps1'
        wrapper.write_text("$ErrorActionPreference = 'Stop'\nfunction global:Get-FileHash { throw 'Get-FileHash unavailable' }\n& $env:INSTALL_SCRIPT -Dir $env:INSTALL_SOURCE -To $env:INSTALL_TARGET -Copy\n")
        env=dict(shell_env(),INSTALL_SCRIPT=str(REPO/'install.ps1'),INSTALL_SOURCE=str(self.src),INSTALL_TARGET=str(self.dest))
        result=subprocess.run([PWSH,'-NoProfile','-File',str(wrapper)],env=env,capture_output=True,encoding='utf-8',errors='backslashreplace')
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
        self.assertEqual((self.dest/NAMES[0]/'SKILL.md').read_text(),'original')
