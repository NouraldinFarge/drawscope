import {
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { AnalyticsPage } from "../features/analytics/AnalyticsPage";
import { DataQualityPage } from "../features/data-quality/DataQualityPage";
import { DiagnosticsPage } from "../features/diagnostics/DiagnosticsPage";
import { ExplorerPage } from "../features/explorer/ExplorerPage";
import { GamesPage } from "../features/games/GamesPage";
import { MethodologyPage } from "../features/methodology/MethodologyPage";
import { OverviewPage } from "../features/overview/OverviewPage";
import { TicketPage } from "../features/ticket/TicketPage";
import { DataUpdatesPage } from "../features/updates/DataUpdatesPage";
import { AppShell } from "./shell/AppShell";

const rootRoute = createRootRoute({ component: AppShell });
const overviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: OverviewPage,
});
const gamesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/games",
  component: GamesPage,
});
const explorerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/explorer",
  component: ExplorerPage,
});
const analyticsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/analytics",
  component: AnalyticsPage,
});
const ticketRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/ticket",
  component: TicketPage,
});
const qualityRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/data-quality",
  component: DataQualityPage,
});
const updatesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/updates",
  component: DataUpdatesPage,
});
const methodologyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/methodology",
  component: MethodologyPage,
});
const diagnosticsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/diagnostics",
  component: DiagnosticsPage,
});

const routeTree = rootRoute.addChildren([
  overviewRoute,
  gamesRoute,
  explorerRoute,
  analyticsRoute,
  ticketRoute,
  updatesRoute,
  qualityRoute,
  methodologyRoute,
  diagnosticsRoute,
]);

export const router = createRouter({
  routeTree,
  history: createHashHistory(),
  defaultPreload: "intent",
  defaultPendingMs: 120,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
