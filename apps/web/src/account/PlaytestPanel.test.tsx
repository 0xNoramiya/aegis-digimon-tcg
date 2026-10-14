// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { accountApi } from "./client";
import { PlaytestPanel } from "./PlaytestPanel";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("the playtest group panel", () => {
  it("shows membership and the date it started", async () => {
    vi.spyOn(accountApi, "playtest").mockResolvedValue({ member: true, since: Date.UTC(2026, 9, 11) });
    render(
      <I18nProvider>
        <PlaytestPanel />
      </I18nProvider>,
    );
    const toggle = await screen.findByRole("switch", { name: /Playtest group/ });
    expect(toggle.getAttribute("aria-checked")).toBe("true");
    expect(screen.getByText(/Member since/)).toBeTruthy();
  });

  it("turns membership off and reflects the server's answer", async () => {
    vi.spyOn(accountApi, "playtest").mockResolvedValue({ member: true, since: 1 });
    const set = vi.spyOn(accountApi, "setPlaytest").mockResolvedValue({ member: false, since: null });
    render(
      <I18nProvider>
        <PlaytestPanel />
      </I18nProvider>,
    );
    fireEvent.click(await screen.findByRole("switch", { name: /Playtest group/ }));
    await waitFor(() => expect(set).toHaveBeenCalledWith(false));
    await waitFor(() => expect(screen.queryByText(/Member since/)).toBeNull());
    expect(screen.getByRole("switch", { name: /Playtest group/ }).getAttribute("aria-checked")).toBe("false");
  });
});
