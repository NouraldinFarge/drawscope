# DrawScope desktop application

This package contains the React interface and the Rust/Tauri native authority shipped as
`DrawScope.exe`.

## Boundary

- `src/` owns routes, accessible presentation, query state, browser-preview fixtures,
  and strict parsing of native results.
- `src-tauri/` owns SQLite, migrations, archive merging, bounded queries, source import,
  filesystem paths, jobs, and the fixed analytics-sidecar lifecycle.
- React receives only narrow typed commands. It has no generic shell, filesystem,
  database, Python, or unrestricted network access.

## Common commands

Run these from the repository root:

```powershell
pnpm --filter @drawscope/desktop test
pnpm --filter @drawscope/desktop build
cargo test --workspace --locked
pnpm dev
```

The browser preview demonstrates interface states with deterministic fixtures. Full
archive analytics and packaged evidence require the native app and bundled
`drawscope-engine.exe`.

Start with the [architecture](../../docs/ARCHITECTURE.md),
[contract boundary](../../docs/CONTRACTS.md), and
[testing matrix](../../docs/TESTING.md).
