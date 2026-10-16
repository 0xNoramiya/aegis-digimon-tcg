import { randomUUID } from "node:crypto";
import { getStoryGuestHash } from "#api/story/getStoryGuestHash";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Client } from "colyseus";
import { AccountStore } from "#api/accounts/AccountStore";
import { createMemoryPool } from "#api/db/memoryPool.fixture";
import { StoryProgressStore } from "#api/story/StoryProgressStore";
import { AegisRoom } from "#api/rooms/AegisRoom";
import { RED_DECK } from "#api/engine/testDecks";
import { getStoryScenario } from "#api/story/getStoryScenario";
import { getStorySeatDeck } from "#api/story/getStorySeatDeck";
import { validateScenarioFixture } from "#api/engine/scenario/fixture";
import { validateDecklist } from "#api/engine/deckValidation";
import type { GameEngine } from "#api/engine/GameEngine";
import { storyBattles } from "@aegis/shared/story/storyBattles";

let accounts: AccountStore;
const rooms: AegisRoom[] = [];
class StoryTestRoom extends AegisRoom {
  protected override replays() {
    return { record: async () => "local-replay" };
  }
  protected override accounts(): AccountStore {
    return accounts;
  }
}

function createRoom(battleId: string): AegisRoom {
  const room = new StoryTestRoom();
  room.lock = vi.fn<() => Promise<void>>(async () => {});
  room.unlock = vi.fn<() => Promise<void>>(async () => {});
  room.setMatchmaking = vi.fn<() => Promise<void>>(async () => {});
  room.broadcast = vi.fn<() => boolean>(() => true) as AegisRoom["broadcast"];
  room.onCreate({ seed: 1, botRoom: true, betaBattleRoom: true, storyBattleId: battleId });
  rooms.push(room);
  return room;
}

beforeEach(() => {
  accounts = new AccountStore(createMemoryPool());
});
afterEach(async () => {
  for (const room of rooms.splice(0)) {
    room.onDispose();
  }
  await accounts.close();
});

describe("story progression", () => {
  it("persists victories per account without duplicating retries", async () => {
    const a = await accounts.accountForIdentity("discord", "a", "Alice");
    const b = await accounts.accountForIdentity("discord", "b", "Bob");
    const store = new StoryProgressStore(accounts);
    await store.recordVictory({ accountId: a.id, battleId: "ice-knight", matchId: "first" });
    await store.recordVictory({ accountId: a.id, battleId: "ice-knight", matchId: "retry" });
    expect(await new StoryProgressStore(accounts).getProgress(a.id)).toEqual({ completed: ["ice-knight"] });
    expect(await store.getProgress(b.id)).toEqual({ completed: [] });
  });

  it("rejects missing identity and locked chapters even with crafted join options", async () => {
    const room = createRoom("crystal-sea-palace");
    const client = { sessionId: "player", send: vi.fn<() => void>() } as unknown as Client;
    const options = { displayName: "Player", deck: RED_DECK, storyBattleId: "crystal-sea-palace" };
    expect(await room.onAuth(client, options)).toBe(false);
    const account = await accounts.accountForIdentity("discord", "a", "Alice");
    const ticket = await accounts.createRoomTicket(account.id);
    expect(await room.onAuth(client, { ...options, authTicket: ticket })).toBe(false);
    await new StoryProgressStore(accounts).recordVictory({
      accountId: account.id,
      battleId: "ice-knight",
      matchId: "first",
    });
    const unlockedTicket = await accounts.createRoomTicket(account.id);
    expect(await room.onAuth(client, { ...options, authTicket: unlockedTicket })).toBe(true);
  });

  it("uses the server scenario instead of a supplied deck and does not unlock on defeat", async () => {
    const room = createRoom("ice-knight");
    const account = await accounts.accountForIdentity("discord", "a", "Alice");
    const client = { sessionId: "player", send: vi.fn<() => void>(), view: undefined } as unknown as Client;
    const options = {
      displayName: "Player",
      deck: RED_DECK,
      storyBattleId: "ice-knight",
      authTicket: await accounts.createRoomTicket(account.id),
    };
    expect(await room.onAuth(client, options)).toBe(true);
    room.clients.push(client);
    room.onJoin(client, options);
    expect(room.addBot()).toBe(true);
    expect(room.state.players[0]!.displayName).toBe("Shoto Kazama");
    expect(room.state.players[0]!.hand.map((card) => card.cardId)).toEqual([
      "ST18-05",
      "ST18-05",
      "ST18-04",
      "ST18-10",
      "ST18-06",
    ]);
    expect(room.state.players[0]!.security).toHaveLength(4);
    expect(room.state.players[1]!.security).toHaveLength(3);
    for (const seat of [0, 1] as const) {
      expect(room.state.players[seat]!.deck.map((card) => card.cardId)).not.toEqual(
        getStoryScenario("ice-knight")!.board[seat]!.deck,
      );
    }
    expect(room.state.memory).toBe(3);
    const engine = (room as unknown as { engine: GameEngine }).engine;
    engine.applyIntent(0, { type: "surrender" });
    expect(room.state.gameOver).toBe(true);
    expect(await new StoryProgressStore(accounts).getProgress(account.id)).toEqual({ completed: [] });
  });

  it("only records completion from the authoritative winning seat", async () => {
    const room = createRoom("ice-knight");
    const account = await accounts.accountForIdentity("discord", "a", "Alice");
    const client = { sessionId: "player", send: vi.fn<() => void>(), view: undefined } as unknown as Client;
    const options = {
      displayName: "Player",
      deck: RED_DECK,
      storyBattleId: "ice-knight",
      authTicket: await accounts.createRoomTicket(account.id),
    };
    expect(await room.onAuth(client, options)).toBe(true);
    room.clients.push(client);
    room.onJoin(client, options);
    room.addBot();
    const engine = (room as unknown as { engine: GameEngine }).engine;
    engine.applyIntent(1, { type: "surrender" });
    await vi.waitFor(async () => {
      expect(await new StoryProgressStore(accounts).getProgress(account.id)).toEqual({ completed: ["ice-knight"] });
    });
  });

  it.each(storyBattles.map((battle) => battle.id))("starts %s in the real simulator", (battleId) => {
    const room = createRoom(battleId);
    const client = { sessionId: "player", send: vi.fn<() => void>(), view: undefined } as unknown as Client;
    room.clients.push(client);
    room.onJoin(client, { displayName: "Player", deck: RED_DECK, storyBattleId: battleId });
    expect(room.addBot()).toBe(true);
    expect(room.state.players).toHaveLength(2);
    expect(room.state.gameOver).toBe(false);
    expect(room.state.players[0]!.deck.length).toBeGreaterThan(0);
    expect(room.state.players[1]!.deck.length).toBeGreaterThan(0);
  });

  it.each(storyBattles.filter((battle) => battle.playable).map((battle) => battle.id))(
    "provides valid fixed decks and board for %s",
    (battleId) => {
      const fixture = getStoryScenario(battleId)!;
      expect(() => validateScenarioFixture(fixture)).not.toThrow();
      for (const seat of [0, 1] as const) {
        const deck = getStorySeatDeck({ fixture, seat });
        expect(deck.mainDeck).toHaveLength(50);
        const validation = validateDecklist(deck, { betaBattleMode: true });
        expect(validation).toEqual({ ok: true });
      }
    },
  );
  it("excludes Zephagamon from Shoto's test against Yao", () => {
    const fixture = getStoryScenario("crystal-sea-palace")!;
    expect(getStorySeatDeck({ fixture, seat: 0 }).mainDeck).not.toContain("ST18-12");
  });
});

it("allows guests to play and unlocks only their next battle after an authoritative win", async () => {
  const token = randomUUID();
  const guestHash = getStoryGuestHash(token)!;
  const client = { sessionId: "guest", send: vi.fn<() => void>(), view: undefined } as unknown as Client;
  const options = { displayName: "Guest", deck: RED_DECK, storyBattleId: "ice-knight", storyGuestToken: token };
  const locked = createRoom("crystal-sea-palace");
  expect(await locked.onAuth(client, { ...options, storyBattleId: "crystal-sea-palace" })).toBe(false);
  const room = createRoom("ice-knight");
  expect(await room.onAuth(client, options)).toBe(true);
  room.clients.push(client);
  room.onJoin(client, options);
  expect(room.addBot()).toBe(true);
  const engine = (room as unknown as { engine: GameEngine }).engine;
  engine.applyIntent(1, { type: "surrender" });
  const store = new StoryProgressStore(accounts);
  await vi.waitFor(async () => expect(await store.getGuestProgress(guestHash)).toEqual({ completed: ["ice-knight"] }));
  expect(await store.getGuestProgress(getStoryGuestHash(randomUUID())!)).toEqual({ completed: [] });
  expect(await locked.onAuth(client, { ...options, storyBattleId: "crystal-sea-palace" })).toBe(true);
});

it("does not unlock guest progress on defeat", async () => {
  const token = randomUUID();
  const client = { sessionId: "guest", send: vi.fn<() => void>(), view: undefined } as unknown as Client;
  const options = { displayName: "Guest", deck: RED_DECK, storyBattleId: "ice-knight", storyGuestToken: token };
  const room = createRoom("ice-knight");
  expect(await room.onAuth(client, options)).toBe(true);
  room.clients.push(client);
  room.onJoin(client, options);
  room.addBot();
  (room as unknown as { engine: GameEngine }).engine.applyIntent(0, { type: "surrender" });
  expect(await new StoryProgressStore(accounts).getGuestProgress(getStoryGuestHash(token)!)).toEqual({ completed: [] });
});
