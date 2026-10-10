// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, expect, it } from "vitest";
import { I18nProvider } from "../../../i18n";
import { DecisionOverlay } from "./DecisionOverlay";

beforeEach(() => localStorage.setItem("aegis.locale", "en"));
afterEach(() => {
  cleanup();
  document.body.replaceChildren();
});

it("cuts the phone notice band out of a pending activation's backdrop, so a tap reaches it", async () => {
  const band = document.createElement("div");
  band.className = "narration-slot";
  band.dataset.slot = "narration";
  band.getBoundingClientRect = () => ({ left: 8, top: 48, right: 382, bottom: 112, width: 374, height: 64 }) as DOMRect;
  document.body.append(band);
  render(
    <I18nProvider>
      <DecisionOverlay
        request={{ decisionId: "activation", seat: 0, kind: "optional", promptText: "Activate this effect?" }}
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
  const backdrop = document.querySelector<HTMLElement>(".decision-overlay-backdrop")!;
  expect(backdrop.style.clipPath).toContain("8px 48px, 382px 48px, 382px 112px, 8px 112px");
});
