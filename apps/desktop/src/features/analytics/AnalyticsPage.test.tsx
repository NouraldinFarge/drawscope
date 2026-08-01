import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AnalyticsPage } from "./AnalyticsPage";

describe("retrospective pattern lab", () => {
  it("explains the no-peeking test and exposes a historical target date", () => {
    const client = new QueryClient({
      defaultOptions: { mutations: { retry: false } },
    });
    render(
      <QueryClientProvider client={client}>
        <AnalyticsPage />
      </QueryClientProvider>,
    );

    expect(screen.getByRole("heading", { name: "Retrospective pattern lab" })).toBeVisible();
    expect(screen.getByLabelText("Winning Powerball draw date")).toHaveAttribute("type", "date");
    expect(screen.getByText(/walk-forward trials/i)).toBeVisible();
    expect(screen.getByText(/thirty fixed signals/i)).toBeVisible();
    expect(screen.getByText(/untouched final 40%/i)).toBeVisible();
  });

  it("shows the bounded confidence rating and counterfactual picks", async () => {
    const client = new QueryClient({
      defaultOptions: { mutations: { retry: false } },
    });
    render(
      <QueryClientProvider client={client}>
        <AnalyticsPage />
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Test patterns" }));

    expect(await screen.findByLabelText("Best pattern confidence rating")).toBeVisible();
    expect(screen.getAllByText("No demonstrated edge").length).toBeGreaterThan(0);
    expect(screen.getByText(/not the probability of winning/i)).toBeVisible();
    expect(screen.getByText(/do not use this pattern to choose numbers/i)).toBeVisible();
  });
});
