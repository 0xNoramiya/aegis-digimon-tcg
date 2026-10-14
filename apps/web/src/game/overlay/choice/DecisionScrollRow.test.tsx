// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/i18n/I18nProvider";
import { DecisionScrollRow } from "@/game/overlay/choice/DecisionScrollRow";

const ROW_WIDTH = 800;
const CONTENT_WIDTH = 2000;

let scrollBy: ReturnType<typeof vi.fn<(options: ScrollToOptions) => void>>;
let reducedMotion: boolean;

beforeEach(() => {
  reducedMotion = false;
  scrollBy = vi.fn<(options: ScrollToOptions) => void>();
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(ROW_WIDTH);
  vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(CONTENT_WIDTH);
  Object.defineProperty(HTMLElement.prototype, "scrollBy", { configurable: true, value: scrollBy });
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query === "(prefers-reduced-motion: reduce)" && reducedMotion,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(HTMLElement.prototype, "scrollBy");
});

function renderRow(): HTMLElement {
  const { container } = render(
    <I18nProvider>
      <DecisionScrollRow className="decision-overlay__grid decision-overlay__grid--scroll">
        <button type="button">Card</button>
      </DecisionScrollRow>
    </I18nProvider>,
  );
  return container.querySelector<HTMLElement>(".decision-overlay__grid--scroll")!;
}

function scrollRowTo(row: HTMLElement, scrollLeft: number) {
  act(() => {
    row.scrollLeft = scrollLeft;
    fireEvent.scroll(row);
  });
}

describe("DecisionScrollRow", () => {
  it("offers only the forward button at the start of the row", () => {
    renderRow();
    expect(screen.queryByRole("button", { name: "Show cards to the left" })).toBeNull();
    expect(screen.getByRole("button", { name: "Show cards to the right" })).toBeTruthy();
  });

  it("pages forward by most of the visible width with smooth scrolling", () => {
    renderRow();
    fireEvent.click(screen.getByRole("button", { name: "Show cards to the right" }));
    expect(scrollBy).toHaveBeenCalledWith({ left: ROW_WIDTH * 0.9, behavior: "smooth" });
  });

  it("pages back without animation when the viewer prefers reduced motion", () => {
    reducedMotion = true;
    const row = renderRow();
    scrollRowTo(row, 600);
    fireEvent.click(screen.getByRole("button", { name: "Show cards to the left" }));
    expect(scrollBy).toHaveBeenCalledWith({ left: -ROW_WIDTH * 0.9, behavior: "auto" });
  });

  it("hides the forward button once the row reaches its end", () => {
    const row = renderRow();
    scrollRowTo(row, CONTENT_WIDTH - ROW_WIDTH);
    expect(screen.getByRole("button", { name: "Show cards to the left" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Show cards to the right" })).toBeNull();
  });
});
