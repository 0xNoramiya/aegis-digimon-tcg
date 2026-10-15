// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CardFull, CardMini } from "./cards";

afterEach(() => cleanup());

describe("CardMini orientation", () => {
  it("turns a suspended permanent sideways so the state is unambiguous", () => {
    render(<CardMini cardId="ST1-02" suspended zoomOnHover={false} />);

    const card = screen.getByTitle("Biyomon");
    expect(card.dataset.state).toBe("suspended");
    expect(card.style.rotate).toBe("90deg");
    expect(card.style.transformOrigin).toBe("center");
  });
});

// The arena uses pointer gestures even while play is gated between phases.
it.each([CardFull, CardMini])("#5394: artwork cannot start a browser-native image drag", (Card) => {
  render(<Card cardId="ST1-02" zoomOnHover={false} />);
  expect((screen.getByRole("img") as HTMLImageElement).draggable).toBe(false);
});

describe("CardMini board DP", () => {
  it("grows the DP number with the player's text size", () => {
    render(<CardMini cardId="ST1-02" width={92} dp={3000} info zoomOnHover={false} />);

    expect(screen.getByText("3K").style.fontSize).toBe("calc(10px * var(--ds-text-scale, 1))");
  });
});

it("keeps a selected face-down mini card concealed while showing the selection rim", () => {
  const { container, rerender } = render(<CardMini cardId="ST1-02" faceDown selected zoomOnHover={false} />);
  const back = container.firstElementChild;
  expect(back).toBeInstanceOf(HTMLElement);
  expect(back?.getAttribute("style")).toContain("--ds-rim-attention");
  expect(screen.queryByTitle("Biyomon")).toBeNull();
  const concealedMarkup = back!.innerHTML;
  rerender(<CardMini cardId="ST1-02" faceDown zoomOnHover={false} />);
  expect(back?.getAttribute("style")).not.toContain("--ds-rim-attention");
  expect(back!.innerHTML).toBe(concealedMarkup);
});
