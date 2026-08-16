[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$workspaceRoot = [System.IO.Path]::GetFullPath(
    (Join-Path $PSScriptRoot '..')
).TrimEnd('\')

function Remove-GeneratedTarget {
    param([Parameter(Mandatory)][string]$RelativePath)

    $resolved = [System.IO.Path]::GetFullPath(
        (Join-Path $workspaceRoot $RelativePath)
    )
    if (
        -not $resolved.StartsWith(
            "$workspaceRoot\",
            [System.StringComparison]::OrdinalIgnoreCase
        )
    ) {
        throw "Generated target escaped the workspace: $resolved"
    }
    if (Test-Path -LiteralPath $resolved) {
        Remove-Item -LiteralPath $resolved -Recurse -Force
        Write-Host "Removed generated artifact: $RelativePath"
    }
}

@(
    'apps\desktop\dist',
    'packages\contracts\dist',
    'packages\contracts\tsconfig.tsbuildinfo',
    '.mypy_cache',
    '.pytest_cache',
    '.ruff_cache',
    'tools\__pycache__',
    'engines\drawscope-engine\.mypy_cache',
    'engines\drawscope-engine\.pytest_cache',
    'engines\drawscope-engine\.ruff_cache',
    'engines\drawscope-engine\build',
    'engines\drawscope-engine\dist',
    'engines\drawscope-engine\src\drawscope_engine\__pycache__',
    'engines\drawscope-engine\src\drawscope_engine\protocol\__pycache__',
    'engines\drawscope-engine\src\drawscope_engine\statistics\__pycache__',
    'engines\drawscope-engine\tests\__pycache__',
    'site\dist',
    'temp\archive-freshness.json',
    'temp\archive-freshness.md',
    'temp\evidence-generation',
    'temp\portable-build'
) | ForEach-Object { Remove-GeneratedTarget -RelativePath $_ }
