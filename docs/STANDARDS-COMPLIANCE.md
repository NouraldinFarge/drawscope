# Standards compliance matrix

Reviewed 2026-07-28. ZIP file timestamps (UTC): Backend Engineering 2026-07-10 10:54:20; Backend Repair 10:55:38; Frontend Engineering 10:49:34; Frontend Repair 10:50:10; Production Foundation 10:56:00.

| Requirement | Source file | Source section | Applicability to DrawScope | Decision | Implementation location | Validation method | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Portable ZIP only | portable architecture | Core build | Direct | Adopted | `BUILD-LATEST.ps1` | artifact-name denial and ZIP inspection | Implemented | No bundler target |
| Root `active-build/` | portable architecture | Root architecture | Direct | Adopted | build path guard | direct-parent assertion | Implemented | Flat deployment |
| Transactional replacement | portable architecture | Build behavior | Direct | Adopted | active backup/candidate flow | health check and rollback branch | Implemented | Preserves data/user config |
| One-click build | portable architecture | One-click requirement | Direct | Adopted | `BUILD-LATEST.bat` | double-click-compatible wrapper | Implemented | Complex logic in PowerShell |
| No installer | product prompt + portable architecture | Installer conflict | Direct | Adopted | Tauri bundle disabled | prohibited artifact scan | Implemented | Supersedes standards installer checks |
| Tauri v2 shell | simple stack | Desktop shell | Direct | Adopted | `apps/desktop/src-tauri` | Cargo check and health launch | Implemented | Electron/Next absent |
| Rust sole native boundary | backend standards | Architecture | Direct | Adopted | Tauri commands in Rust | capability and source review | Implemented | React has no broad authority |
| React/TS/Vite | simple stack | Frontend | Direct | Adopted | `apps/desktop/src` | type/build/test | Implemented | Feature-oriented |
| pnpm/project references | simple stack | Frontend quality | Direct | Adopted | workspace manifests | `tsc -b` | Implemented | Locked install |
| Canonical JSON Schema | production foundation | Contracts | Direct | Adopted | `packages/contracts/schemas/v1` | JSON Schema/Zod fixture test | Implemented | Rust/Python equivalence expands next |
| JSONL engine protocol | backend standards | Protocol | Direct | Adopted | Python CLI + Rust validator | protocol unit test | Implemented | stdout machine-only |
| Known sidecar only | backend standards | Sidecar launch | Direct | Adopted | fixed sibling/dev path | missing binary and timeout errors | Implemented | Environment cleared |
| Events not durable state | frontend/backend standards | State | Direct | Adopted | result + SQLite job record | architecture review | Implemented | UI queries snapshots |
| Canonical job folders | backend standards | Recovery | Direct | Deferred | documented target tree | future crash/resume integration | Deferred | SQLite job index exists |
| SQLite WAL | simple stack | Local store | Direct | Adopted | migration/init | health version and Rust test | Implemented | Bundled fixed SQLite |
| SQLite 3.51.3+ | backend standards | WAL update | Direct | Adopted | rusqlite bundled | runtime version in release manifest | Implemented | Refuse downgrade before production |
| Root-guarded paths | backend standards | Filesystem | Direct | Adopted | `safe_child` + build guards | traversal/absolute unit test | Implemented | Reparse check on controlled dirs |
| Safe ZIP extraction | backend standards | Archives | Direct | Adapted | build-created archive validation | entry-shape checks | Implemented | Import limits remain future |
| Typed redacted errors | backend standards | Error taxonomy | Direct | Adopted | `AppError` | source review/test expansion | Implemented | Code + diagnostic ID |
| Approved HTTPS providers | backend standards | Network | Direct | Deferred | source policy docs | adapter deny tests | Deferred | Network disabled in 0.1 |
| React unprivileged | frontend standards | Trust boundary | Direct | Adopted | minimal capability | capability snapshot/review | Implemented | No shell/fs plugins |
| TanStack Router/Query | frontend standards | Baseline | Direct | Adopted | app router/query client | type and component tests | Implemented | Hash routing is desktop-safe |
| TanStack Form | frontend standards | Forms | Conditional | Not applicable | native ticket form | semantic form test/manual | N/A | Form is simple |
| React Aria | frontend standards | Composite controls | Conditional | Deferred | native controls only | keyboard/manual review | Deferred | No complex composite yet |
| Storybook/React Compiler | frontend standards | Tooling | Applicable later | Deferred | documented gate | future visual/a11y suite | Deferred | Test baseline first |
| CSS Modules/tokens | frontend standards | Design system | Direct | Adopted | global tokens + modules | Biome and visual review | Implemented | Light/dark/reduced motion |
| WCAG 2.2 AA | product/frontend | Accessibility | Direct | Adopted | semantic UI | keyboard/zoom/theme checklist | Partial | Automated axe/Playwright pending |
| Page/virtualize large data | frontend standards | Dense data | Direct | Adapted | fixture table; query paging target | performance fixture later | Partial | No large archive yet |
| Preserve evidence on repair | repair guides | Triage | Direct | Adopted | runbooks and rollback | failure-path review | Implemented | Never deletes live WAL |
| Media/FFmpeg/OCR features | supplied ZIP | Product examples | Unrelated | Not applicable | excluded | dependency/source scan | N/A | Principles adapted to analytics |
| Provider adapter → source adapter | product prompt | Product adaptation | Direct | Adapted | architecture/source docs | future fixture tests | Deferred | No live adapter in alpha |
| Media job → analytical job | product prompt | Product adaptation | Direct | Adapted | SQLite jobs/protocol | Rust/Python tests | Partial | Cancellation/resume later |
| Full source traceability | product prompt | Data provenance | Direct | Adopted | sources/datasets/drawings | fixture/db tests | Partial | Fixture complete, archive not |
| Era separation | product prompt | Game eras | Direct | Adopted | catalog/schema/UI/engine request | fixture range tests | Implemented | Historical census continues |
| Statistical honesty | product prompt | Responsible use | Direct | Adopted | UI/methodology/engine disclaimers | copy and analytics tests | Implemented | No predictive language |
| Monte Carlo reproducibility | product prompt | Simulations | Direct | Adopted | seeded Python RNG | equality regression | Implemented | Basic marginal baseline |
| Walk-forward backtesting | product prompt | Backtesting | Direct | Adopted | 30-signal engine and Pattern Lab | leakage, chronology, split-validation, confidence, and full-archive release checks | Implemented | Up to 250 no-peeking trials with a frozen 60%/40% discovery/confirmation split |
| Support bundles | backend standards | Diagnostics | Direct | Deferred | allowlist policy documented | redaction/archive tests later | Deferred | UI states limitation |
| Build quality gates | product prompt | Testing | Direct | Adopted | `BUILD-LATEST.ps1` | one-click build | Partial | Audit/SBOM/signing pending |

## Conflict resolutions

1. Installer, NSIS, MSI, setup executable, installer smoke, and `pnpm package` guidance is conflicting. The product and portable architecture have higher precedence; installer configuration and targets are removed.
2. Media, browser discovery, FFmpeg, OCR, subtitle, LAISD, and RRCUN examples are not applicable. Their boundary, provenance, checkpoint, artifact, and repair principles are adapted to lottery source/analysis jobs.
3. The production foundation's stable `duanju-app/` inner ZIP conflicts with DrawScope's mandated version wrapper. DrawScope uses `DrawScope-v<version>-windows-x64-portable/`.
4. The production foundation's install-ready definition conflicts with install-free portability. DrawScope defines production readiness around a signed, verified portable ZIP and flat active extraction.
