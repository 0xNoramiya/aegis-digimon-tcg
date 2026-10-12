import type { Migration } from "#api/db/migrator";

export const connectionDrops: Migration = {
  id: "033-connection-drops",
  up: `
    CREATE TABLE IF NOT EXISTS connection_drops (
      id bigserial PRIMARY KEY,
      room_id text NOT NULL,
      match_id text NOT NULL,
      account_id uuid REFERENCES accounts(id) ON DELETE CASCADE,
      display_name text NOT NULL,
      seat smallint NOT NULL CHECK (seat IN (0, 1)),
      server_close_code integer,
      dropped_at bigint NOT NULL,
      outcome text NOT NULL CHECK (outcome IN ('pending', 'reconnected', 'expired')),
      offline_ms integer CHECK (offline_ms >= 0),
      client_close_code integer,
      client_offline_ms integer CHECK (client_offline_ms >= 0),
      client_attempts integer CHECK (client_attempts >= 0),
      client_hidden_at_drop boolean,
      client_online_at_drop boolean
    );
    CREATE INDEX IF NOT EXISTS connection_drops_dropped_at_idx ON connection_drops(dropped_at);
    CREATE INDEX IF NOT EXISTS connection_drops_account_idx ON connection_drops(account_id, dropped_at);
    CREATE INDEX IF NOT EXISTS connection_drops_match_idx ON connection_drops(match_id)
  `,
};
