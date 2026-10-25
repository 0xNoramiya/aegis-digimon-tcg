import type { Migration } from "#api/db/migrator";

export const directMessages: Migration = {
  id: "043-direct-messages",
  up: `
    CREATE TABLE direct_messages (
      id uuid PRIMARY KEY,
      sender_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      recipient_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      body varchar(480) NOT NULL CHECK (body <> ''),
      created_at bigint NOT NULL,
      read_at bigint,
      CHECK (sender_id <> recipient_id)
    );
    CREATE INDEX direct_messages_sender ON direct_messages(sender_id, recipient_id, created_at DESC, id DESC);
    CREATE INDEX direct_messages_recipient ON direct_messages(recipient_id, sender_id, created_at DESC, id DESC);
    CREATE INDEX direct_messages_retention ON direct_messages(created_at);
  `,
};
