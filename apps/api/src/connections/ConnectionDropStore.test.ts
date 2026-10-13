import { afterEach, describe, expect, it } from "vitest";
import { AccountStore } from "#api/accounts/AccountStore";
import { CONNECTION_DROP_RETENTION_MS, ConnectionDropStore } from "#api/connections/ConnectionDropStore";
import { createMemoryPool } from "#api/db/memoryPool.fixture";

const accountStores: AccountStore[] = [];

afterEach(async () => {
  await Promise.all(accountStores.splice(0).map((store) => store.close()));
});

function createStore(): { accounts: AccountStore; drops: ConnectionDropStore } {
  const accounts = new AccountStore(createMemoryPool());
  accountStores.push(accounts);
  return { accounts, drops: new ConnectionDropStore(accounts) };
}

type DropRow = {
  outcome: string;
  offline_ms: number | null;
  server_close_code: number | null;
  client_close_code: number | null;
  client_offline_ms: number | null;
  client_attempts: number | null;
  client_hidden_at_drop: boolean | null;
  client_online_at_drop: boolean | null;
};

async function readDrop(accounts: AccountStore, id: number): Promise<DropRow | undefined> {
  const { rows } = await accounts.pool.query<DropRow>(
    `SELECT outcome, offline_ms, server_close_code, client_close_code, client_offline_ms, client_attempts,
       client_hidden_at_drop, client_online_at_drop
     FROM connection_drops WHERE id=$1`,
    [id],
  );
  return rows[0];
}

const drop = {
  roomId: "room-1",
  matchId: "match-1",
  accountId: undefined,
  displayName: "Tamer",
  seat: 1,
  closeCode: 1006,
  droppedAt: 1_000_000,
};

const report = { closeCode: 1006, offlineMs: 2_400, attempts: 2, hiddenAtDrop: true, onlineAtDrop: true };

describe("connection drop history", () => {
  it("keeps a reconnected drop with its offline time and the client's report", async () => {
    const { accounts, drops } = createStore();
    const id = await drops.recordDrop(drop);
    await drops.resolveDrop({ id, outcome: "reconnected", resolvedAt: drop.droppedAt + 2_000 });
    await drops.recordClientReport({ id, report });

    expect(await readDrop(accounts, id)).toEqual({
      outcome: "reconnected",
      offline_ms: 2_000,
      server_close_code: 1006,
      client_close_code: 1006,
      client_offline_ms: 2_400,
      client_attempts: 2,
      client_hidden_at_drop: true,
      client_online_at_drop: true,
    });
  });

  it("resolves a drop only once and ignores a report for a drop that expired", async () => {
    const { accounts, drops } = createStore();
    const id = await drops.recordDrop(drop);
    await drops.resolveDrop({ id, outcome: "expired", resolvedAt: drop.droppedAt + 30_000 });
    await drops.resolveDrop({ id, outcome: "reconnected", resolvedAt: drop.droppedAt + 31_000 });
    await drops.recordClientReport({ id, report });

    expect(await readDrop(accounts, id)).toMatchObject({
      outcome: "expired",
      offline_ms: 30_000,
      client_close_code: null,
    });
  });

  it("keeps the first client report for a drop", async () => {
    const { accounts, drops } = createStore();
    const id = await drops.recordDrop(drop);
    await drops.resolveDrop({ id, outcome: "reconnected", resolvedAt: drop.droppedAt + 1_000 });
    await drops.recordClientReport({ id, report });
    await drops.recordClientReport({ id, report: { ...report, closeCode: 4000, attempts: 9 } });

    expect(await readDrop(accounts, id)).toMatchObject({ client_close_code: 1006, client_attempts: 2 });
  });

  it("removes drops older than the retention window when a new drop arrives", async () => {
    const { accounts, drops } = createStore();
    const oldId = await drops.recordDrop(drop);
    const recentId = await new ConnectionDropStore(accounts).recordDrop({
      ...drop,
      droppedAt: drop.droppedAt + CONNECTION_DROP_RETENTION_MS + 1,
    });

    expect(await readDrop(accounts, oldId)).toBeUndefined();
    expect(await readDrop(accounts, recentId)).toMatchObject({ outcome: "pending" });
  });
});
