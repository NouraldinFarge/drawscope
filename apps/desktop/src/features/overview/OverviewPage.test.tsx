import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { OverviewPage } from "./OverviewPage";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) => <a href="#analytics">{children}</a>,
}));

describe("overview", () => {
  it("states the non-predictive product boundary", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={client}>
        <OverviewPage />
      </QueryClientProvider>,
    );
    expect(await screen.findByText("Patterns are descriptions, not promises.")).toBeVisible();
    expect(screen.getByText(/does not make it more likely/i)).toBeVisible();
    expect(screen.getByText("41,598")).toBeVisible();
  });
});
