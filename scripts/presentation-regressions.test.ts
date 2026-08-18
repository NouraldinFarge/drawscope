import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { describeSnapshotFreshness } from "../site/freshness.mjs";
import { renderArchiveSummary } from "./archive-presentation.mjs";
import { documentLinksToExactUrl } from "./document-links.mjs";

const root = process.cwd();
const projectSite = "https://nouraldinfarge.github.io/drawscope/";

describe("canonical project-site links", () => {
  it.each([
    [`[Project site](${projectSite})`, true],
    [`<a href="${projectSite}">Project site</a>`, true],
    [projectSite, false],
    [`[Project site](http://nouraldinfarge.github.io/drawscope/)`, false],
    [`[Project site](${projectSite}?ref=readme)`, false],
    [`[Project site](${projectSite}#tour)`, false],
    [`[Project site](https://nouraldinfarge.github.io.evil.example/drawscope/)`, false],
    [`[Project site](https://nouraldinfarge.github.io@evil.example/drawscope/)`, false],
    [`[Project site](https://evil.example/?next=${projectSite})`, false],
  ])("validates a parsed destination without accepting lookalikes", (source, expected) => {
    expect(documentLinksToExactUrl(source, projectSite)).toBe(expected);
  });
});

describe("dated archive presentation", () => {
  const snapshot = "2026-07-28";

  it.each([
    ["2026-08-11T00:00:00Z", 14, "current", "Current · 14 days old"],
    ["2026-08-12T00:00:00Z", 15, "refresh-due", "Refresh due · 15 days old"],
    ["2026-08-27T00:00:00Z", 30, "refresh-due", "Refresh due · 30 days old"],
    ["2026-08-28T00:00:00Z", 31, "stale", "Stale · 31 days old"],
  ])("labels the %s threshold honestly", (now, ageDays, state, label) => {
    expect(describeSnapshotFreshness(snapshot, Date.parse(now))).toEqual({
      ageDays,
      state,
      label,
    });
  });

  it("rejects malformed dates instead of displaying a misleading age", () => {
    expect(() => describeSnapshotFreshness("07/28/2026")).toThrow(/Invalid archive snapshot/);
  });

  it("renders archive coverage as a narrow-screen list instead of a wide table", () => {
    const summary = renderArchiveSummary({
      snapshotDate: snapshot,
      latestDraw: snapshot,
      knownGapCount: 0,
      databaseBytesLabel: "1,024",
      databaseSha256: "a".repeat(64),
      games: [
        {
          name: "Powerball",
          firstDraw: "1992-04-22",
          lastDraw: "2026-07-27",
          drawCount: 3813,
          sessions: 1,
        },
      ],
    });

    expect(summary).toContain("**Coverage by game**");
    expect(summary).toContain("- **Powerball:** 1992-04-22 → 2026-07-27 · 3,813 draws · 1 session");
    expect(summary).not.toContain("| Game | Coverage |");
  });
});

describe("project-site accessibility contracts", () => {
  it("keeps definition-list metric content inside term and description elements", async () => {
    const source = await readFile(path.join(root, "site", "index.template.html"), "utf8");
    const page = new DOMParser().parseFromString(source, "text/html");
    const groups = [...page.querySelectorAll(".metric-grid > div")];

    expect(groups).toHaveLength(4);
    for (const group of groups) {
      expect([...group.children].map((child) => child.tagName)).toEqual(["DT", "DD"]);
      expect(group.querySelector("dd > small")?.textContent?.trim()).toBeTruthy();
    }
  });

  it("makes the horizontal archive table a labeled keyboard-focusable region", async () => {
    const source = await readFile(path.join(root, "site", "index.template.html"), "utf8");
    const page = new DOMParser().parseFromString(source, "text/html");
    const region = page.querySelector<HTMLElement>(".table-wrap");
    const labelId = region?.getAttribute("aria-labelledby");

    expect(region?.tagName).toBe("SECTION");
    expect(region?.tabIndex).toBe(0);
    expect(labelId).toBeTruthy();
    expect(page.getElementById(labelId ?? "")?.tagName).toBe("CAPTION");
  });

  it("provides a visible keyboard focus indicator for the archive table region", async () => {
    const source = await readFile(path.join(root, "site", "styles.css"), "utf8");
    expect(source).toMatch(/\.table-wrap:focus-visible\s*\{/);
  });
});
