# Known limitations — 0.6.5

- The bundled evidence snapshot contains 41,598 drawings across six games. Powerball
  covers 1992-04-22 through 2026-07-27; Mega Millions covers 2002-05-17 through
  2026-07-24. Coverage is a dated archive snapshot, not a promise of live completeness.
- The current official Illinois online archive begins in January 2014 for Lotto and
  Lucky Day Lotto. No suitably licensed bulk source was found for the earlier
  Lottery.net years, so those rows are not silently copied or inferred.
- Pick 3 and Pick 4 base digits extend to 2010 through the official Iowa archive. Iowa
  documented that it used Illinois drawing results during that period. Its archive
  does not publish Illinois Fireball values for 2013-09-01 through 2014-01-18, so
  those optional values remain null.
- The seven requested Lottery.net annual feeds remain permission-gated saved-page
  imports. Automated live Lottery.net extraction is disabled because the provider's
  terms prohibit data mining and extraction.
- The offline builder refreshes approved national downloads. Updating the
  browser-rendered Illinois official archive still requires controlled acquisition and
  a new bundled database release; the desktop app does not bypass publisher controls.
- Saved-page import covers the main Illinois archive result in each row. Lotto Million
  1 and Lotto Million 2 are identified but are not imported as separate drawing roles.
- The retrospective pattern lab currently targets the 2015-current Powerball rule era.
  Position-specific Pick 3/Pick 4 tests and current-era selectors for other games are
  not yet exposed in the interface.
- The 30 signals are exploratory and correlated. The single chronological 60/40 split
  protects its final confirmation segment from reselection, but it is not a substitute
  for prospective registration, independent replication, or multiplicity-adjusted
  hypothesis testing.
- The 0–49 confidence score rates historical ranking evidence, not the probability that
  a ticket will win. It cannot exceed 49 without separately specified prospective
  results that were unavailable during development.
- Browser preview mode uses a small deterministic display fixture; full archive
  analysis and the Python sidecar are available only in the portable desktop build.
- The existing `v0.6.5` portable release publishes an SPDX SBOM, SHA-256 checksum, and
  GitHub provenance attestation, but its executables are not Authenticode-signed. The
  future release workflow now fails closed without a trusted signing certificate and
  validates a signed NSIS installer; purchasing/configuring that certificate and the
  final clean-machine WebView2 qualification remain external gates.
- RustSec reports maintenance and one unsoundness warning in GTK3 crates retained in
  Tauri's cross-platform lock graph. Those Linux-only packages are not compiled or
  shipped in the Windows x64 portable release; no patched compatible GTK3 line exists.
- Dedicated axe automation and Storybook are not yet part of CI. Semantic UI tests and
  the documented keyboard/zoom/theme review checklist provide partial coverage.
- The existing `v0.6.5` public release is portable-only. The repository can now build a
  current-user NSIS installer with Start-menu and uninstall entries, but no signed
  installer will be published until the certificate gate is satisfied. DrawScope still
  has no updater service or machine-wide registration.

These limits are deliberate and visible. DrawScope does not present missing history,
secondary data, or experimental analytics as stronger evidence than they are.
