export type Theme = "light" | "dark";

export function getInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem("drawscope-theme");
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // Storage may be unavailable in a restricted webview.
  }
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem("drawscope-theme", theme);
  } catch {
    // Persistence is optional; the in-memory selection remains active.
  }
}
