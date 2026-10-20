import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { keywordDrills } from "@aegis/shared/tutorial/keywordDrills";
import type { TutorialLesson } from "@aegis/shared/tutorial/TutorialLesson";
import { I18nProvider } from "@/i18n/I18nProvider";
import { KeywordList } from "@/learn/rules/KeywordList";

afterEach(() => cleanup());

describe("the keyword list", () => {
  it("offers a drill for every keyword that has one", () => {
    const onTryDrill = vi.fn<(drill: TutorialLesson) => void>();
    render(
      <I18nProvider>
        <KeywordList onTryDrill={onTryDrill} />
      </I18nProvider>,
    );
    expect(screen.getAllByRole("button", { name: /^Try a drill for/ })).toHaveLength(keywordDrills.length);
    fireEvent.click(screen.getByRole("button", { name: "Try a drill for <Blocker>" }));
    expect(onTryDrill).toHaveBeenCalledWith(keywordDrills.find((drill) => drill.keyword === "Blocker"));
  });

  it("filters keywords by name or reminder text", () => {
    render(
      <I18nProvider>
        <KeywordList onTryDrill={() => {}} />
      </I18nProvider>,
    );
    fireEvent.change(screen.getByLabelText("Filter keywords"), { target: { value: "jamming" } });
    expect(screen.getByText("<Jamming>")).toBeTruthy();
    expect(screen.queryByText("<Blocker>")).toBeNull();
  });

  it("starts a real guided match for a previously missing keyword", () => {
    const onTryDrill = vi.fn<(drill: TutorialLesson) => void>();
    render(
      <I18nProvider>
        <KeywordList onTryDrill={onTryDrill} />
      </I18nProvider>,
    );
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "16-47" } });
    const entry = screen.getByText("<Succession>").closest("div")!;
    expect(within(entry).getByRole("link", { name: "Rule 16-47" }).getAttribute("href")).toBe(
      "https://world.digimoncard.com/rule/pdf/general_rule.pdf#page=35",
    );
    fireEvent.click(within(entry).getByRole("button", { name: "Try a drill for <Succession>" }));
    expect(onTryDrill).toHaveBeenCalledWith(keywordDrills.find((drill) => drill.keyword === "Succession"));
  });
});
