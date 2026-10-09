import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import type { ReplayDownloadMessage } from "@aegis/shared";
import { AccountStore } from "../accounts/AccountStore.js";
import { ReplayLibrary } from "../replays/ReplayLibrary.js";

const enabled = process.env.POSTGRES_TESTS === "1";
const connection = process.env.POSTGRES_TEST_URL;
if (enabled && !connection) throw new Error("Replay index tests need POSTGRES_TEST_URL pointing to a scratch Postgres");
const schema = `replay_test_${randomUUID().replaceAll("-", "")}`;

describe.skipIf(!enabled)("real Postgres replay index", () => {
  let admin: Pool;
  let accounts: AccountStore;
  let pool: Pool;
  let library: ReplayLibrary;
  beforeAll(async () => {
    admin = new Pool({ connectionString: connection });
    await admin.query(`CREATE SCHEMA ${schema}`);
    pool = new Pool({ connectionString: connection, options: `-c search_path=${schema}`, max: 12 });
    accounts = new AccountStore(pool);
    library = new ReplayLibrary(accounts);
    await accounts.ensureReady();
  });
  afterAll(async () => {
    if (accounts) await accounts.close();
    if (admin) {
      await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
      await admin.end();
    }
  });
  async function owner() {
    return (await accounts.accountForIdentity("email", `${randomUUID()}@test.invalid`, "Replay Test")).id;
  }
  function message(id = randomUUID()): Extract<ReplayDownloadMessage, { kind: "ready" }> {
    return {
      kind: "ready",
      data: Buffer.from("test replay bytes").toString("base64"),
      viewerSeat: 0,
      summary: { id, players: ["A", "B"], mode: "casual", startedAt: 1, finishedAt: 2, winnerSeat: 0, frameCount: 2 },
    };
  }
  it("returns one index row when independent API instances record the same export at once", async () => {
    const id = await owner();
    const file = message();
    const sibling = new ReplayLibrary(accounts);
    const ids = await Promise.all(
      Array.from({ length: 8 }, (_, index) => (index % 2 ? library : sibling).record(id, file)),
    );
    expect(new Set(ids).size).toBe(1);
    const rows = await pool.query("SELECT id FROM account_replays WHERE account_id=$1", [id]);
    expect(rows.rows).toEqual([{ id: ids[0] }]);
  }, 30000);
  it("keeps concurrent Drive registrations idempotent", async () => {
    const id = await owner();
    const indexId = await library.record(id, message());
    const results = await Promise.all(
      Array.from({ length: 6 }, () => library.attachDrive(id, indexId, "realPostgresDrive01")),
    );
    expect(new Set(results.map((replay) => replay?.savedAt)).size).toBe(1);
    expect((await library.list(id)).replays).toHaveLength(1);
  }, 30000);
  it("pages ties on saved_at without gaps or repeats", async () => {
    const id = await owner();
    const ids: string[] = [];
    for (let index = 0; index < 5; index++) {
      const indexId = await library.record(id, message());
      await library.attachDrive(id, indexId, `realPostgresDrive${index}0`);
      ids.push(indexId);
    }
    await pool.query("UPDATE account_replays SET saved_at=42 WHERE account_id=$1", [id]);
    const seen: string[] = [];
    let cursor: string | undefined;
    do {
      const page = await library.list(id, { cursor, limit: 2 });
      seen.push(...page.replays.map((replay) => replay.id));
      cursor = page.nextCursor;
    } while (cursor);
    expect(seen).toEqual([...ids].sort().reverse());
  }, 30000);
});
