import { Badge, Page } from "../../shared/components/Page";
import { useSnapshot } from "../../shared/api/queries";
import styles from "../../shared/styles/Features.module.css";

export function GamesPage() {
  const snapshot = useSnapshot();
  const games = snapshot.data?.games ?? [];
  const coverage = snapshot.data?.coverage ?? [];

  return (
    <Page
      eyebrow="Rules before results"
      title="Game eras"
      description="Every drawing is interpreted under the rules in force on its date. DrawScope never silently combines incompatible number pools."
    >
      {snapshot.isPending ? (
        <div className={styles.loading} role="status">
          Loading official game definitions…
        </div>
      ) : snapshot.isError ? (
        <div className={styles.error} role="alert">
          The game definitions could not be read.
          <button className={styles.inlineButton} type="button" onClick={() => snapshot.refetch()}>
            Try again
          </button>
        </div>
      ) : (
        <section className={styles.gameGrid} aria-label="Lottery game catalog">
          {games.map((game) => {
            const archive = coverage.find((item) => item.game_id === game.id);
            return (
              <article className={styles.gameCard} key={game.id}>
                <header>
                  <h2>{game.name}</h2>
                  <Badge tone={game.status === "current" ? "success" : "warning"}>
                    {game.status}
                  </Badge>
                </header>
                <dl>
                  <dt>Current / known era</dt>
                  <dd>{game.era}</dd>
                  <dt>Schedule</dt>
                  <dd>{game.schedule}</dd>
                  <dt>Base play</dt>
                  <dd>
                    {game.price_usd === null ? "Historical" : `$${game.price_usd.toFixed(2)}`}
                  </dd>
                  <dt>Order matters</dt>
                  <dd>{game.ordered ? "Yes" : "No"}</dd>
                  <dt>Published odds</dt>
                  <dd>{game.odds}</dd>
                  <dt>Evidence</dt>
                  <dd>
                    <a href={game.source_url} target="_blank" rel="noreferrer">
                      {game.verification.replaceAll("-", " ")}
                    </a>
                  </dd>
                  <dt>Offline archive</dt>
                  <dd>
                    {archive
                      ? `${archive.draw_count.toLocaleString()} draws · ${archive.first_draw}–${archive.last_draw}`
                      : "No historical records bundled"}
                  </dd>
                </dl>
              </article>
            );
          })}
        </section>
      )}
    </Page>
  );
}
