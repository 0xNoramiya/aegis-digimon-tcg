import { randomUUID } from "node:crypto";
import { MATCH_HISTORY_LIMIT } from "@aegis/shared";
import { afterEach, expect, it } from "vitest";
import { AccountStore, type MatchRecord } from "./AccountStore.js";
import { createMemoryPool } from "../db/memoryPool.fixture.js";
import { ReplayLibrary } from "../replays/ReplayLibrary.js";

let store: AccountStore;
afterEach(async () => {
  await store?.close();
});
const record = (index: number, result: MatchRecord["result"] = "win"): MatchRecord => ({
  id: `replay-${index}`,
  mode: index % 2 ? "bot" : "casual",
  opponentName: "Opponent",
  opponentKind: index % 2 ? "bot" : "human",
  result,
  reason: "surrender",
  finishedAt: index,
});
async function owners() {
  store = new AccountStore(createMemoryPool());
  const owner = await store.accountForIdentity("email", `${randomUUID()}@test.invalid`, "Owner");
  const other = await store.accountForIdentity("email", `${randomUUID()}@test.invalid`, "Other");
  return { owner, other };
}
async function saveReplay(accountId: string, matchId: string) {
  const library = new ReplayLibrary(store);
  const id = await library.record(accountId, {
    kind: "ready",
    summary: {
      id: matchId,
      players: ["Owner", "Opponent"],
      mode: "casual",
      startedAt: 1,
      finishedAt: 2,
      winnerSeat: 0,
      frameCount: 2,
    },
    viewerSeat: 0,
    data: Buffer.from("archive").toString("base64"),
  });
  await library.attachDrive(accountId, id, `driveFile-${matchId}`);
}
const page = (accountId: string, options: Partial<Parameters<AccountStore["matchHistory"]>[1]> = {}) =>
  store.matchHistory(accountId, { page: 1, limit: 25, ...options });

it("keeps the newest matches up to the cap, deduplicates rooms and isolates owners", async () => {
  const { owner, other } = await owners();
  const extra = 4;
  for (let index = 0; index < MATCH_HISTORY_LIMIT + extra; index++)
    await store.recordRecentMatch(owner.id, `room-${index}`, record(index));
  await store.recordRecentMatch(owner.id, "room-103", record(999));
  await store.recordRecentMatch(owner.id, "old-arrived-late", record(1));
  const first = await page(owner.id, { limit: 10 });
  expect(first.total).toBe(MATCH_HISTORY_LIMIT);
  expect(first.matches.map((match) => match.id)).toEqual(
    Array.from({ length: 10 }, (_, index) => `replay-${MATCH_HISTORY_LIMIT + extra - 1 - index}`),
  );
  const last = await page(owner.id, { page: 10, limit: 10 });
  expect(last.matches.at(-1)?.id).toBe(`replay-${extra}`);
  expect(await page(other.id)).toEqual({ matches: [], total: 0 });
});

it("never drops a match whose replay the player saved", async () => {
  const { owner } = await owners();
  await store.recordRecentMatch(owner.id, "room-kept", record(0));
  await store.recordRecentMatch(owner.id, "room-unsaved", record(1));
  await saveReplay(owner.id, "replay-0");
  const library = new ReplayLibrary(store);
  await library.record(owner.id, {
    kind: "ready",
    summary: {
      id: "replay-1",
      players: ["a", "b"],
      mode: "bot",
      startedAt: 1,
      finishedAt: 2,
      winnerSeat: 0,
      frameCount: 1,
    },
    viewerSeat: 0,
    data: Buffer.from("archive").toString("base64"),
  });
  for (let index = 2; index < MATCH_HISTORY_LIMIT + 2; index++)
    await store.recordRecentMatch(owner.id, `room-${index}`, record(index));
  const all = await page(owner.id, { page: 5 });
  expect(all.total).toBe(MATCH_HISTORY_LIMIT + 1);
  expect(all.matches.map((match) => match.id)).toEqual(["replay-0"]);
});

it("filters by result, mode and opponent and counts what the filter selects", async () => {
  const { owner, other } = await owners();
  const results: MatchRecord["result"][] = ["win", "loss", "draw"];
  for (let index = 0; index < 30; index++)
    await store.recordRecentMatch(owner.id, `room-${index}`, {
      ...record(index, results[index % 3]),
      opponentName: index < 4 ? "Gabumon Player" : `Rival ${index}`,
    });
  await store.recordRecentMatch(other.id, "room-other", { ...record(99), opponentName: "Gabumon Player" });
  const wins = await page(owner.id, { result: "win" });
  expect(wins.total).toBe(10);
  expect(wins.matches.every((match) => match.result === "win")).toBe(true);
  const bots = await page(owner.id, { mode: "bot" });
  expect(bots.total).toBe(15);
  expect(bots.matches.every((match) => match.mode === "bot")).toBe(true);
  const gabumon = await page(owner.id, { opponent: "gabumon" });
  expect(gabumon.matches.map((match) => match.id)).toEqual(["replay-3", "replay-2", "replay-1", "replay-0"]);
  expect((await page(owner.id, { opponent: "gabumon", result: "win", mode: "bot" })).matches.map((m) => m.id)).toEqual([
    "replay-3",
  ]);
  expect((await page(owner.id, { mode: "ranked" })).total).toBe(0);
  expect((await page(owner.id, { mode: "casual", page: 2 })).matches).toHaveLength(0);
});

it("summarizes the kept history and the saved replays", async () => {
  const { owner, other } = await owners();
  const results: MatchRecord["result"][] = ["win", "win", "loss", "draw", "win"];
  for (const [index, result] of results.entries())
    await store.recordRecentMatch(owner.id, `room-${index}`, record(index, result));
  await saveReplay(owner.id, "replay-1");
  expect((await store.profile(owner.id)).summary).toEqual({
    matches: 5,
    wins: 3,
    losses: 1,
    draws: 1,
    replaysSaved: 1,
  });
  expect((await store.profile(other.id)).summary).toEqual({
    matches: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    replaysSaved: 0,
  });
});

it("writes competitive results to both histories and lets the room's recording replace them", async () => {
  const { owner, other } = await owners();
  await store.recordMatch({
    roomId: "ranked-room",
    mode: "ranked",
    playerAccountIds: [owner.id, other.id],
    winnerAccountId: owner.id,
    reason: "surrender",
  });
  expect((await page(other.id)).matches).toMatchObject([{ result: "loss", opponentName: "Owner", mode: "ranked" }]);
  await store.recordRecentMatch(owner.id, "ranked-room", {
    ...record(0),
    id: "recording-id",
    mode: "ranked",
    opponentName: other.displayName,
  });
  const history = await page(owner.id);
  expect(history.total).toBe(1);
  expect(history.matches[0]?.id).toBe("recording-id");
  expect((await store.profile(owner.id)).stats.rankedWins).toBe(1);
});

it("keeps the room's recording when the competitive result arrives second", async () => {
  const { owner, other } = await owners();
  await store.recordRecentMatch(owner.id, "ranked-room", { ...record(0), id: "recording-id", mode: "ranked" });
  await store.recordMatch({
    roomId: "ranked-room",
    mode: "ranked",
    playerAccountIds: [owner.id, other.id],
    winnerAccountId: owner.id,
    reason: "surrender",
  });
  expect((await page(owner.id)).matches.map((match) => match.id)).toEqual(["recording-id"]);
});

it("names a bot opponent and records a loss to it", async () => {
  const { owner } = await owners();
  await store.recordMatch({
    roomId: "bot-room",
    mode: "tournament",
    playerAccountIds: [owner.id, null],
    outcome: "player1",
    reason: "series_won",
    opponentKind: "bot",
    opponentDisplayName: "Agumon Unit",
  });
  expect((await page(owner.id)).matches).toMatchObject([
    { result: "loss", opponentKind: "bot", opponentName: "Agumon Unit", mode: "tournament" },
  ]);
});
