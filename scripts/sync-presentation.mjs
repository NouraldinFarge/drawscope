import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  loadPresentationData,
  renderArchiveSummary,
  replaceMarkedBlock,
  root,
} from "./presentation-data.mjs";

const write = process.argv.includes("--write");
const readmePath = path.join(root, "README.md");
const data = await loadPresentationData();
const readme = await readFile(readmePath, "utf8");
const expected = replaceMarkedBlock(readme, "archive-summary", renderArchiveSummary(data));

const requiredClaims = [
  data.drawCountLabel,
  `${data.gameCount} archived games`,
  data.databaseSha256,
  `archive-${data.snapshotDate.replaceAll("-", "--")}`,
  `DrawScope-v${data.version}-windows-x64-portable.zip`,
];
const surfaces = [
  ["README.md", expected],
  [
    "docs/images/drawscope-github-hero.svg",
    await readFile(path.join(root, "docs/images/drawscope-github-hero.svg"), "utf8"),
  ],
  [
    "docs/images/drawscope-social-preview.svg",
    await readFile(path.join(root, "docs/images/drawscope-social-preview.svg"), "utf8"),
  ],
  ["site/index.template.html", await readFile(path.join(root, "site/index.template.html"), "utf8")],
];

const failures = [];
if (readme !== expected) failures.push("README.md archive summary does not match the manifest.");
for (const [name, source] of surfaces) {
  if (!source.includes(data.drawCountLabel)) {
    failures.push(`${name} does not contain the current archive total (${data.drawCountLabel}).`);
  }
}
for (const claim of requiredClaims) {
  if (!expected.includes(claim)) failures.push(`README.md is missing generated claim: ${claim}`);
}
for (const game of data.games) {
  const coverage = `- **${game.name}:** ${game.firstDraw} → ${game.lastDraw} · ${game.drawCount.toLocaleString("en-US")} draws`;
  if (!expected.includes(coverage))
    failures.push(`README.md is missing current coverage for ${game.name}.`);
}

if (write) {
  await writeFile(readmePath, expected, "utf8");
  console.log("Presentation claims synchronized from the offline manifest.");
} else if (failures.length) {
  console.error("Presentation synchronization check failed:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(
    `Presentation claims verified for ${data.drawCountLabel} draws, ${data.gameCount} games, and snapshot ${data.snapshotDate}.`,
  );
}
