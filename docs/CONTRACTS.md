# Cross-language contracts

Canonical JSON Schema lives in `packages/contracts/schemas/v1`. Contract 1.0 uses strict required fields and rejects unknown properties. TypeScript/Zod, Rust/Serde, and Python/Pydantic are adapters.

Engine messages are one complete UTF-8 JSON object per line. Standard output is machine protocol only; human diagnostics use standard error. Every envelope includes schema, message, job, and attempt identity, a monotonic sequence, occurrence time, type, and payload. Rust enforces a one-megabyte event-line ceiling, ordering, a 30-second analytical timeout, and a known fixed executable.

An unknown major version fails before work. Events are notifications; final results and artifacts must be durably registered.

Methodology 1.2 uses optional `target_draw_date` and bounded `backtest_limit` request
fields plus a required retrospective result containing winning-number evidence,
expanded ticket-shape measures, 30 signal comparisons, discovery/confirmation
performance, a best-pattern confidence rating, and the walk-forward summary. These
changes remain inside protocol schema 1.0 because the desktop and bundled engine are
released and validated as one atomic application.
