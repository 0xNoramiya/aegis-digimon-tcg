import type { Migration } from "#api/db/migrator";

export const communityTournaments: Migration = {
  id: "040-community-tournaments",
  up: async (db) => {
    await db.query("ALTER TABLE tournaments ADD COLUMN description text NOT NULL DEFAULT ''");
    await db.query("ALTER TABLE tournaments ADD COLUMN password_hash text");
    await db.query("ALTER TABLE tournaments ADD COLUMN format text NOT NULL DEFAULT 'standard'");
  },
};
