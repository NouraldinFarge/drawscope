# Maintenance policy

DrawScope is maintained as evidence-bearing software. Archive dates, analytics claims,
screenshots, release assets, and repository metadata are treated as linked surfaces; a
change is incomplete when only one of them is updated.

## Operating cadence

| Cadence | Required review |
| --- | --- |
| Every pull request | CI, CodeQL where applicable, documentation links, presentation synchronization, site build, contracts, and scope-specific tests |
| Weekly | Automated archive-freshness evaluation and the single managed data-quality issue |
| Monthly | Open dependency updates, security advisories, stale issues, release/download links, and public metadata |
| Each archive refresh | Source policy, raw artifact hashes, parser fixtures, manifest, two frozen rebuilds, coverage/gaps, packaged evidence, README, and project site |
| Each release | Version alignment, audit report, release notes, signed binaries, installer smoke test, checksums, SBOM, provenance, stable assets, and clean-machine verification |
| Each methodology change | Versioned protocol, strict contracts, leakage tests, counterfactual tests, evidence bundle, responsible-use language, and independent review |

## Archive freshness policy

[`data/archive-freshness-policy.json`](../data/archive-freshness-policy.json) is the
machine-readable policy. The weekly `Archive freshness` workflow evaluates the
manifest's dated coverage and maintains one `data-quality` issue instead of opening
duplicate reminders.

- A snapshot receives attention after 14 days and is stale after 30 days.
- Approved national open-data feeds have a seven-day target.
- Browser-rendered official Illinois sources have a fourteen-day controlled-acquisition
  target.
- Automated Lottery.net extraction, access-control bypass, and undocumented copying
  remain prohibited. Those annual pages are supported only through permission-gated
  saved-page imports.

Freshness is informational until a lawful update source exists. Never conceal a stale
snapshot, infer missing rows, or substitute an unreviewed source merely to turn a badge
green.

Evaluate the policy locally:

```powershell
python tools/check_archive_freshness.py `
  --output archive-freshness.json `
  --markdown-output archive-freshness.md
```

## Presentation synchronization

Archive facts must originate from
[`data/offline-database-manifest.json`](../data/offline-database-manifest.json), not from
manually repeated numbers. The presentation scripts derive the README archive block,
landing-page coverage table, snapshot JSON, database identity, source total, gap total,
and packaged-evidence bindings.

```powershell
pnpm presentation:sync
pnpm site:build
pnpm docs:check
```

`pnpm presentation:check` fails if the README, hero, social card, landing template, or
download link drifts from the current manifest/version. The site build fails if the
version-bound packaged evidence is absent or does not match the current application and
database identity. There are no invented analytics fallbacks.

Refresh screenshots only from a reviewed current interface state. Keep the original
full-size images linked from the README, record how they were produced in
[`docs/images/README.md`](images/README.md), and verify that labels remain legible at the
rendered GitHub width. The landing-page tour must work with a mouse, keyboard, narrow
viewport, and reduced-motion preference.

## Dependency maintenance

Dependabot updates are reviewed as normal code changes. Combine superseded patch-level
updates when the lockfile can be regenerated and verified once; do not merge competing
lockfiles independently. Follow [`DEPENDENCY_POLICY.md`](../DEPENDENCY_POLICY.md) for
pinning, advisories, Rust lock-graph exceptions, and upgrade evidence.

Before merging a dependency update:

1. read the upstream release notes and security impact;
2. update the direct manifest and lockfile together;
3. run the complete affected-language gates;
4. run the desktop build for bundler, router, Tauri, Rust, or sidecar changes;
5. close or supersede redundant automated pull requests with a clear reference.

## Issue and pull-request hygiene

- Keep issue forms for reproducible bugs, bounded feature proposals, and archive or
  provenance discrepancies.
- Use labels to expose ownership and priority; close duplicate automation issues rather
  than allowing them to accumulate.
- Require a linked test or explicit manual gate for behavior changes.
- Keep release and archive claims out of a pull request until their artifacts exist.
- Never manufacture stars, download counts, endorsements, benchmarks, or user quotes.

## Public repository metadata

The repository description should explain the product and boundary in one sentence.
The homepage should point to the project site. Topics should remain focused on the
problem, evidence model, delivery style, and core implementation—not every incidental
technology. Review the About panel, social preview, pinned release, website, and first
README viewport after each major presentation change.

## Degraded or blocked maintenance

If an archive source becomes unavailable, a certificate expires, or a release gate
cannot be completed:

1. keep the previous verified artifact available;
2. record the exact scope and date of the limitation;
3. open or update one trackable issue;
4. disable only the affected publication path;
5. continue safe read-only diagnosis and unrelated maintenance;
6. do not relabel an unverified artifact as current.
