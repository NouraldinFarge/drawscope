import { Badge, Page, Stat } from "../../shared/components/Page";
import { useSavedPageImport, useSnapshot, useSourceUpdates } from "../../shared/api/queries";
import styles from "../../shared/styles/Features.module.css";

export function DataUpdatesPage() {
  const sources = useSourceUpdates();
  const snapshot = useSnapshot();
  const savedImport = useSavedPageImport();
  const data = sources.data;
  const result = savedImport.data;

  return (
    <Page
      eyebrow="Controlled source ingestion"
      title="Data updates"
      description="The verified archive is bundled for offline use. You can also import saved annual pages when you have permission to use them."
      actions={
        <button
          className={styles.button}
          type="button"
          aria-busy={savedImport.isPending}
          disabled={savedImport.isPending || sources.isPending}
          onClick={() => savedImport.mutate()}
        >
          {savedImport.isPending ? "Checking saved pages…" : "Import saved pages"}
        </button>
      }
    >
      {(sources.isPending || snapshot.isPending) && (
        <div className={styles.loading} role="status">
          Reading source policies and archive status…
        </div>
      )}
      {(sources.isError || snapshot.isError) && (
        <div className={styles.error} role="alert">
          Some update information could not be read.
          <button
            className={styles.inlineButton}
            type="button"
            onClick={() => {
              sources.refetch();
              snapshot.refetch();
            }}
          >
            Try again
          </button>
        </div>
      )}
      <section className={styles.statsGrid} aria-label="Import status">
        <Stat
          label="Bundled drawings"
          value={snapshot.data?.dataset.draw_count.toLocaleString() ?? "—"}
          note="official and officially cross-checked sources"
          tone="blue"
        />
        <Stat
          label="Bundled coverage"
          value={
            snapshot.data
              ? `${snapshot.data.dataset.first_draw.slice(0, 4)}–${snapshot.data.dataset.last_draw.slice(0, 4)}`
              : "—"
          }
          note="exact ranges are listed under Data quality"
          tone="blue"
        />
        <Stat
          label="Imported pages"
          value={data?.total_imported_pages ?? "—"}
          note="Content-hash deduplicated"
          tone="mint"
        />
        <Stat
          label="Imported draws"
          value={data?.total_imported_draws ?? "—"}
          note="Validated before SQLite commit"
          tone="mint"
        />
      </section>

      <section className={styles.splitGrid}>
        <article className={styles.panel}>
          <header className={styles.panelHeader}>
            <div>
              <h2>Lottery.net archive adapter</h2>
              <p>Parser {data?.parser_version ?? "loading"}</p>
            </div>
            <Badge tone="warning">Permission required</Badge>
          </header>
          <div className={styles.callout}>
            <strong>Live extraction is deliberately off</strong>
            <p>
              Lottery.net’s terms prohibit automated data mining, harvesting, and extracting. The
              app therefore does not request these pages in the background. It can import saved HTML
              pages that you are lawfully allowed to use, preserving their hash, source URL, parser
              version, and retrieval record.
            </p>
          </div>
          <ol className={`${styles.methodList} ${styles.spaceTop4}`}>
            <li className={styles.methodItem}>
              <strong>1. Save an annual archive page as HTML</strong>
              <p>Use the exact feed URL and year shown in the table below.</p>
            </li>
            <li className={styles.methodItem}>
              <strong>2. Put it in {data?.import_directory ?? "imports/lottery-net"}</strong>
              <p>Name it with the feed ID and year, for example pick-3-midday-2026.html.</p>
            </li>
            <li className={styles.methodItem}>
              <strong>3. Select “Import saved pages”</strong>
              <p>
                DrawScope checks page identity, year, date, count, number range, ordering, optional
                Fireball or Extra Shot, duplicates, and provenance before committing.
              </p>
            </li>
          </ol>
          {data && (
            <p className={styles.sourceLinks}>
              <a href={data.provider.terms_url} target="_blank" rel="noreferrer">
                Read Lottery.net terms
              </a>
              <a href={data.provider.official_alternative_url} target="_blank" rel="noreferrer">
                Open official Illinois results
              </a>
            </p>
          )}
        </article>

        <aside className={styles.panel} aria-live="polite">
          <header className={styles.panelHeader}>
            <div>
              <h2>Latest import</h2>
              <p>Idempotent: the same page hash is never imported twice</p>
            </div>
          </header>
          {savedImport.isError && (
            <div className={styles.error} role="alert">
              The saved-page import could not finish. No partial page was committed.
            </div>
          )}
          {!result && !savedImport.isError && (
            <p>Place saved pages in the portable import folder, then run the import.</p>
          )}
          {result && (
            <ul className={styles.sourceList} aria-live="polite">
              <Result label="Files scanned" value={result.scanned_files} />
              <Result label="Pages imported" value={result.imported_pages} />
              <Result label="Draws imported" value={result.imported_draws} />
              <Result
                label="Duplicates skipped"
                value={result.duplicate_pages + result.duplicate_draws}
              />
              <Result label="Pages rejected" value={result.rejected_pages} />
              {result.failures.map((failure) => (
                <Result
                  key={`${failure.file_name}-${failure.code}`}
                  label={failure.file_name}
                  value={friendlyCode(failure.code)}
                />
              ))}
            </ul>
          )}
        </aside>
      </section>

      <article className={`${styles.panel} ${styles.spaceTop5}`}>
        <header className={styles.panelHeader}>
          <div>
            <h2>Inspected annual feeds</h2>
            <p>Research snapshot {data?.researched_at ?? "loading"}</p>
          </div>
          <Badge tone="info">Annual pages · no pagination</Badge>
        </header>
        {sources.isError && (
          <div className={styles.error} role="alert">
            The local source catalog could not be read.
          </div>
        )}
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <caption className={styles.visuallyHidden}>
              Permission-gated saved-page import feeds
            </caption>
            <thead>
              <tr>
                <th scope="col">Feed</th>
                <th scope="col">Session</th>
                <th scope="col">Years</th>
                <th scope="col">Shape</th>
                <th scope="col">Saved name</th>
                <th scope="col">Imported</th>
              </tr>
            </thead>
            <tbody>
              {data?.feeds.map((feed) => (
                <tr key={feed.id}>
                  <td>
                    <a href={feed.archive_url_example} target="_blank" rel="noreferrer">
                      {feed.name}
                    </a>
                  </td>
                  <td>{feed.session}</td>
                  <td>
                    {feed.first_year}–{feed.last_year}
                  </td>
                  <td>
                    {feed.main_count} {feed.ordered ? "ordered digits" : "main balls"}
                    {feed.optional_special ? ` + optional ${feed.optional_special}` : ""}
                  </td>
                  <td className={styles.mono}>{feed.saved_file_pattern}</td>
                  <td>
                    {feed.imported_pages} pages / {feed.imported_draws} draws
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </Page>
  );
}

function Result({ label, value }: { label: string; value: string | number }) {
  return (
    <li className={styles.sourceItem}>
      <strong>{label}</strong>
      <span>{value}</span>
    </li>
  );
}

function friendlyCode(code: string) {
  return code
    .replace(/^source\./, "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
