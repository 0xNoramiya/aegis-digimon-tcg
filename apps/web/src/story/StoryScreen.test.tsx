import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/i18n/I18nProvider";
import { StoryScreen } from "@/story/StoryScreen";

const request = vi.hoisted(() => vi.fn<() => Promise<{ completed: string[] }>>());
vi.mock("@/account/client", () => ({ request }));

beforeEach(() => {
  localStorage.setItem("aegis:locale", "en");
  request.mockReset();
});
afterEach(cleanup);

function renderStory(signedIn = true) {
  const start = vi.fn<(battleId: string) => void>();
  render(
    <I18nProvider>
      <StoryScreen signedIn={signedIn} onSignIn={vi.fn<() => void>()} onStart={start} />
    </I18nProvider>,
  );
  return start;
}

describe("story campaign", () => {
  it("keeps original chapter links and lets guests launch their first battle", async () => {
    request.mockResolvedValue({ completed: [] });
    const start = renderStory(false);
    expect(await screen.findByText("Shoto Kazama", { selector: "h2" })).toBeTruthy();
    const chapter = screen.getByRole("link", { name: "Episode 02 [Pt.1]" });
    expect(chapter.getAttribute("href")).toContain("digimoncard.com/digimon_liberator/viewer/");
    expect(chapter.getAttribute("target")).toBe("_blank");
    const buttons = screen.getAllByRole("button", { name: "Start battle" }) as HTMLButtonElement[];
    expect(buttons[0]!.disabled).toBe(false);
    expect(buttons[1]!.disabled).toBe(true);
    fireEvent.click(buttons[0]!);
    expect(start).toHaveBeenCalledWith("ice-knight");
    expect(request).toHaveBeenCalledWith(
      "/story/progress",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: expect.stringMatching(/^StoryGuest /) }),
      }),
    );
  });

  it("uses server progress to unlock only the next encounter and launches its id", async () => {
    request.mockResolvedValue({ completed: ["ice-knight"] });
    const start = renderStory();
    await screen.findByRole("button", { name: "Play again" });
    const row = screen.getByText("VS. The Crystal Sea Palace").closest("li")!;
    const button = within(row).getByRole("button", { name: "Start battle" }) as HTMLButtonElement;
    expect(button.disabled).toBe(false);
    fireEvent.click(button);
    expect(start).toHaveBeenCalledWith("crystal-sea-palace");
    const later = screen.getByText("VS. Guardians of the Deep").closest("li")!;
    expect((within(later).getByRole("button", { name: "Start battle" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("filters to another character and identifies reconstructed battles", async () => {
    request.mockResolvedValue({ completed: [] });
    renderStory();
    fireEvent.click(screen.getByRole("button", { name: /^Yuuki/ }));
    expect(await screen.findByRole("heading", { name: "Yuuki", level: 2 })).toBeTruthy();
    expect(screen.queryByText("VS. Ice Knight")).toBeNull();
    expect(screen.getAllByText("Adaptation").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /DEBUG/ }).length).toBeGreaterThan(0);
  });

  it("fails closed when progress cannot be loaded and allows retry", async () => {
    request.mockRejectedValueOnce(new Error("offline"));
    renderStory();
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(
      screen.getAllByRole("button", { name: "Start battle" }).every((button) => (button as HTMLButtonElement).disabled),
    ).toBe(true);
    request.mockResolvedValueOnce({ completed: [] });
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    const first = await screen.findByText("VS. Ice Knight");
    await vi.waitFor(() =>
      expect(
        (within(first.closest("li")!).getByRole("button", { name: "Start battle" }) as HTMLButtonElement).disabled,
      ).toBe(false),
    );
  });
});
