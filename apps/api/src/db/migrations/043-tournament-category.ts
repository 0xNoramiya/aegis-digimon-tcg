import type { Migration } from "#api/db/migrator";

export const tournamentCategory: Migration = {
  id: "043-tournament-category",
  up: async (db) => {
    await db.query(
      "ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'community' CHECK (category IN ('community','official'))",
    );
  },
};
