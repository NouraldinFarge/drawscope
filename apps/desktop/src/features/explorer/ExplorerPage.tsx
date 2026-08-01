import { useEffect, useMemo, useState } from "react";
import { Badge, Ball, Page } from "../../shared/components/Page";
import { useDrawings, useSnapshot } from "../../shared/api/queries";
import styles from "../../shared/styles/Features.module.css";

const PAGE_SIZE = 50;

export function ExplorerPage() {
  const snapshot = useSnapshot();
  const availableGames = useMemo(
    () =>
      (snapshot.data?.coverage ?? [])
        .map((coverage) => ({
          ...coverage,
          game: snapshot.data?.games.find((game) => game.id === coverage.game_id),
        }))
        .filter((item) => item.game),
    [snapshot.data],
  );
  const [gameId, setGameId] = useState("powerball");
  const [session, setSession] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [numberFilter, setNumberFilter] = useState("");
  const [offset, setOffset] = useState(0);
  const selected = availableGames.find((item) => item.game_id === gameId);

  useEffect(() => {
    if (availableGames.length && !availableGames.some((item) => item.game_id === gameId)) {
      setGameId(availableGames[0].game_id);
      setOffset(0);
    }
  }, [availableGames, gameId]);

  const firstYear = selected ? Number(selected.first_draw.slice(0, 4)) : 1900;
  const lastYear = selected ? Number(selected.last_draw.slice(0, 4)) : 2100;
  const parsedYear = Number(yearFilter);
  const yearIsValid =
    yearFilter === "" ||
    (/^\d{4}$/.test(yearFilter) && parsedYear >= firstYear && parsedYear <= lastYear);
  const minimumNumber = selected?.game?.main_min ?? 0;
  const maximumNumber = selected?.game?.main_max ?? 80;
  const parsedNumber = Number(numberFilter);
  const numberIsValid =
    numberFilter === "" ||
    (/^\d{1,2}$/.test(numberFilter) &&
      parsedNumber >= minimumNumber &&
      parsedNumber <= maximumNumber);
  const filtersAreValid = yearIsValid && numberIsValid;
  const page = useDrawings(
    {
      gameId,
      session: session || null,
      year: yearFilter && yearIsValid ? parsedYear : null,
      number: numberFilter && numberIsValid ? parsedNumber : null,
      limit: PAGE_SIZE,
      offset,
    },
    Boolean(selected) && filtersAreValid,
  );
  const records = filtersAreValid ? (page.data?.records ?? []) : [];
  const total = filtersAreValid ? (page.data?.total ?? 0) : 0;
  const firstShown = total === 0 ? 0 : offset + 1;
  const lastShown = Math.min(offset + records.length, total);

  return (
    <Page
      eyebrow="Offline, source-linked records"
      title="Draw explorer"
      description="Browse the bundled historical database by game, session, year, or number. Every row retains its source and game-era identity."
    >
      {snapshot.isError && (
        <div className={styles.error} role="alert">
          The local game catalog could not be read.
          <button className={styles.inlineButton} type="button" onClick={() => snapshot.refetch()}>
            Try again
          </button>
        </div>
      )}
      <fieldset className={styles.filters}>
        <legend className={styles.visuallyHidden}>Drawing filters</legend>
        <div className={styles.field}>
          <label htmlFor="game-filter">Game</label>
          <select
            id="game-filter"
            disabled={snapshot.isPending || availableGames.length === 0}
            value={gameId}
            onChange={(event) => {
              setGameId(event.target.value);
              setSession("");
              setYearFilter("");
              setNumberFilter("");
              setOffset(0);
            }}
          >
            {availableGames.map((item) => (
              <option key={item.game_id} value={item.game_id}>
                {item.game_name} · {item.draw_count.toLocaleString()} draws
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor="session-filter">Session</label>
          <select
            id="session-filter"
            disabled={!selected || selected.session_count === 1}
            value={session}
            onChange={(event) => {
              setSession(event.target.value);
              setOffset(0);
            }}
          >
            <option value="">{selected?.session_count === 1 ? "Evening" : "All sessions"}</option>
            {selected && selected.session_count > 1 && (
              <>
                <option value="midday">Midday</option>
                <option value="evening">Evening</option>
              </>
            )}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor="year-filter">Year</label>
          <input
            id="year-filter"
            aria-describedby={!yearIsValid ? "year-filter-error" : undefined}
            aria-invalid={!yearIsValid}
            disabled={!selected}
            inputMode="numeric"
            min={firstYear}
            max={lastYear}
            placeholder={`${firstYear}–${lastYear}`}
            type="number"
            value={yearFilter}
            onChange={(event) => {
              setYearFilter(event.target.value);
              setOffset(0);
            }}
          />
          {!yearIsValid && (
            <span className={styles.fieldError} id="year-filter-error">
              Use a year from {firstYear} through {lastYear}.
            </span>
          )}
        </div>
        <div className={styles.field}>
          <label htmlFor="number-filter">Contains number</label>
          <input
            id="number-filter"
            aria-describedby={!numberIsValid ? "number-filter-error" : undefined}
            aria-invalid={!numberIsValid}
            disabled={!selected}
            inputMode="numeric"
            min={minimumNumber}
            max={maximumNumber}
            placeholder={`${minimumNumber}–${maximumNumber}`}
            type="number"
            value={numberFilter}
            onChange={(event) => {
              setNumberFilter(event.target.value);
              setOffset(0);
            }}
          />
          {!numberIsValid && (
            <span className={styles.fieldError} id="number-filter-error">
              Use a number from {minimumNumber} through {maximumNumber}.
            </span>
          )}
        </div>
      </fieldset>

      <div className={`${styles.panelHeader} ${styles.spaceTop5}`}>
        <div>
          <h2>{selected?.game_name ?? "Drawings"}</h2>
          <p aria-live="polite">
            {snapshot.isPending || page.isPending
              ? "Reading the local database…"
              : filtersAreValid
                ? `${firstShown.toLocaleString()}–${lastShown.toLocaleString()} of ${total.toLocaleString()} matching draws`
                : "Correct the highlighted filter to search."}
          </p>
        </div>
        {selected && (
          <Badge tone="info">
            {selected.first_draw}–{selected.last_draw}
          </Badge>
        )}
      </div>

      {page.isError && (
        <div className={styles.error} role="alert">
          These drawing records could not be read.
          <button className={styles.inlineButton} type="button" onClick={() => page.refetch()}>
            Try again
          </button>
        </div>
      )}

      <div className={styles.tableWrap} aria-busy={page.isFetching}>
        <table className={styles.table}>
          <caption className={styles.visuallyHidden}>
            Source-linked offline lottery drawing records
          </caption>
          <thead>
            <tr>
              <th scope="col">Draw date</th>
              <th scope="col">Session</th>
              <th scope="col">Main numbers</th>
              <th scope="col">{selected?.game?.special_name ?? "Special"}</th>
              <th scope="col">Multiplier</th>
              <th scope="col">Evidence</th>
            </tr>
          </thead>
          <tbody>
            {records.map((draw) => {
              const evidence = verificationPresentation(draw.verification_status);
              return (
                <tr key={draw.id}>
                  <td>{draw.draw_date}</td>
                  <td>{draw.session}</td>
                  <td>
                    <div className={styles.balls}>
                      {keyedNumbers(draw.main_numbers).map((ball) => (
                        <Ball key={ball.key}>{ball.value}</Ball>
                      ))}
                    </div>
                  </td>
                  <td>
                    {draw.special_number === null ? (
                      "—"
                    ) : (
                      <span title={draw.special_name ?? "Special number"}>
                        <Ball special>{draw.special_number}</Ball>
                      </span>
                    )}
                  </td>
                  <td>{draw.multiplier === null ? "—" : `${draw.multiplier}×`}</td>
                  <td>
                    <a
                      aria-label={`${evidence.label} source for ${draw.game_name} on ${draw.draw_date}`}
                      href={draw.source_detail_url ?? draw.source_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Badge tone={evidence.tone}>{evidence.label}</Badge>
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!page.isPending && !page.isError && filtersAreValid && records.length === 0 && (
        <div className={styles.empty}>No offline drawing matches those filters.</div>
      )}
      <nav className={styles.pagination} aria-label="Drawing pages">
        <button
          className={styles.buttonSecondary}
          type="button"
          disabled={offset === 0 || page.isFetching}
          onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
        >
          ← Newer
        </button>
        <span>
          {firstShown.toLocaleString()}–{lastShown.toLocaleString()} of {total.toLocaleString()}
        </span>
        <button
          className={styles.buttonSecondary}
          type="button"
          disabled={offset + PAGE_SIZE >= total || page.isFetching}
          onClick={() => setOffset(offset + PAGE_SIZE)}
        >
          Older →
        </button>
      </nav>
    </Page>
  );
}

function keyedNumbers(numbers: number[]) {
  const occurrences = new Map<number, number>();
  return numbers.map((value) => {
    const occurrence = (occurrences.get(value) ?? 0) + 1;
    occurrences.set(value, occurrence);
    return { key: `${value}-${occurrence}`, value };
  });
}

function verificationPresentation(status: string): {
  label: string;
  tone: "info" | "warning";
} {
  if (status === "official") return { label: "Official", tone: "info" };
  if (status === "cross_verified") return { label: "Cross-checked", tone: "info" };
  if (status === "single_secondary_source") return { label: "Secondary", tone: "warning" };
  return { label: "Review", tone: "warning" };
}
