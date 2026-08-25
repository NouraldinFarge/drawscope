import { readFile, readdir, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { documentLinksToExactUrl } from "./document-links.mjs";
import { loadPresentationData } from "./presentation-data.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const ignoredDirectories = new Set([
  ".git",
  ".mypy_cache",
  ".pytest_cache",
  ".ruff_cache",
  ".venv",
  "active-build",
  "cache",
  "dist",
  "logs",
  "node_modules",
  "output",
  "portable-builds",
  "runtime",
  "target",
  "temp",
]);
const failures = [];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(absolute)));
    else files.push(absolute);
  }
  return files;
}

function display(absolute) {
  return path.relative(root, absolute).replaceAll("\\", "/");
}

function localTarget(rawTarget) {
  const withoutTitle = rawTarget.trim().replace(/^<|>$/g, "");
  if (!withoutTitle || withoutTitle.startsWith("#") || /^[a-z][a-z0-9+.-]*:/i.test(withoutTitle)) {
    return null;
  }
  const pathname = withoutTitle.split(/[?#]/, 1)[0];
  try {
    return decodeURIComponent(pathname);
  } catch {
    return pathname;
  }
}

async function checkLocalTarget(file, rawTarget) {
  const target = localTarget(rawTarget);
  if (!target) return;
  const resolved = path.resolve(path.dirname(file), target);
  try {
    await stat(resolved);
  } catch {
    failures.push(`${display(file)}: missing local target ${rawTarget}`);
  }
}

async function checkMarkdown(file) {
  const source = await readFile(file, "utf8");
  const linkPattern = /(!?)\[([^\]]*)\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g;
  for (const match of source.matchAll(linkPattern)) {
    const [, imageMarker, label, rawTarget] = match;
    if (imageMarker && !label.trim()) {
      failures.push(`${display(file)}: image ${rawTarget} has empty alternative text`);
    }
    await checkLocalTarget(file, rawTarget);
  }

  for (const match of source.matchAll(/<img\b[^>]*>/gi)) {
    const tag = match[0];
    const src = tag.match(/\bsrc=["']([^"']+)["']/i)?.[1];
    const alt = tag.match(/\balt=["']([^"']*)["']/i)?.[1];
    if (!alt?.trim()) failures.push(`${display(file)}: HTML image is missing alternative text`);
    if (src) await checkLocalTarget(file, src);
  }
}

function pngDimensions(buffer) {
  if (buffer.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function jpegDimensions(buffer) {
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  const startOfFrameMarkers = new Set([
    0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
  ]);
  let offset = 2;
  while (offset + 8 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    while (buffer[offset] === 0xff) offset += 1;
    const marker = buffer[offset];
    offset += 1;
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > buffer.length) break;
    const length = buffer.readUInt16BE(offset);
    if (length < 2 || offset + length > buffer.length) break;
    if (startOfFrameMarkers.has(marker)) {
      return { width: buffer.readUInt16BE(offset + 5), height: buffer.readUInt16BE(offset + 3) };
    }
    offset += length;
  }
  return null;
}

async function checkMedia() {
  const media = [
    ["docs/images/drawscope-social-preview.png", 1280, 640, true, "png"],
    ["docs/images/drawscope-overview.jpg", 1200, 600, false, "jpeg"],
    ["docs/images/drawscope-analytics.jpg", 1200, 600, false, "jpeg"],
    ["docs/images/drawscope-data-quality.jpg", 1200, 600, false, "jpeg"],
  ];

  for (const [relative, minimumWidth, minimumHeight, exact, type] of media) {
    let dimensions;
    try {
      const buffer = await readFile(path.join(root, relative));
      dimensions = type === "png" ? pngDimensions(buffer) : jpegDimensions(buffer);
    } catch {
      failures.push(`${relative}: required presentation image is missing`);
      continue;
    }
    if (!dimensions) {
      failures.push(`${relative}: expected a valid ${type.toUpperCase()} image`);
      continue;
    }
    const valid = exact
      ? dimensions.width === minimumWidth && dimensions.height === minimumHeight
      : dimensions.width >= minimumWidth && dimensions.height >= minimumHeight;
    if (!valid) {
      failures.push(
        `${relative}: ${dimensions.width}x${dimensions.height} does not meet ${
          exact ? "the required" : "the minimum"
        } ${minimumWidth}x${minimumHeight} size`,
      );
    }
  }
}

async function checkPresentation() {
  const data = await loadPresentationData();
  const version = data.version;
  const manifest = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
  const readme = await readFile(path.join(root, "README.md"), "utf8");

  if (manifest.version !== version) {
    failures.push(`package.json: version ${manifest.version} does not match VERSION (${version})`);
  }
  if (!readme.startsWith("# DrawScope\n")) {
    failures.push("README.md: the presentation must begin with a semantic '# DrawScope' heading");
  }
  if (!readme.includes(`current \`${version}\` interface`)) {
    failures.push(`README.md: current interface does not match VERSION (${version})`);
  }

  for (const relative of [
    "docs/images/drawscope-overview.jpg",
    "docs/images/drawscope-analytics.jpg",
    "docs/images/drawscope-data-quality.jpg",
  ]) {
    if (!readme.includes(`](${relative})](${relative})`)) {
      failures.push(`README.md: ${relative} must link to its full-size image`);
    }
  }

  for (const required of [
    "docs/README.md",
    "docs/METHODOLOGY.md",
    "docs/KNOWN-LIMITATIONS.md",
    "docs/CASE-STUDY.md",
    "docs/DISTRIBUTION.md",
    "docs/MAINTENANCE.md",
    "docs/images/README.md",
    `examples/powerball-retrospective-v${version}/README.md`,
    "SECURITY.md",
    "AI tools assisted",
  ]) {
    if (!readme.includes(required)) {
      failures.push(`README.md: missing required presentation reference ${required}`);
    }
  }

  const versionedDownload = `https://github.com/NouraldinFarge/drawscope/releases/download/v${version}/DrawScope-v${version}-windows-x64-portable.zip`;
  if (!readme.includes(versionedDownload)) {
    failures.push(`README.md: missing direct versioned download ${versionedDownload}`);
  }
  const projectSite = "https://nouraldinfarge.github.io/drawscope/";
  if (!documentLinksToExactUrl(readme, projectSite)) {
    failures.push("README.md: missing the guided project-site link");
  }
}

async function checkAnalysisEvidence() {
  const data = await loadPresentationData();
  const relative = `examples/powerball-retrospective-v${data.version}/analysis-evidence.json`;
  let evidence;
  try {
    evidence = JSON.parse(await readFile(path.join(root, relative), "utf8"));
  } catch {
    failures.push(`${relative}: required packaged evidence is missing or invalid JSON`);
    return;
  }
  const analysis = evidence.analysis ?? {};
  const retrospective = analysis.retrospective ?? {};
  const best = retrospective.best_pattern ?? {};
  const validRecommendation = new Set([
    "do_not_use_to_choose_numbers",
    "historical_experiment_only",
  ]);
  const invariants = [
    [evidence.evidence_schema_version === "1.0", "evidence schema must be 1.0"],
    [evidence.application?.version === data.version, "application version must match VERSION"],
    [
      evidence.application?.execution_boundary === "DrawScope.exe -> drawscope-engine.exe",
      "packaged execution boundary is missing",
    ],
    [evidence.archive?.draw_count === data.drawCount, "archive draw count must match manifest"],
    [
      evidence.archive?.database_sha256 === data.databaseSha256,
      "archive SHA-256 must match manifest",
    ],
    [analysis.methodology_version === "1.3.0", "methodology must be 1.3.0"],
    [retrospective.signals?.length === 30, "evidence must contain 30 signals"],
    [
      retrospective.backtest?.tested_draws >= 1 && retrospective.backtest?.tested_draws <= 250,
      "walk-forward trials must be between 1 and 250",
    ],
    [best.confidence_cap === 49, "historical confidence cap must be 49"],
    [
      Number.isInteger(best.confidence_score) &&
        best.confidence_score >= 0 &&
        best.confidence_score <= 49,
      "historical confidence score must be an integer from 0 through 49",
    ],
    [validRecommendation.has(best.recommendation), "recommendation is outside the public contract"],
  ];
  for (const [valid, message] of invariants) {
    if (!valid) failures.push(`${relative}: ${message}`);
  }
}

async function checkProjectSite() {
  const data = await loadPresentationData();
  const outputRoot = path.join(root, "site", "dist");
  let html;
  let status;
  try {
    html = await readFile(path.join(outputRoot, "index.html"), "utf8");
    status = JSON.parse(await readFile(path.join(outputRoot, "archive-status.json"), "utf8"));
  } catch {
    failures.push("site/dist: run the deterministic site build before documentation checks");
    return;
  }
  if (/\{\{[A-Z0-9_]+\}\}/.test(html)) {
    failures.push("site/dist/index.html: unresolved template value");
  }
  for (const required of [
    '<html lang="en">',
    'class="skip-link"',
    'name="description"',
    'property="og:image"',
    'rel="canonical"',
    "<h1>See the record clearly.</h1>",
    `DrawScope-v${data.version}-windows-x64-portable.zip`,
    data.databaseSha256,
  ]) {
    if (!html.includes(required)) failures.push(`site/dist/index.html: missing ${required}`);
  }
  const expectedStatus = {
    snapshotDate: data.snapshotDate,
    latestDraw: data.latestDraw,
    drawCount: data.drawCount,
    gameCount: data.gameCount,
    sourceCount: data.sourceCount,
    knownGapCount: data.knownGapCount,
    databaseSha256: data.databaseSha256,
  };
  for (const [key, expected] of Object.entries(expectedStatus)) {
    if (status[key] !== expected) {
      failures.push(`site/dist/archive-status.json: ${key} does not match the manifest`);
    }
  }
  for (const relative of [
    "styles.css",
    "app.js",
    "freshness.mjs",
    "favicon.svg",
    ".nojekyll",
    "robots.txt",
    "sitemap.xml",
    "assets/drawscope-overview.jpg",
    "assets/drawscope-analytics.jpg",
    "assets/drawscope-data-quality.jpg",
    "assets/drawscope-social-preview.png",
  ]) {
    try {
      await stat(path.join(outputRoot, relative));
    } catch {
      failures.push(`site/dist/${relative}: required generated site artifact is missing`);
    }
  }
}

const files = await walk(root);
const markdown = files.filter((file) => file.endsWith(".md"));
await Promise.all(markdown.map(checkMarkdown));
await checkMedia();
await checkPresentation();
await checkAnalysisEvidence();
await checkProjectSite();

if (failures.length) {
  console.error("Documentation check failed:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(
    `Documentation check passed: ${markdown.length} Markdown files and 4 presentation images verified.`,
  );
}
