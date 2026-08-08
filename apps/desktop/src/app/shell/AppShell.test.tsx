import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { AppShell } from "./AppShell";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) => <a href="/#test">{children}</a>,
  Outlet: () => <div>Route content</div>,
  useRouterState: () => "/",
}));

describe("application shell", () => {
  it("moves focus into the navigation drawer and restores it on Escape", async () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: true })),
    );
    render(<AppShell />);
    const opener = screen.getByRole("button", { name: "Open navigation" });

    fireEvent.click(opener);
    const closer = screen.getAllByRole("button", { name: "Close navigation" }).at(-1);
    expect(closer).toBeDefined();
    if (!closer) throw new Error("Navigation close button is missing");
    await waitFor(() => expect(closer).toHaveFocus());
    expect(document.querySelector("main")).toHaveAttribute("inert");

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(opener).toHaveFocus());
    expect(document.querySelector("main")).not.toHaveAttribute("inert");
  });
});
