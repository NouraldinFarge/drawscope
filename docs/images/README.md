# Visual provenance

The images in this directory are public presentation assets for the DrawScope repository.

## Product screenshots

`drawscope-overview.jpg`, `drawscope-analytics.jpg`, and `drawscope-data-quality.jpg` are captured from the current `0.6.5` React interface at a desktop viewport. Browser preview mode uses the committed deterministic Powerball display fixture for individual example rows and uses [`../../data/offline-database-manifest.json`](../../data/offline-database-manifest.json) for archive totals, source counts, coverage ranges, and the seed identity.

The screenshots demonstrate interface hierarchy, explanation, and evidence presentation.
They are linked at full resolution from both the README and the accessible project-site
tour so labels do not depend on GitHub's reduced inline width. They are not evidence that
the browser preview executed the packaged Python sidecar; the complete structured result
from the packaged boundary is recorded in the
[`0.6.5` evidence bundle](../../examples/powerball-retrospective-v0.6.5/README.md), and
full release verification is recorded in
[`../AUDIT-REPORT-0.6.5.md`](../AUDIT-REPORT-0.6.5.md).

## Brand assets

- `drawscope-github-hero.svg` is the accessible README banner built from the repository's existing icon geometry and interface colors.
- `drawscope-social-preview.svg` is the editable source for the 1280×640 GitHub card.
- `drawscope-social-preview.png` is the rendered raster uploaded for GitHub link previews.

The banner and social image communicate verified repository facts—version, archive size,
signal count, evaluation bound, and implementation stack. Presentation synchronization
fails if their archive total drifts from the manifest. They do not depict or advertise a
predicted lottery outcome.
