import type { Migration } from "#api/db/migrator";

export const optionalRankedRegion: Migration = {
  id: "058-optional-ranked-region",
  up: async (db) => {
    await db.query("ALTER TABLE ranked_queue ALTER COLUMN region DROP NOT NULL");
    await db.query("ALTER TABLE ranked_pair_players ALTER COLUMN region DROP NOT NULL");
    await db.query("ALTER TABLE ranked_standings ALTER COLUMN region DROP NOT NULL");
  },
};
