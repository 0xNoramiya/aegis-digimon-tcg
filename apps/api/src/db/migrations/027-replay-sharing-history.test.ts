import type { Pool } from "pg";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createMemoryPool } from "../memoryPool.fixture.js";
import { runMigrations } from "../migrator.js";
import { migrations } from "./index.js";

const ALICE = "00000000-0000-4000-8000-0000000000a1";
const BOB = "00000000-0000-4000-8000-0000000000b0";
const matchId = (index: number) => `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`;

describe("027-replay-sharing-history", () => {
  let pool: Pool;
  beforeEach(async () => {
    pool = createMemoryPool();
    await runMigrations(
      pool,
      migrations.filter((migration) => migration.id < "027"),
    );
    await pool.query("INSERT INTO accounts (id, display_name, created_at) VALUES ($1,'Alice',1),($2,'Bob',1)", [
      ALICE,
      BOB,
    ]);
  });
  afterEach(async () => {
    await pool.end();
  });

  it("seeds each player's latest competitive matches from both seats", async () => {
    for (let index = 0; index < 102; index++)
      await pool.query(
        "INSERT INTO match_records (id,room_id,mode,player0_account_id,player1_account_id,winner_account_id,outcome,reason,finished_at) VALUES ($1,$2,'ranked',$3,$4,$5,$6,'surrender',$7)",
        [
          matchId(index),
          `room-${index}`,
          ALICE,
          BOB,
          index % 2 ? BOB : ALICE,
          index % 2 ? "player1" : "player0",
          index,
        ],
      );
    await pool.query(
      "INSERT INTO match_records (id,room_id,mode,player0_account_id,player1_account_id,winner_account_id,outcome,reason,finished_at,opponent_kind,opponent_display_name) VALUES ($1,'bot-room','tournament',$2,NULL,NULL,'player1','series_won',500,'bot','Agumon Unit')",
      [matchId(900), ALICE],
    );
    await pool.query(
      "INSERT INTO match_records (id,room_id,mode,player0_account_id,player1_account_id,winner_account_id,reason,finished_at) VALUES ($1,'legacy-draw','ranked',$2,$3,NULL,'timeout',400)",
      [matchId(901), BOB, ALICE],
    );
    await runMigrations(pool, migrations);

    const history = async (accountId: string) =>
      (
        await pool.query<{ room_id: string; match_id: string; finished_at: string; record: Record<string, unknown> }>(
          "SELECT room_id,match_id,finished_at,record FROM account_recent_matches WHERE account_id=$1 ORDER BY finished_at DESC",
          [accountId],
        )
      ).rows;
    const alice = await history(ALICE);
    expect(alice).toHaveLength(100);
    expect(alice[0]).toEqual({
      room_id: "bot-room",
      match_id: matchId(900),
      finished_at: expect.anything(),
      record: {
        id: matchId(900),
        mode: "tournament",
        opponentName: "Agumon Unit",
        opponentKind: "bot",
        result: "loss",
        reason: "series_won",
        finishedAt: 500,
      },
    });
    expect(Number(alice[0]?.finished_at)).toBe(500);
    expect(alice[1]?.record).toMatchObject({ opponentName: "Bob", result: "draw", reason: "timeout" });
    expect(alice[2]?.record).toMatchObject({ id: matchId(101), opponentName: "Bob", result: "loss" });
    expect(alice.at(-1)?.room_id).toBe("room-4");
    const bob = await history(BOB);
    expect(bob).toHaveLength(100);
    expect(bob[1]?.record).toMatchObject({ id: matchId(101), opponentName: "Alice", result: "win" });
  });

  it("applies on an empty database", async () => {
    expect(await runMigrations(pool, migrations)).toContain("027-replay-sharing-history");
    expect((await pool.query("SELECT * FROM account_recent_matches")).rows).toEqual([]);
  });
});
