# DrawScope project site

This directory is the source for the project-specific GitHub Pages site at
`https://nouraldinfarge.github.io/drawscope/`.

- `index.template.html` contains semantic content and generated placeholders.
- `styles.css` provides the responsive visual system.
- `app.js` owns the keyboard-operable, pausable three-view tour and snapshot-age label.
- `favicon.svg` reuses the repository's code-native brand geometry.
- `dist/` is generated, ignored, and never edited by hand.

```powershell
pnpm site:build
python -m http.server 4175 --bind 127.0.0.1 --directory site/dist
```

The build derives archive facts from the committed manifest and analytical values from
the version-bound packaged evidence bundle. It stops if the evidence is missing or its
application/database identity differs. Deployment is handled by the `Project site`
GitHub Actions workflow; no tracking or remote analytics are included.

Review the [visual provenance note](../docs/images/README.md),
[accessibility target](../docs/ACCESSIBILITY.md), and
[maintenance policy](../docs/MAINTENANCE.md).
