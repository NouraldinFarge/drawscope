import type { ReactNode } from "react";
import styles from "./Page.module.css";

export function Page({
  eyebrow,
  title,
  description,
  actions,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>{eyebrow}</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </header>
      {children}
    </div>
  );
}

export function Stat({
  label,
  value,
  note,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  note: string;
  tone?: "neutral" | "blue" | "mint" | "amber";
}) {
  return (
    <article className={styles.stat} data-tone={tone}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

export function Ball({ children, special = false }: { children: ReactNode; special?: boolean }) {
  return (
    <span className={styles.ball} data-special={special || undefined}>
      {children}
    </span>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "info";
}) {
  return (
    <span className={styles.badge} data-tone={tone}>
      {children}
    </span>
  );
}
