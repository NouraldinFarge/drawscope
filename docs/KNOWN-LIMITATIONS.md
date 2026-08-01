# Known limitations — 0.6.0

- The bundled archive contains 41,598 drawings across six games. Powerball covers
  1992-04-22 onward and Mega Millions covers 2002-05-17 onward.
- The current official Illinois online archive begins in January 2014 for Lotto and
  Lucky Day Lotto. No suitably licensed bulk source was found for the earlier
  Lottery.net years, so those rows are not silently copied or inferred.
- Pick 3 and Pick 4 base digits extend to 2010 through the official Iowa archive. Iowa
  documented that it used Illinois drawing results during that period. Its archive
  does not publish Illinois Fireball values for 2013-09-01 through 2014-01-18, so
  those optional values remain null.
- The seven requested Lottery.net annual feeds remain available as permission-gated
  saved-page imports. Automated live Lottery.net extraction is disabled because the
  provider's terms prohibit data mining and extraction.
- The offline builder refreshes the approved national downloads. Updating the
  browser-rendered Illinois official archive still requires a controlled acquisition
  and a new signed/bundled database release; the desktop app does not bypass the
  publisher's browser controls.
- Saved-page import covers the main Illinois archive result in each row. Lotto Million
  1 and Lotto Million 2 are identified but not yet imported as separate drawing roles.
- The retrospective pattern lab currently targets the current Powerball rule era.
  Position-specific Pick 3/Pick 4 tests and equivalent current-era selectors for the
  other games are not yet exposed in the interface.
- The 30-signal composite and candidate search are exploratory historical benchmarks,
  not prediction models. Many signals are correlated. Individual pattern rows are not
  claims of statistical significance.
- The best-pattern confidence rating evaluates ranking evidence on one later
  confirmation segment. It is not the probability that a ticket will win and is
  capped at 49/100 until truly prospective drawings provide external validation.
- Network analytics, triples, formal anomaly correction, jackpots, expected value,
  and portfolio diversification remain future milestones.
- Storybook, dedicated axe automation, an SBOM, code signing, and clean-machine
  WebView2 validation remain release gates before production status.
- The portable executable is not code-signed in local builds.

These limits are deliberate and visible. DrawScope does not present missing history,
secondary data, or experimental analytics as stronger evidence than they are.
