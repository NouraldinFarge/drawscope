import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

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
