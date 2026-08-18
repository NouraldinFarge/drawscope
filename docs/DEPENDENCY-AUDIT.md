# Dependency-audit evidence

DrawScope keeps three independently locked dependency graphs because its shipped desktop path crosses JavaScript/TypeScript, Rust, and Python. The dedicated [`Dependency audit`](../.github/workflows/dependency-audit.yml) workflow checks all three graphs on relevant pull requests and pushes, monthly, and on demand. It has read-only repository permissions and uses immutable GitHub Action revisions.

## Reproduce the checks

From the repository root:

```powershell
pnpm audit --audit-level high

$auditRequirements = Join-Path $env:TEMP "drawscope-audit-requirements.txt"
uv export --project engines/drawscope-engine --frozen --all-groups `
  --no-emit-project --format requirements.txt --output-file $auditRequirements --quiet
uvx --from pip-audit==2.10.1 pip-audit `
  --requirement $auditRequirements --strict --progress-spinner off

cargo audit --file Cargo.lock
```

The JavaScript check includes development tooling because build and test dependencies can still affect CI and release integrity. The Python check exports the complete frozen runtime-and-development graph from `uv.lock`; it excludes only the local `drawscope-engine` package itself. The Rust check rejects known vulnerabilities while reporting informational maintenance and soundness advisories for review.

## Current reviewed result

On 2026-08-17, all three commands reported **no known vulnerabilities** in their locked graphs. `cargo audit 0.22.2` also reported informational advisories in Tauri's cross-platform GTK3 and legacy Unicode dependency branches. DrawScope ships only the Windows x64 target, those GTK3 crates are not part of the compiled Windows application, and no compatible patched GTK3 line exists. The warnings remain visible in audit output and in [known limitations](KNOWN-LIMITATIONS.md); they are not suppressed or described as fixed.

This dated result is evidence for one lockfile state, not a permanent security claim. Dependabot, CodeQL, monthly audit runs, release review, and the private vulnerability-reporting channel remain separate controls.
