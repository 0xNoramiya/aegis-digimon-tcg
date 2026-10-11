import type { Migration } from "../migrator.js";

/**
 * The playtest group: players who agreed to be invited to interviews and usability studies. The
 * opt-in is a timestamp, not a flag, because it is a consent record; it is a column rather than a
 * preference because preferences are backfilled from the device and consent must never be.
 * Studies are the recruiting windows admins open; members are told through notifications.
 */
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
