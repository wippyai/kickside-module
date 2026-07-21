param(
    [Parameter(Position = 0)]
    [ValidateSet('init', 'setup', 'check', 'build', 'dev', 'lint', 'typecheck', 'test', 'test-pg', 'postgres-up', 'postgres-down', 'verify', 'release-check', 'publish')]
    [string]$Target = 'verify',
    [string]$Organization,
    [string]$ModuleName,
    [string]$Title,
    [string]$Namespace,
    [string]$Tag,
    [string]$GitHubOwner,
    [ValidateSet('private', 'public')]
    [string]$Visibility = 'private'
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path

function Invoke-Checked {
    param([string]$Command, [string[]]$Arguments, [string]$Directory = $Root)
    Push-Location $Directory
    try {
        & $Command @Arguments
        if ($LASTEXITCODE -ne 0) { throw "$Command failed with exit code $LASTEXITCODE" }
    } finally {
        Pop-Location
    }
}

function Invoke-Init {
    if (-not $Organization -or -not $ModuleName -or -not $Title) {
        throw 'init requires -Organization, -ModuleName, and -Title'
    }
    $args = @('scripts/init-module.mjs', '--organization', $Organization, '--module', $ModuleName, '--title', $Title)
    if ($Namespace) { $args += @('--namespace', $Namespace) }
    if ($Tag) { $args += @('--tag', $Tag) }
    if ($GitHubOwner) { $args += @('--github-owner', $GitHubOwner) }
    Invoke-Checked node $args
}

function Invoke-Setup {
    Invoke-Checked wippy @('update')
    Invoke-Checked wippy @('install') (Join-Path $Root 'test')
    Invoke-Checked npm @('--prefix', 'ui', 'ci')
}

function Invoke-Check {
    Invoke-Checked node @('scripts/check-module.mjs')
    Invoke-Checked node @('scripts/test-initializer.mjs')
}

function Invoke-Build { Invoke-Checked npm @('--prefix', 'ui', 'run', 'build') }
function Invoke-Lint { Invoke-Checked wippy @('lint') }
function Invoke-Typecheck { Invoke-Checked npm @('--prefix', 'ui', 'run', 'type-check') }
function Invoke-Test { Invoke-Checked wippy @('run', 'test') (Join-Path $Root 'test') }
function Invoke-TestPg { Invoke-Checked wippy @('run', 'test', '--profile', 'postgres') (Join-Path $Root 'test') }
function Invoke-Verify {
    Invoke-Setup
    Invoke-Check
    Invoke-Lint
    Invoke-Typecheck
    Invoke-Build
    Invoke-Test
}

switch ($Target) {
    'init' { Invoke-Init }
    'setup' { Invoke-Setup }
    'check' { Invoke-Check }
    'build' { Invoke-Build }
    'dev' { Invoke-Checked npm @('--prefix', 'ui', 'run', 'dev') }
    'lint' { Invoke-Lint }
    'typecheck' { Invoke-Typecheck }
    'test' { Invoke-Test }
    'test-pg' { Invoke-TestPg }
    'postgres-up' { Invoke-Checked docker @('compose', '-f', 'compose.test.yaml', 'up', '-d', '--wait') }
    'postgres-down' { Invoke-Checked docker @('compose', '-f', 'compose.test.yaml', 'down', '-v') }
    'verify' { Invoke-Verify }
    'release-check' {
        Invoke-Verify
        Invoke-Checked wippy @('auth', 'status')
        Invoke-Checked wippy @('publish', '--dry-run', '--create', '--module-visibility', $Visibility, '--module-type', 'plugin', '--embed', 'ui_fs')
    }
    'publish' {
        Invoke-Build
        Invoke-Check
        Invoke-Checked wippy @('auth', 'status')
        Invoke-Checked wippy @('publish', '--create', '--module-visibility', $Visibility, '--module-type', 'plugin', '--embed', 'ui_fs')
    }
}
