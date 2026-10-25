import type { Migration } from "#api/db/migrator";

export const friendships: Migration = {
  id: "041-friendships",
  up: `
    CREATE TABLE friend_requests (
      requester_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      recipient_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      created_at bigint NOT NULL,
      PRIMARY KEY (requester_id, recipient_id),
      CHECK (requester_id <> recipient_id)
    );
    CREATE INDEX friend_requests_recipient ON friend_requests(recipient_id);
    CREATE TABLE friendships (
      account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      friend_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      created_at bigint NOT NULL,
      PRIMARY KEY (account_id, friend_id),
      CHECK (account_id <> friend_id)
    );
    CREATE TABLE account_blocks (
      blocker_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      blocked_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      created_at bigint NOT NULL,
      PRIMARY KEY (blocker_id, blocked_id),
      CHECK (blocker_id <> blocked_id)
    );
    CREATE INDEX account_blocks_blocked ON account_blocks(blocked_id);
  `,
};
