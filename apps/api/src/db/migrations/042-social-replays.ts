import type { Migration } from "#api/db/migrator";

export const socialReplays: Migration = {
  id: "042-social-replays",
  up: `
    CREATE TABLE account_replays_social (
      id uuid PRIMARY KEY,
      account_id uuid NOT NULL REFERENCES accounts(id),
      match_id text NOT NULL,
      viewer_seat integer NOT NULL CHECK (viewer_seat IN (-1,0,1)),
      summary jsonb NOT NULL,
      byte_size integer NOT NULL CHECK (byte_size BETWEEN 1 AND 33554432),
      created_at bigint NOT NULL,
      drive_file_id text,
      saved_at bigint,
      visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','friends','public')),
      CHECK ((drive_file_id IS NULL) = (saved_at IS NULL)),
      CHECK (visibility = 'private' OR drive_file_id IS NOT NULL),
      UNIQUE (account_id, match_id, viewer_seat)
    );
    INSERT INTO account_replays_social (id,account_id,match_id,viewer_seat,summary,byte_size,created_at,drive_file_id,saved_at,visibility) SELECT id,account_id,match_id,viewer_seat,summary,byte_size,created_at,drive_file_id,saved_at,visibility FROM account_replays;
    DROP INDEX account_replays_library;
    DROP INDEX account_replays_unsaved;
    DROP TABLE account_replays;
    ALTER TABLE account_replays_social RENAME TO account_replays;
    CREATE INDEX account_replays_library ON account_replays(account_id, saved_at DESC, id DESC);
    CREATE INDEX account_replays_unsaved ON account_replays(created_at);
    CREATE TABLE friend_replay_files (
      replay_id uuid PRIMARY KEY REFERENCES account_replays(id) ON DELETE CASCADE,
      account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      archive_base64 text NOT NULL,
      byte_size integer NOT NULL CHECK (byte_size BETWEEN 1 AND 33554432),
      created_at bigint NOT NULL
    );
    CREATE INDEX friend_replay_files_owner ON friend_replay_files(account_id);
  `,
};
