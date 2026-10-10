// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../../../i18n";
import { setEffectPromptPosition } from "../../effectPromptPosition";
import { DecisionOverlay } from "./DecisionOverlay";
import { sourceClearPlacement } from "./useSourceClearPlacement";

describe("sourceClearPlacement", () => {
  it("caps the prompt below a source card on the viewer's field", () => {
    expect(sourceClearPlacement({ source: { top: 400, bottom: 484 }, viewportHeight: 844, topLimit: 120 })).toEqual({
      side: "below",
      top: 492,
      space: 336,
    });
  });

  it("moves the prompt above a source card that sits too low", () => {
    expect(sourceClearPlacement({ source: { top: 560, bottom: 644 }, viewportHeight: 844, topLimit: 120 })).toEqual({
      side: "above",
      top: 120,
      space: 432,
    });
  });

  it("keeps the usual placement when neither side has room for the answers", () => {
    expect(
      sourceClearPlacement({ source: { top: 300, bottom: 600 }, viewportHeight: 844, topLimit: 120 }),
    ).toBeUndefined();
  });
});

const originalWidth = window.innerWidth;
const originalHeight = window.innerHeight;
function viewport(width: number, height: number) {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: height });
}

describe("phone activation prompt", () => {
  beforeEach(() => {
    viewport(390, 844);
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query.includes("width < 768px"),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
    localStorage.setItem("aegis.locale", "en");
    setEffectPromptPosition("left");
  });
  afterEach(() => {
    cleanup();
    document.body.replaceChildren();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    viewport(originalWidth, originalHeight);
  });

  it("stays clear of the permanent whose effect asks (P-240)", async () => {
    const source = document.createElement("div");
    source.dataset.drop = "perm-you";
    source.dataset.id = "source";
    source.getBoundingClientRect = () =>
      ({ top: 400, bottom: 484, left: 150, right: 210, width: 60, height: 84 }) as DOMRect;
    document.body.append(source);
    render(
      <I18nProvider>
        <DecisionOverlay
          request={{
            decisionId: "activation",
            seat: 0,
            kind: "optional",
            promptText: "Activate this effect?",
            sourcePermanentId: "source",
          }}
          candidates={[]}
          picks={[]}
          onTogglePick={() => undefined}
          onRespond={() => undefined}
        />
      </I18nProvider>,
    );
    await act(async () => {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    });
    const panel = screen.getByRole("dialog");
    expect(panel.dataset.sourceClear).toBe("below");
    expect(panel.style.getPropertyValue("--effect-prompt-source-space")).toBe("336px");
  });
});
