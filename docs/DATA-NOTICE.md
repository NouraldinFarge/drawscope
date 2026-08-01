# Data sources, attribution, and licensing

The repository's MIT license applies to DrawScope's original source code. It does **not** replace the terms attached to third-party datasets, official result pages, trademarks, or source websites.

| Material | Role | Rights and handling |
| --- | --- | --- |
| Powerball complete-history dataset | Historical seed | Identified as CC0 by its publisher; the pinned archive and hash preserve the exact input used. |
| New York State open-data results | National verification and Mega Millions history | Used under the publisher's open-data terms; source URLs and retrieval metadata remain in the manifest. |
| Illinois Lottery official results | Illinois verification and updates | Retained with source URLs and provenance. Users should review the publisher's current terms before redistributing raw captures. |
| Iowa shared-drawing archive | Historical Pick 3/Pick 4 evidence | Retained with the official notice explaining the Illinois drawing relationship and with artifact identity recorded. |

DrawScope does not claim ownership of third-party facts, marks, or source material. Source URLs, coverage, hashes, parser versions, and validation status are documented in [`SOURCE-RESEARCH.md`](SOURCE-RESEARCH.md) and `data/offline-database-manifest.json`.

The large raw Illinois capture remains in the repository because it is part of the reproducible, hashed build input for the current portfolio release. A future release may move source artifacts to a separately versioned data package if that can be done without weakening provenance or reproducibility.

