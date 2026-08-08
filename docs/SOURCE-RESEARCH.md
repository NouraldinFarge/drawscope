# Illinois source research and update policy

Research date: 2026-07-28

## Bundled offline archive

The current bundled evidence snapshot stores 41,598 normalized drawings in
`data/offline-seed.sqlite3`.
`data/offline-database-manifest.json` records the database hash, each raw-artifact hash,
coverage, retrieval time, the 1,951-row Powerball official overlap check, and known
gaps.

| Game | Records | First draw | Latest captured draw | Primary evidence |
|---|---:|---:|---:|---|
| Powerball | 3,813 | 1992-04-22 | 2026-07-27 | CC0 complete-history dataset; official New York open-data overlap |
| Mega Millions | 2,522 | 2002-05-17 | 2026-07-24 | New York State Gaming Commission open data |
| Illinois Lotto | 1,960 | 2014-01-20 | 2026-07-27 | Illinois Lottery official results |
| Lucky Day Lotto | 9,147 | 2014-01-19 | 2026-07-28 | Illinois Lottery official results |
| Pick 3 | 12,078 | 2010-01-01 | 2026-07-28 | Illinois Lottery plus documented Iowa shared-drawing archive |
| Pick 4 | 12,078 | 2010-01-01 | 2026-07-28 | Illinois Lottery plus documented Iowa shared-drawing archive |

The national refresh inputs are:

- https://www.kaggle.com/datasets/barefootjoey/powerball-draw-history
- https://data.ny.gov/Government-Finance/Lottery-Mega-Millions-Winning-Numbers-Beginning-20/5xaw-6ayf
- https://data.ny.gov/Government-Finance/Lottery-Powerball-Winning-Numbers-Beginning-2010/d6yy-54nr

Iowa's official notice documents that Iowa used Illinois Pick 3 and Pick 4 results
before the state began its own drawings:

- https://publications.iowa.gov/16577/1/LA040714.pdf

## Decision

DrawScope must not perform automated live extraction from Lottery.net under the
provider's currently published terms. Section 3.1.7 prohibits data mining, data
harvesting, data extracting, and similar activity:

- https://www.lottery.net/terms

The provider remains useful as a human-readable secondary reference. DrawScope includes
a versioned saved-HTML parser so a user with a lawful copy or separate permission can
import annual pages without granting the app unrestricted network or filesystem access.
Live network access for this adapter is hard-disabled in the catalog.

Official Illinois Lottery pages remain the preferred verification source:

- https://www.illinoislottery.com/results-hub
- https://www.illinoislottery.com/dbg/results/lotto
- https://www.illinoislottery.com/dbg/results/luckydaylotto
- https://www.illinoislottery.com/dbg/results/pick3
- https://www.illinoislottery.com/dbg/results/pick4

The official pages render current results and detail links in a normal browser. The
captured official rows retain their individual detail URLs. Direct desktop application
requests receive a browser challenge as of the research date, so the released app does
not bypass that control or perform an unattended Illinois refresh.

## Inspected Lottery.net archive map

| Feed | Inspected URL pattern | Available years | Row shape |
|---|---|---:|---|
| Lotto | `/illinois/lotto/numbers/{year}` | 2009–2026 | Date; six main balls; optional Extra Shot. Current rows also show two separate Lotto Million lists. |
| Lucky Day Lotto Midday | `/illinois/lucky-day-lotto-midday/numbers/{year}` | 2013–2026 | Date; five main balls. |
| Lucky Day Lotto Evening | `/illinois/lucky-day-lotto-evening/numbers/{year}` | 2010–2026 | Date; five main balls. |
| Pick 3 Midday | `/illinois/pick-3-midday/numbers/{year}` | 2010–2026 | Date; optional draw number; three ordered digits; optional Fireball. |
| Pick 3 Evening | `/illinois/pick-3-evening/numbers/{year}` | 2010–2026 | Date; optional draw number; three ordered digits; optional Fireball. |
| Pick 4 Midday | `/illinois/pick-4-midday/numbers/{year}` | 2010–2026 | Date; optional draw number; four ordered digits; optional Fireball. |
| Pick 4 Evening | `/illinois/pick-4-evening/numbers/{year}` | 2010–2026 | Date; optional draw number; four ordered digits; optional Fireball. |

Annual archive pages are unpaginated and link directly to other available years. Current
date cells can link to detail pages such as
`/illinois/lotto/numbers/07-27-2026`. Lotto detail pages include a prize table with
category, prize per winner, winners, and prize fund. No JSON-LD was found on the
inspected Lotto archive page.

The Illinois landing page lists the current Central Time draw schedule: Lotto Monday,
Thursday, and Saturday at 9:22 PM; Lucky Day Lotto, Pick 3, and Pick 4 daily at 12:40 PM
and 9:22 PM. The official Illinois source is authoritative if schedules disagree.

## Historical shape changes

- The earliest inspected Lotto archive uses six distinct numbers from 1–52 and has no
  Million 1 or Million 2 lists. Official Illinois material documents the April 2021
  change to 1–50 and the addition of the two $1 million drawings.
- The 2010 Pick 3 Midday archive has date plus three ordered digits only. Current pages
  add a draw number and Fireball. The parser treats both fields as optional and assigns
  records to observed base-only or Fireball eras.
- Lucky Day Lotto is modeled as one game with distinct midday/evening sessions. The
  inspected secondary archive starts the evening feed in 2010 and midday in 2013.
- Ordered games retain the source position and allow repeated digits. Unordered games
  reject duplicate main numbers.

## Saved-page ingestion contract

The portable import root is `imports/lottery-net/`. Only direct `.html` or `.htm` files
whose names match a catalog feed are considered, for example:

```text
lotto-2026.html
lucky-day-lotto-midday-2026.html
pick-3-evening-2010.html
pick-4-midday-2026.html
```

The adapter enforces:

- Fixed portable root; no user-supplied arbitrary path
- No symlink or directory traversal
- At most 256 pages per run
- At most 8 MiB per page and 64 MiB per run
- Catalog feed and year identity
- Archive heading, date, session, count, range, order, and duplicate checks
- Optional draw number, Fireball, Extra Shot, and detail link preservation
- SHA-256 content identity and idempotent page import
- Short SQLite transaction per page
- Typed, redacted failure codes
- Secondary-source verification status until independently checked

Raw saved pages remain in the import folder as user-controlled evidence. DrawScope does
not claim that a successfully parsed page is official or independently verified.
