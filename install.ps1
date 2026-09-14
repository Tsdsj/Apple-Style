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
    return (Test-Path -LiteralPath (Join-Path $Path 'skills\Apple-Style\SKILL.md'))
}

function Get-Sources {
    param([string] $Destination)

    $git = Get-Command git -ErrorAction SilentlyContinue
    if ($git -and (Test-Path -LiteralPath (Join-Path $Destination '.git'))) {
        Write-Step "updating $Destination"
        & git -C $Destination fetch --depth 1 origin $Ref --quiet
        & git -C $Destination checkout --quiet FETCH_HEAD
    }
    elseif ($git) {
        Write-Step "cloning $RepoSlug@$Ref into $Destination"
        if (Test-Path -LiteralPath $Destination) { Remove-Item -LiteralPath $Destination -Recurse -Force }
        & git clone --depth 1 --branch $Ref --quiet "https://github.com/$RepoSlug.git" $Destination
    }
    else {
        Write-Step "downloading $RepoSlug@$Ref into $Destination"
        # Windows PowerShell 5.1 still defaults to TLS 1.0 on older builds
        try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 } catch { }
        $stage = Join-Path ([IO.Path]::GetTempPath()) ("apple-style-" + [Guid]::NewGuid().ToString('n'))
        New-Item -ItemType Directory -Path $stage -Force | Out-Null
        $zip = Join-Path $stage 'source.zip'
        try {
            Invoke-WebRequest -Uri "https://codeload.github.com/$RepoSlug/zip/refs/heads/$Ref" -OutFile $zip -UseBasicParsing
            Expand-Archive -LiteralPath $zip -DestinationPath $stage -Force
        }
        catch {
            Stop-WithError "download failed: $($_.Exception.Message)"
        }
        $extracted = Get-ChildItem -LiteralPath $stage -Directory | Select-Object -First 1
        if (-not $extracted) { Stop-WithError 'the downloaded archive was empty' }
        if (Test-Path -LiteralPath $Destination) { Remove-Item -LiteralPath $Destination -Recurse -Force }
        New-Item -ItemType Directory -Path (Split-Path -Parent $Destination) -Force | Out-Null
        Move-Item -LiteralPath $extracted.FullName -Destination $Destination
        Remove-Item -LiteralPath $stage -Recurse -Force -ErrorAction SilentlyContinue
    }

    if (-not (Test-Checkout $Destination)) {
        Stop-WithError "the copy at $Destination does not look like the Apple-Style repository"
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

# ---------------------------------------------------------------- helpers ---
function Test-ReparsePoint {
    param([string] $Path)
    $item = Get-Item -LiteralPath $Path -Force
    return (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0)
}

# Deleting a junction with Remove-Item -Recurse can delete the *target's*
# contents on Windows PowerShell. Directory.Delete removes only the link.
function Remove-Target {
    param([string] $Path)
    if (-not (Test-Path -LiteralPath $Path)) { return }
    if (Test-ReparsePoint $Path) { [IO.Directory]::Delete((Get-Item -LiteralPath $Path -Force).FullName) }
    else { Remove-Item -LiteralPath $Path -Recurse -Force }
}

# ---------------------------------------------------------------- install ---
$mode = if ($Uninstall) { 'uninstall' } elseif ($Copy) { 'copy' } else { 'link' }
Write-Step "Apple-Style - $mode from $source"

$installed = 0
foreach ($target in $targets) {
    if ($mode -ne 'uninstall') { New-Item -ItemType Directory -Path $target -Force | Out-Null }
    if (-not (Test-Path -LiteralPath $target)) { continue }
    Write-Step $target

    foreach ($skill in $SkillNames) {
        $dst = Join-Path $target $skill
        $src = Join-Path $source "skills\$skill"

        switch ($mode) {
            'uninstall' {
                if (Test-Path -LiteralPath $dst) {
                    if ((Test-ReparsePoint $dst) -or (Test-Path -LiteralPath (Join-Path $dst 'SKILL.md'))) {
                        Remove-Target $dst
                        Write-Ok "removed $skill"
                    }
                }
            }
            'copy' {
                Remove-Target $dst
                Copy-Item -LiteralPath $src -Destination $dst -Recurse -Force
                Write-Ok "copied $skill"
                $installed++
            }
            'link' {
                if ((Test-Path -LiteralPath $dst) -and -not (Test-ReparsePoint $dst)) {
                    Write-Note "$dst exists and is a real directory - left alone (use -Copy to overwrite)"
                }
                else {
                    Remove-Target $dst
                    try {
                        New-Item -ItemType Junction -Path $dst -Value $src -ErrorAction Stop | Out-Null
                        Write-Ok "linked $skill"
                    }
                    catch {
                        # Junctions fail across volumes and on some network paths
                        Copy-Item -LiteralPath $src -Destination $dst -Recurse -Force
                        Write-Note "junction not possible here, copied $skill instead"
                    }
                    $installed++
                }
            }
        }
    }
}

if ($mode -eq 'uninstall') {
    Write-Step ''
    Write-Step "Uninstalled. The source checkout at $source was left in place."
    exit 0
}

if ($installed -eq 0) { Stop-WithError 'nothing was installed' }

Write-Step ''
Write-Step "Done. $installed skill(s) installed."
Write-Step '  Claude Code : type /Apple-Style, or just describe the UI you want.'
Write-Step '  Codex       : the skills are discovered from ~\.codex\skills and ~\.agents\skills.'
if ($mode -eq 'link') {
    Write-Step "  Junctions, so 'git pull' in $source (or -Update) refreshes every install."
}
exit 0
