import type { Migration } from "../migrator.js";

/**
 * An index of replays kept in each player's own Google Drive. The server never stores the
 * file: a row starts unsaved when the room exports a finished match and becomes saved once
 * the client reports the Drive file id. Unsaved rows are removed after seven days.
 *
 * Numbered 026 before the merge with main; `IF NOT EXISTS` lets a database that ran it under that id start.
 */
export const accountReplays: Migration = {
  id: "029-account-replays",
  up: `
    CREATE TABLE IF NOT EXISTS account_replays (
      id uuid PRIMARY KEY,
      account_id uuid NOT NULL REFERENCES accounts(id),
      match_id text NOT NULL,
      viewer_seat integer NOT NULL CHECK (viewer_seat IN (0,1)),
      summary jsonb NOT NULL,
      byte_size integer NOT NULL CHECK (byte_size BETWEEN 1 AND 33554432),
      created_at bigint NOT NULL,
      drive_file_id text,
      saved_at bigint,
      visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','public')),
      CHECK ((drive_file_id IS NULL) = (saved_at IS NULL)),
      CHECK (visibility = 'private' OR drive_file_id IS NOT NULL),
      UNIQUE (account_id, match_id, viewer_seat)
    );
    CREATE INDEX IF NOT EXISTS account_replays_library ON account_replays(account_id, saved_at DESC, id DESC);
    CREATE INDEX IF NOT EXISTS account_replays_unsaved ON account_replays(created_at);
  `,
};
