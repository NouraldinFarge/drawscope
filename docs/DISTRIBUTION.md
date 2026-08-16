# Windows distribution, signing, and release gates

DrawScope supports two Windows x64 delivery formats from the same verified build:

- a portable ZIP for users who prefer an extract-and-run workflow; and
- an NSIS installer for a conventional Start menu and uninstall experience.

The current public `v0.6.5` release contains only the portable ZIP and is not
Authenticode-signed. That historical release remains immutable. The repository is now
configured so a future tagged release cannot publish unless the app, analytics sidecar,
and installer all carry a valid signature from a trusted code-signing certificate.

## Public asset contract

Each future signed release publishes both versioned and stable names:

| Artifact | Versioned name | Stable name |
| --- | --- | --- |
| Portable package | `DrawScope-vX.Y.Z-windows-x64-portable.zip` | `DrawScope-windows-x64-portable.zip` |
| Installer | `DrawScope-vX.Y.Z-windows-x64-setup.exe` | `DrawScope-windows-x64-setup.exe` |
| Packaged analysis evidence | `drawscope-vX.Y.Z-analysis-evidence.json` | `drawscope-analysis-evidence.json` |
| Individual checksums | `<artifact>.sha256` | `<artifact>.sha256` |
| Checksum inventory | `SHA256SUMS.txt` | — |
| Software bill of materials | `drawscope-vX.Y.Z-sbom.spdx.json` | — |

The tagged release also carries GitHub build-provenance attestations for the portable
ZIP, installer, and evidence JSON. Stable names make bookmarks durable; versioned names
make citations and incident response unambiguous.

## Local qualification

Run the complete portable qualification from the repository root:

```powershell
./BUILD-LATEST.ps1 -SkipPause -ReplaceExistingArchive
```

Add an unsigned local installer solely to exercise packaging and uninstall behavior:

```powershell
./BUILD-LATEST.ps1 -SkipPause -ReplaceExistingArchive -BuildInstaller
```

An unsigned local installer is a development artifact and is not releasable. The build
script performs locked dependency restores, every language quality gate, two
byte-identical frozen archive rebuilds, packaged app and engine health checks, path
rename/move checks, packaged analytical-evidence export, ZIP inspection, transactional
active-build promotion, byte-identical canonical packaged evidence, and—when
requested—an installer install/run/uninstall smoke test.

The installer smoke test uses an explicit guarded temporary directory. It verifies the
installed app, analytics sidecar, offline seed, manifest, app health, and full analytics
path. It then silently uninstalls the known application resources and confirms the user
database remains in place. User data is never deleted merely because the application is
uninstalled.

## Trusted signing prerequisite

Obtain an organization-validated or extended-validation Authenticode certificate from a
trusted certificate authority. Do not commit a PFX, password, thumbprint, private key,
or temporary signing file. Configure these GitHub Actions repository secrets:

- `WINDOWS_CERTIFICATE_BASE64` — base64-encoded PFX bytes;
- `WINDOWS_CERTIFICATE_PASSWORD` — the PFX import password.

The release workflow imports the certificate into the ephemeral runner's current-user
certificate store, verifies that it is unexpired and authorized for code signing, builds
with `-RequireAuthenticode`, checks all resulting signatures, publishes the release, and
removes the imported certificate in an `always()` cleanup step.

For a controlled local signed qualification, import the certificate into the current
user's certificate store and pass only its 40-character thumbprint:

```powershell
./BUILD-LATEST.ps1 `
  -SkipPause `
  -ReplaceExistingArchive `
  -BuildInstaller `
  -RequireAuthenticode `
  -SigningCertificateThumbprint '0123456789ABCDEF0123456789ABCDEF01234567'
```

The placeholder above is intentionally not a real credential. The build uses SHA-256
file digests and an RFC 3161 timestamp. A release fails closed if signing tools are
missing, the thumbprint is malformed, a signature is absent or invalid, or the
certificate is unavailable.

## Installer layout and data ownership

The installer places the following runtime resources beside `DrawScope.exe`, matching
the portable path contract:

- `drawscope-engine.exe`;
- `data/offline-seed.sqlite3`;
- `data/offline-database-manifest.json`;
- `README.txt`, `VERSION`, and the DrawScope license;
- an empty `imports/lottery-net/` inbox for explicitly saved pages.

DrawScope creates its writable SQLite database at `data/drawscope.sqlite3`. Updates may
replace the bundled seed and manifest, but preserve user-created database state,
imports, and `config/user.json`. The default current-user installation does not require
administrator elevation.

## Tagged release procedure

1. Update `VERSION`, package metadata, `CHANGELOG.md`, the versioned audit, and release
   notes together.
2. Refresh the archive only through approved sources; rebuild twice and commit the
   resulting seed and manifest when their identities change.
3. Generate and review the version-bound packaged evidence bundle.
4. Run `pnpm verify`, Python checks/tests, and Rust format/lint/tests locally.
5. Run a signed installer qualification on a clean Windows x64 machine with WebView2
   absent or repairable, then test launch, analysis, upgrade, and uninstall.
6. Confirm the two signing secrets exist without printing or downloading them.
7. Create and push a signed tag whose `vX.Y.Z` exactly matches `VERSION`.
8. Wait for the release workflow, CI, CodeQL, and provenance attestations to finish.
9. Download the public stable and versioned assets, verify `SHA256SUMS.txt`, signatures,
   app health, and the evidence JSON one final time.

Do not bypass a red release gate by manually uploading an unsigned replacement under a
release asset name. A failed gate is release evidence, not an inconvenience to hide.

## External platform references

- [Tauri Windows installer documentation](https://v2.tauri.app/distribute/windows-installer/)
- [Tauri Windows code-signing documentation](https://v2.tauri.app/distribute/sign/windows/)
- [Tauri resource bundling documentation](https://v2.tauri.app/develop/resources/)
- [GitHub artifact attestations](https://docs.github.com/en/actions/security-for-github-actions/using-artifact-attestations)
