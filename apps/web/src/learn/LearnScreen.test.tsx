import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { tutorialLessons } from "@aegis/shared/tutorial/tutorialLessons";
import { I18nProvider } from "@/i18n/I18nProvider";
import { LearnScreen } from "@/learn/LearnScreen";
import { RulesScreen } from "@/learn/rules/RulesScreen";
import { getRulesGuideChapters } from "@/learn/rules/getRulesGuideChapters";

const progress = vi.hoisted(() => ({ completed: [] as string[] }));

vi.mock("@/account/client", () => ({
  request: vi.fn<() => Promise<{ completed: string[] }>>(async () => ({ completed: progress.completed })),
}));

function renderLearn() {
  const props = {
    signedIn: false,
    onSignIn: vi.fn<() => void>(),
    onStartLesson: vi.fn<(lessonId: string) => void>(),
    onOpenRules: vi.fn<(chapterId?: string) => void>(),
  };
  render(
    <I18nProvider>
      <LearnScreen {...props} />
    </I18nProvider>,
  );
  return props;
}

afterEach(() => {
  cleanup();
  progress.completed = [];
  window.history.replaceState(null, "", "/");
});

describe("the learn screen", () => {
  it("locks later lessons until the first one is done", async () => {
    renderLearn();
    const firstSteps = await screen.findByRole("region", { name: "First steps" });
    const rows = within(firstSteps).getAllByRole("listitem", { name: /./ });
    expect(rows).toHaveLength(2);
    expect(within(rows[0]!).getByText("Next")).toBeTruthy();
    expect(within(rows[1]!).getByText("Locked")).toBeTruthy();
    expect(within(rows[1]!).getByRole("button", { name: "Start" }).hasAttribute("disabled")).toBe(true);
  });

  it("starts the next unfinished lesson from the briefing", async () => {
    progress.completed = [tutorialLessons[0]!.id];
    const props = renderLearn();
    fireEvent.click(await screen.findByRole("button", { name: "Start lesson 2" }));
    const briefing = screen.getByRole("dialog");
    expect(within(briefing).getByText("Lesson 2 of 6")).toBeTruthy();
    fireEvent.click(within(briefing).getByRole("button", { name: "Start lesson" }));
    expect(props.onStartLesson).toHaveBeenCalledWith(tutorialLessons[1]!.id);
  });

  it("opens a guide chapter", async () => {
    const props = renderLearn();
    const guide = await screen.findByRole("region", { name: "How to Play" });
    fireEvent.click(within(guide).getByRole("link", { name: /memory/i }));
    expect(props.onOpenRules).toHaveBeenCalledWith("memory");
  });

  it("starts an unrestricted rules battle and links its official rules from Lessons", async () => {
    const props = renderLearn();
    const section = await screen.findByRole("region", { name: "Rules in practice" });
    const battle = within(section).getByRole("listitem", { name: /zero DP/i });
    const reference = within(battle).getByRole("link", { name: "Rule 17-1-3-1-1" });
    expect(reference.getAttribute("href")).toBe("https://world.digimoncard.com/rule/pdf/general_rule.pdf#page=42");
    fireEvent.click(within(battle).getByRole("link", { name: "Read the guide explanation" }));
    expect(props.onOpenRules).toHaveBeenCalledWith("checks");
    fireEvent.click(within(battle).getByRole("button", { name: "Start" }));
    const briefing = screen.getByRole("dialog");
    expect(within(briefing).getByRole("link", { name: "Rule 17-1-3-1-1" })).toBeTruthy();
    fireEvent.click(within(briefing).getByRole("button", { name: "Start lesson" }));
    expect(props.onStartLesson).toHaveBeenCalledWith("practice-rule-checks");
  });

  it("opens a new keyword battle from its topic subsection", async () => {
    const props = renderLearn();
    const section = await screen.findByRole("region", { name: "Digivolution and resources" });
    const battle = within(section).getByRole("listitem", { name: /Digisorption/ });
    fireEvent.click(within(battle).getByRole("button", { name: "Start" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Start lesson" }));
    expect(props.onStartLesson).toHaveBeenCalledWith("drill-digisorption");
  });
});

describe("the detailed rules page", () => {
  it("shows one chapter at a time and keeps keyword battles connected", async () => {
    const onStartLesson = vi.fn<(lessonId: string) => void>();
    render(
      <I18nProvider>
        <RulesScreen signedIn={false} onBack={() => {}} onStartLesson={onStartLesson} />
      </I18nProvider>,
    );
    HTMLElement.prototype.scrollIntoView = vi.fn<() => void>();
    expect(document.getElementById("chapter-goal")).toBeTruthy();
    expect(document.getElementById("chapter-keywords")).toBeNull();
    expect(screen.getByText("Chapter 1 of 21")).toBeTruthy();
    fireEvent.click(
      within(screen.getByRole("navigation", { name: "Contents" })).getByRole("link", { name: /Keyword effects/ }),
    );
    const keywordsChapter = document.getElementById("chapter-keywords")!;
    expect(document.activeElement).toBe(keywordsChapter);
    expect(window.location.hash).toBe("#chapter-keywords");
    expect(document.getElementById("chapter-goal")).toBeNull();
    expect(
      within(screen.getByRole("navigation", { name: "Contents" })).getByRole("link", { current: "page" }).textContent,
    ).toContain("Keyword effects");
    fireEvent.click(await screen.findByRole("button", { name: "Try a drill for <Blocker>" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Start lesson" }));
    expect(onStartLesson).toHaveBeenCalledWith("drill-blocker");
  });

  it("filters the grouped contents by printed rule number and follows chapter history", () => {
    HTMLElement.prototype.scrollIntoView = vi.fn<() => void>();
    render(
      <I18nProvider>
        <RulesScreen signedIn={false} onBack={() => {}} onStartLesson={() => {}} />
      </I18nProvider>,
    );
    const contents = screen.getByRole("navigation", { name: "Contents" });
    fireEvent.change(within(contents).getByRole("searchbox"), { target: { value: "15-4-5" } });
    const effects = getRulesGuideChapters("en").find((chapter) => chapter.id === "effects")!;
    fireEvent.click(within(contents).getByRole("link", { name: new RegExp(effects.title) }));
    expect(document.getElementById("chapter-effects")).toBe(document.activeElement);
    expect(document.getElementById("chapter-goal")).toBeNull();
    expect(
      within(contents)
        .getAllByRole("link")
        .filter((link) => link.getAttribute("href")?.startsWith("#chapter-")),
    ).toHaveLength(1);
    window.history.replaceState(null, "", "#chapter-memory");
    fireEvent.popState(window);
    expect(document.getElementById("chapter-memory")).toBe(document.activeElement);
    expect(screen.getByText("Chapter 9 of 21")).toBeTruthy();
  });

  it("opens a linked topic directly and controls the mobile contents panel", () => {
    HTMLElement.prototype.scrollIntoView = vi.fn<() => void>();
    window.history.replaceState(null, "", "#rule-effects-derived-triggers");
    render(
      <I18nProvider>
        <RulesScreen signedIn={false} onBack={() => {}} onStartLesson={() => {}} />
      </I18nProvider>,
    );
    expect(document.getElementById("rule-effects-derived-triggers")).toBe(document.activeElement);
    expect(document.getElementById("chapter-effects")).toBeTruthy();
    const toggle = screen.getByRole("button", { name: /Contents/ });
    expect(toggle.getAttribute("aria-controls")).toBe("rules-contents-panel");
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "no-such-rule" } });
    expect(screen.getByRole("status").textContent).toBe("No chapters match this search.");
  });

  it("opens a complex effects battle directly from its rules chapter", () => {
    HTMLElement.prototype.scrollIntoView = vi.fn<() => void>();
    window.history.replaceState(null, "", "#chapter-effects");
    const onStartLesson = vi.fn<(lessonId: string) => void>();
    render(
      <I18nProvider>
        <RulesScreen signedIn={false} onBack={() => {}} onStartLesson={onStartLesson} />
      </I18nProvider>,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Play battle: Derived triggers: a new window inside an old queue" }),
    );
    const briefing = screen.getByRole("dialog");
    expect(within(briefing).getByRole("link", { name: "Rule 15-4-5" }).getAttribute("href")).toBe(
      "https://world.digimoncard.com/rule/pdf/general_rule.pdf#page=24",
    );
    fireEvent.click(within(briefing).getByRole("button", { name: "Start lesson" }));
    expect(onStartLesson).toHaveBeenCalledWith("practice-derived-trash-triggers");
  });

  it("restores the introduction when returning to a URL without a chapter", () => {
    HTMLElement.prototype.scrollIntoView = vi.fn<() => void>();
    window.history.replaceState(null, "", "#chapter-effects");
    render(
      <I18nProvider>
        <RulesScreen signedIn={false} onBack={() => {}} onStartLesson={() => {}} />
      </I18nProvider>,
    );
    window.history.replaceState(null, "", "/learn/rules");
    fireEvent.popState(window);
    expect(document.getElementById("rules-guide-start")).toBe(document.activeElement);
    expect(document.getElementById("chapter-goal")).toBeTruthy();
  });

  it("closes the contents before refocusing the current chapter without duplicating history", () => {
    HTMLElement.prototype.scrollIntoView = vi.fn<() => void>();
    window.history.replaceState(null, "", "#chapter-goal");
    render(
      <I18nProvider>
        <RulesScreen signedIn={false} onBack={() => {}} onStartLesson={() => {}} />
      </I18nProvider>,
    );
    const toggle = screen.getByRole("button", { name: /Contents/ });
    fireEvent.click(toggle);
    const states: (string | null)[] = [];
    HTMLElement.prototype.scrollIntoView = vi.fn<() => void>(() => {
      states.push(toggle.getAttribute("aria-expanded"));
    });
    const historyLength = window.history.length;
    fireEvent.click(
      within(screen.getByRole("navigation", { name: "Contents" })).getByRole("link", { current: "page" }),
    );
    expect(states).toEqual(["false"]);
    expect(window.history.length).toBe(historyLength);
    expect(document.activeElement?.id).toBe("chapter-goal");
  });
});
