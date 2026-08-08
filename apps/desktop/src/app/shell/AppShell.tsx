import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { applyTheme, getInitialTheme, type Theme } from "../../shared/theme";
import styles from "./AppShell.module.css";

const navigation = [
  { to: "/", label: "Overview", icon: "⌂" },
  { to: "/games", label: "Game eras", icon: "◫" },
  { to: "/explorer", label: "Draw explorer", icon: "⌕" },
  { to: "/analytics", label: "Analytics", icon: "⌁" },
  { to: "/ticket", label: "Ticket lab", icon: "◇" },
  { to: "/updates", label: "Data updates", icon: "↻" },
  { to: "/data-quality", label: "Data quality", icon: "✓" },
  { to: "/methodology", label: "Methodology", icon: "∑" },
  { to: "/diagnostics", label: "Diagnostics", icon: "⚙" },
] as const;

export function AppShell() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [navigationOpen, setNavigationOpen] = useState(false);
  const navigationButtonRef = useRef<HTMLButtonElement>(null);
  const closeNavigationButtonRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const firstRoute = useRef(true);
  const routeHref = useRouterState({ select: (state) => state.location.href });
  const closeNavigation = useCallback(() => {
    setNavigationOpen(false);
    requestAnimationFrame(() => navigationButtonRef.current?.focus());
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (!routeHref) {
      return;
    }
    if (firstRoute.current) {
      firstRoute.current = false;
      return;
    }
    mainRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [routeHref]);

  useEffect(() => {
    if (!navigationOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFrame = requestAnimationFrame(() => closeNavigationButtonRef.current?.focus());
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeNavigation();
        return;
      }
      if (event.key === "Tab") {
        const focusable = sidebarRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [closeNavigation, navigationOpen]);

  return (
    <div className={styles.app}>
      <a className={styles.skipLink} href="#main-content">
        Skip to content
      </a>
      <header
        className={styles.mobileHeader}
        aria-hidden={navigationOpen || undefined}
        inert={navigationOpen}
      >
        <button
          ref={navigationButtonRef}
          className={styles.iconButton}
          type="button"
          aria-label={navigationOpen ? "Close navigation" : "Open navigation"}
          aria-controls="primary-navigation"
          aria-expanded={navigationOpen}
          onClick={() => setNavigationOpen((open) => !open)}
        >
          ☰
        </button>
        <Brand compact />
        <ThemeButton theme={theme} setTheme={setTheme} />
      </header>
      {navigationOpen && (
        <button
          className={styles.scrim}
          type="button"
          tabIndex={-1}
          aria-label="Close navigation"
          onClick={closeNavigation}
        />
      )}
      <aside
        ref={sidebarRef}
        className={styles.sidebar}
        data-open={navigationOpen || undefined}
        aria-label="Application navigation"
      >
        <div className={styles.drawerHeader}>
          <Brand />
          <button
            ref={closeNavigationButtonRef}
            className={`${styles.iconButton} ${styles.closeNavigation}`}
            type="button"
            aria-label="Close navigation"
            onClick={closeNavigation}
          >
            ×
          </button>
        </div>
        <nav id="primary-navigation" aria-label="Primary" className={styles.navigation}>
          {navigation.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              activeProps={{ className: styles.active }}
              onClick={() => setNavigationOpen(false)}
            >
              <span className={styles.navIcon} aria-hidden="true">
                {item.icon}
              </span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className={styles.sidebarFooter}>
          <div className={styles.statusDot} aria-hidden="true" />
          <div>
            <strong>Local workspace</strong>
            <span>No cloud account</span>
          </div>
          <ThemeButton theme={theme} setTheme={setTheme} />
        </div>
      </aside>
      <main
        ref={mainRef}
        id="main-content"
        className={styles.main}
        tabIndex={-1}
        aria-hidden={navigationOpen || undefined}
        inert={navigationOpen}
      >
        <Outlet />
      </main>
      <footer
        className={styles.responsible}
        aria-hidden={navigationOpen || undefined}
        inert={navigationOpen}
      >
        <strong>18+ · For entertainment and research.</strong> Every fair-draw combination has equal
        theoretical probability. Never spend more than you can afford to lose.
      </footer>
    </div>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? styles.brandCompact : styles.brand}>
      <div className={styles.mark} aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div>
        <strong>DrawScope</strong>
        {!compact && <span>Evidence, not intuition.</span>}
      </div>
    </div>
  );
}

function ThemeButton({ theme, setTheme }: { theme: Theme; setTheme(theme: Theme): void }) {
  return (
    <button
      className={styles.iconButton}
      type="button"
      aria-label={`Use ${theme === "light" ? "dark" : "light"} theme`}
      title={`Use ${theme === "light" ? "dark" : "light"} theme`}
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
    >
      {theme === "light" ? "☾" : "☀"}
    </button>
  );
}
