import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { MATCH_HISTORY_LIMIT, type ReplayDownloadMessage } from "@aegis/shared";
import { AccountStore } from "../accounts/AccountStore.js";
import { ReplayLibrary } from "../replays/ReplayLibrary.js";
import { runMigrations } from "./migrator.js";
import { migrations } from "./migrations/index.js";

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
  function message(id: string = randomUUID()): Extract<ReplayDownloadMessage, { kind: "ready" }> {
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
  const record = (id: string, finishedAt: number) => ({
    id,
    mode: "casual" as const,
    opponentName: "Opponent",
    opponentKind: "human" as const,
    result: "win" as const,
    reason: "surrender",
    finishedAt,
  });
  it("caps concurrent history writes and keeps every saved replay", async () => {
    const id = await owner();
    const kept = await library.record(id, message("kept-match"));
    await library.attachDrive(id, kept, "realPostgresKept01");
    await accounts.recordRecentMatch(id, "kept-room", record("kept-match", 0));
    await Promise.all(
      Array.from({ length: MATCH_HISTORY_LIMIT + 20 }, (_, index) =>
        accounts.recordRecentMatch(id, `room-${index}`, record(`match-${index}`, index + 1)),
      ),
    );
    const all = await accounts.matchHistory(id, { page: 1, limit: 50 });
    expect(all.total).toBe(MATCH_HISTORY_LIMIT + 1);
    expect(all.matches[0]?.id).toBe(`match-${MATCH_HISTORY_LIMIT + 19}`);
    expect((await accounts.matchHistory(id, { page: 3, limit: 50 })).matches).toMatchObject([{ id: "kept-match" }]);
  }, 30000);
  it("lets the room's recording win over a concurrent competitive result for the same room", async () => {
    const [first, second] = [await owner(), await owner()];
    await Promise.all(
      Array.from({ length: 6 }, (_, index) => [
        accounts.recordMatch({
          roomId: `ranked-${index}`,
          mode: "ranked",
          playerAccountIds: [first, second],
          winnerAccountId: first,
          reason: "surrender",
        }),
        accounts.recordRecentMatch(first, `ranked-${index}`, { ...record(`recording-${index}`, 1), mode: "ranked" }),
      ]).flat(),
    );
    const history = await accounts.matchHistory(first, { page: 1, limit: 25 });
    expect(history.matches.map((match) => match.id).sort()).toEqual(
      Array.from({ length: 6 }, (_, index) => `recording-${index}`),
    );
    expect((await accounts.matchHistory(second, { page: 1, limit: 25 })).total).toBe(6);
  }, 30000);
  it("matches the opponent search literally, wildcards included", async () => {
    const id = await owner();
    for (const [index, opponentName] of ["Gabu_mon 100%", "GabuXmon 1000", "gabu\\mon"].entries())
      await accounts.recordRecentMatch(id, `search-${index}`, { ...record(`search-${index}`, index), opponentName });
    const search = async (opponent: string) =>
      (await accounts.matchHistory(id, { page: 1, limit: 25, opponent })).matches.map((match) => match.opponentName);
    expect(await search("gabu_mon")).toEqual(["Gabu_mon 100%"]);
    expect(await search("100%")).toEqual(["Gabu_mon 100%"]);
    expect(await search("GABU")).toHaveLength(3);
    expect(await search("u\\m")).toEqual(["gabu\\mon"]);
  }, 30000);
  it("backfills competitive history when the table is created", async () => {
    const backfill = `${schema}_backfill`;
    await admin.query(`CREATE SCHEMA ${backfill}`);
    const scratch = new Pool({ connectionString: connection, options: `-c search_path=${backfill}`, max: 2 });
    try {
      await runMigrations(
        scratch,
        migrations.filter((migration) => migration.id < "027"),
      );
      const [alice, bob] = [randomUUID(), randomUUID()];
      await scratch.query("INSERT INTO accounts (id,display_name,created_at) VALUES ($1,'Alice',1),($2,'Bob',1)", [
        alice,
        bob,
      ]);
      for (let index = 0; index < MATCH_HISTORY_LIMIT + 5; index++)
        await scratch.query(
          "INSERT INTO match_records (id,room_id,mode,player0_account_id,player1_account_id,winner_account_id,outcome,reason,finished_at) VALUES ($1,$2,'ranked',$3,$4,$3,'player0','surrender',$5)",
          [randomUUID(), `room-${index}`, alice, bob, index],
        );
      await runMigrations(scratch, migrations);
      const rows = await scratch.query<{ account_id: string; total: number; newest: string; oldest: string }>(
        "SELECT account_id, count(*)::int total, max(finished_at) newest, min(finished_at) oldest FROM account_recent_matches GROUP BY account_id ORDER BY account_id",
      );
      expect(rows.rows).toEqual(
        [alice, bob].sort().map((account_id) => ({
          account_id,
          total: MATCH_HISTORY_LIMIT,
          newest: String(MATCH_HISTORY_LIMIT + 4),
          oldest: "5",
        })),
      );
      const bobRecord = await scratch.query(
        "SELECT record FROM account_recent_matches WHERE account_id=$1 AND room_id='room-7'",
        [bob],
      );
      expect(bobRecord.rows[0]?.record).toMatchObject({ opponentName: "Alice", result: "loss", mode: "ranked" });
    } finally {
      await scratch.end();
      await admin.query(`DROP SCHEMA IF EXISTS ${backfill} CASCADE`);
    }
  }, 30000);
});
