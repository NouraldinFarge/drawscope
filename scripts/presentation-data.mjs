import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

export const root = fileURLToPath(new URL("..", import.meta.url));

const gameOrder = ["powerball", "mega-millions", "lotto", "lucky-day-lotto", "pick-3", "pick-4"];

const presentationNames = {
  powerball: "Powerball",
  "mega-millions": "Mega Millions",
  lotto: "Illinois Lotto",
  "lucky-day-lotto": "Lucky Day Lotto",
  "pick-3": "Pick 3",
  "pick-4": "Pick 4",
};

function formatInteger(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

export async function loadPresentationData() {
  const [version, manifestSource, catalogSource, sourceCatalogSource] = await Promise.all([
    readFile(path.join(root, "VERSION"), "utf8"),
    readFile(path.join(root, "data/offline-database-manifest.json"), "utf8"),
    readFile(path.join(root, "data/game-catalog.json"), "utf8"),
    readFile(path.join(root, "data/source-catalog.json"), "utf8"),
  ]);
  const manifest = JSON.parse(manifestSource);
  const catalog = JSON.parse(catalogSource);
  const sourceCatalog = JSON.parse(sourceCatalogSource);
  const sessionCounts = new Map();
  for (const feed of sourceCatalog.feeds) {
    const sessions = sessionCounts.get(feed.game_id) ?? new Set();
    sessions.add(feed.session);
    sessionCounts.set(feed.game_id, sessions);
  }
  const catalogById = new Map(catalog.map((game) => [game.id, game]));
  const games = gameOrder.map((id) => {
    const coverage = manifest.coverage[id];
    if (!coverage) throw new Error(`Presentation coverage is missing for ${id}.`);
    return {
      id,
      name: presentationNames[id] ?? catalogById.get(id)?.name ?? id,
      firstDraw: coverage.first_draw,
      lastDraw: coverage.last_draw,
      drawCount: coverage.draw_count,
      sessions: sessionCounts.get(id)?.size ?? 1,
    };
  });
  const snapshotDate = manifest.built_at.slice(0, 10);
  const latestDraw = games
    .map((game) => game.lastDraw)
    .sort()
    .at(-1);
  return {
    version: version.trim(),
    manifest,
    games,
    snapshotDate,
    latestDraw,
    drawCount: manifest.database.draw_count,
    drawCountLabel: formatInteger(manifest.database.draw_count),
    gameCount: games.length,
    sourceCount: Object.keys(manifest.sources).length,
    knownGapCount: manifest.known_gaps.length,
    databaseBytes: manifest.database.bytes,
    databaseBytesLabel: formatInteger(manifest.database.bytes),
    databaseSha256: manifest.database.sha256,
  };
}

export function renderArchiveTable(data) {
  const rows = data.games
    .map(
      (game) =>
        `| ${game.name} | ${game.firstDraw} → ${game.lastDraw} | ${formatInteger(game.drawCount)} | ${game.sessions} |`,
    )
    .join("\n");
  return `| Game | Coverage | Draws | Sessions |\n| --- | ---: | ---: | ---: |\n${rows}`;
}

export function renderArchiveSummary(data) {
  return `<!-- drawscope:archive-summary:start -->
## Verified archive snapshot

Snapshot date: **${data.snapshotDate}** · Latest captured draw: **${data.latestDraw}** · Known gaps: **${data.knownGapCount}**

${renderArchiveTable(data)}

Two isolated frozen-source rebuilds produced the same ${data.databaseBytesLabel}-byte SQLite database:

\`\`\`text
SHA-256  ${data.databaseSha256}
\`\`\`
<!-- drawscope:archive-summary:end -->`;
}

export function replaceMarkedBlock(source, name, replacement) {
  const start = `<!-- drawscope:${name}:start -->`;
  const end = `<!-- drawscope:${name}:end -->`;
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end);
  if (startIndex < 0 || endIndex < startIndex) {
    throw new Error(`Missing presentation markers for ${name}.`);
  }
  return `${source.slice(0, startIndex)}${replacement}${source.slice(endIndex + end.length)}`;
}
