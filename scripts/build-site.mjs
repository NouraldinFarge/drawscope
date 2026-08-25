import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { loadPresentationData, root } from "./presentation-data.mjs";

const data = await loadPresentationData();
const siteRoot = path.join(root, "site");
const outputRoot = path.join(siteRoot, "dist");
const assetRoot = path.join(outputRoot, "assets");

await rm(outputRoot, { recursive: true, force: true });
await mkdir(assetRoot, { recursive: true });

const evidencePath = path.join(
  root,
  `examples/powerball-retrospective-v${data.version}/analysis-evidence.json`,
);
let evidence;
try {
  evidence = JSON.parse(await readFile(evidencePath, "utf8"));
} catch (error) {
  throw new Error(
    `The version-bound packaged evidence is required before the public site can be built: ${evidencePath}`,
    { cause: error },
  );
}

const coverageRows = data.games
  .map(
    (game) => `
      <tr>
        <th scope="row">${game.name}</th>
        <td>${game.firstDraw}</td>
        <td>${game.lastDraw}</td>
        <td>${game.drawCount.toLocaleString("en-US")}</td>
        <td>${game.sessions}</td>
      </tr>`,
  )
  .join("");

const bestPattern = evidence.analysis?.retrospective?.best_pattern;
const backtest = evidence.analysis?.retrospective?.backtest;
if (
  evidence.application?.version !== data.version ||
  evidence.archive?.database_sha256 !== data.databaseSha256 ||
  evidence.archive?.draw_count !== data.drawCount ||
  evidence.analysis?.methodology_version !== "1.3.0" ||
  bestPattern?.confidence_cap !== 49 ||
  !backtest
) {
  throw new Error(
    "The packaged evidence does not match the current application or archive identity.",
  );
}
const evidenceValues = {
  confidence: bestPattern.confidence_score,
  lift: bestPattern.confirmation_top_5_lift.toFixed(2),
  pValue: bestPattern.one_sided_p_value.toFixed(3),
  recommendation: bestPattern.recommendation.replaceAll("_", " "),
  trials: backtest.tested_draws,
};

const replacements = {
  VERSION: data.version,
  DRAW_COUNT: data.drawCountLabel,
  GAME_COUNT: String(data.gameCount),
  SOURCE_COUNT: String(data.sourceCount),
  GAP_COUNT: String(data.knownGapCount),
  SNAPSHOT_DATE: data.snapshotDate,
  LATEST_DRAW: data.latestDraw,
  DATABASE_SHA256: data.databaseSha256,
  COVERAGE_ROWS: coverageRows,
  CONFIDENCE_SCORE: String(evidenceValues.confidence),
  CONFIRMATION_LIFT: evidenceValues.lift,
  P_VALUE: evidenceValues.pValue,
  RECOMMENDATION: evidenceValues.recommendation,
  TESTED_TRIALS: String(evidenceValues.trials),
  DOWNLOAD_URL: `https://github.com/NouraldinFarge/drawscope/releases/latest/download/DrawScope-v${data.version}-windows-x64-portable.zip`,
  CHECKSUM_URL: `https://github.com/NouraldinFarge/drawscope/releases/latest/download/DrawScope-v${data.version}-windows-x64-portable.zip.sha256`,
};

let html = await readFile(path.join(siteRoot, "index.template.html"), "utf8");
for (const [key, value] of Object.entries(replacements)) {
  html = html.replaceAll(`{{${key}}}`, value);
}
if (/\{\{[A-Z0-9_]+\}\}/.test(html)) throw new Error("The site template has unresolved values.");

await Promise.all([
  writeFile(path.join(outputRoot, "index.html"), html, "utf8"),
  copyFile(path.join(siteRoot, "styles.css"), path.join(outputRoot, "styles.css")),
  copyFile(path.join(siteRoot, "app.js"), path.join(outputRoot, "app.js")),
  copyFile(path.join(siteRoot, "freshness.mjs"), path.join(outputRoot, "freshness.mjs")),
  copyFile(path.join(siteRoot, "favicon.svg"), path.join(outputRoot, "favicon.svg")),
  writeFile(path.join(outputRoot, ".nojekyll"), "", "utf8"),
  writeFile(
    path.join(outputRoot, "robots.txt"),
    "User-agent: *\nAllow: /\nSitemap: https://nouraldinfarge.github.io/drawscope/sitemap.xml\n",
    "utf8",
  ),
  writeFile(
    path.join(outputRoot, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://nouraldinfarge.github.io/drawscope/</loc></url></urlset>\n`,
    "utf8",
  ),
  writeFile(
    path.join(outputRoot, "archive-status.json"),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        snapshotDate: data.snapshotDate,
        latestDraw: data.latestDraw,
        drawCount: data.drawCount,
        gameCount: data.gameCount,
        sourceCount: data.sourceCount,
        knownGapCount: data.knownGapCount,
        databaseSha256: data.databaseSha256,
      },
      null,
      2,
    )}\n`,
    "utf8",
  ),
]);

for (const file of [
  "drawscope-overview.jpg",
  "drawscope-analytics.jpg",
  "drawscope-data-quality.jpg",
  "drawscope-social-preview.png",
]) {
  await copyFile(path.join(root, "docs/images", file), path.join(assetRoot, file));
}

console.log(`DrawScope project site built at ${outputRoot}.`);
