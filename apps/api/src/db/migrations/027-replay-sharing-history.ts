import type { Migration, Queryable } from "../migrator.js";

// Shapes driven by pg-mem, the in-memory Postgres the tests run on: statements run one per query
// (see migration 002), and the backfill ranks and serializes rows in JavaScript because pg-mem has
// neither window functions nor JSON builders.
const STATEMENTS = [
  `CREATE TABLE account_recent_matches (
     account_id uuid NOT NULL REFERENCES accounts(id),
     room_id text NOT NULL,
     match_id text NOT NULL,
     finished_at bigint NOT NULL,
     record jsonb NOT NULL,
     PRIMARY KEY (account_id, room_id)
   )`,
  "CREATE INDEX account_recent_matches_order ON account_recent_matches(account_id, finished_at DESC, room_id DESC)",
];

/** Matches kept per account when the history starts. Mirrors `MATCH_HISTORY_LIMIT` as it was at release. */
const BACKFILL_LIMIT = 100;
const BACKFILL_BATCH = 200;

const COMPETITIVE_MATCHES = `SELECT m.id, m.room_id, m.mode, m.winner_account_id, m.outcome, m.opponent_kind,
     m.player0_account_id, m.player1_account_id, m.reason, m.finished_at, m.opponent_display_name,
     a0.display_name player0_name, a1.display_name player1_name
   FROM match_records m
   LEFT JOIN accounts a0 ON a0.id = m.player0_account_id
   LEFT JOIN accounts a1 ON a1.id = m.player1_account_id`;

type CompetitiveMatch = {
  id: string;
  room_id: string;
  mode: "ranked" | "tournament";
  winner_account_id: string | null;
  outcome: "player0" | "player1" | "draw" | null;
  opponent_kind: "human" | "bot";
  player0_account_id: string;
  player1_account_id: string | null;
  reason: string;
  finished_at: string | number;
  opponent_display_name: string | null;
  player0_name: string | null;
  player1_name: string | null;
};
type HistoryRow = { accountId: string; roomId: string; matchId: string; finishedAt: number; record: string };

export const replaySharingHistory: Migration = {
  id: "027-replay-sharing-history",
  up: async (db) => {
    for (const statement of STATEMENTS) await db.query(statement);
    await backfillCompetitiveHistory(db);
  },
};

/** Seeds each account's history with its latest ranked and tournament matches, which predate the table. */
async function backfillCompetitiveHistory(db: Queryable): Promise<void> {
  const matches = (await db.query<CompetitiveMatch>(COMPETITIVE_MATCHES)).rows.sort(
    (a, b) => Number(b.finished_at) - Number(a.finished_at) || (a.room_id < b.room_id ? 1 : -1),
  );
  const perAccount = new Map<string, number>();
  const rows: HistoryRow[] = [];
  for (const match of matches)
    for (const seat of [0, 1] as const) {
      const accountId = seat === 0 ? match.player0_account_id : match.player1_account_id;
      if (!accountId) continue;
      const kept = perAccount.get(accountId) ?? 0;
      if (kept >= BACKFILL_LIMIT) continue;
      perAccount.set(accountId, kept + 1);
      const finishedAt = Number(match.finished_at);
      rows.push({
        accountId,
        roomId: match.room_id,
        matchId: match.id,
        finishedAt,
        record: JSON.stringify({
          id: match.id,
          mode: match.mode,
          opponentName: (seat === 0 ? match.player1_name : match.player0_name) ?? match.opponent_display_name ?? "Bot",
          opponentKind: match.opponent_kind,
          result: resultFor(match, accountId),
          reason: match.reason,
          finishedAt,
        }),
      });
    }
  for (let start = 0; start < rows.length; start += BACKFILL_BATCH) {
    const batch = rows.slice(start, start + BACKFILL_BATCH);
    await db.query(
      `INSERT INTO account_recent_matches (account_id,room_id,match_id,finished_at,record) VALUES ${batch
        .map(
          (_, index) => `($${index * 5 + 1},$${index * 5 + 2},$${index * 5 + 3},$${index * 5 + 4},$${index * 5 + 5})`,
        )
        .join(",")} ON CONFLICT (account_id,room_id) DO NOTHING`,
      batch.flatMap((row) => [row.accountId, row.roomId, row.matchId, row.finishedAt, row.record]),
    );
  }
}

/** A frozen copy of `AccountStore`'s rule: rows without `outcome` predate bot seats and name a winner account. */
function resultFor(match: CompetitiveMatch, accountId: string): "win" | "loss" | "draw" {
  if (match.outcome === null)
    return match.winner_account_id === null ? "draw" : match.winner_account_id === accountId ? "win" : "loss";
  if (match.outcome === "draw") return "draw";
  const seat = match.player0_account_id === accountId ? "player0" : "player1";
  return match.outcome === seat ? "win" : "loss";
}
