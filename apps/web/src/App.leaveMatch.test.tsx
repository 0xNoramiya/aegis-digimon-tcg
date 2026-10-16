// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { AegisClient } from "./App";
import { I18nProvider } from "./i18n";

vi.mock("./screens/Lobby", () => ({
  Lobby: ({ onStart }: { onStart: (mode: "casual") => void }) => (
    <button onClick={() => onStart("casual")}>Start match</button>
  ),
}));

const concede = vi.hoisted(() => vi.fn<() => void>());

vi.mock("./game/GameScreen", () => ({
  GameScreen: ({ onLeaveForfeitsChange }: { onLeaveForfeitsChange?: (concede: (() => void) | undefined) => void }) => {
    useEffect(() => {
      onLeaveForfeitsChange?.(concede);
      return () => onLeaveForfeitsChange?.(undefined);
    }, [onLeaveForfeitsChange]);
    return <div data-testid="match" />;
  },
}));

afterEach(() => {
  cleanup();
  concede.mockReset();
  vi.restoreAllMocks();
  sessionStorage.clear();
});

function renderClient() {
  render(
    <I18nProvider>
      <AegisClient
        player={{ name: "Tamer", color: "Blue", shards: 0 }}
        setPlayer={() => undefined}
        decks={[]}
        activeDeckId=""
        setActiveDeckId={() => undefined}
        saveDeck={() => undefined}
        deleteDeck={() => undefined}
        dark={false}
        setDark={() => undefined}
      />
    </I18nProvider>,
  );
}

function pressBrowserBack(path = "/play") {
  act(() => {
    window.history.replaceState(null, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
}

async function startMatch() {
  window.history.replaceState(null, "", "/play");
  renderClient();
  fireEvent.click(await screen.findByRole("button", { name: "Start match" }));
  await screen.findByTestId("match");
}

it("keeps a live match open and asks before the browser Back button leaves it", async () => {
  await startMatch();

  pressBrowserBack();

  expect(screen.getByRole("dialog", { name: "Leave this match?" })).toBeTruthy();
  expect(screen.getByTestId("match")).toBeTruthy();
  expect(window.location.pathname).toBe("/play/game");

  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.getByTestId("match")).toBeTruthy();
});

it.each(["/play", "/settings"])("concedes and returns to %s once the player confirms", async (path) => {
  await startMatch();
  const back = vi.spyOn(window.history, "back");

  pressBrowserBack(path);
  fireEvent.click(screen.getByRole("button", { name: "Leave match" }));

  expect(concede).toHaveBeenCalledOnce();
  expect(back).not.toHaveBeenCalled();
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.queryByTestId("match")).toBeNull();
  expect(window.location.pathname).toBe(path);
});
