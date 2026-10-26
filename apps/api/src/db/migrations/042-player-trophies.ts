import type { Migration } from "#api/db/migrator";

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS player_trophies (
    account_id uuid NOT NULL REFERENCES accounts(id),
    source_kind text NOT NULL CHECK (source_kind IN ('tournament','ranked_season')),
    source_key text NOT NULL,
    award text NOT NULL,
    tier text NOT NULL CHECK (tier IN ('bronze','silver','gold','rainbow')),
    tournament_id uuid REFERENCES tournaments(id),
    season_id integer REFERENCES ranked_seasons(id),
    format text,
    awarded_at bigint NOT NULL,
    PRIMARY KEY (account_id, source_kind, source_key)
  )`,
  `CREATE TABLE IF NOT EXISTS tournament_trophy_grants (
    tournament_id uuid PRIMARY KEY REFERENCES tournaments(id),
    granted_at bigint NOT NULL
  )`,
];

export const playerTrophies: Migration = {
  id: "042-player-trophies",
  up: async (db) => {
    for (const statement of STATEMENTS) {
      await db.query(statement);
    }
  },
};
