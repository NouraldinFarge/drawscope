const DAY_IN_MILLISECONDS = 86_400_000;

function dayLabel(ageDays) {
  return `${ageDays} day${ageDays === 1 ? "" : "s"} old`;
}

export function describeSnapshotFreshness(snapshotDate, now = Date.now()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(snapshotDate)) {
    throw new Error(`Invalid archive snapshot date: ${snapshotDate}`);
  }

  const snapshotTime = Date.parse(`${snapshotDate}T00:00:00Z`);
  if (!Number.isFinite(snapshotTime)) {
    throw new Error(`Invalid archive snapshot date: ${snapshotDate}`);
  }

  const ageDays = Math.max(0, Math.floor((now - snapshotTime) / DAY_IN_MILLISECONDS));
  if (ageDays <= 14) {
    return { ageDays, state: "current", label: `Current · ${dayLabel(ageDays)}` };
  }
  if (ageDays <= 30) {
    return { ageDays, state: "refresh-due", label: `Refresh due · ${dayLabel(ageDays)}` };
  }
  return { ageDays, state: "stale", label: `Stale · ${dayLabel(ageDays)}` };
}
