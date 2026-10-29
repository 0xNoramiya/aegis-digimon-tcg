import type { AccountStore, StoredMatchRecord } from "#api/accounts/AccountStore";

type Params = {
  store: AccountStore;
  accountId: string;
  matches: Array<{ roomId: string; record: StoredMatchRecord }>;
};

export async function seedRecentMatches({ store, accountId, matches }: Params): Promise<void> {
  if (matches.length === 0) return;
  const params: unknown[] = [];
  const rows = matches.map(({ roomId, record }) => {
    const start = params.push(accountId, roomId, record.id, record.finishedAt, JSON.stringify(record)) - 4;
    return `($${start},$${start + 1},$${start + 2},$${start + 3},$${start + 4})`;
  });
  await store.ensureReady();
  await store.pool.query(
    `INSERT INTO account_recent_matches (account_id,room_id,match_id,finished_at,record) VALUES ${rows.join(",")}`,
    params,
  );
}
