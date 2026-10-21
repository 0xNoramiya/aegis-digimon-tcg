import type { Migration } from "#api/db/migrator";

export const communityTournaments: Migration = {
  id: "041-community-tournaments",
  up: async (db) => {
    await db.query("ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT ''");
    await db.query("ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS password_hash text");
    await db.query("ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS format text NOT NULL DEFAULT 'standard'");
  },
};
