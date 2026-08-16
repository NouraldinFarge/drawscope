[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$InstallerPath,
    [Parameter(Mandatory = $true)]
    [string]$ExpectedVersion,
    [switch]$RequireAuthenticode
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Assert-ValidSignature {
    param([string]$LiteralPath)
    $signature = Get-AuthenticodeSignature -LiteralPath $LiteralPath
    if ($signature.Status -ne 'Valid' -or $null -eq $signature.SignerCertificate) {
        throw "Authenticode verification failed for $LiteralPath ($($signature.Status))."
    }
}

$resolvedInstaller = (Resolve-Path -LiteralPath $InstallerPath).Path
if ([System.IO.Path]::GetExtension($resolvedInstaller) -ne '.exe') {
    throw 'The installer smoke test accepts an explicit .exe installer only.'
}
if ($RequireAuthenticode) {
    Assert-ValidSignature -LiteralPath $resolvedInstaller
}

$temporaryBase = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath()).TrimEnd('\')
$installRoot = Join-Path $temporaryBase ("drawscope-installer-smoke-" + [Guid]::NewGuid().ToString('N'))
$resolvedInstallRoot = [System.IO.Path]::GetFullPath($installRoot)
if (-not $resolvedInstallRoot.StartsWith("$temporaryBase\drawscope-installer-smoke-", [System.StringComparison]::OrdinalIgnoreCase)) {
    throw 'The installer smoke-test target escaped its guarded temporary root.'
}

try {
    $install = Start-Process -FilePath $resolvedInstaller -ArgumentList @('/S', '/NS', "/D=$resolvedInstallRoot") -Wait -PassThru -WindowStyle Hidden
    if ($install.ExitCode -ne 0) {
        throw "The silent installer failed with exit code $($install.ExitCode)."
    }

    $app = Join-Path $resolvedInstallRoot 'DrawScope.exe'
    $engine = Join-Path $resolvedInstallRoot 'drawscope-engine.exe'
    $seed = Join-Path $resolvedInstallRoot 'data\offline-seed.sqlite3'
    $manifest = Join-Path $resolvedInstallRoot 'data\offline-database-manifest.json'
    $readme = Join-Path $resolvedInstallRoot 'README.txt'
    $versionFile = Join-Path $resolvedInstallRoot 'VERSION'
    $license = Join-Path $resolvedInstallRoot 'licenses\DrawScope-LICENSE.txt'
    $marker = Join-Path $resolvedInstallRoot 'installed.marker'
    $importInbox = Join-Path $resolvedInstallRoot 'imports\lottery-net'
    foreach ($required in @($app, $engine, $seed, $manifest, $readme, $versionFile, $license, $marker)) {
        if (-not (Test-Path -LiteralPath $required -PathType Leaf)) {
            throw "Installed distribution is missing $required."
        }
    }
    if (-not (Test-Path -LiteralPath $importInbox -PathType Container)) {
        throw 'The installed saved-page inbox is missing.'
    }
    if ((Get-Content -Raw -LiteralPath $versionFile).Trim() -ne $ExpectedVersion) {
        throw 'The installed VERSION file does not match the expected application version.'
    }
    if ($RequireAuthenticode) {
        Assert-ValidSignature -LiteralPath $app
        Assert-ValidSignature -LiteralPath $engine
    }

    $health = (& $app '--health-check' | ConvertFrom-Json)
    if ($LASTEXITCODE -ne 0 -or $health.status -ne 'ok' -or $health.app_version -ne $ExpectedVersion) {
        throw 'The installed application failed its health check.'
    }
    $analysis = (& $app '--analysis-health-check' | ConvertFrom-Json)
    if (
        $LASTEXITCODE -ne 0 -or
        $analysis.status -ne 'ok' -or
        $analysis.pattern_signal_count -ne 30 -or
        $analysis.pattern_backtest_draws -lt 1 -or
        $analysis.best_pattern_confidence_score -gt 49
    ) {
        throw 'The installed application failed its analytics health check.'
    }

    $userDatabase = Join-Path $resolvedInstallRoot 'data\drawscope.sqlite3'
    if (-not (Test-Path -LiteralPath $userDatabase -PathType Leaf)) {
        throw 'The installed application did not create its user database.'
    }
    $uninstaller = Join-Path $resolvedInstallRoot 'uninstall.exe'
    $uninstall = Start-Process -FilePath $uninstaller -ArgumentList @('/S') -Wait -PassThru -WindowStyle Hidden
    if ($uninstall.ExitCode -ne 0) {
        throw "The silent uninstaller failed with exit code $($uninstall.ExitCode)."
    }
    foreach ($removedResource in @($app, $engine, $seed, $manifest, $readme, $versionFile, $license, $marker)) {
        if (Test-Path -LiteralPath $removedResource) {
            throw "The uninstaller left a known application resource behind: $removedResource"
        }
    }
    if (-not (Test-Path -LiteralPath $userDatabase -PathType Leaf)) {
        throw 'The uninstaller removed the user database without an explicit data-deletion choice.'
    }

    Write-Host "Installer smoke test passed for DrawScope $ExpectedVersion." -ForegroundColor Green
}
finally {
    if (Test-Path -LiteralPath $resolvedInstallRoot) {
        Remove-Item -LiteralPath $resolvedInstallRoot -Recurse -Force
    }
}
