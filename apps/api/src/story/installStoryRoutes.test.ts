import { randomUUID } from "node:crypto";
import { getStoryGuestHash } from "#api/story/getStoryGuestHash";
import type { AddressInfo } from "node:net";
import express from "express";
import { afterEach, beforeEach, expect, it } from "vitest";
import { AccountStore } from "#api/accounts/AccountStore";
import { createMemoryPool } from "#api/db/memoryPool.fixture";
import { StoryProgressStore } from "#api/story/StoryProgressStore";
import { installStoryRoutes } from "#api/story/installStoryRoutes";

let accounts: AccountStore;
let base: string;
let close: () => Promise<void>;
let aliceId: string;

beforeEach(async () => {
  accounts = new AccountStore(createMemoryPool());
  const alice = await accounts.accountForIdentity("discord", "alice", "Alice");
  const bob = await accounts.accountForIdentity("discord", "bob", "Bob");
  aliceId = alice.id;
  const store = new StoryProgressStore(accounts);
  await store.recordVictory({ accountId: alice.id, battleId: "ice-knight", matchId: "won" });
  const sessions = new Map([
    ["alice", await accounts.issueSession(alice)],
    ["bob", await accounts.issueSession(bob)],
  ]);
  const app = express();
  installStoryRoutes({ app, store, session: async (req) => sessions.get(req.headers.authorization ?? "") });
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  close = () =>
    new Promise<void>((resolve) => {
      server.close(() => resolve());
      server.closeAllConnections();
    });
});
afterEach(async () => {
  await close();
  await accounts.close();
});

it("only exposes the authenticated account's progress and disables caching", async () => {
  expect((await fetch(`${base}/story/progress`)).status).toBe(401);
  const own = await fetch(`${base}/story/progress`, { headers: { authorization: "alice" } });
  expect(own.headers.get("cache-control")).toBe("no-store");
  expect(await own.json()).toEqual({ completed: ["ice-knight"] });
  const other = await fetch(`${base}/story/progress?accountId=${aliceId}`, { headers: { authorization: "bob" } });
  expect(await other.json()).toEqual({ completed: [] });
});

it("does not accept forged completion from the client", async () => {
  const response = await fetch(`${base}/story/progress`, {
    method: "POST",
    headers: { authorization: "bob", "content-type": "application/json" },
    body: JSON.stringify({ completed: ["ice-knight"] }),
  });
  expect(response.status).toBe(404);
  const progress = await fetch(`${base}/story/progress`, { headers: { authorization: "bob" } });
  expect(await progress.json()).toEqual({ completed: [] });
});

it("isolates anonymous browser progress and rejects malformed tokens", async () => {
  const token = randomUUID();
  await new StoryProgressStore(accounts).recordGuestVictory({
    guestHash: getStoryGuestHash(token)!,
    battleId: "ice-knight",
    matchId: "guest-win",
  });
  const own = await fetch(`${base}/story/progress`, { headers: { Authorization: `StoryGuest ${token}` } });
  expect(own.headers.get("cache-control")).toBe("no-store");
  expect(await own.json()).toEqual({ completed: ["ice-knight"] });
  const other = await fetch(`${base}/story/progress`, { headers: { Authorization: `StoryGuest ${randomUUID()}` } });
  expect(await other.json()).toEqual({ completed: [] });
  const malformed = await fetch(`${base}/story/progress`, { headers: { Authorization: "StoryGuest made-up" } });
  expect(malformed.status).toBe(401);
});
