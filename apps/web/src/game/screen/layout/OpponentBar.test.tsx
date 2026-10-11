// @vitest-environment jsdom
import { createRef, type ComponentProps } from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../../../i18n";
import { OpponentBar, SKIP_BUTTON_HOLD_MS } from "./OpponentBar";

type Props = ComponentProps<typeof OpponentBar>;

function props(overrides: Partial<Props> = {}): Props {
  return {
    handStripRef: createRef<HTMLDivElement>(),
    opponentName: "Rival",
    opponentAvatarId: "",
    viewerSeat: "p1",
    displayedTurnSeat: "p2",
    displayedTurnCount: 3,
    phase: "main",
    memory: 0,
    eggDeckCount: 5,
    handCount: 4,
    deckCount: 30,
    trashCount: 0,
    portraitArena: false,
    narrowGameLayout: false,
    skippable: false,
    onOpenLog: () => undefined,
    onReportBug: () => undefined,
    onOpenArenaLook: () => undefined,
    onSurrender: () => undefined,
    onSkipPresentation: () => undefined,
    ...overrides,
  } as Props;
}

function renderBar(skippable: boolean) {
  const view = render(
    <I18nProvider>
      <OpponentBar {...props({ skippable })} />
    </I18nProvider>,
  );
  return {
    rerender: (next: boolean) =>
      view.rerender(
        <I18nProvider>
          <OpponentBar {...props({ skippable: next })} />
        </I18nProvider>,
      ),
  };
}

function toolbarButtonOrder() {
  return Array.from(document.querySelectorAll(".game-topbar-actions > button")).map(
    (button) => button.getAttribute("data-testid") ?? button.getAttribute("aria-label"),
  );
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

// Issue #53: the skip button came and went with each animation batch, so every
// toolbar button to its left jumped sideways while the board animated.
describe("the desktop toolbar's skip button", () => {
  it("keeps its slot when there is nothing to skip, so the other buttons never move", () => {
    const bar = renderBar(false);
    const idleOrder = toolbarButtonOrder();
    const skip = screen.getByTestId("skip-presentation");
    expect(skip).toHaveProperty("disabled", true);
    expect(skip.getAttribute("aria-hidden")).toBe("true");
    expect(skip.getAttribute("data-skippable")).toBe("false");

    bar.rerender(true);
    expect(toolbarButtonOrder()).toEqual(idleOrder);
    expect(skip.isConnected).toBe(true);
    expect(skip).toHaveProperty("disabled", false);
    expect(skip.getAttribute("data-skippable")).toBe("true");
  });

  it("stays shown across the short gap between two animation batches", () => {
    const bar = renderBar(true);
    const skip = screen.getByTestId("skip-presentation");
    bar.rerender(false);
    act(() => vi.advanceTimersByTime(SKIP_BUTTON_HOLD_MS - 50));
    expect(skip.getAttribute("data-skippable")).toBe("true");
    bar.rerender(true);
    bar.rerender(false);
    act(() => vi.advanceTimersByTime(SKIP_BUTTON_HOLD_MS - 50));
    expect(skip.getAttribute("data-skippable")).toBe("true");
    act(() => vi.advanceTimersByTime(100));
    expect(skip.getAttribute("data-skippable")).toBe("false");
    expect(screen.getByTestId("skip-presentation")).toBe(skip);
  });
});
