import type { Migration } from "#api/db/migrator";

const SEEDED_ITEMS = [
  {
    status: "planned",
    title: "Ranked / Leaderboard",
    description:
      "Enable ranked matchmaking and a seasonal leaderboard once match reliability is ready.\n\nSuggested by the community on Discord and through website feedback.",
  },
] as const;

export const communityRoadmap: Migration = {
  id: "034-community-roadmap",
  up: async (db) => {
    await db.query(`CREATE TABLE roadmap_items (
      id serial PRIMARY KEY,
      title text NOT NULL,
      description text NOT NULL,
      status text NOT NULL CHECK (status IN ('planned', 'in_progress', 'under_review', 'completed')),
      discussion_url text,
      source_feedback_id integer UNIQUE REFERENCES feedback_reports(id) ON DELETE SET NULL,
      created_at bigint NOT NULL,
      updated_at bigint NOT NULL
    )`);
    await db.query("CREATE INDEX roadmap_items_status_idx ON roadmap_items (status)");
    await db.query(`CREATE TABLE roadmap_supports (
      item_id integer NOT NULL REFERENCES roadmap_items(id) ON DELETE CASCADE,
      account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      created_at bigint NOT NULL,
      PRIMARY KEY (item_id, account_id)
    )`);
    await db.query("CREATE INDEX roadmap_supports_account_idx ON roadmap_supports (account_id)");
    const createdAt = Date.now();
    for (const { status, title, description } of SEEDED_ITEMS)
      await db.query(
        "INSERT INTO roadmap_items (title, description, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $4)",
        [title, description, status, createdAt],
      );
  },
};
