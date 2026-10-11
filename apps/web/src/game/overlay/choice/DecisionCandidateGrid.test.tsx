// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { I18nProvider, translator, type Locale } from "../../../i18n";
import { DecisionCandidateGrid } from "./DecisionCandidateGrid";
import type { DecisionCandidate } from "./decisionTypes";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

function grid(candidates: DecisionCandidate[]) {
  const pick = vi.fn<(instanceId: string) => void>();
  render(
    <I18nProvider>
      <DecisionCandidateGrid
        candidates={candidates}
        picks={[]}
        min={0}
        max={1}
        selectedPlayCost={0}
        withinPlayCostBudget
        selectedDP={0}
        wideDialog={false}
        onTogglePick={pick}
      />
    </I18nProvider>,
  );
  return pick;
}

it.each(["en", "pt-BR", "es", "it"] as Locale[])(
  "shows localized visible copy labels and exact pending-source badge (%s)",
  (locale) => {
    localStorage.setItem("aegis:locale", locale);
    const pick = grid([
      { instanceId: "old", cardId: "EX7-071", zone: "trash" },
      { instanceId: "new", cardId: "EX7-071", zone: "trash", pendingEffect: true },
    ]);
    const t = translator(locale);
    const old = screen.getByRole("button", { name: /copy 1|cópia 1|copia 1/ });
    const pending = screen.getByRole("button", { name: /copy 2|cópia 2|copia 2/ });
    expect(within(old).getByText(t("overlay.cardCopy", { index: 1, total: 2 }))).toBeTruthy();
    expect(within(pending).getByText(t("overlay.cardCopy", { index: 2, total: 2 }))).toBeTruthy();
    expect(within(old).queryByText(t("overlay.pendingEffect"))).toBeNull();
    expect(within(pending).getByText(t("overlay.pendingEffect"))).toBeTruthy();
    fireEvent.click(old);
    fireEvent.click(pending);
    expect(pick.mock.calls).toEqual([["old"], ["new"]]);
  },
);

it("does not show a pending badge for concealed identities or cards outside trash", () => {
  grid([
    { instanceId: "blind", zone: "trash", pendingEffect: true },
    { instanceId: "hand", cardId: "EX7-071", zone: "hand", pendingEffect: true },
  ]);
  expect(screen.queryByText("Pending effect")).toBeNull();
});
