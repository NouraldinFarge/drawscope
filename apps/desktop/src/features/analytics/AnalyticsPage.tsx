import type { AnalysisResult } from "@drawscope/contracts";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { runAnalysis } from "../../shared/api/client";
import { Badge, Ball, Page, Stat } from "../../shared/components/Page";
import styles from "../../shared/styles/Features.module.css";

function percent(value: number) {
  return `${value.toFixed(value < 10 ? 1 : 0)}%`;
}

function pValue(value: number) {
  return value < 0.001 ? "< 0.001" : value.toFixed(3);
}

function evidenceLabel(grade: AnalysisResult["retrospective"]["backtest"]["evidence_grade"]) {
  if (grade === "above_chance_range") return "Above chance in this sample";
  if (grade === "below_chance_range") return "Below chance in this sample";
  return "Within chance range";
}

function confidenceLabel(
  label: AnalysisResult["retrospective"]["best_pattern"]["confidence_label"],
) {
  if (label === "no_demonstrated_edge") return "No demonstrated edge";
  if (label === "very_low") return "Very low";
  if (label === "low") return "Low";
  if (label === "preliminary") return "Preliminary";
  return "Tentative · historical only";
}

function recommendation(value: AnalysisResult["retrospective"]["best_pattern"]["recommendation"]) {
  return value === "do_not_use_to_choose_numbers"
    ? "Do not use this pattern to choose numbers."
    : "Historical experiment only; prospective verification is still required.";
}

export function AnalyticsPage() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [targetDate, setTargetDate] = useState("");
  const analysis = useMutation({
    mutationFn: runAnalysis,
    onSuccess: setResult,
  });

  const ranked = result
    ? [...result.numbers].sort(
        (left, right) => right.frequency - left.frequency || left.number - right.number,
      )
    : [];
  const retrospective = result?.retrospective;
  const winningPercentile = retrospective
    ? retrospective.main_number_patterns.reduce(
        (sum, pattern) => sum + pattern.composite_percentile,
        0,
      ) / retrospective.main_number_patterns.length
    : 0;

  return (
    <Page
      eyebrow="Methodology 1.2.0"
      title="Retrospective pattern lab"
      description="Search 30 historical signals, select the best candidate on an early discovery period, and measure it once on a later untouched confirmation period."
    >
      <form
        className={styles.analysisControls}
        onSubmit={(event) => {
          event.preventDefault();
          analysis.mutate(targetDate || null);
        }}
      >
        <label className={styles.field}>
          <span>Winning Powerball draw date</span>
          <input
            type="date"
            value={targetDate}
            disabled={analysis.isPending}
            aria-describedby="target-date-note"
            onChange={(event) => setTargetDate(event.target.value)}
          />
        </label>
        <p id="target-date-note">
          Leave blank to test the latest archived draw, or choose any current-rule-era drawing with
          at least 60 earlier results.
        </p>
        <button
          className={styles.button}
          type="submit"
          aria-busy={analysis.isPending}
          disabled={analysis.isPending}
        >
          {analysis.isPending ? "Testing patterns…" : result ? "Run another test" : "Test patterns"}
        </button>
      </form>

      {!result && !analysis.isError && (
        <div className={`${styles.callout} ${styles.spaceTop5}`}>
          <strong>What the test searches</strong>
          <p>
            Thirty fixed signals cover rolling and exponentially weighted frequency, momentum,
            calendar cycles, relative gaps, repeats, numeric relationships, and draw-to-draw
            transitions. The best candidate is selected on the first 60% of walk-forward trials and
            rated only on the untouched final 40%.
          </p>
        </div>
      )}
      {analysis.isError && (
        <div className={styles.error} role="alert">
          That date is not an eligible archived Powerball draw, or the analytical engine could not
          finish the test.
          <button
            className={styles.inlineButton}
            type="button"
            onClick={() => analysis.mutate(targetDate || null)}
          >
            Try again
          </button>
        </div>
      )}
      {analysis.isPending && (
        <div className={styles.loading} role="status">
          Rebuilding historical signals and running walk-forward trials…
        </div>
      )}

      {result && retrospective && (
        <>
          <section className={styles.statsGrid} aria-label="Pattern test summary">
            <Stat
              label="Best-pattern confidence"
              value={`${retrospective.best_pattern.confidence_score}/100`}
              note={confidenceLabel(retrospective.best_pattern.confidence_label)}
              tone="blue"
            />
            <Stat
              label="Confirmation lift"
              value={`${retrospective.best_pattern.confirmation_top_5_lift.toFixed(2)}×`}
              note={`${retrospective.best_pattern.confirmation_draws} untouched trials`}
              tone="mint"
            />
            <Stat
              label="Winning rank"
              value={percent(winningPercentile)}
              note="target composite percentile"
              tone="amber"
            />
            <Stat
              label="Confirmation p"
              value={pValue(retrospective.best_pattern.one_sided_p_value)}
              note="one-sided, selected pattern"
            />
          </section>

          <section className={styles.confidencePanel} aria-label="Best pattern confidence rating">
            <header className={styles.confidenceHeader}>
              <div>
                <span>Best discovery-period pattern</span>
                <h2>{retrospective.best_pattern.label}</h2>
                <p>{retrospective.best_pattern.rating_scope}</p>
              </div>
              <div className={styles.confidenceScore}>
                <strong>{retrospective.best_pattern.confidence_score}</strong>
                <span>/ 100</span>
                <Badge
                  tone={retrospective.best_pattern.confidence_score >= 20 ? "warning" : "info"}
                >
                  {confidenceLabel(retrospective.best_pattern.confidence_label)}
                </Badge>
              </div>
            </header>
            <progress
              className={styles.progress}
              max={100}
              value={retrospective.best_pattern.confidence_score}
              aria-label={`Best pattern confidence: ${retrospective.best_pattern.confidence_score} out of 100`}
            />
            <p className={styles.confidenceLimit}>
              Retrospective evidence is capped at {retrospective.best_pattern.confidence_cap}/100.
              Scores of 50 or higher require future drawings that were never available during
              development.
            </p>
            <div className={styles.confidenceGrid}>
              <dl className={styles.metricList}>
                <div>
                  <dt>Discovery performance</dt>
                  <dd>
                    {retrospective.best_pattern.discovery_top_5_lift.toFixed(2)}× chance ·{" "}
                    {retrospective.best_pattern.discovery_draws} trials
                  </dd>
                </div>
                <div>
                  <dt>Untouched confirmation</dt>
                  <dd>
                    {retrospective.best_pattern.confirmation_top_5_lift.toFixed(2)}× chance ·{" "}
                    {retrospective.best_pattern.confirmation_draws} trials
                  </dd>
                </div>
                <div>
                  <dt>Confirmation percentile</dt>
                  <dd>{percent(retrospective.best_pattern.confirmation_winning_percentile)}</dd>
                </div>
                <div>
                  <dt>Confirmation stability</dt>
                  <dd>
                    {retrospective.best_pattern.positive_confirmation_blocks} /{" "}
                    {retrospective.best_pattern.confirmation_blocks} blocks above chance
                  </dd>
                </div>
                <div>
                  <dt>z-score · one-sided p-value</dt>
                  <dd>
                    {retrospective.best_pattern.confirmation_z_score.toFixed(2)} ·{" "}
                    {pValue(retrospective.best_pattern.one_sided_p_value)}
                  </dd>
                </div>
              </dl>
              <div className={styles.counterfactual}>
                <span>What this pattern would have picked before the target</span>
                <div className={styles.balls}>
                  {retrospective.best_pattern.counterfactual_main_numbers.map((number) => (
                    <Ball key={number}>{number}</Ball>
                  ))}
                  {retrospective.best_pattern.counterfactual_special_number !== null && (
                    <Ball special>{retrospective.best_pattern.counterfactual_special_number}</Ball>
                  )}
                </div>
                <strong>
                  Matched {retrospective.best_pattern.counterfactual_main_hits} of 5 main numbers
                  {retrospective.best_pattern.counterfactual_special_hit
                    ? " plus the Powerball"
                    : ""}
                </strong>
                <p>{recommendation(retrospective.best_pattern.recommendation)}</p>
              </div>
            </div>
          </section>

          <section className={styles.panel}>
            <header className={styles.panelHeader}>
              <div>
                <h2>Winning draw under the microscope</h2>
                <p>
                  The target itself was hidden until every score below had already been calculated.
                </p>
              </div>
              <Badge tone="info">
                {retrospective.day_of_week} · {retrospective.month} · {retrospective.season}
              </Badge>
            </header>
            <div className={styles.targetDraw}>
              <div>
                <span>{retrospective.target_draw_date}</span>
                <div className={styles.balls}>
                  {retrospective.target_main_numbers.map((number) => (
                    <Ball key={number}>{number}</Ball>
                  ))}
                  {retrospective.target_special_number !== null && (
                    <Ball special>{retrospective.target_special_number}</Ball>
                  )}
                </div>
              </div>
              <Badge
                tone={
                  retrospective.backtest.evidence_grade === "within_chance_range"
                    ? "info"
                    : "warning"
                }
              >
                {evidenceLabel(retrospective.backtest.evidence_grade)}
              </Badge>
            </div>

            <div className={`${styles.tableWrap} ${styles.spaceTop5}`}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Winner</th>
                    <th>Composite rank</th>
                    <th>All prior</th>
                    <th>Last 10</th>
                    <th>Last 30</th>
                    <th>Same weekday</th>
                    <th>Same month</th>
                    <th>Same season</th>
                    <th>Gap</th>
                    <th>Previous draw</th>
                    <th>Strongest supporting signal</th>
                  </tr>
                </thead>
                <tbody>
                  {retrospective.main_number_patterns.map((pattern) => (
                    <tr key={pattern.number}>
                      <td>
                        <strong>{pattern.number}</strong>
                      </td>
                      <td>
                        #{pattern.composite_rank} · {percent(pattern.composite_percentile)}
                      </td>
                      <td>{pattern.overall_hits}</td>
                      <td>{pattern.last_10_hits}</td>
                      <td>{pattern.last_30_hits}</td>
                      <td>{pattern.same_weekday_hits}</td>
                      <td>{pattern.same_month_hits}</td>
                      <td>{pattern.same_season_hits}</td>
                      <td>{pattern.gap_before_draw ?? "Never"}</td>
                      <td>
                        {pattern.repeated_previous_draw
                          ? "Repeat"
                          : pattern.adjacent_previous_draw
                            ? "Adjacent"
                            : "Neither"}
                      </td>
                      <td>{pattern.top_supporting_signals[0]?.label ?? "No positive support"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {retrospective.special_number_pattern && (
              <div className={styles.specialResult}>
                <Ball special>{retrospective.special_number_pattern.number}</Ball>
                <div>
                  <strong>
                    Powerball pattern rank #{retrospective.special_number_pattern.composite_rank}
                  </strong>
                  <span>
                    {percent(retrospective.special_number_pattern.composite_percentile)} percentile
                    · {retrospective.special_number_pattern.overall_hits} earlier hits · gap{" "}
                    {retrospective.special_number_pattern.gap_before_draw ?? "never"} · strongest:{" "}
                    {retrospective.special_number_pattern.top_supporting_signals[0]?.label ??
                      "none"}
                  </span>
                </div>
              </div>
            )}
          </section>

          <section className={`${styles.splitGrid} ${styles.spaceTop5}`}>
            <article className={styles.panel}>
              <header className={styles.panelHeader}>
                <div>
                  <h2>Walk-forward reality check</h2>
                  <p>Each trial hides one winner and scores it using only earlier results.</p>
                </div>
                <Badge tone="info">{retrospective.backtest.tested_draws} trials</Badge>
              </header>
              <dl className={styles.metricList}>
                <div>
                  <dt>Observed top-five hits per draw</dt>
                  <dd>{retrospective.backtest.average_top_5_hits.toFixed(3)}</dd>
                </div>
                <div>
                  <dt>Chance expectation</dt>
                  <dd>{retrospective.backtest.expected_average_top_5_hits.toFixed(3)}</dd>
                </div>
                <div>
                  <dt>Observed ÷ expected</dt>
                  <dd>{retrospective.backtest.top_5_lift.toFixed(2)}×</dd>
                </div>
                <div>
                  <dt>Trials with at least one top-five hit</dt>
                  <dd>
                    {retrospective.backtest.any_top_5_hit_draws} /{" "}
                    {retrospective.backtest.tested_draws}
                  </dd>
                </div>
                <div>
                  <dt>Winning-number average rank</dt>
                  <dd>{percent(retrospective.backtest.winning_number_average_percentile)}</dd>
                </div>
                <div>
                  <dt>z-score · two-sided p-value</dt>
                  <dd>
                    {retrospective.backtest.z_score.toFixed(2)} ·{" "}
                    {pValue(retrospective.backtest.two_sided_p_value)}
                  </dd>
                </div>
              </dl>
              <p className={styles.mutedNote}>
                Tested {retrospective.backtest.start} through {retrospective.backtest.end}. A result
                within the chance range means the apparent patterns did not produce statistically
                unusual top-five performance.
              </p>
            </article>

            <article className={styles.panel}>
              <h2>Ticket-shape patterns</h2>
              <p>How the complete winning combination compared with earlier ticket shapes.</p>
              <dl className={styles.metricList}>
                <div>
                  <dt>Sum</dt>
                  <dd>
                    {retrospective.ticket_pattern.main_sum} ·{" "}
                    {percent(retrospective.ticket_pattern.sum_percentile)} percentile
                  </dd>
                </div>
                <div>
                  <dt>Odd/even shape</dt>
                  <dd>
                    {retrospective.ticket_pattern.odd_count} odd · seen in{" "}
                    {percent(retrospective.ticket_pattern.odd_even_prior_rate * 100)}
                  </dd>
                </div>
                <div>
                  <dt>Consecutive numbers</dt>
                  <dd>
                    {retrospective.ticket_pattern.has_consecutive_numbers ? "Yes" : "No"} · prior
                    rate {percent(retrospective.ticket_pattern.consecutive_prior_rate * 100)}
                  </dd>
                </div>
                <div>
                  <dt>Repeated from previous draw</dt>
                  <dd>
                    {retrospective.ticket_pattern.repeated_from_previous_draw} · any-repeat prior
                    rate {percent(retrospective.ticket_pattern.repeat_prior_rate * 100)}
                  </dd>
                </div>
                <div>
                  <dt>Winning pairs seen before</dt>
                  <dd>
                    {retrospective.ticket_pattern.pairs_seen_before} /{" "}
                    {retrospective.ticket_pattern.pair_count} ·{" "}
                    {retrospective.ticket_pattern.historical_pair_occurrences} total occurrences
                  </dd>
                </div>
                <div>
                  <dt>Winning triples seen before</dt>
                  <dd>
                    {retrospective.ticket_pattern.triples_seen_before} /{" "}
                    {retrospective.ticket_pattern.triple_count} ·{" "}
                    {retrospective.ticket_pattern.historical_triple_occurrences} total occurrences
                  </dd>
                </div>
                <div>
                  <dt>Number spread</dt>
                  <dd>
                    {retrospective.ticket_pattern.spread} ·{" "}
                    {percent(retrospective.ticket_pattern.spread_percentile)} percentile
                  </dd>
                </div>
                <div>
                  <dt>Dispersion</dt>
                  <dd>
                    {retrospective.ticket_pattern.standard_deviation.toFixed(2)} ·{" "}
                    {percent(retrospective.ticket_pattern.standard_deviation_percentile)} percentile
                  </dd>
                </div>
                <div>
                  <dt>Low/high balance</dt>
                  <dd>
                    {retrospective.ticket_pattern.low_count} low · prior rate{" "}
                    {percent(retrospective.ticket_pattern.low_high_prior_rate * 100)}
                  </dd>
                </div>
                <div>
                  <dt>Prime-number count</dt>
                  <dd>
                    {retrospective.ticket_pattern.prime_count} · prior rate{" "}
                    {percent(retrospective.ticket_pattern.prime_prior_rate * 100)}
                  </dd>
                </div>
                <div>
                  <dt>Multiples of three</dt>
                  <dd>
                    {retrospective.ticket_pattern.multiples_of_3_count} · prior rate{" "}
                    {percent(retrospective.ticket_pattern.multiples_of_3_prior_rate * 100)}
                  </dd>
                </div>
                <div>
                  <dt>Same-ending pairs</dt>
                  <dd>
                    {retrospective.ticket_pattern.repeated_last_digit_pairs} · prior rate{" "}
                    {percent(retrospective.ticket_pattern.repeated_last_digit_prior_rate * 100)}
                  </dd>
                </div>
                <div>
                  <dt>Longest consecutive run</dt>
                  <dd>
                    {retrospective.ticket_pattern.max_consecutive_run} · prior rate{" "}
                    {percent(retrospective.ticket_pattern.max_consecutive_run_prior_rate * 100)}
                  </dd>
                </div>
              </dl>
            </article>
          </section>

          <section className={`${styles.panel} ${styles.spaceTop5}`}>
            <header className={styles.panelHeader}>
              <div>
                <h2>Which patterns ranked the winners highly?</h2>
                <p>
                  The target column explains this ticket. The walk-forward column shows whether that
                  signal usually ranked unseen winners above the neutral 50% level.
                </p>
              </div>
              <Badge tone="neutral">Fixed weights total 100%</Badge>
            </header>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Signal</th>
                    <th>Weight</th>
                    <th>Target winners</th>
                    <th>All walk-forward winners</th>
                    <th>Discovery lift</th>
                    <th>Confirmation lift</th>
                  </tr>
                </thead>
                <tbody>
                  {retrospective.signals.map((signal) => (
                    <tr key={signal.key}>
                      <td>
                        <strong>{signal.label}</strong>
                      </td>
                      <td>{percent(signal.weight * 100)}</td>
                      <td>{percent(signal.target_winning_percentile)}</td>
                      <td>{percent(signal.backtest_winning_percentile)}</td>
                      <td>{signal.discovery_top_5_lift.toFixed(2)}×</td>
                      <td>{signal.confirmation_top_5_lift.toFixed(2)}×</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <details className={`${styles.panel} ${styles.spaceTop5}`}>
            <summary className={styles.detailsSummary}>
              Open full-archive descriptive analytics
            </summary>
            <section className={styles.statsGrid} aria-label="Full archive summary">
              <Stat
                label="Sample"
                value={result.sample_size}
                note="drawings in current era"
                tone="blue"
              />
              <Stat
                label="Mean sum"
                value={result.patterns.mean_sum}
                note="descriptive main-ball total"
                tone="mint"
              />
              <Stat
                label="Consecutive"
                value={result.patterns.consecutive_draws}
                note="draws with adjacent values"
                tone="amber"
              />
              <Stat
                label="χ² statistic"
                value={result.chi_square_statistic}
                note="not a manipulation finding"
              />
            </section>
            <section className={styles.splitGrid}>
              <article>
                <h2>Observed main-ball frequency</h2>
                <p>
                  {result.date_range.start} through {result.date_range.end}
                </p>
                <div className={styles.frequencyGrid}>
                  {ranked.map((item) => (
                    <div className={styles.frequencyCell} key={item.number}>
                      <strong>{item.number}</strong>
                      <span>
                        {item.frequency} hits · gap {item.current_gap ?? "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </article>
              <aside>
                <h2>Most observed pairs</h2>
                <p>Co-occurrence count in the full sample; not predictive association.</p>
                <div className={styles.pairList}>
                  {result.top_pairs.map((pair) => (
                    <div className={styles.pair} key={pair.numbers.join("-")}>
                      <strong>{pair.numbers.join(" · ")}</strong>
                      <span>{pair.count}×</span>
                    </div>
                  ))}
                </div>
                <span className={styles.formula}>
                  Official jackpot odds: {result.theoretical_jackpot_odds}
                </span>
              </aside>
            </section>
          </details>

          <div className={`${styles.callout} ${styles.spaceTop5}`}>
            <strong>How to interpret this responsibly</strong>
            <ul className={styles.disclaimerList}>
              {[...retrospective.notes, ...result.disclaimers].map((disclaimer) => (
                <li key={disclaimer}>{disclaimer}</li>
              ))}
            </ul>
          </div>
        </>
      )}
    </Page>
  );
}
