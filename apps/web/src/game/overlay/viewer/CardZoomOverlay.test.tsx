// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { I18nProvider } from "@/i18n";
import { CardZoomOverlay } from "./CardZoomOverlay";

const printedEffect = "Reveal 5 cards from the top of your deck";

function renderZoom(cardId = "BT1-010") {
  render(
    <I18nProvider>
      <CardZoomOverlay cardId={cardId} onClose={() => undefined} />
    </I18nProvider>,
  );
  return screen.getByRole("dialog");
}

function cardWidth(dialog: HTMLElement): number {
  return Number.parseInt((dialog.firstElementChild as HTMLElement).style.width, 10);
}

function hideTextIfShown(dialog: HTMLElement) {
  const hide = within(dialog).queryByRole("button", { name: "Hide card text" });
  if (hide) fireEvent.click(hide);
}

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("CardZoomOverlay printed text", () => {
  it("hides the written text by default and gives the card the freed space", () => {
    const dialog = renderZoom();
    const largeWidth = cardWidth(dialog);

    expect(dialog.textContent).not.toContain(printedEffect);
    expect(dialog.getAttribute("data-printed-text")).toBe("hidden");

    fireEvent.click(within(dialog).getByRole("button", { name: "Show card text" }));

    expect(dialog.textContent).toContain(printedEffect);
    expect(dialog.getAttribute("data-printed-text")).toBe("shown");
    expect(within(dialog).getByRole("button", { name: "Hide card text" }).getAttribute("aria-pressed")).toBe("true");
    expect(cardWidth(dialog)).toBeLessThan(largeWidth);
  });

  it("remembers the choice for the next card", () => {
    const first = renderZoom();
    hideTextIfShown(first);
    fireEvent.click(within(first).getByRole("button", { name: "Show card text" }));
    expect(localStorage.getItem("aegis.card-zoom-printed-text")).toBe("shown");
    cleanup();

    const next = renderZoom();

    expect(next.textContent).toContain(printedEffect);
    fireEvent.click(within(next).getByRole("button", { name: "Hide card text" }));
    expect(localStorage.getItem("aegis.card-zoom-printed-text")).toBe("hidden");
  });
});
