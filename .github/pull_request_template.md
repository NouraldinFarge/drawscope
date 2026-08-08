## Summary

Describe the user or research problem this change addresses.

## User-visible evidence

Describe the before/after behavior. Include accessible screenshots for a visual change and note whether documentation, release presentation, or known limitations changed.

## Verification

- [ ] `pnpm verify`
- [ ] `cargo test --workspace --locked`
- [ ] Python lint, type, and test gates
- [ ] No generated build output, credentials, or private data added
- [ ] Changed Markdown links and visual assets were rendered and inspected

## Research, data, and trust boundaries

- [ ] Claims remain descriptive and retrospective, not predictive
- [ ] Data provenance and licensing are documented when inputs change
- [ ] Temporal leakage, schema, migration, import, and sidecar boundaries were reviewed when relevant
- [ ] New limitations or manual gates are stated explicitly

## Release impact

- [ ] No release behavior changes
- [ ] Release notes, versioning, checksums, SBOM, or provenance behavior were updated as required
