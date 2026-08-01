import { useMutation } from "@tanstack/react-query";
import { type FormEvent, useRef, useState } from "react";
import { analyzePowerballTicket } from "../../shared/api/client";
import { Page } from "../../shared/components/Page";
import styles from "../../shared/styles/Features.module.css";
import { validatePowerballTicket } from "./ticketValidation";

const INPUT_IDS = ["main-1", "main-2", "main-3", "main-4", "main-5", "powerball"] as const;

export function TicketPage() {
  const [values, setValues] = useState(["", "", "", "", "", ""]);
  const [validationError, setValidationError] = useState("");
  const [invalidIndices, setInvalidIndices] = useState<number[]>([]);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const analysis = useMutation({
    mutationFn: ({
      mainNumbers,
      specialNumber,
    }: {
      mainNumbers: number[];
      specialNumber: number;
    }) => analyzePowerballTicket(mainNumbers, specialNumber),
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    const validation = validatePowerballTicket(values);
    if (!validation.valid) {
      setValidationError(validation.message);
      setInvalidIndices(validation.invalidIndices);
      analysis.reset();
      inputRefs.current[validation.invalidIndices[0]]?.focus();
      return;
    }
    setValidationError("");
    setInvalidIndices([]);
    analysis.mutate(validation.ticket);
  }

  const result = analysis.data;
  return (
    <Page
      eyebrow="Characterize, never predict"
      title="Ticket lab"
      description="Compare a valid ticket with every stored Powerball drawing in the current rule era. This does not change the ticket’s official theoretical chance."
    >
      <section className={styles.splitGrid}>
        <form
          className={`${styles.panel} ${styles.ticketForm}`}
          onSubmit={submit}
          noValidate
          aria-busy={analysis.isPending}
        >
          <div>
            <h2>Powerball ticket</h2>
            <p>Five distinct white balls and one red Powerball.</p>
          </div>
          <fieldset className={styles.ticketFieldset} disabled={analysis.isPending}>
            <legend>Ticket numbers</legend>
            <div className={styles.numberInputs}>
              {values.map((value, index) => (
                <label className={styles.field} key={INPUT_IDS[index]}>
                  <span>{index < 5 ? `White ball ${index + 1}` : "Powerball"}</span>
                  <input
                    aria-describedby={validationError ? "ticket-error" : undefined}
                    aria-invalid={invalidIndices.includes(index)}
                    autoComplete="off"
                    id={INPUT_IDS[index]}
                    inputMode="numeric"
                    max={index < 5 ? 69 : 26}
                    min="1"
                    step="1"
                    type="number"
                    value={value}
                    ref={(element) => {
                      inputRefs.current[index] = element;
                    }}
                    onChange={(event) => {
                      const next = [...values];
                      next[index] = event.target.value;
                      setValues(next);
                      setValidationError("");
                      setInvalidIndices([]);
                      analysis.reset();
                    }}
                  />
                </label>
              ))}
            </div>
          </fieldset>
          {validationError && (
            <div className={styles.error} id="ticket-error" role="alert">
              {validationError}
            </div>
          )}
          {analysis.isError && (
            <div className={styles.error} role="alert">
              The archive could not analyze this ticket. Your numbers were not saved or sent
              anywhere. Try again, then open Diagnostics if the problem continues.
            </div>
          )}
          <button className={styles.button} type="submit" disabled={analysis.isPending}>
            {analysis.isPending ? "Checking the archive…" : "Analyze ticket history"}
          </button>
        </form>
        <aside className={styles.panel}>
          <h2>Historical profile</h2>
          {!result ? (
            <p>Enter a complete ticket to compare it with the current-era archive.</p>
          ) : (
            <div className={styles.resultBox} aria-live="polite">
              <strong>{result.best_match} / 6 best match</strong>
              <p>
                At least one selected value appeared in{" "}
                {result.historical_draws_with_any.toLocaleString()} of{" "}
                {result.sample_size.toLocaleString()} drawings from {result.first_draw} through{" "}
                {result.last_draw}.
              </p>
              <span className={styles.formula}>
                Main-ball sum: {result.main_sum} · {result.odd_count} odd / {5 - result.odd_count}{" "}
                even
              </span>
              <div className={styles.callout}>
                <strong>Official chance is unchanged</strong>
                <p>
                  Every valid Powerball combination has jackpot odds of 1 in 292,201,338 in the
                  current era, regardless of this historical profile.
                </p>
              </div>
            </div>
          )}
        </aside>
      </section>
    </Page>
  );
}
