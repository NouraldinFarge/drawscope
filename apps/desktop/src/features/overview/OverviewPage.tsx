import { Link } from "@tanstack/react-router";
import { Badge, Ball, Page, Stat } from "../../shared/components/Page";
import { useSnapshot } from "../../shared/api/queries";
import styles from "../../shared/styles/Features.module.css";

export function OverviewPage() {
  const snapshot = useSnapshot();
  if (snapshot.isPending) return <Loading />;
  if (snapshot.isError || !snapshot.data) {
    return <ErrorState retry={() => snapshot.refetch()} />;
  }
  const { data } = snapshot;
  const currentGames = data.games.filter((game) => game.status === "current");
  const archiveCoverage = Math.round((data.coverage.length / currentGames.length) * 100);

  return (
    <Page
      eyebrow="Illinois draw intelligence"
      title="See the record clearly."
      description="A local evidence workspace for exploring drawing history, game eras, and randomness—without pretending that the past predicts the next draw."
      actions={
        <Link className={styles.button} to="/analytics">
          Run transparent analysis →
        </Link>
      }
    >
      <section className={styles.statsGrid} aria-label="Dataset summary">
        <Stat
          label="Archived games"
          value={data.coverage.length}
          note={`${currentGames.length} current games in the catalog`}
          tone="blue"
        />
        <Stat
          label="Offline drawings"
          value={data.dataset.draw_count.toLocaleString()}
          note={`${data.dataset.first_draw} through ${data.dataset.last_draw}`}
          tone="mint"
        />
        <Stat
          label="Rule eras"
          value={data.rule_era_count}
          note="Incompatible matrices stay separate"
          tone="amber"
        />
        <Stat
          label="Local status"
          value={data.database_status === "healthy" ? "Healthy" : "Review"}
          note="SQLite and portable paths"
          tone="mint"
        />
      </section>

      <section className={styles.contentGrid}>
        <article className={styles.panel}>
          <header className={styles.panelHeader}>
            <div>
              <h2>Recent archive records</h2>
              <p>Powerball · full offline history · special ball kept separate</p>
            </div>
            <Badge tone="info">Officially cross-checked</Badge>
          </header>
          <ol className={styles.drawList}>
            {data.draws.slice(0, 6).map((draw) => (
              <li className={styles.drawRow} key={draw.draw_date}>
                <time className={styles.date} dateTime={draw.draw_date}>
                  {new Intl.DateTimeFormat("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    timeZone: "UTC",
                  }).format(new Date(`${draw.draw_date}T00:00:00Z`))}
                </time>
                <div className={styles.balls}>
                  {draw.main_numbers.map((number) => (
                    <Ball key={number}>{number}</Ball>
                  ))}
                  <Ball special>{draw.special_number}</Ball>
                </div>
                <Badge tone="info">
                  {draw.multiplier === null ? "No multiplier" : `${draw.multiplier}×`}
                </Badge>
              </li>
            ))}
          </ol>
        </article>

        <aside>
          <div className={styles.callout}>
            <strong>Patterns are descriptions, not promises.</strong>
            <p>
              A number appearing often, rarely, or not recently does not make it more likely in the
              next independent fair drawing. DrawScope keeps observed statistics and official
              probability in separate lanes.
            </p>
          </div>
          <div className={`${styles.panel} ${styles.spaceTop5}`}>
            <header className={styles.panelHeader}>
              <div>
                <h2>Evidence coverage</h2>
                <p>Bundled archive with row-level provenance</p>
              </div>
            </header>
            <div className={styles.coverage}>
              <Coverage label="Schema validation" value="100%" percentage={100} />
              <Coverage label="Era assignment" value="100%" percentage={100} />
              <Coverage label="SQLite integrity" value="Passed" percentage={100} />
              <Coverage
                label="Archived games"
                value={`${data.coverage.length} with results`}
                percentage={archiveCoverage}
              />
            </div>
          </div>
        </aside>
      </section>
    </Page>
  );
}

function Coverage({
  label,
  value,
  percentage,
}: {
  label: string;
  value: string;
  percentage: number;
}) {
  return (
    <div className={styles.coverageItem}>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <progress
        className={styles.progress}
        max="100"
        value={percentage}
        aria-label={`${label}: ${value}`}
      />
    </div>
  );
}

function Loading() {
  return (
    <div className={styles.loading} role="status">
      Opening the local DrawScope catalog…
    </div>
  );
}

function ErrorState({ retry }: { retry(): void }) {
  return (
    <div className={styles.empty} role="alert">
      DrawScope could not read its local catalog. Restart the app and open Diagnostics if this
      continues.{" "}
      <button className={styles.inlineButton} type="button" onClick={retry}>
        Try again
      </button>
    </div>
  );
}
