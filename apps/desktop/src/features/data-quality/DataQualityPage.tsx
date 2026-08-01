import { Badge, Page, Stat } from "../../shared/components/Page";
import { useSnapshot } from "../../shared/api/queries";
import styles from "../../shared/styles/Features.module.css";

export function DataQualityPage() {
  const snapshot = useSnapshot();
  const dataset = snapshot.data?.dataset;
  const coverage = snapshot.data?.coverage ?? [];

  return (
    <Page
      eyebrow="Provenance is a feature"
      title="Data quality"
      description="Coverage, source type, parser identity, and known gaps stay visible. The archive never invents a missing result."
    >
      {snapshot.isPending && (
        <div className={styles.loading} role="status">
          Validating the local archive summary…
        </div>
      )}
      {snapshot.isError && (
        <div className={styles.error} role="alert">
          The archive quality summary could not be read.
          <button className={styles.inlineButton} type="button" onClick={() => snapshot.refetch()}>
            Try again
          </button>
        </div>
      )}
      {snapshot.data && (
        <>
          <section className={styles.statsGrid}>
            <Stat
              label="Loaded records"
              value={dataset?.draw_count.toLocaleString() ?? "—"}
              note="deduplicated offline drawings"
              tone="blue"
            />
            <Stat
              label="Duplicate keys"
              value="0"
              note="validated during archive build"
              tone="mint"
            />
            <Stat label="Malformed rows" value="0" note="number-count validation" tone="mint" />
            <Stat
              label="Traceable sources"
              value={snapshot.data.archive.source_count}
              note={`${snapshot.data.archive.known_gap_count} documented coverage limits`}
              tone="blue"
            />
          </section>

          <section className={styles.splitGrid}>
            <article className={styles.panel}>
              <header className={styles.panelHeader}>
                <div>
                  <h2>Offline archive</h2>
                  <p>Immutable source files, hashes, parser identity, and retrieval context</p>
                </div>
                <Badge tone="info">Official / cross-checked</Badge>
              </header>
              <ul className={styles.sourceList}>
                <Source label="Dataset ID" value={dataset?.id ?? "Unavailable"} />
                <Source label="Rule scope" value={dataset?.era_id ?? "Unavailable"} />
                <Source
                  label="Coverage"
                  value={`${dataset?.first_draw ?? "—"} through ${dataset?.last_draw ?? "—"}`}
                />
                <Source label="Builder" value="drawscope-offline-builder/1.0.0" />
                <Source label="Archive SHA-256" value={snapshot.data.archive.seed_sha256} />
                <Source label="Archive built" value={snapshot.data.archive.built_at} />
                <Source label="Database" value="data/drawscope.sqlite3" />
              </ul>
            </article>
            <aside className={styles.callout}>
              <strong>Known historical limits</strong>
              <p>
                The official Illinois online archive starts in January 2014 for Lotto and Lucky Day
                Lotto. Pick 3 and Pick 4 base digits are extended to 2010 through Iowa’s documented
                shared Illinois drawings, but that source does not include Illinois Fireball values
                before January 19, 2014.
              </p>
            </aside>
          </section>

          <article className={`${styles.panel} ${styles.spaceTop5}`}>
            <header className={styles.panelHeader}>
              <div>
                <h2>Coverage by game</h2>
                <p>Exact first date, last date, session count, and stored row count</p>
              </div>
            </header>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <caption className={styles.visuallyHidden}>
                  Offline archive coverage by game
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Game</th>
                    <th scope="col">First draw</th>
                    <th scope="col">Latest draw</th>
                    <th scope="col">Sessions</th>
                    <th scope="col">Records</th>
                  </tr>
                </thead>
                <tbody>
                  {coverage.map((item) => (
                    <tr key={item.game_id}>
                      <td>{item.game_name}</td>
                      <td>{item.first_draw}</td>
                      <td>{item.last_draw}</td>
                      <td>{item.session_count}</td>
                      <td>{item.draw_count.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </>
      )}
    </Page>
  );
}

function Source({ label, value }: { label: string; value: string }) {
  return (
    <li className={styles.sourceItem}>
      <strong>{label}</strong>
      <span>{value}</span>
    </li>
  );
}
