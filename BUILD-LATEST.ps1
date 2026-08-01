[CmdletBinding()]
param(
    [switch]$SkipPause,
    [switch]$ReplaceExistingArchive
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Write-Step {
    param([string]$Message)
    Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Assert-DirectChild {
    param(
        [System.IO.DirectoryInfo]$Parent,
        [string]$ChildPath,
        [string]$ExpectedName
    )
    $resolvedParent = [System.IO.Path]::GetFullPath($Parent.FullName).TrimEnd('\')
    $resolvedChild = [System.IO.Path]::GetFullPath($ChildPath).TrimEnd('\')
    if ([System.IO.Path]::GetDirectoryName($resolvedChild) -ne $resolvedParent) {
        throw "$ExpectedName must be a direct child of the project root."
    }
    if ([System.IO.Path]::GetFileName($resolvedChild) -ne $ExpectedName) {
        throw "Refusing an unexpected $ExpectedName path."
    }
}

function Invoke-Checked {
    param(
        [string]$FilePath,
        [string[]]$Arguments,
        [string]$WorkingDirectory
    )
    Push-Location -LiteralPath $WorkingDirectory
    try {
        & $FilePath @Arguments
        if ($LASTEXITCODE -ne 0) {
            throw "$FilePath failed with exit code $LASTEXITCODE."
        }
    }
    finally {
        Pop-Location
    }
}

function Test-Health {
    param([string]$Folder)
    $executable = Join-Path $Folder 'DrawScope.exe'
    $engine = Join-Path $Folder 'drawscope-engine.exe'
    if (-not (Test-Path -LiteralPath $executable -PathType Leaf)) {
        throw "DrawScope.exe is missing from the portable folder."
    }
    if (-not (Test-Path -LiteralPath $engine -PathType Leaf)) {
        throw "drawscope-engine.exe is missing from the portable folder."
    }
    Invoke-Checked -FilePath $executable -Arguments @('--health-check') -WorkingDirectory $Folder
    Push-Location -LiteralPath $Folder
    try {
        $analysisOutput = & $executable '--analysis-health-check'
        if ($LASTEXITCODE -ne 0) {
            throw "DrawScope analysis health check failed with exit code $LASTEXITCODE."
        }
    }
    finally {
        Pop-Location
    }
    Write-Output $analysisOutput
    $analysisHealth = $analysisOutput | ConvertFrom-Json
    if (
        $analysisHealth.status -ne 'ok' -or
        $analysisHealth.methodology_version -ne '1.2.0' -or
        $analysisHealth.sample_size -lt 1 -or
        $analysisHealth.pattern_backtest_draws -ne 250 -or
        $analysisHealth.pattern_signal_count -ne 30 -or
        $null -eq $analysisHealth.best_pattern_confidence_score -or
        $analysisHealth.best_pattern_confidence_score -gt 49 -or
        $analysisHealth.theoretical_jackpot_odds -ne '1 in 292,201,338'
    ) {
        throw 'DrawScope returned an invalid pattern-analysis health result.'
    }
    $engineRequest = [ordered]@{
        schema_version = '1.0'
        message_id = '00000000-0000-4000-8000-000000000001'
        job_id = '00000000-0000-4000-8000-000000000002'
        attempt_id = '00000000-0000-4000-8000-000000000003'
        sequence_number = 1
        occurred_at = [DateTime]::UtcNow.ToString('o')
        type = 'health_check'
        payload = @{}
    } | ConvertTo-Json -Compress
    $engineOutput = $engineRequest | & $engine
    if ($LASTEXITCODE -ne 0) {
        throw "drawscope-engine.exe health check failed with exit code $LASTEXITCODE."
    }
    $engineEvent = $engineOutput | ConvertFrom-Json
    if (
        $engineEvent.type -ne 'analysis_completed' -or
        $engineEvent.sequence_number -ne 1 -or
        $engineEvent.payload.health -ne 'ok' -or
        $engineEvent.payload.engine_version -ne $version -or
        $engineEvent.payload.contract_version -ne '1.0'
    ) {
        throw 'drawscope-engine.exe returned an invalid health event.'
    }
}

function Get-Sha256 {
    param([string]$LiteralPath)
    $stream = [System.IO.File]::OpenRead($LiteralPath)
    $algorithm = [System.Security.Cryptography.SHA256]::Create()
    try {
        return ([System.BitConverter]::ToString($algorithm.ComputeHash($stream))).Replace('-', '').ToLowerInvariant()
    }
    finally {
        $algorithm.Dispose()
        $stream.Dispose()
    }
}

try {
    $workspace = Get-Item -LiteralPath $PSScriptRoot
    $projectRoot = Get-Item -LiteralPath (Split-Path -Parent $workspace.FullName)
    $activeBuild = Join-Path $projectRoot.FullName 'active-build'
    $portableBuilds = Join-Path $projectRoot.FullName 'portable-builds'
    $checksums = Join-Path $projectRoot.FullName 'checksums'
    $releaseMetadata = Join-Path $projectRoot.FullName 'release-metadata'
    Assert-DirectChild -Parent $projectRoot -ChildPath $activeBuild -ExpectedName 'active-build'

    $version = (Get-Content -Raw -LiteralPath (Join-Path $workspace.FullName 'VERSION')).Trim()
    if ($version -notmatch '^\d+\.\d+\.\d+([+-][0-9A-Za-z.-]+)?$') {
        throw 'VERSION is not a valid semantic version.'
    }
    $releaseName = "DrawScope-v$version-windows-x64-portable"
    $archivePath = Join-Path $portableBuilds "$releaseName.zip"
    if (Test-Path -LiteralPath $archivePath) {
        if (-not $ReplaceExistingArchive) {
            throw "Release archive already exists: $archivePath"
        }
        $resolvedArchive = [System.IO.Path]::GetFullPath($archivePath)
        $resolvedPortableBuilds = [System.IO.Path]::GetFullPath($portableBuilds).TrimEnd('\')
        if (
            [System.IO.Path]::GetDirectoryName($resolvedArchive) -ne $resolvedPortableBuilds -or
            [System.IO.Path]::GetFileName($resolvedArchive) -ne "$releaseName.zip"
        ) {
            throw 'Refusing to replace an unexpected release archive path.'
        }
        Remove-Item -LiteralPath $resolvedArchive -Force
    }

    Write-Step 'Validating the local build environment'
    foreach ($commandName in @('node', 'pnpm', 'cargo', 'rustc', 'uv')) {
        if (-not (Get-Command $commandName -ErrorAction SilentlyContinue)) {
            throw "Required build tool is missing: $commandName"
        }
    }

    $standards = @(
        (Join-Path $projectRoot.FullName 'Frontend_and_Backend_Standards.zip'),
        (Join-Path $projectRoot.FullName 'portable_app_architecture_prompt.md'),
        (Join-Path $projectRoot.FullName 'Technology_Stack_Simple.txt')
    )
    foreach ($standard in $standards) {
        if (-not (Test-Path -LiteralPath $standard -PathType Leaf)) {
            throw "Mandatory build standard is missing: $standard"
        }
    }

    Write-Step 'Restoring locked development dependencies'
    Invoke-Checked -FilePath 'pnpm' -Arguments @('install', '--frozen-lockfile') -WorkingDirectory $workspace.FullName
    $engineRoot = Join-Path $workspace.FullName 'engines\drawscope-engine'
    Invoke-Checked -FilePath 'uv' -Arguments @('sync', '--project', $engineRoot, '--locked', '--all-groups') -WorkingDirectory $workspace.FullName

    Write-Step 'Running frontend and contract quality gates'
    Invoke-Checked -FilePath 'pnpm' -Arguments @('verify') -WorkingDirectory $workspace.FullName

    Write-Step 'Running Python quality gates'
    Invoke-Checked -FilePath 'uv' -Arguments @('run', '--project', $engineRoot, 'ruff', 'format', '--check', '.') -WorkingDirectory $engineRoot
    Invoke-Checked -FilePath 'uv' -Arguments @('run', '--project', $engineRoot, 'ruff', 'check', '.') -WorkingDirectory $engineRoot
    Invoke-Checked -FilePath 'uv' -Arguments @('run', '--project', $engineRoot, 'mypy') -WorkingDirectory $engineRoot
    Invoke-Checked -FilePath 'uv' -Arguments @('run', '--project', $engineRoot, 'pytest') -WorkingDirectory $engineRoot

    Write-Step 'Running Rust quality gates'
    Invoke-Checked -FilePath 'cargo' -Arguments @('fmt', '--all', '--check') -WorkingDirectory $workspace.FullName
    Invoke-Checked -FilePath 'cargo' -Arguments @('check', '--locked', '--workspace') -WorkingDirectory $workspace.FullName
    Invoke-Checked -FilePath 'cargo' -Arguments @('clippy', '--locked', '--workspace', '--all-targets', '--', '-D', 'warnings') -WorkingDirectory $workspace.FullName
    Invoke-Checked -FilePath 'cargo' -Arguments @('test', '--locked', '--workspace') -WorkingDirectory $workspace.FullName

    $tempRoot = Join-Path $workspace.FullName 'temp\portable-build'
    $outputRoot = Join-Path $workspace.FullName 'output'
    foreach ($generatedRoot in @($tempRoot, $outputRoot)) {
        $fullGenerated = [System.IO.Path]::GetFullPath($generatedRoot)
        if (-not $fullGenerated.StartsWith($workspace.FullName, [System.StringComparison]::OrdinalIgnoreCase)) {
            throw "Generated path escaped the workspace: $fullGenerated"
        }
        if (Test-Path -LiteralPath $fullGenerated) {
            Remove-Item -LiteralPath $fullGenerated -Recurse -Force
        }
        New-Item -ItemType Directory -Path $fullGenerated | Out-Null
    }

    Write-Step 'Building the bundled analytics engine'
    $engineEntry = Join-Path $engineRoot 'src\drawscope_engine\cli.py'
    Invoke-Checked -FilePath 'uv' -Arguments @(
        'run', '--project', $engineRoot, 'pyinstaller',
        '--noconfirm', '--clean', '--onefile',
        '--name', 'drawscope-engine',
        '--distpath', (Join-Path $engineRoot 'dist'),
        '--workpath', (Join-Path $engineRoot 'build'),
        '--specpath', (Join-Path $engineRoot 'build'),
        $engineEntry
    ) -WorkingDirectory $engineRoot

    Write-Step 'Building the Tauri executable without a bundle or installer'
    $desktopRoot = Join-Path $workspace.FullName 'apps\desktop'
    Invoke-Checked -FilePath 'pnpm' -Arguments @('tauri', 'build', '--no-bundle') -WorkingDirectory $desktopRoot

    Write-Step 'Staging the portable runtime'
    $stageRoot = Join-Path $tempRoot $releaseName
    New-Item -ItemType Directory -Path $stageRoot | Out-Null
    Copy-Item -LiteralPath (Join-Path $workspace.FullName 'target\release\DrawScope.exe') -Destination (Join-Path $stageRoot 'DrawScope.exe')
    Copy-Item -LiteralPath (Join-Path $engineRoot 'dist\drawscope-engine.exe') -Destination (Join-Path $stageRoot 'drawscope-engine.exe')
    Copy-Item -LiteralPath (Join-Path $workspace.FullName 'release\launch-portable.bat') -Destination (Join-Path $stageRoot 'launch-portable.bat')
    Copy-Item -LiteralPath (Join-Path $workspace.FullName 'release\README.txt') -Destination (Join-Path $stageRoot 'README.txt')
    Copy-Item -LiteralPath (Join-Path $workspace.FullName 'VERSION') -Destination (Join-Path $stageRoot 'VERSION')
    foreach ($directory in @('assets', 'config', 'data', 'logs', 'cache', 'runtime', 'licenses', 'imports', 'imports\lottery-net')) {
        New-Item -ItemType Directory -Path (Join-Path $stageRoot $directory) -Force | Out-Null
    }
    Copy-Item -LiteralPath (Join-Path $workspace.FullName 'LICENSE') -Destination (Join-Path $stageRoot 'licenses\DrawScope-LICENSE.txt')
    $offlineSeed = Join-Path $workspace.FullName 'data\offline-seed.sqlite3'
    $offlineManifest = Join-Path $workspace.FullName 'data\offline-database-manifest.json'
    foreach ($offlineArtifact in @($offlineSeed, $offlineManifest)) {
        if (-not (Test-Path -LiteralPath $offlineArtifact -PathType Leaf)) {
            throw "Required offline database artifact is missing: $offlineArtifact"
        }
    }
    Copy-Item -LiteralPath $offlineSeed -Destination (Join-Path $stageRoot 'data\offline-seed.sqlite3')
    Copy-Item -LiteralPath $offlineManifest -Destination (Join-Path $stageRoot 'data\offline-database-manifest.json')

    $prohibited = Get-ChildItem -LiteralPath $stageRoot -Recurse -File | Where-Object {
        $_.Extension -in @('.msi', '.msix', '.appx') -or
        $_.Name -match '(?i)(setup|uninstall|nsis|inno)'
    }
    if ($prohibited) {
        throw 'Installer artifacts were found in the portable stage.'
    }

    Write-Step 'Creating and validating the portable archive'
    New-Item -ItemType Directory -Path $portableBuilds -Force | Out-Null
    Compress-Archive -LiteralPath $stageRoot -DestinationPath $archivePath -CompressionLevel Optimal
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $archive = [System.IO.Compression.ZipFile]::OpenRead($archivePath)
    try {
        if ($archive.Entries.Count -lt 10) {
            throw 'Portable archive is unexpectedly incomplete.'
        }
        foreach ($entry in $archive.Entries) {
            if ($entry.FullName -match '(^|/)\.\.(/|$)' -or [System.IO.Path]::IsPathRooted($entry.FullName)) {
                throw "Unsafe archive entry: $($entry.FullName)"
            }
        }
    }
    finally {
        $archive.Dispose()
    }

    $spaceTestRoot = Join-Path $tempRoot 'path with spaces'
    Expand-Archive -LiteralPath $archivePath -DestinationPath $spaceTestRoot
    $testFolder = Join-Path $spaceTestRoot $releaseName
    Test-Health -Folder $testFolder
    $renamedFolder = Join-Path $spaceTestRoot 'DrawScope Renamed'
    Move-Item -LiteralPath $testFolder -Destination $renamedFolder
    Test-Health -Folder $renamedFolder
    $movedParent = Join-Path $tempRoot 'relocated'
    New-Item -ItemType Directory -Path $movedParent | Out-Null
    $movedFolder = Join-Path $movedParent 'DrawScope Moved'
    Move-Item -LiteralPath $renamedFolder -Destination $movedFolder
    Test-Health -Folder $movedFolder

    Write-Step 'Preparing a transaction-safe active build replacement'
    $deploymentRoot = Join-Path $tempRoot 'deployment'
    Expand-Archive -LiteralPath $archivePath -DestinationPath $deploymentRoot
    $candidate = Join-Path $deploymentRoot $releaseName
    if (Test-Path -LiteralPath (Join-Path $activeBuild 'data')) {
        Get-ChildItem -LiteralPath (Join-Path $activeBuild 'data') -Force -ErrorAction SilentlyContinue |
            Where-Object { $_.Name -notin @('offline-seed.sqlite3', 'offline-database-manifest.json') } |
            Copy-Item -Destination (Join-Path $candidate 'data') -Recurse -Force
    }
    if (Test-Path -LiteralPath (Join-Path $activeBuild 'imports')) {
        Get-ChildItem -LiteralPath (Join-Path $activeBuild 'imports') -Force -ErrorAction SilentlyContinue |
            Copy-Item -Destination (Join-Path $candidate 'imports') -Recurse -Force
    }
    $oldUserConfig = Join-Path $activeBuild 'config\user.json'
    if (Test-Path -LiteralPath $oldUserConfig -PathType Leaf) {
        Copy-Item -LiteralPath $oldUserConfig -Destination (Join-Path $candidate 'config\user.json') -Force
    }
    Test-Health -Folder $candidate

    $backup = Join-Path $projectRoot.FullName '.active-build-backup'
    Assert-DirectChild -Parent $projectRoot -ChildPath $backup -ExpectedName '.active-build-backup'
    if (Test-Path -LiteralPath $backup) {
        Remove-Item -LiteralPath $backup -Recurse -Force
    }
    $hadActiveBuild = Test-Path -LiteralPath $activeBuild
    try {
        if ($hadActiveBuild) {
            Move-Item -LiteralPath $activeBuild -Destination $backup
        }
        Move-Item -LiteralPath $candidate -Destination $activeBuild
        Test-Health -Folder $activeBuild
        if (Test-Path -LiteralPath $backup) {
            Remove-Item -LiteralPath $backup -Recurse -Force
        }
    }
    catch {
        if (Test-Path -LiteralPath $activeBuild) {
            Remove-Item -LiteralPath $activeBuild -Recurse -Force
        }
        if (Test-Path -LiteralPath $backup) {
            Move-Item -LiteralPath $backup -Destination $activeBuild
        }
        throw
    }

    Write-Step 'Writing checksum and release metadata'
    New-Item -ItemType Directory -Path $checksums -Force | Out-Null
    New-Item -ItemType Directory -Path $releaseMetadata -Force | Out-Null
    $hash = Get-Sha256 -LiteralPath $archivePath
    Set-Content -LiteralPath (Join-Path $checksums "$releaseName.sha256") -Value "$hash  $([System.IO.Path]::GetFileName($archivePath))" -Encoding ascii
    $sqliteVersion = (& (Join-Path $activeBuild 'DrawScope.exe') '--health-check' | ConvertFrom-Json).sqlite_version
    [ordered]@{
        app = 'DrawScope'
        version = $version
        target = 'windows-x64'
        format = 'portable-zip'
        installer_artifacts = $false
        archive = [System.IO.Path]::GetFileName($archivePath)
        sha256 = $hash
        built_at = [DateTime]::UtcNow.ToString('o')
        contract_version = '1.0'
        database_schema_version = 4
        methodology_version = '1.2.0'
        engine_version = $version
        sqlite_version = $sqliteVersion
        active_build = 'active-build'
        data_preservation = 'user data/**, imports/**, and config/user.json; bundled offline seed and manifest are upgraded'
        deployment = 'validated transactional replacement with rollback'
    } | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $releaseMetadata "$releaseName.json") -Encoding utf8

    Write-Host "`nPortable archive: $archivePath" -ForegroundColor Green
    Write-Host "Active build:     $activeBuild" -ForegroundColor Green
    exit 0
}
catch {
    Write-Host "`nBUILD FAILED" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host 'The previous active build was preserved or restored.' -ForegroundColor Yellow
    if (-not $SkipPause) {
        Write-Host 'Return to the build window for the failing quality gate and diagnostic.' -ForegroundColor Yellow
    }
    exit 1
}
