import { describe, expect, it, vi } from "vitest";
import type { Client } from "colyseus";
import { AegisRoom } from "#api/rooms/AegisRoom";
import { RED_DECK } from "#api/engine/testDecks";
import type { AccountPreferences } from "#api/accounts/AccountStore";

function client(sessionId: string): Client {
  return { sessionId, send: vi.fn(), view: undefined } as unknown as Client;
}

function startedRoom(options: {
  preferences: Record<string, AccountPreferences>;
  accounts: Record<string, string>;
  private?: boolean;
}) {
  const room = new AegisRoom();
  room.lock = vi.fn<() => Promise<void>>(async () => undefined);
  room.unlock = vi.fn<() => Promise<void>>(async () => undefined);
  room.broadcast = vi.fn() as never;
  const setMatchmaking = vi.fn<(updates: { metadata?: Record<string, unknown> }) => Promise<void>>(
    async () => undefined,
  );
  room.setMatchmaking = setMatchmaking as never;
  Reflect.set(room, "_listing", {});
  room.onCreate({ seed: 1, ...(options.private ? { private: true } : {}) });
  Object.assign(room, {
    accounts: () => ({ preferences: async (accountId: string) => options.preferences[accountId] ?? {} }),
    accountByClient: new Map(Object.entries(options.accounts)),
  });
  for (const [sessionId, displayName] of [
    ["first", "Taichi"],
    ["second", "Sora"],
  ]) {
    const player = client(sessionId!);
    room.clients.push(player);
    room.onJoin(player, { displayName, deck: structuredClone(RED_DECK) });
  }
  (Reflect.get(room, "startMatchNow") as () => void).call(room);
  const latestLive = () =>
    setMatchmaking.mock.calls
      .map(([updates]) => updates.metadata)
      .filter(Boolean)
      .at(-1)?.live as Record<string, unknown> | undefined;
  return { room, setMatchmaking, latestLive };
}

const bothAccounts = { first: "first-account", second: "second-account" };

describe("live match listing", () => {
  it("lists a casual match once both players opted in", async () => {
    const { room, latestLive } = startedRoom({
      accounts: bothAccounts,
      preferences: { "first-account": { listLiveMatches: true }, "second-account": { listLiveMatches: true } },
    });
    try {
      await vi.waitFor(() => expect(latestLive()).toBeDefined());
      expect(latestLive()).toMatchObject({
        spectatorCode: room.state.spectatorCode,
        players: ["Taichi", "Sora"],
        format: "standard",
        spectators: 0,
      });
    } finally {
      room.onDispose();
    }
  });

  it.each([
    ["one player opted in", { "first-account": { listLiveMatches: true } }, bothAccounts],
    ["neither player opted in", {}, bothAccounts],
    ["a guest is seated", { "first-account": { listLiveMatches: true } }, { first: "first-account" }],
  ])("keeps the match unlisted when %s", async (_case, preferences, accounts) => {
    const { room, setMatchmaking, latestLive } = startedRoom({ accounts, preferences });
    try {
      await vi.waitFor(() => expect(setMatchmaking).toHaveBeenCalled());
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(latestLive()).toBeUndefined();
    } finally {
      room.onDispose();
    }
  });

  it("never lists a private room", async () => {
    const { room, latestLive } = startedRoom({
      private: true,
      accounts: bothAccounts,
      preferences: { "first-account": { listLiveMatches: true }, "second-account": { listLiveMatches: true } },
    });
    try {
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(latestLive()).toBeUndefined();
    } finally {
      room.onDispose();
    }
  });

  it("tracks spectators and drops the listing when the game ends", async () => {
    const { room, latestLive } = startedRoom({
      accounts: bothAccounts,
      preferences: { "first-account": { listLiveMatches: true }, "second-account": { listLiveMatches: true } },
    });
    try {
      await vi.waitFor(() => expect(latestLive()).toBeDefined());
      const watcher = client("watcher");
      room.clients.push(watcher);
      room.onJoin(watcher, {
        spectator: true,
        roomCode: room.state.spectatorCode,
        deck: { mainDeck: [], eggDeck: [] },
      });
      await vi.waitFor(() => expect(latestLive()?.spectators).toBe(1));
      room.state.gameOver = true;
      await room.onLeave(watcher);
      await vi.waitFor(() => expect(latestLive()).toBeUndefined());
    } finally {
      room.onDispose();
    }
  });
});
