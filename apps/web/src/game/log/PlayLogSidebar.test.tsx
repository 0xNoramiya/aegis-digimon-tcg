import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Phase } from "@aegis/shared/schema/enums";
import { I18nProvider } from "@/i18n/I18nProvider";
import { PlayLogSidebar } from "@/game/log/PlayLogSidebar";
import type { LogTurnGroup } from "@/game/log/LogEntry";

const turns: LogTurnGroup[] = [
  {
    turnCount: 1,
    turnSeat: 0,
    phases: [
      {
        phase: Phase.Main,
        entries: [
          { id: "1", text: "Match started", kind: "sys", turnCount: 1, turnSeat: 0, phase: Phase.Main },
          {
            id: "2",
            text: "Alice played Agumon",
            kind: "you",
            cardIds: ["ST1-03"],
            memory: { delta: -3, after: -1 },
            turnCount: 1,
            turnSeat: 0,
            phase: Phase.Main,
          },
        ],
      },
    ],
  },
];

afterEach(() => cleanup());

function renderPanel(onClose = vi.fn<() => void>()) {
  return render(
    <I18nProvider>
      <PlayLogSidebar
        turns={turns}
        playerNames={{ 0: "Alice", 1: "Bob" }}
        viewerSeat={0}
        onClose={onClose}
        onOpenCard={vi.fn<() => void>()}
      />
    </I18nProvider>,
  );
}

describe("searchable chronological play log", () => {
  it("shows named turn and phase headings and signed memory chips", () => {
    renderPanel();
    expect(screen.getByRole("heading", { name: "Turn 1 · Alice" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Main Phase" })).toBeTruthy();
    expect(screen.getByText("-3 Memory")).toBeTruthy();
    expect(screen.getByText("Memory: -1")).toBeTruthy();
  });

  it("filters and highlights matching card names", () => {
    renderPanel();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "agumon" } });
    expect(screen.queryByText("Match started")).toBeNull();
    expect(screen.getByText("Agumon").tagName).toBe("MARK");
    expect(screen.getByText("1 matches")).toBeTruthy();
  });

  it("clears search on the first Escape and closes on the second", () => {
    const close = vi.fn<() => void>();
    renderPanel(close);
    const input = screen.getByRole("searchbox");
    fireEvent.change(input, { target: { value: "agumon" } });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(close).not.toHaveBeenCalled();
    expect(screen.getByText("Match started")).toBeTruthy();
    fireEvent.keyDown(input, { key: "Escape" });
    expect(close).toHaveBeenCalledOnce();
  });

  it("distinguishes no matches from an empty history", () => {
    renderPanel();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "absent" } });
    expect(screen.getByText("No matching actions")).toBeTruthy();
  });

  it("focuses the search field on a fine pointer after the dialog opens", async () => {
    const spy = vi.spyOn(window, "matchMedia");
    const media = window.matchMedia("(hover: hover) and (pointer: fine)");
    spy.mockReturnValue({ ...media, matches: true });
    renderPanel();
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("searchbox")));
    spy.mockRestore();
  });
});
