// @vitest-environment jsdom

import { CardInstance, GameState, Phase, PlayerState } from "@aegis/shared";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { setKeepAwakeEnabled } from "../design/keepAwake";
import { GameScreen } from "./GameScreen";

vi.mock("../design/sound", () => ({
  playSound: vi.fn<() => void>(),
  playAttentionSound: vi.fn<() => void>(),
  startMusic: vi.fn<() => void>(),
  stopMusic: vi.fn<() => void>(),
}));

type FakeSentinel = { release: ReturnType<typeof vi.fn>; released: boolean };

let requested: string[];
let sentinels: FakeSentinel[];

function installWakeLock(): void {
  requested = [];
  sentinels = [];
  const wakeLock = {
    request: vi.fn((type: string) => {
      requested.push(type);
      const lock: FakeSentinel = {
        released: false,
        release: vi.fn(async () => {
          lock.released = true;
        }),
      };
      sentinels.push(lock);
      return Promise.resolve(lock);
    }),
  };
  Object.defineProperty(navigator, "wakeLock", { value: wakeLock, configurable: true });
}

function matchState(): GameState {
  const state = new GameState();
  state.stateVersion = 1;
  state.phase = Phase.Main;
  state.turnSeat = 0;
  state.turnCount = 2;
  for (const seat of [0, 1] as const) {
    const player = new PlayerState();
    player.seat = seat;
    player.sessionId = `session-${seat}`;
    player.displayName = seat === 0 ? "You" : "Rival";
    player.deckCount = 30;
    player.securityCount = 5;
    const held = new CardInstance();
    held.instanceId = `held-${seat}`;
    held.cardId = "ST1-07";
    player.hand.push(held);
    player.handCount = 1;
    state.players.push(player);
  }
  return state;
}

function view(state: GameState) {
  return (
    <I18nProvider>
      <GameScreen
        joinOptions={{ displayName: "You", deck: { mainDeck: [], eggDeck: [] } }}
        identityColor="Blue"
        onExit={() => undefined}
        demoConnection={{
          room: undefined,
          status: "connected",
          error: undefined,
          state,
          events: [],
          batches: [],
          snapshots: [],
          decision: undefined,
          acknowledgeDecision: () => undefined,
          sessionId: "session-0",
          roomCode: "",
        }}
      />
    </I18nProvider>
  );
}

async function flush(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
  });
}

describe("match screen wake lock", () => {
  beforeEach(() => {
    localStorage.clear();
    setKeepAwakeEnabled(true);
    installWakeLock();
  });

  afterEach(() => {
    cleanup();
    setKeepAwakeEnabled(true);
    delete (navigator as unknown as Record<string, unknown>).wakeLock;
    vi.restoreAllMocks();
  });

  it("holds a screen lock while a match is open", async () => {
    render(view(matchState()));
    await flush();

    expect(requested).toEqual(["screen"]);
    expect(sentinels[0]?.released).toBe(false);
  });

  it("asks for nothing while the preference is off", async () => {
    setKeepAwakeEnabled(false);
    render(view(matchState()));
    await flush();

    expect(requested).toEqual([]);
  });

  it("releases the lock when the match ends", async () => {
    const state = matchState();
    const { rerender } = render(view(state));
    await flush();
    expect(sentinels).toHaveLength(1);

    state.gameOver = true;
    rerender(view(state));
    await flush();

    expect(sentinels[0]?.released).toBe(true);
  });
});
