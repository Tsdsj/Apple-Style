<#
.SYNOPSIS
  Apple-Style — installer for Windows (PowerShell 5.1+ / PowerShell 7).

.DESCRIPTION
  Installs the four Apple-Style skills into the agent directories found under
  your user profile (~\.claude\skills, ~\.codex\skills, ~\.agents\skills).

  By default it creates directory junctions, which need no administrator
  rights and no Developer Mode, so edits in the source checkout show up in
  every agent immediately. If a junction cannot be created the installer
  falls back to copying and says so.

.EXAMPLE
  # From a clone
  powershell -ExecutionPolicy Bypass -File .\install.ps1

.EXAMPLE
  # Without cloning (downloads into %LOCALAPPDATA%\apple-style)
  irm https://raw.githubusercontent.com/Tsdsj/Apple-Style/main/install.ps1 | iex

.EXAMPLE
  # Same, with options
  & ([scriptblock]::Create((irm https://raw.githubusercontent.com/Tsdsj/Apple-Style/main/install.ps1))) -Copy

.EXAMPLE
  .\install.ps1 -Uninstall
#>
#Requires -Version 5.1
[CmdletBinding()]
param(
    # Copy the skills instead of creating junctions.
    [switch] $Copy,
    # Create junctions (default).
    [switch] $Link,
    # Remove the skills this installer created.
    [switch] $Uninstall,
    # Install into .\.claude\skills and .\.codex\skills of the current directory.
    [switch] $Project,
    # Extra target directory (repeatable); replaces the automatic target list.
    [string[]] $To,
    # Install into ~\.claude, ~\.codex and ~\.agents even if they do not exist yet.
    [switch] $All,
    # Re-download the cached copy before installing.
    [switch] $Update,
    # Branch or tag to download.
    [string] $Ref = 'main',
    # Use this checkout as the source instead of downloading.
    [string] $Dir,
    # Only print warnings and errors.
    [switch] $Quiet,
    # Show help and exit.
    [switch] $Help
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version 2.0

$RepoSlug   = 'Tsdsj/Apple-Style'
$SkillNames = @('Apple-Style', 'Apple-Style-Liquid-Glass', 'Apple-Style-HIG', 'Apple-Style-Review')
$HomeDir    = if ($env:USERPROFILE) { $env:USERPROFILE } else { $HOME }
$CacheRoot  = if ($env:LOCALAPPDATA) { $env:LOCALAPPDATA } else { $HomeDir }
$CacheDir   = Join-Path $CacheRoot 'apple-style'

# ----------------------------------------------------------------- output ---
function Write-Step   { param([string] $Message) if (-not $Quiet) { Write-Host $Message } }
function Write-Ok     { param([string] $Message) if (-not $Quiet) { Write-Host "  [ok] $Message" -ForegroundColor Green } }
function Write-Note   { param([string] $Message) Write-Host "  [!]  $Message" -ForegroundColor Yellow }
function Stop-WithError { param([string] $Message) Write-Host "error: $Message" -ForegroundColor Red; exit 1 }

if ($Help) {
    # $PSCommandPath is empty when the script is piped into iex
    if ($PSCommandPath) {
        Get-Help -Full $PSCommandPath
    }
    else {
        Write-Host 'install.ps1 [-Copy] [-Link] [-Uninstall] [-Project] [-To <dirs>] [-All]'
        Write-Host '            [-Update] [-Ref <branch>] [-Dir <checkout>] [-Quiet] [-Help]'
    }
    exit 0
}

# ----------------------------------------------------------------- source ---
function Test-Checkout {
    param([string] $Path)
    if (-not $Path) { return $false }
    foreach ($name in $SkillNames) {
        $skill = Join-Path $Path "skills/$name"
        if (-not (Test-Path -LiteralPath (Join-Path $skill 'SKILL.md'))) { return $false }
        if ((Get-Item -LiteralPath $skill -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) { return $false }
    }
    return $true
}

function Get-Fingerprint([string] $Path) {
    $rows = New-Object 'System.Collections.Generic.List[string]'
    $base = (Get-Item -LiteralPath $Path -Force).FullName
    $queue = New-Object 'System.Collections.Generic.Queue[string]'
    $queue.Enqueue($base)
    while ($queue.Count) {
        foreach ($item in Get-ChildItem -LiteralPath $queue.Dequeue() -Force) {
            if ($item.FullName -eq (Join-Path $base '.git')) { continue }
            $rel = $item.FullName.Substring($base.Length)
            if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { $value = 'L:' + ($item.Target -join '|') }
            elseif ($item.PSIsContainer) { $value = 'D'; $queue.Enqueue($item.FullName) }
            else { $value = 'F:' + (Get-FileHash -LiteralPath $item.FullName -Algorithm SHA256).Hash }
            $modeBits = if ($env:OS -ne 'Windows_NT' -and $item.PSObject.Properties['UnixFileMode']) { ':' + $item.UnixFileMode } else { '' }
            $rows.Add($rel + ':' + $item.Attributes + $modeBits + ':' + $value)
        }
    }
    $rows.Sort([StringComparer]::Ordinal)
    $sha = [Security.Cryptography.SHA256]::Create()
    try { return ([BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes(($rows -join "`n"))))).Replace('-', '') }
    finally { $sha.Dispose() }
}
function Write-Receipt($Path, $Mode, $SourcePath, $Value) {
    @{ installer='apple-style-installer-v1'; mode=$Mode; source=$SourcePath; value=$Value } | ConvertTo-Json | Set-Content -LiteralPath $Path -Encoding UTF8
}
function Test-Owned($Path, $Record) {
    try {
        if (-not (Test-Path -LiteralPath $Record) -or (Test-ReparsePoint $Record)) { return $false }
        $r = Get-Content -LiteralPath $Record -Raw | ConvertFrom-Json
        if ($r.installer -ne 'apple-style-installer-v1') { return $false }
        $item = Get-Item -LiteralPath $Path -Force
        if ($r.mode -eq 'link') { return (Test-ReparsePoint $Path) -and (($item.Target -join '|') -ceq $r.value) }
        return $r.mode -eq 'copy' -and $item.PSIsContainer -and -not (Test-ReparsePoint $Path) -and (Get-Fingerprint $Path) -ceq $r.value
    } catch { return $false }
}
function Test-ReparsePoint([string] $Path) {
    return (((Get-Item -LiteralPath $Path -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0)
}
function Remove-Target([string] $Path) {
    if (Test-ReparsePoint $Path) { [IO.Directory]::Delete($Path) }
    else { Remove-Item -LiteralPath $Path -Recurse -Force }
}
function Get-Sources([string] $Destination) {
    $record = "$Destination.receipt"
    $parent = Split-Path -Parent $Destination
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
    $cacheLockPath = "$Destination.lock"
    $cacheLock = [IO.File]::Open($cacheLockPath, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
    try {
    if ((Get-Item -LiteralPath $Destination -Force -ErrorAction SilentlyContinue) -and -not (Test-Owned $Destination $record)) {
        throw "Cache unowned or modified; preserve it and use -Dir: $Destination"
    }
    } catch { $cacheLock.Dispose(); Remove-Item -LiteralPath $cacheLockPath; throw }
    $committed = $false
    $stage = Join-Path $parent ('.apple-style-download-' + [Guid]::NewGuid().ToString('n'))
    New-Item -ItemType Directory -Path $stage | Out-Null
    $repo = Join-Path $stage 'repo'
    try {
        if (Get-Command git -ErrorAction SilentlyContinue) {
            & git clone --depth 1 --branch $Ref --quiet "https://github.com/$RepoSlug.git" $repo
            if ($LASTEXITCODE -ne 0) { throw "git clone failed ($LASTEXITCODE)" }
        } else {
            [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
            $zip = Join-Path $stage 'source.zip'
            Invoke-WebRequest -Uri "https://codeload.github.com/$RepoSlug/zip/$Ref" -OutFile $zip -UseBasicParsing
            $extract = Join-Path $stage 'extract'
            Expand-Archive -LiteralPath $zip -DestinationPath $extract
            $dirs = @(Get-ChildItem -LiteralPath $extract -Directory)
            if ($dirs.Count -ne 1) { throw 'Unexpected archive layout' }
            Move-Item -LiteralPath $dirs[0].FullName -Destination $repo
        }
        if (-not (Test-Checkout $repo)) { throw 'Invalid source archive' }
        Write-Receipt (Join-Path $stage 'receipt') 'copy' "https://github.com/$RepoSlug@$Ref" (Get-Fingerprint $repo)
        $previous = Join-Path $stage 'previous'
        if (Test-Path -LiteralPath $Destination) { Move-Item -LiteralPath $Destination -Destination $previous }
        try { Move-Item -LiteralPath $repo -Destination $Destination }
        catch { if (Test-Path -LiteralPath $previous) { Move-Item -LiteralPath $previous -Destination $Destination }; throw }
        Move-Item -LiteralPath (Join-Path $stage 'receipt') -Destination $record -Force
        $committed = $true
    } finally {
        if ($committed) { Remove-Item -LiteralPath $stage -Recurse -Force }
        else { Write-Note "Failed download/update; any staged recovery data is preserved at $stage" }
        $cacheLock.Dispose(); Remove-Item -LiteralPath $cacheLockPath
    }
}

$source = $null
if ($Dir) {
    $source = (Resolve-Path -LiteralPath $Dir).Path
}
elseif ($PSScriptRoot -and (Test-Checkout $PSScriptRoot) -and -not $Update) {
    $source = $PSScriptRoot                       # running from a clone
}
elseif ($Uninstall) {
    $source = $CacheDir                           # nothing to download just to remove links
}
else {
    Get-Sources -Destination $CacheDir
    $source = $CacheDir
}

if (-not $Uninstall -and -not (Test-Checkout $source)) {
    Stop-WithError "$source is not an Apple-Style checkout"
}

# ---------------------------------------------------------------- targets ---
$targets = @()
if ($To) {
    $targets = @($To)
}
elseif ($Project) {
    $targets = @((Join-Path $PWD '.claude\skills'), (Join-Path $PWD '.codex\skills'))
}
elseif ($All) {
    $targets = @(
        (Join-Path $HomeDir '.claude\skills'),
        (Join-Path $HomeDir '.codex\skills'),
        (Join-Path $HomeDir '.agents\skills')
    )
}
else {
    # Only write into agent directories that exist, so the installer does not
    # scatter empty .codex / .agents trees on machines that never use them.
    foreach ($name in @('.claude', '.codex', '.agents')) {
        $parent = Join-Path $HomeDir $name
        if (Test-Path -LiteralPath $parent) { $targets += (Join-Path $parent 'skills') }
    }
    if ($targets.Count -eq 0) {
        $targets = @((Join-Path $HomeDir '.claude\skills'))
        Write-Note "no agent directory found; defaulting to $($targets[0])"
    }
}

# Resolve each directory component, including junction aliases.
function Get-Canonical([string] $Path, [int] $Depth = 0) {
    if ($Depth -gt 32) { throw "Too many directory links: $Path" }
    $full = [IO.Path]::GetFullPath($Path)
    $root = [IO.Path]::GetPathRoot($full)
    $current = $root
    foreach ($part in $full.Substring($root.Length).Split([IO.Path]::DirectorySeparatorChar)) {
        if (-not $part) { continue }
        $current = Join-Path $current $part
        $item = Get-Item -LiteralPath $current -Force -ErrorAction SilentlyContinue
        if ($item -and ($item.Attributes -band [IO.FileAttributes]::ReparsePoint)) {
            $next = @($item.Target)[0]
            if (-not [IO.Path]::IsPathRooted($next)) { $next = Join-Path ([IO.Path]::GetDirectoryName($current)) $next }
            $current = Get-Canonical $next ($Depth + 1)
        }
    }
    if ($current -eq [IO.Path]::GetPathRoot($current)) { return $current }
    return $current.TrimEnd([IO.Path]::DirectorySeparatorChar)
}
$mode = if ($Uninstall) { 'uninstall' } elseif ($Copy) { 'copy' } else { 'link' }
$installed = 0; $skipped = 0
foreach ($target in $targets) {
    if ($mode -ne 'uninstall') { New-Item -ItemType Directory -Path $target -Force | Out-Null }
    if (-not (Test-Path -LiteralPath $target)) { continue }
    $target = Get-Canonical $target
    if (-not $Uninstall) {
        $source = Get-Canonical $source
        $sep = [IO.Path]::DirectorySeparatorChar
        if (($target.TrimEnd($sep) + $sep).StartsWith($source.TrimEnd($sep) + $sep, [StringComparison]::OrdinalIgnoreCase) -or
            ($source.TrimEnd($sep) + $sep).StartsWith($target.TrimEnd($sep) + $sep, [StringComparison]::OrdinalIgnoreCase)) { throw "Source/target overlap: $target" }
    }
    $records = Join-Path $target '.apple-style-install'
    if ((Test-Path -LiteralPath $records) -and (Test-ReparsePoint $records)) { throw 'Receipt directory is a link' }
    New-Item -ItemType Directory -Path $records -Force | Out-Null
    $lockPath = Join-Path $records 'lock'
    $lock = [IO.File]::Open($lockPath, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
    try {
        foreach ($skill in $SkillNames) {
            $dst = Join-Path $target $skill; $src = Join-Path $source "skills/$skill"; $record = Join-Path $records $skill
            $existing = Get-Item -LiteralPath $dst -Force -ErrorAction SilentlyContinue
            if ($existing -and -not (Test-Owned $dst $record)) {
                Write-Note "Preserved unowned or modified content: $dst"; $skipped++; continue
            }
            if ($Uninstall) {
                if ($existing) { Remove-Target $dst; Remove-Item -LiteralPath $record; Write-Ok "removed owned $skill" }
                continue
            }
            if (-not (Test-Path -LiteralPath (Join-Path $src 'SKILL.md')) -or (Test-ReparsePoint $src)) { throw "Missing or linked source skill: $src" }
            $stage = Join-Path $target ('.apple-style-stage-' + [Guid]::NewGuid().ToString('n'))
            New-Item -ItemType Directory -Path $stage | Out-Null
            $new = Join-Path $stage 'new'; $previous = Join-Path $stage 'previous'
            try {
                $actualMode = $mode
                if ($mode -eq 'link') {
                    try {
                        if ($env:OS -ne 'Windows_NT') { throw 'Junctions require Windows' }
                        New-Item -ItemType Junction -Path $new -Value $src -ErrorAction Stop | Out-Null
                        if (-not (Test-Path -LiteralPath $new) -or -not (Test-ReparsePoint $new)) { throw 'Junction was not created' }
                    }
                    catch {
                        if (Get-Item -LiteralPath $new -Force -ErrorAction SilentlyContinue) { Remove-Target $new }
                        $actualMode = 'copy'; Write-Note 'Junction unavailable; using a protected copy'
                    }
                }
                if ($actualMode -eq 'copy') {
                    # Copy-Item behavior around nested links varies across PowerShell versions.
                    if (Get-ChildItem -LiteralPath $src -Recurse -Force | Where-Object { $_.Attributes -band [IO.FileAttributes]::ReparsePoint }) { throw 'Copy source contains links; use -Link' }
                    Copy-Item -LiteralPath $src -Destination $new -Recurse
                    $value = Get-Fingerprint $new
                } else { $value = (Get-Item -LiteralPath $new -Force).Target -join '|' }
                Write-Receipt (Join-Path $stage 'receipt') $actualMode $src $value
                if ($existing) { Move-Item -LiteralPath $dst -Destination $previous }
                try { Move-Item -LiteralPath $new -Destination $dst }
                catch { if (Get-Item -LiteralPath $previous -Force -ErrorAction SilentlyContinue) { Move-Item -LiteralPath $previous -Destination $dst }; throw }
                Move-Item -LiteralPath (Join-Path $stage 'receipt') -Destination $record -Force
                if (Get-Item -LiteralPath $previous -Force -ErrorAction SilentlyContinue) { Remove-Target $previous }
                $installed++; Write-Ok "$actualMode $skill"
            } finally {
                # Never recursively remove a staging directory containing a junction.
                if (Get-Item -LiteralPath $new -Force -ErrorAction SilentlyContinue) { Remove-Target $new }
                if (-not (Get-Item -LiteralPath $previous -Force -ErrorAction SilentlyContinue)) { Remove-Item -LiteralPath $stage -Recurse -Force }
            }
        }
    } finally { $lock.Dispose(); Remove-Item -LiteralPath $lockPath }
}
Write-Step "Done: $installed installed; $skipped preserved. Source checkout left in place."
if ($skipped) { exit 2 }
exit 0
