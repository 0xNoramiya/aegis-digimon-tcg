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
  it("scales the DP total twice as steeply as ordinary text", () => {
    render(<CardMini cardId="ST1-02" width={92} dp={3000} info zoomOnHover={false} />);

    expect(screen.getByText("3K").style.fontSize).toBe("calc(13px * calc(1 + (var(--ds-text-scale, 1) - 1) * 2))");
  });
});

it.each([
  [1000, "+1K", "up"],
  [-1000, "−1K", "down"],
])("glues delta %s to the total with its direction", (delta, label, direction) => {
  render(<CardMini cardId="ST1-02" width={116} dp={4000} dpDelta={Number(delta)} info zoomOnHover={false} />);
  const bonus = screen.getByText(String(label));
  expect(bonus.dataset.dp).toBe(direction);
  expect(bonus.parentElement?.textContent).toBe(`4K${label}`);
  expect(bonus.closest("[data-dp-layout]")?.getAttribute("data-dp-layout")).toBe("stacked");
});

it.each([undefined, 0])("shows only the total for unchanged DP %s on wide cards", (delta) => {
  const { container } = render(
    <CardMini cardId="ST1-02" width={116} dp={4000} dpDelta={delta} info zoomOnHover={false} />,
  );
  expect(screen.getByText("4K")).toBeTruthy();
  expect(container.querySelector("[data-dp]")).toBeNull();
  expect(container.querySelector("[data-dp-layout]")).toBeNull();
});

it("stacks compact live DP but preserves link card geometry", () => {
  const view = render(<CardMini cardId="ST1-02" width={76} dp={4000} info zoomOnHover={false} />);
  expect(view.container.querySelector('[data-dp-layout="stacked"]')).toBeTruthy();
  view.rerender(<CardMini cardId="ST1-02" width={76} info zoomOnHover={false} />);
  expect(view.container.querySelector("[data-dp-layout]")).toBeNull();
});

it("lets the caller wrap the bonus", () => {
  render(
    <CardMini
      cardId="ST1-02"
      dp={4000}
      dpDelta={1000}
      info
      zoomOnHover={false}
      renderDpDelta={(node) => <span title="DP explanation">{node}</span>}
    />,
  );
  expect(screen.getByTitle("DP explanation").textContent).toBe("+1K");
});

it("caps non-round DP so the total and bonus fit the card", () => {
  render(<CardMini cardId="ST1-02" width={116} dp={12500} dpDelta={500} info zoomOnHover={false} />);
  expect(screen.getByText((12500).toLocaleString()).style.fontSize).toMatch(/^min\(calc\(16px/);
  expect(screen.getByText("+500").parentElement?.textContent).toBe(`${(12500).toLocaleString()}+500`);
});
