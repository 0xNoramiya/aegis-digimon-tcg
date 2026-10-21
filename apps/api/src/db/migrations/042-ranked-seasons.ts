import type { Migration } from "#api/db/migrator";

export const rankedSeasons: Migration = {
  id: "042-ranked-seasons",
  up: `
    CREATE TABLE account_active_rooms (account_id uuid PRIMARY KEY REFERENCES accounts(id), room_id text NOT NULL, expires_at bigint NOT NULL);
    CREATE TABLE ranked_control (id integer PRIMARY KEY);
    INSERT INTO ranked_control (id) VALUES (1);
    CREATE TABLE ranked_seasons (id integer PRIMARY KEY, starts_at bigint NOT NULL, ends_at bigint NOT NULL, finalized boolean NOT NULL DEFAULT false);
    CREATE TABLE ranked_ratings (account_id uuid NOT NULL REFERENCES accounts(id), format text NOT NULL, rating integer NOT NULL DEFAULT 1000 CHECK (rating >= 0), PRIMARY KEY(account_id, format));
    CREATE TABLE ranked_standings (season_id integer NOT NULL REFERENCES ranked_seasons(id), account_id uuid NOT NULL REFERENCES accounts(id), format text NOT NULL, region text NOT NULL, rating integer NOT NULL DEFAULT 1000, peak_rating integer, wins integer NOT NULL DEFAULT 0, losses integer NOT NULL DEFAULT 0, draws integer NOT NULL DEFAULT 0, PRIMARY KEY(season_id, account_id, format));
    CREATE TABLE ranked_pairs (id uuid PRIMARY KEY, format text NOT NULL, slot text NOT NULL, room_id text UNIQUE, status text NOT NULL, created_at bigint NOT NULL, reservation_expires_at bigint NOT NULL, started_at bigint, heartbeat_at bigint NOT NULL, season_id integer REFERENCES ranked_seasons(id), result_id uuid UNIQUE REFERENCES match_records(id));
    CREATE TABLE ranked_queue (account_id uuid PRIMARY KEY REFERENCES accounts(id), search_id text NOT NULL, format text NOT NULL, region text NOT NULL, slot text NOT NULL, rating integer NOT NULL, deck jsonb NOT NULL, banlist jsonb NOT NULL, queued_at bigint NOT NULL, heartbeat_at bigint NOT NULL, pair_id uuid REFERENCES ranked_pairs(id), token text NOT NULL, joined boolean NOT NULL DEFAULT false);
    CREATE INDEX ranked_queue_waiting ON ranked_queue(format, slot, queued_at);
    CREATE TABLE ranked_pair_players (pair_id uuid NOT NULL REFERENCES ranked_pairs(id), account_id uuid NOT NULL REFERENCES accounts(id), seat integer NOT NULL CHECK (seat IN (0,1)), region text NOT NULL, PRIMARY KEY(pair_id, account_id), UNIQUE(pair_id, seat));
    CREATE TABLE ranked_rewards (season_id integer NOT NULL REFERENCES ranked_seasons(id), account_id uuid NOT NULL REFERENCES accounts(id), tier text NOT NULL, equipped boolean NOT NULL DEFAULT false, granted_at bigint NOT NULL, PRIMARY KEY(season_id, account_id));
    CREATE UNIQUE INDEX ranked_one_equipped_reward ON ranked_rewards(account_id) WHERE equipped;
    CREATE TABLE ranked_discord (account_id uuid PRIMARY KEY REFERENCES accounts(id), opted_in boolean NOT NULL DEFAULT false, status text, desired_tier text, applied_role text, updated_at bigint NOT NULL DEFAULT 0, attempts integer NOT NULL DEFAULT 0, retry_at bigint NOT NULL DEFAULT 0);
    CREATE TABLE competitive_match_facts (match_id text NOT NULL, account_id uuid NOT NULL REFERENCES accounts(id), opponent_account_id uuid NOT NULL REFERENCES accounts(id), origin text NOT NULL, format text NOT NULL, region text, archetype text NOT NULL, opponent_archetype text NOT NULL, classifier_version integer NOT NULL, result text NOT NULL, finished_at bigint NOT NULL, PRIMARY KEY(match_id, account_id));
    CREATE INDEX competitive_match_facts_filters ON competitive_match_facts(origin, format, finished_at);
  `,
};
