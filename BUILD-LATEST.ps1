[CmdletBinding()]
param(
    [switch]$SkipPause,
    [switch]$ReplaceExistingArchive,
    [switch]$BuildInstaller,
    [switch]$RequireAuthenticode,
    [string]$SigningCertificateThumbprint,
    [string]$TimestampUrl = 'http://timestamp.digicert.com'
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
    param(
        [string]$Folder,
        [string]$ExpectedVersion,
        [switch]$ValidateAuthenticode
    )
    $executable = Join-Path $Folder 'DrawScope.exe'
    $engine = Join-Path $Folder 'drawscope-engine.exe'
    if (-not (Test-Path -LiteralPath $executable -PathType Leaf)) {
        throw "DrawScope.exe is missing from the portable folder."
    }
    if (-not (Test-Path -LiteralPath $engine -PathType Leaf)) {
        throw "drawscope-engine.exe is missing from the portable folder."
    }
    if ($ValidateAuthenticode) {
        Assert-Authenticode -LiteralPath $executable
        Assert-Authenticode -LiteralPath $engine
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
        $analysisHealth.methodology_version -ne '1.3.0' -or
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
        $engineEvent.payload.engine_version -ne $ExpectedVersion -or
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

function Get-SignToolPath {
    $command = Get-Command 'signtool.exe' -ErrorAction SilentlyContinue
    if ($command) {
        return $command.Source
    }
    $windowsKits = Join-Path ${env:ProgramFiles(x86)} 'Windows Kits\10\bin'
    if (Test-Path -LiteralPath $windowsKits -PathType Container) {
        $candidate = Get-ChildItem -LiteralPath $windowsKits -Filter 'signtool.exe' -File -Recurse |
            Where-Object { $_.FullName -match '\\x64\\signtool\.exe$' } |
            Sort-Object FullName -Descending |
            Select-Object -First 1
        if ($candidate) {
            return $candidate.FullName
        }
    }
    throw 'signtool.exe is required for Authenticode signing but was not found.'
}

function Assert-Authenticode {
    param([string]$LiteralPath)
    $signature = Get-AuthenticodeSignature -LiteralPath $LiteralPath
    if ($signature.Status -ne 'Valid' -or $null -eq $signature.SignerCertificate) {
        throw "Authenticode verification failed for $LiteralPath ($($signature.Status))."
    }
}

function Sign-WindowsArtifact {
    param(
        [string]$LiteralPath,
        [string]$Thumbprint,
        [string]$TimestampServer
    )
    if ([string]::IsNullOrWhiteSpace($Thumbprint)) {
        return
    }
    $normalized = ($Thumbprint -replace '\s', '').ToUpperInvariant()
    if ($normalized -notmatch '^[0-9A-F]{40}$') {
        throw 'The Authenticode certificate thumbprint must contain exactly 40 hexadecimal characters.'
    }
    $signTool = Get-SignToolPath
    & $signTool sign /sha1 $normalized /fd SHA256 /tr $TimestampServer /td SHA256 /d 'DrawScope' /du 'https://nouraldinfarge.github.io/drawscope/' $LiteralPath
    if ($LASTEXITCODE -ne 0) {
        throw "Authenticode signing failed for $LiteralPath."
    }
    Assert-Authenticode -LiteralPath $LiteralPath
}

function Write-AnalysisEvidence {
    param(
        [string]$Folder,
        [string]$OutputPath,
        [string]$ExpectedPath,
        [string]$Workspace,
        [string]$EngineRoot,
        [string]$Version
    )
    $executable = Join-Path $Folder 'DrawScope.exe'
    Push-Location -LiteralPath $Folder
    try {
        $evidenceOutput = & $executable '--analysis-evidence'
        if ($LASTEXITCODE -ne 0) {
            throw "DrawScope analysis-evidence export failed with exit code $LASTEXITCODE."
        }
    }
    finally {
        Pop-Location
    }
    $evidence = $evidenceOutput | ConvertFrom-Json
    $manifest = Get-Content -Raw -LiteralPath (Join-Path $Workspace 'data\offline-database-manifest.json') | ConvertFrom-Json
    if (
        $evidence.evidence_schema_version -ne '1.0' -or
        $evidence.application.version -ne $Version -or
        $evidence.application.execution_boundary -ne 'DrawScope.exe -> drawscope-engine.exe' -or
        $evidence.archive.snapshot_built_at -ne $manifest.built_at -or
        $evidence.archive.draw_count -ne $manifest.database.draw_count -or
        $evidence.archive.database_bytes -ne $manifest.database.bytes -or
        $evidence.archive.database_sha256 -ne $manifest.database.sha256 -or
        $evidence.archive.known_gap_count -ne $manifest.known_gaps.Count -or
        $evidence.evaluation.seed -ne 20260728 -or
        $evidence.evaluation.backtest_limit -ne 250 -or
        $evidence.evaluation.signal_count -ne 30 -or
        $evidence.analysis.retrospective.best_pattern.confidence_score -gt 49
    ) {
        throw 'DrawScope returned invalid packaged analysis evidence.'
    }
    $encoded = $evidence | ConvertTo-Json -Depth 100
    [System.IO.File]::WriteAllText($OutputPath, "$encoded`n", [System.Text.UTF8Encoding]::new($false))
    Invoke-Checked -FilePath 'pnpm' -Arguments @(
        'exec', 'biome', 'format', '--write', $OutputPath
    ) -WorkingDirectory $Workspace
    $arguments = @(
        'run', '--project', $EngineRoot, 'python',
        (Join-Path $Workspace 'tools\verify_analysis_evidence.py'),
        $OutputPath
    )
    if (Test-Path -LiteralPath $ExpectedPath -PathType Leaf) {
        $arguments += @('--compare', $ExpectedPath)
    }
    Invoke-Checked -FilePath 'uv' -Arguments $arguments -WorkingDirectory $Workspace
    if (
        (Test-Path -LiteralPath $ExpectedPath -PathType Leaf) -and
        (Get-Sha256 -LiteralPath $OutputPath) -ne (Get-Sha256 -LiteralPath $ExpectedPath)
    ) {
        throw 'Canonical packaged analysis evidence differs byte-for-byte from the committed example.'
    }
}

try {
    $workspace = Get-Item -LiteralPath $PSScriptRoot
    $projectRoot = Get-Item -LiteralPath (Split-Path -Parent $workspace.FullName)
    $activeBuild = Join-Path $projectRoot.FullName 'active-build'
    $portableBuilds = Join-Path $projectRoot.FullName 'portable-builds'
    $installerBuilds = Join-Path $projectRoot.FullName 'installer-builds'
    $checksums = Join-Path $projectRoot.FullName 'checksums'
    $releaseMetadata = Join-Path $projectRoot.FullName 'release-metadata'
    Assert-DirectChild -Parent $projectRoot -ChildPath $activeBuild -ExpectedName 'active-build'
    Assert-DirectChild -Parent $projectRoot -ChildPath $installerBuilds -ExpectedName 'installer-builds'

    if ($RequireAuthenticode -and [string]::IsNullOrWhiteSpace($SigningCertificateThumbprint)) {
        throw 'A trusted Authenticode certificate thumbprint is required for a releasable build.'
    }

    $version = (Get-Content -Raw -LiteralPath (Join-Path $workspace.FullName 'VERSION')).Trim()
    if ($version -notmatch '^\d+\.\d+\.\d+([+-][0-9A-Za-z.-]+)?$') {
        throw 'VERSION is not a valid semantic version.'
    }
    $releaseName = "DrawScope-v$version-windows-x64-portable"
    $archivePath = Join-Path $portableBuilds "$releaseName.zip"
    $installerName = "DrawScope-v$version-windows-x64-setup.exe"
    $installerPath = Join-Path $installerBuilds $installerName
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
    if ($BuildInstaller -and (Test-Path -LiteralPath $installerPath)) {
        if (-not $ReplaceExistingArchive) {
            throw "Installer artifact already exists: $installerPath"
        }
        $resolvedInstaller = [System.IO.Path]::GetFullPath($installerPath)
        $resolvedInstallerBuilds = [System.IO.Path]::GetFullPath($installerBuilds).TrimEnd('\')
        if (
            [System.IO.Path]::GetDirectoryName($resolvedInstaller) -ne $resolvedInstallerBuilds -or
            [System.IO.Path]::GetFileName($resolvedInstaller) -ne $installerName
        ) {
            throw 'Refusing to replace an unexpected installer path.'
        }
        Remove-Item -LiteralPath $resolvedInstaller -Force
    }

    Write-Step 'Validating the local build environment'
    foreach ($commandName in @('node', 'pnpm', 'cargo', 'rustc', 'uv')) {
        if (-not (Get-Command $commandName -ErrorAction SilentlyContinue)) {
            throw "Required build tool is missing: $commandName"
        }
    }

    $standards = if ($env:CI -eq 'true') {
        @(
            (Join-Path $workspace.FullName 'README.md'),
            (Join-Path $workspace.FullName 'SECURITY.md'),
            (Join-Path $workspace.FullName 'docs\KNOWN-LIMITATIONS.md')
        )
    }
    else {
        @(
            (Join-Path $projectRoot.FullName 'Frontend_and_Backend_Standards.zip'),
            (Join-Path $projectRoot.FullName 'portable_app_architecture_prompt.md'),
            (Join-Path $projectRoot.FullName 'Technology_Stack_Simple.txt')
        )
    }
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

    Write-Step 'Rebuilding the offline archive from pinned source artifacts'
    Invoke-Checked -FilePath 'uv' -Arguments @(
        'run', '--project', $engineRoot, 'python',
        (Join-Path $workspace.FullName 'tools\build_offline_database.py'),
        '--frozen'
    ) -WorkingDirectory $workspace.FullName
    $reproRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("drawscope-repro-" + [Guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $reproRoot | Out-Null
    try {
        $reproDatabase = Join-Path $reproRoot 'offline-seed.sqlite3'
        $reproManifest = Join-Path $reproRoot 'offline-database-manifest.json'
        Invoke-Checked -FilePath 'uv' -Arguments @(
            'run', '--project', $engineRoot, 'python',
            (Join-Path $workspace.FullName 'tools\build_offline_database.py'),
            '--frozen',
            '--database-output', $reproDatabase,
            '--manifest-output', $reproManifest
        ) -WorkingDirectory $workspace.FullName
        $primaryDatabase = Join-Path $workspace.FullName 'data\offline-seed.sqlite3'
        $primaryManifest = Join-Path $workspace.FullName 'data\offline-database-manifest.json'
        if (
            (Get-Sha256 -LiteralPath $primaryDatabase) -ne (Get-Sha256 -LiteralPath $reproDatabase) -or
            (Get-Sha256 -LiteralPath $primaryManifest) -ne (Get-Sha256 -LiteralPath $reproManifest)
        ) {
            throw 'Two frozen offline-archive rebuilds produced different bytes.'
        }
    }
    finally {
        $resolvedReproRoot = [System.IO.Path]::GetFullPath($reproRoot)
        $resolvedTempRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath()).TrimEnd('\')
        if (
            $resolvedReproRoot.StartsWith("$resolvedTempRoot\drawscope-repro-", [System.StringComparison]::OrdinalIgnoreCase) -and
            (Test-Path -LiteralPath $resolvedReproRoot)
        ) {
            Remove-Item -LiteralPath $resolvedReproRoot -Recurse -Force
        }
    }

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
    $engineExecutable = Join-Path $engineRoot 'dist\drawscope-engine.exe'
    Sign-WindowsArtifact -LiteralPath $engineExecutable -Thumbprint $SigningCertificateThumbprint -TimestampServer $TimestampUrl

    Write-Step 'Building the Tauri executable without a bundle or installer'
    $desktopRoot = Join-Path $workspace.FullName 'apps\desktop'
    Invoke-Checked -FilePath 'pnpm' -Arguments @('tauri', 'build', '--no-bundle') -WorkingDirectory $desktopRoot
    $desktopExecutable = Join-Path $workspace.FullName 'target\release\DrawScope.exe'
    Sign-WindowsArtifact -LiteralPath $desktopExecutable -Thumbprint $SigningCertificateThumbprint -TimestampServer $TimestampUrl

    Write-Step 'Staging the portable runtime'
    $stageRoot = Join-Path $tempRoot $releaseName
    New-Item -ItemType Directory -Path $stageRoot | Out-Null
    Copy-Item -LiteralPath $desktopExecutable -Destination (Join-Path $stageRoot 'DrawScope.exe')
    Copy-Item -LiteralPath $engineExecutable -Destination (Join-Path $stageRoot 'drawscope-engine.exe')
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
    Test-Health -Folder $testFolder -ExpectedVersion $version -ValidateAuthenticode:$RequireAuthenticode
    $renamedFolder = Join-Path $spaceTestRoot 'DrawScope Renamed'
    Move-Item -LiteralPath $testFolder -Destination $renamedFolder
    Test-Health -Folder $renamedFolder -ExpectedVersion $version -ValidateAuthenticode:$RequireAuthenticode
    $movedParent = Join-Path $tempRoot 'relocated'
    New-Item -ItemType Directory -Path $movedParent | Out-Null
    $movedFolder = Join-Path $movedParent 'DrawScope Moved'
    Move-Item -LiteralPath $renamedFolder -Destination $movedFolder
    Test-Health -Folder $movedFolder -ExpectedVersion $version -ValidateAuthenticode:$RequireAuthenticode

    if ($BuildInstaller) {
        Write-Step 'Building and smoke-testing the Windows installer'
        $nsisOutput = Join-Path $workspace.FullName 'target\release\bundle\nsis'
        $resolvedNsisOutput = [System.IO.Path]::GetFullPath($nsisOutput)
        $resolvedTarget = [System.IO.Path]::GetFullPath((Join-Path $workspace.FullName 'target')).TrimEnd('\')
        if (-not $resolvedNsisOutput.StartsWith("$resolvedTarget\release\bundle\nsis", [System.StringComparison]::OrdinalIgnoreCase)) {
            throw 'The NSIS output path escaped the generated target directory.'
        }
        if (Test-Path -LiteralPath $resolvedNsisOutput) {
            Remove-Item -LiteralPath $resolvedNsisOutput -Recurse -Force
        }

        $installerArguments = @('tauri', 'build', '--bundles', 'nsis')
        if (-not [string]::IsNullOrWhiteSpace($SigningCertificateThumbprint)) {
            $normalizedThumbprint = ($SigningCertificateThumbprint -replace '\s', '').ToUpperInvariant()
            $signingConfiguration = Join-Path $tempRoot 'tauri-authenticode.conf.json'
            [ordered]@{
                bundle = [ordered]@{
                    windows = [ordered]@{
                        certificateThumbprint = $normalizedThumbprint
                        digestAlgorithm = 'sha256'
                        timestampUrl = $TimestampUrl
                    }
                }
            } | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $signingConfiguration -Encoding utf8
            $installerArguments += @('--config', $signingConfiguration)
        }
        Invoke-Checked -FilePath 'pnpm' -Arguments $installerArguments -WorkingDirectory $desktopRoot
        $generatedInstallers = @(Get-ChildItem -LiteralPath $resolvedNsisOutput -Filter '*-setup.exe' -File)
        if ($generatedInstallers.Count -ne 1) {
            throw "Expected exactly one NSIS setup executable; found $($generatedInstallers.Count)."
        }
        New-Item -ItemType Directory -Path $installerBuilds -Force | Out-Null
        Copy-Item -LiteralPath $generatedInstallers[0].FullName -Destination $installerPath
        if ($RequireAuthenticode) {
            Assert-Authenticode -LiteralPath $installerPath
        }
        $installerTestArguments = @(
            '-NoProfile', '-File', (Join-Path $workspace.FullName 'tools\Test-WindowsInstaller.ps1'),
            '-InstallerPath', $installerPath,
            '-ExpectedVersion', $version
        )
        if ($RequireAuthenticode) {
            $installerTestArguments += '-RequireAuthenticode'
        }
        Invoke-Checked -FilePath 'pwsh' -Arguments $installerTestArguments -WorkingDirectory $workspace.FullName
    }

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
    Test-Health -Folder $candidate -ExpectedVersion $version -ValidateAuthenticode:$RequireAuthenticode

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
        Test-Health -Folder $activeBuild -ExpectedVersion $version -ValidateAuthenticode:$RequireAuthenticode
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
    $analysisEvidenceName = "drawscope-v$version-analysis-evidence.json"
    $analysisEvidencePath = Join-Path $releaseMetadata $analysisEvidenceName
    $expectedEvidencePath = Join-Path $workspace.FullName "examples\powerball-retrospective-v$version\analysis-evidence.json"
    Write-AnalysisEvidence -Folder $stageRoot -OutputPath $analysisEvidencePath -ExpectedPath $expectedEvidencePath -Workspace $workspace.FullName -EngineRoot $engineRoot -Version $version
    $hash = Get-Sha256 -LiteralPath $archivePath
    Set-Content -LiteralPath (Join-Path $checksums "$releaseName.sha256") -Value "$hash  $([System.IO.Path]::GetFileName($archivePath))" -Encoding ascii
    $analysisEvidenceHash = Get-Sha256 -LiteralPath $analysisEvidencePath
    Set-Content -LiteralPath (Join-Path $checksums "$analysisEvidenceName.sha256") -Value "$analysisEvidenceHash  $analysisEvidenceName" -Encoding ascii
    $installerHash = $null
    if ($BuildInstaller) {
        $installerHash = Get-Sha256 -LiteralPath $installerPath
        Set-Content -LiteralPath (Join-Path $checksums "$installerName.sha256") -Value "$installerHash  $installerName" -Encoding ascii
    }
    $sqliteVersion = (& (Join-Path $activeBuild 'DrawScope.exe') '--health-check' | ConvertFrom-Json).sqlite_version
    [ordered]@{
        app = 'DrawScope'
        version = $version
        target = 'windows-x64'
        formats = if ($BuildInstaller) { @('portable-zip', 'nsis-installer') } else { @('portable-zip') }
        installer_artifacts = [bool]$BuildInstaller
        authenticode_required = [bool]$RequireAuthenticode
        authenticode_applied = -not [string]::IsNullOrWhiteSpace($SigningCertificateThumbprint)
        archive = [System.IO.Path]::GetFileName($archivePath)
        sha256 = $hash
        installer = if ($BuildInstaller) { $installerName } else { $null }
        installer_sha256 = $installerHash
        analysis_evidence = $analysisEvidenceName
        analysis_evidence_sha256 = $analysisEvidenceHash
        built_at = [DateTime]::UtcNow.ToString('o')
        contract_version = '1.0'
        database_schema_version = 4
        methodology_version = '1.3.0'
        engine_version = $version
        sqlite_version = $sqliteVersion
        active_build = 'active-build'
        data_preservation = 'user data/**, imports/**, and config/user.json; bundled offline seed and manifest are upgraded'
        deployment = 'validated transactional replacement with rollback'
    } | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $releaseMetadata "$releaseName.json") -Encoding utf8

    Write-Host "`nPortable archive: $archivePath" -ForegroundColor Green
    if ($BuildInstaller) {
        Write-Host "Windows installer: $installerPath" -ForegroundColor Green
    }
    Write-Host "Analysis evidence: $analysisEvidencePath" -ForegroundColor Green
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
