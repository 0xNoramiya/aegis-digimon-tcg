import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Lobby } from "@/screens/Lobby";
import { I18nProvider } from "@/i18n/I18nProvider";
import { loadIdentity } from "@/identity";
import { requestPrivateSealed } from "@/sealed/requestPrivateSealed";

vi.mock("@/game/GameScreen", () => ({ GameScreen: () => null }));
vi.mock("@/sealed/SealedPoolBuilder", () => ({ SealedPoolBuilder: () => null }));
vi.mock("@/sealed/requestPrivateSealed", () => ({ requestPrivateSealed: vi.fn<typeof requestPrivateSealed>() }));
vi.mock("@/net/client", () => ({
  liveMatches: async () => ({ matches: [], total: 0 }),
  matchQueueCounts: async () => ({ buckets: [], waiting: [] }),
}));

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  sessionStorage.clear();
  localStorage.clear();
  window.history.replaceState(null, "", "/play");
});

it("opens private sealed without a saved deck and forwards the existing lobby identity", async () => {
  window.history.replaceState(null, "", "/play");
  const player = loadIdentity();
  const onStart = vi.fn<() => void>();
  vi.mocked(requestPrivateSealed).mockResolvedValue({ ok: false, error: { status: 0, code: "network_error" } });
  render(
    <I18nProvider>
      <Lobby
        player={player}
        decks={[]}
        activeDeckId=""
        onSelectDeck={() => undefined}
        onCopyDeck={() => undefined}
        onNav={() => undefined}
        onStart={onStart}
      />
    </I18nProvider>,
  );
  const entry = screen.getByRole("button", { name: /Private Sealed · BO3/ });
  expect(entry.closest(".lobby-modes")).toBeTruthy();
  fireEvent.click(entry);
  expect(entry.getAttribute("aria-pressed")).toBe("true");
  expect(screen.queryByRole("button", { name: "Enter queue" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Open packs" }));
  const create = await screen.findByRole("button", { name: "Create" });
  expect(create).toHaveProperty("disabled", false);
  expect(screen.queryByRole("textbox", { name: /player name/i })).toBeNull();
  fireEvent.click(create);
  await waitFor(() => expect(requestPrivateSealed).toHaveBeenCalledTimes(1));
  expect(requestPrivateSealed).toHaveBeenCalledWith({
    code: undefined,
    action: undefined,
    body: { name: player.name, requestId: expect.any(String), setId: expect.any(String) },
  });
  expect(onStart).not.toHaveBeenCalled();
});
