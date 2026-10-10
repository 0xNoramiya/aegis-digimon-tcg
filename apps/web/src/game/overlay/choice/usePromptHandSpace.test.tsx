// @vitest-environment jsdom
import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { usePromptHandSpace } from "./usePromptHandSpace";

beforeEach(() => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: true,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
  vi.stubGlobal("innerHeight", 1000);
});

afterEach(() => {
  cleanup();
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

function mountHand(cardClass: string) {
  const dock = document.createElement("div");
  dock.className = "game-hand-dock";
  const hand = document.createElement("div");
  hand.className = "game-hand game-hand--selecting";
  const card = document.createElement("div");
  card.className = `game-hand-card ${cardClass}`;
  dock.getBoundingClientRect = () => ({ top: 868, height: 132, width: 374 }) as DOMRect;
  card.getBoundingClientRect = () => ({ top: 868, height: 132, width: 64 }) as DOMRect;
  hand.append(card);
  dock.append(hand);
  const panel = document.createElement("section");
  document.body.append(dock, panel);
  return panel;
}

function clearance(panel: HTMLElement) {
  return panel.style.getPropertyValue("--mobile-prompt-hand-clearance");
}

it("reserves the hand while its cards can answer the decision", () => {
  const panel = mountHand("game-hand-card--pickable");
  renderHook(() => usePromptHandSpace({ current: panel }));
  expect(clearance(panel)).toBe("132px");
});

it("keeps reserving the hand for a card already picked", () => {
  const panel = mountHand("game-hand-card--picked");
  renderHook(() => usePromptHandSpace({ current: panel }));
  expect(clearance(panel)).toBe("132px");
});

it("does not reserve a locked hand that offers no card, so a field prompt can drop below the field (#5166)", () => {
  const panel = mountHand("game-hand-card--unpickable");
  renderHook(() => usePromptHandSpace({ current: panel }));
  expect(clearance(panel)).toBe("0px");
});

it("keeps a locked hand visible when the prompt asks for it (Counter window)", () => {
  const panel = mountHand("game-hand-card--unpickable");
  renderHook(() => usePromptHandSpace({ current: panel }, true, "keepVisible"));
  expect(clearance(panel)).toBe("132px");
});
