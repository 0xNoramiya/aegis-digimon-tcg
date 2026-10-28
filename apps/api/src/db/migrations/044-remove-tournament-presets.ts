import type { Migration } from "#api/db/migrator";

export const removeTournamentPresets: Migration = {
  id: "044-remove-tournament-presets",
  up: async (db) => {
    await db.query("ALTER TABLE tournaments DROP COLUMN IF EXISTS ruleset_preset");
    await db.query("ALTER TABLE tournaments DROP COLUMN IF EXISTS ruleset_version");
  },
};
