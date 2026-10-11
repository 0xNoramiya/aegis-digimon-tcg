import type { Migration } from "../migrator.js";

export const playtestGroup: Migration = {
  id: "032-playtest-group",
  up: async (db) => {
    await db.query("ALTER TABLE accounts ADD COLUMN IF NOT EXISTS playtest_opt_in_at bigint");
    await db.query(`
      CREATE TABLE IF NOT EXISTS playtest_studies (
        id serial PRIMARY KEY,
        title text NOT NULL,
        blurb text NOT NULL,
        link text NOT NULL,
        opens_at bigint NOT NULL,
        closes_at bigint NOT NULL,
        created_by uuid NOT NULL REFERENCES accounts(id),
        created_at bigint NOT NULL
      )
    `);
  },
};
