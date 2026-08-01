import { Badge, Page } from "../../shared/components/Page";
import styles from "../../shared/styles/Features.module.css";

const methods = [
  {
    title: "Observed frequency",
    body: "Count of appearances divided by eligible drawings in one compatible era. Special balls and ordered positions are separate populations.",
    formula: "rate(n) = appearances(n) / eligible drawings",
    status: "Available",
  },
  {
    title: "Current gap",
    body: "Number of eligible drawings since a value most recently appeared. A larger gap does not make a number due.",
    formula: "gap(n) = index of most recent appearance in reverse chronological order",
    status: "Available",
  },
  {
    title: "Pair co-occurrence",
    body: "Number of drawings containing both main-ball values. This is descriptive association, not causal or predictive dependence.",
    formula: "pair(a,b) = Σ I(a ∈ draw ∧ b ∈ draw)",
    status: "Available",
  },
  {
    title: "Pearson chi-square statistic",
    body: "A descriptive deviation measure against equal marginal frequency. Interpretation requires era validity, adequate expected counts, and multiple-testing discipline.",
    formula: "χ² = Σ (observedᵢ − expectedᵢ)² / expectedᵢ",
    status: "Available",
  },
  {
    title: "Monte Carlo baseline",
    body: "Seeded fair draws under the selected era rules provide a reproducible reference range. A simulation does not predict the next drawing.",
    formula: "sample without replacement for unordered k/N games",
    status: "Available",
  },
  {
    title: "Expanded signal search",
    body: "Thirty fixed signals cover rolling and exponentially weighted frequency, momentum, calendar cycles, absolute and relative gaps, last-digit relationships, and conditional draw-to-draw transitions. Each component is standardized across the eligible number pool before weighting.",
    formula: "score(n,t) = Σ fixed_weightⱼ × z(signalⱼ(n), history before t)",
    status: "Available",
  },
  {
    title: "Walk-forward backtesting",
    body: "The retrospective pattern lab uses only information available before each evaluated draw, compares top-five hits with the exact chance expectation, and reports a z-score and two-sided p-value.",
    formula: "train [1…t−1] → score t → advance; never train on future draws",
    status: "Available",
  },
  {
    title: "Best-pattern confirmation",
    body: "Candidate patterns are ranked on the first 60% of walk-forward trials. The selected winner is frozen and evaluated once on the untouched final 40%. Its confidence score measures historical ranking evidence, never jackpot probability.",
    formula: "discover 60% → freeze one pattern → confirm 40% → confidence ≤ 49/100",
    status: "Available",
  },
];

export function MethodologyPage() {
  return (
    <Page
      eyebrow="Statistical honesty"
      title="Methodology"
      description="Every output has a formula, source range, era, sample size, and methodology version. No experimental score is labeled an official probability."
    >
      <section className={styles.splitGrid}>
        <article className={styles.panel}>
          <h2>Measures and roadmap</h2>
          <ol className={styles.methodList}>
            {methods.map((method) => (
              <li className={styles.methodItem} key={method.title}>
                <div className={styles.methodHeading}>
                  <strong>{method.title}</strong>
                  <Badge tone={method.status === "Available" ? "success" : "warning"}>
                    {method.status}
                  </Badge>
                </div>
                <p>{method.body}</p>
                <code className={styles.formula}>{method.formula}</code>
              </li>
            ))}
          </ol>
        </article>
        <aside>
          <div className={styles.callout}>
            <strong>The independence boundary</strong>
            <p>
              In a fair lottery, each drawing is independent. Historical composition can be
              interesting and statistically testable, but it does not alter the official probability
              of a valid combination in the next drawing.
            </p>
          </div>
          <div className={`${styles.panel} ${styles.spaceTop5}`}>
            <h2>Interpretation checklist</h2>
            <ul className={styles.methodList}>
              <li className={styles.methodItem}>Confirm one compatible game era.</li>
              <li className={styles.methodItem}>Inspect coverage and source conflicts.</li>
              <li className={styles.methodItem}>Check sample size and effect size.</li>
              <li className={styles.methodItem}>Correct for multiple comparisons.</li>
              <li className={styles.methodItem}>Compare with a seeded random baseline.</li>
              <li className={styles.methodItem}>
                Report no demonstrated advantage when appropriate.
              </li>
            </ul>
          </div>
        </aside>
      </section>
    </Page>
  );
}
