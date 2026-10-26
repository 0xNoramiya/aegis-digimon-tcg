import type { AddressInfo } from "node:net";
import express from "express";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { UsedDeck } from "@aegis/shared/decks/UsedDeck";
import { createMemoryPool } from "#api/db/memoryPool.fixture";
import { AccountStore } from "#api/accounts/AccountStore";
import { installAccountRoutes } from "#api/accounts/routes";

const snapshot: UsedDeck = {
  deckId: "private-deck-id",
  deckName: "Starting list",
  mainDeck: ["AD1-001", "AD1-001"],
  eggDeck: ["BT1-001"],
  mainDeckArts: ["AD1-001", "AD1-001_P1"],
  eggDeckArts: ["BT1-001"],
  format: "standard",
};

let store: AccountStore;
let close: () => Promise<void>;
let url: string;
let cookie: string;
let viewerId: string;
let ownerId: string;

beforeEach(async () => {
  store = new AccountStore(createMemoryPool());
  const viewer = await store.accountForIdentity("discord", "viewer", "Viewer");
  const owner = await store.accountForIdentity("discord", "owner", "Owner");
  viewerId = viewer.id;
  ownerId = owner.id;
  cookie = `aegis_session=${(await store.issueSession(viewer)).id}`;
  const app = express();
  app.use(express.json());
  installAccountRoutes(app, store);
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  close = () => new Promise<void>((resolve) => server.close(() => resolve()));
  await store.recordRecentMatch(viewerId, "finished-room", {
    id: "finished-match",
    mode: "casual",
    opponentName: "Owner",
    opponentKind: "human",
    result: "win",
    reason: "surrender",
    finishedAt: Date.now(),
    opponentDeck: structuredClone(snapshot),
    opponentDeckOwnerAccountId: ownerId,
  });
});

afterEach(async () => {
  await close();
  await store.close();
});

describe("finished opponent decks", () => {
  it("requires an authenticated participant's retained match and hides all private metadata in history", async () => {
    expect((await fetch(`${url}/account/matches/finished-match/opponent-deck`)).status).toBe(401);
    const outsider = await store.accountForIdentity("discord", "outsider", "Outsider");
    const outsiderSession = await store.issueSession(outsider);
    expect(
      (
        await fetch(`${url}/account/matches/finished-match/opponent-deck`, {
          headers: { Cookie: `aegis_session=${outsiderSession.id}` },
        })
      ).status,
    ).toBe(404);
    expect(
      (
        await fetch(`${url}/account/matches/in-progress/opponent-deck`, {
          headers: { Cookie: cookie },
        })
      ).status,
    ).toBe(404);
    const history = await fetch(`${url}/account/matches?page=1&limit=25`, { headers: { Cookie: cookie } });
    const body = await history.json();
    expect(body.matches[0]).toMatchObject({ id: "finished-match", hasOpponentDeck: true });
    expect(JSON.stringify(body)).not.toContain("private-deck-id");
    expect(JSON.stringify(body)).not.toContain(ownerId);
    expect(body.matches[0]).not.toHaveProperty("opponentDeck");
    expect(body.matches[0]).not.toHaveProperty("opponentDeckOwnerAccountId");
  });

  it("returns the exact frozen cards and artwork with no private deck id and observes current sharing changes", async () => {
    const getDeck = () => fetch(`${url}/account/matches/finished-match/opponent-deck`, { headers: { Cookie: cookie } });
    const response = await getDeck();
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toEqual({ ...snapshot, deckId: null });
    await store.updatePreferences(ownerId, { shareDeckAfterMatch: false });
    expect((await getDeck()).status).toBe(404);
    expect((await store.matchHistory(viewerId, { page: 1, limit: 25 })).matches[0]?.hasOpponentDeck).toBe(false);
    await store.updatePreferences(ownerId, { shareDeckAfterMatch: true });
    expect((await getDeck()).status).toBe(200);
    const first = await store.getMatchOpponentDeck({ accountId: viewerId, matchId: "finished-match" });
    first!.mainDeck[0] = "BT1-010";
    expect((await store.getMatchOpponentDeck({ accountId: viewerId, matchId: "finished-match" }))?.mainDeck).toEqual(
      snapshot.mainDeck,
    );
  });

  it("supports bot and guest snapshots while treating legacy records as unavailable", async () => {
    await store.recordRecentMatch(viewerId, "bot-room", {
      id: "bot-match",
      mode: "bot",
      opponentName: "Bot",
      opponentKind: "bot",
      result: "loss",
      reason: "surrender",
      finishedAt: Date.now(),
      opponentDeck: structuredClone(snapshot),
    });
    expect((await store.getMatchOpponentDeck({ accountId: viewerId, matchId: "bot-match" }))?.deckName).toBe(
      "Starting list",
    );
    await store.recordRecentMatch(viewerId, "legacy-room", {
      id: "legacy-match",
      mode: "casual",
      opponentName: "Guest",
      opponentKind: "human",
      result: "draw",
      reason: "draw",
      finishedAt: Date.now(),
    });
    expect(await store.getMatchOpponentDeck({ accountId: viewerId, matchId: "legacy-match" })).toBeUndefined();
    expect(
      (await store.matchHistory(viewerId, { page: 1, limit: 25 })).matches.find((entry) => entry.id === "legacy-match")
        ?.hasOpponentDeck,
    ).toBe(false);
  });
});
