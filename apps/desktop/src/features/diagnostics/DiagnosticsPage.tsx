import type { AppSnapshot } from "@drawscope/contracts";
import { Badge, Page } from "../../shared/components/Page";
import { useSnapshot } from "../../shared/api/queries";
import styles from "../../shared/styles/Features.module.css";

export function DiagnosticsPage() {
  const snapshot = useSnapshot();

  return (
    <Page
      eyebrow="Explain every boundary"
      title="Diagnostics"
      description="Version, schema, archive identity, engine, and storage checks provide actionable evidence without exposing secrets or unrestricted system details."
    >
      {snapshot.isPending && (
        <div className={styles.loading} role="status">
          Running local diagnostic checks…
        </div>
      )}
      {snapshot.isError && (
        <div className={styles.error} role="alert">
          DrawScope could not complete its local diagnostic checks.
          <button className={styles.inlineButton} type="button" onClick={() => snapshot.refetch()}>
            Try again
          </button>
        </div>
      )}
      {snapshot.data && <DiagnosticResults data={snapshot.data} />}
    </Page>
  );
}

function DiagnosticResults({ data }: { data: AppSnapshot }) {
  const checks = [
    ["Portable database", data.database_path, "healthy"],
    ["SQLite startup check", data.database_status, "healthy"],
    ["Stored drawings", data.dataset.draw_count.toLocaleString(), "healthy"],
    ["Database migrations", `${data.rule_era_count} modeled rule eras`, "healthy"],
    ["Contract", data.schema_version, "healthy"],
    ["Methodology", data.methodology_version, "healthy"],
    ["Archive built", data.archive.built_at, "healthy"],
    ["Archive fingerprint", `${data.archive.seed_sha256.slice(0, 16)}…`, "healthy"],
    ["Analytics sidecar", "Validated when an analysis is run", "healthy"],
    ["Live Lottery.net access", "Disabled by source policy", "healthy"],
  ] as const;

  return (
    <>
      <article className={styles.panel}>
        <header className={styles.panelHeader}>
          <div>
            <h2>Local health</h2>
            <p>Application version {data.app_version}</p>
          </div>
          <Badge tone="success">All startup checks passed</Badge>
        </header>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <caption className={styles.visuallyHidden}>DrawScope local diagnostic checks</caption>
            <thead>
              <tr>
                <th scope="col">Check</th>
                <th scope="col">Observed value</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {checks.map(([label, value, status]) => (
                <tr key={label}>
                  <td>{label}</td>
                  <td className={styles.mono}>{value}</td>
                  <td>
                    <Badge tone="success">{status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
      <div className={`${styles.callout} ${styles.spaceTop5}`}>
        <strong>Privacy boundary</strong>
        <p>
          DrawScope has no cloud account, advertising identifier, telemetry endpoint, ticket
          purchase flow, or unrestricted file access. Saved-page imports are limited to the portable
          imports folder.
        </p>
      </div>
    </>
  );
}
