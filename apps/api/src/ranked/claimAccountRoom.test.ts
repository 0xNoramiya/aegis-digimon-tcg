import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AccountStore } from "#api/accounts/AccountStore";
import { createMemoryPool } from "#api/db/memoryPool.fixture";
import { RED_DECK } from "#api/engine/testDecks";
import { AccountRoomClaim } from "#api/ranked/AccountRoomClaim";
import { RankedStore } from "#api/ranked/RankedStore";
import { claimAccountRoom } from "#api/ranked/claimAccountRoom";
import { RankedRegion } from "@aegis/shared/ranked/RankedRegion";

let accounts: AccountStore;
let queue: RankedStore;

beforeEach(() => {
  vi.stubEnv("AEGIS_RANKED_ENABLED", "true");
  accounts = new AccountStore(createMemoryPool());
  queue = new RankedStore(accounts, async () => "ranked-room");
});
afterEach(async () => {
  await accounts.close();
  vi.unstubAllEnvs();
});

async function queuePlayers() {
  const players = await Promise.all(
    ["Searcher", "Opponent"].map((name) => accounts.accountForIdentity("discord", name, name)),
  );
  const views = [];
  for (const player of players) {
    const deck = await accounts.saveDeck(player.id, { name: "Ranked deck", ...RED_DECK });
    views.push(
      await queue.joinQueue({
        accountId: player.id,
        deckId: deck.id,
        format: "BT10",
        region: RankedRegion.SOUTH_AMERICA.value,
        slot: "legacy",
      }),
    );
  }
  return { players, views };
}

describe("claimAccountRoom", () => {
  it("reports an active ranked search while the account is still waiting", async () => {
    const player = await accounts.accountForIdentity("discord", "Waiting", "Waiting");
    const deck = await accounts.saveDeck(player.id, { name: "Ranked deck", ...RED_DECK });
    await queue.joinQueue({
      accountId: player.id,
      deckId: deck.id,
      format: "BT10",
      region: RankedRegion.SOUTH_AMERICA.value,
      slot: "legacy",
    });

    expect(await claimAccountRoom({ accounts, accountId: player.id, roomId: "casual-room" })).toBe(
      AccountRoomClaim.RANKED_SEARCH_ACTIVE.value,
    );
  });

  it("reports another room when the account's ranked game is already playing", async () => {
    const { players } = await queuePlayers();
    const views = await Promise.all(players.map((player) => queue.pollQueue(player.id)));
    const pairId = views[1]!.pairId!;
    for (const [seat, player] of players.entries()) {
      await queue.claimSeat({ accountId: player.id, pairId, token: views[seat]!.token!, roomId: "ranked-room" });
    }
    expect(await queue.markPlaying(pairId, "ranked-room")).toBe(true);

    expect(await claimAccountRoom({ accounts, accountId: players[0]!.id, roomId: "casual-room" })).toBe(
      AccountRoomClaim.IN_ANOTHER_ROOM.value,
    );
  });
});
