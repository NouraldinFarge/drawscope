export function formatInteger(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

export function renderArchiveCoverage(data) {
  return data.games
    .map(
      (game) =>
        `- **${game.name}:** ${game.firstDraw} → ${game.lastDraw} · ${formatInteger(game.drawCount)} draws · ${game.sessions} ${game.sessions === 1 ? "session" : "sessions"}`,
    )
    .join("\n");
}

export function renderArchiveSummary(data) {
  return `<!-- drawscope:archive-summary:start -->
## Verified archive snapshot

Snapshot date: **${data.snapshotDate}** · Latest captured draw: **${data.latestDraw}** · Known gaps: **${data.knownGapCount}**

This is a dated offline evidence snapshot—not live lottery data. The [weekly freshness workflow](.github/workflows/archive-freshness.yml) flags a refresh as due after 14 days and stale after 30; it never invents missing rows or substitutes an unreviewed source.

**Coverage by game**

${renderArchiveCoverage(data)}

Two isolated frozen-source rebuilds produced the same ${data.databaseBytesLabel}-byte SQLite database:

\`\`\`text
SHA-256  ${data.databaseSha256}
\`\`\`
<!-- drawscope:archive-summary:end -->`;
}
